import {
  type ActiveContractRuntime,
  type Agent,
  type CaseInstance,
  type ContractRequirements,
  type GameConfig,
  type GameState,
  type Id,
  type ResolutionOutcome,
  type Team,
  type ValidationResult,
} from '../models'
import { clamp } from '../math'
import { previewResolutionPartyCards } from '../partyCards/engine'
import { buildAgencyProtocolState } from '../protocols'
import { buildFactionMissionContext } from '../factions'
import { evaluateContractRoleFit } from '../contractsRuntime'
import {
  buildAggregatedLeaderBonus,
  createDefaultPerformanceMetricSummary,
  getTeamAssignedCaseId,
  getTeamMemberIds,
  getUniqueTeamMembers,
} from '../teamSimulation'
import {
  createDefaultCaseEquipmentSummary,
  evaluateCaseResolutionContext,
  type TeamScoreContext,
} from './scoring'
import {
  buildMissionInjuryForecast,
  type MissionInjuryForecast,
} from './injuryForecast'
import { isTeamBlockedByTraining } from './training'
import type { CaseReconSummary } from '../recon'

const MIN_SUCCESS_CHANCE = 0.05
const MAX_SUCCESS_CHANCE = 0.95
const NEAR_MISS_PARTIAL_CHANCE = 0.7

function getSupportTags(state: GameState, teamIds: Id[]) {
  return [...new Set(teamIds.flatMap((teamId) => state.teams[teamId]?.tags ?? []))]
}

function buildBlockedOdds(
  blockedByRequiredTags: boolean,
  blockedByRequiredRoles: boolean
): OutcomeOdds {
  return {
    chemistry: 0,
    success: 0,
    partial: 0,
    fail: 1,
    blockedByRequiredTags,
    blockedByRequiredRoles,
  }
}

function hasContractRoleFitInput(
  contract: CaseInstance['contract']
): contract is Pick<ActiveContractRuntime, 'requirements' | 'modifiers'> | {
  requirements: ContractRequirements
  modifiers?: ActiveContractRuntime['modifiers']
} {
  const requirements = (contract as { requirements?: ContractRequirements } | undefined)?.requirements
  return (
    Array.isArray(requirements?.recommendedClasses) &&
    Array.isArray(requirements?.discouragedClasses)
  )
}

function buildTeamScoreContextForTeamIds(
  c: CaseInstance,
  state: GameState,
  teamIds: Id[]
): { teamIds: Id[]; agents: Agent[]; context: TeamScoreContext } {
  const normalizedTeamIds = [...new Set(teamIds)].filter((teamId) => Boolean(state.teams[teamId]))
  const teams = normalizedTeamIds.map((teamId) => state.teams[teamId]).filter(Boolean)
  const agents = getUniqueTeamMembers(normalizedTeamIds, state.teams, state.agents)

  const coordination =
    c.kind === 'raid' && normalizedTeamIds.length > 1
      ? getRaidCoordinationAdjustment(normalizedTeamIds.length, state.config)
      : undefined
  const partyCardBonus =
    c.kind === 'raid'
      ? null
      : state.partyCards
        ? previewResolutionPartyCards(state.partyCards, {
            caseId: c.id,
            caseTags: c.tags,
            teamIds: normalizedTeamIds,
          })
        : null
  const partyCardReason =
    partyCardBonus && partyCardBonus.scoreAdjustment !== 0
      ? [`Party cards: ${partyCardBonus.scoreAdjustment.toFixed(1)}`]
      : undefined
  const factionContext = buildFactionMissionContext(c, state)
  const contractFit =
    c.contract && hasContractRoleFitInput(c.contract) ? evaluateContractRoleFit(c.contract, agents) : null

  return {
    teamIds: normalizedTeamIds,
    agents,
    context: {
      inventory: state.inventory,
      supportTags: getSupportTags(state, normalizedTeamIds),
      preflight: {
        selectedTeamCount: normalizedTeamIds.length,
        minTeamCount: c.kind === 'raid' ? (c.raid?.minTeams ?? 2) : undefined,
      },
      leaderId:
        normalizedTeamIds.length === 1
          ? (state.teams[normalizedTeamIds[0]]?.leaderId ?? null)
          : null,
      scoreAdjustment:
        (coordination?.scoreAdjustment ?? 0) +
        factionContext.scoreAdjustment +
        (contractFit?.scoreAdjustment ?? 0),
      scoreAdjustmentReason: [coordination?.reason, ...factionContext.reasons, ...(contractFit?.reasons ?? [])]
        .filter(Boolean)
        .join(' / '),
      partyCardScoreBonus: partyCardBonus?.scoreAdjustment,
      partyCardReasons: partyCardReason,
      protocolState: buildAgencyProtocolState(state),
      leaderBonusOverride:
        normalizedTeamIds.length > 1 && teams.some((team) => getTeamMemberIds(team).length > 1)
          ? buildAggregatedLeaderBonus(teams, state.agents)
          : undefined,
    },
  }
}

