import { buildTeamDeploymentReadinessState, evaluateDeploymentEligibility } from './deploymentReadiness'
import { getMissionIntelSummary } from './intel'
import { routeMission, triageMission } from './missionIntakeRouting'
import type {
  DeploymentHardBlockerCode,
  DeploymentSoftRiskCode,
  GameState,
  Id,
  MissionRoutingBlockerCode,
} from './models'
import {
  buildCurrentSimulationPressureSummary,
  computeBudgetPressureIndex,
  type ValidationPressureSource,
} from './sim/validation'
import { WEAKEST_LINK_CALIBRATION } from './sim/calibration'
import type {
  WeakestLinkMissionResolutionResult,
  WeakestLinkPenaltyBucket,
  WeakestLinkPenaltySourceCode,
} from './weakestLinkResolution'

const MAX_EXPLANATION_DETAILS = 3
const DEFAULT_TREND_WINDOW = 5

export type VisibilityExplanationCategory =
  | 'routing'
  | 'deployment-readiness'
  | 'weakest-link'
  | 'weekly-pressure'

export type VisibilityExplanationSeverity = 'info' | 'warning' | 'error'

export interface BaseVisibilityExplanation {
  explanationId?: string
  category: VisibilityExplanationCategory
  summary: string
  dominantFactor: string
  details: string[]
  relatedIds: string[]
  severity: VisibilityExplanationSeverity
  timestamp: number
  actions?: string[]
}

export interface RoutingExplanation extends BaseVisibilityExplanation {
  category: 'routing'
}

export interface DeploymentReadinessExplanation extends BaseVisibilityExplanation {
  category: 'deployment-readiness'
  hardBlockers: string[]
  softRisks: string[]
  readinessScore?: number
}

export interface WeakestLinkExplanation extends BaseVisibilityExplanation {
  category: 'weakest-link'
}

export interface WeeklyPressureExplanation extends BaseVisibilityExplanation {
  category: 'weekly-pressure'
  dominantPressureSource: ValidationPressureSource
  secondaryFactors: ValidationPressureSource[]
  unresolvedTrend: number[]
  budgetPressureTrend: number[]
  attritionPressureTrend: number[]
  intelConfidenceTrend: number[]
}

const ROUTING_BLOCKER_LABELS: Record<MissionRoutingBlockerCode, string> = {
  'missing-coverage': 'missing coverage',
  'training-blocked': 'training blocked',
  'invalid-loadout-gate': 'loadout gate failed',
  'missing-certification': 'missing certification',
  'fatigue-over-threshold': 'fatigue threshold exceeded',
  'no-eligible-teams': 'no eligible teams',
  'no-valid-team': 'no valid team',
  'capacity-locked': 'team capacity locked',
  'team-state-incompatible': 'team state incompatible',
  'routing-state-blocked': 'routing state blocked',
  'recovery-required': 'recovery required',
}

const DEPLOYMENT_HARD_BLOCKER_LABELS: Record<DeploymentHardBlockerCode, string> = {
  'missing-coverage': 'missing coverage',
  'training-blocked': 'training blocked',
  'invalid-loadout-gate': 'loadout gate failed',
  'missing-certification': 'missing certification',
  'team-state-incompatible': 'team state incompatible',
  'routing-state-blocked': 'routing state blocked',
  'capacity-locked': 'capacity locked',
  'recovery-required': 'recovery required',
}

const DEPLOYMENT_SOFT_RISK_LABELS: Record<DeploymentSoftRiskCode, string> = {
  'low-cohesion-band': 'low cohesion',
  'high-fatigue-burden': 'high fatigue burden',
  'weakest-link-risk': 'weakest-link risk',
  'strategic-mismatch': 'strategic mismatch',
  'budget-pressure': 'budget pressure',
  'attrition-pressure': 'attrition pressure',
  'intel-uncertainty': 'intel uncertainty',
}

const WEAKEST_LINK_LABELS: Record<WeakestLinkPenaltySourceCode, string> = {
  'missing-coverage': 'missing coverage',
  'low-min-readiness': 'low minimum readiness',
  'fragile-cohesion': 'fragile cohesion',
  'training-lock-pressure': 'training lock pressure',
  'loadout-gate-miss': 'loadout gate miss',
  'fatigue-concentration': 'fatigue concentration',
  'intel-friction': 'intel friction',
}

