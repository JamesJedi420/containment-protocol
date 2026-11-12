import { describe, expect, it } from 'vitest'
import { copyInfiltrationCoverProfile } from '../domain/infiltrationCover'
import {
  applyInfiltrationEncounterCoverStanceToCoverPostureDelta,
  applyInfiltrationEncounterCoverStanceToProbeDeltas,
  readInfiltrationEncounterCoverStanceForTick,
  stripInfiltrationEncounterCoverStanceOnResolvedCase,
} from '../domain/infiltrationEncounterCoverStanceTick'
import {
  applyInfiltrationProbeActionToCase,
  applyWeeklyInfiltrationProbeTick,
} from '../domain/infiltrationProbe'
import { evaluateWeeklyInfiltrationCoverPosture } from '../domain/infiltrationCover'
import { createStarterCase } from '../domain/templates/startingCases'
import type { CaseInstance } from '../domain/models'
import { caseTemplateMap } from '../domain/templates/caseTemplates'

function createCoverCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({
      id: 'case-cover-stance-tick',
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

describe('infiltrationEncounterCoverStanceTick', () => {
  it('reads maintain when stance is unset', () => {
    expect(readInfiltrationEncounterCoverStanceForTick(createCoverCase())).toBe('maintain')
  })

  it('applies no probe nudge for maintain stance', () => {
    const adjusted = applyInfiltrationEncounterCoverStanceToProbeDeltas(
      'probe_access',
      { probeProgress: 0.15, awareness: 0.12 },
      'maintain'
    )

    expect(adjusted).toEqual({ probeProgress: 0.15, awareness: 0.12 })
  })

  it('trims positive probe deltas for low_profile on high-visibility actions', () => {
    const adjusted = applyInfiltrationEncounterCoverStanceToProbeDeltas(
      'probe_route',
      { probeProgress: 0.1, awareness: 0.18 },
      'low_profile'
    )

    expect(adjusted).toEqual({ probeProgress: 0.07, awareness: 0.14 })
  })

  it('does not stack low_profile with cleanup exposure reduction', () => {
    const adjusted = applyInfiltrationEncounterCoverStanceToProbeDeltas(
      'cleanup',
      { probeProgress: 0.02, awareness: -0.15 },
      'low_profile'
    )

    expect(adjusted).toEqual({ probeProgress: 0.02, awareness: -0.15 })
  })

  it('trims cover posture delta for reinforce stance', () => {
    expect(applyInfiltrationEncounterCoverStanceToCoverPostureDelta(0.08, 'reinforce')).toBe(0.06)
    expect(applyInfiltrationEncounterCoverStanceToCoverPostureDelta(0, 'reinforce')).toBe(0)
    expect(applyInfiltrationEncounterCoverStanceToCoverPostureDelta(0.08, 'maintain')).toBe(0.08)
  })

  it('low_profile weekly tick lowers probe awareness versus maintain', () => {
    const baseline = createCoverCase({
      infiltrationProbePlan: undefined,
      infiltrationAwareness: 0.2,
      infiltrationProbeProgress: 0.1,
    })
    const maintain = applyWeeklyInfiltrationProbeTick(baseline, 2)
    const lowProfile = applyWeeklyInfiltrationProbeTick(
      { ...baseline, infiltrationEncounterCoverStance: 'low_profile' },
      2
    )

    expect(lowProfile.case.infiltrationAwareness).toBeLessThan(
      maintain.case.infiltrationAwareness ?? 1
    )
  })

  it('reinforce weekly tick lowers cover posture pressure versus maintain', () => {
    const baseline = createCoverCase()
    const maintainPosture = evaluateWeeklyInfiltrationCoverPosture(baseline)
    const reinforcePosture = evaluateWeeklyInfiltrationCoverPosture({
      ...baseline,
      infiltrationEncounterCoverStance: 'reinforce',
    })

    expect(reinforcePosture.awarenessDelta).toBeLessThan(maintainPosture.awarenessDelta)
    expect(reinforcePosture.awarenessDelta).toBe(0.06)
  })

  it('does not apply stance nudge on single probe action without weekly tick flag', () => {
    const baseline = createCoverCase({
      infiltrationAwareness: 0.2,
      infiltrationProbeProgress: 0.1,
    })
    const withoutStance = applyInfiltrationProbeActionToCase(baseline, 'probe_access')
    const withStanceField = applyInfiltrationProbeActionToCase(
      { ...baseline, infiltrationEncounterCoverStance: 'low_profile' },
      'probe_access'
    )

    expect(withStanceField.case.infiltrationAwareness).toBe(withoutStance.case.infiltrationAwareness)
  })

  it('still honors probe override while applying low_profile mitigation on weekly tick', () => {
    const baseline = createCoverCase({
      infiltrationAwareness: 0.2,
      infiltrationProbeProgress: 0.1,
      infiltrationWeeklyProbeActionOverride: 'probe_route',
    })
    const overrideOnly = applyWeeklyInfiltrationProbeTick(baseline, 2)
    const overrideWithLowProfile = applyWeeklyInfiltrationProbeTick(
      { ...baseline, infiltrationEncounterCoverStance: 'low_profile' },
      2
    )

    expect(overrideWithLowProfile.case.infiltrationAwareness).toBeLessThan(
      overrideOnly.case.infiltrationAwareness ?? 1
    )
  })

  it('strips persisted stance when case resolves', () => {
    const stripped = stripInfiltrationEncounterCoverStanceOnResolvedCase({
      ...createCoverCase(),
      status: 'resolved',
      infiltrationEncounterCoverStance: 'reinforce',
    })

    expect(stripped.infiltrationEncounterCoverStance).toBeUndefined()
  })
})
