import type {
  MissionTriageCovertPrepSignals,
  MissionTriageIntakeSignals,
  MissionTriageModalitySignals,
  MissionTriageCloseoutRewardPayoutSignals,
  MissionTriageDeferralCompareView,
} from './caseListSignalTypes'
import type { CaseInstance, GameState, Team } from '../../domain/models'
import { isMissionTriageIgnoredThisWeek } from '../../domain/missionIntakeRouting'
import {
  getBestMajorIncidentPlanSuggestion,
  isOperationalMajorIncidentCase,
} from '../../domain/majorIncidentOperations'
import {
  buildResolutionPreviewState,
  previewResolutionForTeamIds,
  type OutcomeOdds,
} from '../../domain/sim/resolve'
import { isTeamBlockedByTraining } from '../../domain/sim/training'
import { getTeamAssignedCaseId } from '../../domain/teamSimulation'

export interface CaseTeamOddsView {
  team: Team
  odds: OutcomeOdds
  injuryChance: number
}

export interface CaseListItemView {
  currentCase: CaseInstance
  assignedTeams: Team[]
  availableTeams: CaseTeamOddsView[]
  bestSuccess: number
  isMajorIncident: boolean
  priorityScore: number
  maxTeams: number
  isUnassigned: boolean
  isCriticalStage: boolean
  hasDeadlineRisk: boolean
  isBlockedByRequiredRoles: boolean
  isBlockedByRequiredTags: boolean
  isRaidAtCapacity: boolean
  triageIgnored: boolean
  covertPrepSignals: MissionTriageCovertPrepSignals
  intakeSignals: MissionTriageIntakeSignals
  modalitySignals: MissionTriageModalitySignals
  closeoutRewardPayoutSignals: MissionTriageCloseoutRewardPayoutSignals
  deferralCompare: MissionTriageDeferralCompareView
}

