/**
 * SPE-521 follow-up: deterministic role-branch read model keyed to site tags and claimedRole.
 */

import {
  listActiveCaseTagsClashingWithCoverRole,
  listActiveExtraRouteViolationTags,
  listCoverRolesCompatibleWithCaseTags,
  type InfiltrationCoverRole,
} from './infiltrationCover'
import { isInfiltrationProbeEligible } from './infiltrationProbe'
import type { CaseInstance } from './models'

const PREP_COVER_ROLE_LABELS: Record<InfiltrationCoverRole, string> = {
  uniform_guard: 'Uniform guard',
  civilian_staff: 'Civilian staff',
  courier: 'Courier',
  maintenance: 'Maintenance',
  official_inspector: 'Official inspector',
}

const ZONE_TAG_CONTEXT_LABELS: Record<string, string> = {
  court: 'Court-adjacent zone',
  interview: 'Interview zone',
  media: 'Media presence zone',
  military: 'Military posture zone',
  parade: 'Parade or ceremonial zone',
  public: 'Public access zone',
  witness: 'Witness-handling zone',
}

function resolveZoneTagContextLabel(tag: string) {
  return ZONE_TAG_CONTEXT_LABELS[tag] ?? `${tag} site context`
}

function formatAlternativeRoleBranchLabel(roles: readonly InfiltrationCoverRole[]) {
  if (roles.length === 0) {
    return undefined
  }

  const roleLabels = roles.map((role) => PREP_COVER_ROLE_LABELS[role])

  if (roleLabels.length === 1) {
    return `${roleLabels[0]} — compatible branch for current site tags`
  }

  const last = roleLabels[roleLabels.length - 1]
  const rest = roleLabels.slice(0, -1).join(', ')
  return `${rest}, or ${last} — compatible branches for current site tags`
}

export function canProjectInfiltrationEncounterRoleBranches(caseData: CaseInstance) {
  return (
    caseData.status === 'in_progress' &&
    isInfiltrationProbeEligible(caseData) &&
    caseData.infiltrationCoverProfile !== undefined
  )
}

export interface InfiltrationEncounterRoleBranches {
  readonly visible: boolean
  readonly claimedRole: InfiltrationCoverRole
  readonly claimedRoleLabel: string
  readonly zoneBranchLabels: readonly string[]
  readonly alternativeRoleLabels: readonly string[]
  readonly routeBranchLabels: readonly string[]
  readonly alignmentLabel?: string
}

const EMPTY_PROJECTION: InfiltrationEncounterRoleBranches = Object.freeze({
  visible: false,
  claimedRole: 'uniform_guard',
  claimedRoleLabel: PREP_COVER_ROLE_LABELS.uniform_guard,
  zoneBranchLabels: [],
  alternativeRoleLabels: [],
  routeBranchLabels: [],
})

/** Projects role-branch prep labels from claimedRole and site tag incompatibility table. */
export function projectInfiltrationEncounterRoleBranches(
  caseData: CaseInstance
): InfiltrationEncounterRoleBranches {
  if (!canProjectInfiltrationEncounterRoleBranches(caseData)) {
    return EMPTY_PROJECTION
  }

  const profile = caseData.infiltrationCoverProfile!
  const claimedRole = profile.claimedRole
  const claimedRoleLabel = PREP_COVER_ROLE_LABELS[claimedRole]
  const clashingTags = listActiveCaseTagsClashingWithCoverRole(caseData, claimedRole)
  const zoneBranchLabels = clashingTags.map(
    (tag) =>
      `${resolveZoneTagContextLabel(tag)} — branches away from ${claimedRoleLabel.toLowerCase()} cover`
  )
  const compatibleRoles = listCoverRolesCompatibleWithCaseTags(caseData, claimedRole)
  const alternativeBranchLabel = formatAlternativeRoleBranchLabel(compatibleRoles)
  const alternativeRoleLabels =
    clashingTags.length > 0 && alternativeBranchLabel !== undefined
      ? [alternativeBranchLabel]
      : []
  const extraRouteTags = listActiveExtraRouteViolationTags(caseData, claimedRole)
  const routeBranchLabels = extraRouteTags.map(
    (tag) => `${resolveZoneTagContextLabel(tag)} — route branch contradicts cover story`
  )
  const alignmentLabel =
    clashingTags.length === 0 && routeBranchLabels.length === 0
      ? 'Current site tags align with claimed cover role'
      : undefined

  return Object.freeze({
    visible: true,
    claimedRole,
    claimedRoleLabel,
    zoneBranchLabels,
    alternativeRoleLabels,
    routeBranchLabels,
    alignmentLabel,
  })
}
