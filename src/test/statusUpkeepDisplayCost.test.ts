import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { buildAgencySummary } from '../domain/agency'
import {
  applyFundingExpense,
  applyFundingIncome,
  createInitialFundingState,
  WEEKLY_OPERATING_COST_SOURCE_ID,
} from '../domain/funding'
import { buildMissionRewardBreakdown } from '../domain/missionResults'
import type { CaseInstance, FundingState, GameState, OperationEvent } from '../domain/models'
import { buildAgencyRanking } from '../domain/rankings'
import { buildRivalPressure } from '../domain/rivalPressure'
import {
  composeStandingPointsForRanking,
  computeWeeklyPublicDisplayCost,
  reconstructFundingAfterOperatingCost,
  resolveStatusUpkeepDisplayEffect,
  STATUS_UPKEEP_RANKING_PENALTY,
} from '../domain/statusUpkeepDisplayCost'
import { buildWeeklyStatusUpkeepDisplayReportNotes } from '../domain/statusUpkeepDisplayWeeklyReportNotes'
import { FUNDING_CALIBRATION } from '../domain/sim/calibration'

function withOperatingCost(
  state: FundingState,
  week: number,
  amount: number
): FundingState {
  return applyFundingExpense(
    state,
    amount,
    'operating_cost',
    week,
    WEEKLY_OPERATING_COST_SOURCE_ID
  )
}

function makeEvent<TType extends OperationEvent['type']>(
  type: TType,
  payload: Extract<OperationEvent, { type: TType }>['payload']
): OperationEvent {
  return {
    id: `evt-${type.replace(/\./g, '-')}-${payload.week}`,
    schemaVersion: 1,
    type,
    sourceSystem: 'incident',
    timestamp: `2042-01-${String(payload.week).padStart(2, '0')}T00:00:00.001Z`,
    payload,
  } as OperationEvent
}

function makeCase(baseCase: CaseInstance, overrides: Partial<CaseInstance>): CaseInstance {
  return { ...baseCase, ...overrides }
}

function emptyWeekReport(week: number): GameState['reports'][number] {
  return {
    week,
    rngStateBefore: week,
    rngStateAfter: week + 1,
    newCases: [],
    progressedCases: [],
    resolvedCases: [],
    failedCases: [],
    partialCases: [],
    unresolvedTriggers: [],
    spawnedCases: [],
    maxStage: 1,
    avgFatigue: 0,
    teamStatus: [],
    notes: [],
  }
}

