import { advanceWeek } from '../domain/sim/advanceWeek'
import { buildMissionRewardBreakdown } from '../domain/missionResults'
import type { GameState } from '../domain/models'
import { createStartingState } from '../data/startingState'
import { createResolutionEscalationTransition } from '../domain/sim/escalation'

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
      market: { week: 1, featuredRecipeId: '', pressure: 'stable', costMultiplier: 1 },
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
      agency: {
        containmentRating: 50,
        clearanceLevel: 1,
        funding: 1000,
        supportAvailable: 10,
      },
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
    const state = makeBaseState()
    const baseAgent = createStartingState().agents.a_ava
    // 5 active cases, 0 support shortfall
    for (let i = 0; i < 5; ++i) {
      state.cases['c' + i] = { id: 'c' + i, templateId: 't', title: 'C' + i, description: '', mode: 'deterministic', kind: 'case', status: 'in_progress', difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 }, weights: { combat: 1, investigation: 1, utility: 1, social: 1 }, tags: [], requiredTags: [], preferredTags: [], stage: 1, durationWeeks: 1, deadlineWeeks: 1, deadlineRemaining: 1, assignedTeamIds: ['t' + i], onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] }, onUnresolved: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] } }
      state.agents['a' + i] = {
        ...baseAgent,
        id: 'a' + i,
        name: 'Agent ' + i,
        baseStats: { combat: 100, investigation: 100, utility: 100, social: 100 },
        fatigue: 0,
        status: 'active',
      }
      state.teams['t' + i] = {
        id: 't' + i,
        name: 'T' + i,
        agentIds: ['a' + i],
        memberIds: ['a' + i],
        leaderId: 'a' + i,
        tags: [],
      }
    }
    const successReward = buildMissionRewardBreakdown(state.cases.c0, 'success', state.config)
    const partialReward = buildMissionRewardBreakdown(
      createResolutionEscalationTransition(state.cases.c0, 'partial').nextCase,
      'partial',
      state.config
    )
    const next = advanceWeek(state)
    expect(next.agency?.coordinationFrictionActive).toBeTruthy()
    expect(next.coordinationFrictionActive).toBeTruthy()
    // Should downgrade one outcome from success to partial
    const report = next.reports[next.reports.length - 1]
    const partials = report.partialCases.length
    const resolved = report.resolvedCases.length
    expect(partials).toBeGreaterThan(0)
    expect(resolved).toBeLessThan(5)
    expect(report.partialCases).toContain('c0')
    expect(next.cases.c0).toMatchObject({
      status: 'open',
      stage: 2,
      assignedTeamIds: [],
    })
    expect(
      next.events.some((event) => event.type === 'case.resolved' && event.payload.caseId === 'c0')
    ).toBe(false)

    const partialEvent = next.events.find(
      (event): event is Extract<(typeof next.events)[number], { type: 'case.partially_resolved' }> =>
        event.type === 'case.partially_resolved' && event.payload.caseId === 'c0'
    )
    expect(partialEvent).toBeDefined()
    if (!partialEvent?.payload.rewardBreakdown) {
      throw new Error('Expected downgraded partial event to carry a reward breakdown.')
    }
    const partialRewardBreakdown = partialEvent.payload.rewardBreakdown
    expect(partialRewardBreakdown).toEqual(partialReward)
    expect(partialRewardBreakdown).not.toEqual(successReward)
    expect(partialRewardBreakdown.fundingDelta).toBeLessThan(successReward.fundingDelta)

    const factionEvent = next.events.find(
      (event): event is Extract<(typeof next.events)[number], { type: 'faction.standing_changed' }> =>
        event.type === 'faction.standing_changed' && event.payload.caseId === 'c0'
    )
    if (!factionEvent) {
      throw new Error('Expected faction standing change for the downgraded case.')
    }
    expect(factionEvent.payload.delta).toBe(partialReward.factionStanding[0]?.delta)
    expect(next.funding).toBeLessThan(
      state.funding + state.config.fundingBasePerWeek + successReward.fundingDelta * 5
    )
  })
})
