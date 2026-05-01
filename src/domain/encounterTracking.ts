import {
  readGameStateManager,
  setEncounterRuntimeState,
  type EncounterRuntimePatch,
} from './gameStateManager'
import {
  buildPreparedSupportProcedureAppliedFlagKey,
  buildPreparedSupportProcedureMismatchFlagKey,
  getPreparedSupportProcedureState,
  type PreparedSupportProcedureFamily,
  type PreparedSupportProcedureStatus,
} from './supportLoadout'
import type {
  EncounterResolutionOutcome,
  EncounterRuntimeState,
  EncounterRuntimeStatus,
  GameState,
  Id,
} from './models'

export interface EncounterTrackingInitInput {
  status?: EncounterRuntimeStatus
  phase?: string
  startedWeek?: number
  hiddenModifierIds?: string[]
  revealedModifierIds?: string[]
  flags?: Record<string, boolean>
}

export interface EncounterResolutionAttachment {
  resolutionId: string
  outcome: EncounterResolutionOutcome
  status?: EncounterRuntimeStatus
  phase?: string
  updatedWeek?: number
  resolvedWeek?: number
  followUpIds?: string[]
}

export interface PreparedSupportProcedureEncounterSummary {
  encounterId: string
  agentId: Id
  family?: PreparedSupportProcedureFamily
  status: PreparedSupportProcedureStatus
  lastOutcome?: 'supported' | 'mismatch'
  refreshAvailable: boolean
}

