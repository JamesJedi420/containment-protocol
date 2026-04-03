import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { type Candidate } from '../../domain/models'
import { getRecruitmentCandidateViews, getRecruitmentMetrics } from './recruitmentView'

const baseEvaluation = {
  overallVisible: true,
  overallValue: 72,
  potentialVisible: true,
  potentialTier: 'mid' as const,
  rumorTags: ['steady-aim'],
  impression: 'Strong first impression.',
  teamwork: 'Collaborative.',
  outlook: 'Likely to scale with support.',
}

function buildCandidates(): Candidate[] {
  return [
    {
      id: 'cand-alpha',
      name: 'Avery Holt',
      portraitId: 'portrait-agent-1',
      age: 28,
      category: 'agent',
      hireStatus: 'candidate',
      weeklyWage: 30,
      revealLevel: 2,
      expiryWeek: 6,
      evaluation: baseEvaluation,
      agentData: {
        role: 'combat',
        specialization: 'breach-entry',
        stats: { combat: 80, investigation: 42, utility: 48, social: 35 },
        traits: ['steady-aim'],
      },
    },
    {
      id: 'cand-bravo',
      name: 'Briar Lane',
      portraitId: 'portrait-staff-1',
      age: 36,
      category: 'staff',
      hireStatus: 'candidate',
      weeklyWage: 18,
      revealLevel: 1,
      expiryWeek: 3,
      evaluation: {
        ...baseEvaluation,
        overallVisible: false,
        overallValue: undefined,
      },
      staffData: {
        specialty: 'analysis',
        assignmentType: 'pattern-review',
        passiveBonuses: { analysisQuality: 0.05 },
      },
    },
    {
      id: 'cand-charlie',
      name: 'Case Rowan',
      portraitId: 'portrait-agent-2',
      age: 31,
      category: 'agent',
      hireStatus: 'candidate',
      weeklyWage: 24,
      revealLevel: 2,
      expiryWeek: 4,
      evaluation: {
        ...baseEvaluation,
        overallValue: 91,
      },
      agentData: {
        role: 'support',
        specialization: 'medical-support',
        stats: { combat: 44, investigation: 53, utility: 71, social: 56 },
        traits: ['rapid-triage'],
      },
    },
  ]
}

describe('recruitment view contract', () => {
  it('filters, sorts, and preserves hidden candidate fit without fabricating data', () => {
    const game = createStartingState()
    game.week = 4
    game.candidates = buildCandidates()

    const views = getRecruitmentCandidateViews(game, {
      search: 'case',
      sort: 'overall',
    })

    expect(views.map((view) => view.candidate.id)).toEqual(['cand-charlie'])
    expect(views[0]!.overallLabel).toBe('91')

    const hiddenView = getRecruitmentCandidateViews(game, {
      search: 'briar',
      sort: 'expiry',
    })[0]

    expect(hiddenView).toMatchObject({
      candidate: expect.objectContaining({ id: 'cand-bravo' }),
      hiddenOverall: true,
      overallLabel: 'Obscured',
      potentialLabel: 'mid',
      expiringSoon: true,
      preview: expect.objectContaining({
        canHire: true,
        reasons: [],
        estimatedValue: expect.any(Number),
      }),
    })
  })

  it('reports recruitment pressure metrics from the current pipeline', () => {
    const game = createStartingState()
    game.week = 4
    game.candidates = buildCandidates()

    expect(getRecruitmentMetrics(game)).toEqual({
      total: 3,
      agents: 2,
      staff: 1,
      specialists: 0,
      expiringSoon: 2,
    })
  })
})