describe('statusUpkeepDisplayCost (SPE-2718)', () => {
  it('computes public-display cost from facility upkeep base + spike (payroll excluded)', () => {
    const cal = FUNDING_CALIBRATION.weeklyOperatingCost
    expect(computeWeeklyPublicDisplayCost(1)).toBe(cal.facilityUpkeepBase)
    expect(computeWeeklyPublicDisplayCost(4)).toBe(cal.facilityUpkeepBase + cal.upkeepSpikeAmount)
  })

  it('treats post-operating-cost funding >= 0 as maintained (no penalty)', () => {
    let funding = createInitialFundingState(10, 10, 10, 10, 100)
    funding = withOperatingCost(funding, 1, 20)
    const effect = resolveStatusUpkeepDisplayEffect(funding, 1)

    expect(effect.band).toBe('maintained')
    expect(effect.rankingDelta).toBe(0)
    expect(effect.standingGainScale).toBe(1)
    expect(effect.fundingAfterOperatingCost).toBe(80)
    expect(effect.summary).toContain('maintained')
  })

  it('treats post-operating-cost funding < 0 as underfunded (penalty + blocked gains)', () => {
    let funding = createInitialFundingState(10, 10, 10, 10, 10)
    funding = withOperatingCost(funding, 1, 40)
    const effect = resolveStatusUpkeepDisplayEffect(funding, 1)

    expect(effect.band).toBe('underfunded')
    expect(effect.rankingDelta).toBe(-STATUS_UPKEEP_RANKING_PENALTY)
    expect(effect.standingGainScale).toBe(0)
    expect(effect.fundingAfterOperatingCost).toBe(-30)
    expect(reconstructFundingAfterOperatingCost(funding, 1)).toBe(-30)
  })

  it('is deterministic for identical funding history', () => {
    let funding = createInitialFundingState(10, 10, 10, 10, 5)
    funding = withOperatingCost(funding, 2, 50)
    const a = resolveStatusUpkeepDisplayEffect(funding, 2)
    const b = resolveStatusUpkeepDisplayEffect(structuredClone(funding), 2)
    expect(a).toEqual(b)
  })

  it('blocks positive standing points in ranking composition without rewriting award math', () => {
    expect(composeStandingPointsForRanking(12, 1)).toBe(12)
    expect(composeStandingPointsForRanking(12, 0)).toBe(0)
    expect(composeStandingPointsForRanking(-4, 0)).toBe(-4)
  })

  it('emits week-close note only when underfunded', () => {
    let funded = createInitialFundingState(10, 10, 10, 10, 100)
    funded = withOperatingCost(funded, 1, 20)
    expect(
      buildWeeklyStatusUpkeepDisplayReportNotes({
        fundingState: funded,
        week: 1,
        sequenceStart: 1,
      })
    ).toHaveLength(0)

    let broke = createInitialFundingState(10, 10, 10, 10, 5)
    broke = withOperatingCost(broke, 1, 40)
    const notes = buildWeeklyStatusUpkeepDisplayReportNotes({
      fundingState: broke,
      week: 1,
      sequenceStart: 1,
    })
    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('agency.status_upkeep_display')
    expect(notes[0]?.content).toContain('underfunded')
    expect(notes[0]?.metadata?.rankingDelta).toBe(-STATUS_UPKEEP_RANKING_PENALTY)
  })

  it('lowers ranking when underfunded and blocks that week standing gains', () => {
    const game = createStartingState()
    const successCase = makeCase(game.cases['case-001']!, {
      id: 'upkeep-success-1',
      title: 'Display case',
      stage: 2,
    })
    const reward = buildMissionRewardBreakdown(successCase, 'success', game.config, game)
    expect(reward.agencyStanding?.points).toBeGreaterThan(0)

    const report = {
      ...emptyWeekReport(1),
      resolvedCases: [successCase.id],
    }
    const event = makeEvent('case.resolved', {
      week: 1,
      caseId: successCase.id,
      caseTitle: successCase.title,
      mode: successCase.mode,
      kind: successCase.kind,
      stage: successCase.stage,
      teamIds: ['team-001'],
      rewardBreakdown: reward,
    })

    let maintainedFunding = createInitialFundingState(10, 10, 10, 10, 200)
    maintainedFunding = withOperatingCost(maintainedFunding, 1, 20)
    const maintainedGame: GameState = {
      ...game,
      reports: [report],
      events: [event],
      agency: {
        ...game.agency!,
        fundingState: maintainedFunding,
      },
    }

    let underfundedFunding = createInitialFundingState(10, 10, 10, 10, 5)
    underfundedFunding = withOperatingCost(underfundedFunding, 1, 40)
    const underfundedGame: GameState = {
      ...maintainedGame,
      agency: {
        ...game.agency!,
        fundingState: underfundedFunding,
      },
    }

    const maintainedRanking = buildAgencyRanking(maintainedGame)
    const underfundedRanking = buildAgencyRanking(underfundedGame)

    expect(maintainedRanking.breakdown.statusUpkeep.points).toBe(0)
    expect(maintainedRanking.breakdown.agencyStanding.points).toBe(reward.agencyStanding!.points)
    expect(underfundedRanking.breakdown.statusUpkeep.points).toBe(-STATUS_UPKEEP_RANKING_PENALTY)
    expect(underfundedRanking.breakdown.agencyStanding.points).toBe(0)
    expect(underfundedRanking.score).toBeLessThan(maintainedRanking.score)

    // Award record on the event is unchanged (composition only).
    expect(
      (underfundedGame.events[0] as Extract<OperationEvent, { type: 'case.resolved' }>).payload
        .rewardBreakdown?.agencyStanding
    ).toEqual(reward.agencyStanding)
  })

  it('keeps SPE-2699 rival pressure unchanged for same ranking inputs when upkeep is neutral', () => {
    const game = createStartingState()
    game.reports = [emptyWeekReport(1)]

    let fundingA = createInitialFundingState(10, 10, 10, 10, 150)
    fundingA = withOperatingCost(fundingA, 1, 20)
    fundingA = applyFundingIncome(fundingA, 0, 'mission_reward', 1, 'noop-a')

    let fundingB = createInitialFundingState(10, 10, 10, 10, 150)
    fundingB = withOperatingCost(fundingB, 1, 20)
    fundingB = applyFundingIncome(fundingB, 0, 'mission_reward', 1, 'noop-b')

    const gameA: GameState = {
      ...game,
      agency: { ...game.agency!, fundingState: fundingA },
    }
    const gameB: GameState = {
      ...game,
      agency: { ...game.agency!, fundingState: fundingB },
    }

    expect(buildAgencyRanking(gameA).score).toBe(buildAgencyRanking(gameB).score)
    expect(buildRivalPressure(gameA)).toEqual(buildRivalPressure(gameB))
    expect(resolveStatusUpkeepDisplayEffect(fundingA, 1).band).toBe('maintained')
  })

  it('exposes status upkeep band on agency summary', () => {
    const game = createStartingState()
    game.reports = [emptyWeekReport(1)]
    let funding = createInitialFundingState(10, 10, 10, 10, 3)
    funding = withOperatingCost(funding, 1, 30)
    game.agency = { ...game.agency!, fundingState: funding }

    const summary = buildAgencySummary(game)
    expect(summary.statusUpkeepDisplay.band).toBe('underfunded')
    expect(summary.statusUpkeepDisplay.rankingDelta).toBe(-STATUS_UPKEEP_RANKING_PENALTY)
    expect(summary.statusUpkeepDisplay.summary).toContain('underfunded')
  })
})
