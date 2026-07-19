/**
 * SPE-2632 / SPE-2633 / SPE-2634 / SPE-2635 / SPE-2636 / SPE-2638 / SPE-956:
 * GameState persistence for participatory channel envelopes + evaluate-from-GameState helpers.
 * Slice 1 (SPE-2632): survivor informal registry (SPE-2630 evaluator).
 * Slice 2 (SPE-2633): collective memory channel (SPE-2631 evaluator).
 * Slice 3 (SPE-2634): hotline channel (SPE-2628 evaluator).
 * Slice 4 (SPE-2635): async discussion surface (SPE-2629 evaluator).
 * Slice 5 (SPE-2636): community advisory body (SPE-2620 evaluator).
 * Compose helpers (SPE-2638): resolve hydrated maps and call SPE-2620–2631 evaluators.
 * Sanitize/hydrate follows SPE-2621 pattern. No evaluator contract changes.
 */

import {
  DISCUSSION_WIDENING_RULES,
  EXAMPLE_DISCUSSION_SURFACE,
  TRANSCRIPT_RETENTION_MODES,
  evaluateAsyncDiscussionSession,
  type DiscussionParticipationWindow,
  type DiscussionSessionEvaluationInput,
  type DiscussionSessionEvaluationResult,
  type DiscussionSurface,
  type DiscussionWideningRule,
  type TranscriptRetentionMode,
} from './asyncDiscussionSurface'
import {
  CREDIBILITY_CEILINGS as MEMORY_CREDIBILITY_CEILINGS,
  EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
  NARRATIVE_STANCES,
  RECALL_WINDOWS,
  STABILIZATION_RULES,
  evaluateCollectiveMemoryStabilization,
  type CollectiveMemoryChannel,
  type CollectiveMemoryEvaluationInput,
  type CollectiveMemoryEvaluationResult,
  type CredibilityCeiling as MemoryCredibilityCeiling,
  type NarrativeStance,
  type RecallWindow,
  type StabilizationRule,
} from './collectiveMemoryStabilization'
import {
  COMMUNITY_ADVISORY_DECISION_SCOPES,
  EXAMPLE_COMMUNITY_ADVISORY_BODY,
  evaluateCommunityAdvisoryDecisionInfluence,
  type CommunityAdvisoryBody,
  type CommunityAdvisoryDecisionScope,
  type CommunityAdvisoryInfluenceEvaluationInput,
  type CommunityAdvisoryInfluenceResult,
} from './communityAdvisoryDecisionInfluence'
import {
  EXAMPLE_HOTLINE_CHANNEL,
  HOTLINE_ANGER_MODES,
  HOTLINE_UNANSWERED_MODES,
  evaluateHotlineCall,
  type HotlineAngerMode,
  type HotlineCallEvaluationInput,
  type HotlineCallEvaluationResult,
  type HotlineChannel,
  type HotlineUnansweredMode,
} from './hotlineChannel'
import {
  CATALOG_RULES,
  CREDIBILITY_CEILINGS,
  EXAMPLE_SURVIVOR_REGISTRY,
  RECOGNITION_STANCES,
  SUPPORT_KNOWLEDGE_BANDS,
  evaluateSurvivorInformalRegistrySignal,
  type CatalogRule,
  type CredibilityCeiling,
  type RecognitionStance,
  type SupportKnowledgeBand,
  type SurvivorInformalRegistry,
  type SurvivorRegistryEvaluationInput,
  type SurvivorRegistryEvaluationResult,
} from './survivorInformalRegistry'

export const SPE_956_PARTICIPATORY_CHANNEL_PERSISTENCE_SCHEMA_VERSION =
  'spe-956-participatory-channel.v1' as const

export type Spe956ParticipatoryChannelPersistenceSchemaVersion =
  typeof SPE_956_PARTICIPATORY_CHANNEL_PERSISTENCE_SCHEMA_VERSION

