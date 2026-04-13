// cspell:words cooldown cooldowns lockdown
import { clamp, createSeededRng } from '../math'
import { consumeResolutionPartyCards, drawPartyCardsToHandLimit } from '../partyCards/engine'
import {
  appendOperationEventDrafts,
  createFactionUnlockAvailableDraft,
  type AnyOperationEventDraft,
} from '../events'
import {
  type CaseInstance,
  type GameState,
  type LeaderBonus,
  type MissionResult,
  type MissionResultInput,
  type MissionRewardBreakdown,
  type PerformanceMetricSummary,
  type PowerImpactSummary,
  type ResolutionOutcome,
  type Team,
  type WeeklyReport,
  type WeeklyReportCaseSnapshot,
  type WeeklyReportTeamStatus,
} from '../models'
import { GAME_OVER_REASONS } from '../../data/copy'
import {
  applyIntelSurgeToCandidates,
  applyProcurementPushToMarket,
  applyRecoveryRotationToAgents,
  getWeeklyDirectiveDefinition,
  recordAppliedDirective,
} from '../directives'
import { resolveAgentAbilityEffects } from '../abilities'
import {
  applyFactionFavorGrants,
  applyFactionMissionOutcome,
  buildFactionMissionContext,
  diffFactionRecruitUnlocks,
  getFactionDefinition,
  getFactionRecruitUnlocks,
} from '../factions'
import { recordContractOutcome, refreshContractBoard } from '../contracts'
import { buildMissionRewardBreakdown } from '../missionResults'
import { buildTeamDeploymentReadinessState } from '../deploymentReadiness'
import { getCanonicalFundingState } from '../funding'
import { buildTeamCohesionSummary } from '../teamComposition'
import { buildAgentLoadoutReadinessSummary } from '../equipment'
import { degradeMissionIntelRecord } from '../intel'
import { getResearchIntelModifiers } from '../research'
import { resolveWeakestLinkMission } from '../weakestLinkResolution'
import { buildAgencyProtocolState } from '../protocols'
import {
  buildDeterministicReportNotesFromEventDrafts,
  getHistoricalReportNoteDrafts,
} from '../reportNotes'
import { getRecruitmentPool, syncRecruitmentPoolState } from '../recruitment'
import {
  buildTeamCompositionProfile,
  ensureNormalizedGameState,
  getTeamAssignedCaseId,
  getTeamMemberIds,
  getUniqueTeamMembers,
  normalizeGameState,
} from '../teamSimulation'
import {
  buildMajorIncidentEffectiveCase,
  evaluateMajorIncidentPlan,
  isOperationalMajorIncidentCase,
  resolveMajorIncidentOutcome,
} from '../majorIncidentOperations'
import { recomputeMissionRouting } from '../missionIntakeRouting'
import { deriveRelationshipStability, deriveRelationshipState } from './relationshipProjection'
import { applyRaids, resolveRaid } from './raid'
import { PRESSURE_CALIBRATION } from './calibration'
import { advanceMarketState, advanceProductionQueues } from './production'
import { resolveCase } from './resolve'
import { calcWeekScore, computeRequiredScore, computeTeamScore } from './scoring'
import { spawnFromEscalations, spawnFromFailures, type SpawnedCaseRecord } from './spawn'
import {
  createDeadlineEscalationTransition,
  createResolutionEscalationTransition,
  decrementOpenDeadline,
} from './escalation'
import {
  buildRecruitmentGenerationState,
  generateCandidates,
  removeExpiredCandidates,
} from './candidateGenerator'
import { executePressurePipeline } from './pressurePipeline'
import {
  buildEscalatedCaseOutcomeDraft,
  buildSuccessCaseOutcomeDraft,
  buildUnresolvedCaseOutcomeDraft,
} from './caseOutcomePipeline'
import { decrementActiveAbilityCooldowns, markActiveAbilityUsed } from './abilityExecution'
import { applyMissionResolutionAgentMutations } from './missionResolutionAgents'
import {
  buildCaseEscalatedEventDraft,
  buildCaseFailedEventDraft,
  buildCasePartiallyResolvedEventDraft,
  buildCaseResolvedEventDraft,
} from './eventDraftPipeline'
import { advanceRecoveryAgentsForWeek } from './recoveryPipeline'
import { advanceRecoveryDowntimeForWeek } from './recoveryDowntime'
import { finalizeMissionResultsFromDrafts } from './missionFinalizationPipeline'
import { advanceTrainingCertificationState, advanceTrainingQueues } from './training'
import { recordRelationshipSnapshot } from './chemistryPolish'
import { applySpontaneousChemistryEvent } from './spontaneousChemistry'
import { expireBetrayalConsequences, recoverTrustDamagePassively } from './betrayal'

function computeFundingDelta(
  report: WeeklyReport,
  config: GameState['config'],
  rewardByCaseId: Partial<Record<string, MissionRewardBreakdown>>
) {
  const rewardDelta = [
    ...report.resolvedCases,
    ...report.failedCases,
    ...report.partialCases,
    ...report.unresolvedTriggers,
  ].reduce((sum, caseId) => sum + (rewardByCaseId[caseId]?.fundingDelta ?? 0), 0)

  return config.fundingBasePerWeek + rewardDelta
}

