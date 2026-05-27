import { GAME_OVER_REASONS } from '../../data/copy'
import { appendOperationEventDrafts, type AnyOperationEventDraft } from '../events'
import { clamp } from '../math'
import type {
  GameState,
  MissionResult,
  MissionRewardBreakdown,
  PerformanceMetricSummary,
  WeeklyReport,
} from '../models'
import {
  buildDeterministicReportNotesFromEventDrafts,
  getHistoricalReportNoteDrafts,
} from '../reportNotes'
import { getCampaignDate, resolveCalendarConfig } from '../campaignCalendar'
import { ensureNormalizedGameState } from '../teamSimulation'
import { buildReportTeamStatus } from './reportTeamStatus'
import { calcWeekScore } from './scoring'
import { buildReportCaseSnapshots } from './reportCaseSnapshot'

interface WeeklyReportBuildInput {
  sourceState: GameState
  nextState: GameState
  spawnedCaseIds: string[]
  progressedCases: string[]
  resolvedCases: string[]
  failedCases: string[]
  partialCases: string[]
  unresolvedTriggers: string[]
  performanceByCaseId: Partial<Record<string, PerformanceMetricSummary>>
  rewardByCaseId: Partial<Record<string, MissionRewardBreakdown>>
  missionResultByCaseId: Partial<Record<string, MissionResult>>
}

interface WeeklyAgencyMetricsInput {
  sourceState: GameState
  nextState: GameState
  report: WeeklyReport
  weekScore: number
  eventDrafts: AnyOperationEventDraft[]
}

interface WeeklyStateFinalizeInput {
  sourceState: GameState
  finalState: GameState
  report: WeeklyReport
  weekScore: number
  eventDrafts: AnyOperationEventDraft[]
  resolvedCases: string[]
  failedCases: string[]
  partialCases: string[]
  unresolvedTriggers: string[]
  missionResultByCaseId: Partial<Record<string, MissionResult>>
  noteBaseTimestamp?: number
}

export interface BuiltWeeklyReport {
  report: WeeklyReport
  weekScore: number
}

export interface AgencyMetricUpdate {
  finalState: GameState
  weekScore: number
}

function computeFundingDelta(report: WeeklyReport, config: GameState['config']) {
  return (
    config.fundingBasePerWeek +
    report.resolvedCases.reduce(
      (sum, caseId) => sum + (report.caseSnapshots?.[caseId]?.rewardBreakdown?.fundingDelta ?? 0),
      0
    ) +
    report.partialCases.reduce(
      (sum, caseId) => sum + (report.caseSnapshots?.[caseId]?.rewardBreakdown?.fundingDelta ?? 0),
      0
    ) +
    report.failedCases.reduce(
      (sum, caseId) => sum + (report.caseSnapshots?.[caseId]?.rewardBreakdown?.fundingDelta ?? 0),
      0
    ) +
    report.unresolvedTriggers.reduce(
      (sum, caseId) => sum + (report.caseSnapshots?.[caseId]?.rewardBreakdown?.fundingDelta ?? 0),
      0
    )
  )
}

function computeContainmentDelta(report: WeeklyReport, config: GameState['config']) {
  return (
    -config.containmentWeeklyDecay +
    report.resolvedCases.reduce(
      (sum, caseId) =>
        sum + (report.caseSnapshots?.[caseId]?.rewardBreakdown?.containmentDelta ?? 0),
      0
    ) +
    report.partialCases.reduce(
      (sum, caseId) =>
        sum + (report.caseSnapshots?.[caseId]?.rewardBreakdown?.containmentDelta ?? 0),
      0
    ) +
    report.failedCases.reduce(
      (sum, caseId) =>
        sum + (report.caseSnapshots?.[caseId]?.rewardBreakdown?.containmentDelta ?? 0),
      0
    ) +
    report.unresolvedTriggers.reduce(
      (sum, caseId) =>
        sum + (report.caseSnapshots?.[caseId]?.rewardBreakdown?.containmentDelta ?? 0),
      0
    )
  )
}

function computeClearanceLevel(cumulativeScore: number, thresholds: number[]) {
  const sortedThresholds = [...thresholds].sort((a, b) => a - b)

  if (sortedThresholds.length === 0) {
    return 1
  }

  let level = 1

  for (const threshold of sortedThresholds) {
    if (cumulativeScore >= threshold) {
      level += 1
      continue
    }

    break
  }

  return Math.max(level - 1, 1)
}

function getAverageRosterFatigue(agents: GameState['agents']) {
  const values = Object.values(agents)

  if (values.length === 0) {
    return 0
  }

  return Math.round(values.reduce((sum, agent) => sum + agent.fatigue, 0) / values.length)
}

