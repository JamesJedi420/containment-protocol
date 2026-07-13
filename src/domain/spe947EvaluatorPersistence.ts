/**
 * SPE-2576 / SPE-947: GameState persistence for shipped SPE-2568–2573 evaluator inputs.
 * Compact platform / plan / media / owner maps with sanitize/hydrate only.
 * No weekly hooks, store, UI, or propagation graph.
 */

import type { ContentOwner, ContentOwnerIncentives } from './contentOwnerTakedownResistance'
import type { CounterMemeticPlan } from './counterMemeticUptakeGate'
import type { ContentPropagationArtifact } from './footageExposureTraffic'
import {
  PLATFORM_UPTIME_STATES,
  type PlatformOperationNode,
  type PlatformOperationRequest,
  type PlatformUptimeState,
} from './platformOperationDegrade'
import type { PlatformReachNode } from './platformReachMultiplier'
import {
  POST_CASE_MEDIA_KINDS,
  type PostCaseMediaArtifact,
  type PostCaseMediaPersistenceInput,
  type PostCaseMediaKind,
} from './postCaseMediaPersistence'
import {
  CONTENT_ARTIFACT_KINDS,
  CONTENT_ARTIFACT_ROLES,
  type ContentArtifactKind,
  type ContentArtifactRole,
} from './footageExposureTraffic'
import {
  COUNTER_MEMETIC_LORE_STATES,
  COUNTER_MEMETIC_UPTAKE_STATES,
  type CounterMemeticLoreState,
  type CounterMemeticUptakeState,
} from './counterMemeticUptakeGate'
import {
  EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT,
  type FootageExposureEvaluationInput,
} from './footageExposureTraffic'
import {
  EXAMPLE_COUNTER_MEMETIC_PLAN,
  type CounterMemeticUptakeEvaluationInput,
} from './counterMemeticUptakeGate'
import {
  EXAMPLE_RESISTING_CONTENT_OWNER,
  type TakedownResistanceEvaluationInput,
} from './contentOwnerTakedownResistance'
import {
  EXAMPLE_COUNTER_MEMETIC_BLAST,
  EXAMPLE_RUMOR_FORUM_OPERATION_PLATFORM,
  type PlatformOperationEvaluationInput,
} from './platformOperationDegrade'
import {
  EXAMPLE_RUMOR_FORUM_PLATFORM,
  type PlatformReachEvaluationInput,
} from './platformReachMultiplier'
import { EXAMPLE_PERSISTING_POST_CASE_MEDIA } from './postCaseMediaPersistence'

export const SPE_947_EVALUATOR_PERSISTENCE_SCHEMA_VERSION = 'spe-947-evaluator.v1' as const

export type Spe947EvaluatorPersistenceSchemaVersion =
  typeof SPE_947_EVALUATOR_PERSISTENCE_SCHEMA_VERSION

/**
 * Unified compact platform record for SPE-2568 reach and SPE-2569 operation evaluators.
 * Optional runtime metrics (viewCount, anomalyReach) persist evaluation context only.
 */
export interface Spe947PersistedPlatform {
  readonly id: string
  readonly label: string
  readonly reachFactor?: number
  readonly viewsPerScaleUnit?: number
  readonly viewCount?: number
  readonly anomalyReach?: number
  readonly uptimeState?: PlatformUptimeState
  readonly availableReach?: number
}

export interface Spe947FootageExposureBinding {
  readonly artifactId: string
  readonly baselineCivilianExposure?: number
  readonly baselineAttractionTraffic?: number
}

export interface Spe947TakedownResistanceBinding {
  readonly ownerId: string
  readonly resistThreshold: number
  readonly contestedThreshold?: number
}

export type Spe947PlatformRecordsMap = Record<string, Spe947PersistedPlatform>
export type Spe947OperationRecordsMap = Record<string, PlatformOperationRequest>
export type Spe947ContentArtifactRecordsMap = Record<string, ContentPropagationArtifact>
export type Spe947CounterMemeticPlanRecordsMap = Record<string, CounterMemeticPlan>
export type Spe947ContentOwnerRecordsMap = Record<string, ContentOwner>
export type Spe947PostCaseMediaCaseRecordsMap = Record<string, PostCaseMediaPersistenceInput>
export type Spe947FootageExposureBindingRecordsMap = Record<string, Spe947FootageExposureBinding>
export type Spe947TakedownResistanceBindingRecordsMap = Record<
  string,
  Spe947TakedownResistanceBinding