function normalizeString(value: string | undefined | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeStringList(values: readonly string[] | undefined) {
  return [...new Set((values ?? []).map(normalizeString).filter((value) => value.length > 0))]
}

export function readEncounterTracking(state: GameState, encounterId: string) {
  const normalizedId = normalizeString(encounterId)

  if (normalizedId.length === 0) {
    return null
  }

  return readGameStateManager(state).encounterState[normalizedId] ?? null
}

export function listEncounterTracking(state: GameState) {
  return Object.values(readGameStateManager(state).encounterState).sort((left, right) =>
    (left.encounterId ?? '').localeCompare(right.encounterId ?? '')
  )
}

export function initializeEncounterTracking(
  state: GameState,
  encounterId: string,
  input: EncounterTrackingInitInput = {}
) {
  const normalizedId = normalizeString(encounterId)

  if (normalizedId.length === 0) {
    return state
  }

  const existing = readEncounterTracking(state, normalizedId)
  const startedWeek =
    typeof input.startedWeek === 'number'
      ? Math.max(1, Math.trunc(input.startedWeek))
      : existing?.startedWeek ?? state.week

  const patch: EncounterRuntimePatch = {
    status: input.status ?? existing?.status ?? 'available',
    ...(normalizeString(input.phase) ? { phase: normalizeString(input.phase) } : {}),
    startedWeek,
    ...(input.hiddenModifierIds ? { hiddenModifierIds: [...input.hiddenModifierIds] } : {}),
    ...(input.revealedModifierIds ? { revealedModifierIds: [...input.revealedModifierIds] } : {}),
    ...(input.flags ? { flags: { ...input.flags } } : {}),
    lastUpdatedWeek: state.week,
  }

  return setEncounterRuntimeState(state, normalizedId, patch)
}

export function updateEncounterPhase(
  state: GameState,
  encounterId: string,
  phase: string,
  updatedWeek = state.week
) {
  const normalizedId = normalizeString(encounterId)

  if (normalizedId.length === 0) {
    return state
  }

  const initialized = initializeEncounterTracking(state, normalizedId)

  return setEncounterRuntimeState(initialized, normalizedId, {
    phase: normalizeString(phase) || 'unspecified',
    lastUpdatedWeek: Math.max(1, Math.trunc(updatedWeek)),
  })
}

export function updateEncounterStatus(
  state: GameState,
  encounterId: string,
  status: EncounterRuntimeStatus,
  options: {
    phase?: string
    updatedWeek?: number
    resolvedWeek?: number
    clearResolvedWeek?: boolean
  } = {}
) {
  const normalizedId = normalizeString(encounterId)

  if (normalizedId.length === 0) {
    return state
  }

  const initialized = initializeEncounterTracking(state, normalizedId)
  const existing = readEncounterTracking(initialized, normalizedId)
  const updatedWeek = Math.max(1, Math.trunc(options.updatedWeek ?? state.week))

  const patch: EncounterRuntimePatch = {
    status,
    ...(normalizeString(options.phase) ? { phase: normalizeString(options.phase) } : {}),
    ...(status === 'resolved'
      ? { resolvedWeek: Math.max(1, Math.trunc(options.resolvedWeek ?? updatedWeek)) }
      : existing?.resolvedWeek !== undefined && !options.clearResolvedWeek
          ? { resolvedWeek: existing.resolvedWeek }
          : {}),
    lastUpdatedWeek: updatedWeek,
  }

  return setEncounterRuntimeState(initialized, normalizedId, patch)
}

export function attachEncounterResolution(
  state: GameState,
  encounterId: string,
  resolution: EncounterResolutionAttachment
) {
  const normalizedId = normalizeString(encounterId)

  if (normalizedId.length === 0) {
    return state
  }

  const initialized = initializeEncounterTracking(state, normalizedId)
  const updatedWeek = Math.max(1, Math.trunc(resolution.updatedWeek ?? state.week))
  const followUpIds = normalizeStringList(resolution.followUpIds)
  const nextStatus =
    resolution.status ?? (resolution.outcome === 'success' ? 'resolved' : 'active')

  return setEncounterRuntimeState(initialized, normalizedId, {
    status: nextStatus,
    ...(normalizeString(resolution.phase) ? { phase: normalizeString(resolution.phase) } : {}),
    latestOutcome: resolution.outcome,
    lastResolutionId: normalizeString(resolution.resolutionId),
    ...(followUpIds.length > 0 ? { followUpIds } : {}),
    ...(nextStatus === 'resolved'
      ? {
          resolvedWeek: Math.max(
            1,
            Math.trunc(resolution.resolvedWeek ?? updatedWeek)
          ),
        }
      : {}),
    lastUpdatedWeek: updatedWeek,
  })
}

export function recordEncounterFollowUps(
  state: GameState,
  encounterId: string,
  followUpIds: string[],
  updatedWeek = state.week
) {
  const normalizedId = normalizeString(encounterId)

  if (normalizedId.length === 0) {
    return state
  }

  const initialized = initializeEncounterTracking(state, normalizedId)
  const existing = readEncounterTracking(initialized, normalizedId)
  const merged = [...new Set([...(existing?.followUpIds ?? []), ...normalizeStringList(followUpIds)])]

  return setEncounterRuntimeState(initialized, normalizedId, {
    ...(merged.length > 0 ? { followUpIds: merged } : {}),
    lastUpdatedWeek: Math.max(1, Math.trunc(updatedWeek)),
  })
}

export function selectEncounterTrackingSummary(
  encounter: EncounterRuntimeState
): {
  id: string
  status: EncounterRuntimeStatus
  phase?: string
  startedWeek?: number
  updatedWeek: number
  resolvedWeek?: number
  latestOutcome?: EncounterResolutionOutcome
  lastResolutionId?: string
  followUpIds: string[]
} {
  return {
    id: encounter.encounterId ?? '',
    status: encounter.status ?? 'available',
    ...(encounter.phase ? { phase: encounter.phase } : {}),
    ...(typeof encounter.startedWeek === 'number' ? { startedWeek: encounter.startedWeek } : {}),
    updatedWeek: encounter.lastUpdatedWeek ?? 0,
    ...(typeof encounter.resolvedWeek === 'number' ? { resolvedWeek: encounter.resolvedWeek } : {}),
    ...(encounter.latestOutcome ? { latestOutcome: encounter.latestOutcome } : {}),
    ...(encounter.lastResolutionId ? { lastResolutionId: encounter.lastResolutionId } : {}),
    followUpIds: [...(encounter.followUpIds ?? [])],
  }
}

export function selectPreparedSupportProcedureEncounterSummary(
  state: GameState,
  encounterId: string,
  agentId: Id
): PreparedSupportProcedureEncounterSummary {
  const supportState = getPreparedSupportProcedureState(state, encounterId, agentId)
  const flags = readGameStateManager(state).encounterState[encounterId]?.flags ?? {}

  const lastOutcome = supportState.family
    ? flags[buildPreparedSupportProcedureMismatchFlagKey(agentId, supportState.family)] === true
      ? 'mismatch'
      : flags[buildPreparedSupportProcedureAppliedFlagKey(agentId, supportState.family)] === true
        ? 'supported'
        : undefined
    : undefined

  return {
    encounterId,
    agentId,
    ...(supportState.family ? { family: supportState.family } : {}),
    status: supportState.status,
    ...(lastOutcome ? { lastOutcome } : {}),
    refreshAvailable:
      supportState.status === 'expended' &&
      typeof supportState.itemId === 'string' &&
      supportState.reserveStock > 0,
  }
}
