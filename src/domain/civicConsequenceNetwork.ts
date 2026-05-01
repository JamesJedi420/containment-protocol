export interface CompactCivicAuthorityConsequenceInput {
  packetId: string
  sourceSiteId: string
  targetSiteId: string
  seedKey: string
  week: number
  authoritySignal?: number
}

export interface CompactCivicAuthorityLink {
  linkId: string
  scope: 'two_site'
  sourceSiteId: string
  targetSiteId: string
  operatorId: string
  institutionId: string
  authoritySignal: number
}

export interface CompactCivicAuthorityConsequencePacket {
  packetId: string
  week: number
  seedKey: string
  link: CompactCivicAuthorityLink
}

export interface CrossSiteAuthorityModifier {
  targetSiteId: string
  totalDelta: number
  weightModifier: number
  appliedPacketIds: string[]
  reasonFragment: string
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number(value.toFixed(3))))
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'unknown'
}

function hashSeed(seedKey: string) {
  let hash = 2166136261

  for (let index = 0; index < seedKey.length; index += 1) {
    hash ^= seedKey.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function stableEntityId(prefix: 'operator' | 'institution', seedKey: string) {
  const hash = hashSeed(`${prefix}:${seedKey}`).toString(16).padStart(8, '0')
  return `${prefix}-${hash.slice(0, 6)}`
}

/**
 * Build a compact, strictly two-site authority consequence packet.
 * Bounded scope only: source-site -> target-site (no citywide graph fanout).
 */
export function createCompactCivicAuthorityConsequencePacket(
  input: CompactCivicAuthorityConsequenceInput
): CompactCivicAuthorityConsequencePacket {
  const sourceSiteId = normalizeToken(input.sourceSiteId)
  const targetSiteId = normalizeToken(input.targetSiteId)
  const seedKey = normalizeToken(input.seedKey)
  const packetId = normalizeToken(input.packetId)

  return {
    packetId,
    week: Math.max(1, Math.trunc(input.week)),
    seedKey,
    link: {
      linkId: `authority-link:${sourceSiteId}:${targetSiteId}:${seedKey}`,
      scope: 'two_site',
      sourceSiteId,
      targetSiteId,
      operatorId: stableEntityId('operator', seedKey),
      institutionId: stableEntityId('institution', seedKey),
      authoritySignal: clamp(input.authoritySignal ?? 0, -1, 1),
    },
  }
}

/**
 * Deterministically derive the authority delta for a specific target site.
 * Only direct source->target links can contribute. Citywide effects are excluded.
 */
export function deriveAuthorityDeltaForTargetSite(
  packet: CompactCivicAuthorityConsequencePacket,
  targetSiteId: string,
  week: number
) {
  const normalizedTargetSiteId = normalizeToken(targetSiteId)
  const normalizedWeek = Math.max(1, Math.trunc(week))

  if (packet.link.targetSiteId !== normalizedTargetSiteId) {
    return 0
  }

  // Bound strictly to cross-site exchange.
  if (packet.link.sourceSiteId === packet.link.targetSiteId) {
    return 0
  }

  const temporalSeed = hashSeed(`${packet.packetId}:${normalizedWeek}:${normalizedTargetSiteId}`)
  const temporalJitter = ((temporalSeed % 7) - 3) / 200
  const baseDelta = packet.link.authoritySignal * 0.25

  return clamp(baseDelta + temporalJitter, -0.25, 0.25)
}

export function deriveCrossSiteAuthorityModifierForTargetSite(
  packets: readonly CompactCivicAuthorityConsequencePacket[],
  targetSiteId: string,
  week: number
): CrossSiteAuthorityModifier {
  const normalizedTargetSiteId = normalizeToken(targetSiteId)
  const normalizedWeek = Math.max(1, Math.trunc(week))
  const applicablePackets = packets
    .filter((packet) =>
      packet.link.scope === 'two_site' &&
      packet.link.targetSiteId === normalizedTargetSiteId &&
      packet.link.sourceSiteId !== normalizedTargetSiteId
    )
    .sort((left, right) => left.packetId.localeCompare(right.packetId))

  if (applicablePackets.length === 0) {
    return {
      targetSiteId: normalizedTargetSiteId,
      totalDelta: 0,
      weightModifier: 1,
      appliedPacketIds: [],
      reasonFragment: `cross-site-authority target:${normalizedTargetSiteId} none`,
    }
  }

  const appliedEntries = applicablePackets.map((packet) => ({
    packet,
    delta: deriveAuthorityDeltaForTargetSite(packet, normalizedTargetSiteId, normalizedWeek),
  }))

  const totalDelta = clamp(
    appliedEntries.reduce((sum, entry) => sum + entry.delta, 0),
    -0.3,
    0.3
  )
  const weightModifier = clamp(1 + totalDelta, 0.75, 1.25)
  const detail = appliedEntries
    .slice(0, 2)
    .map(
      ({ packet, delta }) =>
        `source:${packet.link.sourceSiteId} target:${packet.link.targetSiteId} delta:${delta.toFixed(3)} op:${packet.link.operatorId} inst:${packet.link.institutionId}`
    )
    .join(' | ')

  return {
    targetSiteId: normalizedTargetSiteId,
    totalDelta,
    weightModifier,
    appliedPacketIds: appliedEntries.map(({ packet }) => packet.packetId),
    reasonFragment: `cross-site-authority target:${normalizedTargetSiteId} total:${totalDelta.toFixed(3)} weight:${weightModifier.toFixed(3)} ${detail}`,
  }
}

export function deriveAuthorityTemplateWeightModifier(
  templateTags: readonly string[],
  totalDelta: number
) {
  if (totalDelta === 0) {
    return 1
  }

  const normalizedTags = new Set(templateTags.map((tag) => normalizeToken(tag)))
  const authorityTags = ['authority', 'inspection', 'patrol', 'enforcement', 'checkpoint']
  const antiAuthorityTags = ['criminal', 'smuggling', 'cult', 'occult', 'subversion']
  const hasAuthorityTag = authorityTags.some((tag) => normalizedTags.has(tag))
  const hasAntiAuthorityTag = antiAuthorityTags.some((tag) => normalizedTags.has(tag))

  const modifier =
    hasAuthorityTag && !hasAntiAuthorityTag
      ? 1 + totalDelta
      : hasAntiAuthorityTag && !hasAuthorityTag
        ? 1 - totalDelta
        : 1 + totalDelta * 0.25

  return clamp(modifier, 0.7, 1.3)
}