>

export interface Spe947EvaluatorPersistenceMaps {
  readonly spe947PlatformRecords: Spe947PlatformRecordsMap
  readonly spe947OperationRecords: Spe947OperationRecordsMap
  readonly spe947ContentArtifacts: Spe947ContentArtifactRecordsMap
  readonly spe947CounterMemeticPlans: Spe947CounterMemeticPlanRecordsMap
  readonly spe947ContentOwners: Spe947ContentOwnerRecordsMap
  readonly spe947PostCaseMediaCases: Spe947PostCaseMediaCaseRecordsMap
  readonly spe947FootageExposureBindings: Spe947FootageExposureBindingRecordsMap
  readonly spe947TakedownResistanceBindings: Spe947TakedownResistanceBindingRecordsMap
}

type PlainRecord = Record<string, unknown>

function isPlainRecord(value: unknown): value is PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeId(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function normalizeLabel(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isPlatformUptimeState(value: unknown): value is PlatformUptimeState {
  return typeof value === 'string' && (PLATFORM_UPTIME_STATES as readonly string[]).includes(value)
}

function isArtifactKind(value: unknown): value is ContentArtifactKind {
  return typeof value === 'string' && (CONTENT_ARTIFACT_KINDS as readonly string[]).includes(value)
}

function isArtifactRole(value: unknown): value is ContentArtifactRole {
  return typeof value === 'string' && (CONTENT_ARTIFACT_ROLES as readonly string[]).includes(value)
}

function isLoreState(value: unknown): value is CounterMemeticLoreState {
  return (
    typeof value === 'string' && (COUNTER_MEMETIC_LORE_STATES as readonly string[]).includes(value)
  )
}

function isUptakeState(value: unknown): value is CounterMemeticUptakeState {
  return (
    typeof value === 'string' &&
    (COUNTER_MEMETIC_UPTAKE_STATES as readonly string[]).includes(value)
  )
}

function isMediaKind(value: unknown): value is PostCaseMediaKind {
  return typeof value === 'string' && (POST_CASE_MEDIA_KINDS as readonly string[]).includes(value)
}

function sanitizeOwnerIncentives(value: unknown): ContentOwnerIncentives | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const incentives: ContentOwnerIncentives = {}
  let hasValidField = false

  for (const key of ['audience', 'status', 'profit', 'identity'] as const) {
    const field = value[key]
    if (field === undefined) {
      continue
    }

    if (!isNonNegativeFinite(field)) {
      return null
    }

    incentives[key] = field
    hasValidField = true
  }

  return hasValidField ? Object.freeze(incentives) : Object.freeze({})
}

function sanitizeSpe947PlatformEntry(value: unknown): Spe947PersistedPlatform | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeId(value.id, '')
  const label = normalizeLabel(value.label, id)
  if (id.length === 0 || label.length === 0) {
    return null
  }

  if (value.reachFactor !== undefined && !isPositiveFinite(value.reachFactor)) {
    return null
  }

  if (value.viewsPerScaleUnit !== undefined && !isPositiveFinite(value.viewsPerScaleUnit)) {
    return null
  }

  if (value.viewCount !== undefined && !isNonNegativeFinite(value.viewCount)) {
    return null
  }

  if (value.anomalyReach !== undefined && !isNonNegativeFinite(value.anomalyReach)) {
    return null
  }

  if (value.availableReach !== undefined && !isNonNegativeFinite(value.availableReach)) {
    return null
  }

  if (value.uptimeState !== undefined && !isPlatformUptimeState(value.uptimeState)) {
    return null
  }

  return Object.freeze({
    id,
    label,
    ...(value.reachFactor !== undefined ? { reachFactor: value.reachFactor } : {}),
    ...(value.viewsPerScaleUnit !== undefined
      ? { viewsPerScaleUnit: value.viewsPerScaleUnit }
      : {}),
    ...(value.viewCount !== undefined ? { viewCount: value.viewCount } : {}),
    ...(value.anomalyReach !== undefined ? { anomalyReach: value.anomalyReach } : {}),
    ...(value.uptimeState !== undefined ? { uptimeState: value.uptimeState } : {}),
    ...(value.availableReach !== undefined ? { availableReach: value.availableReach } : {}),
  })
}

