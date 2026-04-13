// cspell:words editability
import { type GameState, type Id, type TeamCoverageRole } from './models'
import { buildResolutionPreviewState, previewResolutionForTeamIds } from './sim/resolve'
import { summarizeRelationshipModifiers } from './sim/chemistry'
import { getReserveAgents, getTeamEditability } from './sim/teamManagement'
import { isTeamBlockedByTraining } from './sim/training'
import {
  buildAgentSquadCompositionProfile,
  buildTeamCompositionProfile,
  getTeamAssignedCaseId,
  getTeamLeaderId,
  getTeamMemberIds,
} from './teamSimulation'

export type AdvisoryKind = 'team_arrangement' | 'instability' | 'synergy_unlock' | 'role_coverage'
export type AdvisorySeverity = 'info' | 'warning' | 'danger'

export interface AdvisoryItem {
  id: string
  kind: AdvisoryKind
  severity: AdvisorySeverity
  title: string
  detail: string
  caseId?: Id
  teamId?: Id
  agentId?: Id
}

interface RankedAdvisoryItem extends AdvisoryItem {
  priority: number
}

const SEVERITY_PRIORITY: Record<AdvisorySeverity, number> = {
  info: 1,
  warning: 2,
  danger: 3,
}

export function getAdvisories(game: GameState, limit = 6): AdvisoryItem[] {
  const ranked = [
    ...getTeamArrangementAdvisories(game),
    ...getRoleCoverageAdvisories(game),
    ...getInstabilityAdvisories(game),
    ...getSynergyUnlockAdvisories(game),
  ]

  const seen = new Set<string>()

  return ranked
    .sort((left, right) => {
      return (
        right.priority - left.priority ||
        SEVERITY_PRIORITY[right.severity] - SEVERITY_PRIORITY[left.severity] ||
        left.title.localeCompare(right.title)
      )
    })
    .filter((item) => {
      if (seen.has(item.id)) {
        return false
      }

      seen.add(item.id)
      return true
    })
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      severity: item.severity,
      title: item.title,
      detail: item.detail,
      caseId: item.caseId,
      teamId: item.teamId,
      agentId: item.agentId,
    }))
}

function getTeamArrangementAdvisories(game: GameState): RankedAdvisoryItem[] {
  const readyTeams = getReadyTeams(game)
  const previewState = buildResolutionPreviewState(game)

  return Object.values(game.cases)
    .filter(
      (currentCase) =>
        currentCase.status !== 'resolved' &&
        currentCase.assignedTeamIds.length === 0 &&
        readyTeams.length > 0
    )
    .flatMap((currentCase) => {
      const options = readyTeams
        .map((team) => ({
          team,
          preview: previewResolutionForTeamIds(currentCase, previewState, [team.id]),
        }))
        .filter(
          ({ preview }) =>
            !preview.odds.blockedByRequiredRoles && !preview.odds.blockedByRequiredTags
        )
        .sort(
          (left, right) =>
            right.preview.odds.success - left.preview.odds.success ||
            right.preview.odds.partial - left.preview.odds.partial ||
            left.team.name.localeCompare(right.team.name)
        )

      const bestOption = options[0]

      if (
        !bestOption ||
        (bestOption.preview.odds.success <= 0 && bestOption.preview.odds.partial <= 0)
      ) {
        return []
      }

      return [
        {
          id: `advisory-team-arrangement-${currentCase.id}-${bestOption.team.id}`,
          kind: 'team_arrangement' as const,
          severity: getCaseSeverity(currentCase.stage, currentCase.deadlineRemaining),
          title: `Assign ${bestOption.team.name} to ${currentCase.title}`,
          detail: `${bestOption.team.name} is the best ready match with ${formatOdds(bestOption.preview.odds)}.`,
          caseId: currentCase.id,
          teamId: bestOption.team.id,
          priority:
            80 +
            currentCase.stage * 8 +
            Math.max(0, 6 - currentCase.deadlineRemaining) * 6 +
            Math.round(bestOption.preview.odds.success * 20),
        },
      ]
    })
}

function getRoleCoverageAdvisories(game: GameState): RankedAdvisoryItem[] {
  const readyTeams = getReadyTeams(game)
  const previewState = buildResolutionPreviewState(game)

  return Object.values(game.cases)
    .filter(
      (currentCase) =>
        currentCase.status !== 'resolved' &&
        currentCase.assignedTeamIds.length === 0 &&
        (currentCase.requiredRoles?.length ?? 0) > 0
    )
    .flatMap((currentCase) => {
      const validations = readyTeams
        .map((team) => ({
          team,
          preview: previewResolutionForTeamIds(currentCase, previewState, [team.id]),
        }))
        .sort(
          (left, right) =>
            (left.preview.validation?.missingRoles.length ?? Number.MAX_SAFE_INTEGER) -
              (right.preview.validation?.missingRoles.length ?? Number.MAX_SAFE_INTEGER) ||
            left.team.name.localeCompare(right.team.name)
        )

      if (validations.some(({ preview }) => preview.validation?.valid)) {
        return []
      }

      const bestAttempt = validations[0]
      const missingRoles =
        bestAttempt?.preview.validation?.missingRoles ?? currentCase.requiredRoles ?? []
      const detail = bestAttempt
        ? `${bestAttempt.team.name} comes closest, but still lacks ${formatRoleList(missingRoles)}.`
        : `No ready team currently covers ${formatRoleList(missingRoles)}.`

      return [
        {
          id: `advisory-role-coverage-${currentCase.id}`,
          kind: 'role_coverage' as const,
          severity: getCaseSeverity(currentCase.stage, currentCase.deadlineRemaining),
          title: `${currentCase.title} is missing baseline role coverage`,
          detail,
          caseId: currentCase.id,
          teamId: bestAttempt?.team.id,
          priority:
            95 +
            currentCase.stage * 10 +
            Math.max(0, 6 - currentCase.deadlineRemaining) * 8 +
            missingRoles.length * 6,
        },
      ]
    })
}

