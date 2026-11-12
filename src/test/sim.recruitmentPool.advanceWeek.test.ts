import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStartingState } from '../data/startingState'
import { applyIntelSurgeToCandidates } from '../domain/directives'
import * as candidateGenerator from '../domain/sim/candidateGenerator'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { buildAgentCandidate } from './recruitment/fixtures'

function withDirective(
  state: ReturnType<typeof createStartingState>,
  directiveId: NonNullable<ReturnType<typeof createStartingState>['directiveState']['selectedId']>
) {
  return {
    ...state,
    directiveState: {
      selectedId: directiveId,
      history: [],
    },
  }
}

describe('advanceWeek recruitment pool', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('syncs intel-surge adjusted candidates into the recruitment pool', () => {
    const rawGenerated = [
      buildAgentCandidate({ id: 'cand-intel-a', revealLevel: 0, expiryWeek: 8 }),
      buildAgentCandidate({ id: 'cand-intel-b', revealLevel: 1, expiryWeek: 9 }),
    ]
    const surgeAdjusted = applyIntelSurgeToCandidates(rawGenerated)

    vi.spyOn(candidateGenerator, 'generateCandidates').mockReturnValue(rawGenerated)

    const directed = advanceWeek(withDirective(createStartingState(), 'intel-surge'))
    const surgeIds = new Set(surgeAdjusted.map((candidate) => candidate.id))

    for (const candidate of directed.candidates) {
      if (!surgeIds.has(candidate.id)) continue
      const expected = surgeAdjusted.find((entry) => entry.id === candidate.id)
      expect(expected).toBeDefined()
      expect(candidate.revealLevel).toBe(expected!.revealLevel)
      expect(candidate.expiryWeek).toBe(expected!.expiryWeek)
    }
  })

  it('rerolls recruitment ids when a generated candidate collides with the pool', () => {
    const state = createStartingState()
    const colliding = buildAgentCandidate({ id: 'cand-collision', expiryWeek: 99 })
    state.candidates = [colliding]
    state.recruitmentPool = [colliding]

    vi.spyOn(candidateGenerator, 'generateCandidates').mockReturnValue([
      buildAgentCandidate({ id: 'cand-collision', expiryWeek: 99 }),
    ])

    const next = advanceWeek(state)
    const collisionIds = next.candidates.filter((candidate) => candidate.id === 'cand-collision')

    expect(collisionIds).toHaveLength(1)
    expect(next.candidates.some((candidate) => candidate.id === 'cand-collision-1')).toBe(true)
  })

  it('extends generated candidate expiry instead of failing when already expired this tick', () => {
    const state = createStartingState()
    state.week = 5
    state.rngSeed = 77
    state.rngState = 77

    vi.spyOn(candidateGenerator, 'generateCandidates').mockReturnValue([
      buildAgentCandidate({ id: 'cand-stale', expiryWeek: 4 }),
    ])

    const next = advanceWeek(state)
    const stale = next.candidates.find((candidate) => candidate.id === 'cand-stale')

    expect(stale).toBeDefined()
    expect(stale!.expiryWeek).toBeGreaterThanOrEqual(next.week)
  })
})