const PRESSURE_LABELS: Record<ValidationPressureSource, string> = {
  stable: 'stable pressure',
  'case-load': 'case-load pressure',
  intel: 'intel pressure',
  escalation: 'escalation pressure',
  budget: 'budget pressure',
  attrition: 'attrition pressure',
}

function uniqueStrings(values: Array<string | undefined | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.length > 0)))]
}

function takeBoundedDetails(values: Array<string | undefined | null>, limit = MAX_EXPLANATION_DETAILS) {
  return uniqueStrings(values).slice(0, limit)
}

function formatSigned(value: number, digits = 0) {
  const rounded = Number(value.toFixed(digits))
  return `${rounded >= 0 ? '+' : ''}${rounded.toFixed(digits)}`
}

export function formatVisibilityFactorLabel(factor: string) {
  if (factor in ROUTING_BLOCKER_LABELS) {
    return ROUTING_BLOCKER_LABELS[factor as MissionRoutingBlockerCode]
  }

  if (factor in DEPLOYMENT_HARD_BLOCKER_LABELS) {
    return DEPLOYMENT_HARD_BLOCKER_LABELS[factor as DeploymentHardBlockerCode]
  }

  if (factor in DEPLOYMENT_SOFT_RISK_LABELS) {
    return DEPLOYMENT_SOFT_RISK_LABELS[factor as DeploymentSoftRiskCode]
  }

  if (factor in WEAKEST_LINK_LABELS) {
    return WEAKEST_LINK_LABELS[factor as WeakestLinkPenaltySourceCode]
  }

  if (factor in PRESSURE_LABELS) {
    return PRESSURE_LABELS[factor as ValidationPressureSource]
  }

  switch (factor) {
    case 'urgency':
      return 'urgency'
    case 'threat-severity':
      return 'threat severity'
    case 'escalation-risk':
      return 'escalation risk'
    case 'strategic-value':
      return 'strategic value'
    case 'capacity-pressure':
      return 'capacity pressure'
    case 'intel-risk':
      return 'intel risk'
    case 'only-eligible-team':
      return 'only eligible team'
    case 'coverage-lead':
      return 'coverage lead'
    case 'fitness-lead':
      return 'readiness and cohesion lead'
    case 'time-cost-lead':
      return 'time-cost lead'
    case 'cohesion-lead':
      return 'cohesion lead'
    case 'fatigue-lead':
      return 'fatigue lead'
    case 'deterministic-tie-break':
      return 'deterministic tie-break'
    case 'readiness-margin':
      return 'readiness margin'
    case 'mission-ready':
      return 'mission ready'
    case 'clean-success':
      return 'clean success'
    default:
      return factor.replace(/-/g, ' ')
  }
}

function sortByMagnitude<T extends { magnitude: number; factor: string }>(values: T[]) {
  return values.slice().sort((left, right) => {
    if (left.magnitude !== right.magnitude) {
      return right.magnitude - left.magnitude
    }

    return left.factor.localeCompare(right.factor)
  })
}

function sortBucketsByPenalty(left: WeakestLinkPenaltyBucket, right: WeakestLinkPenaltyBucket) {
  if (left.appliedPenalty !== right.appliedPenalty) {
    return right.appliedPenalty - left.appliedPenalty
  }

  return left.code.localeCompare(right.code)
}

function buildRoutingSeverity(routingState: ReturnType<typeof routeMission>['routingState']) {
  if (routingState === 'blocked') {
    return 'error' as const
  }

  if (routingState === 'queued' || routingState === 'deferred') {
    return 'warning' as const
  }

  return 'info' as const
}

function buildReadinessSeverity(readinessCategory: ReturnType<typeof buildTeamDeploymentReadinessState>['readinessCategory']) {
  if (readinessCategory === 'hard_blocked') {
    return 'error' as const
  }

  if (readinessCategory === 'conditional' || readinessCategory === 'temporarily_blocked' || readinessCategory === 'recovery_required') {
    return 'warning' as const
  }

  return 'info' as const
}

