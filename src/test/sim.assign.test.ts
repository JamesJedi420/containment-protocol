// cspell:words greentape unassignment
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { assignTeam, launchMajorIncident, unassignTeam } from '../domain/sim/assign'
import type { OperationEvent } from '../domain/models'

describe('assignTeam', () => {
  it('returns the same state when the target case does not exist', () => {
    const state = createStartingState()

    expect(assignTeam(state, 'missing-case', 't_nightwatch')).toBe(state)
  })

  it('returns the same state when the target team does not exist', () => {
    const state = createStartingState()

    expect(assignTeam(state, 'case-001', 'missing-team')).toBe(state)
  })

  it('returns the same state when the case is already resolved', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      status: 'resolved',
    }

    expect(assignTeam(state, 'case-001', 't_nightwatch')).toBe(state)
  })

  it('keeps case and team assignment state aligned when reassigning a standard case', () => {
    const withAlpha = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    const withBravo = assignTeam(withAlpha, 'case-001', 't_greentape')

    expect(withBravo.cases['case-001'].assignedTeamIds).toEqual(['t_greentape'])
    expect(withBravo.teams['t_nightwatch'].assignedCaseId).toBeUndefined()
    expect(withBravo.teams['t_greentape'].assignedCaseId).toBe('case-001')
  })

  it('emits assignment events for new and replaced team assignments', () => {
    const withAlpha = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    const withBravo = assignTeam(withAlpha, 'case-001', 't_greentape')

    expect(withAlpha.events.at(-1)).toMatchObject({
      type: 'assignment.team_assigned',
      sourceSystem: 'assignment',
      payload: expect.objectContaining({
        caseId: 'case-001',
        teamId: 't_nightwatch',
        assignedTeamCount: 1,
      }),
    })

    expect(withBravo.events.slice(-2)).toEqual([
      expect.objectContaining({
        type: 'assignment.team_unassigned',
        payload: expect.objectContaining({
          caseId: 'case-001',
          teamId: 't_nightwatch',
        }),
      }),
      expect.objectContaining({
        type: 'assignment.team_assigned',
        payload: expect.objectContaining({
          caseId: 'case-001',
          teamId: 't_greentape',
        }),
      }),
    ])
  })

  it('does not corrupt team state when a raid is already at max capacity', () => {
    const state = createStartingState()

    state.teams['team-charlie'] = {
      id: 'team-charlie',
      name: 'Charlie Unit',
      agentIds: [],
      tags: ['support'],
    }
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      kind: 'raid',
      raid: { minTeams: 2, maxTeams: 2 },
      status: 'in_progress',
      assignedTeamIds: ['t_nightwatch', 't_greentape'],
      weeksRemaining: 1,
    }
    state.teams['t_nightwatch'] = { ...state.teams['t_nightwatch'], assignedCaseId: 'case-001' }
    state.teams['t_greentape'] = { ...state.teams['t_greentape'], assignedCaseId: 'case-001' }

    const next = assignTeam(state, 'case-001', 'team-charlie')

    expect(next).not.toBe(state)
    expect(next.cases['case-001'].assignedTeamIds).toEqual(['t_nightwatch', 't_greentape'])
    expect(next.teams['team-charlie'].assignedCaseId).toBeUndefined()
    expect(next.teams['t_nightwatch'].status?.assignedCaseId).toBe('case-001')
    expect(next.teams['t_greentape'].status?.assignedCaseId).toBe('case-001')
  })

  it('returns the same state when the team is already assigned to another case', () => {
    const state = createStartingState()
    state.teams['t_nightwatch'] = {
      ...state.teams['t_nightwatch'],
      assignedCaseId: 'case-002',
    }

    const next = assignTeam(state, 'case-001', 't_nightwatch')

    expect(next).not.toBe(state)
    expect(next.cases['case-001'].assignedTeamIds).toEqual([])
    expect(next.teams['t_nightwatch'].status?.assignedCaseId).toBe(null)
  })

  it('rejects assignments that do not satisfy required tags', () => {
    const state = createStartingState()
    state.cases['case-003'] = {
      ...state.cases['case-003'],
      requiredTags: ['tech'],
    }

    const next = assignTeam(state, 'case-003', 't_greentape')

    expect(next).toBe(state)
    expect(next.cases['case-003'].assignedTeamIds).toEqual([])
    expect(next.teams['t_greentape'].assignedCaseId).toBeUndefined()
  })

  it('rejects assignments that do not satisfy required role coverage', () => {
    const state = createStartingState()
    state.cases['case-003'] = {
      ...state.cases['case-003'],
      requiredTags: [],
      requiredRoles: ['containment', 'technical'],
    }

    const next = assignTeam(state, 'case-003', 't_greentape')

    expect(next).toBe(state)
    expect(next.cases['case-003'].assignedTeamIds).toEqual([])
    expect(next.teams['t_greentape'].assignedCaseId).toBeUndefined()
  })

  it('rejects assignments when the only matching capability comes from a dead agent', () => {
    const state = createStartingState()
    state.cases['case-003'] = {
      ...state.cases['case-003'],
      requiredTags: ['tech'],
    }

    state.agents['a_rook'] = {
      ...state.agents['a_rook'],
      status: 'dead',
    }

    const next = assignTeam(state, 'case-003', 't_nightwatch')

    expect(next).not.toBe(state)
    expect(next.cases['case-003'].assignedTeamIds).toEqual([])
    expect(next.teams['t_nightwatch'].assignedCaseId).toBeUndefined()
    expect(next.teams['t_nightwatch'].derivedStats?.overall).toBeGreaterThan(0)
  })

  it('cleans stale missing raid team ids when evaluating required tags', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      kind: 'raid',
      raid: { minTeams: 2, maxTeams: 3 },
      requiredTags: ['tech'],
      assignedTeamIds: ['missing-team'],
    }

    const next = assignTeam(state, 'case-001', 't_nightwatch')

    expect(next).not.toBe(state)
    expect(next.cases['case-001'].assignedTeamIds).toEqual(['t_nightwatch'])
    expect(next.teams['t_nightwatch'].assignedCaseId).toBe('case-001')
  })

  it('rejects raid additions from squads with no deployable members even when other teams satisfy the case', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      kind: 'raid',
      raid: { minTeams: 2, maxTeams: 3 },
      requiredTags: ['tech'],
      requiredRoles: ['technical'],
      assignedTeamIds: ['t_nightwatch'],
    }
    state.teams['t_nightwatch'] = { ...state.teams['t_nightwatch'], assignedCaseId: 'case-001' }
    state.teams['team-empty'] = {
      id: 'team-empty',
      name: 'Empty Frame',
      agentIds: ['a_brass'],
      memberIds: ['a_brass'],
      leaderId: 'a_brass',
      tags: [],
    }
    state.agents['a_brass'] = {
      ...state.agents['a_casey'],
      id: 'a_brass',
      name: 'Brass',
      status: 'dead',
    }

    const next = assignTeam(state, 'case-001', 'team-empty')

    expect(next).not.toBe(state)
    expect(next.cases['case-001'].assignedTeamIds).toEqual(['t_nightwatch'])
    expect(next.teams['team-empty'].assignedCaseId).toBeUndefined()
    expect(next.teams['team-empty'].status).toBeDefined()
  })
})