function getInstabilityAdvisories(game: GameState): RankedAdvisoryItem[] {
  return Object.values(game.teams)
    .filter((team) => getTeamMemberIds(team).length > 0)
    .flatMap((team) => {
      const profile = buildTeamCompositionProfile(team, game.agents)
      const readiness = profile.derivedStats.readiness
      const chemistryBonus = profile.chemistryProfile.bonus
      const assignedCaseId = getTeamAssignedCaseId(team)
      const assignedCase = assignedCaseId ? game.cases[assignedCaseId] : undefined
      const readinessRisk = readiness < 45
      const chemistryRisk = chemistryBonus < 0

      if (!readinessRisk && !chemistryRisk) {
        return []
      }

      const severity: AdvisorySeverity =
        readiness < 35 || (assignedCase && chemistryBonus <= -2) ? 'danger' : 'warning'
      const parts = [
        readinessRisk ? `Readiness is down to ${readiness}.` : undefined,
        chemistryRisk
          ? `Relationship chemistry is ${chemistryBonus.toFixed(1)} across ${profile.chemistryProfile.pairs} pairings.`
          : undefined,
        chemistryRisk && profile.chemistryProfile.relationships.length > 0
          ? (() => {
              const summary = summarizeRelationshipModifiers(profile.chemistryProfile.relationships)
              return summary.length > 0 ? `Chemistry traits: ${summary.join(', ')}.` : undefined
            })()
          : undefined,
        assignedCase ? `Current deployment: ${assignedCase.title}.` : 'Team is still editable.',
      ].filter((part): part is string => Boolean(part))

      return [
        {
          id: `advisory-instability-${team.id}`,
          kind: 'instability' as const,
          severity,
          title: `${team.name} is showing instability`,
          detail: parts.join(' '),
          teamId: team.id,
          caseId: assignedCase?.id,
          priority:
            70 +
            (assignedCase ? 12 : 0) +
            Math.max(0, 55 - readiness) +
            Math.round(Math.abs(Math.min(chemistryBonus, 0)) * 6),
        },
      ]
    })
}

function getSynergyUnlockAdvisories(game: GameState): RankedAdvisoryItem[] {
  const reserveAgents = getReserveAgents(game).filter(
    (agent) => agent.status === 'active' && agent.assignment?.state !== 'training'
  )
  const editableTeams = getReadyTeams(game)

  const candidates = editableTeams.flatMap((team) => {
    const teamMembers = getTeamMemberIds(team)
      .map((agentId) => game.agents[agentId])
      .filter((agent) => Boolean(agent))

    if (teamMembers.length === 0) {
      return []
    }

    const baseProfile = buildTeamCompositionProfile(team, game.agents)

    return reserveAgents.flatMap((reserveAgent) => {
      const upgradedProfile = buildAgentSquadCompositionProfile(
        [...teamMembers, reserveAgent],
        getTeamLeaderId(team, game.agents) ?? reserveAgent.id,
        team.tags
      )
      const unlocked = upgradedProfile.synergyProfile.active.filter(
        (synergy) => !baseProfile.synergyProfile.active.some((active) => active.id === synergy.id)
      )

      if (unlocked.length === 0) {
        return []
      }

      const cohesionGain =
        upgradedProfile.synergyProfile.cohesionBonus - baseProfile.synergyProfile.cohesionBonus
      const scoreGain =
        upgradedProfile.synergyProfile.scoreBonus - baseProfile.synergyProfile.scoreBonus

      return [
        {
          id: `advisory-synergy-${team.id}-${reserveAgent.id}`,
          kind: 'synergy_unlock' as const,
          severity: 'info' as const,
          title: `${reserveAgent.name} could unlock ${unlocked.map((synergy) => synergy.label).join(', ')}`,
          detail: `Moving ${reserveAgent.name} into ${team.name} would improve team doctrine cohesion by ${formatSignedNumber(
            cohesionGain
          )} and score support by ${formatSignedNumber(scoreGain)}.`,
          teamId: team.id,
          agentId: reserveAgent.id,
          priority: 40 + unlocked.length * 10 + Math.round(cohesionGain + scoreGain * 4),
        },
      ]
    })
  })

  return candidates
}

function getReadyTeams(game: GameState) {
  return Object.values(game.teams).filter((team) => {
    return (
      getTeamMemberIds(team).length > 0 &&
      getTeamEditability(team, game.cases).editable &&
      !getTeamAssignedCaseId(team) &&
      !isTeamBlockedByTraining(team, game.agents)
    )
  })
}

function formatOdds(odds: ReturnType<typeof previewResolutionForTeamIds>['odds']) {
  return `${Math.round(odds.success * 100)}% success / ${Math.round(odds.partial * 100)}% partial`
}

function formatRoleList(roles: readonly TeamCoverageRole[]) {
  return roles.join(', ')
}

function formatSignedNumber(value: number) {
  const rounded = Math.round(value * 10) / 10
  return `${rounded >= 0 ? '+' : ''}${rounded}`
}

function getCaseSeverity(stage: number, deadlineRemaining: number): AdvisorySeverity {
  if (stage >= 4 || deadlineRemaining <= 2) {
    return 'danger'
  }

  if (stage >= 3 || deadlineRemaining <= 4) {
    return 'warning'
  }

  return 'info'
}
