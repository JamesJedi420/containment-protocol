import { buildTeamDeploymentReadinessState } from './deploymentReadiness'
import type { CaseInstance, GameState, LeaderBonus, ResolutionOutcome } from './models'
import { buildFactionMissionContext } from './factions'
import { buildTeamCompositionProfile, getTeamMemberIds, getUniqueTeamMembers } from './teamSimulation'
import { buildTeamCohesionSummary } from './teamComposition'
import { buildAgentLoadoutReadinessSummary } from './equipment'
import { buildAgencyProtocolState } from './protocols'
import { computeTeamScore, computeRequiredScore } from './sim/scoring'
import { resolveWeakestLinkMission } from './weakestLinkResolution'
import { resolveMajorIncidentOutcome, buildMajorIncidentEffectiveCase, isOperationalMajorIncidentCase } from './majorIncidentOperations'
import { resolveRaid } from './sim/raid'
import { resolveCase } from './sim/resolve'

export interface WeeklyCaseResolutionStrategy {
  effectiveCase: CaseInstance
  assignedAgents: NonNullable<GameState['agents'][string]>[]
  assignedAgentLeaderBonuses: Record<string, LeaderBonus>
  activeTeamStressModifiers: Record<string, number>
  outcome: ResolutionOutcome
  weakestLinkResult?: import('./weakestLinkResolution').WeakestLinkMissionResolutionResult
}

type SeededRng = () => number

export function resolveAssignedCaseForWeek(
  currentCase: CaseInstance,
  state: GameState,
  rng: SeededRng,
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
  const assignedTeamLeaderBonuses = state.teams && state.agents
    ? Object.fromEntries(
        currentCase.assignedTeamIds
          .map((teamId) => {
            const team = state.teams[teamId]
            if (!team) return null
            return [teamId, buildTeamCompositionProfile(team, state.agents).leaderBonus] as const
          })
          .filter((entry): entry is readonly [string, LeaderBonus] => Boolean(entry))
      )
    : {}
  const assignedAgentLeaderBonuses = state.teams && state.agents
    ? Object.fromEntries(
        currentCase.assignedTeamIds.flatMap((teamId) => {
          const team = state.teams[teamId]
          const leaderBonus = assignedTeamLeaderBonuses[teamId]
          if (!team || !leaderBonus) return []
          return getTeamMemberIds(team).map((agentId) => [agentId, leaderBonus] as const)
        })
      )
    : {}
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
  let weakestLinkResult: import('./weakestLinkResolution').WeakestLinkMissionResolutionResult | undefined = undefined
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
