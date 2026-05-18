import { describe, expect, it } from 'vitest'
import { createStarterCase } from '../domain/templates/startingCases'
import {
  applyWeeklyInfiltrationCoverPostureToCase,
  copyInfiltrationCoverProfile,
  evaluateWeeklyInfiltrationCoverPosture,
} from '../domain/infiltrationCover'
import { evaluateBehaviorWeightedDisguiseValidation } from '../domain/disguiseValidation'
import { applyWeeklyInfiltrationProbeTick } from '../domain/infiltrationProbe'
import type { Agent, CaseInstance } from '../domain/models'
import { caseTemplateMap } from '../domain/templates/caseTemplates'

function createCoverCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({
      id: 'case-cover',
      templateId: 'ops-004',
    }),
    mode: 'threshold',
    hiddenState: 'hidden',
    tags: ['infiltration', 'covert', 'media', 'public'],
    infiltrationCoverProfile: copyInfiltrationCoverProfile(
      caseTemplateMap['ops-004'].infiltrationCoverProfile
    ),
    infiltrationAwareness: 0.3,
    infiltrationProbeProgress: 0.2,
    infiltrationStage: 'probing',
    assignedTeamIds: [],
    ...overrides,
  }
}

describe('infiltrationCover', () => {
  it('adds awareness when claimed role clashes with site tags', () => {
    const posture = evaluateWeeklyInfiltrationCoverPosture(createCoverCase())

    expect(posture.awarenessDelta).toBeGreaterThan(0)
    expect(posture.events.some((event) => event.kind === 'cover_strain')).toBe(true)
  })

  it('applies posture after weekly probe tick', () => {
    const weekly = applyWeeklyInfiltrationProbeTick(createCoverCase(), 3)

    expect(weekly.changed).toBe(true)
    expect(weekly.case.infiltrationAwareness).toBeGreaterThan(0.3)
    expect(weekly.events.some((event) => event.kind === 'cover_strain')).toBe(true)
  })

  it('raises disguise pressure when authority scrutiny meets weak documents', () => {
    const observer: Agent = {
      id: 'a_cover_reader',
      name: 'a_cover_reader',
      role: 'liaison',
      baseStats: { combat: 10, investigation: 50, utility: 40, social: 58 },
      tags: ['medium', 'liaison'],
      relationships: {},
      fatigue: 0,
      status: 'active',
    }

    const validation = evaluateBehaviorWeightedDisguiseValidation(createCoverCase(), [observer])

    expect(validation.active).toBe(true)
    expect(validation.level).toBe('strong')
  })

  it('skips posture when case is not infiltration-eligible', () => {
    const result = applyWeeklyInfiltrationCoverPostureToCase(
      createCoverCase({ hiddenState: undefined })
    )

    expect(result.changed).toBe(false)
    expect(result.events).toEqual([])
  })
})
