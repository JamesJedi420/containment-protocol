import { advanceWeek } from '../domain/sim/advanceWeek'
import { GameState } from '../domain/models'

describe('SPE-95: Command-coordination friction', () => {
  function makeBaseState(): GameState {
    return {
      week: 1,
      rngSeed: 42,
      rngState: 42,
      gameOver: false,
      directiveState: { selectedId: null, history: [] },
      agents: {},
      staff: {},
      candidates: [],
      teams: {},
      cases: {},
      templates: {},
      reports: [],
      events: [],
      inventory: {},
      trainingQueue: [],
      productionQueue: [],
      market: { week: 1, featuredRecipeId: '', pressure: 0, costMultiplier: 1 },
      config: {
        maxActiveCases: 10,
        trainingSlots: 2,
        partialMargin: 2,
        stageScalar: 1,
        challengeModeEnabled: false,
        durationModel: 'capacity',
        attritionPerWeek: 1,
        probabilityK: 1,
        raidCoordinationPenaltyPerExtraTeam: 0,
        weeksPerYear: 52,
        fundingBasePerWeek: 100,
        fundingPerResolution: 10,
        fundingPenaltyPerFail: -10,
        fundingPenaltyPerUnresolved: -20,
        containmentWeeklyDecay: 1,
        containmentDeltaPerResolution: 1,
        containmentDeltaPerFail: -1,
        containmentDeltaPerUnresolved: -2,
        clearanceThresholds: [10, 20, 30],
      },
      containmentRating: 50,
      clearanceLevel: 1,
      funding: 1000,
      knowledge: {},
    }
  }

  it('does not trigger friction below threshold', () => {
    const state = makeBaseState()
    // 2 active cases, 0 support shortfall
    state.cases = {
      a: { id: 'a', templateId: 't', title: 'A', description: '', mode: 'deterministic', kind: 'case', status: 'in_progress', difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 }, weights: { combat: 1, investigation: 1, utility: 1, social: 1 }, tags: [], requiredTags: [], preferredTags: [], stage: 1, durationWeeks: 1, deadlineWeeks: 1, deadlineRemaining: 1, assignedTeamIds: ['t1'], onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] }, onUnresolved: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] } },
      b: { id: 'b', templateId: 't', title: 'B', description: '', mode: 'deterministic', kind: 'case', status: 'in_progress', difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 }, weights: { combat: 1, investigation: 1, utility: 1, social: 1 }, tags: [], requiredTags: [], preferredTags: [], stage: 1, durationWeeks: 1, deadlineWeeks: 1, deadlineRemaining: 1, assignedTeamIds: ['t2'], onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] }, onUnresolved: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] } },
    }
    state.teams = {
      t1: { id: 't1', name: 'T1', agentIds: [], tags: [] },
      t2: { id: 't2', name: 'T2', agentIds: [], tags: [] },
    }
    const next = advanceWeek(state)
    expect(next.agency?.coordinationFrictionActive).toBeFalsy()
    expect(next.coordinationFrictionActive).toBeFalsy()
    expect(next.reports[next.reports.length - 1].notes.some(n => n.content.includes('coordination'))).toBeFalsy()
  })

  it('triggers friction above threshold and downgrades one outcome', () => {
      const caseStatuses = Object.values(report.caseSnapshots).map((c: any) => c.status)
      const partialCount = caseStatuses.filter(s => s === 'partial').length
      const resolvedCount = caseStatuses.filter(s => s === 'resolved').length
      expect(partialCount).toBeGreaterThan(0)
      expect(resolvedCount).toBeLessThan(5)
      // Should surface a coordination note
      expect(report.notes.some(n => n.content.toLowerCase().includes('coordination'))).toBeTruthy()
    const state = makeBaseState()
    // 5 active cases, 0 support shortfall
    for (let i = 0; i < 5; ++i) {
      state.cases['c' + i] = { id: 'c' + i, templateId: 't', title: 'C' + i, description: '', mode: 'deterministic', kind: 'case', status: 'in_progress', difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 }, weights: { combat: 1, investigation: 1, utility: 1, social: 1 }, tags: [], requiredTags: [], preferredTags: [], stage: 1, durationWeeks: 1, deadlineWeeks: 1, deadlineRemaining: 1, assignedTeamIds: ['t' + i], onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] }, onUnresolved: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] } }
      state.teams['t' + i] = { id: 't' + i, name: 'T' + i, agentIds: [], tags: [] }
    }
    const next = advanceWeek(state)
    expect(next.agency?.coordinationFrictionActive).toBeTruthy()
    expect(next.coordinationFrictionActive).toBeTruthy()
    // Should downgrade one outcome from success to partial
    const report = next.reports[next.reports.length - 1]
    // Debug output for diagnosis
    // TEMP: Throw for immediate test output visibility
    // Check actual case outcomes by status
    if (!report.caseSnapshots) {
      throw new Error('Test failure: report.caseSnapshots is undefined. Full report: ' + JSON.stringify(report, null, 2))
    }
    const caseStatuses = Object.values(report.caseSnapshots).map((c: any) => c.status)
    const partialCount = caseStatuses.filter(s => s === 'partial').length
    const resolvedCount = caseStatuses.filter(s => s === 'resolved').length
    expect(partialCount).toBeGreaterThan(0)
    expect(resolvedCount).toBeLessThan(5)
    // Should surface a coordination note
    expect(report.notes.some(n => n.content.toLowerCase().includes('coordination'))).toBeTruthy()
    const partials = report.partialCases.length
    const resolved = report.resolvedCases.length
    expect(partials).toBeGreaterThan(0)
    expect(resolved).toBeLessThan(5)
    // Should surface a coordination note
    expect(report.notes.some(n => n.content.toLowerCase().includes('coordination'))).toBeTruthy()
  })
})
