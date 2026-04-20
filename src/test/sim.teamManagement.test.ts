// cspell:words editability greentape sato
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { assignTeam } from '../domain/sim/assign'
import {
  createTeam,
  deleteEmptyTeam,
  getReserveAgents,
  getTeamEditability,
  getTeamMoveEligibility,
  moveAgentBetweenTeams,
  renameTeam,
  setTeamLeader,
} from '../domain/sim/teamManagement'

// ── helpers ─────────────────────────────────────────────────────────────────

/** Pull a known agent out of the starter roster. */
const ALPHA_TEAM = 't_nightwatch'
const BRAVO_TEAM = 't_greentape'

// Night Watch members from starterRoster
const ALPHA_AGENT = 'a_ava' // member of t_nightwatch
const BRAVO_AGENT = 'a_sato' // member of t_greentape

// ── createTeam ───────────────────────────────────────────────────────────────

describe('createTeam', () => {
  it('adds a new team with the seed agent as leader', () => {
    const state = createStartingState()
    const next = createTeam(state, 'Delta Squad', BRAVO_AGENT)

    const teamEntries = Object.values(next.teams)
    const newTeam = teamEntries.find((t) => t.name === 'Delta Squad')
    expect(newTeam).toBeDefined()
    expect(newTeam?.leaderId).toBe(BRAVO_AGENT)
    expect(newTeam?.memberIds).toContain(BRAVO_AGENT)
  })

  it('removes the seed agent from their original team', () => {
    const state = createStartingState()
    const next = createTeam(state, 'Delta Squad', BRAVO_AGENT)

    expect(next.teams[BRAVO_TEAM].memberIds).not.toContain(BRAVO_AGENT)
  })

  it('returns unchanged state when the name is already taken', () => {
    const state = createStartingState()
    const existingName = state.teams[ALPHA_TEAM].name
    const next = createTeam(state, existingName, BRAVO_AGENT)

    expect(Object.keys(next.teams)).toHaveLength(Object.keys(state.teams).length)
  })

  it('returns unchanged state when the seed agent does not exist', () => {
    const state = createStartingState()
    const next = createTeam(state, 'Ghost Team', 'nonexistent-agent')

    expect(Object.keys(next.teams)).toHaveLength(Object.keys(state.teams).length)
  })

  it('returns unchanged state when the name is empty or whitespace only', () => {
    const state = createStartingState()
    const next = createTeam(state, '   ', BRAVO_AGENT)

    expect(Object.keys(next.teams)).toHaveLength(Object.keys(state.teams).length)
  })
})

// ── renameTeam ───────────────────────────────────────────────────────────────

describe('renameTeam', () => {
  it('renames the team when the new name is unique', () => {
    const state = createStartingState()
    const next = renameTeam(state, ALPHA_TEAM, 'Alpha Unit')

    expect(next.teams[ALPHA_TEAM].name).toBe('Alpha Unit')
  })

  it('trims and collapses whitespace in the new name', () => {
    const state = createStartingState()
    const next = renameTeam(state, ALPHA_TEAM, '  Alpha  Unit  ')

    expect(next.teams[ALPHA_TEAM].name).toBe('Alpha Unit')
  })

  it('returns unchanged state when the name conflicts with another team', () => {
    const state = createStartingState()
    const otherName = state.teams[BRAVO_TEAM].name
    const next = renameTeam(state, ALPHA_TEAM, otherName)

    expect(next.teams[ALPHA_TEAM].name).toBe(state.teams[ALPHA_TEAM].name)
  })

  it('returns unchanged state when the team id does not exist', () => {
    const state = createStartingState()
    const next = renameTeam(state, 'nonexistent-team', 'New Name')

    expect(next).toBe(state)
  })

  it('returns unchanged state when the team is deployed to a case', () => {
    const state = createStartingState()
    // mark the team as deployed
    state.teams[ALPHA_TEAM] = {
      ...state.teams[ALPHA_TEAM],
      assignedCaseId: 'case-001',
    }
    const next = renameTeam(state, ALPHA_TEAM, 'Deployed Rename')

    expect(next.teams[ALPHA_TEAM].name).toBe(state.teams[ALPHA_TEAM].name)
  })
})

