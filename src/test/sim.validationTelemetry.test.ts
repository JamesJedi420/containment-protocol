import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { getResolvedDifficultyRunConfiguration } from '../domain/campaignLedger'
import { projectStrategicActionBudget } from '../domain/strategicActionBudgetProjection'
import { recomputeMissionRouting } from '../domain/missionIntakeRouting'
import {
  captureSimulationValidationAdvanceInput,
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
        schemaVersion: 4,
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
          'advanceInput',
          'snapshot',
          'missionResults',
        ].sort()
      )
      expect(event.advanceInput.phase).toBe('before-week-close')
      expect(event.advanceInput.week).toBe(event.snapshot.week)
      expect(event.advanceInput.committedOperations).toHaveLength(
        event.advanceInput.actionBudget.committedDemand
      )
      expect(event.advanceInput.missionIntake).not.toBeNull()
      expect(
        event.advanceInput.missionIntake?.missions.every(
          (mission) => mission.lastRoutedWeek === event.advanceInput.week
        )
      ).toBe(true)
    }
    expect(first.some((event) => event.advanceInput.committedOperations.length > 0)).toBe(true)
    expect(first[0].advanceInput.missionIntake?.missions.length).toBeGreaterThan(0)
  })

  it('isolates nested consumer mutation from simulation, summaries and retained snapshots', () => {
    const baseline = runSimulationValidationScenario('mixed-pressure')
    const observed = runSimulationValidationScenario('mixed-pressure', {
      onSnapshot: (event) => {
        event.snapshot.pressureScores.budget = -999
        event.snapshot.week = -999
        event.snapshot.gameOver = true
        event.advanceInput.actionBudget.committedDemand = -999
        event.advanceInput.actionBudget.pressureLanes.splice(0)
        event.advanceInput.committedOperations[0]?.assignedTeamIds.splice(0)
        event.advanceInput.missionIntake?.orderedMissionIds.splice(0)
        event.advanceInput.missionIntake?.missions[0]?.routingBlockers.push('no-valid-team')
        const result = event.missionResults?.[0]
        if (result)
          Object.assign(result.rewards, { fundingDelta: -999, reasons: ['observer-mutation'] })
      },
    })
    expect(observed).toEqual(baseline)
  })

  it('copies recorded intake context without refreshing stale source timing or changing order', () => {
    const state = createStartingState()
    state.missionRouting = recomputeMissionRouting(state)
    state.missionRouting.orderedMissionIds.reverse()
    const mission = Object.values(state.missionRouting.missions)[0]
    mission.routingState = 'deferred'
    mission.deadlineRemaining = -2
    mission.lastRoutedWeek = state.week - 1
    mission.routingBlockers = ['no-valid-team']
    const before = structuredClone(state)
    const intake = captureSimulationValidationAdvanceInput(state).missionIntake
    expect(intake).not.toBeNull()
    if (!intake) throw new Error('Expected recorded intake')
    expect(intake.orderedMissionIds).toEqual(state.missionRouting.orderedMissionIds)
    expect(intake.missions).toHaveLength(Object.keys(state.missionRouting.missions).length)
    for (const captured of intake.missions) {
      const source = state.missionRouting.missions[captured.missionId]
      expect(captured).toEqual({
        missionId: source.missionId,
        routingState: source.routingState,
        priority: source.priority,
        deadlineRemaining: source.deadlineRemaining,
        priorityReasonCodes: source.priorityReasonCodes,
        routingBlockers: source.routingBlockers,
        playerDisposition: source.playerDisposition ?? null,
        lastTriageWeek: source.lastTriageWeek ?? null,
        lastRoutedWeek: source.lastRoutedWeek ?? null,
      })
    }
    expect(intake.missions.find((entry) => entry.missionId === mission.missionId)).toMatchObject({
      routingState: 'deferred',
      deadlineRemaining: -2,
      lastRoutedWeek: state.week - 1,
    })
    const reordered = {
      ...state,
      missionRouting: {
        ...state.missionRouting,
        missions: Object.fromEntries(Object.entries(state.missionRouting.missions).reverse()),
      },
    }
    expect(captureSimulationValidationAdvanceInput(reordered).missionIntake).toEqual(intake)
    intake.orderedMissionIds.splice(0)
    intake.missions[0].routingBlockers.push('capacity-locked')
    intake.missions[0].priorityReasonCodes.push('consumer-mutation')
    expect(state).toEqual(before)
  })

  it('distinguishes missing intake from an explicitly empty recorded queue', () => {
    const state = createStartingState()
    expect(
      captureSimulationValidationAdvanceInput({ ...state, missionRouting: undefined }).missionIntake
    ).toBeNull()
    expect(
      captureSimulationValidationAdvanceInput({
        ...state,
        missionRouting: { orderedMissionIds: [], missions: {}, nextGeneratedSequence: 1 },
      }).missionIntake
    ).toEqual({ orderedMissionIds: [], missions: [] })
  })

  it('observes existing action-budget and difficulty owners without redefining their rules', () => {
    for (const profileId of ['cozy', 'normal'] as const) {
      const state = createStartingState()
      state.campaignLedger = {
        ...state.campaignLedger!,
        difficultyProfile: { profileId, profileVersion: '1' },
      }
      state.funding = 1234
      state.agency = { ...state.agency!, supportAvailable: 0 }
      const operation = Object.values(state.cases)[0]
      operation.status = 'in_progress'
      operation.assignedTeamIds = Object.keys(state.teams).reverse()
      const before = structuredClone(state)
      const captured = captureSimulationValidationAdvanceInput(state)
      expect(captured.funding).toBe(1234)
      expect(captured.week).toBe(state.week)
      expect(captured.actionBudget).toEqual(projectStrategicActionBudget(state))
      expect(captured.actionBudget).toMatchObject({
        configured: true,
        committedDemand: 1,
        remainingBudget: 0,
        deficit: 1,
        constrained: true,
      })
      expect(captured.difficulty).toEqual(getResolvedDifficultyRunConfiguration(state))
      expect(captured.difficulty.profileId).toBe(profileId)
      expect(captured.committedOperations).toEqual([
        {
          caseId: operation.id,
          templateId: operation.templateId,
          assignedTeamIds: [...operation.assignedTeamIds].sort(),
        },
      ])
      expect(
        captureSimulationValidationAdvanceInput({
          ...state,
          cases: Object.fromEntries(Object.entries(state.cases).reverse()),
        })
      ).toEqual(captured)
      captured.committedOperations[0].assignedTeamIds.splice(0)
      captured.actionBudget.pressureLanes.splice(0)
      expect(state).toEqual(before)
    }
  })

  it('retains unconfigured budgets and empty commitments instead of inventing availability', () => {
    const state = createStartingState()
    if (state.agency) delete state.agency.supportAvailable
    const captured = captureSimulationValidationAdvanceInput(state)
    expect(captured.actionBudget).toEqual(projectStrategicActionBudget(state))
    expect(captured.actionBudget.configured).toBe(false)
    expect(captured.committedOperations).toEqual([])
  })

  it('forwards the hook through the existing suite and keeps scenario traces separate', () => {
    const events: SimulationValidationTelemetryEvent[] = []
    const runs = runSimulationValidationSuite({ onSnapshot: (event) => events.push(event) })
    expect(events.length).toBe(runs.reduce((count, run) => count + run.weekly.length, 0))
    for (const run of runs) {
      const trace = events.filter((event) => event.scenarioId === run.scenarioId)
      expect(trace.map((event) => event.snapshot)).toEqual(run.weekly)
      expect(trace.length).toBeGreaterThan(0)
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