describe('unassignTeam', () => {
  it('clears every assigned team when teamId is omitted for a raid', () => {
    const state = createStartingState()

    state.cases['case-001'] = {
      ...state.cases['case-001'],
      kind: 'raid',
      raid: { minTeams: 2, maxTeams: 2 },
      status: 'in_progress',
      assignedTeamIds: ['team-alpha', 'team-bravo'],
      weeksRemaining: 2,
    }
    state.teams['team-alpha'] = { ...state.teams['team-alpha'], assignedCaseId: 'case-001' }
    state.teams['team-bravo'] = { ...state.teams['team-bravo'], assignedCaseId: 'case-001' }

    const next = unassignTeam(state, 'case-001')

    expect(next.cases['case-001'].assignedTeamIds).toEqual([])
    expect(next.cases['case-001'].status).toBe('open')
    expect(next.cases['case-001'].weeksRemaining).toBeUndefined()
    expect(next.teams['team-alpha'].assignedCaseId).toBeUndefined()
    expect(next.teams['team-bravo'].assignedCaseId).toBeUndefined()
  })

  it('returns the same state when the case does not exist', () => {
    const state = createStartingState()

    expect(unassignTeam(state, 'missing-case')).toBe(state)
  })

  it('returns the same state when the requested team is not assigned to the case', () => {
    const state = createStartingState()

    expect(unassignTeam(state, 'case-001', 't_nightwatch')).toBe(state)
  })

  it('emits unassignment events for removed teams', () => {
    const assigned = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    const next = unassignTeam(assigned, 'case-001', 't_nightwatch')

    expect(next.events.at(-1)).toMatchObject({
      type: 'assignment.team_unassigned',
      sourceSystem: 'assignment',
      payload: expect.objectContaining({
        caseId: 'case-001',
        teamId: 't_nightwatch',
        remainingTeamCount: 0,
      }),
    })
  })

  it('resets weeksRemaining to durationWeeks after unassign-all followed by reassign', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      kind: 'raid',
      raid: { minTeams: 2, maxTeams: 2 },
      status: 'in_progress',
      weeksRemaining: 1,
      assignedTeamIds: ['t_nightwatch', 't_greentape'],
    }
    state.teams['t_nightwatch'] = { ...state.teams['t_nightwatch'], assignedCaseId: 'case-001' }
    state.teams['t_greentape'] = { ...state.teams['t_greentape'], assignedCaseId: 'case-001' }

    const cleared = unassignTeam(state, 'case-001')
    const reassigned = assignTeam(cleared, 'case-001', 't_nightwatch')

    expect(cleared.cases['case-001'].status).toBe('open')
    expect(cleared.cases['case-001'].weeksRemaining).toBeUndefined()
    expect(reassigned.cases['case-001'].weeksRemaining).toBe(
      reassigned.cases['case-001'].durationWeeks
    )
  })

  it('preserves deterministic assignment event ordering across rapid reassignments', () => {
    const assignedNightWatch = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    const assignedGreenTape = assignTeam(assignedNightWatch, 'case-001', 't_greentape')
    const assignedBackNightWatch = assignTeam(assignedGreenTape, 'case-001', 't_nightwatch')

    const lastFiveEvents = assignedBackNightWatch.events.slice(-5) as Array<
      OperationEvent<'assignment.team_assigned' | 'assignment.team_unassigned'>
    >

    expect(lastFiveEvents.map((event) => event.type)).toEqual([
      'assignment.team_assigned',
      'assignment.team_unassigned',
      'assignment.team_assigned',
      'assignment.team_unassigned',
      'assignment.team_assigned',
    ])

    expect(lastFiveEvents.map((event) => event.payload.teamId)).toEqual([
      't_nightwatch',
      't_nightwatch',
      't_greentape',
      't_greentape',
      't_nightwatch',
    ])

    expect(assignedBackNightWatch.cases['case-001'].assignedTeamIds).toEqual(['t_nightwatch'])
    expect(assignedBackNightWatch.teams['t_nightwatch'].assignedCaseId).toBe('case-001')
    expect(assignedBackNightWatch.teams['t_greentape'].assignedCaseId).toBeUndefined()
  })
})

