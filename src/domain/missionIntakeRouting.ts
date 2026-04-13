import { assessAttritionPressure } from './agent/attrition'
import { createSeededRng, normalizeSeed } from './math'
import { buildAgentLoadoutReadinessSummary } from './equipment'
import { evaluateDeploymentEligibility } from './deploymentReadiness'
import { assessFundingPressure } from './funding'
import { createMissionIntelState, getMissionIntelRisk } from './intel'
import { INTEL_CALIBRATION, isSecondEscalationBandWeek, PRESSURE_CALIBRATION } from './sim/calibration'
import {
  buildTeamCompositionState,
  rankBestAvailableTeams,
  validateTeamComposition,
} from './teamComposition'
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
  Team,
} from './models'

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

function getTeamMembers(team: Pick<Team, 'memberIds' | 'agentIds'>, agentsById: GameState['agents']) {
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
  const tagSet = new Set([
    ...currentCase.tags,
    ...currentCase.requiredTags,
    ...currentCase.preferredTags,
  ].map((tag) => tag.toLowerCase()))

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

export function deriveMissionIntakeSource(currentCase: CaseInstance): MissionIntakeSource {
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
  const escalationRisk = clampInteger(currentCase.stage * 6 + (currentCase.kind === 'raid' ? 8 : 0), 0, 20)
  const strategicValue = clampInteger(
    currentCase.contract ? 15 : currentCase.factionId ? 10 : 6,
    0,
    20
  )

  const teamCount = Object.keys(state.teams).length
  const inProgressCaseCount = Object.values(state.cases).filter((entry) => entry.status === 'in_progress').length
  const capacityPenalty = clampInteger(
    Math.round((inProgressCaseCount / Math.max(teamCount, 1)) * 12),
    0,
    20
  )
  const intelRisk = clampInteger(
    Math.round(getMissionIntelRisk(currentCase, state.week) * INTEL_CALIBRATION.routingRiskPenaltyCap),
    0,
    INTEL_CALIBRATION.routingRiskPenaltyCap
  )
  const budgetPenalty = clampInteger(fundingPressure.deploymentTriagePenalty, 0, 10)
  const attritionPenalty = clampInteger(attritionPressure.deploymentTriagePenalty, 0, 8)

  const score = clampInteger(
    urgency +
      threatSeverity +
      escalationRisk +
      strategicValue -
      capacityPenalty -
      intelRisk -
      budgetPenalty -
      attritionPenalty,
    0,
    100
  )

  const reasonCodes = uniqueSortedStrings([
    urgency >= 24 ? 'urgency-high' : urgency >= 12 ? 'urgency-medium' : 'urgency-low',
    threatSeverity >= 18 ? 'threat-high' : threatSeverity >= 10 ? 'threat-medium' : 'threat-low',
    escalationRisk >= 14 ? 'escalation-high' : escalationRisk >= 7 ? 'escalation-medium' : 'escalation-low',
    strategicValue >= 12 ? 'strategic-high' : strategicValue >= 8 ? 'strategic-medium' : 'strategic-low',
    capacityPenalty >= 12 ? 'capacity-high' : capacityPenalty >= 6 ? 'capacity-medium' : 'capacity-low',
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
  const members = getTeamMembers(team, state.agents)
  const loadoutBlocked = members.some((member) =>
    buildAgentLoadoutReadinessSummary(member, { state }).readiness === 'blocked'
  )
  const missingCertification = currentCase.requiredTags.some((tag) => tag.startsWith('cert:'))
    ? members.every((member) => {
        const certifications = member.progression?.certifications ?? {}
        return currentCase.requiredTags
          .filter((tag) => tag.startsWith('cert:'))
          .some((tag) => certifications[tag.slice(5)]?.state === 'certified')
      }) === false
    : false

  const avgFatigue = members.length > 0
    ? Math.round(members.reduce((sum, member) => sum + member.fatigue, 0) / members.length)
    : 100
  const assignedCaseId = team.status?.assignedCaseId ?? team.assignedCaseId ?? null

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
    readinessCategory: team.deploymentReadinessState?.readinessCategory ?? 'mission_ready',
    readinessScore: team.deploymentReadinessState?.readinessScore ?? 0,
    cohesionScore: composition.cohesion.cohesionScore,
    readiness: members.length > 0
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
        ? evaluateDeploymentEligibility(state, missionId, rankedCandidates[0].teamId).timeCostSummary
        : undefined,
    }
  }

  const assignedTeamIds = currentCase.assignedTeamIds.filter((teamId) => Boolean(state.teams[teamId]))
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

function normalizeMissionRecord(
  state: GameState,
  caseData: CaseInstance,
  existing: MissionRoutingRecord | undefined
): MissionRoutingRecord {
  const triage = triageMission(state, caseData)
  const routing = routeMission(state, caseData.id)

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
    intakeSource: sanitizeIntakeSource(existing?.intakeSource ?? deriveMissionIntakeSource(caseData)),
    priority: sanitizePriority(existing?.priority ?? triage.priority),
    priorityReasonCodes: uniqueSortedStrings(existing?.priorityReasonCodes ?? triage.reasonCodes),
    triageScore: clampInteger(existing?.triageScore ?? triage.score, 0, 100),
    routingState: sanitizeRoutingStateKind(existing?.routingState ?? routing.routingState),
    routingBlockers: uniqueSortedStrings(
      (existing?.routingBlockers ?? routing.routingBlockers) as string[]
    ) as MissionRoutingBlockerCode[],
    ...(routing.timeCostSummary ? { timeCostSummary: { ...routing.timeCostSummary } } : {}),
    ...(typeof existing?.lastTriageWeek === 'number'
      ? { lastTriageWeek: clampInteger(existing.lastTriageWeek, 1, Number.MAX_SAFE_INTEGER) }
      : {}),
    ...(typeof existing?.lastRoutedWeek === 'number'
      ? { lastRoutedWeek: clampInteger(existing.lastRoutedWeek, 1, Number.MAX_SAFE_INTEGER) }
      : {}),
    lastCandidateTeamIds: uniqueSortedStrings(existing?.lastCandidateTeamIds ?? routing.candidateTeamIds),
    lastRejectedTeamIds: (existing?.lastRejectedTeamIds ?? routing.rejectedTeams)
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
      ...((existing?.orderedMissionIds ?? []).filter((missionId) => unresolvedMissionIds.includes(missionId))),
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

        return [missionId, normalizeMissionRecord(state, currentCase, existing?.missions?.[missionId])] as const
      })
      .filter((entry): entry is readonly [Id, MissionRoutingRecord] => Boolean(entry))
  )

  return {
    orderedMissionIds,
    missions,
    nextGeneratedSequence: clampInteger(existing?.nextGeneratedSequence ?? orderedMissionIds.length + 1, 1, Number.MAX_SAFE_INTEGER),
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
      const selectedTemplate = availableTemplates[Math.floor(rng.next() * availableTemplates.length)]!
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
          ...(selectedTemplate.pressureValue !== undefined ? { pressureValue: selectedTemplate.pressureValue } : {}),
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

      return [
        missionId,
        {
          ...mission,
          triageScore: triage.score,
          priority: triage.priority,
          priorityReasonCodes: triage.reasonCodes,
          routingState: routed.routingState,
          routingBlockers: routed.routingBlockers,
          ...(routed.timeCostSummary ? { timeCostSummary: { ...routed.timeCostSummary } } : {}),
          lastTriageWeek: week,
          lastRoutedWeek: week,
          lastCandidateTeamIds: routed.candidateTeamIds,
          lastRejectedTeamIds: routed.rejectedTeams,
        } satisfies MissionRoutingRecord,
      ]
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
