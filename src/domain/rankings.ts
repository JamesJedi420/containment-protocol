import { clamp } from './math'
import type { GameState } from './models'
import type { OperationEvent } from './events/types'

export interface RankingScoreFactor {
  label: string
  value: number
  points: number
  detail: string
}

export interface RankingPenaltyFactor {
  label: string
  value: number
  penalty: number
  detail: string
}

export interface RankingProgressionFactor extends RankingScoreFactor {
  xpGained: number
  promotions: number
}

export interface AgencyRankingBreakdown {
  casesResolved: RankingScoreFactor & {
    resolvedCases: number
    partialCases: number
  }
  majorIncidentsHandled: RankingScoreFactor & {
    resolvedIncidents: number
    partialIncidents: number
  }
  reputation: RankingScoreFactor & {
    reputationDelta: number
  }
  progression: RankingProgressionFactor
  failures: RankingPenaltyFactor & {
    failedCases: number
  }
  unresolved: RankingPenaltyFactor & {
    unresolvedCases: number
  }
}

export interface AgencyRankingHistoryEntry {
  week: number
  score: number
  tier: AgencyRankingTier
  deltaFromPrevious: number
  summary: {
    reportsLogged: number
    resolvedCases: number
    majorIncidentsHandled: number
    failures: number
    unresolved: number
    reputationDelta: number
    progressionXp: number
  }
}

export type AgencyRankingTier = 'S' | 'A' | 'B' | 'C' | 'D'

export interface AgencyRankingView {
  score: number
  tier: AgencyRankingTier
  reportsLogged: number
  updatedThroughWeek: number | null
  breakdown: AgencyRankingBreakdown
  history: AgencyRankingHistoryEntry[]
}

interface RankingAccumulator {
  reportsLogged: number
  resolvedCases: number
  partialCases: number
  failedCases: number
  unresolvedCases: number
  majorResolvedIncidents: number
  majorPartialIncidents: number
  reputationDelta: number
  progressionXp: number
  promotions: number
}

const RANKING_BASE_SCORE = 50
const RESOLVED_CASE_POINTS = 4
const PARTIAL_CASE_POINTS = 2
const RESOLVED_MAJOR_INCIDENT_POINTS = 8
const PARTIAL_MAJOR_INCIDENT_POINTS = 4
const REPUTATION_POINT_RATE = 1
const PROGRESSION_XP_PER_POINT = 150
const PROMOTION_POINTS = 3
const FAILURE_PENALTY_POINTS = 6
const UNRESOLVED_PENALTY_POINTS = 8
const DEFAULT_HISTORY_LIMIT = 8

function createEmptyAccumulator(): RankingAccumulator {
  return {
    reportsLogged: 0,
    resolvedCases: 0,
    partialCases: 0,
    failedCases: 0,
    unresolvedCases: 0,
    majorResolvedIncidents: 0,
    majorPartialIncidents: 0,
    reputationDelta: 0,
    progressionXp: 0,
    promotions: 0,
  }
}

function getRankingTier(score: number): AgencyRankingTier {
  if (score >= 90) {
    return 'S'
  }

  if (score >= 75) {
    return 'A'
  }

  if (score >= 60) {
    return 'B'
  }

  if (score >= 40) {
    return 'C'
  }

  return 'D'
}

function isMajorIncidentOutcome(
  payload:
    | Extract<OperationEvent, { type: 'case.resolved' }>['payload']
    | Extract<OperationEvent, { type: 'case.partially_resolved' }>['payload']
) {
  const stage = 'stage' in payload ? payload.stage : Math.max(payload.fromStage, payload.toStage)

  return payload.kind === 'raid' || stage >= 4
}