function buildWeakestLinkSeverity(resultKind: WeakestLinkMissionResolutionResult['resultKind']) {
  if (resultKind === 'fail') {
    return 'error' as const
  }

  if (resultKind === 'partial') {
    return 'warning' as const
  }

  return 'info' as const
}

function buildPressureSeverity(maxPressure: number, gameOver: boolean) {
  if (gameOver || maxPressure >= 1) {
    return 'error' as const
  }

  if (maxPressure >= 0.75) {
    return 'warning' as const
  }

  return 'info' as const
}

function buildRoutingCandidateReason(routing: ReturnType<typeof routeMission>) {
  const top = routing.rankedCandidates[0]
  if (!top) {
    return null
  }

  const second = routing.rankedCandidates.find((candidate) => candidate.teamId !== top.teamId)

  if (!top.valid) {
    const blocker = top.blockerCodes[0] ?? 'no-eligible-teams'
    return {
      dominantFactor: blocker,
      detail: `${top.teamId} was the leading candidate, but ${formatVisibilityFactorLabel(blocker)} kept it from assignment.`,
    }
  }

  if (!second || !second.valid) {
    return {
      dominantFactor: 'only-eligible-team',
      detail: `${top.teamId} is the only currently eligible team for this mission.`,
    }
  }

  if (top.completeness !== second.completeness) {
    return {
      dominantFactor: 'coverage-lead',
      detail: `${top.teamId} leads on role coverage (${top.completeness} vs ${second.completeness}).`,
    }
  }

  const topFitness = top.readinessScore + top.cohesionScore
  const secondFitness = second.readinessScore + second.cohesionScore
  if (topFitness !== secondFitness) {
    return {
      dominantFactor: 'fitness-lead',
      detail: `${top.teamId} leads on readiness plus cohesion (${topFitness} vs ${secondFitness}).`,
    }
  }

  if (top.expectedTotalWeeks !== second.expectedTotalWeeks) {
    return {
      dominantFactor: 'time-cost-lead',
      detail: `${top.teamId} wins on projected total time (${top.expectedTotalWeeks}w vs ${second.expectedTotalWeeks}w).`,
    }
  }

  if (top.cohesionScore !== second.cohesionScore) {
    return {
      dominantFactor: 'cohesion-lead',
      detail: `${top.teamId} wins the tie on cohesion (${top.cohesionScore} vs ${second.cohesionScore}).`,
    }
  }

  if (top.fatigueBurden !== second.fatigueBurden) {
    return {
      dominantFactor: 'fatigue-lead',
      detail: `${top.teamId} wins the tie on lower fatigue (${top.fatigueBurden} vs ${second.fatigueBurden}).`,
    }
  }

  return {
    dominantFactor: 'deterministic-tie-break',
    detail: `${top.teamId} wins the final deterministic tie-break over ${second.teamId}.`,
  }
}

