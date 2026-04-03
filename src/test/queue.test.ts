import { describe, it, expect } from 'vitest'
import { createStartingState } from '../../src/data/startingState'
import {
  enqueueCases,
  dequeueCase,
  reprioritizeCase,
  moveQueuedCase,
  clearQueue,
  getQueuedCasesOrdered,
} from '../../src/domain/sim/queue'
import type { GameState } from '../../src/domain/models'

describe('Queue System', () => {
  let state: GameState

  beforeEach(() => {
    state = createStartingState()
  })

  describe('enqueueCases', () => {
    it('should add cases to empty queue', () => {
      const caseIds = Object.keys(state.cases).slice(0, 2)
      const next = enqueueCases(state, caseIds)

      expect(next.caseQueue.queuedCaseIds).toEqual(caseIds)
      expect(next.caseQueue.priorities[caseIds[0]]).toBe('normal')
      expect(next.caseQueue.priorities[caseIds[1]]).toBe('normal')
    })

    it('should not mutate original state', () => {
      const caseIds = Object.keys(state.cases).slice(0, 1)
      const originalQueue = { ...state.caseQueue }
      enqueueCases(state, caseIds)

      expect(state.caseQueue).toEqual(originalQueue)
    })

    it('should set custom priority', () => {
      const caseIds = [Object.keys(state.cases)[0]]
      const next = enqueueCases(state, caseIds, 'critical')

      expect(next.caseQueue.priorities[caseIds[0]]).toBe('critical')
    })

    it('should not add duplicate cases', () => {
      const caseId = Object.keys(state.cases)[0]
      const s1 = enqueueCases(state, [caseId])
      const s2 = enqueueCases(s1, [caseId])

      expect(s2.caseQueue.queuedCaseIds).toHaveLength(1)
      expect(s2.caseQueue.queuedCaseIds[0]).toBe(caseId)
    })

    it('should update priority if case already queued', () => {
      const caseId = Object.keys(state.cases)[0]
      const s1 = enqueueCases(state, [caseId], 'normal')
      const s2 = enqueueCases(s1, [caseId], 'high')

      expect(s2.caseQueue.priorities[caseId]).toBe('high')
      expect(s2.caseQueue.queuedCaseIds).toHaveLength(1)
    })
  })

  describe('dequeueCase', () => {
    it('should remove a queued case', () => {
      const caseIds = Object.keys(state.cases).slice(0, 2)
      const s1 = enqueueCases(state, caseIds)
      const s2 = dequeueCase(s1, caseIds[0])

      expect(s2.caseQueue.queuedCaseIds).toEqual([caseIds[1]])
      expect(s2.caseQueue.priorities[caseIds[0]]).toBeUndefined()
    })

    it('should be no-op for non-queued case', () => {
      const s1 = enqueueCases(state, [Object.keys(state.cases)[0]])
      const s2 = dequeueCase(s1, Object.keys(state.cases)[1])

      expect(s2.caseQueue.queuedCaseIds).toEqual(s1.caseQueue.queuedCaseIds)
    })

    it('should maintain order of remaining cases', () => {
      const caseIds = Object.keys(state.cases).slice(0, 3)
      const s1 = enqueueCases(state, caseIds)
      const s2 = dequeueCase(s1, caseIds[1])

      expect(s2.caseQueue.queuedCaseIds).toEqual([caseIds[0], caseIds[2]])
    })
  })

  describe('reprioritizeCase', () => {
    it('should update priority of queued case', () => {
      const caseId = Object.keys(state.cases)[0]
      const s1 = enqueueCases(state, [caseId], 'normal')
      const s2 = reprioritizeCase(s1, caseId, 'critical')

      expect(s2.caseQueue.priorities[caseId]).toBe('critical')
    })

    it('should add case to queue if not present', () => {
      const caseId = Object.keys(state.cases)[0]
      const s1 = enqueueCases(state, [])
      const s2 = reprioritizeCase(s1, caseId, 'high')

      expect(s2.caseQueue.queuedCaseIds).toContain(caseId)
      expect(s2.caseQueue.priorities[caseId]).toBe('high')
    })

    it('should handle all priority levels', () => {
      const caseIds = Object.keys(state.cases).slice(0, 4)
      let s = enqueueCases(state, caseIds)

      const priorities = ['critical', 'high', 'normal', 'low'] as const
      priorities.forEach((priority, idx) => {
        s = reprioritizeCase(s, caseIds[idx], priority)
      })

      priorities.forEach((priority, idx) => {
        expect(s.caseQueue.priorities[caseIds[idx]]).toBe(priority)
      })
    })
  })

  describe('moveQueuedCase', () => {
    it('should move queued case to new position', () => {
      const caseIds = Object.keys(state.cases).slice(0, 3)
      const s1 = enqueueCases(state, caseIds)
      const s2 = moveQueuedCase(s1, caseIds[0], 2)

      expect(s2.caseQueue.queuedCaseIds).toEqual([caseIds[1], caseIds[2], caseIds[0]])
    })

    it('should add case if not in queue', () => {
      const caseIds = Object.keys(state.cases).slice(0, 2)
      const s1 = enqueueCases(state, [caseIds[0]])
      const s2 = moveQueuedCase(s1, caseIds[1], 1)

      expect(s2.caseQueue.queuedCaseIds).toEqual([caseIds[0], caseIds[1]])
    })

    it('should clamp index to valid bounds', () => {
      const caseIds = Object.keys(state.cases).slice(0, 2)
      const s1 = enqueueCases(state, caseIds)
      const s2 = moveQueuedCase(s1, caseIds[0], 999)

      expect(s2.caseQueue.queuedCaseIds).toEqual([caseIds[1], caseIds[0]])
    })

    it('should handle negative indices by converting to 0', () => {
      const caseIds = Object.keys(state.cases).slice(0, 2)
      const s1 = enqueueCases(state, caseIds)
      const s2 = moveQueuedCase(s1, caseIds[1], -10)

      expect(s2.caseQueue.queuedCaseIds[0]).toBe(caseIds[1])
    })

    it('should be no-op for non-existent case in empty game', () => {
      const s1 = clearQueue(state)
      const s2 = moveQueuedCase(s1, 'non-existent-id', 0)

      expect(s2.caseQueue.queuedCaseIds).toHaveLength(0)
    })
  })

  describe('clearQueue', () => {
    it('should remove all queued cases', () => {
      const caseIds = Object.keys(state.cases).slice(0, 3)
      const s1 = enqueueCases(state, caseIds)
      const s2 = clearQueue(s1)

      expect(s2.caseQueue.queuedCaseIds).toHaveLength(0)
      expect(s2.caseQueue.priorities).toEqual({})
    })

    it('should work on empty queue', () => {
      const s = clearQueue(state)
      expect(s.caseQueue.queuedCaseIds).toHaveLength(0)
    })
  })

  describe('getQueuedCasesOrdered', () => {
    it('should sort by priority tier', () => {
      const caseIds = Object.keys(state.cases).slice(0, 4)
      let s = enqueueCases(state, caseIds, 'low')

      s = reprioritizeCase(s, caseIds[0], 'critical')
      s = reprioritizeCase(s, caseIds[1], 'high')
      s = reprioritizeCase(s, caseIds[2], 'normal')
      // caseIds[3] stays 'low'

      const ordered = getQueuedCasesOrdered(s)

      // Should be: critical, high, normal, low
      expect(ordered[0]).toBe(caseIds[0])
      expect(ordered[1]).toBe(caseIds[1])
      expect(ordered[2]).toBe(caseIds[2])
      expect(ordered[3]).toBe(caseIds[3])
    })

    it('should maintain queue order within same priority', () => {
      const caseIds = Object.keys(state.cases).slice(0, 3)
      const s = enqueueCases(state, caseIds, 'high')
      // All have 'high' priority, so order should match queue order

      const ordered = getQueuedCasesOrdered(s)
      expect(ordered).toEqual(caseIds)
    })

    it('should not mutate original queue order', () => {
      const caseIds = Object.keys(state.cases).slice(0, 3)
      let s = enqueueCases(state, caseIds)

      s = reprioritizeCase(s, caseIds[2], 'critical')

      // Original queue order unchanged
      expect(s.caseQueue.queuedCaseIds).toEqual(caseIds)

      // getQueuedCasesOrdered returns sorted copy
      const ordered = getQueuedCasesOrdered(s)
      expect(ordered[0]).toBe(caseIds[2])
    })

    it('should handle mixed priorities correctly', () => {
      const caseIds = Object.keys(state.cases).slice(0, 3)
      let s = state

      // Queue: 0(critical), 1(low), 2(high)
      s = enqueueCases(s, [caseIds[0]], 'critical')
      s = enqueueCases(s, [caseIds[1]], 'low')
      s = enqueueCases(s, [caseIds[2]], 'high')

      const ordered = getQueuedCasesOrdered(s)

      // priority_order: critical(0) > high(1) > low(3)
      // Within same priority, maintain queue insertion order
      expect(ordered[0]).toBe(caseIds[0]) // critical
      expect(ordered[1]).toBe(caseIds[2]) // high
      expect(ordered[2]).toBe(caseIds[1]) // low
    })

    it('should treat unknown priority as normal', () => {
      const caseIds = Object.keys(state.cases).slice(0, 2)
      let s = enqueueCases(state, caseIds)

      // Manually set unknown priority (as string that's not a valid CasePriority)
      s = {
        ...s,
        caseQueue: {
          ...s.caseQueue,
          priorities: {
            [caseIds[0]]: 'critical',
            [caseIds[1]]: 'unknown_priority' as unknown as typeof s.caseQueue.priorities[keyof typeof s.caseQueue.priorities],
          },
        },
      }

      const ordered = getQueuedCasesOrdered(s)
      expect(ordered[0]).toBe(caseIds[0]) // critical comes first
      expect(ordered[1]).toBe(caseIds[1]) // unknown is treated as low
    })
  })

  describe('edge cases', () => {
    it('should handle empty case list', () => {
      const s = enqueueCases(state, [])
      expect(s.caseQueue.queuedCaseIds).toHaveLength(0)
    })

    it('should maintain queue consistency after multiple operations', () => {
      const caseIds = Object.keys(state.cases).slice(0, 3)

      let s = enqueueCases(state, caseIds.slice(0, 2))
      s = dequeueCase(s, caseIds[0])
      s = enqueueCases(s, [caseIds[2]])
      s = reprioritizeCase(s, caseIds[1], 'high')

      // Final order: 2, 1(high)
      expect(s.caseQueue.queuedCaseIds).toEqual([caseIds[1], caseIds[2]])
    })
  })

  describe('determinism', () => {
    it('should produce consistent results with seeded state', () => {
      const caseIds = Object.keys(state.cases).slice(0, 3)

      let s1 = enqueueCases(state, caseIds)
      s1 = reprioritizeCase(s1, caseIds[0], 'critical')
      s1 = dequeueCase(s1, caseIds[1])

      let s2 = enqueueCases(state, caseIds)
      s2 = reprioritizeCase(s2, caseIds[0], 'critical')
      s2 = dequeueCase(s2, caseIds[1])

      expect(s1.caseQueue).toEqual(s2.caseQueue)
    })
  })
})