function sanitizeSpe947OperationEntry(value: unknown): PlatformOperationRequest | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeId(value.id, '')
  const label = normalizeLabel(value.label, id)
  if (id.length === 0 || label.length === 0 || !isPositiveFinite(value.requiredReach)) {
    return null
  }

  return Object.freeze({
    id,
    label,
    requiredReach: value.requiredReach,
  })
}

function sanitizeSpe947ContentArtifactEntry(value: unknown): ContentPropagationArtifact | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeId(value.id, '')
  const label = normalizeLabel(value.label, id)
  if (
    id.length === 0 ||
    label.length === 0 ||
    !isArtifactKind(value.kind) ||
    !isArtifactRole(value.role) ||
    !isNonNegativeFinite(value.exposureWeight) ||
    !isNonNegativeFinite(value.attractionWeight)
  ) {
    return null
  }

  if (value.intensity !== undefined && !isNonNegativeFinite(value.intensity)) {
    return null
  }

  return Object.freeze({
    id,
    label,
    kind: value.kind,
    role: value.role,
    exposureWeight: value.exposureWeight,
    attractionWeight: value.attractionWeight,
    ...(value.intensity !== undefined ? { intensity: value.intensity } : {}),
  })
}

function sanitizeSpe947CounterMemeticPlanEntry(value: unknown): CounterMemeticPlan | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeId(value.id, '')
  const label = normalizeLabel(value.label, id)
  if (
    id.length === 0 ||
    label.length === 0 ||
    !isLoreState(value.loreState) ||
    !isPositiveFinite(value.requiredPropagationWeeks) ||
    !isNonNegativeFinite(value.elapsedPropagationWeeks) ||
    !isUptakeState(value.uptakeState)
  ) {
    return null
  }

  const distributorId =
    typeof value.distributorId === 'string' && value.distributorId.trim().length > 0
      ? value.distributorId.trim()
      : undefined

  return Object.freeze({
    id,
    label,
    loreState: value.loreState,
    requiredPropagationWeeks: value.requiredPropagationWeeks,
    elapsedPropagationWeeks: value.elapsedPropagationWeeks,
    uptakeState: value.uptakeState,
    ...(distributorId !== undefined ? { distributorId } : {}),
  })
}

function sanitizeSpe947ContentOwnerEntry(value: unknown): ContentOwner | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeId(value.id, '')
  const label = normalizeLabel(value.label, id)
  const incentives = sanitizeOwnerIncentives(value.incentives)
  if (id.length === 0 || label.length === 0 || incentives === null) {
    return null
  }

  return Object.freeze({
    id,
    label,
    incentives,
  })
}

function sanitizePostCaseMediaArtifactEntry(value: unknown): PostCaseMediaArtifact | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeId(value.id, '')
  const label = normalizeLabel(value.label, id)
  if (
    id.length === 0 ||
    label.length === 0 ||
    !isMediaKind(value.kind) ||
    !isBoolean(value.persistsAfterContainment) ||
    !isNonNegativeFinite(value.riskWeight)
  ) {
    return null
  }

  return Object.freeze({
    id,
    label,
    kind: value.kind,
    persistsAfterContainment: value.persistsAfterContainment,
    riskWeight: value.riskWeight,
  })
}

function sanitizeSpe947PostCaseMediaCaseEntry(value: unknown): PostCaseMediaPersistenceInput | null {
  if (!isPlainRecord(value)) {
    return null
  }

  if (!isBoolean(value.localContainmentSucceeded) || !isPositiveFinite(value.riskThreshold)) {
    return null
  }

  const caseId = normalizeId(value.caseId, 'case:unknown')
  const caseLabel = normalizeLabel(value.caseLabel, caseId)
  const mediaArtifacts: PostCaseMediaArtifact[] = []

  if (Array.isArray(value.mediaArtifacts)) {
    for (const entry of value.mediaArtifacts) {
      const artifact = sanitizePostCaseMediaArtifactEntry(entry)
      if (artifact) {
        mediaArtifacts.push(artifact)
      }
    }
  }

  return Object.freeze({
    caseId,
    caseLabel,
    localContainmentSucceeded: value.localContainmentSucceeded,
    riskThreshold: value.riskThreshold,
    mediaArtifacts: Object.freeze(mediaArtifacts),
  })
}