export function explainMissionRouting(state: GameState, missionId: Id): RoutingExplanation {
  const mission = state.cases[missionId]

  if (!mission) {
    return {
      explanationId: `routing.${missionId}.w${state.week}`,
      category: 'routing',
      summary: `Mission ${missionId} could not be routed because the case reference is missing.`,
      dominantFactor: 'missing-mission',
      details: ['The routing helper did not find a matching case in the current simulation state.'],
      relatedIds: [missionId],
      severity: 'error',
      timestamp: state.week,
    }
  }

  const triage = triageMission(state, mission)
  const routing = routeMission(state, missionId)
  const intel = getMissionIntelSummary(mission, state.week)
  const inProgressCount = Object.values(state.cases).filter((currentCase) => currentCase.status === 'in_progress').length
  const candidateReason = buildRoutingCandidateReason(routing)
  const triageContributors = sortByMagnitude([
    {
      factor: 'urgency',
      magnitude: triage.dimensions.urgency,
      detail: `Urgency adds ${triage.dimensions.urgency} from stage ${mission.stage} and deadline ${mission.deadlineRemaining}.`,
    },
    {
      factor: 'threat-severity',
      magnitude: triage.dimensions.threatSeverity,
      detail: `Threat severity adds ${triage.dimensions.threatSeverity} from combat ${mission.difficulty.combat} and utility ${mission.difficulty.utility}.`,
    },
    {
      factor: 'escalation-risk',
      magnitude: triage.dimensions.escalationRisk,
      detail: `Escalation risk adds ${triage.dimensions.escalationRisk} from stage ${mission.stage}${mission.kind === 'raid' ? ' raid pressure' : ''}.`,
    },
    {
      factor: 'strategic-value',
      magnitude: triage.dimensions.strategicValue,
      detail: `Strategic value adds ${triage.dimensions.strategicValue}${mission.contract ? ' from contract payout' : mission.factionId ? ' from faction relevance' : ' from baseline incident value'}.`,
    },
    {
      factor: 'capacity-pressure',
      magnitude: triage.dimensions.capacityPenalty,
      detail: `Capacity pressure subtracts ${triage.dimensions.capacityPenalty} with ${inProgressCount} mission(s) already in progress.`,
    },
    {
      factor: 'attrition-pressure',
      magnitude: triage.dimensions.attritionPressure,
      detail: `Attrition pressure subtracts ${triage.dimensions.attritionPressure} from staffing gaps and replacement strain.`,
    },
    {
      factor: 'intel-risk',
      magnitude: triage.dimensions.intelRisk,
      detail: `Intel risk subtracts ${triage.dimensions.intelRisk} at confidence ${intel.confidence.toFixed(2)} and uncertainty ${intel.uncertainty.toFixed(2)}.`,
    },
  ])

  const dominantBlocker =
    routing.routingBlockers.find((blocker) => blocker !== 'no-eligible-teams') ??
    routing.routingBlockers[0]
  const dominantFactor = dominantBlocker ?? candidateReason?.dominantFactor ?? triageContributors[0]?.factor ?? routing.routingState

  const topCandidateId = routing.candidateTeamIds[0]
  const summary =
    routing.routingState === 'blocked'
      ? `Mission ${missionId} is blocked by ${formatVisibilityFactorLabel(dominantFactor)}.`
      : routing.routingState === 'queued' || routing.routingState === 'deferred'
        ? `Mission ${missionId} is ${routing.routingState}; ${formatVisibilityFactorLabel(dominantFactor)} is the main reason it is not assigned yet.`
        : routing.routingState === 'assigned'
          ? `Mission ${missionId} is assigned${topCandidateId ? ` with ${topCandidateId} leading the route` : ''}.`
          : `Mission ${missionId} is shortlisted${topCandidateId ? ` with ${topCandidateId} currently on top` : ''}.`

  return {
    explanationId: `routing.${missionId}.w${state.week}`,
    category: 'routing',
    summary,
    dominantFactor,
    details: takeBoundedDetails([
      routing.routingBlockers.length > 0
        ? `Routing blockers: ${routing.routingBlockers.map((blocker) => formatVisibilityFactorLabel(blocker)).join(', ')}.`
        : undefined,
      candidateReason?.detail,
      triageContributors[0]?.detail,
      triage.dimensions.intelRisk > 0 ? triageContributors.find((entry) => entry.factor === 'intel-risk')?.detail : undefined,
    ]),
    relatedIds: uniqueStrings([missionId, ...routing.candidateTeamIds.slice(0, 2)]),
    severity: buildRoutingSeverity(routing.routingState),
    timestamp: state.week,
  }
}

