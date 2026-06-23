import { assessAttritionPressure } from './agent/attrition'
import { createSeededRng, normalizeSeed } from './math'
import { buildAgentLoadoutReadinessSummary } from './equipment'
import {
  buildTeamDeploymentReadinessState,
  evaluateDeploymentEligibility,
} from './deploymentReadiness'
import { assessFundingPressure } from './funding'
import { createMissionIntelState, getMissionIntelRisk } from './intel'
import {
  INTEL_CALIBRATION,
  isSecondEscalationBandWeek,
  PRESSURE_CALIBRATION,
} from './sim/calibration'
import {
  buildTeamCompositionState,
  rankBestAvailableTeams,
  validateTeamComposition,
} from './teamComposition'
import {
  deriveMissionIntakeInformationSignals,
  missionHasLinkedIntakeReports,
} from './missionIntakeInformationRouting'
import type {
  Agent,
  CaseInstance,
  GameState,
  Id,
  MissionCategory,
  MissionIntakeSource,
  MissionPriorityBand,
  MissionRejectedTeamRecord,
  MissionRoutingBlockerCode,
  MissionRoutingRecord,
  MissionRoutingState,
  MissionRoutingStateKind,
  MissionTriageDisposition,
  Team,
} from './models'
import { getTeamAssignedCaseId } from './teamSimulation'

const MISSION_TRIAGE_THRESHOLDS = {
  critical: 80,
  high: 60,
  normal: 35,
} as const

function getTeamMemberIds(team: Pick<Team, 'memberIds' | 'agentIds'>): Id[] {
  const memberIds = Array.isArray(team.memberIds) ? team.memberIds : undefined
  const agentIds = Array.isArray(team.agentIds) ? team.agentIds : undefined

  if (memberIds && agentIds) {
    const sameMembers =
      memberIds.length === agentIds.length &&
      memberIds.every((memberId) => agentIds.includes(memberId))

    return [...new Set(sameMembers ? memberIds : agentIds)]
  }

  return [...new Set(memberIds ?? agentIds ?? [])]
}

function getTeamMembers(
  team: Pick<Team, 'memberIds' | 'agentIds'>,
  agentsById: GameState['agents']
) {
  return getTeamMemberIds(team)
    .map((agentId) => agentsById[agentId])
    .filter((agent): agent is Agent => Boolean(agent))
}

function uniqueSortedStrings(values: string[]) {
  return [...new Set(values.filter((value) => value.length > 0))].sort((a, b) => a.localeCompare(b))
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.max(min, Math.min(max, Math.trunc(value)))
}

export function deriveMissionCategory(currentCase: CaseInstance): MissionCategory {
  const tagSet = new Set(
    [...currentCase.tags, ...currentCase.requiredTags, ...currentCase.preferredTags].map((tag) =>
      tag.toLowerCase()
    )
  )

  if (
    currentCase.kind === 'raid' ||
    tagSet.has('breach') ||
    tagSet.has('containment') ||
    currentCase.stage >= 4
  ) {
    return 'containment_breach'
  }

  if (tagSet.has('investigation') || tagSet.has('analysis') || tagSet.has('evidence')) {
    return 'investigation_lead'
  }

  if (
    tagSet.has('civilian') ||
    tagSet.has('infrastructure') ||
    tagSet.has('facility') ||
    tagSet.has('public')
  ) {
    return 'civilian_infrastructure_incident'
  }

  if (tagSet.has('faction') || tagSet.has('hostile') || Boolean(currentCase.factionId)) {
    return 'faction_hostile_activity'
  }

  return 'strategic_opportunity'
}

export function deriveMissionIntakeSource(
  currentCase: CaseInstance,
  state?: Pick<GameState, 'informationIntakeReports'>
): MissionIntakeSource {
  if (currentCase.contract) {
    return 'contract'
  }

  if (currentCase.stage > 1) {
    return 'escalation'
  }

  if (currentCase.id.startsWith('case-spawned-')) {
    return 'pressure'
  }

  if (currentCase.tags.some((tag) => tag.toLowerCase().includes('tutorial'))) {
    return 'tutorial'
  }

  if (currentCase.factionId) {
    return 'faction'
  }

  if (state) {
    const intakeSignals = deriveMissionIntakeInformationSignals(state, currentCase)
    if (intakeSignals.intakeSourceOverride) {
      return intakeSignals.intakeSourceOverride
    }
  }

  return 'scripted'
}

export interface MissionTriageResult {
  missionId: Id
  score: number
  priority: MissionPriorityBand
  dimensions: {
    urgency: number
    threatSeverity: number
    escalationRisk: number
    strategicValue: number
    capacityPenalty: number
    attritionPressure: number
    intelRisk: number
  }
  reasonCodes: string[]
}

export function mapMissionPriority(score: number): MissionPriorityBand {
  if (score >= MISSION_TRIAGE_THRESHOLDS.critical) {
    return 'critical'
  }

  if (score >= MISSION_TRIAGE_THRESHOLDS.high) {
    return 'high'
  }

  if (score >= MISSION_TRIAGE_THRESHOLDS.normal) {
    return 'normal'
  }

  return 'low'
}

