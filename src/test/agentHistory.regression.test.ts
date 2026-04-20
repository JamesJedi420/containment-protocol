// cspell:words fieldcraft
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { trainingCatalog } from '../data/training'
import { getXpThresholdForLevel } from '../domain/progression'
import { normalizeGameState } from '../domain/teamSimulation'
import { assignTeam } from '../domain/sim/assign'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { getTrainingAptitudeBonus, queueTraining } from '../domain/sim/training'
import { getAgentView } from '../features/agents/agentView'

function makeResolvedCaseState() {
  const state = createStartingState()

  state.cases['case-001'] = {
    ...state.cases['case-001']!,
    mode: 'threshold',
    weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
    difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
    weeksRemaining: 1,
  }

  return state
}

function makeTrainingCompletionState() {
  const queued = queueTraining(createStartingState(), 'a_ava', 'combat-drills')

  return {
    ...queued,
    cases: Object.fromEntries(
      Object.entries(queued.cases).map(([id, currentCase]) => [
        id,
        {
          ...currentCase,
          status: 'resolved' as const,
          assignedTeamIds: [],
          weeksRemaining: undefined,
        },
      ])
    ),
    trainingQueue: queued.trainingQueue.map((entry) =>
      entry.agentId === 'a_ava' ? { ...entry, remainingWeeks: 1 } : entry
    ),
  }
}

