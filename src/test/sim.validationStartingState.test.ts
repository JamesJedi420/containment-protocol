import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { getContractOffers, launchContract } from '../domain/contracts'
import { getResolvedDifficultyRunConfiguration } from '../domain/campaignLedger'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  runSimulationValidationScenario,
  runSimulationValidationSuite,
} from '../domain/sim/validation'
import type { SimulationValidationTelemetryEvent } from '../domain/sim/validation'
import { analyzeSimulationValidationTelemetry } from '../domain/sim/validationTelemetry'

function launchedCampaign() {
  const initial = createStartingState()
  const offer = getContractOffers(initial)[0]
  const state = launchContract(initial, offer.id, 't_nightwatch')
  const currentCase = Object.values(state.cases).find(
    (entry) => entry.contract?.offerId === offer.id
  )
  expect(currentCase).toBeDefined()
  if (!currentCase) throw new Error('Expected launched contract case')
  return { state, offer, caseId: currentCase.id }
}

describe('supplied validation starting state (SPE-1119)', () => {
  it('continues a real launched contract through deterministic capture and analysis without mutating its caller', () => {
    const { state, offer, caseId } = launchedCampaign()
    const before = structuredClone(state)
    const capture = () => {
      const events: SimulationValidationTelemetryEvent[] = []
      const run = runSimulationValidationScenario('baseline', {
        startingState: state,
        onSnapshot: (event) => events.push(event),
      })
      return { run, events, analysis: analyzeSimulationValidationTelemetry(events, run.summary) }
    }
    const result = capture()
    expect(result.events.length).toBeGreaterThan(0)
    expect(
      result.events[0].advanceInput.committedOperations.find(
        (operation) => operation.caseId === caseId
      )?.contract
    ).toEqual({ templateId: offer.templateId, riskLevel: offer.riskLevel })
    expect(
      result.events.some((event) =>
        event.missionResults?.some((record) => record.caseId === caseId)
      )
    ).toBe(true)
    expect(result.analysis.contractGroups).toContainEqual(
      expect.objectContaining({
        templateId: offer.templateId,
        riskLevel: offer.riskLevel,
        distinctObservedCases: 1,
      })
    )
    expect(result.analysis.difficulty).toEqual(getResolvedDifficultyRunConfiguration(state))
    expect(result).toEqual(capture())
    expect(state).toEqual(before)
    result.run.initialState.funding = -999
    result.run.finalState.funding = -999
    expect(state).toEqual(before)
  })

  it('continues from the supplied canonical week rather than resetting to week one', () => {
    const { state } = launchedCampaign()
    const later = advanceWeek(state, 1_800_000_000)
    expect(later.week).toBeGreaterThan(state.week)
    const events: SimulationValidationTelemetryEvent[] = []
    const run = runSimulationValidationScenario('baseline', {
      startingState: later,
      onSnapshot: (event) => events.push(event),
    })
    expect(run.initialState.week).toBe(later.week)
    expect(events[0].advanceInput.week).toBe(later.week)
    const priorNoteIds = new Set(
      later.reports.flatMap((report) => report.notes.map((note) => note.id))
    )
    const nextReport = run.finalState.reports.find((report) => report.week === later.week)!
    expect(nextReport).toBeDefined()
    expect(nextReport.notes.some((note) => priorNoteIds.has(note.id))).toBe(false)
    expect(analyzeSimulationValidationTelemetry(events, run.summary).weeksObserved).toBe(
      events.length
    )
  })

  it('preserves omitted-option behavior and the ordinary starting campaign', () => {
    const baseline = runSimulationValidationScenario('baseline')
    expect(runSimulationValidationScenario('baseline', { startingState: undefined })).toEqual(
      baseline
    )
    expect(
      runSimulationValidationScenario('baseline', { startingState: createStartingState() })
    ).toEqual(baseline)
  })

  it(
    'snapshots suite input before an observer can change the caller for later scenarios',
    { timeout: 30_000 },
    () => {
      const { state } = launchedCampaign()
      const pristine = structuredClone(state)
      let observed = 0
      const runs = runSimulationValidationSuite({
        startingState: state,
        onSnapshot: () => {
          observed += 1
          state.funding = -999
          state.cases = {}
        },
      })
      expect(observed).toBeGreaterThan(0)
      expect(runs).toEqual(runSimulationValidationSuite({ startingState: pristine }))
    }
  )

  it.each(['terminal', 'difficulty'] as const)(
    'rejects %s supplied-state misuse before emitting observations',
    (kind) => {
      const state = createStartingState()
      if (kind === 'terminal') state.gameOver = true
      const before = structuredClone(state)
      const events: SimulationValidationTelemetryEvent[] = []
      expect(() =>
        runSimulationValidationScenario('baseline', {
          startingState: state,
          ...(kind === 'difficulty'
            ? { difficulty: { profileId: 'normal', profileVersion: '1' } }
            : {}),
          onSnapshot: (event) => events.push(event),
        })
      ).toThrow(kind === 'terminal' ? 'terminal campaigns' : 'explicit difficulty')
      expect(events).toEqual([])
      expect(state).toEqual(before)
    }
  )
})
