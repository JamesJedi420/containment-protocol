/**
 * SPE-3501 — protected remote-work cell interaction.
 *
 * Owns one bounded protected-station → sealed-target remote task coordinator.
 * Consumes SPE-2995 procedure-to-action readiness/execution, caller-supplied
 * facility/room/integrity/competency gate decisions, and optional durable hydrate.
 * Does not invent teleoperation, a second procedure engine, subject registry,
 * robot actor, custody transfer, or map/zone authority. Operator presence in the
 * sealed target zone is never implied by a valid remote operation.
 */

import type { GameState } from './models'
import {
  evaluateCanonicalProcedureExecutionReadiness,
  executeCanonicalProcedureThroughCrossRoleAction,
  type CanonicalProcedureExecutionResult,
  type ProcedureToActionAdapterInput,
  type ProcedureExecutionReadinessResult,
} from './procedureToActionAdapter'
import {
  compareCodeUnitOrder,
  freezeCoordinationRecord,
  hasOwnEnumerableKey,
  isNonEmptyTrimmedString,
  isPlainRecord,
  parseFacilityRecordMap,
  sortUniqueCodes,
  withSortedAppliedKey,
  writeOptionalFacilityMapField,
} from './facilityCoordinationHydrate'

export const PROTECTED_REMOTE_WORK_STAGES = [
  'requested',
  'authorized',
  'in_progress',
  'completed',
  'blocked',
  'held',
  'failed',
  'aborted',
] as const
export type ProtectedRemoteWorkStage = (typeof PROTECTED_REMOTE_WORK_STAGES)[number]

export const PROTECTED_REMOTE_WORK_REASON_CODES = [
  'malformed_input',
  'operator_in_target_zone',
  'station_not_ready',
  'station_disconnected',
  'capability_unsupported',
  'operator_unavailable',
  'operator_unqualified',
  'zone_access_denied',
  'room_config_unsafe',
  'integrity_degraded',
  'procedure_not_ready',
  'procedure_execution_blocked',
  'illegal_transition',
  'stale_operation',
  'station_disabled',
  'connection_lost',
  'barrier_degraded',
  'work_not_committed',
  'aborted_before_start',
  'interrupted_during_work',
  'exposure_routed',
] as const
export type ProtectedRemoteWorkReasonCode = (typeof PROTECTED_REMOTE_WORK_REASON_CODES)[number]

export type ProtectedRemoteWorkId = string

export type ProtectedRemoteWorkRecord = Readonly<{
  workId: ProtectedRemoteWorkId
  stationId: string
  operatorRef: string
  /** Protected operator-side location (must differ from sealed target zone). */
  operatorNodeId: string
  /** Sealed contained target zone/node the station is connected to. */
  targetZoneRef: string
  /** Authorized target/subject/sample/object reference — not a new registry. */
  targetRef: string
  capabilityTag: string
  stage: ProtectedRemoteWorkStage
  reasonCodes: readonly ProtectedRemoteWorkReasonCode[]
  appliedOperationKeys: readonly string[]
  /** True once canonical procedure execution committed for this work. */
  procedureEffectsOccurred: boolean
  /** Spatial separation alone never clears exposure; only owner-routed flags. */
  exposureCleared: boolean
  authorizationRef?: string
  procedureExecutionKey?: string
  pendingCorrectiveAction?: string
  exposureOwnerHint?: string
}>

export type FacilityProtectedRemoteWorkCells = Readonly<
  Record<ProtectedRemoteWorkId, ProtectedRemoteWorkRecord>
>

export type ProtectedRemoteWorkExplainability = Readonly<{
  workId: ProtectedRemoteWorkId
  stationId: string
  operatorRef: string
  targetRef: string
  targetZoneRef: string
  operatorNodeId: string
  capabilityTag: string
  stage: ProtectedRemoteWorkStage
  reasonCodes: readonly ProtectedRemoteWorkReasonCode[]
  pendingCorrectiveAction?: string
  procedureEffectsOccurred: boolean
  exposureCleared: boolean
  outcome: 'in_progress' | 'completed' | 'blocked' | 'held' | 'failed' | 'aborted'
}>

