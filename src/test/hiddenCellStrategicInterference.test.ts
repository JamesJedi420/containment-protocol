import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import { buildAgencySummary } from '../domain/agency'
import {
  computeWeeklyInventoryHoldingCost,
  computeWeeklyOperatingCost,
  createInitialFundingState,
  hasWeeklyInventoryHoldingCostForWeek,
  hasWeeklyOperatingCostForWeek,
} from '../domain/funding'
import {
  applyHiddenCellFundingTheftToFundingState,
  applyHiddenCellInfrastructureCompromiseToAgencyState,
  applyHiddenCellPanicAmplificationToGameState,
  applyHiddenCellResearchRollbackToResearchState,
  computeHiddenCellFundingTheftBaseAmount,
  computeHiddenCellInfrastructureCompromiseBaseAmount,
  computeHiddenCellPanicAmplificationBaseAmount,
  computeHiddenCellResearchRollbackBaseAmount,
  findHiddenCellFundingTheftAmountForWeek,
  findHiddenCellInfrastructureCompromiseAmountForWeek,
  findHiddenCellPanicAmplificationAmountForWeek,
  findHiddenCellResearchRollbackAmountForWeek,
  findHiddenCellResearchRollbackProjectIdForWeek,
  hasHiddenCellFundingTheftForWeek,
  hasHiddenCellInfrastructureCompromiseForWeek,
  hasHiddenCellPanicAmplificationForWeek,
  hasHiddenCellResearchRollbackForWeek,
  HIDDEN_CELL_FUNDING_THEFT_REASON,
  HIDDEN_CELL_FUNDING_THEFT_SOURCE_ID,
  HIDDEN_CELL_INFRASTRUCTURE_COMPROMISE_MAX,
  HIDDEN_CELL_PANIC_AMPLIFICATION_MAX,
  isHiddenCellPressureActive,
  resolveHiddenCellFundingTheft,
  resolveHiddenCellFundingTheftFromPressure,
  resolveHiddenCellFundingTheftFromRankingScore,
  resolveHiddenCellInfrastructureCompromiseFromPressure,
  resolveHiddenCellInfrastructureCompromiseFromRankingScore,
  resolveHiddenCellPanicAmplificationFromPressure,
  resolveHiddenCellPanicAmplificationFromRankingScore,
  resolveHiddenCellResearchRollbackFromPressure,
  resolveHiddenCellResearchRollbackFromRankingScore,
  selectHiddenCellResearchRollbackTarget,
} from '../domain/hiddenCellStrategicInterference'
import {
  buildWeeklyHiddenCellInfrastructureCompromiseReportNotes,
  buildWeeklyHiddenCellInterferenceReportNotes,
  buildWeeklyHiddenCellPanicAmplificationReportNotes,
  buildWeeklyHiddenCellResearchRollbackReportNotes,
} from '../domain/hiddenCellInterferenceWeeklyReportNotes'
import { createInitialResearchState } from '../domain/research'
import {
  buildRivalPressureFromRankingScore,
  type RivalPressureBand,
} from '../domain/rivalPressure'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { getReportPageView } from '../features/report/reportView'
import type { ResearchState, WeeklyReport } from '../domain/models'

function reportWithFailures(week: number, failures: number, unresolved: number): WeeklyReport {
  return {
    week,
    resolvedCases: [],
    partialCases: [],
    failedCases: Array.from({ length: failures }, (_, index) => `fail-${week}-${index}`),
    unresolvedTriggers: Array.from(
      { length: unresolved },
      (_, index) => `unresolved-${week}-${index}`
    ),
    notes: [],
  } as unknown as WeeklyReport
}

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

function researchStateWithActiveProgress(input?: {
  projectIds?: string[]
  progressTime?: number
}): ResearchState {
  const projectIds = input?.projectIds ?? ['proj-b', 'proj-a']
  const progressTime = input?.progressTime ?? 3
  const projects: ResearchState['projects'] = {}
  for (const projectId of projectIds) {
    projects[projectId] = {
      projectId,
      status: 'active',
      costTime: 6,
      costData: 0,
      costMaterials: 0,
      progressTime,
      unlocks: [],
      startedWeek: 1,
    }
  }
  return {
    ...createInitialResearchState(),
    projects,
    activeProjectIds: [...projectIds],
  }
}

