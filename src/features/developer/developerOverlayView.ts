import { buildDeveloperLogSnapshot } from '../../domain/developerLog'
import { listQueuedRuntimeEvents } from '../../domain/eventQueue'
import { buildFlagSystemSnapshot } from '../../domain/flagSystem'
import { readGameStateManager } from '../../domain/gameStateManager'
import type { GameFlagValue, GameState } from '../../domain/models'
import { buildAgentLoadoutReadinessSummary, listEquippedItemAssignments } from '../../domain/equipment'
import { listProgressClocks } from '../../domain/progressClocks'
import { buildRecruitmentFunnelSummary } from '../../domain/recruitment'
import { buildTrainingCertificationSummary } from '../../domain/sim/training'
import {
  buildTeamCompositionState,
  buildTeamWeakestLinkSummary,
  rankBestAvailableTeams,
} from '../../domain/teamComposition'
import { normalizeMissionRoutingState } from '../../domain/missionIntakeRouting'
import { analyzeRuntimeStability } from '../../domain/stabilityLayer'
import {
  explainDeploymentReadiness,
  explainMissionRouting,
  explainWeakestLinkResolution,
  explainWeeklyPressureState,
  type DeploymentReadinessExplanation,
  type RoutingExplanation,
  type WeakestLinkExplanation,
  type WeeklyPressureExplanation,
} from '../../domain/visibility'
import { getFrontDeskBriefingView } from '../operations/frontDeskView'

export const DEVELOPER_OVERLAY_FLAG = 'developerOverlay'

export interface DeveloperOverlaySnapshot {
  location: {
    hubId: string
    locationId?: string
    sceneId?: string
    updatedWeek: number
    facilities?: Array<{
      facilityId: string
      category: string
      level: number
      maxLevel?: number
      status: string
      upgradeInProgress?: boolean
      upgradeStartedWeek?: number
      upgradeCompleteWeek?: number
      effects: unknown
      requirements: unknown
      lastUpdatedWeek?: number
    }>
  }
  activeAuthoredContextId?: string
  persistentFlags: Array<{ id: string; value: GameFlagValue }>
  consumedOneShots: Array<{ id: string; source?: string; firstSeenWeek: number }>
  loadouts: {
    equippedAssignmentCount: number
    roleIncompatibleAgentCount: number
    readinessCounts: {
      ready: number
      partial: number
      blocked: number
    }
    agents: Array<{
      agentId: string
      role: string
      readiness: string
      equippedItemCount: number
      incompatibleItemCount: number
      issues: string[]
    }>
  }
  training: {
    inProgressCount: number
    blockedCount: number
    completedRecentlyCount: number
    certifiedCount: number
    expiredCount: number
    agents: Array<{
      agentId: string
      role: string
      trainingStatus: string
      assignedTrainingId?: string
      trainingQueuePosition?: number
      trainingPoints: number
      certifiedCount: number
      expiredCount: number
    }>
  }
  teamComposition: {
    teamCount: number
    validCount: number
    fragileCount: number
    bestAvailableTeamIds: string[]
    teams: Array<{
      teamId: string
      teamName: string
      category?: string
      compositionValid: boolean
      coveredRoles: string[]
      missingRoles: string[]
      cohesionScore: number
      cohesionBand: string
      weakestLinkPenalty: number
      weakestLinkCodes: string[]
      issues: string[]
    }>
  }
  deployment: {
    missionReadyCount: number
    conditionalCount: number
    blockedCount: number
    recoveryRequiredCount: number
    teams: Array<{
      teamId: string
      readinessCategory: string
      readinessScore: number
      hardBlockers: string[]
      softRisks: string[]
      estimatedDeployWeeks: number
      estimatedRecoveryWeeks: number
      explanation: DeploymentReadinessExplanation
    }>
  }
  missions: {
    missionCount: number
    criticalCount: number
    blockedCount: number
    queuedCount: number
    shortlistedCount: number
    assignedCount: number
    topMissionIds: string[]
    entries: Array<{
      missionId: string
      category: string
      kind: string
      status: string
      priority: string
      triageScore: number
      routingState: string
      routingBlockers: string[]
      candidateTeamIds: string[]
      expectedTotalWeeks?: number
      explanation: RoutingExplanation
    }>
  }
  pressure: WeeklyPressureExplanation
  weakestLinks: WeakestLinkExplanation[]
  recruitmentFunnel: {
    totalCandidates: number
    stageCounts: {
      prospect: number
      contacted: number
      screening: number
      hired: number
      lost: number
    }
    candidates: Array<{
      id: string
      name: string
      stage: string
      roleInclination?: string
      expiryWeek: number
    }>
  }
  progressClocks: Array<{
    id: string
    label: string
    value: number
    max: number
    hidden: boolean
    completedAtWeek?: number
  }>
  encounters: Array<{
    id: string
    status: string
    phase?: string
    startedWeek?: number
    resolvedWeek?: number
    latestOutcome?: string
    lastResolutionId?: string
    followUpIds: string[]
    hiddenModifierCount: number
    revealedModifierCount: number
    activeFlags: string[]
    lastUpdatedWeek: number
  }>
  routedContent: {
    directorMessageRouteId?: string
    noticeRouteIds: string[]
    choiceIds: string[]
  }
  choiceDebug: {
    lastChoiceId?: string
    lastNextTargetId?: string
    lastFollowUpIds: string[]
    updatedWeek?: number
  }
  queuedEvents: Array<{
    id: string
    type: string
    targetId: string
    contextId?: string
    source?: string
    week?: number
  }>
  developerLog: Array<{
    id: string
    week: number
    type: string
    summary: string
    contextId?: string
    details: string[]
  }>
  stability: {
    issueCount: number
    errorCount: number
    warningCount: number
    softlockRisk: boolean
    categories: string[]
    recoveryActions: Array<{
      id: string
      label: string
      mutating: boolean
    }>
    topIssues: Array<{
      id: string
      category: string
      severity: string
      summary: string
    }>
  }
  agentRecoveryDebug: Array<{
    agentId: string
    name: string
    recoveryStatus: unknown
    trauma: unknown
    downtimeActivity: unknown
    fatigue: number
    status: string
  }>
}

