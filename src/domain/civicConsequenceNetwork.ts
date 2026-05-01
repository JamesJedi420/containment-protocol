import type { RuntimeQueuedEvent } from './models'

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

export type CivicAuthorityPacketAvailability = 'persistent' | 'recurring'

export interface AuthoredCivicAuthoritySourceInput {
  sourceId: string
  sourceSiteId: string
  targetSiteId: string
  seedKey: string
  authoritySignal?: number
  firstWeek: number
  availability?: CivicAuthorityPacketAvailability
  cadenceWeeks?: number
}

export interface AuthoredCivicAuthoritySource {
  sourceId: string
  sourceSiteId: string
  targetSiteId: string
  seedKey: string
  authoritySignal: number
  firstWeek: number
  availability: CivicAuthorityPacketAvailability
  cadenceWeeks: number
}

export interface RuntimeEventAuthorityPacketIngestOptions {
  acceptedEventTypes?: readonly string[]
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number(value.toFixed(3))))
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'unknown'
}

function normalizeWeek(value: number) {
  return Math.max(1, Math.trunc(value))
}

function normalizeAvailability(
  value: CivicAuthorityPacketAvailability | string | undefined
): CivicAuthorityPacketAvailability {
  return value === 'recurring' ? 'recurring' : 'persistent'
}

function readPayloadString(payload: RuntimeQueuedEvent['payload'], key: string) {
  const raw = payload?.[key]
  return typeof raw === 'string' ? raw : undefined
}

function readPayloadNumber(payload: RuntimeQueuedEvent['payload'], key: string) {
  const raw = payload?.[key]
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined
}

function readPayloadBoolean(payload: RuntimeQueuedEvent['payload'], key: string) {
  const raw = payload?.[key]
  return typeof raw === 'boolean' ? raw : undefined
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

function isSourceActiveForWeek(source: AuthoredCivicAuthoritySource, week: number) {
  if (week < source.firstWeek) {
    return false
  }

  if (source.availability === 'persistent') {
    return true
  }

  return (week - source.firstWeek) % source.cadenceWeeks === 0
}

export function createAuthoredCivicAuthoritySource(
  input: AuthoredCivicAuthoritySourceInput
): AuthoredCivicAuthoritySource {
  return {
    sourceId: normalizeToken(input.sourceId),
    sourceSiteId: normalizeToken(input.sourceSiteId),
    targetSiteId: normalizeToken(input.targetSiteId),
    seedKey: normalizeToken(input.seedKey),
    authoritySignal: clamp(input.authoritySignal ?? 0, -1, 1),
    firstWeek: normalizeWeek(input.firstWeek),
    availability: normalizeAvailability(input.availability),
    cadenceWeeks: Math.max(1, Math.round(input.cadenceWeeks ?? 1)),
  }
}

export function deriveCivicAuthorityConsequencePacketsFromSources(
  sources: readonly AuthoredCivicAuthoritySource[],
  week: number
) {
  const normalizedWeek = normalizeWeek(week)

  return [...sources]
    .filter((source) => isSourceActiveForWeek(source, normalizedWeek))
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId))
    .map((source) =>
      createCompactCivicAuthorityConsequencePacket({
        packetId: source.sourceId,
        sourceSiteId: source.sourceSiteId,
        targetSiteId: source.targetSiteId,
        seedKey: source.seedKey,
        week: source.firstWeek,
        authoritySignal: source.authoritySignal,
      })
    )
}

