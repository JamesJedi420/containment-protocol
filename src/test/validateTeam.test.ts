import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  getCoverageRolesForTeam,
  validateAgents,
  validateTeam,
  validateTeamIds,
} from '../domain/validateTeam'

describe('validateTeam', () => {
  it('derives visible coverage roles from active team members', () => {
    const state = createStartingState()

    expect(getCoverageRolesForTeam(state.teams['t_nightwatch'], state.agents)).toEqual([
      'tactical',
      'containment',
      'investigator',
      'technical',
    ])
    expect(getCoverageRolesForTeam(state.teams['t_greentape'], state.agents)).toEqual([
      'containment',
      'support',
    ])
  })

  it('validates a team against required role coverage', () => {
    const state = createStartingState()
    const result = validateTeam(state.teams['t_greentape'], state.cases['case-003'], state.agents)

    expect(result.valid).toBe(false)
    expect(result.requiredRoles).toEqual(['containment', 'technical'])
    expect(result.coveredRoles).toEqual(['containment', 'support'])
    expect(result.missingRoles).toEqual(['technical'])
  })

  it('treats training and dead agents as unavailable for role coverage', () => {
    const state = createStartingState()
    state.agents['a_rook'] = {
      ...state.agents['a_rook'],
      assignment: { state: 'training', startedWeek: state.week },
    }

    const result = validateTeam(state.teams['t_nightwatch'], state.cases['case-003'], state.agents)

    expect(result.valid).toBe(false)
    expect(result.coveredRoles).toEqual(['tactical', 'containment', 'investigator'])
    expect(result.missingRoles).toEqual(['technical'])
  })

  it('tracks required tag coverage alongside role coverage', () => {
    const state = createStartingState()
    state.cases['case-003'] = {
      ...state.cases['case-003'],
      requiredRoles: [],
      requiredTags: ['tech', 'field-kit'],
    }

    const result = validateTeam(state.teams['t_nightwatch'], state.cases['case-003'], state.agents)

    expect(result.valid).toBe(true)
    expect(result.requiredTags).toEqual(['tech', 'field-kit'])
    expect(result.coveredTags).toEqual(expect.arrayContaining(['tech', 'field-kit']))
    expect(result.missingTags).toEqual([])
  })

  it('marks squads with no deployable members as invalid even without hard case requirements', () => {
    const state = createStartingState()
    state.agents['a_ava'] = { ...state.agents['a_ava'], status: 'dead' }
    state.agents['a_kellan'] = { ...state.agents['a_kellan'], status: 'dead' }
    state.agents['a_rook'] = {
      ...state.agents['a_rook'],
      assignment: { state: 'training', startedWeek: state.week },
    }
    state.agents['a_mina'] = { ...state.agents['a_mina'], status: 'resigned' }
    state.agents['a_jules'] = { ...state.agents['a_jules'], status: 'dead' }

    const result = validateTeam(
      state.teams['t_nightwatch'],
      { requiredRoles: [], requiredTags: [] },
      state.agents
    )

    expect(result.valid).toBe(false)
    expect(result.activeAgentIds).toEqual([])
    expect(result.trainingAgentIds).toEqual(['a_rook'])
    expect(result.deadAgentIds).toEqual(['a_ava', 'a_kellan', 'a_mina'])
    expect(result.inactiveAgentIds).toEqual(['a_ava', 'a_kellan', 'a_mina'])
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['no-active-members', 'training-blocked'])
    )
  })

  it('supports aggregate coverage checks across multiple teams or agent lists', () => {
    const state = createStartingState()
    const caseData = { requiredRoles: ['containment', 'support', 'technical'] as const }

    expect(
      validateTeamIds(['t_nightwatch', 't_greentape'], caseData, state.teams, state.agents)
    ).toMatchObject({
      valid: true,
      missingRoles: [],
    })

    expect(validateAgents(Object.values(state.agents), caseData)).toMatchObject({
      valid: true,
      satisfiedRoles: ['containment', 'support', 'technical'],
      missingTags: [],
    })
  })

  it('ignores stale team IDs when at least one selected team exists', () => {
    const state = createStartingState()
    const caseData = {
      requiredRoles: ['containment', 'technical'] as const,
      requiredTags: ['tech'] as const,
    }

    const result = validateTeamIds(
      ['missing-team', 't_nightwatch'],
      caseData,
      state.teams,
      state.agents
    )

    expect(result.valid).toBe(true)
    expect(result.activeAgentIds.length).toBeGreaterThan(0)
    expect(result.missingRoles).toEqual([])
    expect(result.missingTags).toEqual([])
  })

  it('returns no-active-members when all selected team IDs are stale', () => {
    const state = createStartingState()
    const result = validateTeamIds(
      ['missing-team-a', 'missing-team-b'],
      { requiredRoles: ['technical'], requiredTags: ['tech'] },
      state.teams,
      state.agents
    )

    expect(result.valid).toBe(false)
    expect(result.activeAgentIds).toEqual([])
    expect(result.issues.map((issue) => issue.code)).toContain('no-active-members')
  })

  it('uses assignment-vs-resolution eligibility consistently for assigned operatives', () => {
    const state = createStartingState()
    state.agents['a_ava'] = {
      ...state.agents['a_ava'],
      assignment: {
        state: 'assigned',
        caseId: 'case-001',
        teamId: 't_nightwatch',
        startedWeek: state.week,
      },
    }

    const assignmentValidation = validateAgents([state.agents['a_ava']], {
      requiredRoles: [],
      requiredTags: [],
    })
    const resolutionValidation = validateAgents(
      [state.agents['a_ava']],
      { requiredRoles: [], requiredTags: [] },
      'resolution'
    )

    expect(assignmentValidation.valid).toBe(false)
    expect(assignmentValidation.activeAgentIds).toEqual([])
    expect(resolutionValidation.valid).toBe(true)
    expect(resolutionValidation.activeAgentIds).toEqual(['a_ava'])
  })
})