/** Persisted survivor informal registry: opaque authored SPE-2630 channel envelope. */
export type Spe956PersistedSurvivorInformalRegistry = SurvivorInformalRegistry

export type Spe956SurvivorInformalRegistryRecordsMap = Record<
  string,
  Spe956PersistedSurvivorInformalRegistry
>

/** Persisted collective memory channel: opaque authored SPE-2631 channel envelope. */
export type Spe956PersistedCollectiveMemoryChannel = CollectiveMemoryChannel

export type Spe956CollectiveMemoryChannelRecordsMap = Record<
  string,
  Spe956PersistedCollectiveMemoryChannel
>

type PlainRecord = Record<string, unknown>

function isPlainRecord(value: unknown): value is PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeId(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function isSafeMapKey(id: string): boolean {
  return id !== '__proto__' && id !== 'constructor' && id !== 'prototype'
}

function isRecognitionStance(value: unknown): value is RecognitionStance {
  return typeof value === 'string' && (RECOGNITION_STANCES as readonly string[]).includes(value)
}

function isCatalogRule(value: unknown): value is CatalogRule {
  return typeof value === 'string' && (CATALOG_RULES as readonly string[]).includes(value)
}

function isSupportKnowledgeBand(value: unknown): value is SupportKnowledgeBand {
  return typeof value === 'string' && (SUPPORT_KNOWLEDGE_BANDS as readonly string[]).includes(value)
}

function isCredibilityCeiling(value: unknown): value is CredibilityCeiling {
  return typeof value === 'string' && (CREDIBILITY_CEILINGS as readonly string[]).includes(value)
}

function sanitizeSpe956SurvivorInformalRegistryEntry(
  value: unknown
): Spe956PersistedSurvivorInformalRegistry | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeId(value.id, '')
  if (
    id.length === 0 ||
    !isSafeMapKey(id) ||
    !isRecognitionStance(value.recognitionStance) ||
    !isCatalogRule(value.catalogRule) ||
    !isSupportKnowledgeBand(value.supportKnowledgeBand) ||
    !isCredibilityCeiling(value.credibilityCeiling)
  ) {
    return null
  }

  return Object.freeze({
    id,
    recognitionStance: value.recognitionStance,
    catalogRule: value.catalogRule,
    supportKnowledgeBand: value.supportKnowledgeBand,
    credibilityCeiling: value.credibilityCeiling,
  })
}

/** Hydration: canonical authored registry map keyed by registry id. */
export function sanitizeSpe956SurvivorInformalRegistryRecords(
  value: unknown,
  fallback: Spe956SurvivorInformalRegistryRecordsMap = {}
): Spe956SurvivorInformalRegistryRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next = Object.create(null) as Spe956SurvivorInformalRegistryRecordsMap
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeSpe956SurvivorInformalRegistryEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  // Plain-record input (including authored `{}`) wins over fallback so cleared
  // maps survive Zustand rehydration when current state still holds records.
  return next
}

export function extractSpe956SurvivorInformalRegistryRecords(
  game: Partial<{
    spe956SurvivorInformalRegistryRecords?: Spe956SurvivorInformalRegistryRecordsMap
  }>
): Spe956SurvivorInformalRegistryRecordsMap {
  return game.spe956SurvivorInformalRegistryRecords ?? {}
}

export function resolvePersistedSurvivorInformalRegistry(
  game: Partial<{
    spe956SurvivorInformalRegistryRecords?: Spe956SurvivorInformalRegistryRecordsMap
  }>,
  registryId: string
): Spe956PersistedSurvivorInformalRegistry | null {
  if (!isSafeMapKey(registryId)) {
    return null
  }

  const records = extractSpe956SurvivorInformalRegistryRecords(game)
  if (!Object.prototype.hasOwnProperty.call(records, registryId)) {
    return null
  }

  return records[registryId] ?? null
}

