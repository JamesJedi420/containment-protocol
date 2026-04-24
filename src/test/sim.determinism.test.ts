// cspell:words greentape sato spookhaus
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { assignTeam } from '../domain/sim/assign'
import { queueFabrication } from '../domain/sim/production'

function runScriptedDeterministicScenario(seed: number) {
  let state = createStartingState()
  state.rngSeed = seed
  state.rngState = seed

  state = queueFabrication(state, 'med-kits')
  state = assignTeam(state, 'case-002', 't_nightwatch')
  state = assignTeam(state, 'case-003', 't_greentape')

  state.cases['case-001'] = {
    ...state.cases['case-001'],
    status: 'open',
    assignedTeamIds: [],
    stage: 1,
    deadlineRemaining: 1,
  }

  for (let week = 0; week < 4; week += 1) {
    state = advanceWeek(state)
  }

  return state
}

/**
 * Determinism hardening regression coverage for repeated runs and scripted assignments,
 * ensuring the stability hardening fix prevents state leaks.
 */
describe('Simulation Determinism Hardening', () => {
  it('produces identical 10-week runs from the same seed', () => {
    const seedValue = 12345

    const runA = (() => {
      let state = createStartingState()
      state.rngSeed = seedValue
      state.rngState = seedValue

      for (let week = 0; week < 10; week++) {
        state = advanceWeek(state)
      }
      return state
    })()

    const runB = (() => {
      let state = createStartingState()
      state.rngSeed = seedValue
      state.rngState = seedValue

      for (let week = 0; week < 10; week++) {
        state = advanceWeek(state)
      }
      return state
    })()

    // Final RNG state must match
    expect(runA.rngState).toBe(runB.rngState)

    // Report sequences must match
    expect(runA.reports).toHaveLength(runB.reports.length)
    runA.reports.forEach((reportA, i) => {
      const reportB = runB.reports[i]
      expect(reportA.rngStateBefore).toBe(reportB.rngStateBefore)
      expect(reportA.rngStateAfter).toBe(reportB.rngStateAfter)
      expect(reportA.notes.map((n) => n.content)).toEqual(reportB.notes.map((n) => n.content))
    })

    // Case states must match
    expect(Object.keys(runA.cases)).toEqual(Object.keys(runB.cases))
  })

  it('maintains case lifecycle consistency across team assignments', () => {
    const seed = 54321

    let stateA = createStartingState()
    stateA.rngSeed = seed
    stateA.rngState = seed
    stateA = assignTeam(stateA, 'case-001', 't_nightwatch')

    let stateB = createStartingState()
    stateB.rngSeed = seed
    stateB.rngState = seed
    stateB = assignTeam(stateB, 'case-001', 't_nightwatch')

    // Advance both by 3 weeks
    for (let i = 0; i < 3; i++) {
      stateA = advanceWeek(stateA)
      stateB = advanceWeek(stateB)
    }

    // Fatigue must be identical (validates fatigue calc uses correct team state)
    expect(stateA.agents['a_ava'].fatigue).toBe(stateB.agents['a_ava'].fatigue)
    expect(stateA.agents['a_sato'].fatigue).toBe(stateB.agents['a_sato'].fatigue)

    // Case status must match
    expect(stateA.cases['case-001'].weeksRemaining).toBe(stateB.cases['case-001'].weeksRemaining)
    expect(stateA.cases['case-001'].status).toBe(stateB.cases['case-001'].status)
  })

  it('prevents state mutation across multiple weeks with different assignments', () => {
    const original = createStartingState()
    original.rngSeed = 99999
    original.rngState = 99999

    const snapshot = structuredClone(original)

    let state = original

    // Assign different teams to different cases each week
    state = assignTeam(state, 'case-001', 't_nightwatch')
    state = advanceWeek(state)

    state = assignTeam(state, 'case-002', 't_greentape')
    state = advanceWeek(state)

    state = assignTeam(state, 'case-003', 't_spookhaus')
    state = advanceWeek(state)

    // Store final state for assertion
    const finalState = state

    // Original must remain unchanged
    expect(original).toEqual(snapshot)

    // Final state must have progressed
    expect(finalState.week).toBe(4)
  })

  it('ensures spawn RNG exhaustion does not corrupt determinism', () => {
    const seed = 77777

    let stateA = createStartingState()
    stateA.rngSeed = seed
    stateA.rngState = seed
    stateA.cases['case-001'].stage = 1
    stateA.cases['case-001'].deadlineRemaining = 1
    stateA.cases['case-001'].onUnresolved = {
      ...stateA.cases['case-001'].onUnresolved,
      spawnCount: { min: 3, max: 5 },
    }

    let stateB = createStartingState()
    stateB.rngSeed = seed
    stateB.rngState = seed
    stateB.cases['case-001'].stage = 1
    stateB.cases['case-001'].deadlineRemaining = 1
    stateB.cases['case-001'].onUnresolved = {
      ...stateB.cases['case-001'].onUnresolved,
      spawnCount: { min: 3, max: 5 },
    }

    stateA = advanceWeek(stateA)
    stateB = advanceWeek(stateB)

    // Same number of spawns
    expect(stateA.reports[0].spawnedCases.length).toBe(stateB.reports[0].spawnedCases.length)

    // Same RNG state after spawn
    expect(stateA.rngState).toBe(stateB.rngState)
  })

  it('produces an identical GameState for the same seed and scripted steps, including reports, events, and spawned cases', () => {
    const runA = runScriptedDeterministicScenario(24_680)
    const runB = runScriptedDeterministicScenario(24_680)

    expect(runA).toEqual(runB)

    const spawnedIdsA = runA.reports.flatMap((report) => report.spawnedCases)
    const spawnedIdsB = runB.reports.flatMap((report) => report.spawnedCases)

    expect(runA.reports).toEqual(runB.reports)
    expect(runA.events).toEqual(runB.events)
    expect(spawnedIdsA).toEqual(spawnedIdsB)
    expect(Object.fromEntries(spawnedIdsA.map((caseId) => [caseId, runA.cases[caseId]]))).toEqual(
      Object.fromEntries(spawnedIdsB.map((caseId) => [caseId, runB.cases[caseId]]))
    )
  })

  it('keeps seeded passive-support assignments deterministic across repeated runs', () => {
    const seed = 424242

    const runScenario = () => {
      let state = createStartingState()
      state.rngSeed = seed
      state.rngState = seed
      state.cases['case-002'] = {
        ...state.cases['case-002'],
        mode: 'threshold',
        tags: ['support', 'medical'],
        requiredTags: [],
        preferredTags: [],
        requiredRoles: [],
        weights: { combat: 0, investigation: 0, utility: 0, social: 1 },
        difficulty: { combat: 0, investigation: 0, utility: 0, social: 40 },
      }

      state = assignTeam(state, 'case-002', 't_greentape')

      for (let week = 0; week < 3; week += 1) {
        state = advanceWeek(state)
      }

      return state
    }

    const runA = runScenario()
    const runB = runScenario()

    expect(runA.rngState).toBe(runB.rngState)
    expect(runA.reports).toEqual(runB.reports)
    expect(runA.agents['a_casey'].abilities).toEqual(runB.agents['a_casey'].abilities)
    expect(runA.agents['a_eli'].abilities).toEqual(runB.agents['a_eli'].abilities)
  })
})
