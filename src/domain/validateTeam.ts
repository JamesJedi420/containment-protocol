import {
  TEAM_COVERAGE_ROLES,
  type Agent,
  type AgentSimulationPurpose,
  type AgentRole,
  type GameState,
  type Id,
  type Team,
  type TeamCoverageRole,
  type ValidationIssue,
  type ValidationResult,
} from './models'
import { buildAgentEligibilityStatus, isAgentEligibleForPurpose } from './agent/simulation'
import { getTeamMembers, getUniqueTeamMembers } from './teamSimulation'

const ROLE_COVERAGE_BY_AGENT_ROLE: Record<AgentRole, TeamCoverageRole[]> = {
  hunter: ['tactical'],
  occultist: ['containment'],
  investigator: ['investigator'],
  field_recon: ['investigator', 'technical'],
  medium: ['containment'],
  tech: ['technical'],
  medic: ['support'],
  negotiator: ['support'],
}

type CaseRoleConstraintCarrier = {
  requiredRoles?: readonly TeamCoverageRole[]
  requiredTags?: readonly string[]
  supportTags?: readonly string[]
}

function normalizeCoverageRoles(roles: readonly TeamCoverageRole[] | undefined) {
  return [...new Set((roles ?? []).filter((role) => TEAM_COVERAGE_ROLES.includes(role)))]
}

function normalizeRequiredTags(tags: readonly string[] | undefined) {
  return [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))]
}

function isAgentEligibleForCoverage(
  agent: Agent | undefined,
  purpose: AgentSimulationPurpose
): agent is Agent {
  return isAgentEligibleForPurpose(agent, purpose)
}

export function getAgentCoverageRoles(agent: Agent) {
  return ROLE_COVERAGE_BY_AGENT_ROLE[agent.role] ?? []
}

export function getAgentCoverageRoleMap() {
  return { ...ROLE_COVERAGE_BY_AGENT_ROLE }
}

export function getCoverageRolesForAgents(
  agents: Agent[],
  purpose: AgentSimulationPurpose = 'assignment'
) {
  return [
    ...new Set(
      agents
        .filter((agent): agent is Agent => isAgentEligibleForCoverage(agent, purpose))
        .flatMap((agent) => getAgentCoverageRoles(agent))
    ),
  ]
}

export function getCoverageTagsForAgents(
  agents: Agent[],
  supportTags: readonly string[] = [],
  purpose: AgentSimulationPurpose = 'assignment'
) {
  return [
    ...new Set([
      ...supportTags,
      ...agents
        .filter((agent): agent is Agent => isAgentEligibleForCoverage(agent, purpose))
        .flatMap((agent) => agent.tags.map((tag) => tag.trim()).filter(Boolean)),
    ]),
  ]
}

export function getCoverageRolesForTeam(
  team: Team,
  agentsById: GameState['agents'],
  purpose: AgentSimulationPurpose = 'assignment'
) {
  const agents = getTeamMembers(team, agentsById).filter((agent) =>
    isAgentEligibleForCoverage(agent, purpose)
  )
  return getCoverageRolesForAgents(agents, purpose)
}

export function getCoverageTagsForTeam(
  team: Team,
  agentsById: GameState['agents'],
  purpose: AgentSimulationPurpose = 'assignment'
) {
  const agents = getTeamMembers(team, agentsById)
  return getCoverageTagsForAgents(agents, team.tags, purpose)
}

export function getCoverageRolesForTeamIds(
  teamIds: Id[],
  teams: GameState['teams'],
  agentsById: GameState['agents'],
  purpose: AgentSimulationPurpose = 'assignment'
) {
  const agents = getUniqueTeamMembers(teamIds, teams, agentsById).filter((agent) =>
    isAgentEligibleForCoverage(agent, purpose)
  )

  return getCoverageRolesForAgents(agents, purpose)
}

export function getCoverageTagsForTeamIds(
  teamIds: Id[],
  teams: GameState['teams'],
  agentsById: GameState['agents'],
  purpose: AgentSimulationPurpose = 'assignment'
) {
  const supportTags = teamIds.flatMap((teamId) => teams[teamId]?.tags ?? [])
  const agents = getUniqueTeamMembers(teamIds, teams, agentsById)

  return getCoverageTagsForAgents(agents, supportTags, purpose)
}

export function validateCoveredRoles(
  coveredRoles: TeamCoverageRole[],
  caseData: CaseRoleConstraintCarrier
): ValidationResult {
  const requiredRoles = normalizeCoverageRoles(caseData.requiredRoles)
  const requiredTags = normalizeRequiredTags(caseData.requiredTags)
  const satisfiedRoles = requiredRoles.filter((role) => coveredRoles.includes(role))
  const missingRoles = requiredRoles.filter((role) => !coveredRoles.includes(role))
  const issues: ValidationIssue[] = []

  if (missingRoles.length > 0) {
    issues.push({
      code: 'missing-required-roles',
      detail: `Missing required roles: ${missingRoles.join(', ')}.`,
    })
  }

  return {
    valid: missingRoles.length === 0,
    requiredRoles,
    coveredRoles,
    satisfiedRoles,
    missingRoles,
    requiredTags,
    coveredTags: [],
    missingTags: [],
    activeAgentIds: [],
    inactiveAgentIds: [],
    deadAgentIds: [],
    trainingAgentIds: [],
    issues,
  }
}

