import { createStartingState } from '../data/startingState'
import { buildAgencySummary } from '../domain/agency'
import { buildAgencyStandingAward, buildMissionRewardBreakdown } from '../domain/missionResults'
import { buildAgencyRanking } from '../domain/rankings'
import type { GameState, MissionResolutionKind, WeeklyReport } from '../domain/models'

describe('Agency Standing & Ranking', () => {
  it('weights standing by authoritative operational danger', () => {
    const state = createStartingState()
    const routine = state.cases['case-001']
    const dangerous = {
      ...routine,
      kind: 'raid' as const,
      stage: 4,
      difficulty: {
        combat: routine.difficulty.combat + 8,
        investigation: routine.difficulty.investigation + 8,
        utility: routine.difficulty.utility + 8,
        social: routine.difficulty.social + 8,
      },
    }

    const routineAward = buildAgencyStandingAward(routine, 'success', state.config)
    const dangerAward = buildAgencyStandingAward(dangerous, 'success', state.config)

    expect(dangerAward.dangerScore).toBeGreaterThan(routineAward.dangerScore)
    expect(dangerAward.dangerMultiplier).toBeGreaterThan(routineAward.dangerMultiplier)
    expect(dangerAward.points).toBeGreaterThan(routineAward.points)
  })

  it.each<[MissionResolutionKind, number]>([
    ['success', 1],
    ['partial', 0.55],
    ['fail', -0.3],
    ['unresolved', -0.45],
  ])('applies the bounded %s outcome modifier', (outcome, modifier) => {
    const state = createStartingState()
    const award = buildAgencyStandingAward(state.cases['case-001'], outcome, state.config)

    expect(award.outcomeMultiplier).toBe(modifier)
    expect(Math.abs(award.points)).toBeLessThanOrEqual(24)
    if (outcome === 'success' || outcome === 'partial') {
      expect(award.points).toBeGreaterThan(0)
    } else {
      expect(award.points).toBeLessThan(0)
    }
  })

  it('is deterministic and normalizes expected duration and repeated operations', () => {
    const state = createStartingState()
    const shortCase = {
      ...state.cases['case-001'],
      durationWeeks: 1,
      contract: { templateId: 'repeatable-short-operation' },
    }
    const longCase = { ...shortCase, durationWeeks: 4 }
    const initial = buildAgencyStandingAward(shortCase, 'success', state.config)
    const priorReport = {
      week: 1,
      caseSnapshots: {
        prior: {
          caseId: 'prior',
          missionResult: {
            rewards: { agencyStanding: initial },
          },
        },
      },
    } as unknown as WeeklyReport
    const repeatedState = { reports: [priorReport, priorReport, priorReport] }

    expect(buildAgencyStandingAward(shortCase, 'success', state.config)).toEqual(initial)
    expect(buildAgencyStandingAward(longCase, 'success', state.config).durationMultiplier).toBe(
      1.45
    )
    expect(buildAgencyStandingAward(longCase, 'success', state.config).points).toBeGreaterThan(
      initial.points
    )

    const repeated = buildAgencyStandingAward(shortCase, 'success', state.config, repeatedState)
    expect(repeated.priorSimilarCompletions).toBe(3)
    expect(repeated.repeatMultiplier).toBeCloseTo(0.25)
    expect(repeated.points).toBeLessThan(initial.points)
  })

  it('prevents a routine short-operation repeat sequence from outpacing dangerous commitment', () => {
    const state = createStartingState()
    const routine = {
      ...state.cases['case-001'],
      durationWeeks: 1,
      contract: { templateId: 'farmable-routine' },
    }
    const dangerous = {
      ...routine,
      contract: { templateId: 'dangerous-commitment' },
      kind: 'raid' as const,
      stage: 4,
      durationWeeks: 4,
      difficulty: {
        combat: routine.difficulty.combat + 8,
        investigation: routine.difficulty.investigation + 8,
        utility: routine.difficulty.utility + 8,
        social: routine.difficulty.social + 8,
      },
    }
    const priorAwards: WeeklyReport[] = []
    let repeatedRoutineTotal = 0

    for (let index = 0; index < 4; index += 1) {
      const award = buildAgencyStandingAward(routine, 'success', state.config, {
        reports: priorAwards,
      })
      repeatedRoutineTotal += award.points
      priorAwards.push({
        week: index + 1,
        caseSnapshots: {
          [`routine-${index}`]: {
            caseId: `routine-${index}`,
            missionResult: { rewards: { agencyStanding: award } },
          },
        },
      } as unknown as WeeklyReport)
    }

    const dangerousAward = buildAgencyStandingAward(dangerous, 'success', state.config)
    expect(repeatedRoutineTotal).toBeLessThanOrEqual(dangerousAward.points)
  })

  it('keeps standing independent from economics and momentum and emits explanations', () => {
    const state = createStartingState()
    const currentCase = state.cases['case-001']
    const baseline = buildMissionRewardBreakdown(currentCase, 'success', state.config, state)
    const economicallyChanged = buildMissionRewardBreakdown(currentCase, 'success', state.config, {
      ...state,
      funding: state.funding + 100_000,
      agency: { ...state.agency, funding: state.agency.funding + 100_000 },
      deploymentMomentum: {
        enabled: true,
        current: 99,
        cap: 99,
        lastUpdatedWeek: state.week,
      },
    } as typeof state)

    expect(economicallyChanged.agencyStanding).toEqual(baseline.agencyStanding)
    expect(baseline.agencyStanding!.factors.map((factor) => factor.id)).toEqual([
      'danger',
      'outcome',
      'duration',
      'repeat',
    ])
    expect(baseline.agencyStanding!.summary).toContain('agency standing')
    expect(baseline.agencyStanding!.factors[1]?.detail).toContain(
      'danger alone never grants standing'
    )
  })

  it('projects completed standing awards into rankings and weekly history', () => {
    const state = createStartingState()
    const reward = buildMissionRewardBreakdown(
      state.cases['case-001'],
      'success',
      state.config,
      state
    )
    const ranking = buildAgencyRanking({
      reports: [
        {
          week: 1,
          resolvedCases: ['case-001'],
          partialCases: [],
          failedCases: [],
          unresolvedTriggers: [],
        } as unknown as WeeklyReport,
      ],
      events: [
        {
          id: 'evt-standing-case-001',
          schemaVersion: 2,
          type: 'case.resolved',
          sourceSystem: 'incident',
          timestamp: '2026-01-01T00:00:00.000Z',
          payload: {
            week: 1,
            caseId: 'case-001',
            caseTitle: state.cases['case-001'].title,
            mode: state.cases['case-001'].mode,
            kind: state.cases['case-001'].kind,
            stage: state.cases['case-001'].stage,
            teamIds: [],
            rewardBreakdown: reward,
          },
        },
      ],
    })

    expect(ranking.breakdown.agencyStanding.awards).toBe(1)
    expect(ranking.breakdown.agencyStanding.points).toBe(reward.agencyStanding!.points)
    expect(ranking.history[0]?.summary.agencyStanding).toBe(reward.agencyStanding!.points)
  })

  it('computes ranking tier and score deterministically from campaign state', () => {
    const game: GameState = {
      // Minimal stub for deterministic test
      agency: { containmentRating: 80, clearanceLevel: 3, funding: 120 },
      containmentRating: 80,
      clearanceLevel: 3,
      funding: 120,
      teams: {},
      cases: {},
      events: [],
      reports: [],
      market: { pressure: 'stable', featuredRecipeId: '', costMultiplier: 1 },
      config: { maxActiveCases: 3 },
      agents: {},
      productionQueue: [],
      inventory: {},
    } as unknown as GameState
    const summary = buildAgencySummary(game)
    const ranking = buildAgencyRanking(game)
    expect(summary.ranking.score).toBe(ranking.score)
    expect(['S', 'A', 'B', 'C', 'D']).toContain(summary.ranking.tier)
  })

  it('ranking penalizes unresolved and failed cases', () => {
    const game: GameState = {
      ...({} as unknown as GameState),
      agency: { containmentRating: 60, clearanceLevel: 2, funding: 80 },
      containmentRating: 60,
      clearanceLevel: 2,
      funding: 80,
      teams: {},
      cases: {},
      events: [],
      reports: [
        {
          week: 1,
          resolvedCases: [],
          partialCases: [],
          failedCases: [1, 2],
          unresolvedTriggers: [3],
          notes: [],
        },
      ],
      market: { pressure: 'tight', featuredRecipeId: '', costMultiplier: 1 },
      config: { maxActiveCases: 3 },
      agents: {},
      productionQueue: [],
      inventory: {},
    } as unknown as GameState
    const summary = buildAgencySummary(game)
    expect(summary.ranking.score).toBeLessThan(50)
    expect(['C', 'D']).toContain(summary.ranking.tier)
  })
})
