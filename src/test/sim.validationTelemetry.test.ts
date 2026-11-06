import { describe, expect, it } from 'vitest'
import {
  getSimulationValidationScenarios,
  runSimulationValidationScenario,
  runSimulationValidationSuite,
} from '../domain/sim/validation'
import type { SimulationValidationTelemetryEvent } from '../domain/sim/validation'

describe('opt-in internal simulation validation telemetry (SPE-1119)', () => {
  it('captures every actual week deterministically without changing the campaign', () => {
    const baseline = runSimulationValidationScenario('baseline')
    const first: SimulationValidationTelemetryEvent[] = []
    const second: SimulationValidationTelemetryEvent[] = []
    const observed = runSimulationValidationScenario('baseline', {
      onSnapshot: (event) => first.push(event),
    })
    const repeated = runSimulationValidationScenario('baseline', {
      onSnapshot: (event) => second.push(event),
    })

    expect(observed).toEqual(baseline)
    expect(repeated).toEqual(baseline)
    expect(first).toEqual(second)
    expect(first.length).toBeGreaterThan(1)
    expect(first.map((event) => event.snapshot)).toEqual(observed.weekly)
    expect(first.map((event) => event.sequence)).toEqual(first.map((_, i) => i + 1))
    for (const event of first) {
      expect(event).toMatchObject({
        schemaVersion: 1,
        audience: 'internal-validation',
        source: 'simulation-validation-weekly-snapshot',
        phase: 'after-week-close',
        scenarioId: 'baseline',
      })
      expect(Object.keys(event).sort()).toEqual(
        [
          'schemaVersion',
          'audience',
          'source',
          'phase',
          'scenarioId',
          'sequence',
          'snapshot',
        ].sort()
      )
    }
  })

  it('isolates nested consumer mutation from simulation, summaries and retained snapshots', () => {
    const baseline = runSimulationValidationScenario('mixed-pressure')
    const observed = runSimulationValidationScenario('mixed-pressure', {
      onSnapshot: (event) => {
        event.snapshot.pressureScores.budget = -999
        event.snapshot.week = -999
        event.snapshot.gameOver = true
      },
    })
    expect(observed).toEqual(baseline)
  })

  it('forwards the hook through the existing suite and keeps scenario traces separate', () => {
    const events: SimulationValidationTelemetryEvent[] = []
    const runs = runSimulationValidationSuite({ onSnapshot: (event) => events.push(event) })
    expect(events.length).toBe(runs.reduce((count, run) => count + run.weekly.length, 0))
    for (const run of runs) {
      const trace = events.filter((event) => event.scenarioId === run.scenarioId)
      expect(trace.map((event) => event.snapshot)).toEqual(run.weekly)
      expect(trace[0].sequence).toBe(1)
      expect(trace.at(-1)?.snapshot.gameOver).toBe(run.finalState.gameOver)
      expect(trace.length).toBeLessThanOrEqual(
        getSimulationValidationScenarios().find((scenario) => scenario.id === run.scenarioId)!
          .maxWeeks
      )
      // A consumer uses the existing component metric; it does not invent a pressure score.
      expect(trace.map((event) => event.snapshot.budgetPressure)).toEqual(
        run.summary.budgetPressureTrend
      )
    }
    const baseline = events.filter((event) => event.scenarioId === 'baseline')
    const pressured = events.filter((event) => event.scenarioId === 'high-budget-pressure')
    expect(pressured.map((event) => event.snapshot.budgetPressure)).not.toEqual(
      baseline.map((event) => event.snapshot.budgetPressure)
    )
  })

  it('surfaces observer errors instead of returning apparently complete evidence', () => {
    let calls = 0
    expect(() =>
      runSimulationValidationScenario('baseline', {
        onSnapshot: () => {
          calls += 1
          throw new Error('capture unavailable')
        },
      })
    ).toThrow('capture unavailable')
    expect(calls).toBe(1)
  })
})
