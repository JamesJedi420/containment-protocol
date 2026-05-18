import { describe, expect, it } from 'vitest'
import { caseTemplateMap } from '../data/caseTemplates'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { instantiateFromTemplate } from '../domain/sim/spawn'
import { createStarterCase } from '../domain/templates/startingCases'

describe('advanceWeek infiltration probe integration', () => {
  it('ticks probe tracks under cover and emits awareness complication events', () => {
    const state = createStartingState()
    const [teamId] = Object.keys(state.teams)

    state.reports = []
    state.agency!.supportAvailable = 3
    state.globalFlags = { 'conceal.case.case-001': true }

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
      currentCase.requiredTags = []
      currentCase.preferredTags = []
      currentCase.hiddenState = undefined
      currentCase.infiltrationProbeProgress = undefined
      currentCase.infiltrationAwareness = undefined
      currentCase.infiltrationStage = undefined
    }

    const covertCase = state.cases['case-001']
    covertCase.mode = 'deterministic'
    covertCase.status = 'in_progress'
    covertCase.assignedTeamIds = [teamId]
    covertCase.weeksRemaining = 3
    covertCase.tags = ['infiltration', 'public']
    covertCase.infiltrationAwareness = 0.48

    const nextState = advanceWeek(state)
    const updatedCase = nextState.cases['case-001']

    expect(updatedCase.hiddenState).toBe('hidden')
    expect(updatedCase.infiltrationProbeProgress).toBeGreaterThan(0)
    expect(updatedCase.infiltrationAwareness).toBeGreaterThan(0.48)
    expect(updatedCase.infiltrationStage).toBe('exposed')
    expect(updatedCase.detectionConfidence).toBeGreaterThanOrEqual(0.55)
  })

  it('uses authored cleanup when awareness crosses the plan threshold', () => {
    const state = createStartingState()
    const [teamId] = Object.keys(state.teams)

    state.reports = []
    state.agency!.supportAvailable = 3
    state.globalFlags = { 'conceal.case.case-ops-004': true }

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
    }

    const covertCase = createStarterCase({
      id: 'case-ops-004',
      templateId: 'ops-004',
      status: 'in_progress',
      assignedTeamIds: [teamId],
    })
    covertCase.mode = 'deterministic'
    covertCase.weeksRemaining = 2
    covertCase.infiltrationAwareness = 0.56
    covertCase.infiltrationProbeProgress = 0.25

    state.cases['case-ops-004'] = covertCase

    const nextState = advanceWeek(state)
    const updatedCase = nextState.cases['case-ops-004']

    expect(updatedCase.hiddenState).toBe('hidden')
    expect(updatedCase.infiltrationAwareness).toBeLessThan(0.56)
    expect(updatedCase.infiltrationProbeProgress).toBeGreaterThan(0.25)
  })

  it('uses authored probe_route default for relay templates at high progress', () => {
    const state = createStartingState()
    const [teamId] = Object.keys(state.teams)

    state.reports = []
    state.agency!.supportAvailable = 3
    state.globalFlags = { 'conceal.case.case-ops-001': true }

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
    }

    const relayCase = instantiateFromTemplate(
      caseTemplateMap['ops-001'],
      () => 0.25,
      new Set(Object.keys(state.cases))
    )
    relayCase.id = 'case-ops-001'
    relayCase.tags = [...relayCase.tags, 'infiltration']
    relayCase.status = 'in_progress'
    relayCase.assignedTeamIds = [teamId]
    relayCase.weeksRemaining = 2
    relayCase.mode = 'deterministic'
    relayCase.infiltrationProbeProgress = 0.6
    relayCase.infiltrationAwareness = 0.2

    state.cases['case-ops-001'] = relayCase

    const nextState = advanceWeek(state)
    const updatedCase = nextState.cases['case-ops-001']

    expect(updatedCase.infiltrationProbeProgress).toBeCloseTo(0.7, 3)
    expect(updatedCase.infiltrationAwareness).toBeCloseTo(0.38, 3)
  })
})
