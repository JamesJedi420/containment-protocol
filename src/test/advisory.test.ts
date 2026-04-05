import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { getAdvisories } from '../domain/advisory'
import { assignTeam } from '../domain/sim/assign'
import { syncTeamSimulationState } from '../domain/teamSimulation'

describe('getAdvisories', () => {
  it('recommends a ready team for an unassigned case', () => {
    const game = createStartingState()

    game.teams = {
      t_nightwatch: game.teams['t_nightwatch'],
    }
    game.cases = {
      'case-001': {
        ...game.cases['case-001'],
        assignedTeamIds: [],
        status: 'open',
      },
    }

    const advisories = getAdvisories(syncTeamSimulationState(game))

    expect(advisories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'team_arrangement',
          caseId: 'case-001',
          teamId: 't_nightwatch',
        }),
      ])
    )
  })

  it('warns when no ready team covers the required baseline roles', () => {
    const game = createStartingState()

    game.teams = {
      t_nightwatch: {
        ...game.teams['t_nightwatch'],
        memberIds: ['a_ava'],
        agentIds: ['a_ava'],
        leaderId: 'a_ava',
      },
    }
    game.cases = {
      'case-001': {
        ...game.cases['case-001'],
        assignedTeamIds: [],
        status: 'open',
        requiredRoles: ['support', 'technical'],
      },
    }

    const advisories = getAdvisories(syncTeamSimulationState(game))

    expect(advisories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'role_coverage',
          caseId: 'case-001',
        }),
      ])
    )
  })

  it('flags unstable teams from readiness and relationship chemistry', () => {
    const game = assignTeam(createStartingState(), 'case-001', 't_nightwatch')

    for (const agentId of game.teams['t_nightwatch']?.agentIds ?? []) {
      game.agents[agentId] = {
        ...game.agents[agentId],
        fatigue: 72,
      }
    }

    game.agents['a_ava'] = {
      ...game.agents['a_ava'],
      relationships: { ...game.agents['a_ava'].relationships, a_kellan: -2 },
    }
    game.agents['a_kellan'] = {
      ...game.agents['a_kellan'],
      relationships: { ...game.agents['a_kellan'].relationships, a_ava: -2 },
    }

    const advisories = getAdvisories(syncTeamSimulationState(game))

    expect(advisories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'instability',
          teamId: 't_nightwatch',
          caseId: 'case-001',
        }),
      ])
    )
  })

  it('suggests reserve-agent synergy unlocks without mutating teams', () => {
    const game = createStartingState()

    game.teams = {
      t_nightwatch: {
        ...game.teams['t_nightwatch'],
        memberIds: ['a_ava', 'a_rook'],
        agentIds: ['a_ava', 'a_rook'],
        leaderId: 'a_ava',
      },
    }
    game.cases = {}

    const advisories = getAdvisories(syncTeamSimulationState(game))

    expect(advisories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'synergy_unlock',
          teamId: 't_nightwatch',
          agentId: 'a_kellan',
        }),
      ])
    )
    expect(game.teams['t_nightwatch']?.agentIds).toEqual(['a_ava', 'a_rook'])
  })
})
