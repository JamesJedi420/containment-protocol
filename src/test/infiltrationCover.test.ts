import { describe, expect, it } from 'vitest'
import { createStarterCase } from '../domain/templates/startingCases'
import {
  applyWeeklyInfiltrationCoverPostureToCase,
  copyInfiltrationCoverProfile,
  evaluateWeeklyInfiltrationCoverPosture,
} from '../domain/infiltrationCover'
import { evaluateBehaviorWeightedDisguiseValidation } from '../domain/disguiseValidation'
import {
  applyInfiltrationProbeActionToCase,
  applyWeeklyInfiltrationProbeTick,
} from '../domain/infiltrationProbe'
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

  it('copies cover profiles on seeded infiltration templates', () => {
    const templateIds = [
      'ops-001',
      'ops-004',
      'occult-006',
      'puzzle_whispering_archive',
      'psi-007',
      'followup_targeted_abductions',
    ] as const

    for (const templateId of templateIds) {
      expect(caseTemplateMap[templateId].infiltrationCoverProfile?.claimedRole).toBeTruthy()
    }
  })
})