function sanitizeSpe947FootageExposureBindingEntry(
  value: unknown
): Spe947FootageExposureBinding | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const artifactId = normalizeId(value.artifactId, '')
  if (artifactId.length === 0) {
    return null
  }

  if (
    value.baselineCivilianExposure !== undefined &&
    !isNonNegativeFinite(value.baselineCivilianExposure)
  ) {
    return null
  }

  if (
    value.baselineAttractionTraffic !== undefined &&
    !isNonNegativeFinite(value.baselineAttractionTraffic)
  ) {
    return null
  }

  return Object.freeze({
    artifactId,
    ...(value.baselineCivilianExposure !== undefined
      ? { baselineCivilianExposure: value.baselineCivilianExposure }
      : {}),
    ...(value.baselineAttractionTraffic !== undefined
      ? { baselineAttractionTraffic: value.baselineAttractionTraffic }
      : {}),
  })
}

function sanitizeSpe947TakedownResistanceBindingEntry(
  value: unknown
): Spe947TakedownResistanceBinding | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const ownerId = normalizeId(value.ownerId, '')
  if (ownerId.length === 0 || !isPositiveFinite(value.resistThreshold)) {
    return null
  }

  if (
    value.contestedThreshold !== undefined &&
    (!isNonNegativeFinite(value.contestedThreshold) ||
      value.contestedThreshold >= value.resistThreshold)
  ) {
    return null
  }

  return Object.freeze({
    ownerId,
    resistThreshold: value.resistThreshold,
    ...(value.contestedThreshold !== undefined
      ? { contestedThreshold: value.contestedThreshold }
      : {}),
  })
}

function sanitizeKeyedRecordMap<T extends { readonly id: string }>(
  value: unknown,
  fallback: Record<string, T>,
  sanitizeEntry: (entry: unknown) => T | null
): Record<string, T> {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: Record<string, T> = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}

function sanitizeBindingMap<T extends { readonly artifactId?: string; readonly ownerId?: string }>(
  value: unknown,
  fallback: Record<string, T>,
  sanitizeEntry: (entry: unknown) => T | null,
  keyField: 'artifactId' | 'ownerId'
): Record<string, T> {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: Record<string, T> = {}
  const seenKeys = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeEntry(entry)
    if (!record) {
      continue
    }

    const key = record[keyField]
    if (!key || seenKeys.has(key)) {
      continue
    }

    seenKeys.add(key)
    next[key] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}

/** Hydration: canonical platform map keyed by platform id; drops invalid and duplicate-id entries. */
export function sanitizeSpe947PlatformRecords(
  value: unknown,
  fallback: Spe947PlatformRecordsMap = {}
): Spe947PlatformRecordsMap {
  return sanitizeKeyedRecordMap(value, fallback, sanitizeSpe947PlatformEntry)
}

/** Hydration: canonical operation map keyed by operation id. */
export function sanitizeSpe947OperationRecords(
  value: unknown,
  fallback: Spe947OperationRecordsMap = {}
): Spe947OperationRecordsMap {
  return sanitizeKeyedRecordMap(value, fallback, sanitizeSpe947OperationEntry)
}

/** Hydration: canonical content-artifact map keyed by artifact id. */
export function sanitizeSpe947ContentArtifacts(
  value: unknown,
  fallback: Spe947ContentArtifactRecordsMap = {}
): Spe947ContentArtifactRecordsMap {
  return sanitizeKeyedRecordMap(value, fallback, sanitizeSpe947ContentArtifactEntry)
}

/** Hydration: canonical counter-memetic plan map keyed by plan id. */
export function sanitizeSpe947CounterMemeticPlans(
  value: unknown,
  fallback: Spe947CounterMemeticPlanRecordsMap = {}
): Spe947CounterMemeticPlanRecordsMap {
  return sanitizeKeyedRecordMap(value, fallback, sanitizeSpe947CounterMemeticPlanEntry)
}

/** Hydration: canonical content-owner map keyed by owner id. */
export function sanitizeSpe947ContentOwners(
  value: unknown,
  fallback: Spe947ContentOwnerRecordsMap = {}
): Spe947ContentOwnerRecordsMap {
  return sanitizeKeyedRecordMap(value, fallback, sanitizeSpe947ContentOwnerEntry)
}

