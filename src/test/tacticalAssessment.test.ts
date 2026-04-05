import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  evaluateTacticalAssessments,
  TACTICAL_ASSESSMENT_ENGINE,
} from '../domain/tacticalAssessment'
import type { Agent, CaseInstance, DomainStats } from '../domain/models'

function makeDomainStats(overrides: Partial<DomainStats> = {}): DomainStats {
  return {
    physical: { strength: 40, endurance: 40, ...(overrides.physical ?? {}) },
    tactical: { awareness: 40, reaction: 40, ...(overrides.tactical ?? {}) },
    cognitive: { analysis: 40, investigation: 40, ...(overrides.cognitive ?? {}) },
    social: { negotiation: 40, influence: 40, ...(overrides.social ?? {}) },
    stability: { resistance: 40, tolerance: 40, ...(overrides.stability ?? {}) },
    technical: { equipment: 40, anomaly: 40, ...(overrides.technical ?? {}) },
  }
}

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    ...createStartingState().agents.a_ava,
    id: 'assessment-agent',
    name: 'Assessment Agent',
    role: 'hunter',
    baseStats: { combat: 40, investigation: 40, utility: 40, social: 40 },
    stats: makeDomainStats(),
    fatigue: 0,
    status: 'active',
    traits: [],
    abilities: [],
    ...overrides,
  }
}

function makeCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  const game = createStartingState()

  return {
    ...game.cases['case-001'],
    id: 'assessment-case',
    templateId: 'assessment-template',
    tags: [],
    requiredTags: [],
    preferredTags: [],
    assignedTeamIds: [],
    ...overrides,
  }
}

describe('tactical assessment engine', () => {
  it('flags low field output for frontline operatives', () => {
    const assessments = evaluateTacticalAssessments(
      makeAgent({
        role: 'hunter',
        stats: makeDomainStats({
          physical: { strength: 24, endurance: 22 },
          tactical: { awareness: 28, reaction: 26 },
        }),
      })
    )

    expect(assessments.map((assessment) => assessment.message)).toContain(
      'Field score is low for a frontline operative.'
    )
  })

  it('identifies high insight and poor resilience as a short-investigation profile', () => {
    const assessments = evaluateTacticalAssessments(
      makeAgent({
        role: 'investigator',
        stats: makeDomainStats({
          cognitive: { analysis: 82, investigation: 84 },
          stability: { resistance: 24, tolerance: 26 },
        }),
      })
    )

    expect(assessments.map((assessment) => assessment.message)).toContain(
      'High Insight but poor Resilience. Better suited for short investigations.'
    )
  })

  it('recognizes strong control profiles for containment work', () => {
    const assessments = evaluateTacticalAssessments(
      makeAgent({
        role: 'occultist',
        stats: makeDomainStats({
          technical: { equipment: 84, anomaly: 86 },
          tactical: { awareness: 66, reaction: 62 },
        }),
      }),
      {
        caseData: makeCase({
          tags: ['containment', 'occult'],
          durationWeeks: 2,
        }),
      }
    )

    expect(assessments.map((assessment) => assessment.message)).toContain(
      'Control profile is strong for containment tasks.'
    )
  })

  it('exposes a string-based engine interface for future tactical analysis consumers', () => {
    const agent = makeAgent({
      fatigue: 58,
    })

    const results = TACTICAL_ASSESSMENT_ENGINE.evaluate(agent, {
      caseData: makeCase({ durationWeeks: 4 }),
    })

    expect(results).toContain(
      'Current fatigue is suppressing output. Rotate before long assignments.'
    )
    expect(results.every((entry) => typeof entry === 'string')).toBe(true)
  })
})