/** EXAMPLE persisted registry fixture (mirrors SPE-2630 authored registry). */
export const SPE_956_EXAMPLE_SURVIVOR_INFORMAL_REGISTRY_RECORDS: Spe956SurvivorInformalRegistryRecordsMap =
  Object.freeze({
    [EXAMPLE_SURVIVOR_REGISTRY.id]: EXAMPLE_SURVIVOR_REGISTRY,
  })

function isNarrativeStance(value: unknown): value is NarrativeStance {
  return typeof value === 'string' && (NARRATIVE_STANCES as readonly string[]).includes(value)
}

function isRecallWindow(value: unknown): value is RecallWindow {
  return typeof value === 'string' && (RECALL_WINDOWS as readonly string[]).includes(value)
}

function isMemoryCredibilityCeiling(value: unknown): value is MemoryCredibilityCeiling {
  return (
    typeof value === 'string' && (MEMORY_CREDIBILITY_CEILINGS as readonly string[]).includes(value)
  )
}

function isStabilizationRule(value: unknown): value is StabilizationRule {
  return typeof value === 'string' && (STABILIZATION_RULES as readonly string[]).includes(value)
}

function sanitizeSpe956CollectiveMemoryChannelEntry(
  value: unknown
): Spe956PersistedCollectiveMemoryChannel | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeId(value.id, '')
  if (
    id.length === 0 ||
    !isSafeMapKey(id) ||
    !isNarrativeStance(value.narrativeStance) ||
    !isRecallWindow(value.recallWindow) ||
    !isMemoryCredibilityCeiling(value.credibilityCeiling) ||
    !isStabilizationRule(value.stabilizationRule)
  ) {
    return null
  }

  return Object.freeze({
    id,
    narrativeStance: value.narrativeStance,
    recallWindow: value.recallWindow,
    credibilityCeiling: value.credibilityCeiling,
    stabilizationRule: value.stabilizationRule,
  })
}

/** Hydration: canonical authored collective memory channel map keyed by channel id. */
export function sanitizeSpe956CollectiveMemoryChannelRecords(
  value: unknown,
  fallback: Spe956CollectiveMemoryChannelRecordsMap = {}
): Spe956CollectiveMemoryChannelRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next = Object.create(null) as Spe956CollectiveMemoryChannelRecordsMap
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeSpe956CollectiveMemoryChannelEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  // Plain-record input (including authored `{}`) wins over fallback so cleared
  // maps survive Zustand rehydration when current state still holds records.
  return next
}

export function extractSpe956CollectiveMemoryChannelRecords(
  game: Partial<{
    spe956CollectiveMemoryChannelRecords?: Spe956CollectiveMemoryChannelRecordsMap
  }>
): Spe956CollectiveMemoryChannelRecordsMap {
  return game.spe956CollectiveMemoryChannelRecords ?? {}
}

export function resolvePersistedCollectiveMemoryChannel(
  game: Partial<{
    spe956CollectiveMemoryChannelRecords?: Spe956CollectiveMemoryChannelRecordsMap
  }>,
  channelId: string
): Spe956PersistedCollectiveMemoryChannel | null {
  if (!isSafeMapKey(channelId)) {
    return null
  }

  const records = extractSpe956CollectiveMemoryChannelRecords(game)
  if (!Object.prototype.hasOwnProperty.call(records, channelId)) {
    return null
  }

  return records[channelId] ?? null
}

/** EXAMPLE persisted collective memory channel fixture (mirrors SPE-2631 authored channel). */
export const SPE_956_EXAMPLE_COLLECTIVE_MEMORY_CHANNEL_RECORDS: Spe956CollectiveMemoryChannelRecordsMap =
  Object.freeze({
    [EXAMPLE_MEMORY_STABILIZATION_CHANNEL.id]: EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
  })

/** Persisted hotline channel: opaque authored SPE-2628 channel envelope. */
export type Spe956PersistedHotlineChannel = HotlineChannel

export type Spe956HotlineChannelRecordsMap = Record<string, Spe956PersistedHotlineChannel>