function accumulateRankingEvent(accumulator: RankingAccumulator, event: OperationEvent) {
  switch (event.type) {
    case 'case.resolved':
      accumulator.reputationDelta += event.payload.rewardBreakdown?.reputationDelta ?? 0
      if (isMajorIncidentOutcome(event.payload)) {
        accumulator.majorResolvedIncidents += 1
      }
      break
    case 'case.partially_resolved':
      accumulator.reputationDelta += event.payload.rewardBreakdown?.reputationDelta ?? 0
      if (isMajorIncidentOutcome(event.payload)) {
        accumulator.majorPartialIncidents += 1
      }
      break
    case 'case.failed':
    case 'case.escalated':
      accumulator.reputationDelta += event.payload.rewardBreakdown?.reputationDelta ?? 0
      break
    case 'progression.xp_gained':
      accumulator.progressionXp += event.payload.xpAmount
      break
    case 'agent.promoted':
      accumulator.promotions += event.payload.levelsGained
      break
    default:
      break
  }
}

function buildAgencyRankingBreakdown(accumulator: RankingAccumulator): AgencyRankingBreakdown {
  const casesResolvedPoints =
    accumulator.resolvedCases * RESOLVED_CASE_POINTS +
    accumulator.partialCases * PARTIAL_CASE_POINTS
  const majorIncidentPoints =
    accumulator.majorResolvedIncidents * RESOLVED_MAJOR_INCIDENT_POINTS +
    accumulator.majorPartialIncidents * PARTIAL_MAJOR_INCIDENT_POINTS
  const reputationPoints = accumulator.reputationDelta * REPUTATION_POINT_RATE
  const progressionPoints =
    Math.floor(accumulator.progressionXp / PROGRESSION_XP_PER_POINT) +
    accumulator.promotions * PROMOTION_POINTS
  const failurePenalty = accumulator.failedCases * FAILURE_PENALTY_POINTS
  const unresolvedPenalty = accumulator.unresolvedCases * UNRESOLVED_PENALTY_POINTS

  return {
    casesResolved: {
      label: 'Cases resolved',
      value: accumulator.resolvedCases + accumulator.partialCases,
      resolvedCases: accumulator.resolvedCases,
      partialCases: accumulator.partialCases,
      points: casesResolvedPoints,
      detail: `${accumulator.resolvedCases} full resolutions and ${accumulator.partialCases} partial resolutions contribute operational ranking points.`,
    },
    majorIncidentsHandled: {
      label: 'Major incidents handled',
      value: accumulator.majorResolvedIncidents + accumulator.majorPartialIncidents,
      resolvedIncidents: accumulator.majorResolvedIncidents,
      partialIncidents: accumulator.majorPartialIncidents,
      points: majorIncidentPoints,
      detail:
        'High-scale raids and stage-four incidents award additional ranking weight when contained.',
    },
    reputation: {
      label: 'Reputation',
      value: accumulator.reputationDelta,
      reputationDelta: accumulator.reputationDelta,
      points: reputationPoints,
      detail:
        'Reputation comes from the deterministic mission reward model attached to incident outcomes.',
    },
    progression: {
      label: 'Progression',
      value:
        Math.floor(accumulator.progressionXp / PROGRESSION_XP_PER_POINT) + accumulator.promotions,
      xpGained: accumulator.progressionXp,
      promotions: accumulator.promotions,
      points: progressionPoints,
      detail:
        'Progression points come from cumulative XP gain and confirmed promotions across the roster.',
    },
    failures: {
      label: 'Failures',
      value: accumulator.failedCases,
      failedCases: accumulator.failedCases,
      penalty: failurePenalty,
      detail: 'Failed operations reduce the agency ranking directly.',
    },
    unresolved: {
      label: 'Unresolved',
      value: accumulator.unresolvedCases,
      unresolvedCases: accumulator.unresolvedCases,
      penalty: unresolvedPenalty,
      detail: 'Unresolved incidents carry the heaviest ranking penalty because pressure compounds.',
    },
  }
}

function buildAgencyRankingFromAccumulator(
  accumulator: RankingAccumulator,
  updatedThroughWeek: number | null
): Omit<AgencyRankingView, 'history'> {
  const breakdown = buildAgencyRankingBreakdown(accumulator)
  const score = clamp(
    Math.round(
      RANKING_BASE_SCORE +
        breakdown.casesResolved.points +
        breakdown.majorIncidentsHandled.points +
        breakdown.reputation.points +
        breakdown.progression.points -
        breakdown.failures.penalty -
        breakdown.unresolved.penalty
    ),
    0,
    100
  )

  return {
    score,
    tier: getRankingTier(score),
    reportsLogged: accumulator.reportsLogged,
    updatedThroughWeek,
    breakdown,
  }
}