describe('launchMajorIncident', () => {
  it('requires every required team before an operational incident starts', () => {
    const state = createOperationalMajorIncidentState()

    const next = launchMajorIncident(state, 'major-incident', ['team-alpha', 'team-bravo'])

    expect(next.cases['major-incident'].status).toBe('open')
    expect(next.cases['major-incident'].assignedTeamIds).toEqual([])
  })

  it('locks all selected teams for the full duration once the incident launches', () => {
    const state = createOperationalMajorIncidentState()

    const next = launchMajorIncident(
      state,
      'major-incident',
      ['team-alpha', 'team-bravo', 'team-charlie'],
      'balanced',
      ['medical_supplies']
    )

    expect(next.cases['major-incident'].status).toBe('in_progress')
    expect(next.cases['major-incident'].assignedTeamIds).toEqual([
      'team-alpha',
      'team-bravo',
      'team-charlie',
    ])
    expect(next.cases['major-incident'].majorIncident?.requiredTeams).toBe(3)
    expect(next.teams['team-alpha'].assignedCaseId).toBe('major-incident')
    expect(next.teams['team-bravo'].assignedCaseId).toBe('major-incident')
    expect(next.teams['team-charlie'].assignedCaseId).toBe('major-incident')
    expect(next.inventory['medical_supplies']).toBe(state.inventory['medical_supplies'] - 2)
  })

  it('does not allow active major incident teams to be unassigned mid-operation', () => {
    const state = createOperationalMajorIncidentState()
    const launched = launchMajorIncident(
      state,
      'major-incident',
      ['team-alpha', 'team-bravo', 'team-charlie']
    )

    const next = unassignTeam(launched, 'major-incident', 'team-alpha')

    expect(next.cases['major-incident'].assignedTeamIds).toEqual([
      'team-alpha',
      'team-bravo',
      'team-charlie',
    ])
    expect(next.teams['team-alpha'].assignedCaseId).toBe('major-incident')
  })
})