export function explainDeploymentReadiness(
  state: GameState,
  teamId: Id,
  missionId?: Id
): DeploymentReadinessExplanation {
  const team = state.teams[teamId]
  const effectiveMissionId =
    missionId ??
    (team?.status?.assignedCaseId ?? team?.assignedCaseId ?? Object.keys(state.cases)[0] ?? '')
  const mission = state.cases[effectiveMissionId]

  if (!team || !mission) {
    return {
      explanationId: `deployment.${teamId}.${effectiveMissionId || 'unknown'}.w${state.week}`,
      category: 'deployment-readiness',
      summary: `Deployment readiness for ${teamId} could not be explained because the team or mission reference is missing.`,
      dominantFactor: 'missing-reference',
      details: ['The readiness helper needs both a valid team id and a valid mission id.'],
      hardBlockers: ['missing-reference'],
      softRisks: [],
      relatedIds: uniqueStrings([teamId, effectiveMissionId]),
      severity: 'error',
      timestamp: state.week,
    }
  }

  const readiness = buildTeamDeploymentReadinessState(state, teamId, effectiveMissionId)
  const eligibility = evaluateDeploymentEligibility(state, effectiveMissionId, teamId)
  const intel = getMissionIntelSummary(mission, state.week)
  const nonIntelSoftRiskCount = readiness.softRisks.filter((risk) => risk !== 'intel-uncertainty').length
  const dominantFactor = (() => {
    if (readiness.hardBlockers.length > 0) {
      return readiness.hardBlockers[0]!
    }

    if (
      (readiness.intelPenalty ?? 0) > 0 &&
      (readiness.intelPenalty ?? 0) > Math.max(readiness.averageFatigue, nonIntelSoftRiskCount * 6)
    ) {
      return 'intel-uncertainty'
    }

    if (readiness.softRisks.includes('high-fatigue-burden')) {
      return 'high-fatigue-burden'
    }

    if (readiness.softRisks.length > 0) {
      return readiness.softRisks[0]!
    }

    return readiness.readinessScore >= 85 ? 'mission-ready' : 'readiness-margin'
  })()

  const summary =
    readiness.readinessCategory === 'mission_ready'
      ? `Team ${teamId} is mission-ready for ${effectiveMissionId}.`
      : readiness.readinessCategory === 'conditional'
        ? `Team ${teamId} is conditionally ready for ${effectiveMissionId}; ${formatVisibilityFactorLabel(dominantFactor)} is the main risk.`
        : readiness.readinessCategory === 'temporarily_blocked'
          ? `Team ${teamId} is temporarily blocked for ${effectiveMissionId} by ${formatVisibilityFactorLabel(dominantFactor)}.`
          : readiness.readinessCategory === 'hard_blocked'
            ? `Team ${teamId} is hard-blocked for ${effectiveMissionId} by ${formatVisibilityFactorLabel(dominantFactor)}.`
            : `Team ${teamId} needs recovery before ${effectiveMissionId}; ${formatVisibilityFactorLabel(dominantFactor)} is dominant.`

  return {
    explanationId: `deployment.${teamId}.${effectiveMissionId}.w${state.week}`,
    category: 'deployment-readiness',
    summary,
    dominantFactor,
    details: takeBoundedDetails([
      readiness.hardBlockers.length > 0
        ? `Hard blockers: ${readiness.hardBlockers.map((blocker) => formatVisibilityFactorLabel(blocker)).join(', ')}.`
        : undefined,
      readiness.softRisks.length > 0
        ? `Soft risks: ${readiness.softRisks.map((risk) => formatVisibilityFactorLabel(risk)).join(', ')}.`
        : undefined,
      readiness.intelPenalty && readiness.intelPenalty > 0
        ? `Intel penalty is ${readiness.intelPenalty} at confidence ${intel.confidence.toFixed(2)}, uncertainty ${intel.uncertainty.toFixed(2)}, age ${intel.age}.`
        : undefined,
      `Readiness ${readiness.readinessScore} comes from fatigue ${readiness.averageFatigue}, minimum member readiness ${readiness.minimumMemberReadiness}, and coverage ${readiness.coverageCompleteness.covered.length}/${readiness.coverageCompleteness.required.length}.`,
      eligibility.explanationNotes[0],
    ]),
    hardBlockers: [...readiness.hardBlockers],
    softRisks: [...readiness.softRisks],
    readinessScore: readiness.readinessScore,
    relatedIds: uniqueStrings([teamId, effectiveMissionId]),
    severity: buildReadinessSeverity(readiness.readinessCategory),
    timestamp: state.week,
  }
}

function buildThresholdDetail(result: WeakestLinkMissionResolutionResult) {
  if (result.resultKind === 'success') {
    return `Final delta ${formatSigned(result.finalDelta, 2)} cleared the required score ${result.requiredScore.toFixed(2)}.`
  }

  if (result.resultKind === 'partial') {
    return `Final delta ${formatSigned(result.finalDelta, 2)} stayed above the fail threshold ${WEAKEST_LINK_CALIBRATION.partialFailureThreshold.toFixed(2)}.`
  }

  return `Final delta ${formatSigned(result.finalDelta, 2)} crossed the fail threshold ${WEAKEST_LINK_CALIBRATION.partialFailureThreshold.toFixed(2)}.`
}

