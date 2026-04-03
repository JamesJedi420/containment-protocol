import { appendOperationEventDrafts, type AnyOperationEventDraft, createAssignmentTeamAssignedDraft, createAssignmentTeamUnassignedDraft } from '../events'
import { type GameState, type Id } from '../models'
import {
  ensureNormalizedGameState,
  getTeamAssignedCaseId,
  normalizeGameState,
} from '../teamSimulation'
import { validateTeam, validateTeamIds } from '../validateTeam'
import { assignActiveAgentsToTeam, releaseAssignedAgentsFromTeams } from './agentAssignments'
import { releaseTeamsFromCases } from './teamRelease'

function filterExistingTeamIds(teamIds: Id[], teams: GameState['teams']) {
  return [...new Set(teamIds.filter((currentTeamId) => Boolean(teams[currentTeamId])))]
}

/**
 * Assign a team to a case. Standard cases accept one team, raids can accept several.
 */
export function assignTeam(state: GameState, caseId: Id, teamId: Id): GameState {
  const currentCase = state.cases[caseId]
  const team = state.teams[teamId]
  const existingAssignedTeamIds = currentCase
    ? filterExistingTeamIds(currentCase.assignedTeamIds, state.teams)
    : []
  const teamValidation = team ? validateTeam(team, {}, state.agents) : undefined
  const teamAssignedCaseId = team ? getTeamAssignedCaseId(team) : null

  if (
    !currentCase ||
    !team ||
    currentCase.status === 'resolved' ||
    !teamValidation ||
    !teamValidation.valid
  ) {
    return ensureNormalizedGameState(state)
  }

  if (teamAssignedCaseId && teamAssignedCaseId !== caseId) {
    return ensureNormalizedGameState(state)
  }

  const maxTeams = currentCase.kind === 'raid' ? (currentCase.raid?.maxTeams ?? 2) : 1

  if (
    currentCase.kind === 'raid' &&
    existingAssignedTeamIds.length >= maxTeams &&
    !existingAssignedTeamIds.includes(teamId)
  ) {
    return ensureNormalizedGameState(state)
  }

  const candidateTeamIds =
    currentCase.kind === 'raid' ? [...new Set([...existingAssignedTeamIds, teamId])] : [teamId]
  const assignmentValidation = validateTeamIds(
    candidateTeamIds,
    currentCase,
    state.teams,
    state.agents
  )

  if (!assignmentValidation.valid) {
    return ensureNormalizedGameState(state)
  }

  const normalizedState = ensureNormalizedGameState(state)
  const normalizedCase = normalizedState.cases[caseId]
  const normalizedTeam = normalizedState.teams[teamId]
  const normalizedExistingAssignedTeamIds = filterExistingTeamIds(
    normalizedCase.assignedTeamIds,
    normalizedState.teams
  )

  const baseAssignedTeamIds =
    normalizedCase.kind === 'raid'
      ? normalizedExistingAssignedTeamIds
      : normalizedExistingAssignedTeamIds.filter((assignedTeamId) => assignedTeamId === teamId)
  const nextAssignedTeamIds = [...new Set([...baseAssignedTeamIds, teamId])].slice(0, maxTeams)
  const replacedTeamIds =
    normalizedCase.kind === 'raid'
      ? []
      : normalizedExistingAssignedTeamIds.filter((id) => id !== teamId)
  const assignmentChanged =
    !normalizedExistingAssignedTeamIds.includes(teamId) || teamAssignedCaseId !== caseId
  const teams = releaseTeamsFromCases(normalizedState.teams, replacedTeamIds)

  let nextAgents = releaseAssignedAgentsFromTeams({
    agents: normalizedState.agents,
    teams: normalizedState.teams,
    teamIds: replacedTeamIds,
    caseId,
    caseTitle: currentCase.title,
    week: normalizedState.week,
  })

  if (assignmentChanged) {
    nextAgents = assignActiveAgentsToTeam({
      agents: nextAgents,
      team: normalizedTeam,
      caseId,
      teamId,
      caseTitle: normalizedCase.title,
      week: normalizedState.week,
    })
  }

  const nextState: GameState = {
    ...normalizedState,
    agents: nextAgents,
    cases: {
      ...normalizedState.cases,
      [caseId]: {
        ...normalizedCase,
        assignedTeamIds: nextAssignedTeamIds,
        weeksRemaining: normalizedCase.weeksRemaining ?? normalizedCase.durationWeeks,
        status: 'in_progress',
      },
    },
    teams: {
      ...teams,
      [teamId]: {
        ...teams[teamId],
        assignedCaseId: caseId,
        status: teams[teamId]?.status
          ? { ...teams[teamId].status, assignedCaseId: caseId }
          : teams[teamId]?.status,
      },
    },
  }

  const drafts: AnyOperationEventDraft[] = replacedTeamIds.map((replacedTeamId) => createAssignmentTeamUnassignedDraft({
    week: normalizedState.week,
    caseId,
    caseTitle: normalizedCase.title,
    teamId: replacedTeamId,
    teamName: normalizedState.teams[replacedTeamId]?.name ?? replacedTeamId,
    remainingTeamCount: nextAssignedTeamIds.length,
  }))
  if (assignmentChanged) {
    drafts.push(createAssignmentTeamAssignedDraft({
      week: normalizedState.week,
      caseId,
      caseTitle: normalizedCase.title,
      caseKind: normalizedCase.kind,
      teamId,
      teamName: normalizedTeam.name,
      assignedTeamCount: nextAssignedTeamIds.length,
      maxTeams,
    }))
  }

  return normalizeGameState(appendOperationEventDrafts(nextState, drafts))
}

