// cspell:words cand fieldcraft voss
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { type Candidate } from '../domain/models'
import { filterCandidates } from '../domain/sim/candidateFilter'
import { hireCandidate } from '../domain/sim/hire'

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

describe('recruitment hiring and filtering', () => {
  it('hires an agent candidate into active reserve roster and removes candidate', () => {
    const state = createStartingState()
    const agentCandidate: Candidate = {
      id: 'cand-agent-001',
      name: 'Riley Voss',
      portraitId: 'portrait-agent-1',
      age: 29,
      category: 'agent',
      hireStatus: 'candidate',
      weeklyWage: 24,
      revealLevel: 2,
      expiryWeek: 6,
      evaluation: baseEvaluation,
      agentData: {
        role: 'support',
        specialization: 'medical-support',
        stats: {
          combat: 45,
          investigation: 50,
          utility: 72,
          social: 58,
        },
        traits: ['rapid-triage', 'fieldcraft'],
      },
    }

    state.candidates = [agentCandidate]

    const next = hireCandidate(state, agentCandidate.id)

    expect(next.candidates).toHaveLength(0)
    expect(next.agents[agentCandidate.id]).toMatchObject({
      id: agentCandidate.id,
      name: agentCandidate.name,
      role: 'medic',
      baseStats: agentCandidate.agentData?.stats,
      status: 'active',
      fatigue: 0,
    })
    expect(next.events.at(-1)).toMatchObject({
      type: 'agent.hired',
      sourceSystem: 'agent',
      payload: {
        week: state.week,
        candidateId: agentCandidate.id,
        agentId: agentCandidate.id,
        agentName: agentCandidate.name,
        recruitCategory: 'agent',
      },
    })
  })

  it('hires a staff candidate into staff roster and removes candidate', () => {
    const state = createStartingState()
    const staffCandidate: Candidate = {
      id: 'cand-staff-001',
      name: 'Morgan Hale',
      portraitId: 'portrait-staff-4',
      age: 34,
      category: 'staff',
      hireStatus: 'candidate',
      weeklyWage: 20,
      revealLevel: 1,
      expiryWeek: 7,
      evaluation: {
        ...baseEvaluation,
        overallVisible: false,
        overallValue: undefined,
      },
      staffData: {
        specialty: 'intelligence',
        assignmentType: 'signal-triage',
        passiveBonuses: { intelYield: 0.08 },
      },
    }

    state.candidates = [staffCandidate]

    const next = hireCandidate(state, staffCandidate.id)

    expect(next.candidates).toHaveLength(0)
    expect(next.staff[staffCandidate.id]).toEqual({
      ...staffCandidate.staffData,
      specialty: 'intel',
    })
    expect(next.events.at(-1)).toMatchObject({
      type: 'agent.hired',
      sourceSystem: 'agent',
      payload: {
        week: state.week,
        candidateId: staffCandidate.id,
        agentId: staffCandidate.id,
        agentName: staffCandidate.name,
        recruitCategory: 'staff',
      },
    })
  })

  it('filters candidates by category, role, max age, and visible overall threshold', () => {
    const candidates: Candidate[] = [
      {
        id: 'cand-a',
        name: 'A',
        portraitId: 'p-1',
        age: 26,
        category: 'agent',
        hireStatus: 'candidate',
        weeklyWage: 22,
        revealLevel: 2,
        expiryWeek: 5,
        evaluation: {
          ...baseEvaluation,
          overallVisible: true,
          overallValue: 80,
        },
        agentData: {
          role: 'combat',
          specialization: 'breach-entry',
          stats: { combat: 82, investigation: 40, utility: 48, social: 35 },
          traits: ['steady-aim'],
        },
      },
      {
        id: 'cand-b',
        name: 'B',
        portraitId: 'p-2',
        age: 30,
        category: 'agent',
        hireStatus: 'candidate',
        weeklyWage: 24,
        revealLevel: 1,
        expiryWeek: 5,
        evaluation: {
          ...baseEvaluation,
          overallVisible: false,
          overallValue: undefined,
        },
        agentData: {
          role: 'combat',
          specialization: 'containment-response',
          stats: { combat: 78, investigation: 39, utility: 41, social: 34 },
          traits: ['calculated-risk'],
        },
      },
      {
        id: 'cand-c',
        name: 'C',
        portraitId: 'p-3',
        age: 41,
        category: 'staff',
        hireStatus: 'candidate',
        weeklyWage: 18,
        revealLevel: 2,
        expiryWeek: 5,
        evaluation: {
          ...baseEvaluation,
          overallVisible: true,
          overallValue: 68,
        },
        staffData: {
          specialty: 'analysis',
          assignmentType: 'pattern-review',
          passiveBonuses: { analysisQuality: 0.05 },
        },
      },
    ]

    const filtered = filterCandidates(candidates, {
      category: 'agent',
      role: 'combat',
      maxAge: 28,
      minOverall: 70,
    })

    expect(filtered.map((candidate) => candidate.id)).toEqual(['cand-a'])
  })
})