function isUnitInterval(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function isHotlineUnansweredMode(value: unknown): value is HotlineUnansweredMode {
  return typeof value === 'string' && (HOTLINE_UNANSWERED_MODES as readonly string[]).includes(value)
}

function isHotlineAngerMode(value: unknown): value is HotlineAngerMode {
  return typeof value === 'string' && (HOTLINE_ANGER_MODES as readonly string[]).includes(value)
}

function sanitizeSpe956HotlineChannelEntry(value: unknown): Spe956PersistedHotlineChannel | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const {
    id: rawId,
    scriptQuality,
    staffingCapacity,
    languageSupport,
    escalationRules: rawEscalationRules,
    unansweredMode,
    angerMode,
    handleThreshold,
  } = value

  const id = normalizeId(rawId, '')
  const escalationRules =
    typeof rawEscalationRules === 'string' ? rawEscalationRules.trim() : ''

  if (
    id.length === 0 ||
    !isSafeMapKey(id) ||
    !isUnitInterval(scriptQuality) ||
    !isUnitInterval(staffingCapacity) ||
    typeof languageSupport !== 'boolean' ||
    escalationRules.length === 0 ||
    !isHotlineUnansweredMode(unansweredMode) ||
    !isHotlineAngerMode(angerMode) ||
    !isUnitInterval(handleThreshold)
  ) {
    return null
  }

  return Object.freeze({
    id,
    scriptQuality,
    staffingCapacity,
    languageSupport,
    escalationRules,
    unansweredMode,
    angerMode,
    handleThreshold,
  })
}

/** Hydration: canonical authored hotline channel map keyed by channel id. */
export function sanitizeSpe956HotlineChannelRecords(
  value: unknown,
  fallback: Spe956HotlineChannelRecordsMap = {}
): Spe956HotlineChannelRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next = Object.create(null) as Spe956HotlineChannelRecordsMap
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeSpe956HotlineChannelEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  // Plain-record input (including authored `{}`) wins over fallback so cleared
  // maps survive Zustand rehydration when current state still holds records.
  return next
}

export function extractSpe956HotlineChannelRecords(
  game: Partial<{
    spe956HotlineChannelRecords?: Spe956HotlineChannelRecordsMap
  }>
): Spe956HotlineChannelRecordsMap {
  return game.spe956HotlineChannelRecords ?? {}
}

export function resolvePersistedHotlineChannel(
  game: Partial<{
    spe956HotlineChannelRecords?: Spe956HotlineChannelRecordsMap
  }>,
  channelId: string
): Spe956PersistedHotlineChannel | null {
  if (!isSafeMapKey(channelId)) {
    return null
  }

  const records = extractSpe956HotlineChannelRecords(game)
  if (!Object.prototype.hasOwnProperty.call(records, channelId)) {
    return null
  }

  return records[channelId] ?? null
}

/** EXAMPLE persisted hotline channel fixture (mirrors SPE-2628 authored channel). */
export const SPE_956_EXAMPLE_HOTLINE_CHANNEL_RECORDS: Spe956HotlineChannelRecordsMap = Object.freeze({
  [EXAMPLE_HOTLINE_CHANNEL.id]: EXAMPLE_HOTLINE_CHANNEL,
})

/** Persisted async discussion surface: opaque authored SPE-2629 channel envelope. */
export type Spe956PersistedAsyncDiscussionSurface = DiscussionSurface

export type Spe956AsyncDiscussionSurfaceRecordsMap = Record<
  string,
  Spe956PersistedAsyncDiscussionSurface
>

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isTranscriptRetentionMode(value: unknown): value is TranscriptRetentionMode {
  return (
    typeof value === 'string' && (TRANSCRIPT_RETENTION_MODES as readonly string[]).includes(value)
  )
}

function isDiscussionWideningRule(value: unknown): value is DiscussionWideningRule {
  return (
    typeof value === 'string' && (DISCUSSION_WIDENING_RULES as readonly string[]).includes(value)
  )
}