export function triageMission(state: GameState, currentCase: CaseInstance): MissionTriageResult {
  const fundingPressure = assessFundingPressure(state)
  const attritionPressure = assessAttritionPressure(state)
  const urgency = clampInteger(
    (6 - Math.min(currentCase.deadlineRemaining, 6)) * 12 + currentCase.stage * 3,
    0,
    35
  )
  const threatSeverity = clampInteger(
    Math.round((currentCase.difficulty.combat + currentCase.difficulty.utility) / 8),
    0,
    25
  )
  const escalationRisk = clampInteger(
    currentCase.stage * 6 + (currentCase.kind === 'raid' ? 8 : 0),
    0,
    20
  )
  const strategicValue = clampInteger(
    currentCase.contract ? 15 : currentCase.factionId ? 10 : 6,
    0,
    20
  )

  const teamCount = Object.keys(state.teams).length
  const inProgressCaseCount = Object.values(state.cases).filter(
    (entry) => entry.status === 'in_progress'
  ).length
  const capacityPenalty = clampInteger(
    Math.round((inProgressCaseCount / Math.max(teamCount, 1)) * 12),
    0,
    20
  )
  const intelRisk = clampInteger(
    Math.round(
      getMissionIntelRisk(currentCase, state.week) * INTEL_CALIBRATION.routingRiskPenaltyCap
    ),
    0,
    INTEL_CALIBRATION.routingRiskPenaltyCap
  )
  const budgetPenalty = clampInteger(fundingPressure.deploymentTriagePenalty, 0, 10)
  const attritionPenalty = clampInteger(attritionPressure.deploymentTriagePenalty, 0, 8)

  const intakeSignals = deriveMissionIntakeInformationSignals(state, currentCase)

  const score = clampInteger(
    urgency +
      threatSeverity +
      escalationRisk +
      strategicValue -
      capacityPenalty -
      intelRisk -
      budgetPenalty -
      attritionPenalty +
      intakeSignals.scoreAdjustment,
    0,
    100
  )

  const reasonCodes = uniqueSortedStrings([
    ...intakeSignals.reasonCodes,
    urgency >= 24 ? 'urgency-high' : urgency >= 12 ? 'urgency-medium' : 'urgency-low',
    threatSeverity >= 18 ? 'threat-high' : threatSeverity >= 10 ? 'threat-medium' : 'threat-low',
    escalationRisk >= 14
      ? 'escalation-high'
      : escalationRisk >= 7
        ? 'escalation-medium'
        : 'escalation-low',
    strategicValue >= 12
      ? 'strategic-high'
      : strategicValue >= 8
        ? 'strategic-medium'
        : 'strategic-low',
    capacityPenalty >= 12
      ? 'capacity-high'
      : capacityPenalty >= 6
        ? 'capacity-medium'
        : 'capacity-low',
    budgetPenalty >= 6
      ? 'budget-pressure-high'
      : budgetPenalty >= 3
        ? 'budget-pressure-medium'
        : 'budget-pressure-low',
    attritionPenalty >= 5
      ? 'attrition-pressure-high'
      : attritionPenalty >= 2
        ? 'attrition-pressure-medium'
        : 'attrition-pressure-low',
    intelRisk >= INTEL_CALIBRATION.routingRiskReasonThresholds.high
      ? 'intel-risk-high'
      : intelRisk >= INTEL_CALIBRATION.routingRiskReasonThresholds.medium
        ? 'intel-risk-medium'
        : 'intel-risk-low',
  ])

  return {
    missionId: currentCase.id,
    score,
    priority: mapMissionPriority(score),
    dimensions: {
      urgency,
      threatSeverity,
      escalationRisk,
      strategicValue,
      capacityPenalty,
      attritionPressure: attritionPenalty,
      intelRisk,
    },
    reasonCodes,
  }
}

export type MissionTriageEscalationBand = 'low' | 'medium' | 'high'

/** Mirrors `escalation-*` reason codes emitted by {@link triageMission}. */
export function missionTriageEscalationBandFromReasonCodes(
  reasonCodes: readonly string[]
): MissionTriageEscalationBand {
  if (reasonCodes.includes('escalation-high')) {
    return 'high'
  }

  if (reasonCodes.includes('escalation-medium')) {
    return 'medium'
  }

  return 'low'
}

export function missionTriageShowsEscalationDeferralRisk(reasonCodes: readonly string[]) {
  return reasonCodes.includes('escalation-high') || reasonCodes.includes('escalation-medium')
}

/** Matches `escalation-high` reason code banding in {@link triageMission}. */
export function hasHighMissionEscalationRisk(currentCase: CaseInstance): boolean {
  const escalationRisk = clampInteger(
    currentCase.stage * 6 + (currentCase.kind === 'raid' ? 8 : 0),
    0,
    20
  )

  return escalationRisk >= 14
}

export interface MissionTeamRoutingCandidate {
  teamId: Id
  valid: boolean
  completeness: number
  readinessCategory: string
  readinessScore: number
  cohesionScore: number
  readiness: number
  fatigueBurden: number
  expectedTotalWeeks: number
  blockerCodes: MissionRoutingBlockerCode[]
}

export interface MissionRoutingResult {
  missionId: Id
  routingState: MissionRoutingStateKind
  routingBlockers: MissionRoutingBlockerCode[]
  candidateTeamIds: Id[]
  rejectedTeams: MissionRejectedTeamRecord[]
  rankedCandidates: MissionTeamRoutingCandidate[]
  timeCostSummary?: MissionRoutingRecord['timeCostSummary']
}

