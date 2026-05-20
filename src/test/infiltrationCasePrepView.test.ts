import { describe, expect, it } from 'vitest'
import { copyInfiltrationProbePlan } from '../domain/infiltrationProbe'
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
})