describe('hidden-cell strategic interference (SPE-2704 / SPE-2706 / SPE-2707 / SPE-2710)', () => {
  it('gates cell pressure on competitive/severe rival bands only', () => {
    const bands: RivalPressureBand[] = ['suppressed', 'balanced', 'competitive', 'severe']
    expect(bands.map(isHiddenCellPressureActive)).toEqual([false, false, true, true])
  })

  it('derives identical funding-theft outcomes for identical inputs', () => {
    const left = resolveHiddenCellFundingTheftFromRankingScore(20, 1000)
    const right = resolveHiddenCellFundingTheftFromRankingScore(20, 1000)

    expect(left).toEqual(right)
    expect(left.active).toBe(true)
    expect(left.kind).toBe('funding_theft')
    expect(left.fundingStolen).toBeGreaterThan(0)
    expect(left.summary).toMatch(/Hidden-cell interference diverted/)
    expect(left.summary).toMatch(/funding/)
  })

  it('applies no funding theft when cell pressure is inactive', () => {
    const balanced = resolveHiddenCellFundingTheftFromRankingScore(50, 1000)
    const suppressed = resolveHiddenCellFundingTheftFromRankingScore(80, 1000)

    expect(balanced.active).toBe(false)
    expect(balanced.fundingStolen).toBe(0)
    expect(balanced.kind).toBe('none')
    expect(balanced.summary).toMatch(/inactive/)

    // High ranking → suppressed rival pressure → inactive cell interference.
    expect(suppressed.active).toBe(false)
    expect(suppressed.fundingStolen).toBe(0)
  })

  it('clamps theft to available funding', () => {
    const effect = resolveHiddenCellFundingTheftFromRankingScore(10, 3)
    expect(effect.active).toBe(true)
    expect(effect.baseTheftAmount).toBeGreaterThan(3)
    expect(effect.fundingStolen).toBe(3)
  })

  it('keeps SPE-2699/2700/2701 rival-pressure formula outputs unchanged for same ranking inputs', () => {
    const pressure = buildRivalPressureFromRankingScore(20)
    expect(pressure.contractRewardMultiplier).toBe(
      buildRivalPressureFromRankingScore(20).contractRewardMultiplier
    )
    expect(pressure.recruitQualityDelta).toBe(
      buildRivalPressureFromRankingScore(20).recruitQualityDelta
    )
    expect(pressure.trustFailureDriftScale).toBe(
      buildRivalPressureFromRankingScore(20).trustFailureDriftScale
    )
    expect(pressure.falloutPenaltyScale).toBe(
      buildRivalPressureFromRankingScore(20).falloutPenaltyScale
    )
    expect(pressure.postExposureTrustDelta).toBe(
      buildRivalPressureFromRankingScore(20).postExposureTrustDelta
    )
    expect(pressure.postExposurePosture).toBe(
      buildRivalPressureFromRankingScore(20).postExposurePosture
    )

    // Interference composes pressure; it must not mutate pressure derivation.
    const effect = resolveHiddenCellFundingTheft({
      rivalPressureScore: pressure.score,
      rivalPressureBand: pressure.band,
      funding: 500,
    })
    expect(effect.rivalPressureScore).toBe(pressure.score)
    expect(effect.rivalPressureBand).toBe(pressure.band)
    expect(computeHiddenCellFundingTheftBaseAmount(pressure.score, pressure.band)).toBe(
      effect.baseTheftAmount
    )
  })

  it('clamps apply-time theft to fundingState.funding when caller state drifts', () => {
    const effect = resolveHiddenCellFundingTheftFromRankingScore(15, 800)
    expect(effect.fundingStolen).toBeGreaterThan(10)
    const driftedState = createInitialFundingState(100, 50, 25, 10, 10)

    const applied = applyHiddenCellFundingTheftToFundingState(driftedState, effect, 4)
    expect(applied.appliedAmount).toBe(10)
    expect(applied.state.funding).toBe(0)
  })

  it('applies funding theft idempotently once per closed week', () => {
    const effect = resolveHiddenCellFundingTheftFromRankingScore(15, 800)
    const fundingState = createInitialFundingState(100, 50, 25, 10, 800)

    const first = applyHiddenCellFundingTheftToFundingState(fundingState, effect, 3)
    expect(first.appliedAmount).toBe(effect.fundingStolen)
    expect(first.state.funding).toBe(800 - effect.fundingStolen)
    expect(hasHiddenCellFundingTheftForWeek(first.state, 3)).toBe(true)
    expect(findHiddenCellFundingTheftAmountForWeek(first.state, 3)).toBe(effect.fundingStolen)
    expect(first.state.fundingHistory.at(-1)).toMatchObject({
      week: 3,
      delta: -effect.fundingStolen,
      reason: HIDDEN_CELL_FUNDING_THEFT_REASON,
      sourceId: HIDDEN_CELL_FUNDING_THEFT_SOURCE_ID,
    })

    const second = applyHiddenCellFundingTheftToFundingState(first.state, effect, 3)
    expect(second.appliedAmount).toBe(0)
    expect(second.state.funding).toBe(first.state.funding)
    expect(
      second.state.fundingHistory.filter(
        (entry) => entry.sourceId === HIDDEN_CELL_FUNDING_THEFT_SOURCE_ID && entry.week === 3
      )
    ).toHaveLength(1)
  })

  it('builds weekly report notes only when theft was applied', () => {
    const pressure = buildRivalPressureFromRankingScore(20)
    const effect = resolveHiddenCellFundingTheftFromPressure(pressure, 900)
    const fundingState = createInitialFundingState(100, 50, 25, 10, 900)
    const applied = applyHiddenCellFundingTheftToFundingState(fundingState, effect, 2)

    const notes = buildWeeklyHiddenCellInterferenceReportNotes({
      fundingState: applied.state,
      rivalPressure: pressure,
      fundingBeforeTheft: 900,
      week: 2,
      sequenceStart: 1,
      baseTimestamp: 1_700_000_000_000,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('agency.hidden_cell_interference')
    expect(notes[0]?.content).toMatch(/Hidden-cell interference diverted/)
    expect(notes[0]?.metadata).toMatchObject({
      kind: 'funding_theft',
      fundingStolen: effect.fundingStolen,
      rivalPressureBand: pressure.band,
      week: 2,
    })

    const inactiveNotes = buildWeeklyHiddenCellInterferenceReportNotes({
      fundingState: createInitialFundingState(100, 50, 25, 10, 900),
      rivalPressure: buildRivalPressureFromRankingScore(50),
      fundingBeforeTheft: 900,
      week: 2,
      sequenceStart: 1,
    })
    expect(inactiveNotes).toHaveLength(0)
  })

  it('exposes interference on agency and report summaries', () => {
    const state = createStartingState()
    // Drive ranking down so rival pressure becomes competitive/severe.
    state.reports = [
      reportWithFailures(1, 4, 3),
      reportWithFailures(2, 4, 3),
      reportWithFailures(3, 4, 3),
    ]
    state.funding = 1200
    if (state.agency) {
      state.agency.funding = 1200
    }

    const summary = buildAgencySummary(state)
    expect(summary.hiddenCellInterference.active).toBe(true)
    expect(summary.hiddenCellInterference.summary).toMatch(/Hidden-cell interference/)
    expect(summary.hiddenCellInterference.fundingStolen).toBeGreaterThan(0)

    const reportView = getReportPageView(state)
    expect(reportView.summary.agencySummaryLine).toMatch(/hidden-cell interference/)
    expect(reportView.summary.agencySummaryLine).not.toMatch(/hidden-cell interference inactive/)
  })

  it('advanceWeek deducts funding and emits interference note under severe cell pressure', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.reports = [
      reportWithFailures(1, 5, 4),
      reportWithFailures(2, 5, 4),
      reportWithFailures(3, 5, 4),
    ]
    state.funding = 2000
    if (state.agency) {
      state.agency.funding = 2000
      state.agency.fundingState = createInitialFundingState(
        state.config.fundingBasePerWeek,
        state.config.fundingPerResolution,
        state.config.fundingPenaltyPerFail,
        state.config.fundingPenaltyPerUnresolved,
        2000
      )
    }

    const pressureBefore = buildRivalPressureFromRankingScore(
      // Use game ranking via summary to confirm active pressure.
      buildAgencySummary(state).ranking.score
    )
    expect(isHiddenCellPressureActive(pressureBefore.band)).toBe(true)

    const closedWeek = state.week
    const operatingCost = hasWeeklyOperatingCostForWeek(state.agency?.fundingState, closedWeek)
      ? 0
      : computeWeeklyOperatingCost(state, closedWeek)
    const holdingCost = hasWeeklyInventoryHoldingCostForWeek(state.agency?.fundingState, closedWeek)
      ? 0
      : computeWeeklyInventoryHoldingCost(state, closedWeek)
    // advanceWeek resolves theft against post-ops/holding funding (fundingDelta ~0 for quiet week).
    const fundingBasis = Math.max(0, state.funding - operatingCost - holdingCost)
    const expectedTheft = resolveHiddenCellFundingTheftFromPressure(pressureBefore, fundingBasis)
      .fundingStolen
    expect(expectedTheft).toBeGreaterThan(0)

    const nextState = advanceWeek(state)
    const applied = findHiddenCellFundingTheftAmountForWeek(
      nextState.agency?.fundingState,
      closedWeek
    )
    expect(applied).toBe(expectedTheft)

    const lastReport = nextState.reports[nextState.reports.length - 1]
    const interferenceNotes =
      lastReport?.notes?.filter((note) => note.type === 'agency.hidden_cell_interference') ?? []
    expect(interferenceNotes.length).toBeGreaterThanOrEqual(1)
    expect(interferenceNotes[0]?.content).toMatch(/Hidden-cell interference diverted/)
  })

  it('advanceWeek emits no interference note when cell pressure is inactive', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    // Empty / strong ranking → suppressed or balanced pressure → inactive.
    state.reports = []
    state.funding = 2000
    if (state.agency) {
      state.agency.funding = 2000
    }
    state.researchState = researchStateWithActiveProgress()

    const pressure = buildRivalPressureFromRankingScore(buildAgencySummary(state).ranking.score)
    expect(isHiddenCellPressureActive(pressure.band)).toBe(false)

    const nextState = advanceWeek(state)
    expect(findHiddenCellFundingTheftAmountForWeek(nextState.agency?.fundingState, state.week)).toBe(
      0
    )
    expect(
      findHiddenCellResearchRollbackAmountForWeek(nextState.researchState, state.week)
    ).toBe(0)

    const lastReport = nextState.reports[nextState.reports.length - 1]
    const interferenceNotes =
      lastReport?.notes?.filter((note) => note.type === 'agency.hidden_cell_interference') ?? []
    expect(interferenceNotes).toHaveLength(0)
  })

  it('selects lex-min active project with progress for research rollback', () => {
    expect(selectHiddenCellResearchRollbackTarget(researchStateWithActiveProgress())).toBe('proj-a')
    expect(
      selectHiddenCellResearchRollbackTarget(
        researchStateWithActiveProgress({ projectIds: ['proj-z'], progressTime: 0 })
      )
    ).toBeNull()
  })

  it('derives identical research-rollback outcomes for identical inputs', () => {
    const research = researchStateWithActiveProgress({ progressTime: 4 })
    const left = resolveHiddenCellResearchRollbackFromRankingScore(20, research)
    const right = resolveHiddenCellResearchRollbackFromRankingScore(20, research)

    expect(left).toEqual(right)
    expect(left.active).toBe(true)
    expect(left.kind).toBe('research_rollback')
    expect(left.targetProjectId).toBe('proj-a')
    expect(left.progressTimeRolledBack).toBeGreaterThan(0)
    expect(left.summary).toMatch(/rolled back/)
    expect(left.summary).toMatch(/proj-a/)
  })

  it('applies no research rollback when cell pressure is inactive', () => {
    const research = researchStateWithActiveProgress()
    const balanced = resolveHiddenCellResearchRollbackFromRankingScore(50, research)
    const suppressed = resolveHiddenCellResearchRollbackFromRankingScore(80, research)

    expect(balanced.active).toBe(false)
    expect(balanced.progressTimeRolledBack).toBe(0)
    expect(balanced.kind).toBe('none')
    expect(suppressed.active).toBe(false)
    expect(suppressed.progressTimeRolledBack).toBe(0)
  })

  it('clamps research rollback to available progressTime and never un-completes', () => {
    const research = researchStateWithActiveProgress({
      projectIds: ['proj-a'],
      progressTime: 1,
    })
    const effect = resolveHiddenCellResearchRollbackFromRankingScore(10, research)
    expect(effect.baseRollbackAmount).toBeGreaterThanOrEqual(1)
    expect(effect.progressTimeRolledBack).toBe(1)

    const applied = applyHiddenCellResearchRollbackToResearchState(research, effect, 5)
    expect(applied.appliedAmount).toBe(1)
    expect(applied.state.projects['proj-a']?.progressTime).toBe(0)
    expect(applied.state.projects['proj-a']?.status).toBe('active')
    expect(applied.state.completedProjectIds).not.toContain('proj-a')
  })

  it('applies research rollback idempotently once per closed week', () => {
    const research = researchStateWithActiveProgress({ progressTime: 4 })
    const effect = resolveHiddenCellResearchRollbackFromRankingScore(15, research)

    const first = applyHiddenCellResearchRollbackToResearchState(research, effect, 3)
    expect(first.appliedAmount).toBe(effect.progressTimeRolledBack)
    expect(first.state.projects['proj-a']?.progressTime).toBe(4 - effect.progressTimeRolledBack)
    expect(hasHiddenCellResearchRollbackForWeek(first.state, 3)).toBe(true)
    expect(findHiddenCellResearchRollbackAmountForWeek(first.state, 3)).toBe(effect.progressTimeRolledBack)
    expect(findHiddenCellResearchRollbackProjectIdForWeek(first.state, 3)).toBe('proj-a')

    const second = applyHiddenCellResearchRollbackToResearchState(first.state, effect, 3)
    expect(second.appliedAmount).toBe(0)
    expect(second.state.projects['proj-a']?.progressTime).toBe(
      first.state.projects['proj-a']?.progressTime
    )
  })

  it('keeps SPE-2704 funding-theft outcomes unchanged for the same pressure + funding inputs', () => {
    const pressure = buildRivalPressureFromRankingScore(20)
    const fundingEffect = resolveHiddenCellFundingTheftFromPressure(pressure, 900)
    const research = researchStateWithActiveProgress()
    const researchEffect = resolveHiddenCellResearchRollbackFromPressure(pressure, research)

    // Research path must not alter funding-theft resolve.
    expect(fundingEffect.fundingStolen).toBe(
      resolveHiddenCellFundingTheftFromPressure(pressure, 900).fundingStolen
    )
    expect(fundingEffect.kind).toBe('funding_theft')
    expect(researchEffect.kind).toBe('research_rollback')
    expect(computeHiddenCellResearchRollbackBaseAmount(pressure.score, pressure.band)).toBe(
      researchEffect.baseRollbackAmount
    )
  })

  it('builds weekly research-rollback notes only when rollback was applied', () => {
    const pressure = buildRivalPressureFromRankingScore(20)
    const research = researchStateWithActiveProgress({ progressTime: 4 })
    const effect = resolveHiddenCellResearchRollbackFromPressure(pressure, research)
    const applied = applyHiddenCellResearchRollbackToResearchState(research, effect, 2)

    const notes = buildWeeklyHiddenCellResearchRollbackReportNotes({
      researchState: applied.state,
      rivalPressure: pressure,
      week: 2,
      sequenceStart: 1,
      baseTimestamp: 1_700_000_000_000,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('agency.hidden_cell_interference')
    expect(notes[0]?.content).toMatch(/rolled back/)
    expect(notes[0]?.metadata).toMatchObject({
      kind: 'research_rollback',
      progressTimeRolledBack: effect.progressTimeRolledBack,
      researchProjectId: 'proj-a',
      rivalPressureBand: pressure.band,
      week: 2,
    })

    const inactiveNotes = buildWeeklyHiddenCellResearchRollbackReportNotes({
      researchState: researchStateWithActiveProgress(),
      rivalPressure: buildRivalPressureFromRankingScore(50),
      week: 2,
      sequenceStart: 1,
    })
    expect(inactiveNotes).toHaveLength(0)
  })

  it('advanceWeek rolls back research and emits interference note under severe cell pressure', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.reports = [
      reportWithFailures(1, 5, 4),
      reportWithFailures(2, 5, 4),
      reportWithFailures(3, 5, 4),
    ]
    state.funding = 2000
    if (state.agency) {
      state.agency.funding = 2000
      state.agency.fundingState = createInitialFundingState(
        state.config.fundingBasePerWeek,
        state.config.fundingPerResolution,
        state.config.fundingPenaltyPerFail,
        state.config.fundingPenaltyPerUnresolved,
        2000
      )
    }
    state.researchState = researchStateWithActiveProgress({ progressTime: 4 })

    const pressureBefore = buildRivalPressureFromRankingScore(buildAgencySummary(state).ranking.score)
    expect(isHiddenCellPressureActive(pressureBefore.band)).toBe(true)
    const expectedRollback = resolveHiddenCellResearchRollbackFromPressure(
      pressureBefore,
      state.researchState
    ).progressTimeRolledBack
    expect(expectedRollback).toBeGreaterThan(0)

    const closedWeek = state.week
    const nextState = advanceWeek(state)
    expect(findHiddenCellResearchRollbackAmountForWeek(nextState.researchState, closedWeek)).toBe(
      expectedRollback
    )
    expect(nextState.researchState?.projects['proj-a']?.progressTime).toBe(4 - expectedRollback)

    const lastReport = nextState.reports[nextState.reports.length - 1]
    const researchNotes =
      lastReport?.notes?.filter(
        (note) =>
          note.type === 'agency.hidden_cell_interference' &&
          note.metadata?.kind === 'research_rollback'
      ) ?? []
    expect(researchNotes.length).toBeGreaterThanOrEqual(1)
    expect(researchNotes[0]?.content).toMatch(/rolled back/)
  })

  it('derives identical panic-amplification outcomes for identical inputs', () => {
    const left = resolveHiddenCellPanicAmplificationFromRankingScore(20)
    const right = resolveHiddenCellPanicAmplificationFromRankingScore(20)

    expect(left).toEqual(right)
    expect(left.active).toBe(true)
    expect(left.kind).toBe('panic_amplification')
    expect(left.pressureAmplified).toBeGreaterThan(0)
    expect(left.pressureAmplified).toBeLessThanOrEqual(HIDDEN_CELL_PANIC_AMPLIFICATION_MAX)
    expect(left.summary).toMatch(/amplified ambient panic pressure/)
  })

  it('applies no panic amplification when cell pressure is inactive', () => {
    const balanced = resolveHiddenCellPanicAmplificationFromRankingScore(50)
    const suppressed = resolveHiddenCellPanicAmplificationFromRankingScore(80)

    expect(balanced.active).toBe(false)
    expect(balanced.pressureAmplified).toBe(0)
    expect(balanced.kind).toBe('none')
    expect(suppressed.active).toBe(false)
    expect(suppressed.pressureAmplified).toBe(0)
  })

  it('applies panic amplification idempotently once per closed week', () => {
    const effect = resolveHiddenCellPanicAmplificationFromRankingScore(15)
    expect(effect.pressureAmplified).toBeGreaterThan(0)

    const first = applyHiddenCellPanicAmplificationToGameState(
      { globalPressure: 10 },
      effect,
      3
    )
    expect(first.appliedAmount).toBe(effect.pressureAmplified)
    expect(first.state.globalPressure).toBe(10 + effect.pressureAmplified)
    expect(hasHiddenCellPanicAmplificationForWeek(first.state, 3)).toBe(true)
    expect(findHiddenCellPanicAmplificationAmountForWeek(first.state, 3)).toBe(
      effect.pressureAmplified
    )

    const second = applyHiddenCellPanicAmplificationToGameState(first.state, effect, 3)
    expect(second.appliedAmount).toBe(0)
    expect(second.state.globalPressure).toBe(first.state.globalPressure)
  })

  it('keeps SPE-2704/2706 outcomes unchanged for the same pressure inputs', () => {
    const pressure = buildRivalPressureFromRankingScore(20)
    const fundingEffect = resolveHiddenCellFundingTheftFromPressure(pressure, 900)
    const research = researchStateWithActiveProgress()
    const researchEffect = resolveHiddenCellResearchRollbackFromPressure(pressure, research)
    const panicEffect = resolveHiddenCellPanicAmplificationFromPressure(pressure)

    expect(fundingEffect.fundingStolen).toBe(
      resolveHiddenCellFundingTheftFromPressure(pressure, 900).fundingStolen
    )
    expect(researchEffect.progressTimeRolledBack).toBe(
      resolveHiddenCellResearchRollbackFromPressure(pressure, research).progressTimeRolledBack
    )
    expect(computeHiddenCellPanicAmplificationBaseAmount(pressure.score, pressure.band)).toBe(
      panicEffect.baseAmplificationAmount
    )
    expect(panicEffect.kind).toBe('panic_amplification')
  })

  it('builds weekly panic-amplification notes only when amplification was applied', () => {
    const pressure = buildRivalPressureFromRankingScore(20)
    const effect = resolveHiddenCellPanicAmplificationFromPressure(pressure)
    const applied = applyHiddenCellPanicAmplificationToGameState(
      { globalPressure: 5 },
      effect,
      2
    )

    const notes = buildWeeklyHiddenCellPanicAmplificationReportNotes({
      gameState: applied.state,
      rivalPressure: pressure,
      week: 2,
      sequenceStart: 1,
      baseTimestamp: 1_700_000_000_000,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('agency.hidden_cell_interference')
    expect(notes[0]?.content).toMatch(/amplified ambient panic pressure/)
    expect(notes[0]?.metadata).toMatchObject({
      kind: 'panic_amplification',
      pressureAmplified: effect.pressureAmplified,
      rivalPressureBand: pressure.band,
      week: 2,
    })

    const inactiveNotes = buildWeeklyHiddenCellPanicAmplificationReportNotes({
      gameState: { globalPressure: 5 },
      rivalPressure: buildRivalPressureFromRankingScore(50),
      week: 2,
      sequenceStart: 1,
    })
    expect(inactiveNotes).toHaveLength(0)
  })

  it('retains panic-amplification note metadata and markers through hydrateGame', () => {
    const pressure = buildRivalPressureFromRankingScore(20)
    const effect = resolveHiddenCellPanicAmplificationFromPressure(pressure)
    const applied = applyHiddenCellPanicAmplificationToGameState(
      { globalPressure: 12 },
      effect,
      4
    )
    const notes = buildWeeklyHiddenCellPanicAmplificationReportNotes({
      gameState: applied.state,
      rivalPressure: pressure,
      week: 4,
      sequenceStart: 1,
      baseTimestamp: 1_700_000_000_000,
    })

    const state = createStartingState()
    state.week = 5
    state.globalPressure = applied.state.globalPressure
    state.lastHiddenCellPanicAmplificationWeek = applied.state.lastHiddenCellPanicAmplificationWeek
    state.lastHiddenCellPanicAmplificationAmount =
      applied.state.lastHiddenCellPanicAmplificationAmount
    state.reports = [
      {
        week: 4,
        resolvedCases: [],
        partialCases: [],
        failedCases: [],
        unresolvedTriggers: [],
        notes,
      } as unknown as WeeklyReport,
    ]

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)), createStartingState())
    expect(hydrated.lastHiddenCellPanicAmplificationWeek).toBe(4)
    expect(hydrated.lastHiddenCellPanicAmplificationAmount).toBe(effect.pressureAmplified)
    expect(hydrated.reports[0]?.notes?.[0]?.metadata).toMatchObject({
      kind: 'panic_amplification',
      pressureAmplified: effect.pressureAmplified,
      rivalPressureBand: pressure.band,
      week: 4,
    })
  })

  it('advanceWeek amplifies globalPressure and emits panic note under severe cell pressure', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.reports = [
      reportWithFailures(1, 5, 4),
      reportWithFailures(2, 5, 4),
      reportWithFailures(3, 5, 4),
    ]
    state.funding = 2000
    state.globalPressure = 8
    if (state.agency) {
      state.agency.funding = 2000
      state.agency.fundingState = createInitialFundingState(
        state.config.fundingBasePerWeek,
        state.config.fundingPerResolution,
        state.config.fundingPenaltyPerFail,
        state.config.fundingPenaltyPerUnresolved,
        2000
      )
    }

    const pressureBefore = buildRivalPressureFromRankingScore(buildAgencySummary(state).ranking.score)
    expect(isHiddenCellPressureActive(pressureBefore.band)).toBe(true)
    const expectedAmplification =
      resolveHiddenCellPanicAmplificationFromPressure(pressureBefore).pressureAmplified
    expect(expectedAmplification).toBeGreaterThan(0)

    const closedWeek = state.week
    const nextState = advanceWeek(state)
    expect(findHiddenCellPanicAmplificationAmountForWeek(nextState, closedWeek)).toBe(
      expectedAmplification
    )
    // Pressure pipeline may decay/add before amplification; markers prove the applied delta.
    expect(nextState.lastHiddenCellPanicAmplificationAmount).toBe(expectedAmplification)

    const lastReport = nextState.reports[nextState.reports.length - 1]
    const panicNotes =
      lastReport?.notes?.filter(
        (note) =>
          note.type === 'agency.hidden_cell_interference' &&
          note.metadata?.kind === 'panic_amplification'
      ) ?? []
    expect(panicNotes.length).toBeGreaterThanOrEqual(1)
    expect(panicNotes[0]?.content).toMatch(/amplified ambient panic pressure/)
  })

  it('advanceWeek emits no panic note when cell pressure is inactive', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.reports = []
    state.funding = 2000
    state.globalPressure = 8
    if (state.agency) {
      state.agency.funding = 2000
    }

    const pressure = buildRivalPressureFromRankingScore(buildAgencySummary(state).ranking.score)
    expect(isHiddenCellPressureActive(pressure.band)).toBe(false)

    const nextState = advanceWeek(state)
    expect(findHiddenCellPanicAmplificationAmountForWeek(nextState, state.week)).toBe(0)

    const lastReport = nextState.reports[nextState.reports.length - 1]
    const panicNotes =
      lastReport?.notes?.filter(
        (note) =>
          note.type === 'agency.hidden_cell_interference' &&
          note.metadata?.kind === 'panic_amplification'
      ) ?? []
    expect(panicNotes).toHaveLength(0)
  })

  it('derives identical infrastructure-compromise outcomes for identical inputs', () => {
    const left = resolveHiddenCellInfrastructureCompromiseFromRankingScore(20, 4)
    const right = resolveHiddenCellInfrastructureCompromiseFromRankingScore(20, 4)

    expect(left).toEqual(right)
    expect(left.active).toBe(true)
    expect(left.kind).toBe('infrastructure_compromise')
    expect(left.maintenanceCompromised).toBeGreaterThan(0)
    expect(left.maintenanceCompromised).toBeLessThanOrEqual(HIDDEN_CELL_INFRASTRUCTURE_COMPROMISE_MAX)
    expect(left.summary).toMatch(/compromised .* maintenance specialist/)
  })

  it('applies no infrastructure compromise when cell pressure is inactive', () => {
    const balanced = resolveHiddenCellInfrastructureCompromiseFromRankingScore(50, 4)
    const suppressed = resolveHiddenCellInfrastructureCompromiseFromRankingScore(80, 4)

    expect(balanced.active).toBe(false)
    expect(balanced.maintenanceCompromised).toBe(0)
    expect(balanced.kind).toBe('none')
    expect(suppressed.active).toBe(false)
    expect(suppressed.maintenanceCompromised).toBe(0)
  })

  it('clamps infrastructure compromise to available maintenance capacity', () => {
    const effect = resolveHiddenCellInfrastructureCompromiseFromRankingScore(10, 1)
    expect(effect.active).toBe(true)
    expect(effect.baseCompromiseAmount).toBeGreaterThanOrEqual(1)
    expect(effect.maintenanceCompromised).toBe(1)
  })

  it('applies infrastructure compromise idempotently once per closed week', () => {
    const effect = resolveHiddenCellInfrastructureCompromiseFromRankingScore(15, 5)
    expect(effect.maintenanceCompromised).toBeGreaterThan(0)

    const first = applyHiddenCellInfrastructureCompromiseToAgencyState(
      { maintenanceSpecialistsAvailable: 5 },
      effect,
      3
    )
    expect(first.appliedAmount).toBe(effect.maintenanceCompromised)
    expect(first.state.maintenanceSpecialistsAvailable).toBe(5 - effect.maintenanceCompromised)
    expect(hasHiddenCellInfrastructureCompromiseForWeek(first.state, 3)).toBe(true)
    expect(findHiddenCellInfrastructureCompromiseAmountForWeek(first.state, 3)).toBe(
      effect.maintenanceCompromised
    )

    const second = applyHiddenCellInfrastructureCompromiseToAgencyState(first.state, effect, 3)
    expect(second.appliedAmount).toBe(0)
    expect(second.state.maintenanceSpecialistsAvailable).toBe(
      first.state.maintenanceSpecialistsAvailable
    )
  })

  it('keeps SPE-2704/2706/2707 outcomes unchanged for the same pressure inputs', () => {
    const pressure = buildRivalPressureFromRankingScore(20)
    const fundingEffect = resolveHiddenCellFundingTheftFromPressure(pressure, 900)
    const research = researchStateWithActiveProgress()
    const researchEffect = resolveHiddenCellResearchRollbackFromPressure(pressure, research)
    const panicEffect = resolveHiddenCellPanicAmplificationFromPressure(pressure)
    const infraEffect = resolveHiddenCellInfrastructureCompromiseFromPressure(pressure, 4)

    expect(fundingEffect.fundingStolen).toBe(
      resolveHiddenCellFundingTheftFromPressure(pressure, 900).fundingStolen
    )
    expect(researchEffect.progressTimeRolledBack).toBe(
      resolveHiddenCellResearchRollbackFromPressure(pressure, research).progressTimeRolledBack
    )
    expect(panicEffect.pressureAmplified).toBe(
      resolveHiddenCellPanicAmplificationFromPressure(pressure).pressureAmplified
    )
    expect(computeHiddenCellInfrastructureCompromiseBaseAmount(pressure.score, pressure.band)).toBe(
      infraEffect.baseCompromiseAmount
    )
    expect(infraEffect.kind).toBe('infrastructure_compromise')
  })

  it('builds weekly infrastructure-compromise notes only when compromise was applied', () => {
    const pressure = buildRivalPressureFromRankingScore(20)
    const effect = resolveHiddenCellInfrastructureCompromiseFromPressure(pressure, 4)
    const applied = applyHiddenCellInfrastructureCompromiseToAgencyState(
      { maintenanceSpecialistsAvailable: 4 },
      effect,
      2
    )

    const notes = buildWeeklyHiddenCellInfrastructureCompromiseReportNotes({
      agency: applied.state,
      rivalPressure: pressure,
      maintenanceBeforeCompromise: 4,
      week: 2,
      sequenceStart: 1,
      baseTimestamp: 1_700_000_000_000,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('agency.hidden_cell_interference')
    expect(notes[0]?.content).toMatch(/compromised .* maintenance specialist/)
    expect(notes[0]?.metadata).toMatchObject({
      kind: 'infrastructure_compromise',
      maintenanceCompromised: effect.maintenanceCompromised,
      rivalPressureBand: pressure.band,
      week: 2,
    })

    const inactiveNotes = buildWeeklyHiddenCellInfrastructureCompromiseReportNotes({
      agency: { maintenanceSpecialistsAvailable: 4 },
      rivalPressure: buildRivalPressureFromRankingScore(50),
      maintenanceBeforeCompromise: 4,
      week: 2,
      sequenceStart: 1,
    })
    expect(inactiveNotes).toHaveLength(0)
  })

  it('retains infrastructure-compromise note metadata and markers through hydrateGame', () => {
    const pressure = buildRivalPressureFromRankingScore(20)
    const effect = resolveHiddenCellInfrastructureCompromiseFromPressure(pressure, 4)
    const applied = applyHiddenCellInfrastructureCompromiseToAgencyState(
      { maintenanceSpecialistsAvailable: 4 },
      effect,
      4
    )
    const notes = buildWeeklyHiddenCellInfrastructureCompromiseReportNotes({
      agency: applied.state,
      rivalPressure: pressure,
      maintenanceBeforeCompromise: 4,
      week: 4,
      sequenceStart: 1,
      baseTimestamp: 1_700_000_000_000,
    })

    const state = createStartingState()
    state.week = 5
    if (state.agency) {
      state.agency.maintenanceSpecialistsAvailable =
        applied.state.maintenanceSpecialistsAvailable
      state.agency.lastHiddenCellInfrastructureCompromiseWeek =
        applied.state.lastHiddenCellInfrastructureCompromiseWeek
      state.agency.lastHiddenCellInfrastructureCompromiseAmount =
        applied.state.lastHiddenCellInfrastructureCompromiseAmount
    }
    state.reports = [
      {
        week: 4,
        resolvedCases: [],
        partialCases: [],
        failedCases: [],
        unresolvedTriggers: [],
        notes,
      } as unknown as WeeklyReport,
    ]

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)), createStartingState())
    expect(hydrated.agency?.lastHiddenCellInfrastructureCompromiseWeek).toBe(4)
    expect(hydrated.agency?.lastHiddenCellInfrastructureCompromiseAmount).toBe(
      effect.maintenanceCompromised
    )
    expect(hydrated.agency?.maintenanceSpecialistsAvailable).toBe(
      applied.state.maintenanceSpecialistsAvailable
    )
    expect(hydrated.reports[0]?.notes?.[0]?.metadata).toMatchObject({
      kind: 'infrastructure_compromise',
      maintenanceCompromised: effect.maintenanceCompromised,
      rivalPressureBand: pressure.band,
      week: 4,
    })
  })

  it('advanceWeek drains maintenance capacity and emits infra note under severe cell pressure', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.reports = [
      reportWithFailures(1, 5, 4),
      reportWithFailures(2, 5, 4),
      reportWithFailures(3, 5, 4),
    ]
    state.funding = 2000
    if (state.agency) {
      state.agency.funding = 2000
      state.agency.fundingState = createInitialFundingState(
        state.config.fundingBasePerWeek,
        state.config.fundingPerResolution,
        state.config.fundingPenaltyPerFail,
        state.config.fundingPenaltyPerUnresolved,
        2000
      )
      state.agency.maintenanceSpecialistsAvailable = 4
    }

    const pressureBefore = buildRivalPressureFromRankingScore(buildAgencySummary(state).ranking.score)
    expect(isHiddenCellPressureActive(pressureBefore.band)).toBe(true)
    const expectedCompromise = resolveHiddenCellInfrastructureCompromiseFromPressure(
      pressureBefore,
      4
    ).maintenanceCompromised
    expect(expectedCompromise).toBeGreaterThan(0)

    const closedWeek = state.week
    const nextState = advanceWeek(state)
    expect(
      findHiddenCellInfrastructureCompromiseAmountForWeek(nextState.agency, closedWeek)
    ).toBe(expectedCompromise)
    expect(nextState.agency?.maintenanceSpecialistsAvailable).toBe(4 - expectedCompromise)

    const lastReport = nextState.reports[nextState.reports.length - 1]
    const infraNotes =
      lastReport?.notes?.filter(
        (note) =>
          note.type === 'agency.hidden_cell_interference' &&
          note.metadata?.kind === 'infrastructure_compromise'
      ) ?? []
    expect(infraNotes.length).toBeGreaterThanOrEqual(1)
    expect(infraNotes[0]?.content).toMatch(/compromised .* maintenance specialist/)
  })

  it('advanceWeek emits no infrastructure note when cell pressure is inactive', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.reports = []
    state.funding = 2000
    if (state.agency) {
      state.agency.funding = 2000
      state.agency.maintenanceSpecialistsAvailable = 4
    }

    const pressure = buildRivalPressureFromRankingScore(buildAgencySummary(state).ranking.score)
    expect(isHiddenCellPressureActive(pressure.band)).toBe(false)

    const nextState = advanceWeek(state)
    expect(
      findHiddenCellInfrastructureCompromiseAmountForWeek(nextState.agency, state.week)
    ).toBe(0)
    expect(nextState.agency?.maintenanceSpecialistsAvailable).toBe(4)

    const lastReport = nextState.reports[nextState.reports.length - 1]
    const infraNotes =
      lastReport?.notes?.filter(
        (note) =>
          note.type === 'agency.hidden_cell_interference' &&
          note.metadata?.kind === 'infrastructure_compromise'
      ) ?? []
    expect(infraNotes).toHaveLength(0)
  })

  it('preserves infrastructure-compromise markers through a second advanceWeek canonicalize', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.reports = [
      reportWithFailures(1, 5, 4),
      reportWithFailures(2, 5, 4),
      reportWithFailures(3, 5, 4),
    ]
    state.funding = 2000
    if (state.agency) {
      state.agency.funding = 2000
      state.agency.fundingState = createInitialFundingState(
        state.config.fundingBasePerWeek,
        state.config.fundingPerResolution,
        state.config.fundingPenaltyPerFail,
        state.config.fundingPenaltyPerUnresolved,
        2000
      )
      state.agency.maintenanceSpecialistsAvailable = 4
    }

    const closedWeek = state.week
    const afterFirst = advanceWeek(state)
    const applied = findHiddenCellInfrastructureCompromiseAmountForWeek(
      afterFirst.agency,
      closedWeek
    )
    expect(applied).toBeGreaterThan(0)
    expect(afterFirst.agency?.lastHiddenCellInfrastructureCompromiseWeek).toBe(closedWeek)
    expect(afterFirst.agency?.lastHiddenCellInfrastructureCompromiseAmount).toBe(applied)

    // Inactive second week: no new apply. canonicalizeAgencyState must keep prior markers.
    freezeCasesForQuietWeek(afterFirst)
    afterFirst.reports = []
    const afterSecond = advanceWeek(afterFirst)
    expect(isHiddenCellPressureActive(
      buildRivalPressureFromRankingScore(buildAgencySummary(afterFirst).ranking.score).band
    )).toBe(false)
    expect(afterSecond.agency?.lastHiddenCellInfrastructureCompromiseWeek).toBe(closedWeek)
    expect(afterSecond.agency?.lastHiddenCellInfrastructureCompromiseAmount).toBe(applied)
    expect(afterSecond.agency?.maintenanceSpecialistsAvailable).toBe(
      afterFirst.agency?.maintenanceSpecialistsAvailable
    )
  })
})
