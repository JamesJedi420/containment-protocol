import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { releaseTeamsFromCases } from '../domain/sim/teamRelease'

describe('releaseTeamsFromCases', () => {
  it('returns the same teams object when no team ids are provided', () => {
    const state = createStartingState()

    expect(releaseTeamsFromCases(state.teams, [])).toBe(state.teams)
  })

  it('clears assigned case pointers only for targeted teams', () => {
    const state = createStartingState()
    state.teams['t_nightwatch'] = {
      ...state.teams['t_nightwatch'],
      assignedCaseId: 'case-001',
      status: {
        ...(state.teams['t_nightwatch'].status ?? { state: 'ready', assignedCaseId: null }),
        assignedCaseId: 'case-001',
      },
    }
    state.teams['t_greentape'] = {
      ...state.teams['t_greentape'],
      assignedCaseId: 'case-002',
      status: {
        ...(state.teams['t_greentape'].status ?? { state: 'ready', assignedCaseId: null }),
        assignedCaseId: 'case-002',
      },
    }

    const nextTeams = releaseTeamsFromCases(state.teams, ['t_nightwatch'])

    expect(nextTeams['t_nightwatch'].assignedCaseId).toBeUndefined()
    expect(nextTeams['t_nightwatch'].status?.assignedCaseId ?? null).toBeNull()
    expect(nextTeams['t_greentape'].assignedCaseId).toBe('case-002')
    expect(nextTeams['t_greentape'].status?.assignedCaseId).toBe('case-002')
  })
})