export type ProtectedRemoteWorkResult =
  | { ok: true; work: ProtectedRemoteWorkRecord; state?: GameState }
  | {
      ok: false
      work?: ProtectedRemoteWorkRecord
      state?: GameState
      code: ProtectedRemoteWorkReasonCode
      reasonCodes: readonly ProtectedRemoteWorkReasonCode[]
    }

const ACTIVE_STAGES: ReadonlySet<ProtectedRemoteWorkStage> = new Set([
  'requested',
  'authorized',
  'in_progress',
  'held',
])

const TERMINAL_STAGES: ReadonlySet<ProtectedRemoteWorkStage> = new Set([
  'completed',
  'blocked',
  'failed',
  'aborted',
])

const isRecord = isPlainRecord
const isNonEmptyString = isNonEmptyTrimmedString
const compareCodeUnit = compareCodeUnitOrder

const UNSAFE_WORK_IDS = new Set(['__proto__', 'constructor', 'prototype'])

function isSafeWorkId(value: string): boolean {
  return isNonEmptyString(value) && !UNSAFE_WORK_IDS.has(value)
}

function isStage(value: unknown): value is ProtectedRemoteWorkStage {
  return PROTECTED_REMOTE_WORK_STAGES.some((stage) => stage === value)
}

function stageAllowsProcedureEffects(stage: ProtectedRemoteWorkStage): boolean {
  return (
    stage === 'in_progress' ||
    stage === 'completed' ||
    stage === 'held' ||
    stage === 'failed'
  )
}

function isReasonCode(value: unknown): value is ProtectedRemoteWorkReasonCode {
  return PROTECTED_REMOTE_WORK_REASON_CODES.some((reason) => reason === value)
}

function freezeWork(record: ProtectedRemoteWorkRecord): ProtectedRemoteWorkRecord {
  return freezeCoordinationRecord(record)
}

function sortUniqueReasons(
  reasons: readonly ProtectedRemoteWorkReasonCode[]
): readonly ProtectedRemoteWorkReasonCode[] {
  return sortUniqueCodes(reasons)
}

function withAppliedKey(
  work: ProtectedRemoteWorkRecord,
  operationKey: string
): readonly string[] {
  return withSortedAppliedKey(work.appliedOperationKeys, operationKey)
}

function rejectWork(
  code: ProtectedRemoteWorkReasonCode,
  work: ProtectedRemoteWorkRecord | undefined,
  state: GameState | undefined,
  extraReasons: readonly ProtectedRemoteWorkReasonCode[] = []
): ProtectedRemoteWorkResult {
  const reasonCodes = sortUniqueReasons([code, ...extraReasons])
  return {
    ok: false,
    work,
    state,
    code,
    reasonCodes,
  }
}

function parseWorkRecord(raw: unknown, id: string): ProtectedRemoteWorkRecord | undefined {
  if (!isRecord(raw)) return undefined
  if (!isNonEmptyString(raw.workId) || raw.workId.trim() !== id) return undefined
  if (
    !isNonEmptyString(raw.stationId) ||
    !isNonEmptyString(raw.operatorRef) ||
    !isNonEmptyString(raw.operatorNodeId) ||
    !isNonEmptyString(raw.targetZoneRef) ||
    !isNonEmptyString(raw.targetRef) ||
    !isNonEmptyString(raw.capabilityTag) ||
    !isStage(raw.stage)
  ) {
    return undefined
  }
  if (!Array.isArray(raw.reasonCodes) || !Array.isArray(raw.appliedOperationKeys)) {
    return undefined
  }
  const reasonCodes: ProtectedRemoteWorkReasonCode[] = []
  for (const reason of raw.reasonCodes) {
    if (!isReasonCode(reason)) return undefined
    reasonCodes.push(reason)
  }
  const appliedOperationKeys: string[] = []
  for (const key of raw.appliedOperationKeys) {
    if (!isNonEmptyString(key)) return undefined
    appliedOperationKeys.push(key.trim())
  }
  if (typeof raw.procedureEffectsOccurred !== 'boolean') return undefined
  if (typeof raw.exposureCleared !== 'boolean') return undefined
  if (!isSafeWorkId(id)) return undefined

  const operatorNodeId = raw.operatorNodeId.trim()
  const targetZoneRef = raw.targetZoneRef.trim()
  if (operatorNodeId === targetZoneRef) return undefined
  if (raw.procedureEffectsOccurred && !stageAllowsProcedureEffects(raw.stage)) {
    return undefined
  }
  if (!raw.procedureEffectsOccurred && (raw.stage === 'in_progress' || raw.stage === 'completed')) {
    return undefined
  }
  if (raw.exposureCleared === true) return undefined

  return freezeWork({
    workId: id,
    stationId: raw.stationId.trim(),
    operatorRef: raw.operatorRef.trim(),
    operatorNodeId,
    targetZoneRef,
    targetRef: raw.targetRef.trim(),
    capabilityTag: raw.capabilityTag.trim(),
    stage: raw.stage,
    reasonCodes: sortUniqueReasons(reasonCodes),
    appliedOperationKeys: Object.freeze(
      [...new Set(appliedOperationKeys)].sort(compareCodeUnit)
    ),
    procedureEffectsOccurred: raw.procedureEffectsOccurred,
    exposureCleared: raw.exposureCleared,
    ...(isNonEmptyString(raw.authorizationRef)
      ? { authorizationRef: raw.authorizationRef.trim() }
      : {}),
    ...(isNonEmptyString(raw.procedureExecutionKey)
      ? { procedureExecutionKey: raw.procedureExecutionKey.trim() }
      : {}),
    ...(isNonEmptyString(raw.pendingCorrectiveAction)
      ? { pendingCorrectiveAction: raw.pendingCorrectiveAction.trim() }
      : {}),
    ...(isNonEmptyString(raw.exposureOwnerHint)
      ? { exposureOwnerHint: raw.exposureOwnerHint.trim() }
      : {}),
  })
}

