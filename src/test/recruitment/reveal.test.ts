import { describe, expect, it } from 'vitest'
import { revealCandidate } from '../../domain/recruitment'
import { buildAgentCandidate } from './fixtures'

describe('recruitment reveal', () => {
  it('unlocks the correct fields as reveal level increases', () => {
    const candidate = buildAgentCandidate({
      revealLevel: 0,
      costEstimate: undefined,
      evaluation: {
        overallVisible: false,
        overallValue: 74,
        potentialVisible: false,
        potentialTier: 'mid',
        rumorTags: ['steady-aim'],
        impression: 'Capable under pressure.',
        teamwork: 'Works cleanly in multi-team operations.',
        outlook: 'Steady contributor trajectory.',
      },
    })

    const levelOne = revealCandidate(candidate, 1)
    const levelTwo = revealCandidate(levelOne, 1)

    if (levelOne.category !== 'agent' || !levelOne.agentData) {
      throw new Error('Expected level one reveal to remain an agent candidate.')
    }

    if (levelTwo.category !== 'agent' || !levelTwo.agentData) {
      throw new Error('Expected level two reveal to remain an agent candidate.')
    }

    expect(levelOne.revealLevel).toBe(1)
    expect(levelOne.costEstimate).toBe('moderate')
    expect(levelOne.evaluation.potentialVisible).toBe(true)
    expect(levelOne.evaluation.overallVisible).toBe(false)
    expect(levelOne.agentData.visibleStats).toEqual({
      combat: 70,
      investigation: 50,
      utility: 40,
      social: 30,
    })
    expect(levelOne.agentData.visibleDomainStats?.tactical).toEqual({
      awareness: 70,
      reaction: 70,
    })

    expect(levelTwo.revealLevel).toBe(2)
    expect(levelTwo.evaluation.overallVisible).toBe(true)
    expect(levelTwo.evaluation.overall).toBe(74)
    expect(levelTwo.agentData.visibleStats).toEqual(candidate.agentData.stats)
    expect(levelTwo.agentData.visibleDomainStats).toEqual(candidate.agentData.domainStats)
  })
})