function buildOddsFromEvaluation(
  evaluation: ReturnType<typeof evaluateCaseResolutionContext>
): OutcomeOdds {
  if (!evaluation.teamScore || evaluation.requiredScore === null) {
    return buildBlockedOdds(evaluation.blockedByRequiredTags, evaluation.blockedByRequiredRoles)
  }

  const chemistry =
    evaluation.requiredScore <= 0
      ? 1
      : clamp(evaluation.teamScore.score / evaluation.requiredScore, 0, 2)

  if (evaluation.successChance !== null) {
    const chance = clamp(evaluation.successChance, MIN_SUCCESS_CHANCE, MAX_SUCCESS_CHANCE)

    return {
      chemistry,
      success: chance,
      partial: chance >= NEAR_MISS_PARTIAL_CHANCE ? 1 - chance : 0,
      fail: chance >= NEAR_MISS_PARTIAL_CHANCE ? 0 : 1 - chance,
      blockedByRequiredTags: evaluation.blockedByRequiredTags,
      blockedByRequiredRoles: evaluation.blockedByRequiredRoles,
    }
  }

  const deterministicOdds = getDeterministicOdds(evaluation.outcome.result)

  return {
    chemistry,
    ...deterministicOdds,
    blockedByRequiredTags: evaluation.blockedByRequiredTags,
    blockedByRequiredRoles: evaluation.blockedByRequiredRoles,
  }
}

function getDeterministicOdds(result: ResolutionOutcome['result']) {
  if (result === 'success') {
    return { success: 1, partial: 0, fail: 0 }
  }

  if (result === 'partial') {
    return { success: 0, partial: 1, fail: 0 }
  }

  return { success: 0, partial: 0, fail: 1 }
}

function evaluateResolution(
  c: CaseInstance,
  agents: Agent[],
  config: GameConfig,
  context: TeamScoreContext,
  resolutionRoll?: number
) {
  return evaluateCaseResolutionContext({
    caseData: c,
    agents,
    config,
    context,
    resolutionRoll,
  })
}

export function getRaidCoordinationAdjustment(teamCount: number, config: GameConfig) {
  const extraTeams = Math.max(0, teamCount - 1)
  const penalty = clamp(extraTeams * config.raidCoordinationPenaltyPerExtraTeam, 0, 0.35)

  return {
    penalty,
    scoreAdjustment: -(penalty * 10),
    reason: `Raid coordination penalty: -${(penalty * 100).toFixed(0)}%`,
  }
}

export interface OutcomeOdds {
  chemistry: number
  success: number
  partial: number
  fail: number
  blockedByRequiredTags: boolean
  blockedByRequiredRoles: boolean
}

export interface ResolutionPreview {
  teamIds: Id[]
  deployableAgentIds: Id[]
  validation: ValidationResult | null
  odds: OutcomeOdds
  injuryForecast: MissionInjuryForecast
  performanceSummary: NonNullable<ReturnType<typeof createDefaultPerformanceMetricSummary>>
  equipmentSummary: ReturnType<typeof createDefaultCaseEquipmentSummary>
  reconSummary?: CaseReconSummary
}

