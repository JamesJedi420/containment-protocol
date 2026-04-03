import { createStartingState } from '../../data/startingState'
import type { Candidate, GameState } from '../../domain/models'

const baseEvaluation = {
  overallVisible: true,
  overall: 74,
  overallValue: 74,
  potentialVisible: true,
  potentialTier: 'mid' as const,
  rumorTags: ['steady-aim'],
  impression: 'Capable under pressure.',
  teamwork: 'Works cleanly in multi-team operations.',
  outlook: 'Steady contributor trajectory.',
}

export function buildRecruitmentState(): GameState {
  const state = createStartingState()
  state.candidates = []
  state.recruitmentPool = []
  return state
}

export function buildAgentCandidate(
  overrides: Partial<Extract<Candidate, { category: 'agent' }>> = {}
): Extract<Candidate, { category: 'agent' }> {
  return {
    id: 'cand-agent-01',
    name: 'Avery Holt',
    portraitId: 'portrait-agent-01',
    age: 29,
    category: 'agent',
    hireStatus: 'available',
    weeklyCost: 24,
    weeklyWage: 24,
    costEstimate: 'moderate',
    revealLevel: 2,
    expiryWeek: 6,
    evaluation: baseEvaluation,
    agentData: {
      role: 'field',
      specialization: 'recon',
      stats: {
        combat: 68,
        investigation: 54,
        utility: 42,
        social: 30,
      },
      domainStats: {
        tactical: {
          awareness: 72,
          reaction: 69,
        },
        cognitive: {
          analysis: 58,
          investigation: 63,
        },
      },
      traits: ['steady-aim', 'fieldcraft'],
      growthProfile: 'adaptive',
    },
    ...overrides,
  }
}

export function buildStaffCandidate(
  overrides: Partial<Extract<Candidate, { category: 'staff' }>> = {}
): Extract<Candidate, { category: 'staff' }> {
  return {
    id: 'cand-staff-01',
    name: 'Briar Lane',
    portraitId: 'portrait-staff-01',
    age: 36,
    category: 'staff',
    hireStatus: 'available',
    weeklyCost: 18,
    weeklyWage: 18,
    costEstimate: 'moderate',
    revealLevel: 2,
    expiryWeek: 6,
    evaluation: {
      ...baseEvaluation,
      overall: 66,
      overallValue: 66,
    },
    staffData: {
      specialty: 'analysis',
      efficiency: 77,
      assignmentType: 'pattern-review',
      passiveBonuses: {
        analysisQuality: 0.07,
      },
    },
    ...overrides,
  }
}