function sanitizeParticipationWindow(value: unknown): DiscussionParticipationWindow | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const { startWeek, endWeek } = value
  if (!isNonNegativeInt(startWeek) || !isNonNegativeInt(endWeek) || startWeek > endWeek) {
    return null
  }

  return Object.freeze({ startWeek, endWeek })
}

function sanitizeSpe956AsyncDiscussionSurfaceEntry(
  value: unknown
): Spe956PersistedAsyncDiscussionSurface | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const {
    id: rawId,
    participationWindow: rawWindow,
    transcriptRetentionMode,
    wideningRule,
    memoryStabilization,
  } = value

  const id = normalizeId(rawId, '')
  const participationWindow = sanitizeParticipationWindow(rawWindow)

  if (
    id.length === 0 ||
    !isSafeMapKey(id) ||
    participationWindow === null ||
    !isTranscriptRetentionMode(transcriptRetentionMode) ||
    !isDiscussionWideningRule(wideningRule) ||
    typeof memoryStabilization !== 'boolean'
  ) {
    return null
  }

  return Object.freeze({
    id,
    participationWindow,
    transcriptRetentionMode,
    wideningRule,
    memoryStabilization,
  })
}

/** Hydration: canonical authored async discussion surface map keyed by surface id. */
export function sanitizeSpe956AsyncDiscussionSurfaceRecords(
  value: unknown,
  fallback: Spe956AsyncDiscussionSurfaceRecordsMap = {}
): Spe956AsyncDiscussionSurfaceRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next = Object.create(null) as Spe956AsyncDiscussionSurfaceRecordsMap
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeSpe956AsyncDiscussionSurfaceEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  // Plain-record input (including authored `{}`) wins over fallback so cleared
  // maps survive Zustand rehydration when current state still holds records.
  return next
}

export function extractSpe956AsyncDiscussionSurfaceRecords(
  game: Partial<{
    spe956AsyncDiscussionSurfaceRecords?: Spe956AsyncDiscussionSurfaceRecordsMap
  }>
): Spe956AsyncDiscussionSurfaceRecordsMap {
  return game.spe956AsyncDiscussionSurfaceRecords ?? {}
}

export function resolvePersistedAsyncDiscussionSurface(
  game: Partial<{
    spe956AsyncDiscussionSurfaceRecords?: Spe956AsyncDiscussionSurfaceRecordsMap
  }>,
  surfaceId: string
): Spe956PersistedAsyncDiscussionSurface | null {
  if (!isSafeMapKey(surfaceId)) {
    return null
  }

  const records = extractSpe956AsyncDiscussionSurfaceRecords(game)
  if (!Object.prototype.hasOwnProperty.call(records, surfaceId)) {
    return null
  }

  return records[surfaceId] ?? null
}

/** EXAMPLE persisted async discussion surface fixture (mirrors SPE-2629 authored surface). */
export const SPE_956_EXAMPLE_ASYNC_DISCUSSION_SURFACE_RECORDS: Spe956AsyncDiscussionSurfaceRecordsMap =
  Object.freeze({
    [EXAMPLE_DISCUSSION_SURFACE.id]: EXAMPLE_DISCUSSION_SURFACE,
  })

/** Persisted community advisory body: opaque authored SPE-2620 channel envelope. */
export type Spe956PersistedCommunityAdvisoryBody = CommunityAdvisoryBody

export type Spe956CommunityAdvisoryBodyRecordsMap = Record<
  string,
  Spe956PersistedCommunityAdvisoryBody
>

function isPositiveUnitInterval(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1
}

function isCommunityAdvisoryDecisionScope(
  value: unknown
): value is CommunityAdvisoryDecisionScope {
  return (
    typeof value === 'string' &&
    (COMMUNITY_ADVISORY_DECISION_SCOPES as readonly string[]).includes(value)
  )
}

function sanitizeRepresentedStakeholderClasses(
  value: unknown
): readonly string[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const next: string[] = []
  for (const entry of value) {
    if (typeof entry !== 'string') {
      return null
    }
    const trimmed = entry.trim()
    if (trimmed.length > 0) {
      next.push(trimmed)
    }
  }

  if (next.length === 0) {
    return null
  }

  return Object.freeze(next)
}