export function explainWeakestLinkResolution(
  result: WeakestLinkMissionResolutionResult,
  options?: {
    relatedIds?: string[]
  }
): WeakestLinkExplanation {
  const positiveBuckets = result.weakestLinkPenaltyBuckets.filter((bucket) => bucket.appliedPenalty > 0).sort(sortBucketsByPenalty)
  const dominantBucket = positiveBuckets[0]
  const dominantFactor = dominantBucket?.code ?? 'clean-success'
  const summary =
    result.resultKind === 'success' && !dominantBucket
      ? `Weakest-link resolution stayed clean for ${result.missionId}.`
      : `Weakest-link resolution for ${result.missionId} is ${result.resultKind}; ${formatVisibilityFactorLabel(dominantFactor)} is dominant.`
  const recoveryDetail =
    result.outcomeCategory === 'failure_recovery_pressure'
      ? `Recovery-pressure promotion triggered because fatigue concentration reached ${(
          positiveBuckets.find((bucket) => bucket.code === 'fatigue-concentration')?.appliedPenalty ?? 0
        ).toFixed(2)} against threshold ${WEAKEST_LINK_CALIBRATION.recoveryPressureFailureThreshold.toFixed(2)}.`
      : result.recoveryPressureBand
        ? `Recovery pressure band is ${result.recoveryPressureBand}.`
        : undefined

  return {
    explanationId: `weakest-link.${result.missionId}.w${result.week}`,
    category: 'weakest-link',
    summary,
    dominantFactor,
    details: takeBoundedDetails([
      dominantBucket
        ? `${formatVisibilityFactorLabel(dominantBucket.code)} applied ${dominantBucket.appliedPenalty.toFixed(2)} from raw signal ${dominantBucket.rawSignal.toFixed(2)}.`
        : 'No penalty bucket applied any weakest-link drag.',
      ...positiveBuckets.slice(1, 3).map(
        (bucket) =>
          `${formatVisibilityFactorLabel(bucket.code)} contributed ${bucket.appliedPenalty.toFixed(2)}.`
      ),
      buildThresholdDetail(result),
      recoveryDetail,
    ]),
    relatedIds: uniqueStrings([result.missionId, ...(options?.relatedIds ?? [])]),
    severity: buildWeakestLinkSeverity(result.resultKind),
    timestamp: result.week,
  }
}

function countUnresolvedInReport(report: GameState['reports'][number]) {
  return Object.values(report.caseSnapshots ?? {}).filter((snapshot) => snapshot.status !== 'resolved').length
}

function buildUnresolvedTrend(state: GameState, currentValue: number, limit = DEFAULT_TREND_WINDOW) {
  const values = (state.reports ?? []).slice(-limit).map(countUnresolvedInReport).filter((value) => Number.isFinite(value))
  return values.length > 0 ? values : [currentValue]
}

function buildBudgetPressureTrend(state: GameState, currentValue: number, limit = DEFAULT_TREND_WINDOW) {
  const values: number[] = []

  for (const event of state.events ?? []) {
    if (event.type !== 'agency.containment_updated') {
      continue
    }

    values.push(computeBudgetPressureIndex(event.payload.fundingAfter))
  }

  return values.slice(-limit).length > 0 ? values.slice(-limit) : [currentValue]
}

function buildAttritionTrend(state: GameState, currentValue: number, limit = DEFAULT_TREND_WINDOW) {
  const attritionEventTypes = new Set(['agent.injured', 'agent.killed', 'agent.resigned'])
  const countsByWeek = new Map<number, number>()

  for (const event of state.events ?? []) {
    if (!attritionEventTypes.has(event.type)) {
      continue
    }

    countsByWeek.set(event.payload.week, (countsByWeek.get(event.payload.week) ?? 0) + 1)
  }

  const values = [...countsByWeek.entries()]
    .sort(([leftWeek], [rightWeek]) => leftWeek - rightWeek)
    .slice(-limit)
    .map(([, count]) => count)

  return values.length > 0 ? values : [currentValue]
}

