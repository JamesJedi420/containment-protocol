import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { assignTeam, unassignTeam } from '../domain/sim/assign'

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

    const lastFiveEvents = assignedBackNightWatch.events.slice(-5)

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
