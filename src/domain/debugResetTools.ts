import { clearDeveloperLog } from './developerLog'
import { clearRuntimeEventQueue } from './eventQueue'
import { clearPersistentFlag } from './flagSystem'
import {
  createDefaultRuntimeState,
  ensureManagedGameState,
  readGameStateManager,
} from './gameStateManager'
import { getProgressClockDefinition } from './progressClocks'
import type { GameState, RuntimeState } from './models'

export interface DebugResetRequest {
  clearDeveloperLog?: boolean
  clearEventQueue?: boolean
  resetFlags?: {
    clearAll?: boolean
    flagIds?: string[]
  }
  resetOneShots?: {
    clearAll?: boolean
    contentIds?: string[]
  }
  resetProgressClocks?: {
    clearAll?: boolean
    clockIds?: string[]
    /**
     * When true, known authored clocks reset to authored defaults.
     * Unknown clocks reset to value=0 while preserving label/max/hidden.
     */
    resetToDefaults?: boolean
  }
  clearEncounterRuntime?: {
    clearAll?: boolean
    encounterIds?: string[]
  }
  resetAuthoredDebugContext?: boolean
  /**
   * Explicit, bounded full reset for authored/runtime debug state only.
   * Does not touch roster, cases, funding, templates, config, or RNG.
   */
  fullRuntimeDebugReset?: boolean
}

export interface DebugResetResult {
  state: GameState
  summary: {
    clearedDeveloperLog: boolean
    clearedEventQueue: boolean
    resetFlagCount: number
    resetOneShotCount: number
    resetProgressClockCount: number
    clearedEncounterCount: number
    resetAuthoredDebugContext: boolean
    fullRuntimeDebugReset: boolean
  }
}

function normalizeIdList(values: readonly string[] | undefined) {
  if (!values) {
    return []
  }

  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))]
}

function withRuntimeState(
  state: GameState,
  updater: (runtimeState: RuntimeState) => RuntimeState
) {
  const normalized = ensureManagedGameState(state)
  const runtimeState = normalized.runtimeState ?? createDefaultRuntimeState(normalized.week)

  return {
    ...normalized,
    runtimeState: updater(runtimeState),
  }
}

function resetProgressClockRecord(
  clockId: string,
  runtimeClock: RuntimeState['progressClocks'][string],
  resetToDefaults: boolean
) {
  if (resetToDefaults) {
    const definition = getProgressClockDefinition(clockId)

    if (definition) {
      return {
        ...runtimeClock,
        id: clockId,
        label: definition.label,
        value: 0,
        max: definition.max,
        ...(definition.hidden !== undefined
          ? { hidden: definition.hidden }
          : runtimeClock.hidden !== undefined
            ? { hidden: runtimeClock.hidden }
            : {}),
        completedAtWeek: undefined,
      }
    }
  }

  return {
    ...runtimeClock,
    id: clockId,
    value: 0,
    completedAtWeek: undefined,
  }
}

/**
 * Deterministic debug reset layer for authored/runtime state.
 * All resets are explicit and user-triggered; no automatic behavior.
 */