/**
 * Hydrate optional `GameState.facilityProtectedRemoteWorkCells`.
 * Legacy omit / malformed non-records / empty after sanitize → undefined.
 */
export function parseFacilityProtectedRemoteWorkCells(
  value: unknown
): FacilityProtectedRemoteWorkCells | undefined {
  return parseFacilityRecordMap(value, parseWorkRecord)
}

function readWorks(state: GameState): FacilityProtectedRemoteWorkCells {
  return (
    parseFacilityProtectedRemoteWorkCells(state.facilityProtectedRemoteWorkCells) ??
    Object.freeze({})
  )
}

function upsertWork(
  state: GameState | undefined,
  work: ProtectedRemoteWorkRecord
): GameState | undefined {
  if (state === undefined) return undefined
  return writeOptionalFacilityMapField(
    state,
    'facilityProtectedRemoteWorkCells',
    Object.freeze({ ...readWorks(state), [work.workId]: work })
  )
}

function resolveCurrentWork(
  work: ProtectedRemoteWorkRecord,
  state: GameState | undefined
): ProtectedRemoteWorkRecord {
  if (state === undefined) return work
  const works = readWorks(state)
  return hasOwnEnumerableKey(works, work.workId) ? (works[work.workId] ?? work) : work
}

type PreparedWorkMutation =
  | { kind: 'ready'; work: ProtectedRemoteWorkRecord; key: string }
  | { kind: 'done'; result: ProtectedRemoteWorkResult }
  | { kind: 'reject'; result: ProtectedRemoteWorkResult }

function prepareWorkMutation(
  workInput: ProtectedRemoteWorkRecord,
  operationKey: string,
  state: GameState | undefined,
  options: {
    readonly idempotentStages: readonly ProtectedRemoteWorkStage[]
    readonly allowedStages: readonly ProtectedRemoteWorkStage[]
  }
): PreparedWorkMutation {
  const work = resolveCurrentWork(workInput, state)
  if (!isNonEmptyString(operationKey)) {
    return { kind: 'reject', result: rejectWork('malformed_input', work, state) }
  }
  const key = operationKey.trim()
  if (work.appliedOperationKeys.includes(key) && options.idempotentStages.includes(work.stage)) {
    return { kind: 'done', result: { ok: true, work, state } }
  }
  if (!options.allowedStages.includes(work.stage)) {
    return { kind: 'reject', result: rejectWork('illegal_transition', work, state) }
  }
  return { kind: 'ready', work, key }
}

function commitWork(
  work: ProtectedRemoteWorkRecord,
  state: GameState | undefined
): ProtectedRemoteWorkResult {
  return { ok: true, work, state: upsertWork(state, work) }
}

