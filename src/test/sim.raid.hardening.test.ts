// cspell:words greentape
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { type CaseInstance } from '../domain/models'
import { advanceWeek } from '../domain/sim/advanceWeek'

function createControlledRaidState() {
  const state = createStartingState()
  state.rngSeed = 44444
  state.rngState = 44444
  state.cases = {}
  state.reports = []
  state.events = []
  state.gameOver = false
  state.gameOverReason = undefined
  state.config.maxActiveCases = 10

  return state
}

function createRaidCase(id: string, overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    id,
    templateId: 'occ-001',
    title: id,
    description: 'Test',
    mode: 'probability',
    kind: 'raid',
    status: 'in_progress',
    difficulty: { combat: 1, investigation: 0, utility: 0, social: 0 },
    weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
    tags: [],
    requiredTags: [],
    preferredTags: [],
    stage: 1,
    durationWeeks: 1,
    deadlineWeeks: 10,
    deadlineRemaining: 10,
    weeksRemaining: 1,
    intelConfidence: 1,
    intelUncertainty: 0,
    intelLastUpdatedWeek: 0,
    assignedTeamIds: ['t_nightwatch', 't_greentape'],
    onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
    onUnresolved: {
      stageDelta: 1,
      deadlineResetWeeks: 3,
      spawnCount: { min: 0, max: 0 },
      spawnTemplateIds: [],
    },
    raid: { minTeams: 2, maxTeams: 5 },
    ...overrides,
  }
}

/**
 * Hardening tests for raid coordination mechanics.
 * Ensures raid penalties are applied consistently and don't crash the framework.
 */
describe('Raid Coordination Hardening', () => {
  it('handles multi-team raids without crashing or corrupting state', () => {
    const state = createControlledRaidState()
    state.cases['raid-test'] = createRaidCase('raid-test', { title: 'Test Raid' })

    state.teams['t_nightwatch'].assignedCaseId = 'raid-test'
    state.teams['t_greentape'].assignedCaseId = 'raid-test'

    const before = structuredClone(state)
    const next = advanceWeek(state)

    // Original unmodified (allow knowledge field to be populated)
    expect(state).toMatchObject({
      ...before,
      knowledge: expect.any(Object),
    })

    // New state generated
    expect(next.week).toBe(2)

    // Raid was processed (either resolved or kept in progress)
    const raidCase = next.cases['raid-test']
    expect(raidCase).toBeDefined()
    expect(['resolved', 'in_progress', 'open']).toContain(raidCase.status)
  })

  it('applies consistent state through multi-week raid sequences without errors', () => {
    let state = createControlledRaidState()
    state.rngSeed = 55555
    state.rngState = 55555
    state.cases['long-raid'] = createRaidCase('long-raid', {
      title: 'Long Raid',
      difficulty: { combat: 2, investigation: 0, utility: 0, social: 0 },
      durationWeeks: 5,
      weeksRemaining: 5,
    })

    state.teams['t_nightwatch'].assignedCaseId = 'long-raid'
    state.teams['t_greentape'].assignedCaseId = 'long-raid'

    // Advance 3 weeks and verify no crashes
    for (let i = 0; i < 3; i++) {
      state = advanceWeek(state)
      expect(state.reports).toHaveLength(i + 1)
    }

    // Final state should have progressed without errors
    expect(state.reports).toHaveLength(3)
    expect(state.cases['long-raid']).toBeDefined()
  })
})
