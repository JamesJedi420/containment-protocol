import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { GameState } from '../domain/models'
import {
  commitStaffTime,
  queryStaffTimeAllocation,
  releaseStaffTime,
} from '../domain/staffTimeAllocation'
import {
  captureSimulationValidationAdvanceInput,
  runSimulationValidationScenario,
} from '../domain/sim/validation'
import type { SimulationValidationTelemetryEvent } from '../domain/sim/validation'
import { analyzeSimulationValidationTelemetry } from '../domain/sim/validationTelemetry'

function allocationFixture() {
  const state = createStartingState()
  // Constructed canonical-post fixture, not evidence of player allocation behavior.
  state.staff = {
    a: { id: 'a', specialty: 'analysis', operationalPostId: 'staff-post:analysis:1' },
    b: { id: 'b', specialty: 'analysis', operationalPostId: 'staff-post:analysis:2' },
    idle: { id: 'idle', specialty: 'analysis' },
  } as unknown as GameState['staff']
  return state
}

function reserve(state: GameState) {
  const result = commitStaffTime(state, {
    id: 'fixture-reservation',
    week: state.week,
    staffIds: ['a'],
    destination: 'workshop:first',
    displacedAlternative: 'workshop:second',
    revision: queryStaffTimeAllocation(state).revision,
  })
  expect(result.reason).toBe('committed')
  return result.game
}

describe('canonical staff-time telemetry (SPE-1119)', () => {
  it('copies the canonical query through commit and release without inventing capacity', () => {
    const initial = allocationFixture()
    const committed = reserve(initial)
    const released = releaseStaffTime(
      committed,
      'fixture-reservation',
      queryStaffTimeAllocation(committed).revision
    ).game
    for (const state of [initial, committed, released]) {
      const query = queryStaffTimeAllocation(state)
      const captured = captureSimulationValidationAdvanceInput(state).staffTime
      expect(captured).toEqual({
        unavailable: query.unavailable,
        capacity: {
          headcount: query.capacity.headcount,
          available: query.capacity.available,
          assigned: query.capacity.assigned,
          effectiveCapacity: query.capacity.effectiveCapacity,
          reason: query.capacity.reason,
        },
        availableIds: query.availableIds,
        active: query.active,
        usableCommitmentIds: query.usableCommitmentIds,
      })
    }
    const capture = (state: GameState) => captureSimulationValidationAdvanceInput(state).staffTime
    expect(capture(initial).availableIds).toEqual(['a', 'b'])
    expect(capture(committed).availableIds).toEqual(['b'])
    expect(capture(committed).active[0].displacedAlternative).toBe('workshop:second')
    expect(capture(committed).usableCommitmentIds).toEqual(['fixture-reservation'])
    expect(capture(released).availableIds).toEqual(['a', 'b'])
    expect(capture(released).active).toEqual([])
  })

  it('preserves unavailable data separately from a valid zero-capacity query', () => {
    const state = allocationFixture()
    state.staff = {}
    const empty = captureSimulationValidationAdvanceInput(state).staffTime
    expect(empty.unavailable).toBe(false)
    expect(empty.capacity.effectiveCapacity).toBe(0)
    state.staffTimeAllocations = { version: 1, unavailable: true }
    const unavailable = captureSimulationValidationAdvanceInput(state).staffTime
    expect(unavailable.unavailable).toBe(true)
    expect(unavailable.availableIds).toEqual([])
  })

  it('retains active but unusable claims after a canonical post changes', () => {
    const state = reserve(allocationFixture())
    if ('operationalPostId' in state.staff.a) delete state.staff.a.operationalPostId
    const captured = captureSimulationValidationAdvanceInput(state).staffTime
    expect(captured.active.map((claim) => claim.id)).toEqual(['fixture-reservation'])
    expect(captured.usableCommitmentIds).toEqual([])
    expect(captured.availableIds).toEqual(['b'])
  })

  it('detaches nested claims and captures repeated source state deterministically', () => {
    const state = reserve(allocationFixture())
    const before = structuredClone(state)
    const captured = captureSimulationValidationAdvanceInput(state).staffTime
    expect(captured).toEqual(captureSimulationValidationAdvanceInput(state).staffTime)
    // Readonly source fields are deliberately mutated at runtime to test observer isolation.
    Object.assign(captured.active[0], { staffIds: ['observer'], displacedAlternative: 'observer' })
    captured.availableIds.splice(0)
    expect(state).toEqual(before)
  })

  it('retains actual harness observations in detached deterministic analysis history', () => {
    const events: SimulationValidationTelemetryEvent[] = []
    const run = runSimulationValidationScenario('baseline', {
      onSnapshot: (event) => events.push(event),
    })
    expect(events.length).toBeGreaterThan(0)
    const analysis = analyzeSimulationValidationTelemetry(events, run.summary)
    expect(analysis.history.map((week) => week.staffTimeBeforeAdvance)).toEqual(
      events.map((event) => event.advanceInput.staffTime)
    )
    expect(analysis).toEqual(analyzeSimulationValidationTelemetry(events, run.summary))
    const before = structuredClone(events)
    analysis.history[0].staffTimeBeforeAdvance.capacity.effectiveCapacity = -999
    expect(events).toEqual(before)
  })
})
