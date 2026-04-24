import type { GameState, Id, MissionPriorityBand, MissionRoutingStateKind } from '../../domain/models'
import { buildTeamDeploymentReadinessState } from '../../domain/deploymentReadiness'
import { normalizeMissionRoutingState } from '../../domain/missionIntakeRouting'
import {
  explainDeploymentReadiness,
  explainMissionRouting,
  explainWeakestLinkResolution,
  explainWeeklyPressureState,
  formatVisibilityFactorLabel,
} from '../../domain/visibility'
import { buildCurrentSimulationPressureSummary } from '../../domain/sim/validation'

const MAX_ROUTING_ITEMS = 4
const MAX_READINESS_ITEMS = 4
const MAX_OUTCOME_ITEMS = 4
const MAX_HIGHLIGHTS = 3
const MAX_DETAILS = 3

const PRIORITY_SORT_ORDER: Record<MissionPriorityBand, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
}

const ROUTING_STATE_LABELS: Record<MissionRoutingStateKind, string> = {
  queued: 'Queued',
  shortlisted: 'Shortlisted',
  assigned: 'Assigned',
  deferred: 'Deferred',
  blocked: 'Blocked',
}

export interface MissionRoutingReportItemView {
  missionId: Id
  missionTitle: string
  priorityLabel: string
  routingStateLabel: string
  summary: string
  dominantFactorLabel: string
  highlights: string[]
  details: string[]
}

export interface DeploymentReadinessReportItemView {
  missionId: Id
  missionTitle: string
  teamId: Id
  teamName: string
  readinessCategoryLabel: string
  readinessScore: number
  summary: string
  dominantFactorLabel: string
  hardBlockers: string[]
  softRisks: string[]
  details: string[]
}

export interface WeakestLinkOutcomeReportItemView {
  missionId: Id
  missionTitle: string
  week: number
  outcomeLabel: string
  summary: string
  dominantFactorLabel: string
  contributors: string[]
  recoveryIndicator: string
  gainSummary: string
  costSummary: string
  netSummary: string
}

export interface WeeklyOperationsSummaryView {
  summary: string
  dominantPressureLabel: string
  secondaryPressureLabels: string[]
  unresolvedTrend: number[]
  budgetPressureSummary: string
  attritionPressureSummary: string
  intelConfidenceSummary: string
  details: string[]
}

export interface OperationsReportView {
  missionRouting: MissionRoutingReportItemView[]
  deploymentReadiness: DeploymentReadinessReportItemView[]
  recentOutcomes: WeakestLinkOutcomeReportItemView[]
  weeklySummary: WeeklyOperationsSummaryView
}

function capitalizeLabel(value: string) {
  return value.length > 0 ? `${value[0]!.toUpperCase()}${value.slice(1)}` : value
}

