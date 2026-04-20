// SPE-38: Deterministic tests for support pool, shortage, and restoration
import { advanceWeek } from '../domain/sim/advanceWeek'
import { applyRallySupportStaffAction } from '../domain/hub/supportActions'
import type { GameState } from '../domain/models'

describe('SPE-38: Support Operations Layer', () => {
    it('hub support recovery affects later operation outcome and output', () => {
      // Start with 0 support, recover via hub, then run two ops
      let state = makeBaseState(0)
      // Hub action restores 1 support
      const { nextState, note } = applyRallySupportStaffAction(state, 1)
      expect(nextState.agency?.supportAvailable).toBe(1)
      expect(note?.content).toMatch(/restored/)

      // Set up two cases, both in progress
      nextState.cases = {
        case1: {
          id: 'case1', templateId: 't1', title: 'Test Case', description: '', mode: 'threshold', kind: 'standard', status: 'in_progress',
          difficulty: { fieldPower: 1, containment: 1, investigation: 1, support: 1 }, weights: { fieldPower: 1, containment: 1, investigation: 1, support: 1 },
          tags: [], requiredTags: [], preferredTags: [], stage: 1, durationWeeks: 1, weeksRemaining: 1, deadlineWeeks: 2, deadlineRemaining: 2, assignedTeamIds: ['team1'], onFail: { type: 'none' }, onUnresolved: { type: 'none' },
        },
        case2: {
          id: 'case2', templateId: 't2', title: 'Test Case 2', description: '', mode: 'threshold', kind: 'standard', status: 'in_progress',
          difficulty: { fieldPower: 1, containment: 1, investigation: 1, support: 1 }, weights: { fieldPower: 1, containment: 1, investigation: 1, support: 1 },
          tags: [], requiredTags: [], preferredTags: [], stage: 1, durationWeeks: 1, weeksRemaining: 1, deadlineWeeks: 2, deadlineRemaining: 2, assignedTeamIds: ['team2'], onFail: { type: 'none' }, onUnresolved: { type: 'none' },
        },
      }
      nextState.teams = {
        team1: { id: 'team1', name: 'Alpha', status: { state: 'deployed' }, agentIds: [] },
        team2: { id: 'team2', name: 'Bravo', status: { state: 'deployed' }, agentIds: [] },
      }

      // Run the week: only one case can be supported
      const result = advanceWeek(nextState)
      // Debug output for agency after sim
      // eslint-disable-next-line no-console
      console.log('advanceWeek agency:', JSON.stringify(result.agency, null, 2))
      const c1 = result.cases['case1']
      const c2 = result.cases['case2']
      // Only one case should have support, the other should have supportShortfall
      expect([c1.supportShortfall, c2.supportShortfall].filter(Boolean).length).toBe(1)
      // Check agency/supportAvailable presence before assertion
      if (!result.agency || typeof result.agency.supportAvailable !== 'number') {
        throw new Error('advanceWeek result missing agency/supportAvailable: ' + JSON.stringify(result.agency))
      }
      // The support pool should be 0 after both are processed
      expect(result.agency.supportAvailable).toBe(0)

      // Validate surfaced output: at least one report note should mention support/fallout
      const supportNotes = result.reports.flatMap(r => r.notes).filter(n => n && /support|fallout|shortfall/i.test(n.content))
      expect(supportNotes.length).toBeGreaterThan(0)
      // Should mention support restored, shortfall, or fallout
      expect(supportNotes.map(n => n.content).join(' ')).toMatch(/support|fallout|shortfall/i)
    })
  function makeBaseState(supportAvailable: number): GameState {
    return {
      week: 1,
      rngSeed: 42,
      rngState: 42,
      gameOver: false,
      directiveState: { selectedId: '', applied: [], available: [] },
      agents: {},
      staff: {},
      candidates: [],
      teams: {},
      cases: {},
      templates: {
        t1: { id: 't1', title: 'Test Case', kind: 'standard', mode: 'threshold', difficulty: { fieldPower: 1, containment: 1, investigation: 1, support: 1 }, weights: { fieldPower: 1, containment: 1, investigation: 1, support: 1 }, tags: [], requiredTags: [], preferredTags: [], stage: 1, durationWeeks: 1, deadlineWeeks: 2, onFail: { type: 'none', spawnCount: { min: 0, max: 0 } }, onUnresolved: { type: 'none', spawnCount: { min: 0, max: 0 } } },
        t2: { id: 't2', title: 'Test Case 2', kind: 'standard', mode: 'threshold', difficulty: { fieldPower: 1, containment: 1, investigation: 1, support: 1 }, weights: { fieldPower: 1, containment: 1, investigation: 1, support: 1 }, tags: [], requiredTags: [], preferredTags: [], stage: 1, durationWeeks: 1, deadlineWeeks: 2, onFail: { type: 'none', spawnCount: { min: 0, max: 0 } }, onUnresolved: { type: 'none', spawnCount: { min: 0, max: 0 } } },
      },
      reports: [],
      events: [],
      inventory: {},
      trainingQueue: [],
      productionQueue: [],
      market: { pressure: 'stable', listings: [] },
      config: { maxActiveCases: 3, partialMargin: 2, clearanceThresholds: [] },
      agency: {
        containmentRating: 50,
        clearanceLevel: 1,
        funding: 100,
        supportAvailable,
      },
    }
  }

  it('consumes support for each operation and applies shortfall penalty', () => {
    const state = makeBaseState(1)
    // Ensure agency/supportAvailable is always present
    if (!state.agency) state.agency = { containmentRating: 50, clearanceLevel: 1, funding: 100, supportAvailable: 1 }
    state.cases = {
      case1: {
        id: 'case1',
        templateId: 't1',
        title: 'Test Case',
        description: '',
        mode: 'threshold',
        kind: 'standard',
        status: 'in_progress',
        difficulty: { fieldPower: 1, containment: 1, investigation: 1, support: 1 },
        weights: { fieldPower: 1, containment: 1, investigation: 1, support: 1 },
        tags: [],
        requiredTags: [],
        preferredTags: [],
        stage: 1,
        durationWeeks: 1,
        weeksRemaining: 1,
        deadlineWeeks: 2,
        deadlineRemaining: 2,
        assignedTeamIds: ['team1'],
        onFail: { type: 'none' },
        onUnresolved: { type: 'none' },
      },
      case2: {
        id: 'case2',
        templateId: 't2',
        title: 'Test Case 2',
        description: '',
        mode: 'threshold',
        kind: 'standard',
        status: 'in_progress',
        difficulty: { fieldPower: 1, containment: 1, investigation: 1, support: 1 },
        weights: { fieldPower: 1, containment: 1, investigation: 1, support: 1 },
        tags: [],
        requiredTags: [],
        preferredTags: [],
        stage: 1,
        durationWeeks: 1,
        weeksRemaining: 1,
        deadlineWeeks: 2,
        deadlineRemaining: 2,
        assignedTeamIds: ['team2'],
        onFail: { type: 'none' },
        onUnresolved: { type: 'none' },
      },
    }
    state.teams = {
      team1: { id: 'team1', name: 'Alpha', status: { state: 'deployed' }, agentIds: [] },
      team2: { id: 'team2', name: 'Bravo', status: { state: 'deployed' }, agentIds: [] },
    }
    const next = advanceWeek(state)
    // Only one case should be supported, the other should have supportShortfall
    const c1 = next.cases['case1']
    const c2 = next.cases['case2']
    expect([c1.supportShortfall, c2.supportShortfall].filter(Boolean).length).toBe(1)
    // Debug output for diagnosis
    // eslint-disable-next-line no-console
    console.log('advanceWeek result:', JSON.stringify(next, null, 2))
    if (!next.agency || typeof next.agency.supportAvailable !== 'number') {
      throw new Error('advanceWeek result missing agency/supportAvailable: ' + JSON.stringify(next.agency))
    }
    // The support pool should be 0 after both are processed
    expect(next.agency.supportAvailable).toBe(0)
  })

  it('restores support via hub action', () => {
    const state = makeBaseState(0)
    if (!state.agency) state.agency = { containmentRating: 50, clearanceLevel: 1, funding: 100, supportAvailable: 0 }
    const { nextState, note } = applyRallySupportStaffAction(state, 3)
    expect(nextState.agency?.supportAvailable).toBe(3)
    expect(note).toBeTruthy()
    expect(note?.content).toMatch(/restored/)
  })
})