export type ProtectedRemoteWorkCreateInput = {
  readonly workId: string
  readonly stationId: string
  readonly operatorRef: string
  readonly operatorNodeId: string
  readonly targetZoneRef: string
  readonly targetRef: string
  readonly capabilityTag: string
  readonly operationKey: string
}

/**
 * Open a requested remote-work interaction. Rejects operator colocated with target zone.
 */
export function createProtectedRemoteWorkCell(
  input: ProtectedRemoteWorkCreateInput,
  state?: GameState
): ProtectedRemoteWorkResult {
  if (
    !isNonEmptyString(input.workId) ||
    !isNonEmptyString(input.stationId) ||
    !isNonEmptyString(input.operatorRef) ||
    !isNonEmptyString(input.operatorNodeId) ||
    !isNonEmptyString(input.targetZoneRef) ||
    !isNonEmptyString(input.targetRef) ||
    !isNonEmptyString(input.capabilityTag) ||
    !isNonEmptyString(input.operationKey)
  ) {
    return rejectWork('malformed_input', undefined, state)
  }

  const operatorNodeId = input.operatorNodeId.trim()
  const targetZoneRef = input.targetZoneRef.trim()
  if (operatorNodeId === targetZoneRef) {
    return rejectWork('operator_in_target_zone', undefined, state)
  }

  const workId = input.workId.trim()
  if (!isSafeWorkId(workId)) {
    return rejectWork('malformed_input', undefined, state)
  }
  const operationKey = input.operationKey.trim()
  if (state !== undefined) {
    const works = readWorks(state)
    const existing = hasOwnEnumerableKey(works, workId) ? works[workId] : undefined
    if (existing) {
      if (existing.appliedOperationKeys.includes(operationKey)) {
        return { ok: true, work: existing, state }
      }
      return rejectWork('stale_operation', existing, state)
    }
  }

  const work = freezeWork({
    workId,
    stationId: input.stationId.trim(),
    operatorRef: input.operatorRef.trim(),
    operatorNodeId,
    targetZoneRef,
    targetRef: input.targetRef.trim(),
    capabilityTag: input.capabilityTag.trim(),
    stage: 'requested',
    reasonCodes: Object.freeze([]),
    appliedOperationKeys: Object.freeze([operationKey]),
    procedureEffectsOccurred: false,
    exposureCleared: false,
  })

  return { ok: true, work, state: upsertWork(state, work) }
}

export type ProtectedRemoteWorkPreflightGates = {
  readonly stationReady: boolean
  readonly stationConnected: boolean
  readonly capabilitySupported: boolean
  readonly operatorAvailable: boolean
  readonly operatorQualified: boolean
  readonly zoneAccessOk: boolean
  readonly roomConfigSafe: boolean
  readonly integrityOk: boolean
}

export type ProtectedRemoteWorkPreflightInput = {
  readonly work: ProtectedRemoteWorkRecord
  readonly operationKey: string
  readonly gates: ProtectedRemoteWorkPreflightGates
  readonly procedureAdapter?: ProcedureToActionAdapterInput
  readonly authorizationRef?: string
}

export type ProtectedRemoteWorkPreflightEvidence = Readonly<{
  procedureReadiness?: ProcedureExecutionReadinessResult
}>

/**
 * Evaluate preflight against authoritative owner-seam decisions. Fail-closed before start.
 */
