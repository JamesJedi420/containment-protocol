import { describe, expect, it } from 'vitest'

import {
  type ExclusiveOutcomeRegistry,
  assertExclusiveOutcomeBuckets,
  recordExclusiveOutcome,
  resolveConsequenceRoute,
  resolveContest,
} from '../domain/shared/outcomes'

describe('shared outcomes substrate', () => {
  it('resolves contested checks into bounded graded bands', () => {
    const result = resolveContest({
      actorScore: 4,
      oppositionScore: 1,
      modifiers: [1, -1, 2],
    })

    expect(result.raw).toBe(5)
    expect(result.bounded).toBe(3)
    expect(result.band).toBe('strong')
  })

  it('records exclusive outcomes only once per tick', () => {
    const resolved: string[] = []
    const failed: string[] = []
    const partial: string[] = []
    const unresolved: string[] = []
    const finalizedIds = new Set<string>()
    const registry: ExclusiveOutcomeRegistry<string> = {
      finalizedIds,
      recorders: {
        resolved: (id) => resolved.push(id),
        failed: (id) => failed.push(id),
        partial: (id) => partial.push(id),
        unresolved: (id) => unresolved.push(id),
      },
    }

    const firstRecord = recordExclusiveOutcome(registry, 'case-1', 'resolved')
    const secondRecord = recordExclusiveOutcome(registry, 'case-1', 'failed')

    expect(firstRecord).toBe(true)
    expect(secondRecord).toBe(false)
    expect(resolved).toEqual(['case-1'])
    expect(failed).toEqual([])
    expect(partial).toEqual([])
    expect(unresolved).toEqual([])
  })

  it('fails hard when bucket overlap exists', () => {
    expect(() =>
      assertExclusiveOutcomeBuckets({
        resolved: ['case-1'],
        failed: [],
        partial: ['case-1'],
        unresolved: [],
      })
    ).toThrow(/overlap/i)
  })

  it('routes typed consequence ladders through one canonical path', () => {
    const route = resolveConsequenceRoute('containment', 'strong', true)

    expect(route.family).toBe('containment')
    expect(route.band).toBe('strong')
    expect(route.consequences).toEqual(['contained', 'hazard-neutralized'])
    expect(route.severeHit).toEqual(['breach', 'hazard-spread', 'escalating'])
  })
})