function computeContainmentDelta(
  report: WeeklyReport,
  config: GameState['config'],
  rewardByCaseId: Partial<Record<string, MissionRewardBreakdown>>
) {
  const rewardDelta = [
    ...report.resolvedCases,
    ...report.failedCases,
    ...report.partialCases,
    ...report.unresolvedTriggers,
  ].reduce((sum, caseId) => sum + (rewardByCaseId[caseId]?.containmentDelta ?? 0), 0)

  return -config.containmentWeeklyDecay + rewardDelta
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

function releaseTeams(teams: GameState['teams'], releasedTeamIds: string[]): GameState['teams'] {
  if (releasedTeamIds.length === 0) {
    return teams
  }

  return Object.fromEntries(
    Object.entries(teams).map(([id, team]) => [
      id,
      releasedTeamIds.includes(id)
        ? {
            ...team,
            assignedCaseId: undefined,
            status: team.status ? { ...team.status, assignedCaseId: null } : team.status,
          }
        : team,
    ])
  )
}

function getAverageFatigue(team: Team, agents: GameState['agents']) {
  const memberIds = getTeamMemberIds(team)

  if (memberIds.length === 0) {
    return 0
  }

  const totalFatigue = memberIds.reduce((sum, agentId) => sum + (agents[agentId]?.fatigue ?? 0), 0)

  return Math.round(totalFatigue / memberIds.length)
}

function getMissionFatigue(config: GameState['config']) {
  return config.durationModel === 'attrition'
    ? config.attritionPerWeek
    : Math.max(1, config.attritionPerWeek - 1)
}

function getRecoveryFatigue(config: GameState['config']) {
  return Math.max(1, Math.floor(config.attritionPerWeek / 2))
}

function applyAgentFatigue(
  agents: GameState['agents'],
  teams: GameState['teams'],
  config: GameState['config'],
  activeTeamIds: string[],
  activeTeamStressModifiers: Record<string, number> = {}
) {
  const activeAgentStressById = new Map<string, number>()
  const activeAgentIds = new Set(
    activeTeamIds.flatMap((teamId) => {
      const team = teams[teamId]
      const memberIds = team ? getTeamMemberIds(team) : []
      const stressModifier = activeTeamStressModifiers[teamId] ?? 0

      for (const agentId of memberIds) {
        activeAgentStressById.set(agentId, stressModifier)
      }

      return memberIds
    })
  )
  const trainingAgentIds = new Set(
    Object.entries(agents)
      .filter(([, agent]) => agent.assignment?.state === 'training')
      .map(([agentId]) => agentId)
  )
  const missionFatigue = getMissionFatigue(config)
  const recoveryFatigue = getRecoveryFatigue(config)

  return Object.fromEntries(
    Object.entries(agents).map(([id, agent]) => {
      const delta = activeAgentIds.has(id)
        ? Math.max(1, Math.round(missionFatigue * (1 + (activeAgentStressById.get(id) ?? 0))))
        : trainingAgentIds.has(id)
          ? -(agent.recoveryRateBonus ?? 0)
          : -(recoveryFatigue + (agent.recoveryRateBonus ?? 0))

      return [
        id,
        {
          ...agent,
          fatigue: clamp(agent.fatigue + delta, 0, 100),
        },
      ]
    })
  )
}

function getAverageRosterFatigue(agents: GameState['agents']) {
  const values = Object.values(agents)
  if (values.length === 0) {
    return 0
  }

  return Math.round(values.reduce((sum, agent) => sum + agent.fatigue, 0) / values.length)
}

function getFatigueBand(value: number): WeeklyReportTeamStatus['fatigueBand'] {
  if (value >= 45) {
    return 'critical'
  }

  if (value >= 20) {
    return 'strained'
  }

  return 'steady'
}

function buildReportCaseSnapshot(currentCase: CaseInstance): WeeklyReportCaseSnapshot {
  return {
    caseId: currentCase.id,
    title: currentCase.title,
    kind: currentCase.kind,
    mode: currentCase.mode,
    status: currentCase.status,
    stage: currentCase.stage,
    deadlineRemaining: currentCase.deadlineRemaining,
    durationWeeks: currentCase.durationWeeks,
    weeksRemaining: currentCase.weeksRemaining,
    assignedTeamIds: [...currentCase.assignedTeamIds],
  }
}

function buildReportCaseSnapshots(
  cases: GameState['cases'],
  missionResultByCaseId: Partial<Record<string, MissionResult>>,
  rewardByCaseId: Partial<Record<string, MissionRewardBreakdown>>,
  performanceByCaseId: Partial<Record<string, PerformanceMetricSummary>>,
  powerImpactByCaseId: Partial<Record<string, PowerImpactSummary>>
) {
  return Object.fromEntries(
    Object.values(cases).map((currentCase) => [
      currentCase.id,
      {
        ...buildReportCaseSnapshot(currentCase),
        missionResult: missionResultByCaseId[currentCase.id],
        rewardBreakdown: rewardByCaseId[currentCase.id],
        performanceSummary: performanceByCaseId[currentCase.id],
        powerImpact: powerImpactByCaseId[currentCase.id],
      },
    ])
  )
}

function buildReportTeamStatusEntry(
  team: Team,
  agents: GameState['agents'],
  cases: GameState['cases']
): WeeklyReportTeamStatus {
  const avgFatigue = getAverageFatigue(team, agents)
  const assignedCaseId = getTeamAssignedCaseId(team)
  const assignedCase = assignedCaseId ? cases[assignedCaseId] : undefined

  return {
    teamId: team.id,
    teamName: team.name,
    assignedCaseId: assignedCaseId ?? undefined,
    assignedCaseTitle: assignedCase?.title,
    avgFatigue,
    fatigueBand: getFatigueBand(avgFatigue),
  }
}

function buildReportTeamStatus(
  teams: GameState['teams'],
  agents: GameState['agents'],
  cases: GameState['cases']
) {
  return Object.values(teams).map((team) => buildReportTeamStatusEntry(team, agents, cases))
}

function buildAssignedTeamLeaderBonuses(
  teamIds: string[],
  teams: GameState['teams'],
  agents: GameState['agents']
) {
  return Object.fromEntries(
    teamIds
      .map((teamId) => {
        const team = teams[teamId]

        if (!team) {
          return null
        }

        return [teamId, buildTeamCompositionProfile(team, agents).leaderBonus] as const
      })
      .filter((entry): entry is readonly [string, LeaderBonus] => Boolean(entry))
  )
}

function buildAssignedAgentLeaderBonuses(
  teamIds: string[],
  teams: GameState['teams'],
  agents: GameState['agents']
) {
  const teamLeaderBonuses = buildAssignedTeamLeaderBonuses(teamIds, teams, agents)

  return Object.fromEntries(
    teamIds.flatMap((teamId) => {
      const team = teams[teamId]
      const leaderBonus = teamLeaderBonuses[teamId]

      if (!team || !leaderBonus) {
        return []
      }

      return getTeamMemberIds(team).map((agentId) => [agentId, leaderBonus] as const)
    })
  )
}

interface WeeklyCaseResolutionStrategy {
  effectiveCase: CaseInstance
  assignedAgents: NonNullable<GameState['agents'][string]>[]
  assignedAgentLeaderBonuses: Record<string, LeaderBonus>
  activeTeamStressModifiers: Record<string, number>
  outcome: ResolutionOutcome
  weakestLinkResult?: import('../weakestLinkResolution').WeakestLinkMissionResolutionResult
}

type SeededRng = ReturnType<typeof createSeededRng>

interface WeeklyExecutionContext {
  sourceState: GameState
  nextState: GameState
  selectedDirectiveId: GameState['directiveState']['selectedId']
  initialCaseIds: string[]
  initialCaseIdSet: Set<string>
  processedCaseIds: Set<string>
  progressedCases: string[]
  resolvedCases: string[]
  failedCases: string[]
  partialCases: string[]
  failedSpawnSources: string[]
  unresolvedTriggers: string[]
  spawnedCaseIds: string[]
  spawnedCaseIdSet: Set<string>
  spawnedCases: SpawnedCaseRecord[]
  eventDrafts: AnyOperationEventDraft[]
  activeTeamIds: Set<string>
  activeTeamStressModifiers: Record<string, number>
  rewardByCaseId: Partial<Record<string, MissionRewardBreakdown>>
  missionResultDraftByCaseId: Partial<Record<string, MissionResultInput>>
  missionResultByCaseId: Partial<Record<string, MissionResult>>
  performanceByCaseId: Partial<Record<string, PerformanceMetricSummary>>
  powerImpactByCaseId: Partial<Record<string, PowerImpactSummary>>
  initialRecruitmentPool: GameState['candidates']
  initialRecruitmentCandidateIdSet: Set<string>
  generatedRecruitmentCandidates: GameState['candidates']
  noteBaseTimestamp?: number
}

interface BuiltWeeklyReport {
  report: WeeklyReport
  weekScore: number
}

interface AgencyMetricUpdate {
  finalState: GameState
  weekScore: number
}

function resolveAssignedCaseForWeek(
  currentCase: CaseInstance,
  state: GameState,
  rng: () => number,
  cardBonus?: {
    scoreAdjustment: number
    reasons: string[]
    fatigueAdjustmentByTeam: Record<string, number>
  }
): WeeklyCaseResolutionStrategy {
  const effectiveCase =
    currentCase.majorIncident && isOperationalMajorIncidentCase(currentCase)
      ? buildMajorIncidentEffectiveCase(currentCase, currentCase.majorIncident)
      : currentCase
  const factionContext = buildFactionMissionContext(currentCase, state)
  const assignedTeamLeaderBonuses = buildAssignedTeamLeaderBonuses(
    currentCase.assignedTeamIds,
    state.teams,
    state.agents
  )
  const assignedAgentLeaderBonuses = buildAssignedAgentLeaderBonuses(
    currentCase.assignedTeamIds,
    state.teams,
    state.agents
  )
  const activeTeamStressModifiers = Object.fromEntries(
    currentCase.assignedTeamIds.map((teamId) => [
      teamId,
      (assignedTeamLeaderBonuses[teamId]?.stressModifier ?? 0) +
        (cardBonus?.fatigueAdjustmentByTeam[teamId] ?? 0),
    ])
  )
  const assignedAgents = [
    ...getUniqueTeamMembers(currentCase.assignedTeamIds, state.teams, state.agents),
  ]
  const invalidMajorIncidentOutcome: ResolutionOutcome = {
    caseId: currentCase.id,
    mode: 'probability',
    kind: 'raid',
    delta: -effectiveCase.durationWeeks,
    successChance: 0,
    result: 'fail',
    reasons: ['Major incident launch state was invalid at resolution time.'],
  }

  let outcome: ResolutionOutcome
  let weakestLinkResult: import('../weakestLinkResolution').WeakestLinkMissionResolutionResult | undefined = undefined
  if (currentCase.mode === 'deterministic') {
    // Gather readiness, cohesion, loadout, training, fatigue, missingRoles for all assigned teams
    const assignedTeamId = currentCase.assignedTeamIds[0]
    const team = state.teams[assignedTeamId]
    const agentsById = state.agents
    const supportTags = [
      ...new Set(currentCase.assignedTeamIds.flatMap((teamId) => state.teams[teamId]?.tags ?? [])),
    ]
    const leaderId =
      currentCase.assignedTeamIds.length === 1
        ? (state.teams[currentCase.assignedTeamIds[0]]?.leaderId ?? null)
        : null
    const baseScore = computeTeamScore(assignedAgents, effectiveCase, {
      inventory: state.inventory,
      protocolState: buildAgencyProtocolState(state),
      supportTags,
      teamTags: supportTags,
      leaderId,
      scoreAdjustment: factionContext.scoreAdjustment,
      scoreAdjustmentReason: factionContext.reasons.join(' / '),
      partyCardScoreBonus: cardBonus?.scoreAdjustment,
      partyCardReasons: cardBonus?.reasons,
      config: state.config,
    }).score
    const requiredScore = computeRequiredScore(effectiveCase, state.config)
    const readiness = buildTeamDeploymentReadinessState(state, assignedTeamId)
    const cohesion = buildTeamCohesionSummary(team, agentsById)
    const members = team.memberIds || team.agentIds || []
    const loadoutSummaries = members.map((id: string) =>
      buildAgentLoadoutReadinessSummary(agentsById[id], { state })
    )
    const trainingLocks = members.filter((id: string) => agentsById[id]?.assignment?.state === 'training')
    const fatigueSignals = members.map((id: string) => agentsById[id]?.fatigue ?? 0)
    const missingRoles = readiness.coverageCompleteness?.missing || []
    weakestLinkResult = resolveWeakestLinkMission({
      missionId: currentCase.id,
      week: state.week,
      baseScore,
      requiredScore,
      intelConfidence: effectiveCase.intelConfidence,
      intelUncertainty: effectiveCase.intelUncertainty,
      teamReadiness: readiness,
      teamCohesion: cohesion,
      loadoutSummaries,
      trainingLocks,
      fatigueSignals,
      missingRoles,
    })
    // Map weakest-link result to ResolutionOutcome
    outcome = {
      caseId: currentCase.id,
      mode: 'deterministic',
      kind: currentCase.kind,
      delta: 0,
      successChance: undefined,
      result: weakestLinkResult.resultKind,
      reasons: [
        `Weakest-link outcome: ${weakestLinkResult.outcomeCategory}`,
        ...weakestLinkResult.weakestLinkNarrativeReasonCodes,
      ],
    }
  } else {
    outcome =
      currentCase.majorIncident && isOperationalMajorIncidentCase(currentCase)
        ? resolveMajorIncidentOutcome(state, currentCase, currentCase.assignedTeamIds, rng()) ??
          invalidMajorIncidentOutcome
        : currentCase.kind === 'raid'
        ? resolveRaid(
            effectiveCase,
            currentCase.assignedTeamIds.map((id) => state.teams[id]).filter(Boolean),
            state.agents,
            state.config,
            rng,
            state.inventory,
            {
              protocolState: buildAgencyProtocolState(state),
              scoreAdjustment: factionContext.scoreAdjustment,
              scoreAdjustmentReason: factionContext.reasons.join(' / '),
            }
          )
        : resolveCase(currentCase, assignedAgents, state.config, rng, {
            inventory: state.inventory,
            protocolState: buildAgencyProtocolState(state),
            supportTags: [
              ...new Set(
                currentCase.assignedTeamIds.flatMap((teamId) => state.teams[teamId]?.tags ?? [])
              ),
            ],
            leaderId:
              currentCase.assignedTeamIds.length === 1
                ? (state.teams[currentCase.assignedTeamIds[0]]?.leaderId ?? null)
                : null,
            scoreAdjustment: factionContext.scoreAdjustment,
            scoreAdjustmentReason: factionContext.reasons.join(' / '),
            partyCardScoreBonus: cardBonus?.scoreAdjustment,
            partyCardReasons: cardBonus?.reasons,
          })
  }
  return {
    effectiveCase,
    assignedAgents,
    assignedAgentLeaderBonuses,
    activeTeamStressModifiers,
    outcome,
    weakestLinkResult,
  }
}

function createWeeklyExecutionContext(
  state: GameState,
  noteBaseTimestamp?: number
): WeeklyExecutionContext {
  const initialCaseIds = Object.keys(state.cases)
  const initialRecruitmentPool = [...getRecruitmentPool(state)]
  const intelResearchModifiers = getResearchIntelModifiers(state)

  return {
    sourceState: state,
    nextState: {
      ...state,
      cases: degradeMissionIntelRecord({ ...state.cases }, state.week, intelResearchModifiers),
      teams: { ...state.teams },
      agents: { ...state.agents },
    },
    selectedDirectiveId: state.directiveState.selectedId,
    initialCaseIds,
    initialCaseIdSet: new Set(initialCaseIds),
    processedCaseIds: new Set(),
    progressedCases: [],
    resolvedCases: [],
    failedCases: [],
    partialCases: [],
    failedSpawnSources: [],
    unresolvedTriggers: [],
    spawnedCaseIds: [],
    spawnedCaseIdSet: new Set(),
    spawnedCases: [],
    eventDrafts: [],
    activeTeamIds: new Set(),
    activeTeamStressModifiers: {},
    rewardByCaseId: {},
    missionResultDraftByCaseId: {},
    missionResultByCaseId: {},
    performanceByCaseId: {},
    powerImpactByCaseId: {},
    initialRecruitmentPool,
    initialRecruitmentCandidateIdSet: new Set(
      initialRecruitmentPool.map((candidate) => candidate.id)
    ),
    generatedRecruitmentCandidates: [],
    noteBaseTimestamp,
  }
}

function recordProcessedCase(
  context: WeeklyExecutionContext,
  caseId: string,
  phase: 'resolveAssignments' | 'escalateCases'
) {
  if (!context.initialCaseIdSet.has(caseId)) {
    throw new Error(`${phase} attempted to process non-initial case ${caseId}.`)
  }

  if (context.processedCaseIds.has(caseId)) {
    throw new Error(`${phase} attempted to process case ${caseId} twice in one tick.`)
  }

  context.processedCaseIds.add(caseId)
}

function registerSpawnedCases(context: WeeklyExecutionContext, spawnedCases: SpawnedCaseRecord[]) {
  for (const spawned of spawnedCases) {
    if (context.initialCaseIdSet.has(spawned.caseId)) {
      throw new Error(`Spawned case ${spawned.caseId} collides with an initial case id.`)
    }

    if (context.processedCaseIds.has(spawned.caseId)) {
      throw new Error(`Spawned case ${spawned.caseId} was processed in the same tick.`)
    }

    if (context.spawnedCaseIdSet.has(spawned.caseId)) {
      throw new Error(`Spawned case ${spawned.caseId} was registered more than once.`)
    }

    context.spawnedCaseIdSet.add(spawned.caseId)
    context.spawnedCaseIds.push(spawned.caseId)
    context.spawnedCases.push(spawned)
  }
}

function appendSpawnedCaseEventDrafts(
  context: WeeklyExecutionContext,
  state: GameState,
  spawnedCases: SpawnedCaseRecord[]
) {
  for (const spawned of spawnedCases) {
    const currentCase = state.cases[spawned.caseId]
    const parentCase = spawned.parentCaseId ? state.cases[spawned.parentCaseId] : undefined

    if (!currentCase) {
      continue
    }

    context.eventDrafts.push({
      type: 'case.spawned',
      sourceSystem: 'incident',
      payload: {
        week: context.sourceState.week,
        caseId: currentCase.id,
        caseTitle: currentCase.title,
        templateId: currentCase.templateId,
        kind: currentCase.kind,
        stage: currentCase.stage,
        trigger: spawned.trigger,
        parentCaseId: spawned.parentCaseId,
        parentCaseTitle: parentCase?.title,
      },
    })
  }
}

function assertExclusiveCaseBuckets(context: WeeklyExecutionContext) {
  const buckets = [
    context.resolvedCases,
    context.failedCases,
    context.partialCases,
    context.unresolvedTriggers,
  ]
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

function assertReportEventAlignment(context: WeeklyExecutionContext, report: WeeklyReport) {
  const checks = [
    ['case.resolved', report.resolvedCases],
    ['case.failed', report.failedCases],
    ['case.partially_resolved', report.partialCases],
    ['case.escalated', report.unresolvedTriggers],
    ['case.spawned', report.spawnedCases],
  ] as const

  for (const [type, expected] of checks) {
    const actual = getEventCaseIds(context.eventDrafts, type)

    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Weekly report drift detected for ${type}.`)
    }
  }
}

function assertReportNoteAlignment(context: WeeklyExecutionContext, report: WeeklyReport) {
  const reportNoteDrafts = getWeeklyReportNoteDrafts(context)
  const expected = buildDeterministicReportNotesFromEventDrafts(
    reportNoteDrafts,
    context.sourceState.week,
    context.noteBaseTimestamp
  )

  if (JSON.stringify(report.notes) !== JSON.stringify(expected)) {
    throw new Error('Weekly report notes drift detected from event draft reflections.')
  }
}

function getWeeklyReportNoteDrafts(context: WeeklyExecutionContext) {
  return [
    ...getHistoricalReportNoteDrafts(context.sourceState.events, context.sourceState.week),
    ...context.eventDrafts,
  ]
}

function aggregateOutcomePerformanceSummary(outcome: ResolutionOutcome): PerformanceMetricSummary {
  const fallback: PerformanceMetricSummary = {
    contribution: 0,
    threatHandled: 0,
    damageTaken: 0,
    healingPerformed: 0,
    evidenceGathered: 0,
    containmentActionsCompleted: 0,
  }

  if (!outcome.agentPerformance || outcome.agentPerformance.length === 0) {
    return fallback
  }

  return outcome.agentPerformance.reduce<PerformanceMetricSummary>(
    (summary, performance) => ({
      contribution: Number((summary.contribution + (performance.contribution ?? 0)).toFixed(2)),
      threatHandled: Number((summary.threatHandled + (performance.threatHandled ?? 0)).toFixed(2)),
      damageTaken: Number((summary.damageTaken + (performance.damageTaken ?? 0)).toFixed(2)),
      healingPerformed: Number(
        (summary.healingPerformed + (performance.healingPerformed ?? 0)).toFixed(2)
      ),
      evidenceGathered: Number(
        (summary.evidenceGathered + (performance.evidenceGathered ?? 0)).toFixed(2)
      ),
      containmentActionsCompleted: Number(
        (
          summary.containmentActionsCompleted + (performance.containmentActionsCompleted ?? 0)
        ).toFixed(2)
      ),
    }),
    fallback
  )
}

function aggregateOutcomePowerImpact(outcome: ResolutionOutcome): PowerImpactSummary {
  const fallback: PowerImpactSummary = {
    activeEquipmentIds: [],
    activeKitIds: [],
    activeProtocolIds: [],
    equipmentContributionDelta: 0,
    kitContributionDelta: 0,
    protocolContributionDelta: 0,
    equipmentScoreDelta: 0,
    kitScoreDelta: 0,
    protocolScoreDelta: 0,
    kitEffectivenessMultiplier: 1,
    protocolEffectivenessMultiplier: 1,
    notes: [],
  }

  if (!outcome.agentPerformance || outcome.agentPerformance.length === 0) {
    return fallback
  }

  const aggregate = { ...fallback }

  for (const performance of outcome.agentPerformance) {
    const powerImpact = performance.powerImpact

    if (!powerImpact) {
      continue
    }

    aggregate.activeEquipmentIds.push(...(powerImpact.activeEquipmentIds ?? []))
    aggregate.activeKitIds.push(...(powerImpact.activeKitIds ?? []))
    aggregate.activeProtocolIds.push(...(powerImpact.activeProtocolIds ?? []))
    aggregate.equipmentContributionDelta += powerImpact.equipmentContributionDelta ?? 0
    aggregate.kitContributionDelta += powerImpact.kitContributionDelta ?? 0
    aggregate.protocolContributionDelta += powerImpact.protocolContributionDelta ?? 0
    aggregate.equipmentScoreDelta += powerImpact.equipmentScoreDelta ?? 0
    aggregate.kitScoreDelta += powerImpact.kitScoreDelta ?? 0
    aggregate.protocolScoreDelta += powerImpact.protocolScoreDelta ?? 0
    aggregate.kitEffectivenessMultiplier = Number(
      (
        aggregate.kitEffectivenessMultiplier * (powerImpact.kitEffectivenessMultiplier ?? 1)
      ).toFixed(4)
    )
    aggregate.protocolEffectivenessMultiplier = Number(
      (
        aggregate.protocolEffectivenessMultiplier *
        (powerImpact.protocolEffectivenessMultiplier ?? 1)
      ).toFixed(4)
    )
    aggregate.notes.push(...(powerImpact.notes ?? []))
  }

  aggregate.activeEquipmentIds = [...new Set(aggregate.activeEquipmentIds)]
  aggregate.activeKitIds = [...new Set(aggregate.activeKitIds)]
  aggregate.activeProtocolIds = [...new Set(aggregate.activeProtocolIds)]
  aggregate.notes = [...new Set(aggregate.notes)]

  if (
    aggregate.equipmentContributionDelta !== 0 &&
    !aggregate.notes.some((note) => note.includes('Gear shifted contribution'))
  ) {
    aggregate.notes.push('Gear shifted contribution during resolution.')
  }

  if (
    aggregate.activeKitIds.length > 0 &&
    !aggregate.notes.some((note) => note.includes('Kits applied'))
  ) {
    aggregate.notes.push('Kits applied to active team composition.')
  }

  if (
    aggregate.protocolContributionDelta !== 0 &&
    !aggregate.notes.some((note) => note.includes('Protocols shifted contribution'))
  ) {
    aggregate.notes.push('Protocols shifted contribution during resolution.')
  }

  return aggregate
}

function applyActiveTriggerCooldowns(
  context: WeeklyExecutionContext,
  input: {
    agentIds: string[]
    triggerEvent:
      | 'OnCaseStart'
      | 'OnThreatEncounter'
      | 'OnStressGain'
      | 'OnLongCaseDurationCheck'
      | 'OnResolutionCheck'
      | 'OnExposure'
    caseData?: CaseInstance
    stressGainByAgentId?: Record<string, number>
  }
) {
  const updatedAgents = { ...context.nextState.agents }

  for (const agentId of input.agentIds) {
    let agent = updatedAgents[agentId]

    if (!agent) {
      continue
    }

    const stressGain = input.stressGainByAgentId?.[agentId] ?? 0

    if (input.triggerEvent === 'OnStressGain' && stressGain <= 0) {
      continue
    }

    const effects = resolveAgentAbilityEffects(agent, {
      phase: 'evaluation',
      triggerEvent: input.triggerEvent,
      caseData: input.caseData,
      supportTags: input.caseData
        ? [
            ...new Set([
              ...input.caseData.tags,
              ...input.caseData.requiredTags,
              ...input.caseData.preferredTags,
            ]),
          ]
        : undefined,
      stressGain,
    })

    for (const effect of effects) {
      if (effect.type !== 'active' || !effect.activeInMvp) {
        continue
      }

      agent = markActiveAbilityUsed(
        agent,
        effect.abilityId,
        context.sourceState.week,
        effect.cooldown
      )
    }

    updatedAgents[agentId] = agent
  }

  context.nextState.agents = updatedAgents
}

function resolveAssignments(context: WeeklyExecutionContext, rng: SeededRng) {
  for (const caseId of context.initialCaseIds) {
    const currentCase = context.nextState.cases[caseId] ?? context.sourceState.cases[caseId]
    const existingAssignedTeamIds = currentCase.assignedTeamIds.filter((teamId) =>
      Boolean(context.sourceState.teams[teamId])
    )
    const incidentEvaluation =
      currentCase.majorIncident && isOperationalMajorIncidentCase(currentCase)
        ? evaluateMajorIncidentPlan(context.sourceState, currentCase, existingAssignedTeamIds, {
            strategy: currentCase.majorIncident.strategy,
            provisions: currentCase.majorIncident.provisions,
          })
        : null

    if (currentCase.status !== 'in_progress' || existingAssignedTeamIds.length === 0) {
      if (
        currentCase.status === 'in_progress' &&
        currentCase.assignedTeamIds.length !== existingAssignedTeamIds.length
      ) {
        context.nextState.cases[caseId] = {
          ...currentCase,
          assignedTeamIds: existingAssignedTeamIds,
        }
      }
      continue
    }

    if (incidentEvaluation && !incidentEvaluation.valid) {
      context.nextState.teams = releaseTeams(context.nextState.teams, existingAssignedTeamIds)
      context.nextState.cases[caseId] = {
        ...currentCase,
        assignedTeamIds: [],
        status: 'open',
        weeksRemaining: undefined,
        majorIncident: undefined,
      }
      continue
    }

    recordProcessedCase(context, caseId, 'resolveAssignments')
    context.progressedCases.push(caseId)
    existingAssignedTeamIds.forEach((teamId) => context.activeTeamIds.add(teamId))

    const nextWeeksRemaining = Math.max(
      (currentCase.weeksRemaining ?? currentCase.durationWeeks) - 1,
      0
    )

    if (nextWeeksRemaining > 0) {
      applyActiveTriggerCooldowns(context, {
        agentIds: getUniqueTeamMembers(
          existingAssignedTeamIds,
          context.sourceState.teams,
          context.sourceState.agents
        ).map((agent) => agent.id),
        triggerEvent: 'OnLongCaseDurationCheck',
        caseData: {
          ...currentCase,
          assignedTeamIds: existingAssignedTeamIds,
          weeksRemaining: nextWeeksRemaining,
        },
      })

      context.nextState.cases[caseId] = {
        ...currentCase,
        assignedTeamIds: existingAssignedTeamIds,
        weeksRemaining: nextWeeksRemaining,
      }
      continue
    }

    let cardBonus:
      | {
          scoreAdjustment: number
          reasons: string[]
          fatigueAdjustmentByTeam: Record<string, number>
        }
      | undefined

    if (context.nextState.partyCards) {
      const consumed = consumeResolutionPartyCards(context.nextState.partyCards, {
        caseId: currentCase.id,
        caseTags: [...currentCase.tags, ...currentCase.requiredTags, ...currentCase.preferredTags],
        teamIds: existingAssignedTeamIds,
      })

      context.nextState.partyCards = consumed.nextState

      if (consumed.bonus.scoreAdjustment !== 0 || consumed.bonus.consumedCardIds.length > 0) {
        const labels = consumed.bonus.consumedCardIds
          .map((cardId) => context.sourceState.partyCards?.cards[cardId]?.title ?? cardId)
          .join(', ')

        cardBonus = {
          scoreAdjustment: consumed.bonus.scoreAdjustment,
          reasons: [
            `Party cards: ${consumed.bonus.scoreAdjustment >= 0 ? '+' : ''}${consumed.bonus.scoreAdjustment.toFixed(1)}${labels ? ` (${labels})` : ''}`,
          ],
          fatigueAdjustmentByTeam: consumed.bonus.fatigueAdjustmentByTeam,
        }
      }
    }

    const weeklyResolution = resolveAssignedCaseForWeek(
      {
        ...currentCase,
        assignedTeamIds: existingAssignedTeamIds,
      },
      context.sourceState,
      rng.next,
      cardBonus
    )
    const { assignedAgentLeaderBonuses, activeTeamStressModifiers, effectiveCase, outcome, weakestLinkResult } =
      weeklyResolution

    Object.assign(context.activeTeamStressModifiers, activeTeamStressModifiers)
    context.nextState.teams = releaseTeams(context.nextState.teams, existingAssignedTeamIds)

    const assignedAgentIds = getUniqueTeamMembers(
      existingAssignedTeamIds,
      context.nextState.teams,
      context.nextState.agents
    ).map((agent) => agent.id)

    applyActiveTriggerCooldowns(context, {
      agentIds: assignedAgentIds,
      triggerEvent: 'OnCaseStart',
      caseData: effectiveCase,
    })

    const missionAssignedAgents = assignedAgentIds
      .map((agentId) => context.nextState.agents[agentId])
      .filter((agent): agent is NonNullable<GameState['agents'][string]> => Boolean(agent))

    const missionAgentMutations = applyMissionResolutionAgentMutations({
      agents: context.nextState.agents,
      assignedAgents: missionAssignedAgents,
      assignedAgentLeaderBonuses,
      effectiveCase,
      outcome,
      week: context.sourceState.week,
      rng: rng.next,
    })

    context.nextState.agents = missionAgentMutations.nextAgents
    if (missionAgentMutations.fundingDelta !== 0) {
      context.nextState = {
        ...context.nextState,
        funding: context.nextState.funding + missionAgentMutations.fundingDelta,
      }
    }
    context.eventDrafts.push(...missionAgentMutations.eventDrafts)

    const performanceSummary = aggregateOutcomePerformanceSummary(outcome)
    const powerImpact = aggregateOutcomePowerImpact(outcome)
    context.performanceByCaseId[caseId] = performanceSummary
    context.powerImpactByCaseId[caseId] = powerImpact

    if (outcome.result === 'success') {
      const rewardBreakdown = buildMissionRewardBreakdown(
        effectiveCase,
        'success',
        context.nextState.config,
        context.nextState
      )
      context.rewardByCaseId[caseId] = rewardBreakdown
      context.missionResultDraftByCaseId[caseId] = {
        ...buildSuccessCaseOutcomeDraft({
          caseId,
          caseTitle: currentCase.title,
          teamsUsed: existingAssignedTeamIds.map((teamId) => ({
            teamId,
            teamName: context.sourceState.teams[teamId]?.name,
          })),
          rewards: rewardBreakdown,
          performanceSummary,
          powerImpact,
          injuries: missionAgentMutations.missionInjuries,
          fatalities: missionAgentMutations.missionFatalities,
          resolutionReasons: outcome.reasons,
        }),
        ...(weakestLinkResult ? { weakestLink: weakestLinkResult } : {}),
      }

      context.resolvedCases.push(caseId)
      context.nextState.cases[caseId] = {
        ...currentCase,
        assignedTeamIds: [],
        status: 'resolved',
        weeksRemaining: 0,
      }
      context.eventDrafts.push(
        buildCaseResolvedEventDraft({
          week: context.sourceState.week,
          caseData: effectiveCase,
          teamIds: existingAssignedTeamIds,
          rewardBreakdown,
          performanceSummary,
        })
      )
      continue
    }

    const resolutionEscalation = createResolutionEscalationTransition(currentCase, outcome.result)
    const escalatedCase = {
      ...resolutionEscalation.nextCase,
      status: 'open' as const,
      assignedTeamIds: [],
      weeksRemaining: undefined,
      majorIncident: undefined,
    }
    context.nextState.cases[caseId] = escalatedCase
    const { nextStage } = resolutionEscalation
    const rewardBreakdown = buildMissionRewardBreakdown(
      escalatedCase,
      outcome.result,
      context.nextState.config,
      context.nextState
    )
    context.rewardByCaseId[caseId] = rewardBreakdown
    context.missionResultDraftByCaseId[caseId] = {
      ...buildEscalatedCaseOutcomeDraft({
        caseId,
        caseTitle: currentCase.title,
        teamsUsed: existingAssignedTeamIds.map((teamId) => ({
          teamId,
          teamName: context.sourceState.teams[teamId]?.name,
        })),
        outcome: outcome.result,
        rewards: rewardBreakdown,
        performanceSummary,
        powerImpact,
        injuries: missionAgentMutations.missionInjuries,
        fatalities: missionAgentMutations.missionFatalities,
        spawnedConsequences: [
          {
            type: 'stage_escalation',
            caseId,
            caseTitle: currentCase.title,
            stage: escalatedCase.stage,
            detail: `Case escalated to stage ${escalatedCase.stage}.`,
          },
        ],
        resolutionReasons: outcome.reasons,
      }),
      ...(weakestLinkResult ? { weakestLink: weakestLinkResult } : {}),
    }

    if (outcome.result === 'fail') {
      applyActiveTriggerCooldowns(context, {
        agentIds: assignedAgentIds,
        triggerEvent: 'OnThreatEncounter',
        caseData: escalatedCase,
      })
      context.failedCases.push(caseId)
      context.failedSpawnSources.push(caseId)
      context.eventDrafts.push(
        buildCaseFailedEventDraft({
          week: context.sourceState.week,
          caseData: effectiveCase,
          toStage: nextStage,
          teamIds: existingAssignedTeamIds,
          rewardBreakdown,
          performanceSummary,
        })
      )
    }

    if (outcome.result === 'partial') {
      applyActiveTriggerCooldowns(context, {
        agentIds: assignedAgentIds,
        triggerEvent: 'OnThreatEncounter',
        caseData: escalatedCase,
      })
      context.partialCases.push(caseId)
      context.eventDrafts.push(
        buildCasePartiallyResolvedEventDraft({
          week: context.sourceState.week,
          caseData: effectiveCase,
          toStage: nextStage,
          teamIds: existingAssignedTeamIds,
          rewardBreakdown,
          performanceSummary,
        })
      )
    }
  }
}

function escalateCases(context: WeeklyExecutionContext) {
  for (const caseId of context.initialCaseIds) {
    const sourceCase = context.sourceState.cases[caseId]
    const currentCase = context.nextState.cases[caseId] ?? sourceCase
    const existingAssignedTeamIds = sourceCase.assignedTeamIds.filter((teamId) =>
      Boolean(context.sourceState.teams[teamId])
    )

    if (sourceCase.status !== 'open' || existingAssignedTeamIds.length > 0) {
      if (sourceCase.assignedTeamIds.length !== existingAssignedTeamIds.length) {
        const nextCase = context.nextState.cases[caseId] ?? currentCase
        context.nextState.cases[caseId] = {
          ...nextCase,
          assignedTeamIds: existingAssignedTeamIds,
        }
      }
      continue
    }

    recordProcessedCase(context, caseId, 'escalateCases')

    const countdownCase = decrementOpenDeadline(currentCase)
    const nextDeadlineRemaining = countdownCase.deadlineRemaining

    if (nextDeadlineRemaining > 0) {
      context.nextState.cases[caseId] = countdownCase
      continue
    }

    const deadlineEscalation = createDeadlineEscalationTransition(currentCase, context.sourceState.week)
    const escalatedCase = deadlineEscalation.nextCase
    const rewardBreakdown = buildMissionRewardBreakdown(
      escalatedCase,
      'unresolved',
      context.nextState.config,
      context.nextState
    )
    context.nextState.cases[caseId] = escalatedCase
    context.rewardByCaseId[caseId] = rewardBreakdown
    context.missionResultDraftByCaseId[caseId] = buildUnresolvedCaseOutcomeDraft({
      caseId,
      caseTitle: currentCase.title,
      rewards: rewardBreakdown,
      spawnedConsequences: [
        {
          type: 'stage_escalation',
          caseId,
          caseTitle: currentCase.title,
          stage: escalatedCase.stage,
          detail: `Case escalated to stage ${escalatedCase.stage} after deadline expiry.`,
        },
      ],
      explanationNotes: ['Case deadline expired before successful resolution.'],
    })
    context.unresolvedTriggers.push(caseId)
    context.eventDrafts.push(
      buildCaseEscalatedEventDraft({
        week: context.sourceState.week,
        caseData: currentCase,
        toStage: escalatedCase.stage,
        rewardBreakdown,
        trigger: 'deadline',
        deadlineRemaining: escalatedCase.deadlineRemaining,
        convertedToRaid: deadlineEscalation.convertedToRaid,
      })
    )

    if (deadlineEscalation.convertedToRaid && escalatedCase.raid) {
      context.eventDrafts.push({
        type: 'case.raid_converted',
        sourceSystem: 'incident',
        payload: {
          week: context.sourceState.week,
          caseId,
          caseTitle: currentCase.title,
          stage: escalatedCase.stage,
          trigger: 'deadline',
          minTeams: escalatedCase.raid.minTeams,
          maxTeams: escalatedCase.raid.maxTeams,
        },
      })
    }
  }
}

function prepareAgentsForWeek(context: WeeklyExecutionContext) {
  const decrementedAgents = decrementActiveAbilityCooldowns(context.nextState.agents)
  const withPassiveTrustRecovery = recoverTrustDamagePassively(decrementedAgents)
  const withExpiredTrustConsequences = expireBetrayalConsequences(
    withPassiveTrustRecovery,
    context.sourceState.week
  )
  
  // Recovery/downtime handled in main advanceWeek, not here
  context.nextState = {
    ...context.nextState,
    agents: withExpiredTrustConsequences,
  }
}

function applyPassiveRelationshipDrift(context: WeeklyExecutionContext) {
  const teamByAgentId = new Map<string, string>()

  for (const team of Object.values(context.nextState.teams)) {
    for (const agentId of getTeamMemberIds(team)) {
      teamByAgentId.set(agentId, team.id)
    }
  }

  const nextAgents = { ...context.nextState.agents }
  const processedPairs = new Set<string>()

  for (const [agentId, agent] of Object.entries(context.nextState.agents)) {
    for (const [counterpartId, currentValue] of Object.entries(agent.relationships)) {
      const pairKey = [agentId, counterpartId].sort().join('::')

      if (processedPairs.has(pairKey)) {
        continue
      }
      processedPairs.add(pairKey)

      const counterpart = context.nextState.agents[counterpartId]
      if (!counterpart) {
        continue
      }

      const sameTeam =
        teamByAgentId.get(agentId) !== undefined &&
        teamByAgentId.get(agentId) === teamByAgentId.get(counterpartId)

      if (sameTeam) {
        continue
      }

      const reverseValue = counterpart.relationships[agentId] ?? 0
      const nextForward = driftRelationshipTowardNeutral(currentValue)
      const nextReverse = driftRelationshipTowardNeutral(reverseValue)

      if (nextForward === currentValue && nextReverse === reverseValue) {
        continue
      }

      nextAgents[agentId] = {
        ...nextAgents[agentId]!,
        relationships: {
          ...nextAgents[agentId]!.relationships,
          [counterpartId]: nextForward,
        },
        ...(nextAgents[agentId]!.history
          ? {
              history: {
                ...nextAgents[agentId]!.history,
                bonds: {
                  ...nextAgents[agentId]!.history!.bonds,
                  [counterpartId]: nextForward,
                },
              },
            }
          : {}),
      }
      nextAgents[counterpartId] = {
        ...nextAgents[counterpartId]!,
        relationships: {
          ...nextAgents[counterpartId]!.relationships,
          [agentId]: nextReverse,
        },
        ...(nextAgents[counterpartId]!.history
          ? {
              history: {
                ...nextAgents[counterpartId]!.history,
                bonds: {
                  ...nextAgents[counterpartId]!.history!.bonds,
                  [agentId]: nextReverse,
                },
              },
            }
          : {}),
      }

      context.eventDrafts.push(
        {
          type: 'agent.relationship_changed',
          sourceSystem: 'agent',
          payload: {
            week: context.sourceState.week,
            agentId,
            agentName: agent.name,
            counterpartId,
            counterpartName: counterpart.name,
            previousValue: currentValue,
            nextValue: nextForward,
            delta: Math.round((nextForward - currentValue) * 100) / 100,
            reason: 'passive_drift',
          },
        },
        {
          type: 'agent.relationship_changed',
          sourceSystem: 'agent',
          payload: {
            week: context.sourceState.week,
            agentId: counterpartId,
            agentName: counterpart.name,
            counterpartId: agentId,
            counterpartName: agent.name,
            previousValue: reverseValue,
            nextValue: nextReverse,
            delta: Math.round((nextReverse - reverseValue) * 100) / 100,
            reason: 'passive_drift',
          },
        }
      );
    }
  }

  context.nextState.agents = nextAgents

  // Record relationship history snapshots for trend tracking
  let stateWithHistory = context.nextState
  for (const agent of Object.values(nextAgents)) {
    for (const [counterpartId, relationshipValue] of Object.entries(agent.relationships)) {
      if (agent.id < counterpartId) {
        // Only record once per pair (avoid duplicates)
        stateWithHistory = recordRelationshipSnapshot(
          stateWithHistory,
          {
            agentAId: agent.id,
            agentBId: counterpartId,
            value: relationshipValue,
            modifiers: [],
            state: deriveRelationshipState(relationshipValue),
            stability: deriveRelationshipStability(relationshipValue),
          },
          'passive_drift'
        )
      }
    }
  }
  context.nextState = stateWithHistory
}

/**
 * Drift relationship toward neutral over time when agents aren't on same team.
 * Stability factor (0.3-0.9) affects drift rate: higher stability = slower drift.
 * Default stability of 0.5 means normal drift rate.
 */
function driftRelationshipTowardNeutral(value: number, stability: number = 0.5) {
  if (Math.abs(value) < 0.05) {
    return 0
  }

  // Adjust drift rate based on stability: stable relationships drift slower
  const baseDriftRate = Math.abs(value) >= 1.5 ? 0.08 : 0.06
  const stabilityFactor = (stability - 0.5) * 0.5 + 1.0 // Range: 0.75 (very stable) to 1.25 (fragile)
  const driftRate = baseDriftRate / stabilityFactor

  if (value > 0) {
    return Math.max(0, Math.round((value - driftRate) * 100) / 100)
  }

  return Math.min(0, Math.round((value + driftRate) * 100) / 100)
}

function applySpontaneousRelationshipEvents(context: WeeklyExecutionContext, rng: SeededRng) {
  const result = applySpontaneousChemistryEvent(context.nextState, {
    rng: rng.next,
    week: context.sourceState.week,
    activeTeamIds: context.activeTeamIds,
  })

  context.nextState = result.state
  context.eventDrafts.push(...result.eventDrafts)
}

function settleWeekState(context: WeeklyExecutionContext, rng: SeededRng) {
  const preFatigueAgents = context.nextState.agents

  const fatiguedAgents = applyAgentFatigue(
    context.nextState.agents,
    context.nextState.teams,
    context.sourceState.config,
    [...context.activeTeamIds],
    context.activeTeamStressModifiers
  )
  const directiveAdjustedAgents =
    context.selectedDirectiveId === 'recovery-rotation'
      ? applyRecoveryRotationToAgents(
          fatiguedAgents,
          [...context.activeTeamIds],
          context.nextState.teams
        )
      : fatiguedAgents

  context.nextState = {
    ...context.nextState,
    week: context.sourceState.week + 1,
    rngState: rng.getState(),
    agents: directiveAdjustedAgents,
  }

  const stressGainByAgentId = Object.fromEntries(
    Object.keys(context.nextState.agents).map((agentId) => [
      agentId,
      (context.nextState.agents[agentId]?.fatigue ?? 0) - (preFatigueAgents[agentId]?.fatigue ?? 0),
    ])
  )

  applyActiveTriggerCooldowns(context, {
    agentIds: Object.keys(context.nextState.agents),
    triggerEvent: 'OnStressGain',
    stressGainByAgentId,
  })
}

function refreshPartyCards(context: WeeklyExecutionContext, rng: SeededRng) {
  if (!context.nextState.partyCards) {
    return
  }

  const drawResult = drawPartyCardsToHandLimit(context.nextState.partyCards, rng.next)
  context.nextState = {
    ...context.nextState,
    partyCards: drawResult.nextState,
    rngState: rng.getState(),
  }

  if (drawResult.drawnCardIds.length > 0) {
    context.eventDrafts.push({
      type: 'system.party_cards_drawn',
      sourceSystem: 'system',
      payload: {
        week: context.sourceState.week,
        count: drawResult.drawnCardIds.length,
      },
    })
  }
}

function spawnFollowUps(context: WeeklyExecutionContext, rng: SeededRng) {
  const failureSpawn = spawnFromFailures(context.nextState, context.failedSpawnSources, rng.next)
  context.nextState = { ...failureSpawn.state, rngState: rng.getState() }
  registerSpawnedCases(context, failureSpawn.spawnedCases)
  appendSpawnedCaseEventDrafts(context, context.nextState, failureSpawn.spawnedCases)

  const escalationSpawn = spawnFromEscalations(
    context.nextState,
    context.unresolvedTriggers,
    rng.next
  )
  context.nextState = { ...escalationSpawn.state, rngState: rng.getState() }
  registerSpawnedCases(context, escalationSpawn.spawnedCases)
  appendSpawnedCaseEventDrafts(context, context.nextState, escalationSpawn.spawnedCases)
}

function generateRecruitmentPool(context: WeeklyExecutionContext, rng: SeededRng) {
  const generatedCandidates = generateCandidates(
    buildRecruitmentGenerationState(
      syncRecruitmentPoolState(context.nextState, context.initialRecruitmentPool)
    ),
    rng.next
  )
  const directiveAdjustedCandidates =
    context.selectedDirectiveId === 'intel-surge'
      ? applyIntelSurgeToCandidates(generatedCandidates)
      : generatedCandidates

  for (const candidate of directiveAdjustedCandidates) {
    if (context.initialRecruitmentCandidateIdSet.has(candidate.id)) {
      throw new Error(
        `Generated recruitment candidate ${candidate.id} collides with an existing pool id.`
      )
    }
  }

  context.generatedRecruitmentCandidates = directiveAdjustedCandidates
  context.nextState = {
    ...syncRecruitmentPoolState(context.nextState, [
      ...context.initialRecruitmentPool,
      ...generatedCandidates,
    ]),
    rngState: rng.getState(),
  }

  if (generatedCandidates.length > 0) {
    context.eventDrafts.push({
      type: 'system.recruitment_generated',
      sourceSystem: 'system',
      payload: {
        week: context.sourceState.week,
        count: generatedCandidates.length,
      },
    })
  }
}

function expireOldCandidates(context: WeeklyExecutionContext) {
  const nonExpiredCandidates = removeExpiredCandidates(
    context.initialRecruitmentPool,
    context.nextState.week
  )
  const expiredCandidateCount = context.initialRecruitmentPool.length - nonExpiredCandidates.length

  if (
    removeExpiredCandidates(context.generatedRecruitmentCandidates, context.nextState.week)
      .length !== context.generatedRecruitmentCandidates.length
  ) {
    throw new Error('Newly generated recruitment candidates expired in the same tick.')
  }

  context.nextState = syncRecruitmentPoolState(context.nextState, [
    ...nonExpiredCandidates,
    ...context.generatedRecruitmentCandidates,
  ])

  if (expiredCandidateCount > 0) {
    context.eventDrafts.push({
      type: 'system.recruitment_expired',
      sourceSystem: 'system',
      payload: {
        week: context.sourceState.week,
        count: expiredCandidateCount,
      },
    })
  }
}

function processRaidPressure(context: WeeklyExecutionContext, rng: SeededRng) {
  const pressureResult = executePressurePipeline(
    {
      sourceState: context.sourceState,
      nextState: context.nextState,
      initialCaseIds: context.initialCaseIds,
      unresolvedTriggers:
        context.selectedDirectiveId === 'lockdown-protocol'
          ? []
          : context.selectedDirectiveId === 'intel-surge' && context.unresolvedTriggers.length > 0
            ? context.unresolvedTriggers.slice(0, context.unresolvedTriggers.length - 1)
            : context.unresolvedTriggers,
    },
    rng.next
  )
  context.nextState = { ...pressureResult.nextState, rngState: rng.getState() }
  registerSpawnedCases(context, pressureResult.spawnedCases)
  appendSpawnedCaseEventDrafts(context, context.nextState, pressureResult.spawnedCases)

  const raidResult = applyRaids(context.nextState, context.initialCaseIds, rng.next)
  context.nextState = { ...raidResult.state, rngState: rng.getState() }
  registerSpawnedCases(context, raidResult.spawnedCases)
  appendSpawnedCaseEventDrafts(context, context.nextState, raidResult.spawnedCases)
}

function refreshMissionIntakeRouting(context: WeeklyExecutionContext) {
  context.nextState = {
    ...context.nextState,
    missionRouting: recomputeMissionRouting(context.nextState, context.sourceState.week),
  }
}

function advanceQueues(context: WeeklyExecutionContext) {
  const trainingResult = advanceTrainingQueues(context.nextState)
  context.nextState = advanceTrainingCertificationState(trainingResult.state)
  context.eventDrafts.push(...trainingResult.eventDrafts)

  const productionResult = advanceProductionQueues(context.nextState)
  context.nextState = productionResult.state
  context.eventDrafts.push(...productionResult.eventDrafts)
}

function shiftMarket(context: WeeklyExecutionContext, rng: SeededRng) {
  const marketResult = advanceMarketState(context.nextState, rng.next)
  const directiveAdjustedMarket =
    context.selectedDirectiveId === 'procurement-push'
      ? applyProcurementPushToMarket(marketResult.state.market)
      : marketResult.state.market

  context.nextState = {
    ...marketResult.state,
    market: directiveAdjustedMarket,
    rngState: rng.getState(),
  }
  context.eventDrafts.push(...marketResult.eventDrafts)
}

function finalizeMissionResults(context: WeeklyExecutionContext) {
  context.missionResultByCaseId = finalizeMissionResultsFromDrafts({
    sourceState: context.sourceState,
    nextState: context.nextState,
    spawnedCases: context.spawnedCases,
    missionResultDraftByCaseId: context.missionResultDraftByCaseId,
    activeTeamStressModifiers: context.activeTeamStressModifiers,
  })

  for (const missionResult of Object.values(context.missionResultByCaseId)) {
    if (!missionResult) {
      continue
    }

    const activeContract =
      context.sourceState.cases[missionResult.caseId]?.contract ??
      context.nextState.cases[missionResult.caseId]?.contract
    const availableRecruitUnlocksBefore = getFactionRecruitUnlocks({
      factions: context.nextState.factions ?? {},
    })

    const reason: 'case.resolved' | 'case.partially_resolved' | 'case.failed' | 'case.escalated' =
      missionResult.outcome === 'success'
        ? 'case.resolved'
        : missionResult.outcome === 'partial'
          ? 'case.partially_resolved'
          : missionResult.outcome === 'fail'
          ? 'case.failed'
          : 'case.escalated'

    if (missionResult.rewards.inventoryRewards.length > 0) {
      const nextInventory = { ...context.nextState.inventory }

      for (const reward of missionResult.rewards.inventoryRewards) {
        nextInventory[reward.itemId] = Math.max(
          0,
          (nextInventory[reward.itemId] ?? 0) + reward.quantity
        )
      }

      context.nextState = {
        ...context.nextState,
        inventory: nextInventory,
      }
    }

    if ((missionResult.rewards.progressionUnlocks?.length ?? 0) > 0) {
      const progressionUnlockIds = [
        ...new Set([
          ...(context.nextState.agency?.progressionUnlockIds ?? []),
          ...missionResult.rewards.progressionUnlocks!,
        ]),
      ].sort((left, right) => left.localeCompare(right))

      context.nextState = {
        ...context.nextState,
        agency: {
          ...(context.nextState.agency ?? {
            containmentRating: context.nextState.containmentRating,
            clearanceLevel: context.nextState.clearanceLevel,
            funding: context.nextState.funding,
          }),
          progressionUnlockIds,
        },
      }
    }

    if (activeContract) {
      context.nextState = {
        ...context.nextState,
        contracts: recordContractOutcome(
          context.nextState.contracts,
          activeContract,
          missionResult.outcome,
          context.sourceState.week
        ),
      }
    }

    const favorGrants =
      missionResult.rewards.factionGrants
        ?.filter((grant) => grant.kind === 'favor')
        .map((grant) => ({
          factionId: grant.factionId,
          rewardId: grant.rewardId ?? grant.label,
        })) ?? []

    if (favorGrants.length > 0) {
      context.nextState = {
        ...context.nextState,
        factions: applyFactionFavorGrants(context.nextState.factions ?? {}, favorGrants),
      }
    }

    for (const standing of missionResult.rewards.factionStanding) {
      const factionBefore = context.nextState.factions?.[standing.factionId]
      const reputationBefore = factionBefore?.reputation ?? 0
      const contactBefore =
        standing.contactId && factionBefore
          ? factionBefore.contacts.find((contact) => contact.id === standing.contactId)
          : undefined

      context.nextState = {
        ...context.nextState,
        factions: applyFactionMissionOutcome(
          context.nextState.factions ?? {},
          {
            factionId: standing.factionId,
            delta: standing.delta,
            contactId: standing.contactId,
            contactDelta: standing.contactDelta,
          },
          missionResult.outcome
        ),
      }

      const factionAfter = context.nextState.factions?.[standing.factionId]
      const reputationAfter = factionAfter?.reputation ?? reputationBefore
      const contactAfter =
        standing.contactId && factionAfter
          ? factionAfter.contacts.find((contact) => contact.id === standing.contactId)
          : undefined

      context.eventDrafts.push({
        type: 'faction.standing_changed',
        sourceSystem: 'faction',
        payload: {
          week: context.sourceState.week,
          factionId: standing.factionId,
          factionName: getFactionDefinition(standing.factionId)?.label ?? standing.label,
          delta: standing.delta,
          standingBefore: clamp(Math.round(reputationBefore / 5), -20, 20),
          standingAfter: clamp(Math.round(reputationAfter / 5), -20, 20),
          reason,
          caseId: missionResult.caseId,
          caseTitle: missionResult.caseTitle,
          contactId: standing.contactId,
          contactName: standing.contactName,
          contactRelationshipBefore: contactBefore?.relationship,
          contactRelationshipAfter: contactAfter?.relationship,
          contactDelta: standing.contactDelta,
          reputationBefore,
          reputationAfter,
        },
      })
    }

    const availableRecruitUnlocksAfter = getFactionRecruitUnlocks({
      factions: context.nextState.factions ?? {},
    })

    for (const unlock of diffFactionRecruitUnlocks(
      availableRecruitUnlocksBefore,
      availableRecruitUnlocksAfter
    )) {
      context.eventDrafts.push(
        createFactionUnlockAvailableDraft({
          week: context.sourceState.week,
          factionId: unlock.factionId,
          factionName: unlock.factionName,
          contactId: unlock.contactId,
          contactName: unlock.contactName,
          label: unlock.label,
          summary: unlock.summary,
          disposition: unlock.disposition,
        })
      )
    }
  }
}

function buildReports(context: WeeklyExecutionContext): BuiltWeeklyReport {
  const report: WeeklyReport = {
    week: context.sourceState.week,
    rngStateBefore: context.sourceState.rngState,
    rngStateAfter: context.nextState.rngState,
    newCases: [...context.spawnedCaseIds],
    progressedCases: [...context.progressedCases],
    resolvedCases: [...context.resolvedCases],
    failedCases: [...context.failedCases],
    partialCases: [...context.partialCases],
    unresolvedTriggers: [...context.unresolvedTriggers],
    spawnedCases: [...context.spawnedCaseIds],
    maxStage: Math.max(
      ...Object.values(context.nextState.cases).map((currentCase) => currentCase.stage),
      0
    ),
    avgFatigue: getAverageRosterFatigue(context.nextState.agents),
    teamStatus: buildReportTeamStatus(
      context.nextState.teams,
      context.nextState.agents,
      context.nextState.cases
    ),
    caseSnapshots: buildReportCaseSnapshots(
      context.nextState.cases,
      context.missionResultByCaseId,
      context.rewardByCaseId,
      context.performanceByCaseId,
      context.powerImpactByCaseId
    ),
    notes: [],
  }

  const weekScore = calcWeekScore(report)

  return { report, weekScore }
}

function updateAgencyMetrics(
  context: WeeklyExecutionContext,
  builtReport: BuiltWeeklyReport
): AgencyMetricUpdate {
  const { report, weekScore } = builtReport
  const fundingDelta = computeFundingDelta(report, context.nextState.config, context.rewardByCaseId)
  const lockdownPenalty = context.selectedDirectiveId === 'lockdown-protocol' ? -8 : 0
  const containmentDelta =
    computeContainmentDelta(report, context.nextState.config, context.rewardByCaseId) +
    lockdownPenalty
  const nextFunding = context.nextState.funding + fundingDelta
  const nextContainmentRating = clamp(
    context.nextState.containmentRating + containmentDelta,
    0,
    100
  )
  const cumulativeScore =
    context.sourceState.reports.reduce(
      (sum, currentReport) => sum + calcWeekScore(currentReport),
      0
    ) + weekScore
  const nextClearanceLevel = computeClearanceLevel(
    cumulativeScore,
    context.nextState.config.clearanceThresholds
  )

  if (
    nextFunding !== context.nextState.funding ||
    nextContainmentRating !== context.nextState.containmentRating ||
    nextClearanceLevel !== context.nextState.clearanceLevel
  ) {
    context.eventDrafts.push({
      type: 'agency.containment_updated',
      sourceSystem: 'system',
      payload: {
        week: report.week,
        containmentRatingBefore: context.nextState.containmentRating,
        containmentRatingAfter: nextContainmentRating,
        containmentDelta,
        clearanceLevelBefore: context.nextState.clearanceLevel,
        clearanceLevelAfter: nextClearanceLevel,
        fundingBefore: context.nextState.funding,
        fundingAfter: nextFunding,
        fundingDelta,
      },
    })
  }

  if (context.selectedDirectiveId !== null) {
    const definition = getWeeklyDirectiveDefinition(context.selectedDirectiveId)
    context.eventDrafts.push({
      type: 'directive.applied',
      sourceSystem: 'system',
      payload: {
        week: report.week,
        directiveId: context.selectedDirectiveId,
        directiveLabel: definition?.label ?? context.selectedDirectiveId,
      },
    })
  }

  const activeCaseCount = Object.values(context.nextState.cases).filter(
    (currentCase) => currentCase.status !== 'resolved'
  ).length
  const allResolved = activeCaseCount === 0
  const capacityExceeded = activeCaseCount > context.nextState.config.maxActiveCases

  return {
    weekScore,
    finalState: {
      ...context.nextState,
      directiveState: recordAppliedDirective(
        context.nextState.directiveState,
        context.sourceState.week,
        context.selectedDirectiveId
      ),
      gameOver: allResolved || capacityExceeded,
      gameOverReason: allResolved
        ? GAME_OVER_REASONS.allResolved
        : capacityExceeded
          ? GAME_OVER_REASONS.capExceeded
          : undefined,
      funding: nextFunding,
      containmentRating: nextContainmentRating,
      clearanceLevel: nextClearanceLevel,
      reports: [...context.sourceState.reports, report],
    },
  }
}

function finalizeEvents(
  context: WeeklyExecutionContext,
  builtReport: BuiltWeeklyReport,
  agencyMetrics: AgencyMetricUpdate
) {
  const reportNoteDrafts = getWeeklyReportNoteDrafts(context)
  const report = {
    ...builtReport.report,
    notes: buildDeterministicReportNotesFromEventDrafts(
      reportNoteDrafts,
      context.sourceState.week,
      context.noteBaseTimestamp
    ),
  }
  const finalStateWithReport = {
    ...agencyMetrics.finalState,
    reports: [...agencyMetrics.finalState.reports.slice(0, -1), report],
  }

  context.eventDrafts.push({
    type: 'intel.report_generated',
    sourceSystem: 'intel',
    payload: {
      week: report.week,
      resolvedCount: report.resolvedCases.length,
      failedCount: report.failedCases.length,
      partialCount: report.partialCases.length,
      unresolvedCount: report.unresolvedTriggers.length,
      spawnedCount: report.spawnedCases.length,
      noteCount: report.notes.length,
      score: builtReport.weekScore,
    },
  })

  assertExclusiveCaseBuckets(context)
  assertReportEventAlignment(context, report)
  assertReportNoteAlignment(context, report)

  return normalizeGameState(appendOperationEventDrafts(finalStateWithReport, context.eventDrafts))
}

/**
 * Advance the game state by one week.
 * This is a batch simulation step: abstract case resolution, report output, and state updates.
 * It is intentionally not a visual combat loop or action-by-action playback engine.
 */
export function advanceWeek(state: GameState, overrideNow?: number): GameState {
  const normalizedState = ensureNormalizedGameState(state)

  if (normalizedState.gameOver) {
    return normalizedState
  }

  const rng = createSeededRng(normalizedState.rngState)
  const noteBaseTimestamp =
    overrideNow !== undefined && Number.isFinite(overrideNow) ? Math.trunc(overrideNow) : undefined
  const context = createWeeklyExecutionContext(normalizedState, noteBaseTimestamp)

  prepareAgentsForWeek(context)
  resolveAssignments(context, rng)
  // Progress deterministic recovery, trauma, and downtime for all agents and teams
  const downtimeAssignments = Object.fromEntries(
    Object.keys(context.nextState.agents).map((agentId) => [agentId, 'rest' as import('./recoveryDowntime').DowntimeActivity])
  ) as Record<string, import('./recoveryDowntime').DowntimeActivity>;
  const { updatedAgents, updatedTeams } = advanceRecoveryDowntimeForWeek({
    week: context.sourceState.week,
    sourceAgents: context.nextState.agents,
    sourceTeams: context.nextState.teams,
    downtimeAssignments,
    fundingState: getCanonicalFundingState(context.nextState),
    replacementPressureState: context.nextState.replacementPressureState,
  })
  context.nextState.agents = updatedAgents
  context.nextState.teams = updatedTeams
  context.nextState.agents = advanceRecoveryAgentsForWeek({
    week: context.sourceState.week,
    sourceAgents: context.nextState.agents,
    nextAgents: context.nextState.agents,
  })
  escalateCases(context)
  settleWeekState(context, rng)
  refreshPartyCards(context, rng)
  spawnFollowUps(context, rng)
  generateRecruitmentPool(context, rng)
  expireOldCandidates(context)
  processRaidPressure(context, rng)
  refreshMissionIntakeRouting(context)
  advanceQueues(context)
  applyPassiveRelationshipDrift(context)
  applySpontaneousRelationshipEvents(context, rng)
  shiftMarket(context, rng)
  finalizeMissionResults(context)

  // --- Deterministic escalation, threat drift, and time pressure progression ---
  // Update per-case escalationLevel, threatDrift, and timePressure
  let globalEscalationLevel = 0
  let globalThreatDrift = 0
  let globalTimePressure = 0
  for (const caseId of Object.keys(context.nextState.cases)) {
    const c = context.nextState.cases[caseId]
    // Escalation: increment if case escalated this week (fail, partial, unresolved)
    let escalationDelta = 0
    if (context.failedCases.includes(caseId)) {
      escalationDelta += PRESSURE_CALIBRATION.escalationLevelDelta.failed
    }
    if (context.partialCases.includes(caseId)) {
      escalationDelta += PRESSURE_CALIBRATION.escalationLevelDelta.partial
    }
    if (context.unresolvedTriggers.includes(caseId)) {
      escalationDelta += PRESSURE_CALIBRATION.escalationLevelDelta.unresolved
    }
    // Threat drift: increment if deadline expired or case unresolved
    let driftDelta = 0
    if (context.unresolvedTriggers.includes(caseId)) {
      driftDelta = PRESSURE_CALIBRATION.threatDriftDeltaPerUnresolved
    }
    // Time pressure: increment if deadlineRemaining <= 0 or case unresolved
    let pressureDelta = 0
    if (c.deadlineRemaining <= 0 || context.unresolvedTriggers.includes(caseId)) {
      pressureDelta = PRESSURE_CALIBRATION.timePressureDeltaPerUnresolved
    }
    const nextEscalationLevel = clamp(
      (c.escalationLevel ?? 0) + escalationDelta,
      0,
      PRESSURE_CALIBRATION.maxCaseEscalationLevel
    )
    const nextThreatDrift = clamp(
      (c.threatDrift ?? 0) + driftDelta,
      0,
      PRESSURE_CALIBRATION.maxCaseThreatDrift
    )
    const nextTimePressure = clamp(
      (c.timePressure ?? 0) + pressureDelta,
      0,
      PRESSURE_CALIBRATION.maxCaseTimePressure
    )
    context.nextState.cases[caseId] = {
      ...c,
      escalationLevel: nextEscalationLevel,
      threatDrift: nextThreatDrift,
      timePressure: nextTimePressure,
    }
    globalEscalationLevel += nextEscalationLevel
    globalThreatDrift += nextThreatDrift
    globalTimePressure += nextTimePressure
  }
  context.nextState.globalEscalationLevel = globalEscalationLevel
  context.nextState.globalThreatDrift = globalThreatDrift
  context.nextState.globalTimePressure = globalTimePressure
  // --- End deterministic escalation, drift, pressure logic ---

  const builtReport = buildReports(context)
  const agencyMetrics = updateAgencyMetrics(context, builtReport)

  return finalizeEvents(context, builtReport, {
    ...agencyMetrics,
    finalState: refreshContractBoard(agencyMetrics.finalState),
  })
}