export function runProtectedRemoteWorkPreflight(
  input: ProtectedRemoteWorkPreflightInput,
  state?: GameState
): ProtectedRemoteWorkResult & { evidence?: ProtectedRemoteWorkPreflightEvidence } {
  const work = resolveCurrentWork(input.work, state)
  const { operationKey, gates } = input
  if (!isNonEmptyString(operationKey)) {
    return rejectWork('malformed_input', work, state)
  }
  const key = operationKey.trim()
  const canRetryBlocked =
    work.stage === 'blocked' && work.procedureEffectsOccurred === false
  if (work.stage !== 'requested' && !canRetryBlocked) {
    if (work.appliedOperationKeys.includes(key)) {
      return { ok: true, work, state }
    }
    return rejectWork('illegal_transition', work, state)
  }
  if (work.appliedOperationKeys.includes(key)) {
    return { ok: true, work, state }
  }

  if (work.operatorNodeId === work.targetZoneRef) {
    const blocked = freezeWork({
      ...work,
      stage: 'blocked',
      reasonCodes: sortUniqueReasons(['operator_in_target_zone']),
      appliedOperationKeys: withAppliedKey(work, key),
      pendingCorrectiveAction: 'relocate_operator_outside_target_zone',
      procedureEffectsOccurred: false,
      exposureCleared: false,
    })
    return {
      ok: false,
      work: blocked,
      code: 'operator_in_target_zone',
      reasonCodes: blocked.reasonCodes,
      state: upsertWork(state, blocked),
    }
  }

  const reasons: ProtectedRemoteWorkReasonCode[] = []
  if (!gates.stationReady) reasons.push('station_not_ready')
  if (!gates.stationConnected) reasons.push('station_disconnected')
  if (!gates.capabilitySupported) reasons.push('capability_unsupported')
  if (!gates.operatorAvailable) reasons.push('operator_unavailable')
  if (!gates.operatorQualified) reasons.push('operator_unqualified')
  if (!gates.zoneAccessOk) reasons.push('zone_access_denied')
  if (!gates.roomConfigSafe) reasons.push('room_config_unsafe')
  if (!gates.integrityOk) reasons.push('integrity_degraded')

  let procedureReadiness: ProcedureExecutionReadinessResult | undefined
  if (input.procedureAdapter !== undefined) {
    procedureReadiness = evaluateCanonicalProcedureExecutionReadiness(input.procedureAdapter)
    if (!procedureReadiness.ok) {
      reasons.push('procedure_not_ready')
    }
  }

  const evidence = Object.freeze({
    ...(procedureReadiness !== undefined ? { procedureReadiness } : {}),
  })

  const uniqueReasons = sortUniqueReasons(reasons)
  if (uniqueReasons.length > 0) {
    const blocked = freezeWork({
      ...work,
      stage: 'blocked',
      reasonCodes: uniqueReasons,
      appliedOperationKeys: withAppliedKey(work, key),
      pendingCorrectiveAction: 'resolve_remote_work_preflight_blockers',
      procedureEffectsOccurred: false,
      exposureCleared: false,
    })
    return {
      ok: false,
      work: blocked,
      code: uniqueReasons[0]!,
      reasonCodes: uniqueReasons,
      state: upsertWork(state, blocked),
      evidence,
    }
  }

  const authorized = freezeWork({
    ...work,
    stage: 'authorized',
    reasonCodes: Object.freeze([]),
    appliedOperationKeys: withAppliedKey(work, key),
    pendingCorrectiveAction: undefined,
    ...(isNonEmptyString(input.authorizationRef)
      ? { authorizationRef: input.authorizationRef.trim() }
      : {}),
    ...(input.procedureAdapter !== undefined
      ? { procedureExecutionKey: input.procedureAdapter.executionKey }
      : {}),
  })
  return {
    ok: true,
    work: authorized,
    state: upsertWork(state, authorized),
    evidence,
  }
}

export type ProtectedRemoteWorkStartInput = {
  readonly operationKey: string
  readonly procedureAdapter: ProcedureToActionAdapterInput
}

export type ProtectedRemoteWorkStartEvidence = Readonly<{
  procedureExecution?: CanonicalProcedureExecutionResult
}>

/**
 * Start authorized remote work through the canonical SPE-2995 execution path.
 * Does not place the operator into the sealed target zone.
 */
