// SPE-1271: Civic pressure composite profile — unified consumer of all four channels

import {
  deriveCrossSiteAuthorityModifierForTargetSite,
  type CompactCivicAuthorityConsequencePacket,
} from './civicConsequenceNetwork'
import { aggregateSiteRumorPressureModifier, type CivicRumorPacket } from './civicRumorChannel'
import { aggregateSiteCreditPressureModifier, type CivicCreditPacket } from './civicCreditChannel'
import { aggregateSiteAccessPressureModifier, type CivicAccessPacket } from './civicAccessChannel'

export type CivicPressureSeverityBand = 'stable' | 'elevated' | 'critical'
export type CivicPressureDominantChannel = 'authority' | 'rumor' | 'credit' | 'access' | 'none'

export interface SiteCivicPressureProfile {
  siteId: string
  combinedBoost: number // clamped to [−0.2, +0.3]
  authorityContribution: number
  rumorContribution: number
  creditContribution: number
  accessContribution: number
  dominantChannel: CivicPressureDominantChannel
  severityBand: CivicPressureSeverityBand
  reasonFragments: string[]
}

export interface SiteCivicPressureProfileOptions {
  week?: number
  authorityPackets?: readonly CompactCivicAuthorityConsequencePacket[]
  rumorPackets?: readonly CivicRumorPacket[]
  creditPackets?: readonly CivicCreditPacket[]
  accessPackets?: readonly CivicAccessPacket[]
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'unknown'
}

const NO_PRESSURE_FRAGMENTS = [
  'no authority pressure',
  'no rumor pressure',
  'no credit pressure',
  'no access pressure',
]

function isEmptyFragment(fragment: string): boolean {
  const trimmed = fragment.trim()
  if (trimmed.length === 0) return true
  // authority 'none' fragment: 'cross-site-authority target:<siteId> none'
  if (trimmed.endsWith(' none')) return true
  return NO_PRESSURE_FRAGMENTS.includes(trimmed)
}

function resolveSeverityBand(combinedBoost: number): CivicPressureSeverityBand {
  if (combinedBoost > 0.15) return 'critical'
  if (combinedBoost > 0.05) return 'elevated'
  return 'stable'
}

function resolveDominantChannel(contributions: {
  authority: number
  rumor: number
  credit: number
  access: number
}): CivicPressureDominantChannel {
  // Alphabetical order so ties resolve to the alphabetically first channel
  const entries: [CivicPressureDominantChannel, number][] = [
    ['access', Math.abs(contributions.access)],
    ['authority', Math.abs(contributions.authority)],
    ['credit', Math.abs(contributions.credit)],
    ['rumor', Math.abs(contributions.rumor)],
  ]

  const maxAbs = Math.max(...entries.map(([, v]) => v))
  if (maxAbs === 0) return 'none'

  // First in alphabetical order with maxAbs wins
  const winner = entries.find(([, v]) => v === maxAbs)
  return winner ? winner[0] : 'none'
}

/**
 * SPE-1271: Compute a unified civic pressure profile for a single site
 * by aggregating all four pressure channels.
 *
 * Each channel is optional — missing packets contribute zero to the combined boost.
 * combinedBoost is the sum of all four contributions, clamped to [−0.2, +0.3].
 */
export function computeSiteCivicPressureProfile(
  siteId: string,
  opts: SiteCivicPressureProfileOptions = {}
): SiteCivicPressureProfile {
  const normalizedSiteId = normalizeToken(siteId)
  const week = opts.week ?? 1

  const authorityResult = deriveCrossSiteAuthorityModifierForTargetSite(
    opts.authorityPackets ?? [],
    normalizedSiteId,
    week
  )
  const rumorResult = aggregateSiteRumorPressureModifier(
    opts.rumorPackets ?? [],
    normalizedSiteId
  )
  const creditResult = aggregateSiteCreditPressureModifier(
    opts.creditPackets ?? [],
    normalizedSiteId
  )
  const accessResult = aggregateSiteAccessPressureModifier(
    opts.accessPackets ?? [],
    normalizedSiteId
  )

  const authorityContribution = authorityResult.totalDelta
  const rumorContribution = rumorResult.pressureBoost
  const creditContribution = creditResult.pressureBoost
  const accessContribution = accessResult.pressureBoost

  const rawCombined =
    authorityContribution + rumorContribution + creditContribution + accessContribution
  const combinedBoost = clamp(rawCombined, -0.2, 0.3)

  const dominantChannel = resolveDominantChannel({
    authority: authorityContribution,
    rumor: rumorContribution,
    credit: creditContribution,
    access: accessContribution,
  })

  const severityBand = resolveSeverityBand(combinedBoost)

  const reasonFragments = [
    authorityResult.reasonFragment,
    rumorResult.reasonFragment,
    creditResult.reasonFragment,
    accessResult.reasonFragment,
  ].filter((f) => !isEmptyFragment(f))

  return {
    siteId: normalizedSiteId,
    combinedBoost,
    authorityContribution,
    rumorContribution,
    creditContribution,
    accessContribution,
    dominantChannel,
    severityBand,
    reasonFragments,
  }
}
