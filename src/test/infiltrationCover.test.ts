import { describe, expect, it } from 'vitest'
import { createStarterCase } from '../domain/templates/startingCases'
import {
  applyWeeklyInfiltrationCoverPostureToCase,
  copyInfiltrationCoverProfile,
  evaluateCoverRoleMismatchPressure,
  evaluateWeeklyInfiltrationCoverPosture,
} from '../domain/infiltrationCover'
import { evaluateBehaviorWeightedDisguiseValidation } from '../domain/disguiseValidation'
import {
  applyInfiltrationProbeActionToCase,
  applyWeeklyInfiltrationProbeTick,
} from '../domain/infiltrationProbe'
import type { Agent, CaseInstance } from '../domain/models'
import { caseTemplateMap, caseTemplates } from '../domain/templates/caseTemplates'

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

  it('joins all strain reasons when crossing the cover strain band', () => {
    const posture = evaluateWeeklyInfiltrationCoverPosture(
      createCoverCase({
        tags: ['infiltration', 'covert', 'media', 'public', 'witness', 'interview'],
        infiltrationAwareness: 0.28,
        infiltrationCoverProfile: {
          claimedRole: 'uniform_guard',
          documentTier: 0,
          doctrineBand: 0.2,
        },
      })
    )

    const coverStrain = posture.events.find((event) => event.kind === 'cover_strain')
    expect(coverStrain?.summary).toContain('claimed uniform_guard clashes with site context')
    expect(coverStrain?.summary).toContain('paperwork cannot survive authority scrutiny')
    expect(coverStrain?.summary).toContain('cover doctrine slips under procedural questioning')
  })

  it('applies posture after weekly probe tick', () => {
    const weekly = applyWeeklyInfiltrationProbeTick(createCoverCase(), 3)

    expect(weekly.changed).toBe(true)
    expect(weekly.case.infiltrationAwareness).toBeGreaterThan(0.3)
    expect(weekly.events.some((event) => event.kind === 'cover_strain')).toBe(true)
  })

  it('scores uniform_guard against media/public as role mismatch pressure', () => {
    const mismatch = evaluateCoverRoleMismatchPressure(
      createCoverCase(),
      'uniform_guard'
    )

    expect(mismatch.hasRoleMismatch).toBe(true)
    expect(mismatch.pressure).toBe(0.5)
  })

  it('does not double-count route violations already implied by role mismatch', () => {
    const mismatch = evaluateCoverRoleMismatchPressure(
      createCoverCase({
        infiltrationCoverProfile: {
          claimedRole: 'uniform_guard',
          routeViolationTags: ['media', 'public'],
        },
      }),
      'uniform_guard'
    )

    expect(mismatch.hasRoleMismatch).toBe(true)
    expect(mismatch.hasExtraRouteViolation).toBe(false)
    expect(mismatch.pressure).toBe(0.5)
  })

  it('adds route-violation pressure only for tags outside role incompatibility', () => {
    const mismatch = evaluateCoverRoleMismatchPressure(
      createCoverCase({
        tags: ['infiltration', 'covert', 'media', 'public', 'witness'],
        infiltrationCoverProfile: {
          claimedRole: 'uniform_guard',
          routeViolationTags: ['witness'],
        },
      }),
      'uniform_guard'
    )

    expect(mismatch.hasRoleMismatch).toBe(true)
    expect(mismatch.hasExtraRouteViolation).toBe(true)
    expect(mismatch.pressure).toBe(0.75)
  })

  it('ignores profile route violations when coverRole override disagrees with profile', () => {
    const caseData = createCoverCase({
      tags: ['infiltration', 'covert', 'witness'],
      requiredTags: [],
      preferredTags: [],
      infiltrationCoverProfile: {
        claimedRole: 'maintenance',
        routeViolationTags: ['witness'],
      },
    })

    expect(evaluateCoverRoleMismatchPressure(caseData, 'maintenance').hasExtraRouteViolation).toBe(
      true
    )
    expect(evaluateCoverRoleMismatchPressure(caseData, 'courier').hasExtraRouteViolation).toBe(
      false
    )
  })

  it('returns zero pressure when cover role fits site tags', () => {
    const mismatch = evaluateCoverRoleMismatchPressure(
      createCoverCase({
        tags: ['infiltration', 'covert', 'containment'],
        requiredTags: [],
        preferredTags: [],
        infiltrationCoverProfile: {
          claimedRole: 'civilian_staff',
        },
      }),
      'civilian_staff'
    )

    expect(mismatch).toEqual({
      pressure: 0,
      hasRoleMismatch: false,
      hasExtraRouteViolation: false,
    })
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
    expect(validation.evidenceSignals).toContain('cover role mismatch')
  })

  it('skips posture when case is not infiltration-eligible', () => {
    const result = applyWeeklyInfiltrationCoverPostureToCase(
      createCoverCase({ hiddenState: undefined })
    )

    expect(result.changed).toBe(false)
    expect(result.events).toEqual([])
  })

  it('does not double-count route violations already covered by role mismatch', () => {
    const posture = evaluateWeeklyInfiltrationCoverPosture(
      createCoverCase({
        infiltrationCoverProfile: {
          claimedRole: 'uniform_guard',
          routeViolationTags: ['media', 'public'],
        },
      })
    )

    expect(posture.awarenessDelta).toBe(0.08)
  })

  it('applies no posture pressure when awareness is already capped', () => {
    const posture = evaluateWeeklyInfiltrationCoverPosture(
      createCoverCase({
        infiltrationAwareness: 1,
        infiltrationStage: 'violent',
      })
    )

    expect(posture.awarenessDelta).toBe(0)
    expect(posture.events).toEqual([])
  })

  it('runs cover posture only on the weekly tick, not a single probe action', () => {
    const baseline = createCoverCase({ infiltrationAwareness: 0.3 })
    const actionOnly = applyInfiltrationProbeActionToCase(baseline, 'probe_access')
    const weekly = applyWeeklyInfiltrationProbeTick(baseline, 3)

    expect(actionOnly.case.infiltrationAwareness).toBeLessThan(
      weekly.case.infiltrationAwareness ?? 0
    )
    expect(weekly.events.some((event) => event.kind === 'cover_strain')).toBe(true)
  })

  it('requires a cover profile on every template with a probe plan', () => {
    const missingCover = caseTemplates
      .filter((template) => template.infiltrationProbePlan && !template.infiltrationCoverProfile)
      .map((template) => template.templateId)

    expect(missingCover).toEqual([])
  })

  it('copies cover profiles on all probe-plan templates', () => {
    const templateIds = caseTemplates
      .filter((template) => template.infiltrationProbePlan)
      .map((template) => template.templateId)

    expect(templateIds.length).toBeGreaterThanOrEqual(21)

    for (const templateId of templateIds) {
      expect(caseTemplateMap[templateId].infiltrationCoverProfile?.claimedRole).toBeTruthy()
    }
  })
})