function buildMissionRoutingCandidate(
  currentCase: CaseInstance,
  team: Team,
  state: GameState
): MissionTeamRoutingCandidate {
  const validation = validateTeamComposition(team, state.agents, state.teams, {
    requiredRoles: currentCase.requiredRoles,
  })
  const composition = buildTeamCompositionState(team, state.agents, state.teams)
  const eligibility = evaluateDeploymentEligibility(state, currentCase.id, team.id)
  const readinessState = buildTeamDeploymentReadinessState(state, team.id, currentCase.id)
  const members = getTeamMembers(team, state.agents)
  const loadoutBlocked = members.some(
    (member) => buildAgentLoadoutReadinessSummary(member, { state }).readiness === 'blocked'
  )
  const missingCertification = currentCase.requiredTags.some((tag) => tag.startsWith('cert:'))
    ? members.every((member) => {
        const certifications = member.progression?.certifications ?? {}
        return currentCase.requiredTags
          .filter((tag) => tag.startsWith('cert:'))
          .some((tag) => certifications[tag.slice(5)]?.state === 'certified')
      }) === false
    : false

  const avgFatigue =
    members.length > 0
      ? Math.round(members.reduce((sum, member) => sum + member.fatigue, 0) / members.length)
      : 100
  const assignedCaseId = getTeamAssignedCaseId(team)

  const blockerCodes = uniqueSortedStrings([
    ...eligibility.hardBlockers,
    validation.missingRoles.length > 0 ? 'missing-coverage' : '',
    validation.trainingMemberIds.length > 0 ? 'training-blocked' : '',
    loadoutBlocked ? 'invalid-loadout-gate' : '',
    missingCertification ? 'missing-certification' : '',
    avgFatigue >= 65 ? 'fatigue-over-threshold' : '',
    assignedCaseId && assignedCaseId !== currentCase.id ? 'capacity-locked' : '',
  ]) as MissionRoutingBlockerCode[]

  return {
    teamId: team.id,
    valid: eligibility.eligible && blockerCodes.length === 0 && validation.valid,
    completeness: validation.requiredRoles.length - validation.missingRoles.length,
    readinessCategory: readinessState.readinessCategory,
    readinessScore: readinessState.readinessScore,
    cohesionScore: composition.cohesion.cohesionScore,
    readiness:
      members.length > 0
        ? Math.round(
            members.reduce((sum, member) => sum + Math.max(0, 100 - member.fatigue), 0) /
              members.length
          )
        : 0,
    fatigueBurden: avgFatigue,
    expectedTotalWeeks: eligibility.timeCostSummary.expectedTotalWeeks,
    blockerCodes,
  }
}

export function shortlistMissionCandidateTeams(state: GameState, missionId: Id) {
  const currentCase = state.cases[missionId]
  if (!currentCase) {
    return [] as MissionTeamRoutingCandidate[]
  }

  const rankedByComposition = rankBestAvailableTeams(
    Object.values(state.teams),
    state.agents,
    state.teams,
    {
      requiredRoles: currentCase.requiredRoles,
    }
  )
  const rankedMap = new Map(rankedByComposition.map((entry, index) => [entry.teamId, index]))
  const candidates = Object.values(state.teams)
    .map((team) => buildMissionRoutingCandidate(currentCase, team, state))
    .sort((left, right) => {
      if (left.completeness !== right.completeness) {
        return right.completeness - left.completeness
      }

      const leftFitness = left.readinessScore + left.cohesionScore
      const rightFitness = right.readinessScore + right.cohesionScore
      if (leftFitness !== rightFitness) {
        return rightFitness - leftFitness
      }

      if (left.expectedTotalWeeks !== right.expectedTotalWeeks) {
        return left.expectedTotalWeeks - right.expectedTotalWeeks
      }

      if (left.cohesionScore !== right.cohesionScore) {
        return right.cohesionScore - left.cohesionScore
      }

      if (left.fatigueBurden !== right.fatigueBurden) {
        return left.fatigueBurden - right.fatigueBurden
      }

      const leftRank = rankedMap.get(left.teamId) ?? Number.MAX_SAFE_INTEGER
      const rightRank = rankedMap.get(right.teamId) ?? Number.MAX_SAFE_INTEGER
      if (leftRank !== rightRank) {
        return leftRank - rightRank
      }

      return left.teamId.localeCompare(right.teamId)
    })

  return candidates
}

export function routeMission(state: GameState, missionId: Id): MissionRoutingResult {
  const currentCase = state.cases[missionId]
  if (!currentCase) {
    return {
      missionId,
      routingState: 'blocked',
      routingBlockers: ['no-eligible-teams'],
      candidateTeamIds: [],
      rejectedTeams: [],
      rankedCandidates: [],
    }
  }

  const rankedCandidates = shortlistMissionCandidateTeams(state, missionId)
  const validCandidates = rankedCandidates.filter((candidate) => candidate.valid)

  if (validCandidates.length === 0) {
    const rejectedTeams: MissionRejectedTeamRecord[] = rankedCandidates.flatMap((candidate) =>
      candidate.blockerCodes.map((blockerCode) => ({
        teamId: candidate.teamId,
        reasonCode: blockerCode,
      }))
    )

    const routingBlockers = uniqueSortedStrings([
      'no-eligible-teams',
      ...rejectedTeams.map((entry) => entry.reasonCode),
    ]) as MissionRoutingBlockerCode[]

    return {
      missionId,
      routingState: rejectedTeams.length > 0 ? 'blocked' : 'queued',
      routingBlockers,
      candidateTeamIds: rankedCandidates.slice(0, 3).map((candidate) => candidate.teamId),
      rejectedTeams,
      rankedCandidates,
      timeCostSummary: rankedCandidates[0]
        ? evaluateDeploymentEligibility(state, missionId, rankedCandidates[0].teamId)
            .timeCostSummary
        : undefined,
    }
  }

  const assignedTeamIds = currentCase.assignedTeamIds.filter((teamId) =>
    Boolean(state.teams[teamId])
  )
  const routingState: MissionRoutingStateKind =
    currentCase.status === 'in_progress' && assignedTeamIds.length > 0
      ? 'assigned'
      : validCandidates.length > 0
        ? 'shortlisted'
        : 'queued'

  return {
    missionId,
    routingState,
    routingBlockers: [],
    candidateTeamIds: validCandidates.map((candidate) => candidate.teamId),
    rejectedTeams: [],
    rankedCandidates,
    timeCostSummary: evaluateDeploymentEligibility(state, missionId, validCandidates[0]!.teamId)
      .timeCostSummary,
  }
}

