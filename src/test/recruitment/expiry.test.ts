// cspell:words cand
import { describe, expect, it } from 'vitest'
import { removeExpiredCandidates } from '../../domain/sim/candidateGenerator'
import { buildAgentCandidate, buildStaffCandidate } from './fixtures'

describe('recruitment expiry', () => {
  it('removes candidates only after the expiry week has passed', () => {
    const candidates = [
      buildAgentCandidate({ id: 'cand-a', expiryWeek: 4 }),
      buildStaffCandidate({ id: 'cand-b', expiryWeek: 5 }),
    ]

    const remainingAtWeek4 = removeExpiredCandidates(candidates, 4)
    const remainingAtWeek5 = removeExpiredCandidates(candidates, 5)

    expect(remainingAtWeek4.map((candidate) => candidate.id)).toEqual(['cand-a', 'cand-b'])
    expect(remainingAtWeek5.map((candidate) => candidate.id)).toEqual(['cand-b'])
  })
})
