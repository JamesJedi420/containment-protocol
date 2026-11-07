import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  applyContradictionEvent,
  applyCorroborationEvent,
  createInformationIntakeReport,
  FORMAL_ALERT_PARTIAL_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
} from '../domain/informationIntakeReport'
import {
  captureSimulationValidationInformationReports,
  runSimulationValidationScenario,
} from '../domain/sim/validation'
import type { SimulationValidationTelemetryEvent } from '../domain/sim/validation'
import { analyzeSimulationValidationTelemetry } from '../domain/sim/validationTelemetry'

describe('internal information-report telemetry (SPE-1119)', () => {
  it('preserves distinct technical and witness provenance without reconciling their claims', () => {
    const state = createStartingState()
    const makeReport = (id: string, initialSourceClass: 'technical_trace' | 'field_witness') =>
      createInformationIntakeReport({
        id,
        label: 'Constructed mixed-source fixture',
        topicRef: 'topic:shared-fixture',
        initialSourceClass,
        credibility: 'high',
        plausibility: 'plausible',
        rumorRisk: 'low',
        retainedDespiteContradiction: true,
      })
    const technical = applyCorroborationEvent(makeReport('a-technical', 'technical_trace'), {
      eventId: 'fixture-corroboration',
      week: 1,
      sourceRef: 'fixture:recording',
      sourceClass: 'technical_trace',
      weight: 0.8,
    }).report
    const witness = applyContradictionEvent(makeReport('z-witness', 'field_witness'), {
      eventId: 'fixture-contradiction',
      week: 1,
      sourceRef: 'fixture:conflicting-testimony',
      severity: 'major',
    }).report
    state.informationIntakeReports = { [witness.id]: witness, [technical.id]: technical }
    const before = structuredClone(state)
    const captured = captureSimulationValidationInformationReports(state)!
    expect(captured.map((report) => report.id)).toEqual([technical.id, witness.id])
    expect(captured.map((report) => report.initialSourceClass)).toEqual([
      'technical_trace',
      'field_witness',
    ])
    expect(captured[0].topicRef).toBe(captured[1].topicRef)
    expect(captured[0].confidenceScore).toBe(technical.confidenceScore)
    expect(captured[1].confidenceScore).toBe(witness.confidenceScore)
    expect(captured[0].verificationStatus).not.toBe(captured[1].verificationStatus)
    expect(captured[0].corroborationHistory).toEqual(technical.corroborationHistory)
    expect(captured[1].contradictionHistory).toEqual(witness.contradictionHistory)
    expect(captured[1].retainedDespiteContradiction).toBe(true)
    state.informationIntakeReports = { [technical.id]: technical, [witness.id]: witness }
    expect(captureSimulationValidationInformationReports(state)).toEqual(captured)
    Object.assign(captured[0].corroborationHistory[0], { sourceRef: 'observer-mutation' })
    Object.assign(captured[1].contradictionHistory[0], { severity: 'minor' })
    expect(state).toEqual(before)
  })

  it('distinguishes absent information from an explicitly empty report map', () => {
    const state = createStartingState()
    delete state.informationIntakeReports
    expect(captureSimulationValidationInformationReports(state)).toBeNull()
    state.informationIntakeReports = {}
    expect(captureSimulationValidationInformationReports(state)).toEqual([])
  })

  function startingState() {
    const state = createStartingState()
    // Existing authored intake fixtures exercise the real week-close tick. They
    // do not establish normal sensor/witness gameplay generation or coverage.
    state.informationIntakeReports = structuredClone({
      [PUBLIC_RUMOR_CONFLICT_FIXTURE.id]: PUBLIC_RUMOR_CONFLICT_FIXTURE,
      [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
    })
    return state
  }

  it('captures actual week-close verification progression and retains it in deterministic analysis', () => {
    const state = startingState()
    const before = structuredClone(state)
    const capture = () => {
      const events: SimulationValidationTelemetryEvent[] = []
      const run = runSimulationValidationScenario('baseline', {
        startingState: state,
        onSnapshot: (event) => events.push(event),
      })
      return { run, events, analysis: analyzeSimulationValidationTelemetry(events, run.summary) }
    }
    const captured = capture()
    expect(captured.events.length).toBeGreaterThan(1)
    expect(captured.events[0].advanceInput.informationReports).toEqual(
      captureSimulationValidationInformationReports(captured.run.initialState)
    )
    expect(captured.events[0].informationReports).not.toEqual(
      captured.events[0].advanceInput.informationReports
    )
    for (let index = 1; index < captured.events.length; index += 1) {
      expect(captured.events[index].advanceInput.informationReports).toEqual(
        captured.events[index - 1].informationReports
      )
    }
    expect(captured.events.at(-1)!.informationReports).toEqual(
      captureSimulationValidationInformationReports(captured.run.finalState)
    )
    expect(captured.analysis.history.map((week) => week.informationReportsBeforeAdvance)).toEqual(
      captured.events.map((event) => event.advanceInput.informationReports)
    )
    expect(captured.analysis.history.map((week) => week.informationReportsAfterClose)).toEqual(
      captured.events.map((event) => event.informationReports)
    )
    expect(state).toEqual(before)
    expect(captured).toEqual(capture())
    expect(state).toEqual(before)
    const sourceEvents = structuredClone(captured.events)
    Object.assign(captured.analysis.history[0].informationReportsAfterClose![0], {
      confidenceScore: -1,
    })
    expect(captured.events).toEqual(sourceEvents)
  })

  it('isolates observer edits from the intake simulation and later week captures', () => {
    const state = startingState()
    const baseline = runSimulationValidationScenario('baseline', { startingState: state })
    const observed = runSimulationValidationScenario('baseline', {
      startingState: state,
      onSnapshot: (event) => {
        for (const report of event.informationReports ?? []) {
          Object.assign(report, { confidenceScore: -1, verificationStatus: 'impossible' })
          const history = report.corroborationHistory[0] ?? report.contradictionHistory[0]
          if (history) Object.assign(history, { sourceRef: 'observer-mutation' })
        }
        event.advanceInput.informationReports?.splice(0)
      },
    })
    expect(observed).toEqual(baseline)
  })
})