function createOperationalMajorIncidentState() {
  const state = createStartingState()
  const baseAgent = state.agents.a_ava

  state.agents['agent-alpha'] = {
    ...baseAgent,
    id: 'agent-alpha',
    name: 'Alpha',
    role: 'hunter',
    baseStats: { combat: 90, investigation: 80, utility: 74, social: 50 },
    fatigue: 5,
    status: 'active',
  }
  state.agents['agent-bravo'] = {
    ...baseAgent,
    id: 'agent-bravo',
    name: 'Bravo',
    role: 'tech',
    baseStats: { combat: 72, investigation: 86, utility: 92, social: 46 },
    fatigue: 7,
    status: 'active',
  }
  state.agents['agent-charlie'] = {
    ...baseAgent,
    id: 'agent-charlie',
    name: 'Charlie',
    role: 'field_recon',
    baseStats: { combat: 74, investigation: 88, utility: 90, social: 54 },
    fatigue: 9,
    status: 'active',
  }

  state.teams['team-alpha'] = {
    id: 'team-alpha',
    name: 'Alpha Team',
    agentIds: ['agent-alpha'],
    memberIds: ['agent-alpha'],
    leaderId: 'agent-alpha',
    tags: ['field'],
  }
  state.teams['team-bravo'] = {
    id: 'team-bravo',
    name: 'Bravo Team',
    agentIds: ['agent-bravo'],
    memberIds: ['agent-bravo'],
    leaderId: 'agent-bravo',
    tags: ['tech'],
  }
  state.teams['team-charlie'] = {
    id: 'team-charlie',
    name: 'Charlie Team',
    agentIds: ['agent-charlie'],
    memberIds: ['agent-charlie'],
    leaderId: 'agent-charlie',
    tags: ['recon'],
  }

  state.inventory['medical_supplies'] = 5

  state.cases['major-incident'] = {
    ...state.cases['case-003'],
    id: 'major-incident',
    title: 'City Fracture',
    kind: 'raid',
    stage: 3,
    deadlineRemaining: 1,
    durationWeeks: 4,
    requiredTags: [],
    requiredRoles: [],
    raid: { minTeams: 2, maxTeams: 4 },
    assignedTeamIds: [],
  }

  return state
}
