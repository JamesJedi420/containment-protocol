import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'

describe('advanceWeek hidden-state/counter-detection integration', () => {
  it('produces hidden, revealed, and displaced mission results in one deterministic flow', () => {
    const state = createStartingState()
    const [teamA, teamB] = Object.keys(state.teams)

    state.reports = []
    state.agency!.supportAvailable = 3

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
      currentCase.requiredTags = []
      currentCase.preferredTags = []
    }

    state.cases['case-001'].mode = 'deterministic'
    state.cases['case-001'].status = 'in_progress'
    state.cases['case-001'].assignedTeamIds = [teamA]
    state.cases['case-001'].weeksRemaining = 1
    state.cases['case-001'].hiddenState = 'hidden'
    state.cases['case-001'].counterDetection = false

    state.cases['case-002'].mode = 'deterministic'
    state.cases['case-002'].status = 'in_progress'
    state.cases['case-002'].assignedTeamIds = [teamB]
    state.cases['case-002'].weeksRemaining = 1
    state.cases['case-002'].hiddenState = 'hidden'
    state.cases['case-002'].counterDetection = true

    state.cases['case-003'].mode = 'deterministic'
    state.cases['case-003'].status = 'in_progress'
    state.cases['case-003'].assignedTeamIds = [teamA]
    state.cases['case-003'].weeksRemaining = 1
    state.cases['case-003'].hiddenState = 'displaced'
    state.cases['case-003'].counterDetection = true
    state.cases['case-003'].displacementTarget = 'safehouse-9'

    const nextState = advanceWeek(state)
    const lastReport = nextState.reports[nextState.reports.length - 1]

    const hiddenResult = lastReport.caseSnapshots?.['case-001']?.missionResult
    const revealedResult = lastReport.caseSnapshots?.['case-002']?.missionResult
    const displacedResult = lastReport.caseSnapshots?.['case-003']?.missionResult

    expect(hiddenResult).toBeDefined()
    expect(revealedResult).toBeDefined()
    expect(displacedResult).toBeDefined()

    expect(hiddenResult?.hiddenState).toBe('hidden')
    expect(revealedResult?.hiddenState).toBe('revealed')
    expect(displacedResult?.hiddenState).toBe('displaced')

    expect(hiddenResult?.counterDetection).toBe(false)
    expect(revealedResult?.counterDetection).toBe(true)
    expect(displacedResult?.counterDetection).toBe(true)

    expect(hiddenResult?.detectionConfidence).toBeLessThan(
      revealedResult?.detectionConfidence ?? 0
    )
    expect(displacedResult?.detectionConfidence).toBeGreaterThan(
      hiddenResult?.detectionConfidence ?? 1
    )
    expect(displacedResult?.detectionConfidence).toBeLessThan(
      revealedResult?.detectionConfidence ?? 0
    )
    expect(displacedResult?.displacementTarget).toBe('safehouse-9')
  })
})