/** Hydration: canonical post-case media case map keyed by case id. */
export function sanitizeSpe947PostCaseMediaCases(
  value: unknown,
  fallback: Spe947PostCaseMediaCaseRecordsMap = {}
): Spe947PostCaseMediaCaseRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: Spe947PostCaseMediaCaseRecordsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeSpe947PostCaseMediaCaseEntry(entry)
    if (!record) {
      continue
    }

    const caseId = normalizeId(record.caseId, '')
    if (caseId.length === 0 || seenIds.has(caseId)) {
      continue
    }

    seenIds.add(caseId)
    next[caseId] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}

/** Hydration: footage-exposure baseline bindings keyed by artifact id. */
export function sanitizeSpe947FootageExposureBindings(
  value: unknown,
  fallback: Spe947FootageExposureBindingRecordsMap = {}
): Spe947FootageExposureBindingRecordsMap {
  return sanitizeBindingMap(value, fallback, sanitizeSpe947FootageExposureBindingEntry, 'artifactId')
}

/** Hydration: takedown-resistance threshold bindings keyed by owner id. */
export function sanitizeSpe947TakedownResistanceBindings(
  value: unknown,
  fallback: Spe947TakedownResistanceBindingRecordsMap = {}
): Spe947TakedownResistanceBindingRecordsMap {
  return sanitizeBindingMap(
    value,
    fallback,
    sanitizeSpe947TakedownResistanceBindingEntry,
    'ownerId'
  )
}

export function toPlatformReachNode(platform: Spe947PersistedPlatform): PlatformReachNode {
  return Object.freeze({
    id: platform.id,
    label: platform.label,
    reachFactor: platform.reachFactor ?? 1,
    viewsPerScaleUnit: platform.viewsPerScaleUnit ?? 1,
  })
}

export function toPlatformOperationNode(platform: Spe947PersistedPlatform): PlatformOperationNode {
  return Object.freeze({
    id: platform.id,
    label: platform.label,
    uptimeState: platform.uptimeState ?? 'online',
    ...(platform.availableReach !== undefined ? { availableReach: platform.availableReach } : {}),
  })
}

export function resolvePlatformReachEvaluationInput(
  maps: Pick<Spe947EvaluatorPersistenceMaps, 'spe947PlatformRecords'>,
  platformId: string
): PlatformReachEvaluationInput {
  const platform = maps.spe947PlatformRecords[platformId]
  if (!platform) {
    return { platform: null }
  }

  return {
    platform: toPlatformReachNode(platform),
    ...(platform.viewCount !== undefined ? { viewCount: platform.viewCount } : {}),
    ...(platform.anomalyReach !== undefined ? { anomalyReach: platform.anomalyReach } : {}),
  }
}

export function resolvePlatformOperationEvaluationInput(
  maps: Pick<Spe947EvaluatorPersistenceMaps, 'spe947PlatformRecords' | 'spe947OperationRecords'>,
  platformId: string,
  operationId: string
): PlatformOperationEvaluationInput {
  const platform = maps.spe947PlatformRecords[platformId]
  const operation = maps.spe947OperationRecords[operationId]

  return {
    platform: platform ? toPlatformOperationNode(platform) : null,
    operation: operation ?? null,
  }
}

export function resolveCounterMemeticUptakeEvaluationInput(
  maps: Pick<Spe947EvaluatorPersistenceMaps, 'spe947CounterMemeticPlans'>,
  planId: string
): CounterMemeticUptakeEvaluationInput {
  return {
    plan: maps.spe947CounterMemeticPlans[planId] ?? null,
  }
}

export function resolveFootageExposureEvaluationInput(
  maps: Pick<
    Spe947EvaluatorPersistenceMaps,
    'spe947ContentArtifacts' | 'spe947FootageExposureBindings'
  >,
  artifactId: string
): FootageExposureEvaluationInput {
  const artifact = maps.spe947ContentArtifacts[artifactId]
  const binding = maps.spe947FootageExposureBindings[artifactId]

  return {
    artifact: artifact ?? null,
    ...(binding?.baselineCivilianExposure !== undefined
      ? { baselineCivilianExposure: binding.baselineCivilianExposure }
      : {}),
    ...(binding?.baselineAttractionTraffic !== undefined
      ? { baselineAttractionTraffic: binding.baselineAttractionTraffic }
      : {}),
  }
}