export type ResolutionPreviewState = GameState

export function buildResolutionPreviewState(state: GameState): ResolutionPreviewState {
  return state
}

export type CaseOutcomePreviewBlockReason =
  | 'resolved'
  | 'already-committed'
  | 'case-capacity'
  | 'raid-capacity'
  | 'training'
  | 'no-active-members'
  | 'missing-required-roles'
  | 'missing-required-tags'

export interface CaseOutcomePreview {
  teamIds: Id[]
  preview: ResolutionPreview | null
  odds: OutcomeOdds | null
  blockedReason?: CaseOutcomePreviewBlockReason
  blockedDetail?: string
}

export function previewResolutionForTeamIds(
  c: CaseInstance,
  state: GameState,
  teamIds: Id[]
): ResolutionPreview {
  const selection = buildTeamScoreContextForTeamIds(c, state, teamIds)
  const evaluation = evaluateCaseResolutionContext({
    caseData: c,
    agents: selection.agents,
    config: state.config,
    context: selection.context,
  })

  return {
    teamIds: selection.teamIds,
    deployableAgentIds: evaluation.deployableAgents.map((agent) => agent.id),
    validation: evaluation.validationResult,
    odds: buildOddsFromEvaluation(evaluation),
    injuryForecast: buildMissionInjuryForecast({
      currentCase: c,
      agents: evaluation.deployableAgents,
      successChance:
        evaluation.successChance ??
        (evaluation.outcome.result === 'success'
          ? 1
          : evaluation.outcome.result === 'partial'
            ? NEAR_MISS_PARTIAL_CHANCE
            : 0),
      performanceSummary:
        evaluation.teamScore?.performanceSummary ?? createDefaultPerformanceMetricSummary(),
      agentPerformance: evaluation.teamScore?.agentPerformance,
      comparison: evaluation.teamScore?.comparison,
    }),
    performanceSummary:
      evaluation.teamScore?.performanceSummary ?? createDefaultPerformanceMetricSummary(),
    equipmentSummary: evaluation.teamScore?.equipmentSummary ?? createDefaultCaseEquipmentSummary(),
    reconSummary: evaluation.teamScore?.reconSummary,
  }
}

export function previewCaseOutcome(
  team: Team,
  c: CaseInstance,
  state: GameState
): CaseOutcomePreview {
  const assignedCaseId = getTeamAssignedCaseId(team)

  if (assignedCaseId && assignedCaseId !== c.id) {
    return {
      teamIds: [],
      preview: null,
      odds: null,
      blockedReason: 'already-committed',
      blockedDetail: `Already committed to ${state.cases[assignedCaseId]?.title ?? 'another case'}.`,
    }
  }

  if (c.status === 'resolved') {
    return {
      teamIds: [],
      preview: null,
      odds: null,
      blockedReason: 'resolved',
      blockedDetail: 'Resolved cases do not accept new assignments.',
    }
  }

  const maxTeams = c.kind === 'raid' ? (c.raid?.maxTeams ?? 2) : 1

  if (c.assignedTeamIds.length >= maxTeams && !c.assignedTeamIds.includes(team.id)) {
    return {
      teamIds: [],
      preview: null,
      odds: null,
      blockedReason: c.kind === 'raid' ? 'raid-capacity' : 'case-capacity',
      blockedDetail:
        c.kind === 'raid'
          ? `Raid is already at capacity with ${c.assignedTeamIds.length} team${
              c.assignedTeamIds.length === 1 ? '' : 's'
            }.`
          : 'This case already has an assigned team.',
    }
  }

  if (isTeamBlockedByTraining(team, state.agents)) {
    const trainingAgents = getTeamMemberIds(team)
      .map((agentId) => state.agents[agentId])
      .filter((agent) => agent?.assignment?.state === 'training')
      .map((agent) => agent?.name)
      .filter((agentName): agentName is string => Boolean(agentName))

    return {
      teamIds: [],
      preview: null,
      odds: null,
      blockedReason: 'training',
      blockedDetail:
        trainingAgents.length > 0
          ? `Training in progress: ${trainingAgents.join(', ')}.`
          : 'Training in progress.',
    }
  }

  const teamIds = c.kind === 'raid' ? [...new Set([...c.assignedTeamIds, team.id])] : [team.id]
  const preview = previewResolutionForTeamIds(c, state, teamIds)
  const validation = preview.validation

  if (validation?.issues.some((issue) => issue.code === 'no-active-members')) {
    return {
      teamIds,
      preview,
      odds: preview.odds,
      blockedReason: 'no-active-members',
      blockedDetail: 'No active members are available for deployment.',
    }
  }

  if ((validation?.missingRoles.length ?? 0) > 0 || preview.odds.blockedByRequiredRoles) {
    return {
      teamIds,
      preview,
      odds: preview.odds,
      blockedReason: 'missing-required-roles',
      blockedDetail: `Missing required roles: ${validation?.missingRoles.join(', ') ?? ''}.`,
    }
  }

  if ((validation?.missingTags.length ?? 0) > 0 || preview.odds.blockedByRequiredTags) {
    return {
      teamIds,
      preview,
      odds: preview.odds,
      blockedReason: 'missing-required-tags',
      blockedDetail: `Missing required tags: ${validation?.missingTags.join(', ') ?? ''}.`,
    }
  }

  return {
    teamIds,
    preview,
    odds: preview.odds,
  }
}