export function validateAgents(
  agents: Agent[],
  caseData: CaseRoleConstraintCarrier,
  purpose: AgentSimulationPurpose = 'assignment'
) {
  const supportTags = normalizeRequiredTags(caseData.supportTags)
  const eligibleAgents = agents.filter((agent) => isAgentEligibleForCoverage(agent, purpose))
  const inactiveAgentIds = agents
    .filter((agent) => agent.status === 'dead' || agent.status === 'resigned')
    .map((agent) => agent.id)
  const trainingAgentIds = agents
    .filter((agent) =>
      buildAgentEligibilityStatus(agent, purpose).blockedReasons.includes('training')
    )
    .map((agent) => agent.id)
  const coveredRoles = getCoverageRolesForAgents(agents, purpose)
  const coveredTags = getCoverageTagsForAgents(agents, supportTags, purpose)
  const requiredRoles = normalizeCoverageRoles(caseData.requiredRoles)
  const requiredTags = normalizeRequiredTags(caseData.requiredTags)
  const satisfiedRoles = requiredRoles.filter((role) => coveredRoles.includes(role))
  const missingRoles = requiredRoles.filter((role) => !coveredRoles.includes(role))
  const missingTags = requiredTags.filter((tag) => !coveredTags.includes(tag))
  const issues: ValidationIssue[] = []

  if (eligibleAgents.length === 0) {
    issues.push({
      code: 'no-active-members',
      detail: 'No active members are available for deployment.',
    })
  }

  if (trainingAgentIds.length > 0) {
    issues.push({
      code: 'training-blocked',
      detail: 'One or more members are in training and cannot deploy.',
    })
  }

  if (missingRoles.length > 0) {
    issues.push({
      code: 'missing-required-roles',
      detail: `Missing required roles: ${missingRoles.join(', ')}.`,
    })
  }

  if (missingTags.length > 0) {
    issues.push({
      code: 'missing-required-tags',
      detail: `Missing required tags: ${missingTags.join(', ')}.`,
    })
  }

  return {
    valid: issues.length === 0,
    requiredRoles,
    coveredRoles,
    satisfiedRoles,
    missingRoles,
    requiredTags,
    coveredTags,
    missingTags,
    activeAgentIds: eligibleAgents.map((agent) => agent.id),
    inactiveAgentIds,
    deadAgentIds: inactiveAgentIds,
    trainingAgentIds,
    issues,
  }
}

export function validateTeam(
  team: Team,
  caseData: CaseRoleConstraintCarrier,
  agentsById: GameState['agents'],
  purpose: AgentSimulationPurpose = 'assignment'
) {
  return validateTeamIds([team.id], caseData, { [team.id]: team }, agentsById, purpose)
}

export function validateTeamIds(
  teamIds: Id[],
  caseData: CaseRoleConstraintCarrier,
  teams: GameState['teams'],
  agentsById: GameState['agents'],
  purpose: AgentSimulationPurpose = 'assignment'
) {
  const requiredRoles = normalizeCoverageRoles(caseData.requiredRoles)
  const requiredTags = normalizeRequiredTags(caseData.requiredTags)
  const existingTeamIds = teamIds.filter((teamId) => Boolean(teams[teamId]))

  if (teamIds.length > 0 && existingTeamIds.length === 0) {
    return {
      valid: false,
      requiredRoles,
      coveredRoles: [],
      satisfiedRoles: [],
      missingRoles: [...requiredRoles],
      requiredTags,
      coveredTags: [],
      missingTags: [...requiredTags],
      activeAgentIds: [],
      inactiveAgentIds: [],
      deadAgentIds: [],
      trainingAgentIds: [],
      issues: [
        {
          code: 'no-active-members' as const,
          detail: 'No active members are available for deployment.',
        },
      ],
    }
  }

  const supportTags = existingTeamIds.flatMap((teamId) => teams[teamId]?.tags ?? [])
  const agents = getUniqueTeamMembers(existingTeamIds, teams, agentsById)

  const eligibleAgents = agents.filter((agent) => isAgentEligibleForCoverage(agent, purpose))
  const inactiveAgentIds = agents
    .filter((agent) => agent.status === 'dead' || agent.status === 'resigned')
    .map((agent) => agent.id)
  const trainingAgentIds = agents
    .filter((agent) =>
      buildAgentEligibilityStatus(agent, purpose).blockedReasons.includes('training')
    )
    .map((agent) => agent.id)
  const coveredRoles = getCoverageRolesForAgents(agents, purpose)
  const coveredTags = getCoverageTagsForAgents(agents, supportTags, purpose)
  const satisfiedRoles = requiredRoles.filter((role) => coveredRoles.includes(role))
  const missingRoles = requiredRoles.filter((role) => !coveredRoles.includes(role))
  const missingTags = requiredTags.filter((tag) => !coveredTags.includes(tag))
  const issues: ValidationIssue[] = []

  if (eligibleAgents.length === 0) {
    issues.push({
      code: 'no-active-members',
      detail: 'No active members are available for deployment.',
    })
  }

  if (trainingAgentIds.length > 0) {
    issues.push({
      code: 'training-blocked',
      detail: 'One or more members are in training and cannot deploy.',
    })
  }

  if (missingRoles.length > 0) {
    issues.push({
      code: 'missing-required-roles',
      detail: `Missing required roles: ${missingRoles.join(', ')}.`,
    })
  }

  if (missingTags.length > 0) {
    issues.push({
      code: 'missing-required-tags',
      detail: `Missing required tags: ${missingTags.join(', ')}.`,
    })
  }

  return {
    valid: issues.length === 0,
    requiredRoles,
    coveredRoles,
    satisfiedRoles,
    missingRoles,
    requiredTags,
    coveredTags,
    missingTags,
    activeAgentIds: eligibleAgents.map((agent) => agent.id),
    inactiveAgentIds,
    deadAgentIds: inactiveAgentIds,
    trainingAgentIds,
    issues,
  }
}