export function buildAgencyRankingHistory(
  game: Pick<GameState, 'reports' | 'events'>,
  limit = DEFAULT_HISTORY_LIMIT
): AgencyRankingHistoryEntry[] {
  const reports = [...game.reports].sort((left, right) => left.week - right.week)
  const eventsByWeek = new Map<number, OperationEvent[]>()

  for (const event of game.events) {
    const currentWeekEvents = eventsByWeek.get(event.payload.week) ?? []
    currentWeekEvents.push(event)
    eventsByWeek.set(event.payload.week, currentWeekEvents)
  }

  const accumulator = createEmptyAccumulator()
  const history: AgencyRankingHistoryEntry[] = []

  for (const report of reports) {
    accumulator.reportsLogged += 1
    accumulator.resolvedCases += report.resolvedCases.length
    accumulator.partialCases += report.partialCases.length
    accumulator.failedCases += report.failedCases.length
    accumulator.unresolvedCases += report.unresolvedTriggers.length

    const weeklyEvents = [...(eventsByWeek.get(report.week) ?? [])].sort((left, right) =>
      left.id.localeCompare(right.id)
    )

    for (const event of weeklyEvents) {
      accumulateRankingEvent(accumulator, event)
    }

    const ranking = buildAgencyRankingFromAccumulator(accumulator, report.week)
    const previousScore = history[history.length - 1]?.score ?? RANKING_BASE_SCORE

    history.push({
      week: report.week,
      score: ranking.score,
      tier: ranking.tier,
      deltaFromPrevious: ranking.score - previousScore,
      summary: {
        reportsLogged: accumulator.reportsLogged,
        resolvedCases: accumulator.resolvedCases,
        majorIncidentsHandled:
          accumulator.majorResolvedIncidents + accumulator.majorPartialIncidents,
        failures: accumulator.failedCases,
        unresolved: accumulator.unresolvedCases,
        reputationDelta: accumulator.reputationDelta,
        progressionXp: accumulator.progressionXp,
      },
    })
  }

  return history.slice(-Math.max(1, limit))
}

export function buildAgencyRanking(game: Pick<GameState, 'reports' | 'events'>): AgencyRankingView {
  const history = buildAgencyRankingHistory(game, Number.MAX_SAFE_INTEGER)
  const latestEntry = history[history.length - 1]

  if (!latestEntry) {
    return {
      ...buildAgencyRankingFromAccumulator(createEmptyAccumulator(), null),
      history: [],
    }
  }

  const accumulator = createEmptyAccumulator()
  const reportsByWeek = new Map(game.reports.map((report) => [report.week, report]))
  const eventsByWeek = new Map<number, OperationEvent[]>()

  for (const event of game.events) {
    const currentWeekEvents = eventsByWeek.get(event.payload.week) ?? []
    currentWeekEvents.push(event)
    eventsByWeek.set(event.payload.week, currentWeekEvents)
  }

  for (const week of [...reportsByWeek.keys()].sort((left, right) => left - right)) {
    const report = reportsByWeek.get(week)
    if (!report) {
      continue
    }

    accumulator.reportsLogged += 1
    accumulator.resolvedCases += report.resolvedCases.length
    accumulator.partialCases += report.partialCases.length
    accumulator.failedCases += report.failedCases.length
    accumulator.unresolvedCases += report.unresolvedTriggers.length

    const weeklyEvents = [...(eventsByWeek.get(week) ?? [])].sort((left, right) =>
      left.id.localeCompare(right.id)
    )

    for (const event of weeklyEvents) {
      accumulateRankingEvent(accumulator, event)
    }
  }

  return {
    ...buildAgencyRankingFromAccumulator(accumulator, latestEntry.week),
    history: history.slice(-DEFAULT_HISTORY_LIMIT),
  }
}
