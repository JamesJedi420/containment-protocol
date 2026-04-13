import { readGameStateManager, setUiDebugState } from './gameStateManager'
import type {
  DeveloperLogDetailValue,
  DeveloperLogEvent,
  DeveloperLogEventType,
  GameState,
} from './models'

export const DEVELOPER_LOG_RETENTION_LIMIT = 120

export interface DeveloperLogEventInput {
  type: DeveloperLogEventType
  summary: string
  week?: number
  contextId?: string
  details?: Record<string, DeveloperLogDetailValue>
}

export interface DeveloperLogSnapshot {
  retentionLimit: number
  nextEventSequence: number
  entries: DeveloperLogEvent[]
}

function normalizeString(value: string | undefined | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function cloneDetails(
  details: Record<string, DeveloperLogDetailValue> | undefined
): Record<string, DeveloperLogDetailValue> | undefined {
  if (!details) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(details).map(([detailId, detailValue]) => [
      detailId,
      Array.isArray(detailValue) ? [...detailValue] : detailValue,
    ])
  )
}

function cloneLogEntry(entry: DeveloperLogEvent): DeveloperLogEvent {
  return {
    ...entry,
    ...(entry.details ? { details: cloneDetails(entry.details) } : {}),
  }
}

/**
 * Pure append helper for authored/runtime debug traces.
 * New categories should be added at explicit emission points, not via global mutation interception.
 */
export function appendDeveloperLogEvent(state: GameState, input: DeveloperLogEventInput) {
  const runtime = readGameStateManager(state)
  const nextSequence = Math.max(1, runtime.ui.debug.nextEventSequence ?? 1)
  const summary = normalizeString(input.summary) || input.type
  const contextId = normalizeString(input.contextId) || runtime.ui.authoring?.activeContextId

  const nextEntry: DeveloperLogEvent = {
    id: `devlog-${String(nextSequence).padStart(4, '0')}`,
    week: typeof input.week === 'number' && Number.isFinite(input.week) ? Math.max(1, Math.trunc(input.week)) : state.week,
    type: input.type,
    summary,
    ...(contextId ? { contextId } : {}),
    ...(cloneDetails(input.details) ? { details: cloneDetails(input.details) } : {}),
  }

  const nextEntries = [...(runtime.ui.debug.eventLog ?? []).map(cloneLogEntry), nextEntry].slice(
    -DEVELOPER_LOG_RETENTION_LIMIT
  )

  return setUiDebugState(state, {
    debug: {
      enabled: runtime.ui.debug.enabled,
      flags: { ...runtime.ui.debug.flags },
      eventLog: nextEntries,
      nextEventSequence: nextSequence + 1,
    },
  })
}

export function clearDeveloperLog(state: GameState) {
  const runtime = readGameStateManager(state)

  return setUiDebugState(state, {
    debug: {
      enabled: runtime.ui.debug.enabled,
      flags: { ...runtime.ui.debug.flags },
      eventLog: [],
      nextEventSequence: 1,
    },
  })
}

export function buildDeveloperLogSnapshot(state: GameState, limit = DEVELOPER_LOG_RETENTION_LIMIT): DeveloperLogSnapshot {
  const runtime = readGameStateManager(state)
  const normalizedLimit = Math.max(1, Math.trunc(limit))
  const entries = [...(runtime.ui.debug.eventLog ?? [])]
    .slice(-normalizedLimit)
    .reverse()
    .map(cloneLogEntry)

  return {
    retentionLimit: DEVELOPER_LOG_RETENTION_LIMIT,
    nextEventSequence: Math.max(1, runtime.ui.debug.nextEventSequence ?? 1),
    entries,
  }
}
