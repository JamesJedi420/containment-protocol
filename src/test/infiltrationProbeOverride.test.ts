import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { copyInfiltrationProbePlan } from '../domain/infiltrationProbe'
import {
  applyInfiltrationWeeklyProbeActionOverride,
  canConfigureInfiltrationWeeklyProbeOnCase,
  readInfiltrationWeeklyProbeActionOverride,
} from '../domain/infiltrationProbeOverride'
import { createStarterCase } from '../domain/templates/startingCases'
import { caseTemplateMap } from '../domain/templates/caseTemplates'

function createEligibleCase() {
  return {
    ...createStarterCase({ id: 'case-infiltration-override', templateId: 'ops-004' }),
    status: 'in_progress' as const,
    hiddenState: 'hidden' as const,
    detectionConfidence: 0.25,
    counterDetection: false,
    tags: ['infiltration', 'covert'],
    infiltrationProbePlan: copyInfiltrationProbePlan(caseTemplateMap['ops-004'].infiltrationProbePlan),
    infiltrationCoverProfile: caseTemplateMap['ops-004'].infiltrationCoverProfile,
    requiredTags: [],
    preferredTags: [],
    assignedTeamIds: [],
  }
}

describe('infiltrationProbeOverride', () => {
  it('allows override only on in-progress eligible cases', () => {
    const eligible = createEligibleCase()
    expect(canConfigureInfiltrationWeeklyProbeOnCase(eligible)).toBe(true)
    expect(
      canConfigureInfiltrationWeeklyProbeOnCase({ ...eligible, status: 'resolved' })
    ).toBe(false)
    expect(
      canConfigureInfiltrationWeeklyProbeOnCase({ ...eligible, hiddenState: undefined })
    ).toBe(false)
  })

  it('sets and clears weekly probe action override', () => {
    let state = createStartingState()
    state.cases['case-infiltration-override'] = createEligibleCase()

    const set = applyInfiltrationWeeklyProbeActionOverride(state, {
      caseId: 'case-infiltration-override',
      action: 'cleanup',
    })
    expect(set.applied).toBe(true)
    state = set.state
    expect(
      readInfiltrationWeeklyProbeActionOverride(state.cases['case-infiltration-override'])
    ).toBe('cleanup')

    const cleared = applyInfiltrationWeeklyProbeActionOverride(state, {
      caseId: 'case-infiltration-override',
      action: null,
    })
    expect(cleared.applied).toBe(true)
    expect(
      readInfiltrationWeeklyProbeActionOverride(cleared.state.cases['case-infiltration-override'])
    ).toBeUndefined()
  })
})