export function getCaseListItemBaseView(
  currentCase: CaseInstance,
  game: GameState
): CaseListItemView {
  const previewState = buildResolutionPreviewState(game)
  const isMajorIncident = isOperationalMajorIncidentCase(currentCase)
  const assignedTeams = currentCase.assignedTeamIds
    .map((teamId) => game.teams[teamId])
    .filter((team): team is Team => Boolean(team))
  const maxTeams = currentCase.kind === 'raid' ? (currentCase.raid?.maxTeams ?? 2) : 1
  const isRaidAtCapacity = currentCase.kind === 'raid' && assignedTeams.length >= maxTeams
  const isUnassigned = assignedTeams.length === 0
  const isCriticalStage = currentCase.stage >= 4
  const hasDeadlineRisk = currentCase.deadlineRemaining <= 2
  const requiredRoles = currentCase.requiredRoles ?? []

  const availableTeams = isMajorIncident
    ? []
    : isRaidAtCapacity
      ? []
      : Object.values(game.teams)
          .filter((team) => isTeamAvailableForCase(team, currentCase, game))
          .map((team) => {
            const preview = previewResolutionForTeamIds(
              currentCase,
              previewState,
              currentCase.kind === 'raid' ? [...currentCase.assignedTeamIds, team.id] : [team.id]
            )

            return {
              team,
              odds: preview.odds,
              injuryChance: preview.injuryForecast.injuryChance,
            }
          })
          .filter(({ odds }) => !odds.blockedByRequiredTags && !odds.blockedByRequiredRoles)
          .sort(
            (left, right) =>
              right.odds.success - left.odds.success ||
              right.odds.partial - left.odds.partial ||
              left.injuryChance - right.injuryChance ||
              right.odds.chemistry - left.odds.chemistry ||
              left.team.name.localeCompare(right.team.name)
          )

  const eligibleTeams = Object.values(game.teams).filter(
    (team) =>
      (!getTeamAssignedCaseId(team) || getTeamAssignedCaseId(team) === currentCase.id) &&
      !isTeamBlockedByTraining(team, game.agents)
  )
  const isBlockedByRequiredTags =
    currentCase.requiredTags.length > 0 &&
    eligibleTeams.every(
      (team) =>
        previewResolutionForTeamIds(
          currentCase,
          previewState,
          currentCase.kind === 'raid' ? [...currentCase.assignedTeamIds, team.id] : [team.id]
        ).odds.blockedByRequiredTags
    )
  const isBlockedByRequiredRoles =
    requiredRoles.length > 0 &&
    eligibleTeams.every(
      (team) =>
        previewResolutionForTeamIds(
          currentCase,
          previewState,
          currentCase.kind === 'raid' ? [...currentCase.assignedTeamIds, team.id] : [team.id]
        ).odds.blockedByRequiredRoles
    )

  const assignedOdds =
    assignedTeams.length > 0
      ? previewResolutionForTeamIds(
          currentCase,
          previewState,
          currentCase.kind === 'raid'
            ? assignedTeams.map((team) => team.id)
            : [assignedTeams[0]!.id]
        ).odds
      : undefined

  const majorIncidentBestSuccess = isMajorIncident
    ? currentCase.majorIncident
      ? (getBestMajorIncidentPlanSuggestion(game, currentCase, {
          strategy: currentCase.majorIncident.strategy,
          provisions: currentCase.majorIncident.provisions,
        })?.successChance ?? 0)
      : (getBestMajorIncidentPlanSuggestion(game, currentCase)?.successChance ?? 0)
    : 0
  const bestSuccess = isMajorIncident
    ? majorIncidentBestSuccess
    : (assignedOdds?.success ??
      availableTeams.reduce((best, option) => Math.max(best, option.odds.success), 0))

  return {
    currentCase,
    assignedTeams,
    availableTeams,
    bestSuccess,
    isMajorIncident,
    priorityScore: getPriorityScore({
      currentCase,
      bestSuccess,
      isUnassigned,
      isCriticalStage,
      hasDeadlineRisk,
      isBlockedByRequiredRoles,
      isBlockedByRequiredTags,
      isRaidAtCapacity,
      triageIgnored: isMissionTriageIgnoredThisWeek(game, currentCase.id),
    }),
    maxTeams,
    isUnassigned,
    isCriticalStage,
    hasDeadlineRisk,
    isBlockedByRequiredRoles,
    isBlockedByRequiredTags,
    isRaidAtCapacity,
    triageIgnored: isMissionTriageIgnoredThisWeek(game, currentCase.id),
    covertPrepSignals: { visible: false, markers: [] },
    intakeSignals: { visible: false, markers: [] },
    modalitySignals: { visible: false, markers: [] },
    closeoutRewardPayoutSignals: { visible: false, markers: [] },
    deferralCompare: { visible: false, columns: [] },
  }
}

function isTeamAvailableForCase(team: Team, currentCase: CaseInstance, game: GameState) {
  if (getTeamAssignedCaseId(team)) {
    return false
  }

  if (isTeamBlockedByTraining(team, game.agents)) {
    return false
  }

  if (currentCase.kind === 'raid' && currentCase.assignedTeamIds.includes(team.id)) {
    return false
  }

  return true
}

function getPriorityScore(view: {
  currentCase: Pick<CaseInstance, 'status' | 'stage' | 'deadlineRemaining'>
  bestSuccess: number
  isUnassigned: boolean
  isCriticalStage: boolean
  hasDeadlineRisk: boolean
  isBlockedByRequiredRoles: boolean
  isBlockedByRequiredTags: boolean
  isRaidAtCapacity: boolean
  triageIgnored: boolean
}) {
  const base =
    view.currentCase.stage * 100 +
    Math.max(0, 10 - view.currentCase.deadlineRemaining) * 10 +
    (view.currentCase.status === 'open' ? 15 : 0)

  const urgency =
    (view.isUnassigned ? 20 : 0) +
    (view.isCriticalStage ? 25 : 0) +
    (view.hasDeadlineRisk ? 20 : 0) +
    (view.isBlockedByRequiredRoles ? 35 : 0) +
    (view.isBlockedByRequiredTags ? 30 : 0) +
    (view.isRaidAtCapacity ? 10 : 0)

  const successPenalty = Math.round(view.bestSuccess * 40)
  const resolvedPenalty = view.currentCase.status === 'resolved' ? 1000 : 0
  const ignoredPenalty = view.triageIgnored ? 500 : 0

  return base + urgency - successPenalty - resolvedPenalty - ignoredPenalty
}