// ── setTeamLeader ────────────────────────────────────────────────────────────

describe('setTeamLeader', () => {
  it('sets a valid team member as leader', () => {
    const state = createStartingState()
    // pick a non-leader member of ALPHA_TEAM
    const members = state.teams[ALPHA_TEAM].memberIds ?? state.teams[ALPHA_TEAM].agentIds ?? []
    const nonLeader = members.find((id: string) => id !== state.teams[ALPHA_TEAM].leaderId)!

    const next = setTeamLeader(state, ALPHA_TEAM, nonLeader)

    expect(next.teams[ALPHA_TEAM].leaderId).toBe(nonLeader)
  })

  it('falls back to first alive member when cleared (null leader does not survive normalization)', () => {
    const state = createStartingState()
    const next = setTeamLeader(state, ALPHA_TEAM, null)

    // normalizeGameState auto-assigns the first alive member as leader
    const memberIds = state.teams[ALPHA_TEAM].memberIds ?? state.teams[ALPHA_TEAM].agentIds ?? []
    expect(next.teams[ALPHA_TEAM].leaderId).toBe(memberIds[0])
  })

  it('returns unchanged state when the agent is not a team member', () => {
    const state = createStartingState()
    const next = setTeamLeader(state, ALPHA_TEAM, BRAVO_AGENT)

    expect(next.teams[ALPHA_TEAM].leaderId).toBe(state.teams[ALPHA_TEAM].leaderId)
  })

  it('returns unchanged state when the team does not exist', () => {
    const state = createStartingState()
    const next = setTeamLeader(state, 'ghost-team', ALPHA_AGENT)

    expect(next).toBe(state)
  })
})

// ── moveAgentBetweenTeams ────────────────────────────────────────────────────

describe('moveAgentBetweenTeams', () => {
  it('moves an agent from one team to another', () => {
    const state = createStartingState()
    const next = moveAgentBetweenTeams(state, BRAVO_AGENT, ALPHA_TEAM)

    expect(next.teams[ALPHA_TEAM].memberIds).toContain(BRAVO_AGENT)
    expect(next.teams[BRAVO_TEAM].memberIds).not.toContain(BRAVO_AGENT)
  })

  it('moves an agent to the reserve pool (no target team)', () => {
    const state = createStartingState()
    const next = moveAgentBetweenTeams(state, BRAVO_AGENT, null)

    expect(getReserveAgents(next).some((a) => a.id === BRAVO_AGENT)).toBe(true)
    expect(next.teams[BRAVO_TEAM].memberIds).not.toContain(BRAVO_AGENT)
  })

  it('returns unchanged state when moving to a non-existent team', () => {
    const state = createStartingState()
    const next = moveAgentBetweenTeams(state, BRAVO_AGENT, 'ghost-team')

    expect(next).toBe(state)
  })

  it('returns unchanged state when moving to the same team the agent is already in', () => {
    const state = createStartingState()
    const next = moveAgentBetweenTeams(state, BRAVO_AGENT, BRAVO_TEAM)

    expect(next).toBe(state)
  })

  it('does not move the agent when the source team is deployed', async () => {
    // Use assignTeam to get a properly normalized deployed state
    const state = assignTeam(createStartingState(), 'case-001', BRAVO_TEAM)
    const next = moveAgentBetweenTeams(state, BRAVO_AGENT, ALPHA_TEAM)

    expect(next.teams[BRAVO_TEAM].memberIds).toContain(BRAVO_AGENT)
    expect(next.teams[ALPHA_TEAM].memberIds).not.toContain(BRAVO_AGENT)
  })
})

// ── deleteEmptyTeam ──────────────────────────────────────────────────────────

