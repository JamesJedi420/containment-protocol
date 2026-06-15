import { describe, expect, it } from 'vitest'
import { copyInfiltrationProbePlan } from '../domain/infiltrationProbe'
import {
  INFILTRATION_COVER_ROLE_OBSERVER_FRICTION,
  INFILTRATION_PROBE_ENCOUNTER_DETAILS,
  INFILTRATION_STAGE_OBSERVER_CLAUSES,
} from '../domain/infiltrationEncounterReportNotes'
import {
  buildInfiltrationCasePrepView,
  canShowInfiltrationCasePrepOnCase,
} from '../features/cases/infiltrationCasePrepView'
import { createStarterCase } from '../domain/templates/startingCases'
import { caseTemplateMap } from '../domain/templates/caseTemplates'

function createEligibleCase() {
  return {
    ...createStarterCase({ id: 'case-infiltration-prep', templateId: 'ops-004' }),
    status: 'in_progress' as const,
    hiddenState: 'hidden' as const,
    infiltrationProbeProgress: 0.35,
    infiltrationAwareness: 0.42,
    infiltrationStage: 'probing' as const,
    tags: ['infiltration', 'media', 'public'],
    infiltrationProbePlan: copyInfiltrationProbePlan(caseTemplateMap['ops-004'].infiltrationProbePlan),
    infiltrationCoverProfile: caseTemplateMap['ops-004'].infiltrationCoverProfile,
    infiltrationWeeklyProbeActionOverride: 'probe_route' as const,
    requiredTags: [],
    preferredTags: [],
  }
}

describe('infiltrationCasePrepView', () => {
  it('is visible only for in-progress eligible infiltration cases', () => {
    const eligible = createEligibleCase()
    expect(canShowInfiltrationCasePrepOnCase(eligible)).toBe(true)
    expect(canShowInfiltrationCasePrepOnCase({ ...eligible, status: 'open' })).toBe(false)

    const hidden = buildInfiltrationCasePrepView({ ...eligible, hiddenState: undefined })
    expect(hidden.visible).toBe(false)
  })

  it('summarizes tracks, cover posture, and effective weekly action', () => {
    const view = buildInfiltrationCasePrepView(createEligibleCase())

    expect(view.visible).toBe(true)
    expect(view.probeProgressPercent).toBe(35)
    expect(view.awarenessPercent).toBe(42)
    expect(view.stageLabel).toBe('Probing')
    expect(view.coverRoleLabel).toBe('Uniform guard')
    expect(view.usingOverride).toBe(true)
    expect(view.effectiveAction).toBe('probe_route')
    expect(view.plannedAction).toBe('probe_access')
    expect(view.coverStrainNotes.length).toBeGreaterThan(0)
    expect(view.hasCoverStrain).toBe(true)
  })

  it('surfaces encounter preview notes from report copy constants', () => {
    const view = buildInfiltrationCasePrepView(createEligibleCase())

    expect(view.encounterPreviewNotes).toContain(
      INFILTRATION_PROBE_ENCOUNTER_DETAILS.probe_route
    )
    expect(view.encounterPreviewNotes).toContain(
      INFILTRATION_COVER_ROLE_OBSERVER_FRICTION.uniform_guard
    )
    expect(view.encounterPreviewNotes).not.toContain(
      INFILTRATION_STAGE_OBSERVER_CLAUSES.exposed
    )
  })

  it('includes stage observer pressure when infiltration stage is exposed', () => {
    const view = buildInfiltrationCasePrepView({
      ...createEligibleCase(),
      infiltrationStage: 'exposed',
    })

    expect(view.encounterPreviewNotes).toContain(INFILTRATION_STAGE_OBSERVER_CLAUSES.exposed)
  })

  it('surfaces encounter-state cover projection and stance options', () => {
    const view = buildInfiltrationCasePrepView(createEligibleCase())

    expect(view.encounterStateCoverVisible).toBe(true)
    expect(view.encounterCoverBand).toBe('strained')
    expect(view.encounterCoverBandLabel).toBe('Strained cover')
    expect(view.encounterCoverFactorLabels.length).toBeGreaterThan(0)
    expect(view.encounterCoverStanceOptions).toHaveLength(3)
    expect(view.encounterCoverUsingStanceOverride).toBe(false)
  })

  it('reflects persisted cover stance override in prep view', () => {
    const view = buildInfiltrationCasePrepView({
      ...createEligibleCase(),
      infiltrationEncounterCoverStance: 'low_profile',
    })

    expect(view.encounterCoverStance).toBe('low_profile')
    expect(view.encounterCoverUsingStanceOverride).toBe(true)
    expect(view.encounterCoverStanceOptions.find((option) => option.id === 'low_profile')?.selected).toBe(
      true
    )
  })

  it('surfaces guides and documents projection from cover profile', () => {
    const view = buildInfiltrationCasePrepView(createEligibleCase())

    expect(view.guidesDocumentsVisible).toBe(true)
    expect(view.guidesDocumentsDocumentTierLabel).toBe('Plausible cover credentials')
    expect(view.guidesDocumentsDoctrineGuideLabel).toBe('Cover guide fluent for scripted checks')
    expect(view.guidesDocumentsDoctrineBandPercent).toBe(40)
    expect(view.guidesDocumentsScrutinyLabels).toContain('Authority scrutiny active on site')
  })

  it('hides guides and documents when case is ineligible', () => {
    const view = buildInfiltrationCasePrepView({
      ...createEligibleCase(),
      status: 'resolved',
    })

    expect(view.guidesDocumentsVisible).toBe(false)
    expect(view.guidesDocumentsScrutinyLabels).toEqual([])
  })
})
