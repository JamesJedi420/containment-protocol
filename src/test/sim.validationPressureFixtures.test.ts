import { beforeAll, describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { GameState } from '../domain/models'
import { commitStaffTime, queryStaffTimeAllocation } from '../domain/staffTimeAllocation'
import {
  captureSimulationValidationAdvanceInput,
  runSimulationValidationScenario,
} from '../domain/sim/validation'
import type { SimulationValidationTelemetryEvent } from '../domain/sim/validation'
import { analyzeSimulationValidationTelemetry } from '../domain/sim/validationTelemetry'

function capture(scenarioId: 'baseline' | 'high-budget-pressure') {
  const events: SimulationValidationTelemetryEvent[] = []
  const run = runSimulationValidationScenario(scenarioId, {
    onSnapshot: (event) => events.push(event),
  })
  return { events, run, analysis: analyzeSimulationValidationTelemetry(events, run.summary) }
}

describe('pressure and unused-capacity validation examples (SPE-1119)', () => {
  let baseline: ReturnType<typeof capture>
  beforeAll(() => {
    baseline = capture('baseline')
    expect(baseline.events.length).toBeGreaterThan(0)
  })

  it('retains distinguishable actual campaign pressure rather than treating every advance as cost-free', () => {
    const pressured = capture('high-budget-pressure')
    expect(pressured.analysis.history.length).toBeGreaterThan(1)
    expect(pressured.analysis.history[0].budgetPressureAfterClose).toBeGreaterThan(
      baseline.analysis.history[0].budgetPressureAfterClose
    )
    for (const { analysis, run } of [baseline, pressured]) {
      expect(analysis.history.map((week) => week.unresolvedCasesAfterClose)).toEqual(
        run.summary.unresolvedCaseCountTrend
      )
      expect(analysis.history.map((week) => week.budgetPressureAfterClose)).toEqual(
        run.summary.budgetPressureTrend
      )
      expect(analysis.history.some((week) => week.budgetPressureAfterClose > 0)).toBe(true)
    }
  })

  it('distinguishes an explicitly constructed no-pressure trace without labeling it healthy gameplay', () => {
    const events = structuredClone(baseline.events)
    for (const event of events) {
      event.advanceInput.funding = 100
      event.snapshot.unresolvedCaseCount = 0
      event.snapshot.budgetPressure = 0
    }
    const before = structuredClone(events)
    const quiet = analyzeSimulationValidationTelemetry(events, baseline.run.summary)
    expect(
      quiet.history.every(
        (week) =>
          week.fundingBeforeAdvance === 100 &&
          week.unresolvedCasesAfterClose === 0 &&
          week.budgetPressureAfterClose === 0
      )
    ).toBe(true)
    expect(quiet.history).not.toEqual(baseline.analysis.history)
    expect(analyzeSimulationValidationTelemetry(events, baseline.run.summary)).toEqual(quiet)
    expect(events).toEqual(before)
    // Only these component observations are constructed; this is not a valid reconstructed campaign or a health verdict.
  })

  function capacityTrace(reserve: boolean, unavailable = false) {
    return [1, 2, 3].map((week) => {
      let state = createStartingState()
      state.week = week
      state.staff = {
        analyst: {
          id: 'analyst',
          specialty: 'analysis',
          operationalPostId: 'staff-post:analysis:1',
        },
      } as unknown as GameState['staff']
      const currentCase = Object.values(state.cases)[0]
      currentCase.status = 'in_progress'
      currentCase.assignedTeamIds = [Object.keys(state.teams)[0]]
      if (reserve) {
        const result = commitStaffTime(state, {
          id: `fixture-${week}`,
          week,
          staffIds: ['analyst'],
          destination: 'workshop:first',
          displacedAlternative: 'workshop:second',
          revision: queryStaffTimeAllocation(state).revision,
        })
        expect(result.reason).toBe('committed')
        state = result.game
      }
      if (unavailable) state.staffTimeAllocations = { version: 1, unavailable: true }
      const event = structuredClone(baseline.events[0])
      event.sequence = week
      event.advanceInput = captureSimulationValidationAdvanceInput(state)
      event.snapshot.week = week
      event.snapshot.gameOver = false
      return event
    })
  }

  it('exposes repeated unused canonical capacity alongside operations, separately from explicit displaced uses', () => {
    // Constructed weekly allocation states use real canonical commands; they are not a played multi-week campaign.
    const analyze = (events: SimulationValidationTelemetryEvent[]) =>
      analyzeSimulationValidationTelemetry(events, { scenarioId: 'baseline', weeksSimulated: 3 })
    const unused = analyze(capacityTrace(false))
    const displaced = analyze(capacityTrace(true))
    const unavailable = analyze(capacityTrace(false, true))
    expect(unused.history).toHaveLength(3)
    expect(
      unused.history.every(
        (week) =>
          week.actionBudgetBeforeAdvance.committedDemand > 0 &&
          !week.staffTimeBeforeAdvance.unavailable &&
          week.staffTimeBeforeAdvance.availableIds.length === 1 &&
          week.staffTimeBeforeAdvance.active.length === 0
      )
    ).toBe(true)
    expect(
      displaced.history.every(
        (week) =>
          week.actionBudgetBeforeAdvance.committedDemand > 0 &&
          week.staffTimeBeforeAdvance.availableIds.length === 0 &&
          week.staffTimeBeforeAdvance.active[0].displacedAlternative === 'workshop:second' &&
          week.staffTimeBeforeAdvance.usableCommitmentIds.length === 1
      )
    ).toBe(true)
    expect(unavailable.history.every((week) => week.staffTimeBeforeAdvance.unavailable)).toBe(true)
    expect(analyze(capacityTrace(true))).toEqual(displaced)
    // No recorded claim is not proof of zero opportunity cost; available capacity is not a universal surplus band.
  })
})
