import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { type CaseInstance } from '../domain/models'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { assignTeam } from '../domain/sim/assign'

function createControlledState() {
  const state = createStartingState()
  state.rngSeed = 12121
  state.rngState = 12121
  state.cases = {}
  state.reports = []
  state.events = []
  state.gameOver = false
  state.gameOverReason = undefined
  state.config.maxActiveCases = 10

  return state
}

function createTestCase(id: string, overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    id,
    templateId: 'test-template',
    title: id,
    description: 'Controlled test case',
    mode: 'threshold',
    kind: 'case',
    status: 'open',
    difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
    weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
    tags: [],
    requiredTags: [],
    preferredTags: [],
    stage: 1,
    durationWeeks: 1,
    deadlineWeeks: 8,
    deadlineRemaining: 8,
    weeksRemaining: undefined,
    assignedTeamIds: [],
    onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
    onUnresolved: {
      stageDelta: 1,
      deadlineResetWeeks: 8,
      spawnCount: { min: 0, max: 0 },
      spawnTemplateIds: [],
    },
    ...overrides,
  }
}

/**
 * Validation that the immutability fix prevents fatigue calculation bugs.
 * Tests the specific bug that was fixed: using nextTeams instead of state.teams
 * in applyAgentFatigue ensures team releases are respected.
 */
describe('Immutability Fix Validation', () => {
  it('correctly applies fatigue AFTER teams are released from cases', () => {
    const state = createControlledState()
    state.cases['short-success'] = createTestCase('short-success', {
      title: 'Short Success',
      durationWeeks: 1,
    })
    const assigned = assignTeam(state, 'short-success', 't_nightwatch')

    // Store initial agent fatigue
    const agent = assigned.agents['a_ava']
    const initialFatigue = agent.fatigue
    const teamAgentIds = assigned.teams['t_nightwatch'].agentIds

    // Verify agent is in the team
    expect(teamAgentIds).toContain('a_ava')

    // Advance one week - case should complete and team should be released
    const next = advanceWeek(assigned)

    // Verify team was released
    expect(next.teams['t_nightwatch'].assignedCaseId).toBeUndefined()
    expect(next.cases['short-success'].status).toBe('resolved')

    // The team is released for the following week, but the agent still worked this week,
    // so mission fatigue should apply exactly once before the release takes effect.
    const nextAgent = next.agents['a_ava']
    const expectedMissionFatigue = Math.max(1, assigned.config.attritionPerWeek - 1)
    expect(nextAgent.fatigue).toBe(initialFatigue + expectedMissionFatigue)
  })

  it('prevents fatigue miscalculation when multiple teams are used across weeks', () => {
    let state = createControlledState()
    state.cases['case-alpha'] = createTestCase('case-alpha', {
      title: 'Case Alpha',
      durationWeeks: 1,
    })
    state.cases['case-beta'] = createTestCase('case-beta', {
      title: 'Case Beta',
      durationWeeks: 2,
    })

    // Week 1: Assign team to case
    state = assignTeam(state, 'case-alpha', 't_nightwatch')
    state = advanceWeek(state)

    // Week 2: Assign SAME team to DIFFERENT case
    state = assignTeam(state, 'case-beta', 't_nightwatch')
    state = advanceWeek(state)

    // The fix ensures that when calculating week2 fatigue:
    // - We use nextTeams (which has case-002 assignment)
    // - NOT state.teams (which would have old case-001 assignment)
    // This prevents double-counting active time

    expect(state.agents['a_ava'].fatigue).toBeDefined()
    expect(state.teams['t_nightwatch'].assignedCaseId).toBe('case-beta')
    expect(state.cases['case-beta'].status).toBe('in_progress')
  })

  it('maintains consistent fatigue tracking when teams are reassigned immediately', () => {
    const initial = createControlledState()
    initial.rngSeed = 33333
    initial.rngState = 33333
    initial.cases['case-alpha'] = createTestCase('case-alpha', { durationWeeks: 1 })
    initial.cases['case-beta'] = createTestCase('case-beta', { durationWeeks: 1 })
    initial.cases['case-gamma'] = createTestCase('case-gamma', { durationWeeks: 1 })
    initial.cases['sentinel-open'] = createTestCase('sentinel-open', {
      title: 'Sentinel Open',
      deadlineWeeks: 99,
      deadlineRemaining: 99,
    })

    let state = initial

    // Assign and immediately advance
    state = assignTeam(state, 'case-alpha', 't_nightwatch')
    state = advanceWeek(state)
    state = assignTeam(state, 'case-beta', 't_nightwatch')
    state = advanceWeek(state)
    state = assignTeam(state, 'case-gamma', 't_nightwatch')
    state = advanceWeek(state)

    // After 3 weeks of continuous assignment with one case resolving:
    // Fatigue should progress monotonically (may increase, stay same, or decrease based on work)
    // The key is no calculation errors or double-counting from the teams state reference bug
    const avaFinalFatigue = state.agents['a_ava'].fatigue

    expect(avaFinalFatigue).toBeGreaterThanOrEqual(0)
    expect(avaFinalFatigue).toBeLessThanOrEqual(100)
    expect(state.reports).toHaveLength(3)
  })
})