/**
 * Unassign a specific team from a case, or all teams when teamId is omitted.
 */
export function unassignTeam(state: GameState, caseId: Id, teamId?: Id): GameState {
  const currentCase = state.cases[caseId]

  if (!currentCase) {
    return ensureNormalizedGameState(state)
  }

  const teamIdsToRemove = teamId
    ? currentCase.assignedTeamIds.filter((assignedTeamId) => assignedTeamId === teamId)
    : currentCase.assignedTeamIds

  if (teamIdsToRemove.length === 0) {
    return ensureNormalizedGameState(state)
  }

  const normalizedState = ensureNormalizedGameState(state)
  const normalizedCase = normalizedState.cases[caseId]

  const remainingTeamIds = normalizedCase.assignedTeamIds.filter(
    (assignedTeamId) => !teamIdsToRemove.includes(assignedTeamId)
  )
  const teams = releaseTeamsFromCases(normalizedState.teams, teamIdsToRemove)
  const nextAgents = releaseAssignedAgentsFromTeams({
    agents: normalizedState.agents,
    teams: normalizedState.teams,
    teamIds: teamIdsToRemove,
    caseId,
    caseTitle: currentCase.title,
    week: normalizedState.week,
  })

  const nextState: GameState = {
    ...normalizedState,
    agents: nextAgents,
    cases: {
      ...normalizedState.cases,
      [caseId]: {
        ...normalizedCase,
        assignedTeamIds: remainingTeamIds,
        status: remainingTeamIds.length > 0 ? 'in_progress' : 'open',
        weeksRemaining: remainingTeamIds.length > 0 ? normalizedCase.weeksRemaining : undefined,
      },
    },
    teams,
  }

  return normalizeGameState(
    appendOperationEventDrafts(
      nextState,
      teamIdsToRemove.map((removedTeamId) => createAssignmentTeamUnassignedDraft({
        week: normalizedState.week,
        caseId,
        caseTitle: normalizedCase.title,
        teamId: removedTeamId,
        teamName: normalizedState.teams[removedTeamId]?.name ?? removedTeamId,
        remainingTeamCount: remainingTeamIds.length,
      }))
    )
  )
}

export { calcCaseFit, calcChemistry } from './chemistry'