export function beginProtectedRemoteWork(
  workInput: ProtectedRemoteWorkRecord,
  input: ProtectedRemoteWorkStartInput,
  state?: GameState
): ProtectedRemoteWorkResult & { evidence?: ProtectedRemoteWorkStartEvidence } {
  const prepared = prepareWorkMutation(workInput, input.operationKey, state, {
    idempotentStages: ['in_progress'],
    allowedStages: ['authorized'],
  })
  if (prepared.kind !== 'ready') return prepared.result
  const { work, key } = prepared

  const executionKey = input.procedureAdapter.executionKey
  if (
    isNonEmptyString(work.procedureExecutionKey) &&
    work.procedureExecutionKey !== executionKey
  ) {
    return rejectWork('stale_operation', work, state)
  }

  const procedureExecution = executeCanonicalProcedureThroughCrossRoleAction(input.procedureAdapter)
  const evidence = Object.freeze({ procedureExecution })
  if (!procedureExecution.ok || procedureExecution.outcome !== 'executed') {
    const failed = freezeWork({
      ...work,
      stage: 'failed',
      reasonCodes: sortUniqueReasons(['procedure_execution_blocked']),
      appliedOperationKeys: withAppliedKey(work, key),
      pendingCorrectiveAction: 'resolve_procedure_execution_blockers',
      procedureEffectsOccurred: false,
      exposureCleared: false,
      procedureExecutionKey: executionKey,
    })
    return {
      ok: false,
      work: failed,
      code: 'procedure_execution_blocked',
      reasonCodes: failed.reasonCodes,
      state: upsertWork(state, failed),
      evidence,
    }
  }

  const started = freezeWork({
    ...work,
    stage: 'in_progress',
    reasonCodes: Object.freeze([]),
    appliedOperationKeys: withAppliedKey(work, key),
    procedureEffectsOccurred: true,
    exposureCleared: false,
    pendingCorrectiveAction: 'monitor_station_integrity',
    procedureExecutionKey: executionKey,
  })
  return {
    ok: true,
    work: started,
    state: upsertWork(state, started),
    evidence,
  }
}

/**
 * Resume held work after station/connection restoration without re-executing the procedure.
 */
export function resumeProtectedRemoteWork(
  workInput: ProtectedRemoteWorkRecord,
  operationKey: string,
  state?: GameState
): ProtectedRemoteWorkResult {
  const prepared = prepareWorkMutation(workInput, operationKey, state, {
    idempotentStages: ['in_progress'],
    allowedStages: ['held'],
  })
  if (prepared.kind !== 'ready') return prepared.result
  if (!prepared.work.procedureEffectsOccurred) {
    return rejectWork('illegal_transition', prepared.work, state)
  }
  return commitWork(
    freezeWork({
      ...prepared.work,
      stage: 'in_progress',
      reasonCodes: Object.freeze([]),
      appliedOperationKeys: withAppliedKey(prepared.work, prepared.key),
      pendingCorrectiveAction: 'monitor_station_integrity',
      procedureEffectsOccurred: true,
      exposureCleared: false,
    }),
    state
  )
}

export type ProtectedRemoteWorkInterruptKind =
  | 'station_disabled'
  | 'connection_lost'
  | 'barrier_degraded'

/**
 * Interrupt in-progress work. Spatial separation alone does not complete work or clear exposure.
 * Barrier degradation may route exposure to the canonical owner via hint without clearing it.
 */
export function interruptProtectedRemoteWork(
  workInput: ProtectedRemoteWorkRecord,
  input: {
    readonly operationKey: string
    readonly kind: ProtectedRemoteWorkInterruptKind
    readonly routeExposure?: boolean
  },
  state?: GameState
): ProtectedRemoteWorkResult {
  const prepared = prepareWorkMutation(workInput, input.operationKey, state, {
    idempotentStages: ['held', 'failed'],
    allowedStages: ['in_progress', 'held'],
  })
  if (prepared.kind !== 'ready') return prepared.result
  const { work, key } = prepared

  const reason: ProtectedRemoteWorkReasonCode =
    input.kind === 'station_disabled'
      ? 'station_disabled'
      : input.kind === 'connection_lost'
        ? 'connection_lost'
        : 'barrier_degraded'

  const reasons: ProtectedRemoteWorkReasonCode[] = [reason, 'interrupted_during_work']
  if (input.routeExposure === true) {
    reasons.push('exposure_routed')
  }

  const interrupted = freezeWork({
    ...work,
    stage: input.kind === 'barrier_degraded' ? 'failed' : 'held',
    reasonCodes: sortUniqueReasons(reasons),
    appliedOperationKeys: withAppliedKey(work, key),
    procedureEffectsOccurred: work.procedureEffectsOccurred,
    exposureCleared: false,
    pendingCorrectiveAction:
      input.kind === 'barrier_degraded'
        ? 'route_exposure_and_restore_barrier'
        : 'restore_station_and_resume_or_abort',
    ...(input.routeExposure === true
      ? { exposureOwnerHint: work.exposureOwnerHint ?? 'exposure' }
      : {}),
  })

  return {
    ok: false,
    work: interrupted,
    code: reason,
    reasonCodes: interrupted.reasonCodes,
    state: upsertWork(state, interrupted),
  }
}

