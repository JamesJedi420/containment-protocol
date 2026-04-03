import type { GameState, Id, CasePriority } from '../models'

function getCaseQueue(state: GameState) {
  return {
    queuedCaseIds: [...(state.caseQueue?.queuedCaseIds ?? [])],
    priorities: { ...(state.caseQueue?.priorities ?? {}) },
  }
}

/**
 * Add case(s) to the priority queue at the end.
 * If a case is already queued, this is a no-op for that case.
 */
export function enqueueCases(
  state: GameState,
  caseIds: Id[],
  priority: CasePriority = 'normal'
): GameState {
  const queue = getCaseQueue(state)
  const queuedCaseIds = [...queue.queuedCaseIds]
  const priorities = { ...queue.priorities }
  const alreadyQueued = new Set(queuedCaseIds)

  for (const caseId of caseIds) {
    if (!alreadyQueued.has(caseId)) {
      queuedCaseIds.push(caseId)
      alreadyQueued.add(caseId)
    }
    priorities[caseId] = priority
  }

  return {
    ...state,
    caseQueue: {
      queuedCaseIds,
      priorities,
    },
  }
}

/**
 * Remove a case from the queue.
 * If case is not queued, this is a no-op.
 */
export function dequeueCase(state: GameState, caseId: Id): GameState {
  const queue = getCaseQueue(state)
  const index = queue.queuedCaseIds.indexOf(caseId)

  if (index < 0) {
    return state
  }

  const queuedCaseIds = queue.queuedCaseIds.filter((_, i) => i !== index)
  const priorities = { ...queue.priorities }
  delete priorities[caseId]

  return {
    ...state,
    caseQueue: {
      queuedCaseIds,
      priorities,
    },
  }
}

/**
 * Update priority of a queued case.
 * If case is not queued, creates queue entry with given priority.
 */
export function reprioritizeCase(
  state: GameState,
  caseId: Id,
  priority: CasePriority
): GameState {
  const queue = getCaseQueue(state)

  // If not in queue, add it
  if (!queue.queuedCaseIds.includes(caseId)) {
    queue.queuedCaseIds.push(caseId)
  }

  queue.priorities = {
    ...queue.priorities,
    [caseId]: priority,
  }

  return {
    ...state,
    caseQueue: queue,
  }
}

/**
 * Move a case to a specific position in the queue.
 * If case is not queued, it is added at that position.
 * If targetIndex is out of bounds, case is moved to the end.
 */
export function moveQueuedCase(
  state: GameState,
  caseId: Id,
  targetIndex: number
): GameState {
  const queue = getCaseQueue(state)
  const currentIndex = queue.queuedCaseIds.indexOf(caseId)

  // Remove from current position if present
  if (currentIndex >= 0) {
    queue.queuedCaseIds.splice(currentIndex, 1)
  } else {
    // Case not in queue, add it if it exists in cases
    if (!state.cases[caseId]) {
      return state // Case doesn't exist, no-op
    }
  }

  // Insert at target position
  const insert = Math.max(0, Math.min(targetIndex, queue.queuedCaseIds.length))
  queue.queuedCaseIds.splice(insert, 0, caseId)

  return {
    ...state,
    caseQueue: queue,
  }
}

/**
 * Clear an entire queue.
 */
export function clearQueue(state: GameState): GameState {
  return {
    ...state,
    caseQueue: {
      queuedCaseIds: [],
      priorities: {},
    },
  }
}

/**
 * Get the queued case IDs sorted by priority tier, then by queue order.
 * Priority order: critical > high > normal > low
 */
export function getQueuedCasesOrdered(state: GameState): Id[] {
  const queue = getCaseQueue(state)
  const priorityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
  }

  return [...queue.queuedCaseIds].sort((aId, bId) => {
    const aPriority = queue.priorities[aId] ?? 'normal'
    const bPriority = queue.priorities[bId] ?? 'normal'
    const aPriorityNum = priorityOrder[aPriority]
    const bPriorityNum = priorityOrder[bPriority]

    if (aPriorityNum !== bPriorityNum) {
      return aPriorityNum - bPriorityNum
    }

    // Same priority, maintain queue order
    return queue.queuedCaseIds.indexOf(aId) - queue.queuedCaseIds.indexOf(bId)
  })
}
