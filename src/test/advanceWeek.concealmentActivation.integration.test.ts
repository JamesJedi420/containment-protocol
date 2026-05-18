import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'

describe('advanceWeek concealment activation integration', () => {
  it('activates hidden mission results from global conceal flags without manual hiddenState', () => {
    const state = createStartingState()
    const [teamA, teamB] = Object.keys(state.teams)

    state.reports = []
    state.agency!.supportAvailable = 3
    state.globalFlags = {
      'conceal.case.case-001': true,
      'conceal.case.case-002': true,
      'conceal.displace.case-003': 'safehouse-9',
    }

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
      currentCase.requiredTags = []
      currentCase.preferredTags = []
      currentCase.hiddenState = undefined
      currentCase.counterDetection = undefined
      currentCase.detectionConfidence = undefined
      currentCase.displacementTarget = undefined
    }

    state.cases['case-001'].mode = 'deterministic'
    state.cases['case-001'].status = 'in_progress'
    state.cases['case-001'].assignedTeamIds = [teamA]
    state.cases['case-001'].weeksRemaining = 1

    state.cases['case-002'].mode = 'deterministic'
    state.cases['case-002'].status = 'in_progress'
    state.cases['case-002'].assignedTeamIds = [teamB]
    state.cases['case-002'].weeksRemaining = 1
    state.cases['case-002'].counterDetection = true

    state.cases['case-003'].mode = 'deterministic'
    state.cases['case-003'].status = 'in_progress'
    state.cases['case-003'].assignedTeamIds = [teamA]
    state.cases['case-003'].weeksRemaining = 1
    state.cases['case-003'].counterDetection = true

    const nextState = advanceWeek(state)
    const lastReport = nextState.reports[nextState.reports.length - 1]

    const hiddenResult = lastReport.caseSnapshots?.['case-001']?.missionResult
    const revealedResult = lastReport.caseSnapshots?.['case-002']?.missionResult
    const displacedResult = lastReport.caseSnapshots?.['case-003']?.missionResult

    expect(hiddenResult?.hiddenState).toBe('hidden')
    expect(revealedResult?.hiddenState).toBe('revealed')
    expect(displacedResult?.hiddenState).toBe('displaced')
    expect(displacedResult?.displacementTarget).toBe('safehouse-9')
  })

  it('activates hidden presence from authored concealment triggers during advanceWeek', () => {
    const state = createStartingState()
    const [teamA] = Object.keys(state.teams)

    state.reports = []
    state.globalFlags = { 'mission.covert-ready': true }

    const authoredCase = state.cases['case-001']
    authoredCase.status = 'open'
    authoredCase.assignedTeamIds = []
    authoredCase.requiredTags = []
    authoredCase.preferredTags = []
    authoredCase.hiddenState = undefined
    authoredCase.counterDetection = undefined
    authoredCase.detectionConfidence = undefined
    authoredCase.displacementTarget = undefined
    authoredCase.tags = ['field']
    authoredCase.concealmentTriggers = [
      {
        id: 'trigger:weekly-cover',
        mode: 'hidden',
        when: { globalFlag: 'mission.covert-ready', anyTag: ['field'] },
      },
    ]

    authoredCase.mode = 'deterministic'
    authoredCase.status = 'in_progress'
    authoredCase.assignedTeamIds = [teamA]
    authoredCase.weeksRemaining = 1

    const nextState = advanceWeek(state)
    const lastReport = nextState.reports[nextState.reports.length - 1]
    const missionResult = lastReport.caseSnapshots?.['case-001']?.missionResult

    expect(missionResult?.hiddenState).toBe('hidden')
    expect(nextState.cases['case-001'].hiddenState).toBe('hidden')
  })
})