const MISSION_ROUTING_BLOCKER_CODES = new Set<MissionRoutingBlockerCode>([
  'missing-coverage',
  'training-blocked',
  'missing-certification',
  'invalid-loadout-gate',
  'site-clearance-required',
  'fatigue-over-threshold',
  'team-state-incompatible',
  'recovery-required',
  'routing-state-blocked',
  'capacity-locked',
  'no-valid-team',
  'no-eligible-teams',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sanitizeRoutingStateKind(value: unknown): MissionRoutingStateKind {
  return value === 'queued' ||
    value === 'shortlisted' ||
    value === 'assigned' ||
    value === 'deferred' ||
    value === 'blocked'
    ? value
    : 'queued'
}

function sanitizeIntakeSource(value: unknown): MissionIntakeSource {
  return value === 'scripted' ||
    value === 'escalation' ||
    value === 'pressure' ||
    value === 'faction' ||
    value === 'contract' ||
    value === 'tutorial'
    ? value
    : 'scripted'
}

function sanitizePriority(value: unknown): MissionPriorityBand {
  return value === 'critical' || value === 'high' || value === 'normal' || value === 'low'
    ? value
    : 'normal'
}

function sanitizeMissionTriageDisposition(value: unknown): MissionTriageDisposition | undefined {
  return value === 'route' || value === 'defer' || value === 'ignore' ? value : undefined
}

export function isMissionTriageDispositionActive(
  mission: Pick<MissionRoutingRecord, 'playerDisposition' | 'playerDispositionWeek'> | undefined,
  week: number
) {
  return mission?.playerDisposition !== undefined && mission.playerDispositionWeek === week
}

export function dispositionToRoutingState(
  disposition: MissionTriageDisposition,
  computed: MissionRoutingStateKind
): MissionRoutingStateKind {
  if (disposition === 'route') {
    return 'shortlisted'
  }

  if (disposition === 'defer') {
    return 'deferred'
  }

  return computed
}

function missionHasAssignedTeams(state: GameState, missionId: Id) {
  const currentCase = state.cases[missionId]
  if (!currentCase) {
    return false
  }

  return currentCase.assignedTeamIds.some((teamId) => Boolean(state.teams[teamId]))
}

function canApplyMissionTriageDisposition(state: GameState, caseData: CaseInstance) {
  return caseData.status !== 'resolved' && !missionHasAssignedTeams(state, caseData.id)
}

export function isMissionTriageIgnoredThisWeek(game: GameState, missionId: Id) {
  const mission = game.missionRouting?.missions[missionId]
  return Boolean(
    mission?.triageIgnored &&
    isMissionTriageDispositionActive(mission, game.week) &&
    mission.playerDisposition === 'ignore' &&
    !missionHasAssignedTeams(game, missionId)
  )
}

function mergeRecomputedMissionRecord(
  state: GameState,
  mission: MissionRoutingRecord,
  routed: MissionRoutingResult,
  triage: ReturnType<typeof triageMission>,
  week: number
): MissionRoutingRecord {
  const dispositionActive =
    isMissionTriageDispositionActive(mission, state.week) &&
    !missionHasAssignedTeams(state, mission.missionId)
  const playerDisposition = dispositionActive ? mission.playerDisposition : undefined
  const playerDispositionWeek = dispositionActive ? mission.playerDispositionWeek : undefined
  const triageIgnored =
    dispositionActive && mission.playerDisposition === 'ignore' ? true : undefined

  return {
    ...mission,
    triageScore: triage.score,
    priority: triage.priority,
    priorityReasonCodes: triage.reasonCodes,
    routingState:
      dispositionActive && playerDisposition
        ? dispositionToRoutingState(playerDisposition, routed.routingState)
        : routed.routingState,
    routingBlockers: routed.routingBlockers,
    ...(routed.timeCostSummary ? { timeCostSummary: { ...routed.timeCostSummary } } : {}),
    playerDisposition,
    playerDispositionWeek,
    triageIgnored,
    lastTriageWeek: week,
    lastRoutedWeek: week,
    lastCandidateTeamIds: routed.candidateTeamIds,
    lastRejectedTeamIds:
      mission.lastRejectedTeamIds.length > 0 ? mission.lastRejectedTeamIds : routed.rejectedTeams,
  }
}

export function applyMissionTriageDisposition(
  state: GameState,
  missionId: Id,
  disposition: MissionTriageDisposition
): GameState {
  const currentCase = state.cases[missionId]
  if (!currentCase || !canApplyMissionTriageDisposition(state, currentCase)) {
    return state
  }

  const missionRouting = normalizeMissionRoutingState(state)
  const mission = missionRouting.missions[missionId]
  if (!mission) {
    return state
  }

  const routed = routeMission(state, missionId)
  const routingState = dispositionToRoutingState(disposition, routed.routingState)

  return {
    ...state,
    missionRouting: {
      ...missionRouting,
      missions: {
        ...missionRouting.missions,
        [missionId]: {
          ...mission,
          playerDisposition: disposition,
          playerDispositionWeek: state.week,
          triageIgnored: disposition === 'ignore' ? true : undefined,
          routingState,
          routingBlockers: routed.routingBlockers,
          lastCandidateTeamIds: [...routed.candidateTeamIds],
          lastRejectedTeamIds: routed.rejectedTeams.map((team) => team.teamId),
          ...(routed.timeCostSummary ? { timeCostSummary: { ...routed.timeCostSummary } } : {}),
          lastTriageWeek: state.week,
          lastRoutedWeek: state.week,
          lastCandidateTeamIds: routed.candidateTeamIds,
          lastRejectedTeamIds: routed.rejectedTeams,
        },
      },
    },
  }
}

export function clearMissionTriageDisposition(state: GameState, missionId: Id): GameState {
  const missionRouting = normalizeMissionRoutingState(state)
  const mission = missionRouting.missions[missionId]
  if (!mission) {
    return state
  }

  const clearedMission: MissionRoutingRecord = {
    ...mission,
    playerDisposition: undefined,
    playerDispositionWeek: undefined,
    triageIgnored: undefined,
  }

  return {
    ...state,
    missionRouting: recomputeMissionRouting(
      {
        ...state,
        missionRouting: {
          ...missionRouting,
          missions: {
            ...missionRouting.missions,
            [missionId]: clearedMission,
          },
        },
      },
      state.week
    ),
  }
}

function normalizeMissionRecord(
  state: GameState,
  caseData: CaseInstance,
  existing: MissionRoutingRecord | undefined
): MissionRoutingRecord {
  const triage = triageMission(state, caseData)
  const routing = routeMission(state, caseData.id)
  const intakeLinked = missionHasLinkedIntakeReports(state, caseData)

  return {
    missionId: caseData.id,
    templateId: caseData.templateId,
    category: deriveMissionCategory(caseData),
    kind: caseData.kind,
    status: caseData.status,
    generatedWeek: clampInteger(existing?.generatedWeek ?? state.week, 1, Number.MAX_SAFE_INTEGER),
    deadlineRemaining: clampInteger(caseData.deadlineRemaining, 0, 99),
    durationWeeks: clampInteger(caseData.durationWeeks, 1, 99),
    ...(typeof caseData.weeksRemaining === 'number'
      ? { weeksRemaining: clampInteger(caseData.weeksRemaining, 0, 99) }
      : {}),
    stage: clampInteger(caseData.stage, 1, 5),
    difficulty: { ...caseData.difficulty },
    weights: { ...caseData.weights },
    requiredRoles: [...(caseData.requiredRoles ?? [])],
    requiredTags: [...caseData.requiredTags],
    preferredTags: [...caseData.preferredTags],
    assignedTeamIds: [...caseData.assignedTeamIds],
    intakeSource: sanitizeIntakeSource(deriveMissionIntakeSource(caseData, state)),
    priority: sanitizePriority(
      intakeLinked ? triage.priority : (existing?.priority ?? triage.priority)
    ),
    priorityReasonCodes: uniqueSortedStrings(
      intakeLinked ? triage.reasonCodes : (existing?.priorityReasonCodes ?? triage.reasonCodes)
    ),
    triageScore: clampInteger(
      intakeLinked ? triage.score : (existing?.triageScore ?? triage.score),
      0,
      100
    ),
    routingState: sanitizeRoutingStateKind(
      isMissionTriageDispositionActive(existing, state.week) &&
        existing?.playerDisposition &&
        !missionHasAssignedTeams(state, caseData.id)
        ? dispositionToRoutingState(existing.playerDisposition, routing.routingState)
        : routing.routingState
    ),
    routingBlockers: uniqueSortedStrings(
      (existing?.routingBlockers ?? routing.routingBlockers) as string[]
    ) as MissionRoutingBlockerCode[],
    ...(sanitizeMissionTriageDisposition(existing?.playerDisposition) &&
    existing?.playerDispositionWeek === state.week &&
    !missionHasAssignedTeams(state, caseData.id)
      ? {
          playerDisposition: sanitizeMissionTriageDisposition(existing.playerDisposition),
          playerDispositionWeek: clampInteger(
            existing.playerDispositionWeek,
            1,
            Number.MAX_SAFE_INTEGER
          ),
          ...(existing.playerDisposition === 'ignore' ? { triageIgnored: true } : {}),
        }
      : {}),
    ...(routing.timeCostSummary ? { timeCostSummary: { ...routing.timeCostSummary } } : {}),
    ...(typeof existing?.lastTriageWeek === 'number'
      ? { lastTriageWeek: clampInteger(existing.lastTriageWeek, 1, Number.MAX_SAFE_INTEGER) }
      : {}),
    ...(typeof existing?.lastRoutedWeek === 'number'
      ? { lastRoutedWeek: clampInteger(existing.lastRoutedWeek, 1, Number.MAX_SAFE_INTEGER) }
      : {}),
    lastCandidateTeamIds: uniqueSortedStrings(
      existing?.lastCandidateTeamIds ?? routing.candidateTeamIds
    ),
    lastRejectedTeamIds: (existing?.lastRejectedTeamIds && existing.lastRejectedTeamIds.length > 0
      ? existing.lastRejectedTeamIds
      : routing.rejectedTeams
    )
      .filter((entry) => typeof entry.teamId === 'string' && typeof entry.reasonCode === 'string')
      .map((entry) => ({
        teamId: entry.teamId,
        reasonCode: entry.reasonCode,
      })),
  }
}

export function normalizeMissionRoutingState(state: GameState): MissionRoutingState {
  const existing = state.missionRouting
  const unresolvedMissionIds = Object.values(state.cases)
    .filter((currentCase) => currentCase.status !== 'resolved')
    .map((currentCase) => currentCase.id)
  const orderedMissionIds = [
    ...new Set([
      ...(existing?.orderedMissionIds ?? []).filter((missionId) =>
        unresolvedMissionIds.includes(missionId)
      ),
      ...unresolvedMissionIds,
    ]),
  ]

  const missions = Object.fromEntries(
    orderedMissionIds
      .map((missionId) => {
        const currentCase = state.cases[missionId]
        if (!currentCase) {
          return null
        }

        return [
          missionId,
          normalizeMissionRecord(state, currentCase, existing?.missions?.[missionId]),
        ] as const
      })
      .filter((entry): entry is readonly [Id, MissionRoutingRecord] => Boolean(entry))
  )

  return {
    orderedMissionIds,
    missions,
    nextGeneratedSequence: clampInteger(
      existing?.nextGeneratedSequence ?? orderedMissionIds.length + 1,
      1,
      Number.MAX_SAFE_INTEGER
    ),
  }
}

export interface MissionIntakeGenerationResult {
  state: GameState
  generatedMissionIds: Id[]
  notes: string[]
}

export function generateWeeklyMissionIntake(state: GameState): MissionIntakeGenerationResult {
  const normalizedSeed = normalizeSeed(state.rngState)
  const rng = createSeededRng(normalizedSeed)
  const notes: string[] = []
  const generatedMissionIds: Id[] = []

  let nextState = {
    ...state,
    missionRouting: normalizeMissionRoutingState(state),
  }

  const openMissionCount = nextState.missionRouting.orderedMissionIds.length
  const maxActive = Math.max(1, state.config.maxActiveCases)
  const intakeReserveSlots = isSecondEscalationBandWeek(state.week)
    ? PRESSURE_CALIBRATION.secondEscalationMissionIntakeReserveSlots
    : 0

  if (openMissionCount < Math.max(1, maxActive - intakeReserveSlots)) {
    const availableTemplates = Object.values(state.templates)
      .filter((template) => template.kind === 'case')
      .sort((left, right) => left.templateId.localeCompare(right.templateId))

    if (availableTemplates.length > 0) {
      const selectedTemplate =
        availableTemplates[Math.floor(rng.next() * availableTemplates.length)]!
      const generatedId = `case-intake-${String(nextState.missionRouting.nextGeneratedSequence).padStart(6, '0')}`
      const exists = Boolean(nextState.cases[generatedId])

      if (!exists) {
        const nextCase: CaseInstance = {
          id: generatedId,
          templateId: selectedTemplate.templateId,
          title: selectedTemplate.title,
          description: selectedTemplate.description,
          factionId: selectedTemplate.factionId,
          contactId: selectedTemplate.contactId,
          mode: selectedTemplate.mode,
          kind: selectedTemplate.kind,
          status: 'open',
          difficulty: { ...selectedTemplate.difficulty },
          weights: { ...selectedTemplate.weights },
          tags: [...selectedTemplate.tags],
          requiredTags: [...(selectedTemplate.requiredTags ?? [])],
          requiredRoles: [...(selectedTemplate.requiredRoles ?? [])],
          preferredTags: [...(selectedTemplate.preferredTags ?? [])],
          stage: 1,
          durationWeeks: selectedTemplate.durationWeeks,
          deadlineWeeks: selectedTemplate.deadlineWeeks,
          deadlineRemaining: selectedTemplate.deadlineWeeks,
          ...createMissionIntelState(state.week),
          assignedTeamIds: [],
          onFail: { ...selectedTemplate.onFail },
          onUnresolved: { ...selectedTemplate.onUnresolved },
          ...(selectedTemplate.pressureValue !== undefined
            ? { pressureValue: selectedTemplate.pressureValue }
            : {}),
          ...(selectedTemplate.regionTag ? { regionTag: selectedTemplate.regionTag } : {}),
          ...(selectedTemplate.raid ? { raid: { ...selectedTemplate.raid } } : {}),
        }

        nextState = {
          ...nextState,
          cases: {
            ...nextState.cases,
            [generatedId]: nextCase,
          },
          missionRouting: {
            ...nextState.missionRouting,
            nextGeneratedSequence: nextState.missionRouting.nextGeneratedSequence + 1,
          },
        }
        generatedMissionIds.push(generatedId)
        notes.push(`generated:${generatedId}:template:${selectedTemplate.templateId}`)
      }
    }
  }

  const missionRouting = normalizeMissionRoutingState(nextState)

  return {
    state: {
      ...nextState,
      missionRouting,
      rngState: rng.getState(),
    },
    generatedMissionIds,
    notes,
  }
}

export function recomputeMissionRouting(state: GameState, week = state.week) {
  const routing = normalizeMissionRoutingState(state)
  const updatedMissions = Object.fromEntries(
    Object.entries(routing.missions).map(([missionId, mission]) => {
      const triage = triageMission(state, state.cases[missionId]!)
      const routed = routeMission(state, missionId)

      return [missionId, mergeRecomputedMissionRecord(state, mission, routed, triage, week)]
    })
  )

  return {
    ...routing,
    missions: updatedMissions,
  }
}

export function routeMissionToTeam(state: GameState, missionId: Id, teamId: Id) {
  const currentCase = state.cases[missionId]
  const team = state.teams[teamId]

  if (!currentCase || !team) {
    return {
      state,
      assigned: false,
      reason: 'invalid-reference' as const,
    }
  }

  const routed = routeMission(state, missionId)
  if (!routed.candidateTeamIds.includes(teamId)) {
    return {
      state,
      assigned: false,
      reason: 'team-not-shortlisted' as const,
    }
  }

  const missionRouting = recomputeMissionRouting(state)
  const mission = missionRouting.missions[missionId]

  if (!mission) {
    return {
      state,
      assigned: false,
      reason: 'missing-mission-routing' as const,
    }
  }

  return {
    state: {
      ...state,
      missionRouting: {
        ...missionRouting,
        missions: {
          ...missionRouting.missions,
          [missionId]: {
            ...mission,
            routingState: 'assigned',
            routingBlockers: [],
            playerDisposition: undefined,
            playerDispositionWeek: undefined,
            triageIgnored: undefined,
            ...(mission.timeCostSummary ? { timeCostSummary: { ...mission.timeCostSummary } } : {}),
            lastCandidateTeamIds: uniqueSortedStrings([teamId, ...mission.lastCandidateTeamIds]),
            lastRoutedWeek: state.week,
          } satisfies MissionRoutingRecord,
        },
      },
    },
    assigned: true,
    reason: 'assigned' as const,
  }
}

function sanitizeMissionRoutingBlockerCode(value: unknown): MissionRoutingBlockerCode | null {
  return typeof value === 'string' &&
    MISSION_ROUTING_BLOCKER_CODES.has(value as MissionRoutingBlockerCode)
    ? (value as MissionRoutingBlockerCode)
    : null
}

function sanitizeRejectedTeamRecords(
  value: unknown,
  teams: GameState['teams']
): MissionRejectedTeamRecord[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seen = new Set<string>()

  return value
    .filter((entry): entry is Record<string, unknown> => isRecord(entry))
    .map((entry) => {
      const teamId = typeof entry.teamId === 'string' ? entry.teamId.trim() : ''
      const reasonCode = sanitizeMissionRoutingBlockerCode(entry.reasonCode)

      if (!teamId || !reasonCode || !(teamId in teams) || seen.has(teamId)) {
        return null
      }

      seen.add(teamId)
      return { teamId, reasonCode }
    })
    .filter((entry): entry is MissionRejectedTeamRecord => entry !== null)
}

function sanitizeMissionRoutingRecord(
  missionId: Id,
  raw: unknown,
  context: { cases: GameState['cases']; teams: GameState['teams']; week: number }
): MissionRoutingRecord | null {
  if (!isRecord(raw)) {
    return null
  }

  const currentCase = context.cases[missionId]
  if (!currentCase || currentCase.status === 'resolved') {
    return null
  }

  const assignedTeamIds = (
    Array.isArray(raw.assignedTeamIds) ? raw.assignedTeamIds : currentCase.assignedTeamIds
  ).filter((teamId): teamId is string => typeof teamId === 'string' && teamId in context.teams)

  const lastCandidateTeamIds = uniqueSortedStrings(
    (Array.isArray(raw.lastCandidateTeamIds) ? raw.lastCandidateTeamIds : []).filter(
      (teamId): teamId is string => typeof teamId === 'string' && teamId in context.teams
    )
  )

  const lastRejectedTeamIds = sanitizeRejectedTeamRecords(raw.lastRejectedTeamIds, context.teams)

  const routingBlockers = uniqueSortedStrings(
    (Array.isArray(raw.routingBlockers) ? raw.routingBlockers : [])
      .map((entry) => sanitizeMissionRoutingBlockerCode(entry))
      .filter((entry): entry is MissionRoutingBlockerCode => entry !== null)
  ) as MissionRoutingBlockerCode[]

  const playerDisposition = sanitizeMissionTriageDisposition(raw.playerDisposition)
  const playerDispositionWeek =
    playerDisposition &&
    typeof raw.playerDispositionWeek === 'number' &&
    Number.isFinite(raw.playerDispositionWeek)
      ? clampInteger(raw.playerDispositionWeek, 1, Number.MAX_SAFE_INTEGER)
      : undefined

  const dispositionActive =
    playerDisposition !== undefined && playerDispositionWeek === context.week

  return {
    missionId,
    templateId:
      typeof raw.templateId === 'string' && raw.templateId.length > 0
        ? raw.templateId
        : currentCase.templateId,
    category: deriveMissionCategory(currentCase),
    kind: currentCase.kind,
    status: currentCase.status,
    generatedWeek: clampInteger(
      typeof raw.generatedWeek === 'number' ? raw.generatedWeek : context.week,
      1,
      context.week
    ),
    deadlineRemaining: clampInteger(currentCase.deadlineRemaining, 0, 99),
    durationWeeks: clampInteger(currentCase.durationWeeks, 1, 99),
    ...(typeof currentCase.weeksRemaining === 'number'
      ? { weeksRemaining: clampInteger(currentCase.weeksRemaining, 0, 99) }
      : {}),
    stage: clampInteger(currentCase.stage, 1, 5),
    difficulty: { ...currentCase.difficulty },
    weights: { ...currentCase.weights },
    requiredRoles: [...(currentCase.requiredRoles ?? [])],
    requiredTags: [...currentCase.requiredTags],
    preferredTags: [...currentCase.preferredTags],
    assignedTeamIds,
    intakeSource: sanitizeIntakeSource(raw.intakeSource ?? deriveMissionIntakeSource(currentCase)),
    priority: sanitizePriority(raw.priority),
    priorityReasonCodes: uniqueSortedStrings(
      Array.isArray(raw.priorityReasonCodes)
        ? raw.priorityReasonCodes.filter((entry): entry is string => typeof entry === 'string')
        : []
    ),
    triageScore: clampInteger(typeof raw.triageScore === 'number' ? raw.triageScore : 0, 0, 100),
    routingState:
      dispositionActive && playerDisposition
        ? dispositionToRoutingState(
            playerDisposition,
            sanitizeRoutingStateKind(raw.routingState ?? raw.state)
          )
        : sanitizeRoutingStateKind(raw.routingState ?? raw.state),
    routingBlockers,
    ...(dispositionActive && playerDisposition
      ? {
          playerDisposition,
          playerDispositionWeek,
          ...(playerDisposition === 'ignore' ? { triageIgnored: true } : {}),
        }
      : {}),
    ...(typeof raw.lastTriageWeek === 'number' && Number.isFinite(raw.lastTriageWeek)
      ? { lastTriageWeek: clampInteger(raw.lastTriageWeek, 1, context.week) }
      : {}),
    ...(typeof raw.lastRoutedWeek === 'number' && Number.isFinite(raw.lastRoutedWeek)
      ? { lastRoutedWeek: clampInteger(raw.lastRoutedWeek, 1, context.week) }
      : {}),
    lastCandidateTeamIds,
    lastRejectedTeamIds,
  }
}

export type MissionRoutingHydrationTriageContext = Pick<
  GameState,
  | 'week'
  | 'cases'
  | 'teams'
  | 'agents'
  | 'agency'
  | 'config'
  | 'funding'
  | 'supportStaff'
  | 'informationIntakeReports'
>

export interface SanitizeMissionRoutingContext {
  cases: GameState['cases']
  teams: GameState['teams']
  week: number
  informationIntakeReports?: GameState['informationIntakeReports']
  agents?: GameState['agents']
  agency?: GameState['agency']
  config?: GameState['config']
  funding?: number
  supportStaff?: GameState['supportStaff']
}

function buildHydrationTriageState(
  context: SanitizeMissionRoutingContext
): MissionRoutingHydrationTriageContext | null {
  if (!context.agents || !context.config || !context.agency) {
    return null
  }

  return {
    week: context.week,
    cases: context.cases,
    teams: context.teams,
    agents: context.agents,
    agency: context.agency,
    config: context.config,
    funding: context.funding ?? 0,
    supportStaff: context.supportStaff,
    informationIntakeReports: context.informationIntakeReports ?? {},
  }
}

/**
 * After attrition-derived `recomputeMissionRouting`, restore sanitized triage fields for
 * missions without linked intake so hydrate does not drift persisted scores.
 */
export function reconcileHydratedMissionRoutingTriage(
  sanitized: MissionRoutingState | undefined,
  recomputed: MissionRoutingState | undefined,
  context: Pick<GameState, 'cases' | 'informationIntakeReports'>
): MissionRoutingState | undefined {
  if (!recomputed) {
    return recomputed
  }

  if (!sanitized) {
    return recomputed
  }

  const missions = Object.fromEntries(
    Object.entries(recomputed.missions).map(([missionId, mission]) => {
      const currentCase = context.cases[missionId]
      if (!currentCase || missionHasLinkedIntakeReports(context, currentCase)) {
        return [missionId, mission] as const
      }

      const prior = sanitized.missions[missionId]
      if (!prior) {
        return [missionId, mission] as const
      }

      return [
        missionId,
        {
          ...mission,
          triageScore: prior.triageScore,
          priority: prior.priority,
          priorityReasonCodes: [...prior.priorityReasonCodes],
          intakeSource: prior.intakeSource,
        },
      ] as const
    })
  )

  return {
    ...recomputed,
    missions,
  }
}

function refreshIntakeLinkedMissionRoutingRecord(
  context: SanitizeMissionRoutingContext,
  record: MissionRoutingRecord
): MissionRoutingRecord {
  const triageState = buildHydrationTriageState(context)
  const currentCase = context.cases[record.missionId]
  if (!triageState || !currentCase || !missionHasLinkedIntakeReports(triageState, currentCase)) {
    return record
  }

  const triage = triageMission(triageState as GameState, currentCase)

  return {
    ...record,
    intakeSource: sanitizeIntakeSource(
      deriveMissionIntakeSource(
        currentCase,
        triageState as Pick<GameState, 'informationIntakeReports'>
      )
    ),
    triageScore: triage.score,
    priority: triage.priority,
    priorityReasonCodes: triage.reasonCodes,
  }
}

/**
 * Hydration problems 462–463: mission routing records, enums, weeks, sequence, team reconciliation.
 */
export function sanitizePersistedMissionRoutingState(
  raw: unknown,
  context: SanitizeMissionRoutingContext
): MissionRoutingState | undefined {
  if (!isRecord(raw)) {
    return undefined
  }

  const missions: Record<string, MissionRoutingRecord> = {}

  if (isRecord(raw.missions)) {
    for (const [missionId, entry] of Object.entries(raw.missions)) {
      const record = sanitizeMissionRoutingRecord(missionId, entry, context)
      if (record) {
        missions[missionId] = record
      }
    }
  }

  const unresolvedMissionIds = Object.values(context.cases)
    .filter((currentCase) => currentCase.status !== 'resolved')
    .map((currentCase) => currentCase.id)

  const orderedMissionIds = [
    ...new Set([
      ...(Array.isArray(raw.orderedMissionIds)
        ? raw.orderedMissionIds.filter(
            (missionId): missionId is string =>
              typeof missionId === 'string' &&
              missionId.length > 0 &&
              unresolvedMissionIds.includes(missionId)
          )
        : []),
      ...Object.keys(missions).filter((missionId) => unresolvedMissionIds.includes(missionId)),
    ]),
  ]

  if (orderedMissionIds.length === 0) {
    return undefined
  }

  const nextGeneratedSequence = clampInteger(
    typeof raw.nextGeneratedSequence === 'number'
      ? raw.nextGeneratedSequence
      : orderedMissionIds.length + 1,
    orderedMissionIds.length + 1,
    Number.MAX_SAFE_INTEGER
  )

  const refreshedMissions = Object.fromEntries(
    orderedMissionIds
      .map((missionId) => {
        const record = missions[missionId]
        if (!record) {
          return null
        }

        return [missionId, refreshIntakeLinkedMissionRoutingRecord(context, record)] as const
      })
      .filter((entry): entry is readonly [Id, MissionRoutingRecord] => entry !== null)
  )

  return {
    orderedMissionIds,
    missions: refreshedMissions,
    nextGeneratedSequence,
  }
}
