import { clamp } from './math'
import { isAgentAttritionUnavailable } from './agent/attrition'
import { buildTeamNicheSummary, mapCoverageRolesToNiches } from './nicheIdentity'
import {
  TEAM_COVERAGE_ROLES,
  type Agent,
  type GameState,
  type Id,
  type Team,
  type TeamCategory,
  type TeamCohesionBand,
  type TeamCohesionSummary,
  type TeamCompositionState,
  type TeamCoverageRole,
  type ValidationIssue,
} from './models'
import { getAgentCoverageRoles } from './validateTeam'

export interface TeamCompositionValidationResult {
  valid: boolean
  requiredRoles: TeamCoverageRole[]
  coveredRoles: TeamCoverageRole[]
  missingRoles: TeamCoverageRole[]
  activeMemberIds: Id[]
  inactiveMemberIds: Id[]
  trainingMemberIds: Id[]
  issues: ValidationIssue[]
}

export interface TeamWeakestLinkPenalty {
  code: 'missing-coverage' | 'low-min-readiness' | 'fragile-cohesion'
  detail: string
  penalty: number
}

export interface TeamWeakestLinkSummary {
  penalties: TeamWeakestLinkPenalty[]
  totalPenalty: number
}

export interface TeamSelectionSummary {
  teamId: Id
  validation: TeamCompositionValidationResult
  cohesion: TeamCohesionSummary
  fatigueBurden: number
}

export const TEAM_COMPOSITION_REQUIRED_ROLES = [
  'containment',
  'investigator',
  'tactical',
  'support',
] as const satisfies readonly TeamCoverageRole[]

function uniqueSortedRoles(roles: TeamCoverageRole[]) {
  return [...new Set(roles.filter((role) => TEAM_COVERAGE_ROLES.includes(role)))].sort((a, b) =>
    a.localeCompare(b)
  )
}

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

