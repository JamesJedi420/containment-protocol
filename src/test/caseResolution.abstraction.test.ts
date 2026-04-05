import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { assignTeam } from '../domain/sim/assign'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { resolveCase } from '../domain/sim/resolve'

const FORBIDDEN_PLAYBACK_FIELDS = [
  'animationQueue',
  'timeline',
  'turns',
  'frames',
  'positions',
  'pathfinding',
  'abilityPlayback',
  'commands',
] as const

describe('case resolution abstraction', () => {
  it('returns a summary outcome instead of tactical playback data', () => {
    const state = createStartingState()
    const outcome = resolveCase(
      state.cases['case-001'],
      state.teams['t_nightwatch'].agentIds.map((agentId) => state.agents[agentId]),
      state.config,
      () => 0.5
    )

    expect(outcome).toMatchObject({
      caseId: 'case-001',
      result: expect.stringMatching(/success|partial|fail/),
      reasons: expect.any(Array),
    })

    for (const forbiddenField of FORBIDDEN_PLAYBACK_FIELDS) {
      expect(outcome).not.toHaveProperty(forbiddenField)
    }
  })

  it('advances week through reports and state updates, not combat transcripts', () => {
    const state = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      status: 'in_progress',
      weeksRemaining: 1,
      difficulty: { combat: 1, investigation: 0, utility: 0, social: 0 },
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
    }
    state.teams['t_nightwatch'] = {
      ...state.teams['t_nightwatch'],
      assignedCaseId: 'case-001',
    }

    const next = advanceWeek(state)
    const report = next.reports.at(-1)

    expect(next.cases['case-001'].status).toBe('resolved')
    expect(next.teams['t_nightwatch'].assignedCaseId).toBeUndefined()
    expect(report).toMatchObject({
      resolvedCases: ['case-001'],
      notes: expect.any(Array),
    })

    for (const forbiddenField of FORBIDDEN_PLAYBACK_FIELDS) {
      expect(report).not.toHaveProperty(forbiddenField)
    }
  })
})