export function applyDebugReset(state: GameState, request: DebugResetRequest): DebugResetResult {
  const normalized = ensureManagedGameState(state)
  const before = readGameStateManager(normalized)
  let next = normalized

  const summary: DebugResetResult['summary'] = {
    clearedDeveloperLog: false,
    clearedEventQueue: false,
    resetFlagCount: 0,
    resetOneShotCount: 0,
    resetProgressClockCount: 0,
    clearedEncounterCount: 0,
    resetAuthoredDebugContext: false,
    fullRuntimeDebugReset: false,
  }

  if (request.fullRuntimeDebugReset) {
    const defaultRuntime = createDefaultRuntimeState(next.week)

    next = {
      ...next,
      runtimeState: {
        ...defaultRuntime,
        // Preserve identity + current location so reset does not strand navigation.
        player: { ...before.player },
        currentLocation: { ...before.currentLocation },
      },
    }

    summary.fullRuntimeDebugReset = true
    summary.clearedDeveloperLog = true
    summary.clearedEventQueue = true
    summary.resetFlagCount = Object.keys(before.globalFlags).length
    summary.resetOneShotCount = Object.keys(before.oneShotEvents).length
    summary.resetProgressClockCount = Object.keys(before.progressClocks).length
    summary.clearedEncounterCount = Object.keys(before.encounterState).length
    summary.resetAuthoredDebugContext = true

    return {
      state: next,
      summary,
    }
  }

  if (request.clearDeveloperLog) {
    next = clearDeveloperLog(next)
    summary.clearedDeveloperLog = true
  }

  if (request.clearEventQueue) {
    const eventCount = before.eventQueue.entries.length
    next = clearRuntimeEventQueue(next)
    summary.clearedEventQueue = eventCount > 0
  }

  if (request.resetFlags) {
    const allFlagIds = Object.keys(before.globalFlags)
    const targetFlagIds = request.resetFlags.clearAll
      ? allFlagIds
      : normalizeIdList(request.resetFlags.flagIds)

    for (const flagId of targetFlagIds) {
      const hasFlag = Object.prototype.hasOwnProperty.call(readGameStateManager(next).globalFlags, flagId)
      if (!hasFlag) {
        continue
      }
      next = clearPersistentFlag(next, flagId)
      summary.resetFlagCount += 1
    }
  }

  if (request.resetOneShots) {
    const targetOneShotIds = request.resetOneShots.clearAll
      ? Object.keys(readGameStateManager(next).oneShotEvents)
      : normalizeIdList(request.resetOneShots.contentIds)

    if (targetOneShotIds.length > 0) {
      next = withRuntimeState(next, (runtimeState) => {
        const oneShotEvents = { ...runtimeState.oneShotEvents }
        for (const contentId of targetOneShotIds) {
          if (Object.prototype.hasOwnProperty.call(oneShotEvents, contentId)) {
            delete oneShotEvents[contentId]
            summary.resetOneShotCount += 1
          }
        }

        return {
          ...runtimeState,
          oneShotEvents,
        }
      })
    }
  }

  if (request.resetProgressClocks) {
    const runtime = readGameStateManager(next)
    const targetClockIds = request.resetProgressClocks.clearAll
      ? Object.keys(runtime.progressClocks)
      : normalizeIdList(request.resetProgressClocks.clockIds)
    const resetToDefaults = Boolean(request.resetProgressClocks.resetToDefaults)

    if (targetClockIds.length > 0) {
      next = withRuntimeState(next, (runtimeState) => {
        const progressClocks = { ...runtimeState.progressClocks }
        for (const clockId of targetClockIds) {
          const current = progressClocks[clockId]
          if (!current) {
            continue
          }

          progressClocks[clockId] = resetProgressClockRecord(clockId, current, resetToDefaults)
          summary.resetProgressClockCount += 1
        }

        return {
          ...runtimeState,
          progressClocks,
        }
      })
    }
  }

  if (request.clearEncounterRuntime) {
    const runtime = readGameStateManager(next)
    const targetEncounterIds = request.clearEncounterRuntime.clearAll
      ? Object.keys(runtime.encounterState)
      : normalizeIdList(request.clearEncounterRuntime.encounterIds)

    if (targetEncounterIds.length > 0) {
      next = withRuntimeState(next, (runtimeState) => {
        const encounterState = { ...runtimeState.encounterState }
        for (const encounterId of targetEncounterIds) {
          if (Object.prototype.hasOwnProperty.call(encounterState, encounterId)) {
            delete encounterState[encounterId]
            summary.clearedEncounterCount += 1
          }
        }

        return {
          ...runtimeState,
          encounterState,
        }
      })
    }
  }

  if (request.resetAuthoredDebugContext) {
    next = withRuntimeState(next, (runtimeState) => ({
      ...runtimeState,
      ui: {
        ...runtimeState.ui,
        selectedLocationId: undefined,
        selectedSceneId: undefined,
        selectedCaseId: undefined,
        selectedTeamId: undefined,
        selectedAgentId: undefined,
        inspectorPanel: undefined,
        authoring: undefined,
      },
    }))
    summary.resetAuthoredDebugContext = true
  }

  return {
    state: next,
    summary,
  }
}

export function applyFrontDeskRuntimeBaselineReset(state: GameState) {
  return applyDebugReset(state, {
    clearDeveloperLog: true,
    clearEventQueue: true,
    clearEncounterRuntime: { clearAll: true },
    resetAuthoredDebugContext: true,
  })
}

export function applyQueueAndLogReset(state: GameState) {
  return applyDebugReset(state, {
    clearDeveloperLog: true,
    clearEventQueue: true,
  })
}

export function applyEncounterDebugReset(state: GameState) {
  return applyDebugReset(state, {
    clearEncounterRuntime: { clearAll: true },
    clearEventQueue: true,
  })
}
