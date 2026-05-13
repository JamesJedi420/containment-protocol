import { describe, expect, it } from 'vitest'

import type { Agent } from '../domain/agent/models'
import {
  PLAYER_PRIMARY_DOWNTIME_MENU,
  canSelectPrimaryDowntimePlan,
  formatForegoneDowntimeSummary,
  resolveDowntimeSlotForAgent,
  setAgentPrimaryDowntimePlan,
} from '../domain/sim/downtimeSlot'
import { trainingCatalog } from '../data/training'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { advanceRecoveryDowntimeForWeek } from '../domain/sim/recoveryDowntime'
import type { DowntimeActivity } from '../domain/sim/recoveryDowntime'
import { queueTraining } from '../domain/sim/training'
import { createStartingState } from '../data/startingState'

const baseAgent: Agent = {
  id: 'a1',
  name: 'Test Agent',
  role: 'tech',
  baseStats: { combat: 10, investigation: 10, utility: 10, social: 10 },
  tags: [],
  relationships: {},
  fatigue: 50,
  status: 'active',
}

describe('resolveDowntimeSlotForAgent (SPE-1699)', () => {
  it('uses academy training as the sole effective slot when assignment is training', () => {
    const agent: Agent = {
      ...baseAgent,
      assignment: { state: 'training', startedWeek: 1, trainingProgramId: 'combat-drills' },
      downtimeActivity: { activity: 'therapy', sinceWeek: 1 },
    }
    const { effective, foregone } = resolveDowntimeSlotForAgent(agent)
    expect(effective).toBe('training')
    expect(foregone).toEqual([...PLAYER_PRIMARY_DOWNTIME_MENU])
  })

  it('lists other menu actions as foregone when therapy is chosen', () => {
    const agent: Agent = {
      ...baseAgent,
      downtimeActivity: { activity: 'therapy', sinceWeek: 1 },
    }
    const { effective, foregone } = resolveDowntimeSlotForAgent(agent)
    expect(effective).toBe('therapy')
    expect(foregone).toEqual(['rest', 'coping', 'other'])
  })

  it('honors explicit downtime map entries over stale agent.downtimeActivity', () => {
    const agent: Agent = {
      ...baseAgent,
      downtimeActivity: { activity: 'rest', sinceWeek: 1 },
    }
    const { effective, foregone } = resolveDowntimeSlotForAgent(agent, {
      explicitEffective: 'coping' as DowntimeActivity,
    })
    expect(effective).toBe('coping')
    expect(foregone).toEqual(['rest', 'therapy', 'other'])
  })

  it('accepts explicit training from pre-queue snapshot after assignment returns to idle', () => {
    const agent: Agent = {
      ...baseAgent,
      assignment: { state: 'idle' },
      downtimeActivity: { activity: 'therapy', sinceWeek: 1 },
    }
    const { effective, foregone } = resolveDowntimeSlotForAgent(agent, {
      explicitEffective: 'training' as DowntimeActivity,
    })
    expect(effective).toBe('training')
    expect(foregone).toEqual([...PLAYER_PRIMARY_DOWNTIME_MENU])
  })

  it('coerces stale persisted downtimeActivity.training to rest when not in training', () => {
    const agent: Agent = {
      ...baseAgent,
      assignment: { state: 'idle' },
      downtimeActivity: { activity: 'training', sinceWeek: 1 },
    }
    const { effective } = resolveDowntimeSlotForAgent(agent)
    expect(effective).toBe('rest')
  })
})

describe('setAgentPrimaryDowntimePlan', () => {
  it('refuses to change downtime for deployed agents', () => {
    const game = createStartingState()
    const agentId = Object.keys(game.agents)[0]!
    const agent = game.agents[agentId]!
    const teamId = Object.keys(game.teams)[0] ?? 't_nightwatch'
    const locked: Agent = {
      ...agent,
      assignment: {
        state: 'assigned',
        startedWeek: game.week,
        teamId,
        caseId: 'nonexistent-case-id',
      },
    }
    const lockedGame = { ...game, agents: { ...game.agents, [agentId]: locked } }
    const next = setAgentPrimaryDowntimePlan(lockedGame, agentId, 'therapy')
    expect(next.agents[agentId]?.downtimeActivity?.activity).not.toBe('therapy')
  })
})

describe('advanceRecoveryDowntimeForWeek foregone metadata', () => {
  it('persists foregoneThisInterval on the agent downtime record', () => {
    const agents = {
      a1: {
        ...baseAgent,
        recoveryStatus: { state: 'recovering' as const, sinceWeek: 1 },
        trauma: { traumaLevel: 1, traumaTags: [], lastEventWeek: 1 },
        downtimeActivity: { activity: 'coping' as DowntimeActivity, sinceWeek: 1 },
        fatigue: 40,
      },
    }
    const result = advanceRecoveryDowntimeForWeek({
      week: 3,
      sourceAgents: agents,
      sourceTeams: {},
      downtimeAssignments: { a1: 'coping' as DowntimeActivity },
    })
    const updated = result.updatedAgents.a1
    expect(updated.downtimeActivity?.activity).toBe('coping')
    expect(updated.downtimeActivity?.foregoneThisInterval).toEqual(['rest', 'therapy', 'other'])
    expect(formatForegoneDowntimeSummary(updated.downtimeActivity?.foregoneThisInterval ?? [])).toContain(
      'Therapy'
    )
  })
})

describe('advanceWeek + training completion (SPE-1699)', () => {
  it('keeps the training slot for downtime on the week academy training completes', () => {
    const state = createStartingState()
    const combatDrills = trainingCatalog.find((p) => p.trainingId === 'combat-drills')
    expect(combatDrills).toBeDefined()
    const queued = queueTraining(state, 'a_ava', combatDrills!.trainingId)
    expect(queued.agents.a_ava.assignment?.state).toBe('training')
    const prepared = {
      ...queued,
      trainingQueue: queued.trainingQueue.map((e) =>
        e.agentId === 'a_ava' ? { ...e, remainingWeeks: 1 } : e
      ),
    }
    const next = advanceWeek(prepared)
    expect(next.agents.a_ava.assignment?.state).toBe('idle')
    expect(next.agents.a_ava.downtimeActivity?.activity).toBe('training')
  })
})

describe('canSelectPrimaryDowntimePlan', () => {
  it('allows idle agents and blocks assigned or training', () => {
    expect(canSelectPrimaryDowntimePlan({ ...baseAgent, assignment: { state: 'idle' } })).toBe(true)
    expect(
      canSelectPrimaryDowntimePlan({
        ...baseAgent,
        assignment: {
          state: 'assigned',
          startedWeek: 1,
          teamId: 't1',
          caseId: 'case-fixture-001',
        },
      })
    ).toBe(false)
    expect(
      canSelectPrimaryDowntimePlan({
        ...baseAgent,
        assignment: { state: 'training', startedWeek: 1, trainingProgramId: 'x' },
      })
    ).toBe(false)
  })
})