describe('deleteEmptyTeam', () => {
  it('deletes a team that has no members', () => {
    const state = createStartingState()
    // move all members out of BRAVO to have an empty team
    const members = [...(state.teams[BRAVO_TEAM].memberIds ?? [])]
    let s = state
    for (const id of members) {
      s = moveAgentBetweenTeams(s, id, null)
    }
    const teamsBefore = Object.keys(s.teams).length
    const next = deleteEmptyTeam(s, BRAVO_TEAM)

    expect(Object.keys(next.teams)).toHaveLength(teamsBefore - 1)
    expect(next.teams[BRAVO_TEAM]).toBeUndefined()
  })

  it('returns unchanged state when the team still has members', () => {
    const state = createStartingState()
    const next = deleteEmptyTeam(state, ALPHA_TEAM)

    expect(next).toBe(state)
    expect(next.teams[ALPHA_TEAM]).toBeDefined()
  })

  it('returns unchanged state when the team does not exist', () => {
    const state = createStartingState()
    const next = deleteEmptyTeam(state, 'ghost-team')

    expect(next).toBe(state)
  })
})

// ── getReserveAgents ─────────────────────────────────────────────────────────

describe('getReserveAgents', () => {
  it('returns empty list when all agents are on teams', () => {
    const state = createStartingState()
    expect(getReserveAgents(state)).toHaveLength(0)
  })

  it('returns an agent moved to the reserve pool', () => {
    const state = createStartingState()
    const next = moveAgentBetweenTeams(state, BRAVO_AGENT, null)

    const reserves = getReserveAgents(next)
    expect(reserves).toHaveLength(1)
    expect(reserves[0].id).toBe(BRAVO_AGENT)
  })

  it('returns agents sorted alphabetically by name', () => {
    const state = createStartingState()
    // move two agents to reserve
    let s = moveAgentBetweenTeams(state, 'a_rook', null) // "Rook"
    s = moveAgentBetweenTeams(s, 'a_ava', null) // "Ava Brooks"

    const names = getReserveAgents(s).map((a) => a.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })
})

// ── getTeamEditability ────────────────────────────────────────────────────────

describe('getTeamEditability', () => {
  it('returns editable when the team is not deployed', () => {
    const state = createStartingState()
    const result = getTeamEditability(state.teams[ALPHA_TEAM], state.cases)
    expect(result.editable).toBe(true)
  })

  it('returns non-editable with case title when deployed', () => {
    const state = createStartingState()
    state.teams[ALPHA_TEAM] = {
      ...state.teams[ALPHA_TEAM],
      assignedCaseId: 'case-001',
    }
    const result = getTeamEditability(state.teams[ALPHA_TEAM], state.cases)
    expect(result.editable).toBe(false)
    expect(result.reason).toMatch(/deployed/i)
  })

  it('returns editable when assigned case pointer is orphaned', () => {
    const state = createStartingState()
    state.teams[ALPHA_TEAM] = {
      ...state.teams[ALPHA_TEAM],
      assignedCaseId: 'missing-case',
    }

    const result = getTeamEditability(state.teams[ALPHA_TEAM], state.cases)
    expect(result.editable).toBe(true)
  })
})

// ── getTeamMoveEligibility ────────────────────────────────────────────────────

describe('getTeamMoveEligibility', () => {
  it('allows a free agent to move to a free team', () => {
    const state = createStartingState()
    const result = getTeamMoveEligibility(state, BRAVO_AGENT, ALPHA_TEAM)
    expect(result.allowed).toBe(true)
    expect(result.reasons).toHaveLength(0)
  })

  it('blocks move when agent does not exist', () => {
    const state = createStartingState()
    const result = getTeamMoveEligibility(state, 'ghost-agent', ALPHA_TEAM)
    expect(result.allowed).toBe(false)
  })

  it('blocks move when the target team is deployed', () => {
    const state = createStartingState()
    state.teams[ALPHA_TEAM] = {
      ...state.teams[ALPHA_TEAM],
      assignedCaseId: 'case-001',
    }
    const result = getTeamMoveEligibility(state, BRAVO_AGENT, ALPHA_TEAM)
    expect(result.allowed).toBe(false)
    expect(result.reasons.some((r) => /target team/i.test(r))).toBe(true)
  })

  it('blocks move when agent is already in target team', () => {
    const state = createStartingState()
    const result = getTeamMoveEligibility(state, ALPHA_AGENT, ALPHA_TEAM)
    expect(result.allowed).toBe(false)
    expect(result.reasons.some((r) => /already/i.test(r))).toBe(true)
  })
})