/**
 * Complete only after owner-reported successful remote work commit.
 */
export function completeProtectedRemoteWork(
  workInput: ProtectedRemoteWorkRecord,
  input: {
    readonly operationKey: string
    readonly workCommitted: boolean
  },
  state?: GameState
): ProtectedRemoteWorkResult {
  const prepared = prepareWorkMutation(workInput, input.operationKey, state, {
    idempotentStages: ['completed'],
    allowedStages: ['in_progress'],
  })
  if (prepared.kind !== 'ready') return prepared.result
  if (!input.workCommitted) {
    return rejectWork('work_not_committed', prepared.work, state)
  }
  return commitWork(
    freezeWork({
      ...prepared.work,
      stage: 'completed',
      reasonCodes: Object.freeze([]),
      appliedOperationKeys: withAppliedKey(prepared.work, prepared.key),
      pendingCorrectiveAction: undefined,
      procedureEffectsOccurred: true,
      exposureCleared: false,
    }),
    state
  )
}

/**
 * Abort before procedure execution begins, or abandon held work without clearing exposure.
 */
export function abortProtectedRemoteWork(
  workInput: ProtectedRemoteWorkRecord,
  operationKey: string,
  state?: GameState
): ProtectedRemoteWorkResult {
  const prepared = prepareWorkMutation(workInput, operationKey, state, {
    idempotentStages: ['aborted', 'failed'],
    allowedStages: ['requested', 'authorized', 'held'],
  })
  if (prepared.kind !== 'ready') return prepared.result
  if (prepared.work.stage === 'held') {
    return commitWork(
      freezeWork({
        ...prepared.work,
        stage: 'failed',
        reasonCodes: sortUniqueReasons(['interrupted_during_work', 'aborted_before_start']),
        appliedOperationKeys: withAppliedKey(prepared.work, prepared.key),
        pendingCorrectiveAction: undefined,
        procedureEffectsOccurred: prepared.work.procedureEffectsOccurred,
        exposureCleared: false,
      }),
      state
    )
  }
  if (prepared.work.procedureEffectsOccurred) {
    return rejectWork('illegal_transition', prepared.work, state)
  }
  return commitWork(
    freezeWork({
      ...prepared.work,
      stage: 'aborted',
      reasonCodes: sortUniqueReasons(['aborted_before_start']),
      appliedOperationKeys: withAppliedKey(prepared.work, prepared.key),
      pendingCorrectiveAction: undefined,
      procedureEffectsOccurred: false,
      exposureCleared: false,
    }),
    state
  )
}

export function projectExplainableProtectedRemoteWork(
  work: ProtectedRemoteWorkRecord
): ProtectedRemoteWorkExplainability {
  const outcome: ProtectedRemoteWorkExplainability['outcome'] =
    work.stage === 'completed'
      ? 'completed'
      : work.stage === 'blocked'
        ? 'blocked'
        : work.stage === 'held'
          ? 'held'
          : work.stage === 'failed'
            ? 'failed'
            : work.stage === 'aborted'
              ? 'aborted'
              : 'in_progress'

  return Object.freeze({
    workId: work.workId,
    stationId: work.stationId,
    operatorRef: work.operatorRef,
    targetRef: work.targetRef,
    targetZoneRef: work.targetZoneRef,
    operatorNodeId: work.operatorNodeId,
    capabilityTag: work.capabilityTag,
    stage: work.stage,
    reasonCodes: work.reasonCodes,
    procedureEffectsOccurred: work.procedureEffectsOccurred,
    exposureCleared: work.exposureCleared,
    outcome,
    ...(work.pendingCorrectiveAction !== undefined
      ? { pendingCorrectiveAction: work.pendingCorrectiveAction }
      : {}),
  })
}

export function isProtectedRemoteWorkActive(stage: ProtectedRemoteWorkStage): boolean {
  return ACTIVE_STAGES.has(stage)
}

export function isProtectedRemoteWorkTerminal(stage: ProtectedRemoteWorkStage): boolean {
  return TERMINAL_STAGES.has(stage)
}
