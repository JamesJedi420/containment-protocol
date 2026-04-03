import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  TEAM_STATE_TRANSITIONS,
  deriveTargetTeamState,
  getTeamStateEventSequence,
  resolveTeamStatus,
  transitionTeamState,
} from '../domain/teamStateMachine'
import { assignTeam } from '../domain/sim/assign'
import { syncTeamSimulationState } from '../domain/teamSimulation'

describe('teamStateMachine', () => {
  it('defines the compact MVP transition graph', () => {
    expect(TEAM_STATE_TRANSITIONS.ready.case_assigned).toBe('deployed')
    expect(TEAM_STATE_TRANSITIONS.deployed.case_resolution_started).toBe('resolving')
    expect(TEAM_STATE_TRANSITIONS.deployed.case_released).toBe('ready')
    expect(TEAM_STATE_TRANSITIONS.resolving.recovery_started).toBe('recovering')
    expect(TEAM_STATE_TRANSITIONS.recovering.recovery_completed).toBe('ready')
  })

  it('derives a resolving target for an assigned active case', () => {
    expect(
      deriveTargetTeamState({
        assignedCaseId: 'case-001',
        caseStatus: 'in_progress',
        weeksRemaining: 2,
        readiness: 78,
        memberCount: 4,
      })
    ).toBe('resolving')
  })

  it('derives recovering when the team is unassigned but readiness is low', () => {
    expect(
      deriveTargetTeamState({
        assignedCaseId: null,
        readiness: 22,
        memberCount: 4,
      })
    ).toBe('recovering')
  })

  it('emits the expected event sequence for assignment into active resolution', () => {
    expect(getTeamStateEventSequence('ready', 'resolving')).toEqual([
      'case_assigned',
      'case_resolution_started',
    ])
  })

  it('resolves a recovering status after release when readiness is still low', () => {
    const status = resolveTeamStatus({
      currentState: 'resolving',
      assignedCaseId: null,
      readiness: 18,
      memberCount: 4,
    })

    expect(status).toEqual({
      state: 'recovering',
      assignedCaseId: null,
    })
  })

  it('moves a synced team through ready, resolving, and recovering as state changes', () => {
    const starting = createStartingState()
    expect(starting.teams['t_nightwatch'].status?.state).toBe('ready')

    const assigned = syncTeamSimulationState(assignTeam(starting, 'case-001', 't_nightwatch'))
    expect(assigned.teams['t_nightwatch'].status?.state).toBe('resolving')

    for (const agentId of assigned.teams['t_nightwatch']?.agentIds ?? []) {
      assigned.agents[agentId] = {
        ...assigned.agents[agentId],
        fatigue: 80,
      }
    }

    assigned.teams['t_nightwatch'] = {
      ...assigned.teams['t_nightwatch'],
      assignedCaseId: undefined,
    }
    assigned.cases['case-001'] = {
      ...assigned.cases['case-001'],
      assignedTeamIds: [],
      status: 'open',
      weeksRemaining: undefined,
    }

    const recovered = syncTeamSimulationState(assigned)
    expect(recovered.teams['t_nightwatch'].status?.state).toBe('recovering')
  })

  it('applies transitions deterministically one event at a time', () => {
    const state = transitionTeamState(
      transitionTeamState('ready', 'case_assigned'),
      'case_resolution_started'
    )

    expect(state).toBe('resolving')
  })
})