function sanitizeAuthorizedDecisionScopes(
  value: unknown
): readonly CommunityAdvisoryDecisionScope[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null
  }

  const next: CommunityAdvisoryDecisionScope[] = []
  for (const entry of value) {
    if (!isCommunityAdvisoryDecisionScope(entry)) {
      return null
    }
    next.push(entry)
  }

  return Object.freeze(next)
}

function sanitizeSpe956CommunityAdvisoryBodyEntry(
  value: unknown
): Spe956PersistedCommunityAdvisoryBody | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const {
    id: rawId,
    mission: rawMission,
    membershipRule: rawMembershipRule,
    representedStakeholderClasses: rawStakeholderClasses,
    authorizedDecisionScopes: rawScopes,
    influenceThreshold,
    decisionCriteria: rawDecisionCriteria,
  } = value

  const id = normalizeId(rawId, '')
  const mission = typeof rawMission === 'string' ? rawMission.trim() : ''
  const membershipRule =
    typeof rawMembershipRule === 'string' ? rawMembershipRule.trim() : ''
  const decisionCriteria =
    typeof rawDecisionCriteria === 'string' ? rawDecisionCriteria.trim() : ''
  const representedStakeholderClasses =
    sanitizeRepresentedStakeholderClasses(rawStakeholderClasses)
  const authorizedDecisionScopes = sanitizeAuthorizedDecisionScopes(rawScopes)

  if (
    id.length === 0 ||
    !isSafeMapKey(id) ||
    mission.length === 0 ||
    membershipRule.length === 0 ||
    decisionCriteria.length === 0 ||
    representedStakeholderClasses === null ||
    authorizedDecisionScopes === null ||
    !isPositiveUnitInterval(influenceThreshold)
  ) {
    return null
  }

  return Object.freeze({
    id,
    mission,
    membershipRule,
    representedStakeholderClasses,
    authorizedDecisionScopes,
    influenceThreshold,
    decisionCriteria,
  })
}

/** Hydration: canonical authored community advisory body map keyed by body id. */
export function sanitizeSpe956CommunityAdvisoryBodyRecords(
  value: unknown,
  fallback: Spe956CommunityAdvisoryBodyRecordsMap = {}
): Spe956CommunityAdvisoryBodyRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next = Object.create(null) as Spe956CommunityAdvisoryBodyRecordsMap
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeSpe956CommunityAdvisoryBodyEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  // Plain-record input (including authored `{}`) wins over fallback so cleared
  // maps survive Zustand rehydration when current state still holds records.
  return next
}

export function extractSpe956CommunityAdvisoryBodyRecords(
  game: Partial<{
    spe956CommunityAdvisoryBodyRecords?: Spe956CommunityAdvisoryBodyRecordsMap
  }>
): Spe956CommunityAdvisoryBodyRecordsMap {
  return game.spe956CommunityAdvisoryBodyRecords ?? {}
}

export function resolvePersistedCommunityAdvisoryBody(
  game: Partial<{
    spe956CommunityAdvisoryBodyRecords?: Spe956CommunityAdvisoryBodyRecordsMap
  }>,
  bodyId: string
): Spe956PersistedCommunityAdvisoryBody | null {
  if (!isSafeMapKey(bodyId)) {
    return null
  }

  const records = extractSpe956CommunityAdvisoryBodyRecords(game)
  if (!Object.prototype.hasOwnProperty.call(records, bodyId)) {
    return null
  }

  return records[bodyId] ?? null
}

/** EXAMPLE persisted community advisory body fixture (mirrors SPE-2620 authored body). */
export const SPE_956_EXAMPLE_COMMUNITY_ADVISORY_BODY_RECORDS: Spe956CommunityAdvisoryBodyRecordsMap =
  Object.freeze({
    [EXAMPLE_COMMUNITY_ADVISORY_BODY.id]: EXAMPLE_COMMUNITY_ADVISORY_BODY,
  })

