import {
  getKnowledgeKey,
  type KnowledgeFragmentation,
  type KnowledgeOwnerType,
  type KnowledgeState,
  type KnowledgeStateMap,
  type KnowledgeSubjectType,
  type KnowledgeTier,
} from '../knowledge'

const KNOWLEDGE_TIERS = new Set<KnowledgeTier>([
  'unknown',
  'partial',
  'relayed',
  'pending-relay',
  'suspected',
  'observed',
  'confirmed',
  'operationalized',
  'institutionalized',
])

const KNOWLEDGE_OWNER_TYPES = new Set<KnowledgeOwnerType>([
  'team',
  'site',
  'hazard',
  'protocol',
  'role',
])

const KNOWLEDGE_SUBJECT_TYPES = new Set<KnowledgeSubjectType>([
  'site',
  'anomaly',
  'hazard',
  'protocol',
  'procedure',
])

const KNOWLEDGE_FRAGMENTATION = new Set<KnowledgeFragmentation>(['none', 'fragmented', 'obsolete'])

const CONFIRMATION_STATES = new Set<NonNullable<KnowledgeState['confirmationState']>>([
  'provisional',
  'confirmed',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function finiteWeek(value: unknown, campaignWeek?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }

  let week = Math.max(1, Math.trunc(value))
  if (campaignWeek !== undefined) {
    week = Math.min(week, campaignWeek)
  }

  return week
}

function normalizeKnowledgeKey(
  rawKey: string,
  entityId: string,
  subjectId: string
) {
  const canonical = getKnowledgeKey(entityId, subjectId)
  return rawKey === canonical ? rawKey : canonical
}

function sanitizeKnowledgeEntry(
  rawKey: string,
  value: unknown,
  context: SanitizeKnowledgeStateMapContext
): [string, KnowledgeState] | null {
  if (!isRecord(value)) {
    return null
  }

  const entityId =
    typeof value.entityId === 'string' && value.entityId.trim().length > 0
      ? value.entityId.trim()
      : ''
  const subjectId =
    typeof value.subjectId === 'string' && value.subjectId.trim().length > 0
      ? value.subjectId.trim()
      : ''

  if (!entityId || !subjectId) {
    return null
  }

  const tier =
    typeof value.tier === 'string' && KNOWLEDGE_TIERS.has(value.tier as KnowledgeTier)
      ? (value.tier as KnowledgeTier)
      : 'unknown'

  const entityType =
    typeof value.entityType === 'string' &&
    KNOWLEDGE_OWNER_TYPES.has(value.entityType as KnowledgeOwnerType)
      ? (value.entityType as KnowledgeOwnerType)
      : 'team'

  if (
    context.knownTeamIds &&
    entityType === 'team' &&
    !context.knownTeamIds.has(entityId)
  ) {
    return null
  }

  const subjectType =
    typeof value.subjectType === 'string' &&
    KNOWLEDGE_SUBJECT_TYPES.has(value.subjectType as KnowledgeSubjectType)
      ? (value.subjectType as KnowledgeSubjectType)
      : 'anomaly'

  const lastConfirmedWeek = finiteWeek(value.lastConfirmedWeek, context.campaignWeek)
  const lastOperationalizedWeek = finiteWeek(value.lastOperationalizedWeek, context.campaignWeek)
  const lastDecayWeek = finiteWeek(value.lastDecayWeek, context.campaignWeek)
  const lastFusedWeek = finiteWeek(value.lastFusedWeek, context.campaignWeek)
  const lastDecayedWeek = finiteWeek(value.lastDecayedWeek, context.campaignWeek)
  const lastRelayedWeek = finiteWeek(value.lastRelayedWeek, context.campaignWeek)
  const lastRelayFailedWeek = finiteWeek(value.lastRelayFailedWeek, context.campaignWeek)
  const lastMaskedWeek = finiteWeek(value.lastMaskedWeek, context.campaignWeek)
  const relayAvailableWeek = finiteWeek(value.relayAvailableWeek, context.campaignWeek)
  const lastDefeatConditionUpdateWeek = finiteWeek(
    value.lastDefeatConditionUpdateWeek,
    context.campaignWeek
  )

  const fragmentation =
    typeof value.fragmentation === 'string' &&
    KNOWLEDGE_FRAGMENTATION.has(value.fragmentation as KnowledgeFragmentation)
      ? (value.fragmentation as KnowledgeFragmentation)
      : undefined

  const confirmationState =
    typeof value.confirmationState === 'string' &&
    CONFIRMATION_STATES.has(value.confirmationState as NonNullable<KnowledgeState['confirmationState']>)
      ? value.confirmationState
      : undefined

  const fusedFrom = [
    ...new Set(
      (Array.isArray(value.fusedFrom) ? value.fusedFrom : [])
        .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        .map((entry) => entry.trim())
        .filter((entry) => !context.knownTeamIds || context.knownTeamIds.has(entry))
    ),
  ]

  const exposureCount =
    typeof value.exposureCount === 'number' && Number.isFinite(value.exposureCount)
      ? Math.max(0, Math.trunc(value.exposureCount))
      : undefined

  const notes =
    typeof value.notes === 'string' && value.notes.trim().length > 0 ? value.notes.trim() : undefined
  const source =
    typeof value.source === 'string' && value.source.trim().length > 0
      ? value.source.trim()
      : undefined
  const provisionalClassification =
    typeof value.provisionalClassification === 'string' &&
    value.provisionalClassification.trim().length > 0
      ? value.provisionalClassification.trim()
      : undefined
  const trueClassification =
    typeof value.trueClassification === 'string' && value.trueClassification.trim().length > 0
      ? value.trueClassification.trim()
      : undefined
  const contextTag =
    typeof value.contextTag === 'string' && value.contextTag.trim().length > 0
      ? value.contextTag.trim()
      : undefined
  const relaySource =
    typeof value.relaySource === 'string' && value.relaySource.trim().length > 0
      ? value.relaySource.trim()
      : undefined

  const key = normalizeKnowledgeKey(rawKey, entityId, subjectId)

  return [
    key,
    {
      tier,
      entityId,
      entityType,
      subjectId,
      subjectType,
      ...(lastConfirmedWeek !== undefined ? { lastConfirmedWeek } : {}),
      ...(lastOperationalizedWeek !== undefined ? { lastOperationalizedWeek } : {}),
      ...(lastDecayWeek !== undefined ? { lastDecayWeek } : {}),
      ...(fragmentation ? { fragmentation } : {}),
      ...(value.obsolete === true ? { obsolete: true } : {}),
      ...(value.fragmented === true ? { fragmented: true } : {}),
      ...(exposureCount !== undefined ? { exposureCount } : {}),
      ...(source ? { source } : {}),
      ...(notes ? { notes } : {}),
      ...(provisionalClassification ? { provisionalClassification } : {}),
      ...(trueClassification ? { trueClassification } : {}),
      ...(confirmationState ? { confirmationState } : {}),
      ...(contextTag ? { contextTag } : {}),
      ...(fusedFrom.length > 0 ? { fusedFrom } : {}),
      ...(lastFusedWeek !== undefined ? { lastFusedWeek } : {}),
      ...(value.decayed === true ? { decayed: true } : {}),
      ...(lastDecayedWeek !== undefined ? { lastDecayedWeek } : {}),
      ...(relaySource ? { relaySource } : {}),
      ...(lastRelayedWeek !== undefined ? { lastRelayedWeek } : {}),
      ...(value.relayFailed === true ? { relayFailed: true } : {}),
      ...(lastRelayFailedWeek !== undefined ? { lastRelayFailedWeek } : {}),
      ...(relayAvailableWeek !== undefined ? { relayAvailableWeek } : {}),
      ...(value.masked === true ? { masked: true } : {}),
      ...(lastMaskedWeek !== undefined ? { lastMaskedWeek } : {}),
      ...(lastDefeatConditionUpdateWeek !== undefined
        ? { lastDefeatConditionUpdateWeek }
        : {}),
    },
  ]
}

export interface SanitizeKnowledgeStateMapContext {
  campaignWeek?: number
  knownTeamIds?: ReadonlySet<string>
}

/** Hydration 485: canonical knowledge map keys, tiers, weeks, and entity refs. */
export function sanitizeKnowledgeStateMap(
  value: unknown,
  fallback: KnowledgeStateMap,
  context: SanitizeKnowledgeStateMapContext = {}
): KnowledgeStateMap {
  if (!isRecord(value)) {
    return fallback
  }

  const next: KnowledgeStateMap = {}

  for (const [rawKey, entry] of Object.entries(value)) {
    if (typeof rawKey !== 'string' || rawKey.length === 0) {
      continue
    }

    const sanitized = sanitizeKnowledgeEntry(rawKey, entry, context)
    if (!sanitized) {
      continue
    }

    const [key, state] = sanitized
    next[key] = state
  }

  return Object.keys(next).length > 0 ? next : fallback
}