export function resolveTakedownResistanceEvaluationInput(
  maps: Pick<
    Spe947EvaluatorPersistenceMaps,
    'spe947ContentOwners' | 'spe947TakedownResistanceBindings'
  >,
  ownerId: string
): TakedownResistanceEvaluationInput | null {
  const owner = maps.spe947ContentOwners[ownerId]
  const binding = maps.spe947TakedownResistanceBindings[ownerId]
  if (!owner || !binding) {
    return null
  }

  return {
    owner,
    resistThreshold: binding.resistThreshold,
    ...(binding.contestedThreshold !== undefined
      ? { contestedThreshold: binding.contestedThreshold }
      : {}),
  }
}

export function resolvePostCaseMediaPersistenceInput(
  maps: Pick<Spe947EvaluatorPersistenceMaps, 'spe947PostCaseMediaCases'>,
  caseId: string
): PostCaseMediaPersistenceInput | null {
  return maps.spe947PostCaseMediaCases[caseId] ?? null
}

export function extractSpe947EvaluatorPersistenceMaps(
  game: Partial<Spe947EvaluatorPersistenceMaps>
): Spe947EvaluatorPersistenceMaps {
  return {
    spe947PlatformRecords: game.spe947PlatformRecords ?? {},
    spe947OperationRecords: game.spe947OperationRecords ?? {},
    spe947ContentArtifacts: game.spe947ContentArtifacts ?? {},
    spe947CounterMemeticPlans: game.spe947CounterMemeticPlans ?? {},
    spe947ContentOwners: game.spe947ContentOwners ?? {},
    spe947PostCaseMediaCases: game.spe947PostCaseMediaCases ?? {},
    spe947FootageExposureBindings: game.spe947FootageExposureBindings ?? {},
    spe947TakedownResistanceBindings: game.spe947TakedownResistanceBindings ?? {},
  }
}

/** Compact persisted fixture bundle mirroring SPE-2568–2573 EXAMPLE evaluator inputs. */
export const SPE_947_EXAMPLE_PERSISTENCE_FIXTURE: Spe947EvaluatorPersistenceMaps = Object.freeze({
  spe947PlatformRecords: Object.freeze({
    [EXAMPLE_RUMOR_FORUM_PLATFORM.id]: Object.freeze({
      id: EXAMPLE_RUMOR_FORUM_PLATFORM.id,
      label: EXAMPLE_RUMOR_FORUM_PLATFORM.label,
      reachFactor: EXAMPLE_RUMOR_FORUM_PLATFORM.reachFactor,
      viewsPerScaleUnit: EXAMPLE_RUMOR_FORUM_PLATFORM.viewsPerScaleUnit,
      viewCount: 1000,
      anomalyReach: 10,
      uptimeState: EXAMPLE_RUMOR_FORUM_OPERATION_PLATFORM.uptimeState,
      availableReach: EXAMPLE_RUMOR_FORUM_OPERATION_PLATFORM.availableReach,
    }),
  }),
  spe947OperationRecords: Object.freeze({
    [EXAMPLE_COUNTER_MEMETIC_BLAST.id]: EXAMPLE_COUNTER_MEMETIC_BLAST,
  }),
  spe947ContentArtifacts: Object.freeze({
    [EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id]: EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT,
  }),
  spe947CounterMemeticPlans: Object.freeze({
    [EXAMPLE_COUNTER_MEMETIC_PLAN.id]: EXAMPLE_COUNTER_MEMETIC_PLAN,
  }),
  spe947ContentOwners: Object.freeze({
    [EXAMPLE_RESISTING_CONTENT_OWNER.id]: EXAMPLE_RESISTING_CONTENT_OWNER,
  }),
  spe947PostCaseMediaCases: Object.freeze({
    [EXAMPLE_PERSISTING_POST_CASE_MEDIA.caseId ?? 'case:site-echo-7']:
      EXAMPLE_PERSISTING_POST_CASE_MEDIA,
  }),
  spe947FootageExposureBindings: Object.freeze({
    [EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id]: Object.freeze({
      artifactId: EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id,
      baselineCivilianExposure: 10,
      baselineAttractionTraffic: 4,
    }),
  }),
  spe947TakedownResistanceBindings: Object.freeze({
    [EXAMPLE_RESISTING_CONTENT_OWNER.id]: Object.freeze({
      ownerId: EXAMPLE_RESISTING_CONTENT_OWNER.id,
      resistThreshold: 8,
      contestedThreshold: 4,
    }),
  }),
})
