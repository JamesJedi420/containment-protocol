import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { assignTeam } from '../domain/sim/assign'
import {
  buildAgentSquadCompositionProfile,
  getTeamAssignedCaseId,
  getTeamMembers,
  getTeamMemberIds,
  getUniqueTeamMembers,
  resolutionProfileToLegacyStats,
  syncTeamSimulationState,
} from '../domain/teamSimulation'

describe('teamSimulation', () => {
  it('hydrates canonical team fields onto the starting state', () => {
    const state = createStartingState()
    const team = state.teams['t_nightwatch']

    expect(getTeamMemberIds(team)).toEqual(team.agentIds)
    expect(team.memberIds).toEqual(team.agentIds)
    expect(team.leaderId).toBeTruthy()
    expect(team.memberIds).toContain(team.leaderId!)
    expect(team.derivedStats?.overall).toBeGreaterThan(0)
    expect(team.status).toEqual({
      state: 'ready',
      assignedCaseId: null,
    })
  })

  it('keeps canonical status mirrored with legacy assignment fields', () => {
    const state = syncTeamSimulationState(
      assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    )
    const team = state.teams['t_nightwatch']

    expect(getTeamAssignedCaseId(team)).toBe('case-001')
    expect(team.assignedCaseId).toBe('case-001')
    expect(team.status?.assignedCaseId).toBe('case-001')
    expect(team.status?.state).toMatch(/deployed|resolving/)
  })

  it('prefers canonical status assignment over legacy alias when both are present', () => {
    const state = createStartingState()
    const conflictingTeam = {
      ...state.teams['t_nightwatch'],
      status: {
        ...state.teams['t_nightwatch'].status,
        assignedCaseId: 'case-001',
      },
      assignedCaseId: 'case-003',
    }

    expect(getTeamAssignedCaseId(conflictingTeam)).toBe('case-001')
  })

  it('builds a squad composition profile with readiness and chemistry outputs', () => {
    const state = createStartingState()
    const agents = [state.agents['a_ava'], state.agents['a_kellan']]
    agents[0].fatigue = 40
    agents[1].assignment = { state: 'training', startedWeek: state.week, teamId: 't_nightwatch' }

    const profile = buildAgentSquadCompositionProfile(agents, 'a_ava')

    expect(profile.leaderId).toBe('a_ava')
    expect(profile.derivedStats.fieldPower).toBeGreaterThan(0)
    expect(profile.derivedStats.chemistryScore).toBeGreaterThanOrEqual(0)
    expect(profile.derivedStats.readiness).toBeLessThan(100)
    expect(profile.resolutionProfile.fieldPower).toBeGreaterThan(0)
    expect(profile.chemistryProfile.pairs).toBe(1)
    expect(profile.synergyProfile.active.length).toBeGreaterThanOrEqual(0)
    expect(profile.leaderResolutionProfile?.fieldPower).toBeGreaterThan(0)
    expect(profile.leaderBonus.effectivenessMultiplier).toBeGreaterThanOrEqual(1)
    expect(profile.projectedCaseStats).toEqual(
      resolutionProfileToLegacyStats(profile.resolutionProfile)
    )
    expect(profile.projectedCaseStats.combat).toBeGreaterThan(0)
    expect(profile.agentProfiles).toHaveLength(2)
    expect(profile.agentProfiles[0]?.performance.agentId).toBe(profile.agentPerformance[0]?.agentId)
    expect(profile.agentPerformance).toHaveLength(2)
    expect(profile.performanceSummary.contribution).toBeCloseTo(
      profile.agentPerformance.reduce((total, entry) => total + entry.contribution, 0),
      6
    )
    expect(profile.performanceSummary.threatHandled).toBeCloseTo(
      profile.agentPerformance.reduce((total, entry) => total + entry.threatHandled, 0),
      6
    )
    expect(profile.performanceSummary.evidenceGathered).toBeCloseTo(
      profile.agentPerformance.reduce((total, entry) => total + entry.evidenceGathered, 0),
      6
    )
    expect(profile.resolutionProfile.fieldPower).toBeCloseTo(
      profile.agentPerformance.reduce((total, entry) => total + entry.fieldPower, 0),
      6
    )
    expect(profile.resolutionProfile.containment).toBeCloseTo(
      profile.agentPerformance.reduce((total, entry) => total + entry.containment, 0),
      6
    )
    expect(profile.derivedStats.fieldPower).toBe(
      Math.round(profile.resolutionProfile.fieldPower / profile.agentPerformance.length)
    )
    expect(profile.derivedStats.support).toBe(
      Math.round(profile.resolutionProfile.support / profile.agentPerformance.length)
    )
  })

  it('uses one canonical helper path for team member ids and resolved agent objects', () => {
    const state = createStartingState()
    const inconsistentTeam = {
      ...state.teams['t_nightwatch'],
      memberIds: ['a_ava'],
      agentIds: ['a_ava', 'a_kellan'],
    }

    expect(getTeamMemberIds(inconsistentTeam)).toEqual(['a_ava', 'a_kellan'])
    expect(getTeamMembers(inconsistentTeam, state.agents).map((agent) => agent.id)).toEqual([
      'a_ava',
      'a_kellan',
    ])

    const teams = {
      alpha: inconsistentTeam,
      bravo: {
        ...state.teams['t_greentape'],
        memberIds: ['a_kellan'],
        agentIds: ['a_kellan'],
      },
    }

    expect(getUniqueTeamMembers(['alpha', 'bravo'], teams, state.agents).map((agent) => agent.id)).toEqual([
      'a_ava',
      'a_kellan',
    ])
  })

  it('keeps derived stats finite when agents contain malformed fatigue values', () => {
    const state = createStartingState()
    const agents = [
      { ...state.agents['a_ava'], fatigue: Number.NaN },
      { ...state.agents['a_kellan'], fatigue: Number.POSITIVE_INFINITY },
    ]

    const profile = buildAgentSquadCompositionProfile(agents, agents[0].id)

    expect(Number.isFinite(profile.derivedStats.readiness)).toBe(true)
    expect(Number.isFinite(profile.derivedStats.overall)).toBe(true)
    expect(Number.isFinite(profile.derivedStats.fieldPower)).toBe(true)
    expect(profile.derivedStats.readiness).toBeGreaterThanOrEqual(0)
    expect(profile.derivedStats.readiness).toBeLessThanOrEqual(100)
  })
})