/**
 * Resolve a case in threshold mode using the canonical evaluation path.
 */
export function resolveThreshold(
  c: CaseInstance,
  agents: Agent[],
  config: GameConfig,
  context: TeamScoreContext = {}
): ResolutionOutcome {
  return evaluateResolution(c, agents, config, context).outcome
}

/**
 * Resolve a case in probability mode using the canonical evaluation path.
 */
export function resolveProbability(
  c: CaseInstance,
  agents: Agent[],
  config: GameConfig,
  rng: () => number,
  context: TeamScoreContext = {}
): ResolutionOutcome {
  return evaluateResolution(c, agents, config, context, rng()).outcome
}

/**
 * Deterministic mode currently uses threshold grading through the same evaluator.
 */
export function resolveDeterministic(
  c: CaseInstance,
  agents: Agent[],
  config: GameConfig,
  context: TeamScoreContext = {}
): ResolutionOutcome {
  return evaluateResolution(c, agents, config, context).outcome
}

/**
 * Resolve a case by dispatching to its configured mode.
 * Output is a deterministic/probabilistic summary for reporting and state updates only.
 */
export function resolveCase(
  c: CaseInstance,
  agents: Agent[],
  config: GameConfig,
  rng: () => number,
  context: TeamScoreContext = {}
): ResolutionOutcome {
  switch (c.mode) {
    case 'threshold':
      return resolveThreshold(c, agents, config, context)
    case 'probability':
      return resolveProbability(c, agents, config, rng, context)
    default:
      return resolveDeterministic(c, agents, config, context)
  }
}

export function estimateOutcomeOdds(c: CaseInstance, state: GameState, teamIds: Id[]): OutcomeOdds {
  return previewResolutionForTeamIds(c, state, teamIds).odds
}

export function previewResolutionForTeamIdsFromPreview(
  c: CaseInstance,
  previewState: ResolutionPreviewState,
  teamIds: Id[]
): ResolutionPreview {
  return previewResolutionForTeamIds(c, previewState, teamIds)
}

export function previewCaseOutcomeFromPreview(
  team: Team,
  c: CaseInstance,
  previewState: ResolutionPreviewState
): CaseOutcomePreview {
  return previewCaseOutcome(team, c, previewState)
}

export function estimateOutcomeOddsFromPreview(
  c: CaseInstance,
  previewState: ResolutionPreviewState,
  teamIds: Id[]
): OutcomeOdds {
  return estimateOutcomeOdds(c, previewState, teamIds)
}
