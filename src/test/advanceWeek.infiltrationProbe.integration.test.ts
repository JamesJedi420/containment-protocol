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

  it('emits cover strain when media briefing cover clashes with guard role', () => {
    const state = createStartingState()
    const [teamId] = Object.keys(state.teams)

    state.reports = []
    state.agency!.supportAvailable = 3
    state.globalFlags = { 'conceal.case.case-ops-004-cover': true }

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
    }

    const covertCase = createStarterCase({
      id: 'case-ops-004-cover',
      templateId: 'ops-004',
      status: 'in_progress',
      assignedTeamIds: [teamId],
    })
    covertCase.mode = 'deterministic'
    covertCase.weeksRemaining = 2
    covertCase.infiltrationAwareness = 0.3
    covertCase.infiltrationProbeProgress = 0.2

    state.cases['case-ops-004-cover'] = covertCase

    const nextState = advanceWeek(state)
    const updatedCase = nextState.cases['case-ops-004-cover']
    const lastReport = nextState.reports[nextState.reports.length - 1]

    expect(updatedCase.hiddenState).toBe('hidden')
    expect(updatedCase.infiltrationAwareness).toBeGreaterThan(0.42)
    expect(lastReport.notes.some((note) => note.type === 'infiltration.cover_strain')).toBe(true)
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

  it('ticks probe progress for batch-4 ops-005 after authored concealment activation', () => {
    const state = createStartingState()
    const [teamId] = Object.keys(state.teams)

    state.reports = []
    state.agency!.supportAvailable = 3
    state.globalFlags = {}

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
    }

    const chamberCase = instantiateFromTemplate(
      caseTemplateMap['ops-005'],
      () => 0.42,
      new Set(Object.keys(state.cases))
    )
    chamberCase.id = 'case-ops-005'
    chamberCase.tags = [...chamberCase.tags, 'infiltration', 'covert']
    chamberCase.status = 'in_progress'
    chamberCase.assignedTeamIds = [teamId]
    chamberCase.weeksRemaining = 2
    chamberCase.mode = 'probability'
    chamberCase.infiltrationProbeProgress = 0.15
    chamberCase.infiltrationAwareness = 0.2

    state.cases['case-ops-005'] = chamberCase

    const nextState = advanceWeek(state)
    const updatedCase = nextState.cases['case-ops-005']

    expect(updatedCase.hiddenState).toBe('hidden')
    expect(updatedCase.infiltrationProbeProgress).toBeGreaterThan(0.15)
    expect(updatedCase.infiltrationCoverProfile?.claimedRole).toBe('maintenance')
    expect(updatedCase.stealthLeaveBehindId).toBe('leave-behind:risk-discovery')
  })

  it('ticks probe progress for batch-4 psi-004 after authored concealment activation', () => {
    const state = createStartingState()
    const [teamId] = Object.keys(state.teams)

    state.reports = []
    state.agency!.supportAvailable = 3
    state.globalFlags = {}

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
    }

    const stationCase = instantiateFromTemplate(
      caseTemplateMap['psi-004'],
      () => 0.42,
      new Set(Object.keys(state.cases))
    )
    stationCase.id = 'case-psi-004'
    stationCase.tags = [...stationCase.tags, 'infiltration', 'covert']
    stationCase.status = 'in_progress'
    stationCase.assignedTeamIds = [teamId]
    stationCase.weeksRemaining = 2
    stationCase.mode = 'probability'
    stationCase.infiltrationProbeProgress = 0.1
    stationCase.infiltrationAwareness = 0.18

    state.cases['case-psi-004'] = stationCase

    const nextState = advanceWeek(state)
    const updatedCase = nextState.cases['case-psi-004']

    expect(updatedCase.hiddenState).toBe('hidden')
    expect(updatedCase.infiltrationProbeProgress).toBeGreaterThan(0.1)
    expect(updatedCase.infiltrationCoverProfile?.claimedRole).toBe('civilian_staff')
    expect(updatedCase.stealthLeaveBehindId).toBe('leave-behind:risk-discovery')
  })
})