/**
 * Pure, deterministic developer snapshot builder for inspecting authored state.
 * This reuses the canonical runtime/flag/view helpers instead of duplicating
 * logic inside the overlay component.
 */
export function buildDeveloperOverlaySnapshot(game: GameState): DeveloperOverlaySnapshot {
    // Facility debug/inspection summary
    const facilityDebug = game.facilityState
      ? Object.values(game.facilityState.facilities).map(facility => ({
          facilityId: facility.facilityId,
          category: facility.category,
          level: facility.level,
          maxLevel: facility.maxLevel,
          status: facility.status,
          upgradeInProgress: facility.upgradeInProgress,
          upgradeStartedWeek: facility.upgradeStartedWeek,
          upgradeCompleteWeek: facility.upgradeCompleteWeek,
          effects: facility.effects,
          requirements: facility.requirements,
          lastUpdatedWeek: facility.lastUpdatedWeek,
        }))
      : []
  const runtime = readGameStateManager(game)
  const flagSnapshot = buildFlagSystemSnapshot(game)
  const developerLog = buildDeveloperLogSnapshot(game, 30)
  const queuedEvents = listQueuedRuntimeEvents(game)
  const frontDesk = getFrontDeskBriefingView(game)
  const progressClocks = listProgressClocks(game)
  const loadoutReadiness = Object.values(game.agents)
    .map((agent) => buildAgentLoadoutReadinessSummary(agent, { state: game }))
    .sort((left, right) => left.agentId.localeCompare(right.agentId))
  const equippedAssignments = listEquippedItemAssignments(game.agents)
  const trainingSummaries = Object.values(game.agents)
    .map((agent) => buildTrainingCertificationSummary(agent, game.week))
    .sort((left, right) => left.agentId.localeCompare(right.agentId))
  const recruitmentFunnel = buildRecruitmentFunnelSummary(game)
  const teamCompositionSummaries = Object.values(game.teams)
    .map((team) => {
      const composition = buildTeamCompositionState(team, game.agents, game.teams)
      const weakestLink = buildTeamWeakestLinkSummary(team, game.agents)
      return {
        teamId: team.id,
        teamName: team.name,
        composition,
        weakestLink,
      }
    })
    .sort((left, right) => left.teamId.localeCompare(right.teamId))
  const deploymentSummaries = Object.values(game.teams)
    .map((team) => ({
      teamId: team.id,
      readiness: team.deploymentReadinessState,
    }))
    .sort((left, right) => left.teamId.localeCompare(right.teamId))
  const bestTeams = rankBestAvailableTeams(
    Object.values(game.teams),
    game.agents,
    game.teams
  ).slice(0, 3)
  const missionRouting = normalizeMissionRoutingState(game)
  const missionEntries = missionRouting.orderedMissionIds
    .map((missionId) => missionRouting.missions[missionId])
    .filter((mission): mission is NonNullable<typeof missionRouting.missions[string]> => Boolean(mission))
  const stability = analyzeRuntimeStability(game)
  const pressure = explainWeeklyPressureState(game)
  const latestWeakestLinks = Object.values(game.reports.at(-1)?.caseSnapshots ?? {})
    .filter((snapshot) => snapshot.missionResult?.weakestLink)
    .sort((left, right) => left.caseId.localeCompare(right.caseId))
    .slice(0, 8)
    .map((snapshot) =>
      explainWeakestLinkResolution(snapshot.missionResult!.weakestLink!, {
        relatedIds: snapshot.missionResult?.teamsUsed.map((usage) => usage.teamId),
      })
    )

  // Add agent recovery/trauma/downtime debug summary
  const agentRecoveryDebug = Object.values(game.agents).map(agent => ({
    agentId: agent.id,
    name: agent.name,
    recoveryStatus: agent.recoveryStatus ?? null,
    trauma: agent.trauma ?? null,
    downtimeActivity: agent.downtimeActivity ?? null,
    fatigue: agent.fatigue,
    status: agent.status,
  }))

  return {
    location: {
      ...runtime.currentLocation,
      facilities: facilityDebug,
    },
    ...(runtime.ui.authoring?.activeContextId
      ? { activeAuthoredContextId: runtime.ui.authoring.activeContextId }
      : {}),
    persistentFlags: Object.entries(flagSnapshot.persistentFlags)
      .map(([id, value]) => ({ id, value }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    consumedOneShots: Object.entries(flagSnapshot.consumedOneShots)
      .map(([id, record]) => ({
        id,
        ...(record.source ? { source: record.source } : {}),
        firstSeenWeek: record.firstSeenWeek,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    loadouts: {
      equippedAssignmentCount: equippedAssignments.length,
      roleIncompatibleAgentCount: loadoutReadiness.filter(
        (summary) => summary.incompatibleItemCount > 0
      ).length,
      readinessCounts: {
        ready: loadoutReadiness.filter((summary) => summary.readiness === 'ready').length,
        partial: loadoutReadiness.filter((summary) => summary.readiness === 'partial').length,
        blocked: loadoutReadiness.filter((summary) => summary.readiness === 'blocked').length,
      },
      agents: loadoutReadiness.map((summary) => ({
        agentId: summary.agentId,
        role: summary.role,
        readiness: summary.readiness,
        equippedItemCount: summary.equippedItemCount,
        incompatibleItemCount: summary.incompatibleItemCount,
        issues: [...summary.issues],
      })),
    },
    training: {
      inProgressCount: trainingSummaries.filter(
        (summary) => summary.trainingStatus === 'in_progress'
      ).length,
      blockedCount: trainingSummaries.filter((summary) => summary.trainingStatus === 'blocked')
        .length,
      completedRecentlyCount: trainingSummaries.filter(
        (summary) => summary.trainingStatus === 'completed_recently'
      ).length,
      certifiedCount: trainingSummaries.reduce(
        (sum, summary) =>
          sum + summary.certifications.filter((certification) => certification.state === 'certified').length,
        0
      ),
      expiredCount: trainingSummaries.reduce(
        (sum, summary) =>
          sum + summary.certifications.filter((certification) => certification.state === 'expired').length,
        0
      ),
      agents: trainingSummaries.map((summary) => ({
        agentId: summary.agentId,
        role: summary.currentRole,
        trainingStatus: summary.trainingStatus,
        ...(summary.assignedTrainingId ? { assignedTrainingId: summary.assignedTrainingId } : {}),
        ...(typeof summary.trainingQueuePosition === 'number'
          ? { trainingQueuePosition: summary.trainingQueuePosition }
          : {}),
        trainingPoints: summary.trainingPoints,
        certifiedCount: summary.certifications.filter(
          (certification) => certification.state === 'certified'
        ).length,
        expiredCount: summary.certifications.filter((certification) => certification.state === 'expired')
          .length,
      })),
    },
    teamComposition: {
      teamCount: teamCompositionSummaries.length,
      validCount: teamCompositionSummaries.filter((summary) => summary.composition.compositionValid)
        .length,
      fragileCount: teamCompositionSummaries.filter(
        (summary) => summary.composition.cohesion.cohesionBand === 'fragile'
      ).length,
      bestAvailableTeamIds: bestTeams.map((summary) => summary.teamId),
      teams: teamCompositionSummaries.map((summary) => ({
        teamId: summary.teamId,
        teamName: summary.teamName,
        ...(summary.composition.category ? { category: summary.composition.category } : {}),
        compositionValid: summary.composition.compositionValid,
        coveredRoles: [...summary.composition.coveredRoles],
        missingRoles: [...summary.composition.missingRoles],
        cohesionScore: summary.composition.cohesion.cohesionScore,
        cohesionBand: summary.composition.cohesion.cohesionBand,
        weakestLinkPenalty: summary.weakestLink.totalPenalty,
        weakestLinkCodes: summary.weakestLink.penalties.map((penalty) => penalty.code),
        issues: summary.composition.validationIssues.map((issue) => issue.code),
      })),
    },
    deployment: {
      missionReadyCount: deploymentSummaries.filter(
        (summary) => summary.readiness?.readinessCategory === 'mission_ready'
      ).length,
      conditionalCount: deploymentSummaries.filter(
        (summary) => summary.readiness?.readinessCategory === 'conditional'
      ).length,
      blockedCount: deploymentSummaries.filter(
        (summary) =>
          summary.readiness?.readinessCategory === 'temporarily_blocked' ||
          summary.readiness?.readinessCategory === 'hard_blocked'
      ).length,
      recoveryRequiredCount: deploymentSummaries.filter(
        (summary) => summary.readiness?.readinessCategory === 'recovery_required'
      ).length,
      teams: deploymentSummaries.map((summary) => ({
        teamId: summary.teamId,
        readinessCategory: summary.readiness?.readinessCategory ?? 'hard_blocked',
        readinessScore: summary.readiness?.readinessScore ?? 0,
        hardBlockers: [...(summary.readiness?.hardBlockers ?? [])],
        softRisks: [...(summary.readiness?.softRisks ?? [])],
        estimatedDeployWeeks: summary.readiness?.estimatedDeployWeeks ?? 0,
        estimatedRecoveryWeeks: summary.readiness?.estimatedRecoveryWeeks ?? 0,
        explanation: explainDeploymentReadiness(game, summary.teamId),
      })),
    },
    missions: {
      missionCount: missionEntries.length,
      criticalCount: missionEntries.filter((entry) => entry.priority === 'critical').length,
      blockedCount: missionEntries.filter((entry) => entry.routingState === 'blocked').length,
      queuedCount: missionEntries.filter((entry) => entry.routingState === 'queued').length,
      shortlistedCount: missionEntries.filter((entry) => entry.routingState === 'shortlisted').length,
      assignedCount: missionEntries.filter((entry) => entry.routingState === 'assigned').length,
      topMissionIds: missionEntries
        .slice()
        .sort((left, right) => right.triageScore - left.triageScore || left.missionId.localeCompare(right.missionId))
        .slice(0, 3)
        .map((entry) => entry.missionId),
      entries: missionEntries.map((entry) => ({
        missionId: entry.missionId,
        category: entry.category,
        kind: entry.kind,
        status: entry.status,
        priority: entry.priority,
        triageScore: entry.triageScore,
        routingState: entry.routingState,
        routingBlockers: [...entry.routingBlockers],
        candidateTeamIds: [...entry.lastCandidateTeamIds],
        ...(entry.timeCostSummary
          ? { expectedTotalWeeks: entry.timeCostSummary.expectedTotalWeeks }
          : {}),
        explanation: explainMissionRouting(game, entry.missionId),
      })),
    },
    pressure,
    weakestLinks: latestWeakestLinks,
    recruitmentFunnel: {
      totalCandidates: recruitmentFunnel.totalCandidates,
      stageCounts: { ...recruitmentFunnel.stageCounts },
      candidates: recruitmentFunnel.candidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        stage: candidate.stage,
        ...(candidate.roleInclination ? { roleInclination: candidate.roleInclination } : {}),
        expiryWeek: candidate.expiryWeek,
      })),
    },
    progressClocks: progressClocks.map((clock) => ({
      id: clock.id,
      label: clock.label,
      value: clock.value,
      max: clock.max,
      hidden: clock.visibility === 'hidden',
      ...(clock.completedAtWeek ? { completedAtWeek: clock.completedAtWeek } : {}),
    })),
    encounters: Object.values(runtime.encounterState)
      .map((encounter) => ({
        id: encounter.encounterId,
        status: encounter.status,
        ...(encounter.phase ? { phase: encounter.phase } : {}),
        ...(typeof encounter.startedWeek === 'number' ? { startedWeek: encounter.startedWeek } : {}),
        ...(typeof encounter.resolvedWeek === 'number'
          ? { resolvedWeek: encounter.resolvedWeek }
          : {}),
        ...(encounter.latestOutcome ? { latestOutcome: encounter.latestOutcome } : {}),
        ...(encounter.lastResolutionId ? { lastResolutionId: encounter.lastResolutionId } : {}),
        followUpIds: [...(encounter.followUpIds ?? [])],
        hiddenModifierCount: encounter.hiddenModifierIds.length,
        revealedModifierCount: encounter.revealedModifierIds.length,
        activeFlags: Object.entries(encounter.flags)
          .filter(([, enabled]) => enabled)
          .map(([flagId]) => flagId)
          .sort((left, right) => left.localeCompare(right)),
        lastUpdatedWeek: encounter.lastUpdatedWeek,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    routedContent: {
      ...(frontDesk.debug.directorMessageRouteId
        ? { directorMessageRouteId: frontDesk.debug.directorMessageRouteId }
        : {}),
      noticeRouteIds: [...frontDesk.debug.noticeRouteIds],
      choiceIds: [...frontDesk.debug.choiceIds],
    },
    choiceDebug: {
      ...(runtime.ui.authoring?.lastChoiceId
        ? { lastChoiceId: runtime.ui.authoring.lastChoiceId }
        : {}),
      ...(runtime.ui.authoring?.lastNextTargetId
        ? { lastNextTargetId: runtime.ui.authoring.lastNextTargetId }
        : {}),
      lastFollowUpIds: [...(runtime.ui.authoring?.lastFollowUpIds ?? [])],
      ...(runtime.ui.authoring?.updatedWeek
        ? { updatedWeek: runtime.ui.authoring.updatedWeek }
        : {}),
    },
    queuedEvents: queuedEvents.map((event) => ({
      id: event.id,
      type: event.type,
      targetId: event.targetId,
      ...(event.contextId ? { contextId: event.contextId } : {}),
      ...(event.source ? { source: event.source } : {}),
      ...(typeof event.week === 'number' ? { week: event.week } : {}),
    })),
    developerLog: developerLog.entries.map((entry) => ({
      id: entry.id,
      week: entry.week,
      type: entry.type,
      summary: entry.summary,
      ...(entry.contextId ? { contextId: entry.contextId } : {}),
      details: Object.entries(entry.details ?? {}).map(([detailId, detailValue]) =>
        `${detailId}: ${Array.isArray(detailValue) ? detailValue.join(', ') : String(detailValue)}`
      ),
    })),
    stability: {
      issueCount: stability.summary.issueCount,
      errorCount: stability.summary.errorCount,
      warningCount: stability.summary.warningCount,
      softlockRisk: stability.summary.softlockRisk,
      categories: [...stability.summary.categories],
      recoveryActions: stability.recoveryActions.map((action) => ({
        id: action.id,
        label: action.label,
        mutating: action.mutating,
      })),
      topIssues: stability.issues.slice(0, 8).map((issue) => ({
        id: issue.id,
        category: issue.category,
        severity: issue.severity,
        summary: issue.summary,
      })),
    },
    agentRecoveryDebug,
  }
}