/** GameState shape used by SPE-2638 evaluate-from-GameState helpers. */
export interface Spe956ParticipatoryChannelGameStateLike {
  readonly spe956SurvivorInformalRegistryRecords?: Spe956SurvivorInformalRegistryRecordsMap
  readonly spe956CollectiveMemoryChannelRecords?: Spe956CollectiveMemoryChannelRecordsMap
  readonly spe956HotlineChannelRecords?: Spe956HotlineChannelRecordsMap
  readonly spe956AsyncDiscussionSurfaceRecords?: Spe956AsyncDiscussionSurfaceRecordsMap
  readonly spe956CommunityAdvisoryBodyRecords?: Spe956CommunityAdvisoryBodyRecordsMap
}

/**
 * Read helper: resolve hydrated advisory body from GameState and evaluate influence
 * (SPE-2620). Missing/unsafe ids pass null body into the existing evaluator no-op path.
 */
export function evaluateCommunityAdvisoryDecisionInfluenceFromGameState(
  game: Partial<Spe956ParticipatoryChannelGameStateLike>,
  bodyId: string,
  input: Omit<CommunityAdvisoryInfluenceEvaluationInput, 'body'>
): CommunityAdvisoryInfluenceResult {
  return evaluateCommunityAdvisoryDecisionInfluence({
    ...input,
    body: resolvePersistedCommunityAdvisoryBody(game, bodyId),
  })
}

/**
 * Read helper: resolve hydrated hotline channel from GameState and evaluate a call
 * (SPE-2628). Missing/unsafe ids pass null channel into the existing evaluator no-op path.
 */
export function evaluateHotlineCallFromGameState(
  game: Partial<Spe956ParticipatoryChannelGameStateLike>,
  channelId: string,
  input: Omit<HotlineCallEvaluationInput, 'channel'>
): HotlineCallEvaluationResult {
  return evaluateHotlineCall({
    ...input,
    channel: resolvePersistedHotlineChannel(game, channelId),
  })
}

/**
 * Read helper: resolve hydrated async discussion surface from GameState and evaluate
 * a session (SPE-2629). Missing/unsafe ids pass null surface into the existing no-op path.
 */
export function evaluateAsyncDiscussionSessionFromGameState(
  game: Partial<Spe956ParticipatoryChannelGameStateLike>,
  surfaceId: string,
  input: Omit<DiscussionSessionEvaluationInput, 'surface'>
): DiscussionSessionEvaluationResult {
  return evaluateAsyncDiscussionSession({
    ...input,
    surface: resolvePersistedAsyncDiscussionSurface(game, surfaceId),
  })
}

/**
 * Read helper: resolve hydrated survivor registry from GameState and evaluate a signal
 * (SPE-2630). Missing/unsafe ids pass null registry into the existing evaluator no-op path.
 */
export function evaluateSurvivorInformalRegistrySignalFromGameState(
  game: Partial<Spe956ParticipatoryChannelGameStateLike>,
  registryId: string,
  input: Omit<SurvivorRegistryEvaluationInput, 'registry'>
): SurvivorRegistryEvaluationResult {
  return evaluateSurvivorInformalRegistrySignal({
    ...input,
    registry: resolvePersistedSurvivorInformalRegistry(game, registryId),
  })
}

/**
 * Read helper: resolve hydrated collective memory channel from GameState and evaluate
 * a signal (SPE-2631). Missing/unsafe ids pass null channel into the existing no-op path.
 */
export function evaluateCollectiveMemoryStabilizationFromGameState(
  game: Partial<Spe956ParticipatoryChannelGameStateLike>,
  channelId: string,
  input: Omit<CollectiveMemoryEvaluationInput, 'channel'>
): CollectiveMemoryEvaluationResult {
  return evaluateCollectiveMemoryStabilization({
    ...input,
    channel: resolvePersistedCollectiveMemoryChannel(game, channelId),
  })
}