describe('agent history regression coverage', () => {
  it('preserves imported event-linked history ids through normalization and agent views', () => {
    const state = createStartingState()
    const agent = state.agents.a_ava!
    const eventId = 'evt-history-1'

    state.agents.a_ava = {
      ...agent,
      history: {
        ...agent.history!,
        timeline: [
          {
            week: 2,
            eventType: 'agent.training_completed',
            note: 'Completed fieldcraft',
            eventId,
          },
        ],
        logs: [
          {
            id: eventId,
            schemaVersion: 1,
            type: 'agent.training_completed',
            sourceSystem: 'agent',
            timestamp: '2042-01-08T00:00:00.001Z',
            payload: {
              week: 2,
              queueId: 'queue-history-1',
              agentId: agent.id,
              agentName: agent.name,
              trainingId: 'combat-drills',
              trainingName: 'Close-Quarters Drills',
            },
          },
        ],
      },
    }

    const normalized = normalizeGameState(state)
    const view = getAgentView(normalized, agent.id)

    expect(normalized.agents.a_ava.history?.timeline[0]).toMatchObject({
      eventId,
      eventType: 'agent.training_completed',
    })
    expect(view?.materialized.history.recentTimeline[0]).toMatchObject({
      eventId,
      eventType: 'agent.training_completed',
    })
    expect(view?.materialized.history.recentLogs[0]).toMatchObject({
      id: eventId,
      type: 'agent.training_completed',
    })
  })

  it('keeps case history timeline entries, log ids, and completion counters aligned', () => {
    const assigned = assignTeam(makeResolvedCaseState(), 'case-001', 't_nightwatch')
    const next = advanceWeek(assigned)
    const agentId = assigned.teams.t_nightwatch.agentIds[0]!
    const agent = next.agents[agentId]!

    const relevantEvents = next.events.filter(
      (event) =>
        (event.type === 'assignment.team_assigned' && event.payload.teamId === 't_nightwatch') ||
        (event.type === 'case.resolved' && event.payload.caseId === 'case-001') ||
        (event.type === 'progression.xp_gained' && event.payload.agentId === agentId) ||
        (event.type === 'agent.relationship_changed' && event.payload.agentId === agentId)
    )
    const expectedLogIds = relevantEvents
      .filter(
        (event) =>
          event.type === 'assignment.team_assigned' ||
          event.type === 'case.resolved' ||
          event.type === 'progression.xp_gained' ||
          event.type === 'agent.relationship_changed'
      )
      .map((event) => event.id)

    expect(agent.history?.logs.map((entry) => entry.id)).toEqual(expectedLogIds)
    expect(new Set(agent.history?.logs.map((entry) => entry.id)).size).toBe(
      agent.history?.logs.length ?? 0
    )
    expect(agent.history?.timeline.map((entry) => entry.eventType)).toEqual([
      'assignment.team_assigned',
      'case.resolved',
      'progression.xp_gained',
      'agent.relationship_changed',
      'agent.relationship_changed',
    ])
    expect(agent.history?.casesCompleted).toBe(1)
    expect(agent.history?.counters.assignmentsCompleted).toBe(1)
    expect(agent.history?.counters.casesResolved).toBe(1)
    expect(agent.history?.counters.casesPartiallyResolved).toBe(0)
    expect(agent.history?.counters.casesFailed).toBe(0)
    expect(agent.history?.trainingsDone).toBe(0)

    const xpGainLog = agent.history?.logs.find((entry) => entry.type === 'progression.xp_gained')
    const xpGainEvent = next.events.find(
      (event) => event.type === 'progression.xp_gained' && event.payload.agentId === agentId
    )

    expect(xpGainLog?.id).toBe(xpGainEvent?.id)
    expect(xpGainLog?.payload).toMatchObject({
      agentId,
      xpAmount: 150,
      totalXp: agent.progression?.xp,
      level: agent.progression?.level,
    })
  })

  it('keeps training counters, logs, and progression history aligned after completion', () => {
    const queued = makeTrainingCompletionState()
    const next = advanceWeek(queued)
    const agent = next.agents.a_ava!
    const queuedEntry = queued.trainingQueue[0]!

    const expectedLogIds = next.events
      .filter(
        (event) =>
          (event.type === 'agent.training_started' ||
            event.type === 'agent.training_completed' ||
            event.type === 'progression.xp_gained') &&
          event.payload.agentId === 'a_ava'
      )
      .map((event) => event.id)

    expect(agent.history?.logs.map((entry) => entry.id)).toEqual(expectedLogIds)
    expect(new Set(agent.history?.logs.map((entry) => entry.id)).size).toBe(
      agent.history?.logs.length ?? 0
    )
    expect(agent.history?.timeline.map((entry) => entry.eventType)).toEqual([
      'agent.training_started',
      'agent.training_completed',
      'progression.xp_gained',
    ])
    expect(agent.history?.counters.trainingWeeks).toBe(queuedEntry.durationWeeks)
    expect(agent.history?.counters.trainingsCompleted).toBe(1)
    expect(agent.history?.trainingsDone).toBe(1)
    expect(agent.history?.casesCompleted).toBe(0)
    expect(agent.history?.counters.casesResolved).toBe(0)
    expect(agent.history?.counters.casesPartiallyResolved).toBe(0)
    expect(agent.history?.counters.casesFailed).toBe(0)

    const xpGainLog = agent.history?.logs.find((entry) => entry.type === 'progression.xp_gained')
    const xpGainEvent = next.events.find(
      (event) => event.type === 'progression.xp_gained' && event.payload.agentId === 'a_ava'
    )

    expect(xpGainLog?.id).toBe(xpGainEvent?.id)
    const combatDrillsProgram = trainingCatalog.find((p) => p.trainingId === 'combat-drills')!
    const aptitudeBonus = getTrainingAptitudeBonus(
      queued.agents.a_ava!.role,
      combatDrillsProgram.targetStat
    )
    const expectedXp =
      (combatDrillsProgram.statDelta + aptitudeBonus) * 10 * (combatDrillsProgram.durationWeeks / 2)
    expect(xpGainLog?.payload).toMatchObject({
      agentId: 'a_ava',
      xpAmount: expectedXp,
      totalXp: agent.progression?.xp,
      level: agent.progression?.level,
    })
    expect(agent.progression?.xp).toBeGreaterThan(0)
    expect(agent.progression?.xp).toBeLessThan(getXpThresholdForLevel(2))
  })
})