export function extractAuthoredCivicAuthoritySourceFromRuntimeEvent(
  event: Pick<RuntimeQueuedEvent, 'id' | 'type' | 'targetId' | 'week' | 'payload'>,
  options?: RuntimeEventAuthorityPacketIngestOptions
) {
  const acceptedEventTypes = options?.acceptedEventTypes ?? ['encounter.follow_up']

  if (!acceptedEventTypes.includes(event.type)) {
    return null
  }

  const payload = event.payload
  const hasAuthorityChannelMarker =
    readPayloadBoolean(payload, 'civicAuthoritySource') === true ||
    readPayloadString(payload, 'civicPacketChannel') === 'authority'

  if (!hasAuthorityChannelMarker) {
    return null
  }

  const sourceSiteId = readPayloadString(payload, 'sourceSiteId')
  const targetSiteId = readPayloadString(payload, 'targetSiteId')
  const seedKey = readPayloadString(payload, 'seedKey')

  if (!sourceSiteId || !targetSiteId || !seedKey) {
    return null
  }

  const sourceId = readPayloadString(payload, 'sourceId') ?? event.id ?? event.targetId
  const authoritySignal = readPayloadNumber(payload, 'authoritySignal') ?? 0
  const firstWeek = readPayloadNumber(payload, 'startWeek') ?? event.week ?? 1
  const availability = normalizeAvailability(readPayloadString(payload, 'availability'))
  const cadenceWeeks = readPayloadNumber(payload, 'cadenceWeeks')

  return createAuthoredCivicAuthoritySource({
    sourceId,
    sourceSiteId,
    targetSiteId,
    seedKey,
    authoritySignal,
    firstWeek,
    availability,
    cadenceWeeks,
  })
}

export function deriveCivicAuthorityConsequencePacketsFromRuntimeEvents(
  events: readonly Pick<RuntimeQueuedEvent, 'id' | 'type' | 'targetId' | 'week' | 'payload'>[],
  week: number,
  options?: RuntimeEventAuthorityPacketIngestOptions
) {
  const sources = events
    .map((event) => extractAuthoredCivicAuthoritySourceFromRuntimeEvent(event, options))
    .filter((entry): entry is AuthoredCivicAuthoritySource => entry !== null)

  return deriveCivicAuthorityConsequencePacketsFromSources(sources, week)
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

/**
 * SPE-540 slice 4: Per-source-site conflict resolution.
 * When multiple packets share the same (sourceSiteId, targetSiteId) pair,
 * keep only the packet with the highest absolute authoritySignal.
 * Lexicographic packetId is the tiebreaker for equal absolute signals.
 * Input must be sorted by packetId; output is returned sorted by packetId.
 */
export function resolveAuthoritySameSourceConflicts(
  packets: readonly CompactCivicAuthorityConsequencePacket[]
): CompactCivicAuthorityConsequencePacket[] {
  const best = new Map<string, CompactCivicAuthorityConsequencePacket>()

  for (const packet of packets) {
    const key = `${packet.link.sourceSiteId}::${packet.link.targetSiteId}`
    const existing = best.get(key)

    if (!existing) {
      best.set(key, packet)
    } else {
      const existingAbs = Math.abs(existing.link.authoritySignal)
      const incomingAbs = Math.abs(packet.link.authoritySignal)

      if (
        incomingAbs > existingAbs ||
        (incomingAbs === existingAbs && packet.packetId < existing.packetId)
      ) {
        best.set(key, packet)
      }
    }
  }

  return [...best.values()].sort((left, right) => left.packetId.localeCompare(right.packetId))
}

export function deriveCrossSiteAuthorityModifierForTargetSite(
  packets: readonly CompactCivicAuthorityConsequencePacket[],
  targetSiteId: string,
  week: number
): CrossSiteAuthorityModifier {
  const normalizedTargetSiteId = normalizeToken(targetSiteId)
  const normalizedWeek = Math.max(1, Math.trunc(week))
  const rawApplicable = packets
    .filter((packet) =>
      packet.link.scope === 'two_site' &&
      packet.link.targetSiteId === normalizedTargetSiteId &&
      packet.link.sourceSiteId !== normalizedTargetSiteId
    )
    .sort((left, right) => left.packetId.localeCompare(right.packetId))
  // SPE-540 slice 4: resolve per-source conflicts before accumulating deltas.
  const applicablePackets = resolveAuthoritySameSourceConflicts(rawApplicable)

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