function formatCodeLabel(value: string) {
  return value
    .replace(/[:_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function takeBounded(values: string[], limit: number) {
  return [...new Set(values.filter((value) => value.trim().length > 0))].slice(0, limit)
}

function compareMissionRecords(
  left: ReturnType<typeof normalizeMissionRoutingState>['missions'][string],
  right: ReturnType<typeof normalizeMissionRoutingState>['missions'][string]
) {
  const leftPriority = PRIORITY_SORT_ORDER[left.priority]
  const rightPriority = PRIORITY_SORT_ORDER[right.priority]

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority
  }

  if (left.triageScore !== right.triageScore) {
    return right.triageScore - left.triageScore
  }

  return left.missionId.localeCompare(right.missionId)
}

function formatReadinessCategoryLabel(value: string) {
  return capitalizeLabel(formatCodeLabel(value).toLowerCase())
}

function formatOutcomeLabel(value: string) {
  return value === 'success'
    ? 'Success'
    : value === 'partial'
      ? 'Partial'
      : value === 'fail'
        ? 'Fail'
        : capitalizeLabel(formatCodeLabel(value).toLowerCase())
}

function formatSigned(value: number) {
  return `${value >= 0 ? '+' : ''}${value}`
}

function buildOutcomeGainSummary(
  missionResult: NonNullable<GameState['reports'][number]['caseSnapshots']>[string]['missionResult']
) {
  const reward = missionResult?.rewards

  if (!reward) {
    return 'No mission reward ledger was recorded.'
  }

  return takeBounded(
    [
      reward.fundingDelta !== 0 ? `Funding ${formatSigned(reward.fundingDelta)}` : '',
      reward.reputationDelta !== 0 ? `Reputation ${formatSigned(reward.reputationDelta)}` : '',
      reward.inventoryRewards.length > 0
        ? `${reward.inventoryRewards[0]!.quantity}x ${reward.inventoryRewards[0]!.label}`
        : '',
      reward.factionStanding.length > 0
        ? `${reward.factionStanding[0]!.label} ${formatSigned(reward.factionStanding[0]!.delta)}`
        : '',
    ],
    MAX_DETAILS
  ).join(' / ') || 'No meaningful gain landed on the weekly ledger.'
}

function buildOutcomeCostSummary(
  missionResult: NonNullable<GameState['reports'][number]['caseSnapshots']>[string]['missionResult']
) {
  const injuries = missionResult?.injuries.length ?? 0
  const fatalities = missionResult?.fatalities?.length ?? 0
  const fatigueTargets =
    missionResult?.fatigueChanges.filter((change) => Math.abs(change.delta) > 0).length ?? 0

  return takeBounded(
    [
      injuries > 0 ? `${injuries} injury record${injuries === 1 ? '' : 's'}` : '',
      fatalities > 0 ? `${fatalities} fatalit${fatalities === 1 ? 'y' : 'ies'}` : '',
      fatigueTargets > 0 ? `Fatigue shifted across ${fatigueTargets} operative${fatigueTargets === 1 ? '' : 's'}` : '',
      (missionResult?.spawnedConsequences.length ?? 0) > 0
        ? `${missionResult?.spawnedConsequences.length ?? 0} follow-up consequence${(missionResult?.spawnedConsequences.length ?? 0) === 1 ? '' : 's'}`
        : '',
    ],
    MAX_DETAILS
  ).join(' / ') || 'No major staffing or recovery cost was logged.'
}

function buildOutcomeNetSummary(
  missionResult: NonNullable<GameState['reports'][number]['caseSnapshots']>[string]['missionResult'],
  recoveryIndicator: string
) {
  const injuries = missionResult?.injuries.length ?? 0
  const fatalities = missionResult?.fatalities?.length ?? 0
  const outcome = missionResult?.outcome ?? 'partial'

  if (outcome === 'fail') {
    return 'Net negative: the operation did not offset the staffing and recovery bill.'
  }

  if (fatalities > 0 || recoveryIndicator === 'Recovery pressure critical') {
    return 'Net mixed at best: rewards landed, but the recovery drag is still severe.'
  }

  if (injuries > 0 || outcome === 'partial') {
    return 'Net mixed: gains landed, but recovery and staffing drag are part of the cost.'
  }

  return 'Net positive: the gain landed without meaningful follow-on drag.'
}

export function getMissionRoutingReportView(
  game: GameState,
  limit = MAX_ROUTING_ITEMS
): MissionRoutingReportItemView[] {
  const missionRouting = normalizeMissionRoutingState(game)

  return Object.values(missionRouting.missions)
    .sort(compareMissionRecords)
    .slice(0, limit)
    .map((entry) => {
      const explanation = explainMissionRouting(game, entry.missionId)
      const missionTitle = game.cases[entry.missionId]?.title ?? entry.missionId
      const highlights =
        entry.routingBlockers.length > 0
          ? entry.routingBlockers.map((blocker) =>
              capitalizeLabel(formatVisibilityFactorLabel(blocker))
            )
          : entry.priorityReasonCodes.map(formatCodeLabel)

      return {
        missionId: entry.missionId,
        missionTitle,
        priorityLabel: capitalizeLabel(entry.priority),
        routingStateLabel: ROUTING_STATE_LABELS[entry.routingState],
        summary: explanation.summary,
        dominantFactorLabel: capitalizeLabel(
          formatVisibilityFactorLabel(explanation.dominantFactor)
        ),
        highlights: takeBounded(highlights, MAX_HIGHLIGHTS),
        details: explanation.details.slice(0, MAX_DETAILS),
      }
    })
}

export function getDeploymentReadinessReportView(
  game: GameState,
  limit = MAX_READINESS_ITEMS
): DeploymentReadinessReportItemView[] {
  const missionRouting = normalizeMissionRoutingState(game)

  return Object.values(missionRouting.missions)
    .sort(compareMissionRecords)
    .map((entry) => {
      const teamId =
        entry.assignedTeamIds[0] ??
        entry.lastCandidateTeamIds[0] ??
        game.cases[entry.missionId]?.assignedTeamIds[0]
      const team = teamId ? game.teams[teamId] : undefined

      if (!teamId || !team) {
        return null
      }

      const explanation = explainDeploymentReadiness(game, teamId, entry.missionId)
      const readinessState = buildTeamDeploymentReadinessState(game, teamId, entry.missionId)
      const missionTitle = game.cases[entry.missionId]?.title ?? entry.missionId

      return {
        missionId: entry.missionId,
        missionTitle,
        teamId,
        teamName: team.name,
        readinessCategoryLabel: formatReadinessCategoryLabel(readinessState.readinessCategory),
        readinessScore: explanation.readinessScore ?? 0,
        summary: explanation.summary,
        dominantFactorLabel: capitalizeLabel(
          formatVisibilityFactorLabel(explanation.dominantFactor)
        ),
        hardBlockers: explanation.hardBlockers
          .map((blocker) => capitalizeLabel(formatVisibilityFactorLabel(blocker)))
          .slice(0, MAX_HIGHLIGHTS),
        softRisks: explanation.softRisks
          .map((risk) => capitalizeLabel(formatVisibilityFactorLabel(risk)))
          .slice(0, MAX_HIGHLIGHTS),
        details: explanation.details.slice(0, MAX_DETAILS),
      } satisfies DeploymentReadinessReportItemView
    })
    .filter((entry): entry is DeploymentReadinessReportItemView => Boolean(entry))
    .slice(0, limit)
}

export function getWeakestLinkOutcomeReportView(
  game: GameState,
  limit = MAX_OUTCOME_ITEMS
): WeakestLinkOutcomeReportItemView[] {
  const entries = game.reports
    .slice()
    .reverse()
    .flatMap((report) =>
      Object.values(report.caseSnapshots ?? {})
        .filter((snapshot) => snapshot.missionResult?.weakestLink)
        .sort((left, right) => left.caseId.localeCompare(right.caseId))
        .map((snapshot) => ({ reportWeek: report.week, snapshot }))
    )

  return entries.slice(0, limit).map(({ reportWeek, snapshot }) => {
    const weakestLink = snapshot.missionResult!.weakestLink!
    const explanation = explainWeakestLinkResolution(weakestLink, {
      relatedIds: snapshot.missionResult?.teamsUsed.map((usage) => usage.teamId),
    })
    const recoveryIndicator =
      weakestLink.outcomeCategory === 'failure_recovery_pressure'
        ? 'Recovery pressure critical'
        : weakestLink.recoveryPressureBand
          ? `Recovery pressure ${capitalizeLabel(weakestLink.recoveryPressureBand)}`
          : 'Recovery pressure stable'

    return {
      missionId: snapshot.caseId,
      missionTitle: snapshot.title,
      week: reportWeek,
      outcomeLabel: formatOutcomeLabel(snapshot.missionResult?.outcome ?? weakestLink.resultKind),
      summary: explanation.summary,
      dominantFactorLabel: capitalizeLabel(
        formatVisibilityFactorLabel(explanation.dominantFactor)
      ),
      contributors: explanation.details.slice(0, MAX_DETAILS),
      recoveryIndicator,
      gainSummary: buildOutcomeGainSummary(snapshot.missionResult),
      costSummary: buildOutcomeCostSummary(snapshot.missionResult),
      netSummary: buildOutcomeNetSummary(snapshot.missionResult, recoveryIndicator),
    }
  })
}

export function getWeeklyOperationsSummaryView(game: GameState): WeeklyOperationsSummaryView {
  const explanation = explainWeeklyPressureState(game)
  const pressure = buildCurrentSimulationPressureSummary(game)

  return {
    summary: explanation.summary,
    dominantPressureLabel: capitalizeLabel(
      formatVisibilityFactorLabel(explanation.dominantPressureSource)
    ),
    secondaryPressureLabels: explanation.secondaryFactors.map((factor) =>
      capitalizeLabel(formatVisibilityFactorLabel(factor))
    ),
    unresolvedTrend: [...explanation.unresolvedTrend],
    budgetPressureSummary: `Budget pressure ${pressure.budgetPressure}/4 at $${game.funding}.`,
    attritionPressureSummary: `${pressure.attritionPressureCount} operative(s) are in active attrition pressure states.`,
    intelConfidenceSummary: `Average mission intel confidence ${Math.round(
      pressure.intelConfidence * 100
    )}%.`,
    details: explanation.details.slice(0, MAX_DETAILS),
  }
}

export function getOperationsReportView(game: GameState): OperationsReportView {
  return {
    missionRouting: getMissionRoutingReportView(game),
    deploymentReadiness: getDeploymentReadinessReportView(game),
    recentOutcomes: getWeakestLinkOutcomeReportView(game),
    weeklySummary: getWeeklyOperationsSummaryView(game),
  }
}