function buildIntelConfidenceTrend(currentValue: number) {
  return [Number(currentValue.toFixed(2))]
}

function compareUnresolvedCases(left: GameState['cases'][string], right: GameState['cases'][string]) {
  if (left.deadlineRemaining !== right.deadlineRemaining) {
    return left.deadlineRemaining - right.deadlineRemaining
  }

  if (left.stage !== right.stage) {
    return right.stage - left.stage
  }

  return left.id.localeCompare(right.id)
}

export function explainWeeklyPressureState(
  state: GameState,
  options?: {
    trendWindow?: number
  }
): WeeklyPressureExplanation {
  const pressure = buildCurrentSimulationPressureSummary(state)
  const trendWindow = options?.trendWindow ?? DEFAULT_TREND_WINDOW
  const sortedSources = Object.entries(pressure.pressureScores)
    .sort(([leftSource, leftValue], [rightSource, rightValue]) => {
      if (leftValue !== rightValue) {
        return rightValue - leftValue
      }

      return leftSource.localeCompare(rightSource)
    })
    .map(([source]) => source as Exclude<ValidationPressureSource, 'stable'>)
  const dominantPressureSource =
    Math.max(...Object.values(pressure.pressureScores)) < 0.5 ? 'stable' : pressure.dominantPressureSource
  const secondaryFactors = sortedSources.filter((source) => source !== pressure.dominantPressureSource).slice(0, 2)
  const unresolvedTrend = buildUnresolvedTrend(state, pressure.unresolvedCaseCount, trendWindow)
  const budgetPressureTrend = buildBudgetPressureTrend(state, pressure.budgetPressure, trendWindow)
  const attritionPressureTrend = buildAttritionTrend(state, pressure.attritionPressureCount, trendWindow)
  const intelConfidenceTrend = buildIntelConfidenceTrend(pressure.intelConfidence)
  const maxPressure = Math.max(...Object.values(pressure.pressureScores))
  const criticalCases = Object.values(state.cases)
    .filter((currentCase) => currentCase.status !== 'resolved')
    .sort(compareUnresolvedCases)
    .slice(0, 3)
    .map((currentCase) => currentCase.id)

  return {
    explanationId: `pressure.w${state.week}`,
    category: 'weekly-pressure',
    summary:
      dominantPressureSource === 'stable'
        ? `Weekly pressure is currently stable; ${formatVisibilityFactorLabel(pressure.dominantPressureSource)} is the loudest active factor.`
        : `Weekly pressure is led by ${formatVisibilityFactorLabel(pressure.dominantPressureSource)}${secondaryFactors.length > 0 ? ` with ${secondaryFactors.map((factor) => formatVisibilityFactorLabel(factor)).join(' and ')} behind it` : ''}.`,
    dominantFactor: pressure.dominantFactor,
    dominantPressureSource,
    secondaryFactors,
    details: takeBoundedDetails(
      sortByMagnitude(
        (Object.entries(pressure.pressureScores) as Array<[Exclude<ValidationPressureSource, 'stable'>, number]>).map(
          ([factor, magnitude]) => ({
            factor,
            magnitude,
            detail:
              factor === 'case-load'
                ? `${pressure.unresolvedCaseCount} unresolved case(s) are consuming ${state.config.maxActiveCases} active-case slots.`
                : factor === 'budget'
                  ? `Funding/procurement state maps to budget pressure ${pressure.budgetPressure}/4 at $${state.funding}.`
                  : factor === 'attrition'
                    ? `${pressure.attritionPressureCount} agent(s) are currently in loss, injury, or recovery pressure states.`
                    : factor === 'intel'
                      ? `Active-case intel confidence is ${pressure.intelConfidence.toFixed(2)}.`
                      : `Escalation burden is ${pressure.escalationBurden} from global escalation, threat drift, and time pressure.`,
          })
        )
      ).map((entry) => entry.detail)
    ),
    relatedIds: criticalCases,
    severity: buildPressureSeverity(maxPressure, state.gameOver),
    timestamp: state.week,
    unresolvedTrend,
    budgetPressureTrend,
    attritionPressureTrend,
    intelConfidenceTrend,
  }
}
