// cspell:words qevt
import { ensureManagedGameState } from './gameStateManager'
import type { GameState, RuntimeQueuedEvent } from './models'

export interface RuntimeQueueEventInput {
  type: string
  targetId: string
  contextId?: string
  source?: string
  week?: number
  payload?: RuntimeQueuedEvent['payload']
}

export interface RuntimeEnqueueResult {
  state: GameState
  event: RuntimeQueuedEvent | null
}

export interface RuntimeDequeueResult {
  state: GameState
  event: RuntimeQueuedEvent | null
}

function normalizeString(value: string | undefined | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeWeek(value: number | undefined, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(1, Math.trunc(value))
}

function clonePayload(payload: RuntimeQueuedEvent['payload']) {
  if (!payload) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(payload).map(([payloadId, payloadValue]) => [
      payloadId,
      Array.isArray(payloadValue) ? [...payloadValue] : payloadValue,
    ])
  )
}

function cloneQueuedEvent(event: RuntimeQueuedEvent): RuntimeQueuedEvent {
  return {
    ...event,
    ...(event.payload ? { payload: clonePayload(event.payload) } : {}),
  }
}

function getEventQueueState(state: GameState) {
  const normalized = ensureManagedGameState(state)
  const queueState = normalized.runtimeState?.eventQueue

  return {
    normalized,
    queueState: {
      entries: queueState?.entries ?? [],
      nextSequence: Math.max(1, queueState?.nextSequence ?? 1),
    },
  }
}

function withEventQueueState(
  state: GameState,
  updater: (queue: { entries: RuntimeQueuedEvent[]; nextSequence: number }) => {
    entries: RuntimeQueuedEvent[]
    nextSequence: number
  }
) {
  const { normalized, queueState } = getEventQueueState(state)
  const nextQueue = updater({
    entries: queueState.entries.map(cloneQueuedEvent),
    nextSequence: queueState.nextSequence,
  })

  return {
    ...normalized,
    runtimeState: {
      ...normalized.runtimeState!,
      eventQueue: {
        entries: nextQueue.entries.map(cloneQueuedEvent),
        nextSequence: Math.max(1, Math.trunc(nextQueue.nextSequence)),
      },
    },
  }
}

export function listQueuedRuntimeEvents(state: GameState) {
  const { queueState } = getEventQueueState(state)
  return queueState.entries.map(cloneQueuedEvent)
}

export function peekQueuedRuntimeEvent(state: GameState) {
  return listQueuedRuntimeEvents(state)[0] ?? null
}

export function enqueueRuntimeEvent(state: GameState, input: RuntimeQueueEventInput): RuntimeEnqueueResult {
  const type = normalizeString(input.type)
  const targetId = normalizeString(input.targetId)

  if (type.length === 0 || targetId.length === 0) {
    return {
      state: ensureManagedGameState(state),
      event: null,
    }
  }

  let enqueuedEvent: RuntimeQueuedEvent | null = null
  const nextState = withEventQueueState(state, (queue) => {
    const sequence = Math.max(1, queue.nextSequence)
    const event: RuntimeQueuedEvent = {
      id: `qevt-${String(sequence).padStart(4, '0')}`,
      type,
      targetId,
      ...(normalizeString(input.contextId) ? { contextId: normalizeString(input.contextId) } : {}),
      ...(normalizeString(input.source) ? { source: normalizeString(input.source) } : {}),
      week: normalizeWeek(input.week, ensureManagedGameState(state).week),
      ...(clonePayload(input.payload) ? { payload: clonePayload(input.payload) } : {}),
    }

    enqueuedEvent = event

    return {
      entries: [...queue.entries, event],
      nextSequence: sequence + 1,
    }
  })

  return {
    state: nextState,
    event: enqueuedEvent,
  }
}

export function dequeueRuntimeEvent(state: GameState): RuntimeDequeueResult {
  let dequeuedEvent: RuntimeQueuedEvent | null = null
  const nextState = withEventQueueState(state, (queue) => {
    dequeuedEvent = queue.entries[0] ? cloneQueuedEvent(queue.entries[0]) : null

    if (!dequeuedEvent) {
      return queue
    }

    return {
      entries: queue.entries.slice(1),
      nextSequence: queue.nextSequence,
    }
  })

  return {
    state: nextState,
    event: dequeuedEvent,
  }
}

export function clearRuntimeEventQueue(state: GameState) {
  return withEventQueueState(state, (queue) => ({
    entries: [],
    nextSequence: queue.nextSequence,
  }))
}

export function hasQueuedRuntimeEvent(
  state: GameState,
  matcher: { targetId?: string; type?: string }
) {
  const targetId = normalizeString(matcher.targetId)
  const type = normalizeString(matcher.type)

  return listQueuedRuntimeEvents(state).some((event) => {
    const targetMatches = targetId.length === 0 || event.targetId === targetId
    const typeMatches = type.length === 0 || event.type === type
    return targetMatches && typeMatches
  })
}
