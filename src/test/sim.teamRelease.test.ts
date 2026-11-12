// cspell:words greentape
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { releaseTeamsFromCases } from '../domain/sim/teamRelease'
import { getTeamAssignedCaseId } from '../domain/teamSimulation'

describe('releaseTeamsFromCases', () => {
  it('returns the same teams object when no team ids are provided', () => {
    const state = createStartingState()

    expect(releaseTeamsFromCases(state.teams, [])).toBe(state.teams)
  })

  it('clears assigned case pointers only for targeted teams', () => {
    const state = createStartingState()
    state.teams['t_nightwatch'] = {
      ...state.teams['t_nightwatch'],
      status: {
        ...(state.teams['t_nightwatch'].status ?? { state: 'ready', assignedCaseId: null }),
        assignedCaseId: 'case-001',
      },
    }
    state.teams['t_greentape'] = {
      ...state.teams['t_greentape'],
      status: {
        ...(state.teams['t_greentape'].status ?? { state: 'ready', assignedCaseId: null }),
        assignedCaseId: 'case-002',
      },
    }

    const nextTeams = releaseTeamsFromCases(state.teams, ['t_nightwatch'])

    expect(getTeamAssignedCaseId(nextTeams['t_nightwatch'])).toBeNull()
    expect(getTeamAssignedCaseId(nextTeams['t_greentape'])).toBe('case-002')
  })
})