function getTeamAssignedCaseId(team: Pick<Team, 'status' | 'assignedCaseId'>): Id | null {
  const statusAssignedCaseId = team.status?.assignedCaseId ?? null

  if (statusAssignedCaseId !== null) {
    return statusAssignedCaseId
  }

  if (Object.prototype.hasOwnProperty.call(team, 'assignedCaseId')) {
    return team.assignedCaseId ?? null
  }

  return null
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function buildRelationshipLookup(agents: Agent[]) {
  const map = new Map<string, number>()

  for (const agent of agents) {
    for (const [counterpartId, value] of Object.entries(agent.relationships ?? {})) {
      const key = [agent.id, counterpartId].sort().join('::')
      if (!map.has(key)) {
        map.set(key, typeof value === 'number' && Number.isFinite(value) ? value : 0)
      }
    }
  }

  return map
}

function getCohesionBand(score: number): TeamCohesionBand {
  if (score >= 80) {
    return 'strong'
  }

  if (score >= 60) {
    return 'steady'
  }

  if (score >= 40) {
    return 'unstable'
  }

  return 'fragile'
}

function normalizeCategory(value: string | undefined): TeamCategory | undefined {
  return value === 'containment_strike_team' ||
    value === 'investigation_cell' ||
    value === 'liaison_stabilization_unit' ||
    value === 'balanced_rapid_response_team'
    ? value
    : undefined
}

export function deriveTeamCategory(team: Team, agentsById: GameState['agents']): TeamCategory {
  const members = getTeamMembers(team, agentsById)
  const roles = members.map((member) => member.role)

  const hasContainment = roles.some((role) => role === 'occultist' || role === 'medium')
  const hasInvestigation = roles.some((role) => role === 'investigator' || role === 'field_recon')
  const hasSupport = roles.some((role) => role === 'medic' || role === 'negotiator')
  const hasTactical = roles.some((role) => role === 'hunter')

  if (hasContainment && hasTactical && roles.some((role) => role === 'tech')) {
    return 'containment_strike_team'
  }

  if (hasInvestigation && roles.some((role) => role === 'tech') && roles.some((role) => role === 'field_recon')) {
    return 'investigation_cell'
  }

  if (hasSupport && hasContainment && roles.some((role) => role === 'negotiator')) {
    return 'liaison_stabilization_unit'
  }

  if (hasContainment && hasInvestigation && hasSupport && hasTactical) {
    return 'balanced_rapid_response_team'
  }

  return 'balanced_rapid_response_team'
}

export function buildTeamCohesionSummary(
  team: Team,
  agentsById: GameState['agents']
): TeamCohesionSummary {
  const members = getTeamMembers(team, agentsById)

  if (members.length === 0) {
    return {
      cohesionScore: 0,
      cohesionBand: 'fragile',
      chemistryScore: 0,
      coordinationScore: 0,
      trustScore: 0,
      fatiguePenalty: 0,
      cohesionFlags: ['empty-team'],
    }
  }

  const relationshipLookup = buildRelationshipLookup(members)
  const chemistryRaw = [...relationshipLookup.values()]
  const chemistryScore = clamp(Math.round(50 + average(chemistryRaw) * 20), 0, 100)

  const trainedDepth: number[] = []
  for (const member of members) {
    const trainedRelationships = member.progression?.skillTree?.trainedRelationships ?? {}
    for (const teammate of members) {
      if (teammate.id === member.id) {
        continue
      }
      const value = trainedRelationships[teammate.id]
      if (typeof value === 'number' && Number.isFinite(value)) {
        trainedDepth.push(value)
      }
    }
  }

  const coordinationScore = clamp(Math.round(40 + average(trainedDepth) * 10), 0, 100)

  const trustValues = members.map((member) => {
    const multiplier = member.performancePenaltyMultiplier
    if (typeof multiplier !== 'number' || !Number.isFinite(multiplier)) {
      return 100
    }

    return clamp(Math.round(multiplier * 100), 0, 100)
  })
  const trustScore = clamp(Math.round(average(trustValues)), 0, 100)

  const averageFatigue = average(members.map((member) => member.fatigue))
  const fatiguePenalty = clamp(Math.round(averageFatigue / 2), 0, 50)

  const cohesionScore = clamp(
    Math.round((chemistryScore + coordinationScore + trustScore) / 3 - fatiguePenalty),
    0,
    100
  )

  const cohesionFlags: string[] = []
  if (chemistryScore < 45) {
    cohesionFlags.push('low-chemistry')
  }
  if (coordinationScore < 45) {
    cohesionFlags.push('low-coordination')
  }
  if (trustScore < 45) {
    cohesionFlags.push('low-trust')
  }
  if (fatiguePenalty >= 25) {
    cohesionFlags.push('fatigue-overload')
  }

  return {
    cohesionScore,
    cohesionBand: getCohesionBand(cohesionScore),
    chemistryScore,
    coordinationScore,
    trustScore,
    fatiguePenalty,
    cohesionFlags,
  }
}

export function validateTeamComposition(
  team: Team,
  agentsById: GameState['agents'],
  teams?: GameState['teams'],
  options?: {
    requiredRoles?: TeamCoverageRole[]
    prohibitDuplicateMembership?: boolean
    checkDeployConflict?: boolean
  }
): TeamCompositionValidationResult {
  const requiredRoles = uniqueSortedRoles([
    ...((options?.requiredRoles ?? [...TEAM_COMPOSITION_REQUIRED_ROLES]) as TeamCoverageRole[]),
  ])
  const memberIds = getTeamMemberIds(team)
  const members = getTeamMembers(team, agentsById)

  const activeMemberIds: Id[] = []
  const inactiveMemberIds: Id[] = []
  const trainingMemberIds: Id[] = []
  const coveredRoleSet = new Set<TeamCoverageRole>()
  const issues: ValidationIssue[] = []

  if (memberIds.length === 0) {
    issues.push({ code: 'invalid-team', detail: 'Team has no members.' })
  }

  const missingMemberIds = memberIds.filter((memberId) => !agentsById[memberId])
  if (missingMemberIds.length > 0) {
    issues.push({
      code: 'stale-member-reference',
      detail: `Unknown member references: ${missingMemberIds.join(', ')}.`,
    })
  }

  for (const member of members) {
    const unavailable =
      member.status === 'dead' ||
      member.status === 'resigned' ||
      member.status === 'injured' ||
      member.assignment?.state === 'recovery' ||
      isAgentAttritionUnavailable(member)

    if (member.assignment?.state === 'training') {
      trainingMemberIds.push(member.id)
    }

    if (unavailable || member.assignment?.state === 'training') {
      inactiveMemberIds.push(member.id)
      continue
    }

    activeMemberIds.push(member.id)
    for (const role of getAgentCoverageRoles(member)) {
      coveredRoleSet.add(role)
    }
  }

  const coveredRoles = uniqueSortedRoles([...coveredRoleSet])
  const missingRoles = requiredRoles.filter((role) => !coveredRoleSet.has(role))

  if (missingRoles.length > 0) {
    issues.push({
      code: 'missing-required-roles',
      detail: `Missing required roles: ${missingRoles.join(', ')}.`,
    })
  }

  if (trainingMemberIds.length > 0) {
    issues.push({
      code: 'training-blocked',
      detail: 'One or more members are in training and cannot deploy.',
    })
  }

  const leaderId = team.leaderId ?? null
  if (!leaderId || !memberIds.includes(leaderId) || !agentsById[leaderId]) {
    issues.push({
      code: 'invalid-leader',
      detail: 'Invalid or missing leader assignment.',
    })
  } else {
    const leader = agentsById[leaderId]
    if (
      leader.status === 'dead' ||
      leader.status === 'resigned' ||
      leader.assignment?.state === 'training' ||
      isAgentAttritionUnavailable(leader)
    ) {
      issues.push({
        code: 'invalid-leader',
        detail: 'Leader is unavailable for deployment.',
      })
    }
  }

  if (options?.prohibitDuplicateMembership !== false && teams) {
    const duplicates = memberIds.filter((memberId) =>
      Object.values(teams).some((otherTeam) => otherTeam.id !== team.id && getTeamMemberIds(otherTeam).includes(memberId))
    )

    if (duplicates.length > 0) {
      issues.push({
        code: 'duplicate-membership',
        detail: `Duplicate memberships detected: ${[...new Set(duplicates)].join(', ')}.`,
      })
    }
  }

  if (options?.checkDeployConflict !== false) {
    const assignedCaseId = getTeamAssignedCaseId(team)
    if (assignedCaseId && team.status?.state === 'ready') {
      issues.push({
        code: 'deploy-conflict',
        detail: 'Team has an assigned case but ready status.',
      })
    }
  }

  return {
    valid: issues.length === 0,
    requiredRoles,
    coveredRoles,
    missingRoles,
    activeMemberIds: [...new Set(activeMemberIds)].sort((a, b) => a.localeCompare(b)),
    inactiveMemberIds: [...new Set(inactiveMemberIds)].sort((a, b) => a.localeCompare(b)),
    trainingMemberIds: [...new Set(trainingMemberIds)].sort((a, b) => a.localeCompare(b)),
    issues,
  }
}

export function buildTeamWeakestLinkSummary(
  team: Team,
  agentsById: GameState['agents'],
  options?: {
    requiredRoles?: TeamCoverageRole[]
    minimumReadiness?: number
  }
): TeamWeakestLinkSummary {
  const validation = validateTeamComposition(team, agentsById, undefined, {
    requiredRoles: options?.requiredRoles,
    prohibitDuplicateMembership: false,
    checkDeployConflict: false,
  })
  const cohesion = buildTeamCohesionSummary(team, agentsById)
  const members = getTeamMembers(team, agentsById)
  const readinessValues = members.map((member) =>
    clamp(Math.round(100 - member.fatigue), 0, 100)
  )
  const minReadiness = readinessValues.length > 0 ? Math.min(...readinessValues) : 0
  const readinessThreshold = clamp(options?.minimumReadiness ?? 40, 0, 100)

  const penalties: TeamWeakestLinkPenalty[] = []

  if (validation.missingRoles.length > 0) {
    penalties.push({
      code: 'missing-coverage',
      detail: `Coverage gaps: ${validation.missingRoles.join(', ')}.`,
      penalty: Math.min(30, validation.missingRoles.length * 8),
    })
  }

  if (minReadiness < readinessThreshold) {
    penalties.push({
      code: 'low-min-readiness',
      detail: `Minimum member readiness ${minReadiness} is below threshold ${readinessThreshold}.`,
      penalty: Math.min(30, readinessThreshold - minReadiness),
    })
  }

  if (cohesion.cohesionBand === 'fragile') {
    penalties.push({
      code: 'fragile-cohesion',
      detail: 'Team cohesion is fragile.',
      penalty: 15,
    })
  }

  return {
    penalties,
    totalPenalty: penalties.reduce((sum, penalty) => sum + penalty.penalty, 0),
  }
}

export function buildTeamCompositionState(
  team: Team,
  agentsById: GameState['agents'],
  teams?: GameState['teams']
): TeamCompositionState {
  const category = normalizeCategory(team.category) ?? deriveTeamCategory(team, agentsById)
  const validation = validateTeamComposition(team, agentsById, teams)
  const cohesion = buildTeamCohesionSummary(team, agentsById)
  const activeMembers = validation.activeMemberIds
    .map((memberId) => agentsById[memberId])
    .filter((agent): agent is Agent => Boolean(agent))
  const requiredNiches = mapCoverageRolesToNiches(validation.requiredRoles)
  const nicheSummary = buildTeamNicheSummary(
    activeMembers,
    requiredNiches.length > 0 ? requiredNiches : undefined
  )

  return {
    category,
    requiredCoverageRoles: [...validation.requiredRoles],
    coveredRoles: [...validation.coveredRoles],
    missingRoles: [...validation.missingRoles],
    nicheSummary,
    compositionValid: validation.valid,
    validationIssues: [...validation.issues],
    cohesion,
  }
}

export function rankBestAvailableTeams(
  teams: Team[],
  agentsById: GameState['agents'],
  allTeams: GameState['teams'],
  options?: {
    requiredRoles?: TeamCoverageRole[]
  }
): TeamSelectionSummary[] {
  const summaries = teams.map((team) => {
    const validation = validateTeamComposition(team, agentsById, allTeams, {
      requiredRoles: options?.requiredRoles,
    })
    const cohesion = buildTeamCohesionSummary(team, agentsById)
    const members = getTeamMembers(team, agentsById)
    const fatigueBurden = Math.round(average(members.map((member) => member.fatigue)))

    return {
      teamId: team.id,
      validation,
      cohesion,
      fatigueBurden,
    } satisfies TeamSelectionSummary
  })

  return summaries.sort((left, right) => {
    const leftCompleteness = left.validation.requiredRoles.length - left.validation.missingRoles.length
    const rightCompleteness = right.validation.requiredRoles.length - right.validation.missingRoles.length

    if (rightCompleteness !== leftCompleteness) {
      return rightCompleteness - leftCompleteness
    }

    if (right.cohesion.cohesionScore !== left.cohesion.cohesionScore) {
      return right.cohesion.cohesionScore - left.cohesion.cohesionScore
    }

    if (left.fatigueBurden !== right.fatigueBurden) {
      return left.fatigueBurden - right.fatigueBurden
    }

    return left.teamId.localeCompare(right.teamId)
  })
}
