// cspell:words cand
import { describe, expect, it } from 'vitest'
import { hireCandidate } from '../../domain/sim/hire'
import { buildAgentCandidate, buildRecruitmentState } from './fixtures'

describe('recruitment hiring', () => {
  it('maps the same candidate into the same agent state on repeated hires', () => {
    const candidateA = buildAgentCandidate({ id: 'cand-hire-stable' })
    const candidateB = buildAgentCandidate({ id: 'cand-hire-stable' })

    const stateA = buildRecruitmentState()
    const stateB = buildRecruitmentState()

    stateA.funding = 100
    stateB.funding = 100
    stateA.candidates = [candidateA]
    stateA.recruitmentPool = [candidateA]
    stateB.candidates = [candidateB]
    stateB.recruitmentPool = [candidateB]

    const nextA = hireCandidate(stateA, candidateA.id)
    const nextB = hireCandidate(stateB, candidateB.id)

    expect(nextA.agents[candidateA.id]).toEqual(nextB.agents[candidateB.id])
    expect(nextA.events.at(-1)).toEqual(nextB.events.at(-1))
    expect(nextA.candidates).toEqual([])
    expect(nextA.recruitmentPool).toEqual([])
  })
})
