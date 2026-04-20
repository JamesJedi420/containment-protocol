import {
  appendOperationEventDrafts,
  type AnyOperationEventDraft,
  createAssignmentTeamAssignedDraft,
  createAssignmentTeamUnassignedDraft,
} from '../events'
import {
  type GameState,
  type Id,
  type MajorIncidentProvisionType,
  type MajorIncidentStrategy,
} from '../models'
import {
  buildPlannedMajorIncidentRuntime,
  evaluateMajorIncidentPlan,
  getProvisionInventoryCost,
  isOperationalMajorIncidentCase,
} from '../majorIncidentOperations'
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

function deductProvisionInventory(
  inventory: GameState['inventory'],
  provisions: MajorIncidentProvisionType[]
) {
  const nextInventory = { ...inventory }

  for (const provision of getProvisionInventoryCost(provisions)) {
    nextInventory[provision.itemId] = Math.max(
      0,
      (nextInventory[provision.itemId] ?? 0) - provision.quantity
    )
  }

  return nextInventory
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

  if (isOperationalMajorIncidentCase(currentCase)) {
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

  const drafts: AnyOperationEventDraft[] = replacedTeamIds.map((replacedTeamId) =>
    createAssignmentTeamUnassignedDraft({
      week: normalizedState.week,
      caseId,
      caseTitle: normalizedCase.title,
      teamId: replacedTeamId,
      teamName: normalizedState.teams[replacedTeamId]?.name ?? replacedTeamId,
      remainingTeamCount: nextAssignedTeamIds.length,
    })
  )
  if (assignmentChanged) {
    drafts.push(
      createAssignmentTeamAssignedDraft({
        week: normalizedState.week,
        caseId,
        caseTitle: normalizedCase.title,
        caseKind: normalizedCase.kind,
        teamId,
        teamName: normalizedTeam.name,
        assignedTeamCount: nextAssignedTeamIds.length,
        maxTeams,
      })
    )
  }

  return normalizeGameState(appendOperationEventDrafts(nextState, drafts))
}

export function launchMajorIncident(
  state: GameState,
  caseId: Id,
  teamIds: Id[],
  strategy: MajorIncidentStrategy = 'balanced',
  provisions: MajorIncidentProvisionType[] = []
): GameState {
  const currentCase = state.cases[caseId]

  if (
    !currentCase ||
    currentCase.status === 'resolved' ||
    !isOperationalMajorIncidentCase(currentCase)
  ) {
    return ensureNormalizedGameState(state)
  }

  const plannedRuntime = buildPlannedMajorIncidentRuntime(currentCase, state, {
    strategy,
    provisions,
  })
  const evaluation = evaluateMajorIncidentPlan(state, currentCase, teamIds, {
    strategy,
    provisions,
  })

  if (!plannedRuntime || !evaluation?.valid) {
    return ensureNormalizedGameState(state)
  }

  const normalizedState = ensureNormalizedGameState(state)
  const normalizedCase = normalizedState.cases[caseId]
  const selectedTeamIds = [...new Set(teamIds)].filter((teamId) => Boolean(normalizedState.teams[teamId]))
  const existingAssignedTeamIds = filterExistingTeamIds(
    normalizedCase.assignedTeamIds,
    normalizedState.teams
  )
  const replacedTeamIds = existingAssignedTeamIds.filter((teamId) => !selectedTeamIds.includes(teamId))
  const newlyAssignedTeamIds = selectedTeamIds.filter((teamId) => !existingAssignedTeamIds.includes(teamId))
  const teams = releaseTeamsFromCases(normalizedState.teams, replacedTeamIds)

  let nextAgents = releaseAssignedAgentsFromTeams({
    agents: normalizedState.agents,
    teams: normalizedState.teams,
    teamIds: replacedTeamIds,
    caseId,
    caseTitle: normalizedCase.title,
    week: normalizedState.week,
  })

  for (const teamId of newlyAssignedTeamIds) {
    nextAgents = assignActiveAgentsToTeam({
      agents: nextAgents,
      team: normalizedState.teams[teamId]!,
      caseId,
      teamId,
      caseTitle: normalizedCase.title,
      week: normalizedState.week,
    })
  }

  const nextTeams = { ...teams }
  for (const teamId of selectedTeamIds) {
    nextTeams[teamId] = {
      ...nextTeams[teamId]!,
      assignedCaseId: caseId,
      status: nextTeams[teamId]?.status
        ? { ...nextTeams[teamId]!.status, assignedCaseId: caseId }
        : nextTeams[teamId]?.status,
    }
  }

  const nextState: GameState = {
    ...normalizedState,
    agents: nextAgents,
    inventory: deductProvisionInventory(normalizedState.inventory, plannedRuntime.provisions),
    cases: {
      ...normalizedState.cases,
      [caseId]: {
        ...normalizedCase,
        assignedTeamIds: selectedTeamIds,
        status: 'in_progress',
        weeksRemaining: plannedRuntime.durationWeeks,
        raid: {
          minTeams: plannedRuntime.requiredTeams,
          maxTeams: plannedRuntime.requiredTeams,
        },
        majorIncident: plannedRuntime,
      },
    },
    teams: nextTeams,
  }

  const drafts: AnyOperationEventDraft[] = replacedTeamIds.map((replacedTeamId) =>
    createAssignmentTeamUnassignedDraft({
      week: normalizedState.week,
      caseId,
      caseTitle: normalizedCase.title,
      teamId: replacedTeamId,
      teamName: normalizedState.teams[replacedTeamId]?.name ?? replacedTeamId,
      remainingTeamCount: selectedTeamIds.length,
    })
  )

  for (const teamId of newlyAssignedTeamIds) {
    drafts.push(
      createAssignmentTeamAssignedDraft({
        week: normalizedState.week,
        caseId,
        caseTitle: normalizedCase.title,
        caseKind: normalizedCase.kind,
        teamId,
        teamName: normalizedState.teams[teamId]?.name ?? teamId,
        assignedTeamCount: selectedTeamIds.length,
        maxTeams: plannedRuntime.requiredTeams,
      })
    )
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

  if (currentCase.majorIncident && currentCase.status === 'in_progress') {
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
      teamIdsToRemove.map((removedTeamId) =>
        createAssignmentTeamUnassignedDraft({
          week: normalizedState.week,
          caseId,
          caseTitle: normalizedCase.title,
          teamId: removedTeamId,
          teamName: normalizedState.teams[removedTeamId]?.name ?? removedTeamId,
          remainingTeamCount: remainingTeamIds.length,
        })
      )
    )
  )
}

export { calcCaseFit, calcChemistry } from './chemistry'
