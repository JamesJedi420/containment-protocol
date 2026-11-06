import { beforeAll, describe, expect, it } from 'vitest'
import { analyzeSimulationValidationTelemetry } from '../domain/sim/validationTelemetry'
import { runSimulationValidationScenario } from '../domain/sim/validation'
import type {
  SimulationValidationRun,
  SimulationValidationTelemetryEvent,
} from '../domain/sim/validation'

function capture(scenarioId: SimulationValidationRun['scenarioId']) {
  const events: SimulationValidationTelemetryEvent[] = []
  const run = runSimulationValidationScenario(scenarioId, {
    onSnapshot: (event) => events.push(event),
  })
  return { events, run }
}

describe('internal validation trace analysis (SPE-1119)', () => {
  let baseline: ReturnType<typeof capture>
  let pressured: ReturnType<typeof capture>
  beforeAll(() => {
    baseline = capture('baseline')
    pressured = capture('high-budget-pressure')
  })

  it('consumes actual multi-week captures and preserves source component histories', () => {
    for (const { events, run } of [baseline, pressured]) {
      const before = structuredClone(events)
      const analysis = analyzeSimulationValidationTelemetry(events, run.summary)
      expect(analysis).toEqual(
        analyzeSimulationValidationTelemetry(structuredClone(events), run.summary)
      )
      expect(analysis.outcomes).toEqual(run.summary.missionOutcomeCounts)
      expect(analysis.history).toHaveLength(run.summary.weeksSimulated)
      expect(analysis.history.map((entry) => entry.budgetPressureAfterClose)).toEqual(
        run.summary.budgetPressureTrend
      )
      expect(analysis.history.map((entry) => entry.fundingBeforeAdvance)).toEqual(
        events.map((event) => event.advanceInput.funding)
      )
      expect(analysis.history.map((entry) => entry.actionBudgetBeforeAdvance)).toEqual(
        events.map((event) => event.advanceInput.actionBudget)
      )
      expect(analysis.difficulty).toEqual(events[0].advanceInput.difficulty)
      analysis.history[0].actionBudgetBeforeAdvance.pressureLanes.splice(0)
      analysis.templates.splice(0)
      expect(events).toEqual(before)
    }
    const ordinary = analyzeSimulationValidationTelemetry(baseline.events, baseline.run.summary)
    const underPressure = analyzeSimulationValidationTelemetry(
      pressured.events,
      pressured.run.summary
    )
    expect(underPressure.history.map((entry) => entry.fundingBeforeAdvance)).not.toEqual(
      ordinary.history.map((entry) => entry.fundingBeforeAdvance)
    )
  })

  it('counts continuing operations once while retaining their weekly commitment exposure', () => {
    // Constructed packets isolate counting semantics; these are not new gameplay evidence.
    const events = [1, 2, 3].map((sequence) => {
      const event = structuredClone(baseline.events[0])
      event.sequence = sequence
      event.advanceInput.week = sequence
      event.snapshot.week = sequence
      event.snapshot.gameOver = false
      event.advanceInput.committedOperations = [
        {
          caseId: sequence === 3 ? 'new-case' : 'continuing-case',
          templateId: 'template-z',
          assignedTeamIds: ['team-a'],
        },
        { caseId: 'other-case', templateId: 'template-a', assignedTeamIds: ['team-b'] },
      ]
      event.advanceInput.actionBudget.committedDemand = 2
      return event
    })
    const analysis = analyzeSimulationValidationTelemetry(events, {
      scenarioId: 'baseline',
      weeksSimulated: 3,
    })
    expect(analysis.distinctObservedCases).toBe(3)
    expect(analysis.templates).toEqual([
      { templateId: 'template-a', distinctObservedCases: 1, committedCaseWeeks: 3 },
      { templateId: 'template-z', distinctObservedCases: 2, committedCaseWeeks: 3 },
    ])
  })

  it('reports empty observation explicitly without fabricated profiles or counts', () => {
    expect(
      analyzeSimulationValidationTelemetry([], { scenarioId: 'baseline', weeksSimulated: 0 })
    ).toEqual({
      schemaVersion: 1,
      audience: 'internal-validation',
      scenarioId: 'baseline',
      weeksObserved: 0,
      difficulty: null,
      distinctObservedCases: 0,
      templates: [],
      outcomes: { success: 0, partial: 0, fail: 0, unresolved: 0 },
      history: [],
    })
  })

  it('rejects lost tail events using the actual run summary', () => {
    expect(() =>
      analyzeSimulationValidationTelemetry(baseline.events.slice(0, -1), baseline.run.summary)
    ).toThrow('capture length')
  })

  it.each<[string, (events: SimulationValidationTelemetryEvent[]) => void, string]>([
    [
      'non-finite funding',
      (events) => {
        events[0].advanceInput.funding = Number.NaN
      },
      'non-finite',
    ],
    [
      'negative outcome count',
      (events) => {
        events[0].snapshot.missionSuccesses = -1
      },
      'invalid outcome',
    ],
    [
      'duplicate sequence',
      (events) => {
        events[1].sequence = 1
      },
      'sequence',
    ],
    [
      'missing sequence',
      (events) => {
        events[1].sequence = 3
      },
      'sequence',
    ],
    [
      'mixed scenario',
      (events) => {
        events[1].scenarioId = 'low-intel'
      },
      'mixed scenario',
    ],
    [
      'week mismatch',
      (events) => {
        events[1].advanceInput.week += 1
      },
      'week',
    ],
    [
      'profile change',
      (events) => {
        events[1].advanceInput.difficulty = structuredClone(
          pressured.events[0].advanceInput.difficulty
        )
        Object.assign(events[1].advanceInput.difficulty.multipliers, { upkeep: 999 })
      },
      'difficulty',
    ],
    [
      'duplicate case',
      (events) => {
        events[0].advanceInput.committedOperations.push(
          structuredClone(events[0].advanceInput.committedOperations[0])
        )
      },
      'duplicate committed case',
    ],
    [
      'budget mismatch',
      (events) => {
        events[0].advanceInput.actionBudget.committedDemand += 1
      },
      'commitment count',
    ],
    [
      'premature game over',
      (events) => {
        events[0].snapshot.gameOver = true
      },
      'after game over',
    ],
    [
      'unsupported version',
      (events) => {
        Object.assign(events[0], { schemaVersion: 1 })
      },
      'unsupported',
    ],
    [
      'player audience',
      (events) => {
        Object.assign(events[0], { audience: 'player' })
      },
      'unsupported',
    ],
  ])('rejects %s rather than silently combining invalid evidence', (_, mutate, message) => {
    const events = structuredClone(baseline.events)
    mutate(events)
    expect(() => analyzeSimulationValidationTelemetry(events, baseline.run.summary)).toThrow(
      message
    )
  })
})
