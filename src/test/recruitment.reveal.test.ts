import { describe, expect, it } from 'vitest'
import { revealCandidate, type Candidate } from '../domain/models'

describe('revealCandidate', () => {
  it('increments reveal level and unlocks partial scouting data at level 1', () => {
    const candidate: Candidate = {
      id: 'cand-scout-01',
      name: 'Scout Prospect',
      age: 29,
      category: 'agent',
      hireStatus: 'available',
      weeklyCost: 24,
      revealLevel: 0,
      expiryWeek: 6,
      evaluation: {
        overallVisible: false,
        overallValue: 78,
        potentialVisible: false,
        potentialTier: 'high',
        rumorTags: ['steady-aim'],
        impression: 'Quietly capable.',
        teamwork: 'Promising.',
        outlook: 'Could scale quickly.',
      },
      agentData: {
        role: 'field',
        specialization: 'recon',
        stats: {
          combat: 67,
          investigation: 54,
          utility: 46,
          social: 32,
        },
        domainStats: {
          tactical: {
            awareness: 71,
            reaction: 68,
          },
        },
        traits: ['steady-aim'],
      },
    }

    const revealed = revealCandidate(candidate, 1)

    expect(revealed.revealLevel).toBe(1)
    expect(revealed.costEstimate).toBe('moderate')
    expect(revealed.evaluation.overallVisible).toBe(false)
    expect(revealed.evaluation.potentialVisible).toBe(true)
    expect(revealed.agentData?.visibleStats).toEqual({
      combat: 70,
      investigation: 50,
      utility: 50,
      social: 30,
    })
    expect(revealed.agentData?.visibleDomainStats?.tactical).toEqual({
      awareness: 70,
      reaction: 70,
    })
  })

  it('caps reveal level at 2 and unlocks full evaluation data', () => {
    const candidate: Candidate = {
      id: 'cand-scout-02',
      name: 'Full Prospect',
      age: 31,
      category: 'staff',
      hireStatus: 'available',
      weeklyCost: 18,
      revealLevel: 1,
      expiryWeek: 7,
      evaluation: {
        overallVisible: false,
        overallValue: 64,
        potentialVisible: true,
        potentialTier: 'mid',
        rumorTags: [],
        impression: 'Methodical.',
        teamwork: 'Reliable.',
        outlook: 'Steady.',
      },
      staffData: {
        specialty: 'analysis',
        efficiency: 77,
      },
    }

    const revealed = revealCandidate(candidate, 5)

    expect(revealed.revealLevel).toBe(2)
    expect(revealed.evaluation.overallVisible).toBe(true)
    expect(revealed.evaluation.overall).toBe(64)
    expect(revealed.evaluation.potentialVisible).toBe(true)
    expect(revealed.evaluation.potentialTier).toBe('mid')
    expect(revealed.staffData?.visibleEfficiency).toBe(77)
  })
})