function assertExclusiveCaseBuckets(
  resolvedCases: string[],
  failedCases: string[],
  partialCases: string[],
  unresolvedTriggers: string[]
) {
  const buckets = [resolvedCases, failedCases, partialCases, unresolvedTriggers]
  const uniqueIds = new Set(buckets.flatMap((bucket) => bucket))
  const bucketEntryCount = buckets.reduce((sum, bucket) => sum + bucket.length, 0)

  if (uniqueIds.size !== bucketEntryCount) {
    throw new Error('Weekly case outcome buckets overlap within the same tick.')
  }
}

function getEventCaseIds(
  drafts: AnyOperationEventDraft[],
  type:
    | 'case.resolved'
    | 'case.failed'
    | 'case.partially_resolved'
    | 'case.escalated'
    | 'case.spawned'
) {
  const caseIds: string[] = []

  for (const draft of drafts) {
    switch (draft.type) {
      case 'case.resolved':
      case 'case.failed':
      case 'case.partially_resolved':
      case 'case.escalated':
      case 'case.spawned':
        if (draft.type === type) {
          caseIds.push(draft.payload.caseId)
        }
        break
      default:
        break
    }
  }

  return caseIds
}

function assertReportEventAlignment(drafts: AnyOperationEventDraft[], report: WeeklyReport) {
  const checks = [
    ['case.resolved', report.resolvedCases],
    ['case.failed', report.failedCases],
    ['case.partially_resolved', report.partialCases],
    ['case.escalated', report.unresolvedTriggers],
    ['case.spawned', report.spawnedCases],
  ] as const

  for (const [type, expected] of checks) {
    const actual = getEventCaseIds(drafts, type)

    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Weekly report drift detected for ${type}.`)
    }
  }
}

function assertRewardAlignment(drafts: AnyOperationEventDraft[], report: WeeklyReport) {
  for (const draft of drafts) {
    if (
      draft.type !== 'case.resolved' &&
      draft.type !== 'case.failed' &&
      draft.type !== 'case.partially_resolved' &&
      draft.type !== 'case.escalated'
    ) {
      continue
    }

    const snapshotReward = report.caseSnapshots?.[draft.payload.caseId]?.rewardBreakdown
    const eventReward = draft.payload.rewardBreakdown

    if (JSON.stringify(snapshotReward) !== JSON.stringify(eventReward)) {
      throw new Error(`Weekly reward drift detected for ${draft.type} (${draft.payload.caseId}).`)
    }
  }
}

function assertMissionResultAlignment(
  missionResultByCaseId: Partial<Record<string, MissionResult>>,
  report: WeeklyReport
) {
  for (const [caseId, missionResult] of Object.entries(missionResultByCaseId)) {
    if (!missionResult) {
      continue
    }

    const snapshot = report.caseSnapshots?.[caseId]

    if (!snapshot) {
      throw new Error(`Weekly mission result drift detected for missing snapshot (${caseId}).`)
    }

    if (JSON.stringify(snapshot.missionResult) !== JSON.stringify(missionResult)) {
      throw new Error(`Weekly mission result drift detected for ${caseId}.`)
    }

    if (JSON.stringify(snapshot.rewardBreakdown) !== JSON.stringify(missionResult.rewards)) {
      throw new Error(`Mission reward breakdown drift detected for ${caseId}.`)
    }

    if (
      JSON.stringify(snapshot.performanceSummary) !==
      JSON.stringify(missionResult.performanceSummary)
    ) {
      throw new Error(`Mission performance drift detected for ${caseId}.`)
    }
  }
}

function assertReportNoteAlignment(
  drafts: AnyOperationEventDraft[],
  report: WeeklyReport,
  week: number,
  noteBaseTimestamp?: number
) {
  const expected = buildDeterministicReportNotesFromEventDrafts(drafts, week, noteBaseTimestamp)

  if (JSON.stringify(report.notes) !== JSON.stringify(expected)) {
    throw new Error('Weekly report notes drift detected from event draft reflections.')
  }
}

function getWeeklyReportNoteDrafts(sourceState: GameState, drafts: AnyOperationEventDraft[]) {
  return [...getHistoricalReportNoteDrafts(sourceState.events, sourceState.week), ...drafts]
}

export function buildWeeklyReport({
  sourceState,
  nextState,
  spawnedCaseIds,
  progressedCases,
  resolvedCases,
  failedCases,
  partialCases,
  unresolvedTriggers,
  performanceByCaseId,
  rewardByCaseId,
  missionResultByCaseId,
}: WeeklyReportBuildInput): BuiltWeeklyReport {
  const report: WeeklyReport = {
    week: sourceState.week,
    date: getCampaignDate(sourceState.week, resolveCalendarConfig(sourceState.config)),
    rngStateBefore: sourceState.rngState,
    rngStateAfter: nextState.rngState,
    newCases: [...spawnedCaseIds],
    progressedCases: [...progressedCases],
    resolvedCases: [...resolvedCases],
    failedCases: [...failedCases],
    partialCases: [...partialCases],
    unresolvedTriggers: [...unresolvedTriggers],
    spawnedCases: [...spawnedCaseIds],
    maxStage: Math.max(
      ...Object.values(nextState.cases).map((currentCase) => currentCase.stage),
      0
    ),
    avgFatigue: getAverageRosterFatigue(nextState.agents),
    teamStatus: buildReportTeamStatus(nextState.teams, nextState.agents, nextState.cases, {
      recoveryLookup: { teams: sourceState.teams, cases: sourceState.cases },
    }),
    caseSnapshots: buildReportCaseSnapshots(
      nextState.cases,
      sourceState.knowledge,
      performanceByCaseId,
      rewardByCaseId,
      missionResultByCaseId
    ),
    notes: [],
  }

  return {
    report,
    weekScore: calcWeekScore(report),
  }
}

export function applyWeeklyAgencyMetrics({
  sourceState,
  nextState,
  report,
  weekScore,
  eventDrafts,
}: WeeklyAgencyMetricsInput): AgencyMetricUpdate {
  const fundingDelta = computeFundingDelta(report, nextState.config)
  const containmentDelta = computeContainmentDelta(report, nextState.config)
  const nextFunding = nextState.funding + fundingDelta
  const nextContainmentRating = clamp(nextState.containmentRating + containmentDelta, 0, 100)
  const cumulativeScore =
    sourceState.reports.reduce((sum, currentReport) => sum + calcWeekScore(currentReport), 0) +
    weekScore
  const nextClearanceLevel = computeClearanceLevel(
    cumulativeScore,
    nextState.config.clearanceThresholds
  )

  if (
    nextFunding !== nextState.funding ||
    nextContainmentRating !== nextState.containmentRating ||
    nextClearanceLevel !== nextState.clearanceLevel
  ) {
    eventDrafts.push({
      type: 'agency.containment_updated',
      sourceSystem: 'system',
      payload: {
        week: report.week,
        containmentRatingBefore: nextState.containmentRating,
        containmentRatingAfter: nextContainmentRating,
        containmentDelta,
        clearanceLevelBefore: nextState.clearanceLevel,
        clearanceLevelAfter: nextClearanceLevel,
        fundingBefore: nextState.funding,
        fundingAfter: nextFunding,
        fundingDelta,
      },
    })
  }

  const activeCaseCount = Object.values(nextState.cases).filter(
    (currentCase) => currentCase.status !== 'resolved'
  ).length
  const allResolved = activeCaseCount === 0
  const capacityExceeded = activeCaseCount > nextState.config.maxActiveCases

  return {
    weekScore,
    finalState: {
      ...nextState,
      gameOver: allResolved || capacityExceeded,
      gameOverReason: allResolved
        ? GAME_OVER_REASONS.allResolved
        : capacityExceeded
          ? GAME_OVER_REASONS.capExceeded
          : undefined,
      funding: nextFunding,
      containmentRating: nextContainmentRating,
      clearanceLevel: nextClearanceLevel,
      reports: [...sourceState.reports, report],
    },
  }
}

export function finalizeWeeklyState({
  sourceState,
  finalState,
  report,
  weekScore,
  eventDrafts,
  resolvedCases,
  failedCases,
  partialCases,
  unresolvedTriggers,
  missionResultByCaseId,
  noteBaseTimestamp,
}: WeeklyStateFinalizeInput) {
  const reportNoteDrafts = getWeeklyReportNoteDrafts(sourceState, eventDrafts)
  const finalizedReport = {
    ...report,
    notes: buildDeterministicReportNotesFromEventDrafts(
      reportNoteDrafts,
      sourceState.week,
      noteBaseTimestamp
    ),
  }
  const finalStateWithReport = {
    ...finalState,
    reports: [...finalState.reports.slice(0, -1), finalizedReport],
  }

  eventDrafts.push({
    type: 'intel.report_generated',
    sourceSystem: 'intel',
    payload: {
      week: finalizedReport.week,
      resolvedCount: finalizedReport.resolvedCases.length,
      failedCount: finalizedReport.failedCases.length,
      partialCount: finalizedReport.partialCases.length,
      unresolvedCount: finalizedReport.unresolvedTriggers.length,
      spawnedCount: finalizedReport.spawnedCases.length,
      noteCount: finalizedReport.notes.length,
      score: weekScore,
    },
  })

  assertExclusiveCaseBuckets(resolvedCases, failedCases, partialCases, unresolvedTriggers)
  assertReportEventAlignment(eventDrafts, finalizedReport)
  assertRewardAlignment(eventDrafts, finalizedReport)
  assertMissionResultAlignment(missionResultByCaseId, finalizedReport)
  assertReportNoteAlignment(reportNoteDrafts, finalizedReport, sourceState.week, noteBaseTimestamp)

  return ensureNormalizedGameState(appendOperationEventDrafts(finalStateWithReport, eventDrafts))
}
