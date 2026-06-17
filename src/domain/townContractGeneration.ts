import { aggregateSiteAccessPressureModifier } from './civicAccessChannel'
import { deriveCrossSiteAuthorityModifierForTargetSite } from './civicConsequenceNetwork'
import { aggregateSiteCreditPressureModifier } from './civicCreditChannel'
import { aggregateSiteRumorPressureModifier } from './civicRumorChannel'
import type { GameState } from './models'
import { getWeeklyCaseGenerationSeamInput } from './sim/advanceWeek'
import { aggregateDistrictLocalPressure } from './urbanNeighborhoodIncidents'

const VALUE_STREAM_GROUPS: ReadonlyArray<{ slug: string; tags: readonly string[] }> = [
  { slug: 'public-legitimacy', tags: ['public', 'civilian', 'authority', 'community'] },
  { slug: 'cover-integrity', tags: ['covert', 'cover', 'infiltration', 'smuggling'] },
  { slug: 'funding', tags: ['funding', 'procurement', 'resource', 'supply'] },
  { slug: 'evidence-quality', tags: ['evidence', 'intel', 'signal', 'verification'] },
  { slug: 'doctrine-risk', tags: ['occult', 'cult', 'ritual', 'classified'] },
]

export interface TownContractPacketContext {
  leadDistrictId: string
  pressureScore: number
  pressureTags: readonly string[]
}

function mergeUniquePreserveOrder(...lists: readonly string[][]) {
  const seen = new Set<string>()
  const merged: string[] = []

  for (const list of lists) {
    for (const entry of list) {
      if (!seen.has(entry)) {
        seen.add(entry)
        merged.push(entry)
      }
    }
  }

  return merged
}

function collectCandidateDistrictIds(
  seam: ReturnType<typeof getWeeklyCaseGenerationSeamInput>
): string[] {
  const ids = new Set<string>()

  for (const packet of seam.neighborhoodPackets) {
    ids.add(packet.districtId)
  }

  for (const packet of seam.rumorPackets) {
    ids.add(packet.siteId)
  }

  for (const packet of seam.creditPackets) {
    ids.add(packet.siteId)
  }

  for (const packet of seam.accessPackets) {
    ids.add(packet.siteId)
  }

  for (const packet of seam.civicConsequencePackets) {
    ids.add(packet.link.targetSiteId)
    ids.add(packet.link.sourceSiteId)
  }

  return [...ids].sort((left, right) => left.localeCompare(right))
}

function scoreDistrictPressure(
  seam: ReturnType<typeof getWeeklyCaseGenerationSeamInput>,
  districtId: string,
  week: number
) {
  const neighborhood = aggregateDistrictLocalPressure(seam.neighborhoodPackets, districtId, week)
  const rumor = aggregateSiteRumorPressureModifier(seam.rumorPackets, districtId)
  const credit = aggregateSiteCreditPressureModifier(seam.creditPackets, districtId)
  const access = aggregateSiteAccessPressureModifier(seam.accessPackets, districtId)
  const authority = deriveCrossSiteAuthorityModifierForTargetSite(
    seam.civicConsequencePackets,
    districtId,
    week
  )

  const pressureScore =
    neighborhood.pressureBoost +
    Math.abs(rumor.pressureBoost) +
    Math.abs(credit.pressureBoost) +
    Math.abs(access.pressureBoost) +
    Math.abs(authority.totalDelta) * 0.25

  const pressureTags = mergeUniquePreserveOrder(
    [`district:${districtId}`, 'town-first:contract'],
    neighborhood.pressureBoost > 0 ? [`neighborhood-pressure:${districtId}`] : [],
    rumor.pressureBoost !== 0 ? [`rumor-pressure:${districtId}`] : [],
    credit.pressureBoost !== 0 ? [`credit-pressure:${districtId}`] : [],
    access.pressureBoost !== 0 ? [`access-pressure:${districtId}`] : [],
    authority.totalDelta !== 0 ? [`authority-exchange:${districtId}`] : []
  )

  return { pressureScore, pressureTags }
}

/**
 * SPE-31 / SPE-2469: derive the top civic-pressure district from compact town tag packets.
 * Returns null when no civic packets are present on state.
 */
export function deriveTownContractPacketContext(state: GameState): TownContractPacketContext | null {
  const seam = getWeeklyCaseGenerationSeamInput(state)
  const hasPackets =
    seam.neighborhoodPackets.length > 0 ||
    seam.rumorPackets.length > 0 ||
    seam.creditPackets.length > 0 ||
    seam.accessPackets.length > 0 ||
    seam.civicConsequencePackets.length > 0

  if (!hasPackets) {
    return null
  }

  const candidates = collectCandidateDistrictIds(seam)

  if (candidates.length === 0) {
    return null
  }

  const ranked = candidates
    .map((districtId) => {
      const scored = scoreDistrictPressure(seam, districtId, state.week)
      return {
        districtId,
        ...scored,
      }
    })
    .sort(
      (left, right) =>
        right.pressureScore - left.pressureScore || left.districtId.localeCompare(right.districtId)
    )

  const lead = ranked[0]!

  if (lead.pressureScore <= 0) {
    return {
      leadDistrictId: lead.districtId,
      pressureScore: 0,
      pressureTags: [`district:${lead.districtId}`, 'town-first:contract'],
    }
  }

  return {
    leadDistrictId: lead.districtId,
    pressureScore: lead.pressureScore,
    pressureTags: lead.pressureTags,
  }
}

/** Deterministic value-stream slug from template tags (mirrors Front Desk lane vocabulary). */
export function deriveTownContractValueStreamTag(templateTags: readonly string[]): string {
  const scoredStreams = VALUE_STREAM_GROUPS.map((stream) => ({
    slug: stream.slug,
    score: stream.tags.filter((tag) => templateTags.includes(tag)).length,
  })).sort(
    (left, right) => right.score - left.score || left.slug.localeCompare(right.slug)
  )

  const winner = scoredStreams[0]!
  const slug = winner.score > 0 ? winner.slug : 'evidence-quality'
  return `value-stream:${slug}`
}

export function mergeTownContractCaseTags(
  baseTags: readonly string[],
  context: TownContractPacketContext | null,
  templateTags: readonly string[]
): string[] {
  if (!context) {
    return [...baseTags]
  }

  const valueStreamTag = deriveTownContractValueStreamTag(templateTags)
  return mergeUniquePreserveOrder(baseTags, context.pressureTags, [valueStreamTag])
}

/**
 * Bounded additive bias for contract selection when template tags align with the active town lead.
 */
export function getTownContractSelectionBias(
  context: TownContractPacketContext | null,
  templateTags: readonly string[]
): number {
  if (!context || context.pressureScore <= 0) {
    return 0
  }

  const valueStreamTag = deriveTownContractValueStreamTag(templateTags)
  const valueStreamSlug = valueStreamTag.slice('value-stream:'.length)
  const streamTags =
    VALUE_STREAM_GROUPS.find((stream) => stream.slug === valueStreamSlug)?.tags ?? []
  const overlap = streamTags.filter((tag) => templateTags.includes(tag)).length
  const districtAligned = templateTags.some((tag) => tag === `district:${context.leadDistrictId}`)

  return Math.min(0.42, overlap * 0.12 + (districtAligned ? 0.18 : 0) + context.pressureScore * 0.35)
}
