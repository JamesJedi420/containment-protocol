import { describe, expect, it } from 'vitest'
import { advanceWeek } from '../../domain/sim/advanceWeek'
import { buildAgentCandidate, buildRecruitmentState } from './fixtures'

describe('recruitment weekly integration', () => {
  it('produces a consistent weekly recruitment pool through advanceWeek', () => {
    const stateA = buildRecruitmentState()
    const stateB = buildRecruitmentState()
    const expiringCandidateA = buildAgentCandidate({
      id: 'cand-expiring',
      expiryWeek: 4,
    })
    const expiringCandidateB = buildAgentCandidate({
      id: 'cand-expiring',
      expiryWeek: 4,
    })

    stateA.week = 4
    stateA.rngSeed = 2468
    stateA.rngState = 2468
    stateA.candidates = [expiringCandidateA]
    stateA.recruitmentPool = [expiringCandidateA]

    stateB.week = 4
    stateB.rngSeed = 2468
    stateB.rngState = 2468
    stateB.candidates = [expiringCandidateB]
    stateB.recruitmentPool = [expiringCandidateB]

    const nextA = advanceWeek(stateA)
    const nextB = advanceWeek(stateB)

    expect(nextA.candidates).toEqual(nextB.candidates)
    expect(nextA.recruitmentPool).toEqual(nextB.recruitmentPool)
    expect(nextA.candidates).toEqual(nextA.recruitmentPool)
    expect(nextA.candidates.some((candidate) => candidate.id === 'cand-expiring')).toBe(false)
    expect(nextA.candidates.length).toBeGreaterThanOrEqual(3)
    expect(nextA.candidates.length).toBeLessThanOrEqual(6)
  })

  it('uses canonical candidates when legacy recruitmentPool mirror is stale', () => {
    const state = buildRecruitmentState()
    const canonicalCandidate = buildAgentCandidate({
      id: 'cand-canonical',
      expiryWeek: 8,
    })
    const staleMirrorCandidate = buildAgentCandidate({
      id: 'cand-stale-mirror',
      expiryWeek: 8,
    })

    state.week = 4
    state.rngSeed = 9991
    state.rngState = 9991
    state.candidates = [canonicalCandidate]
    state.recruitmentPool = [staleMirrorCandidate]

    const next = advanceWeek(state)

    expect(next.candidates.some((candidate) => candidate.id === 'cand-canonical')).toBe(true)
    expect(next.candidates.some((candidate) => candidate.id === 'cand-stale-mirror')).toBe(false)
    expect(next.recruitmentPool).toEqual(next.candidates)
  })
})
