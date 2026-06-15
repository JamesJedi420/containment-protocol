/**
 * SPE-521 follow-up: deterministic non-uniform / non-institutional identity tree read model.
 */

import {
  type InfiltrationCoverRole,
  isNonUniformIdentityCoverRole,
} from './infiltrationCover'
import {
  AWARENESS_COMPLICATION_THRESHOLD,
  isInfiltrationProbeEligible,
  readInfiltrationProbeState,
} from './infiltrationProbe'
import type { CaseInstance } from './models'

/** Courier cover roles participate in logistics-style identity trees. */
export const INFILTRATION_NON_UNIFORM_COURIER_COVER_ROLE: InfiltrationCoverRole = 'courier'

/** Maintenance cover roles participate in service-vendor identity trees. */
export const INFILTRATION_NON_UNIFORM_MAINTENANCE_COVER_ROLE: InfiltrationCoverRole = 'maintenance'

/** Site tags branching courier non-uniform identity trees (distinct from institutional office roles). */
export const INFILTRATION_NON_UNIFORM_COURIER_CONTEXT_TAGS = [
  'logistics',
  'relay',
  'supply-chain',
  'cyber',
  'parade',
] as const

/** Site tags branching maintenance non-uniform identity trees. */
export const INFILTRATION_NON_UNIFORM_MAINTENANCE_CONTEXT_TAGS = [
  'archive',
  'records',
  'forensics',
  'infrastructure',
  'vault',
  'seal',
] as const

const COURIER_ARCHETYPE_RULES: readonly {
  readonly tags: readonly string[]
  readonly label: string
}[] = [
  { tags: ['relay', 'cyber'], label: 'Relay-chain courier identity' },
  { tags: ['logistics', 'supply-chain'], label: 'Logistics-route courier identity' },
  { tags: ['parade'], label: 'Transit-surge courier identity' },
]

const MAINTENANCE_ARCHETYPE_RULES: readonly {
  readonly tags: readonly string[]
  readonly label: string
}[] = [
  { tags: ['archive', 'records', 'vault'], label: 'Records-vault service identity' },
  { tags: ['forensics'], label: 'Lab-forensics service identity' },
  { tags: ['infrastructure', 'seal'], label: 'Infrastructure-service identity' },
]

const COURIER_BRANCH_LABELS: Record<string, string> = {
  logistics: 'Logistics lanes favor recurring courier drop patterns',
  relay: 'Relay nodes expect vendor courier handoffs without institutional badges',
  'supply-chain': 'Supply-chain beats reward manifest-backed courier trees',
  cyber: 'Cyber-adjacent sites tolerate packet-courier cover over office roles',
  parade: 'Parade or surge windows mask non-uniform courier movement',
}

const MAINTENANCE_BRANCH_LABELS: Record<string, string> = {
  archive: 'Archive wings expect after-hours maintenance vendor trees',
  records: 'Records rooms branch on service-ticket identity rather than staff rosters',
  forensics: 'Forensics zones compare tool manifests against maintenance vendors',
  infrastructure: 'Infrastructure outages justify recurring maintenance identity paths',
  vault: 'Vault access favors vendor-service identity over uniform cover',
  seal: 'Sealed chambers expect maintenance trees with narrow scope credentials',
}

const MID_EMBED_PROBE_PROGRESS = 0.5
const WEAK_DOCUMENT_TIER = 0

function collectCaseTags(caseData: CaseInstance): Set<string> {
  return new Set([...caseData.tags, ...caseData.requiredTags, ...caseData.preferredTags])
}

function contextTagsForRole(role: InfiltrationCoverRole): readonly string[] {
  if (role === INFILTRATION_NON_UNIFORM_COURIER_COVER_ROLE) {
    return INFILTRATION_NON_UNIFORM_COURIER_CONTEXT_TAGS
  }

  if (role === INFILTRATION_NON_UNIFORM_MAINTENANCE_COVER_ROLE) {
    return INFILTRATION_NON_UNIFORM_MAINTENANCE_CONTEXT_TAGS
  }

  return []
}

export function listActiveNonUniformIdentityContextTags(
  caseData: CaseInstance,
  coverRole?: InfiltrationCoverRole
): readonly string[] {
  const role = coverRole ?? caseData.infiltrationCoverProfile?.claimedRole

  if (role === undefined || !isNonUniformIdentityCoverRole(role)) {
    return []
  }

  const caseTags = collectCaseTags(caseData)
  return contextTagsForRole(role).filter((tag) => caseTags.has(tag)).sort()
}

export function isNonUniformIdentityInfiltrationCase(caseData: CaseInstance) {
  const profile = caseData.infiltrationCoverProfile

  if (profile === undefined || !isNonUniformIdentityCoverRole(profile.claimedRole)) {
    return false
  }

  return listActiveNonUniformIdentityContextTags(caseData, profile.claimedRole).length > 0
}

export function canProjectInfiltrationEncounterNonUniformIdentityTrees(caseData: CaseInstance) {
  const profile = caseData.infiltrationCoverProfile

  return (
    caseData.status === 'in_progress' &&
    isInfiltrationProbeEligible(caseData) &&
    profile !== undefined &&
    isNonUniformIdentityCoverRole(profile.claimedRole) &&
    isNonUniformIdentityInfiltrationCase(caseData)
  )
}

function resolveArchetypeLabel(
  role: InfiltrationCoverRole,
  activeContextTags: readonly string[]
): string {
  const activeTagSet = new Set(activeContextTags)
  const rules =
    role === INFILTRATION_NON_UNIFORM_COURIER_COVER_ROLE
      ? COURIER_ARCHETYPE_RULES
      : MAINTENANCE_ARCHETYPE_RULES

  for (const rule of rules) {
    if (rule.tags.some((tag) => activeTagSet.has(tag))) {
      return rule.label
    }
  }

  return role === INFILTRATION_NON_UNIFORM_COURIER_COVER_ROLE
    ? 'Vendor courier identity'
    : 'Vendor maintenance identity'
}

function resolvePostureLabel(
  role: InfiltrationCoverRole,
  documentTier: number,
  awareness: number,
  probeProgress: number
): string {
  if (awareness >= AWARENESS_COMPLICATION_THRESHOLD) {
    return `Non-uniform ${role} identity thinning — vendor-tree comparisons accelerating`
  }

  if (documentTier <= WEAK_DOCUMENT_TIER) {
    return 'Paper-thin vendor credentials — manifests may not survive spot checks'
  }

  if (probeProgress >= MID_EMBED_PROBE_PROGRESS) {
    return `Mid-embed ${role} posture — observers may cross-check recurring vendor patterns`
  }

  return `Early ${role} embed — room to establish non-institutional identity before scrutiny tightens`
}

function resolveBranchLabels(
  role: InfiltrationCoverRole,
  activeContextTags: readonly string[]
): readonly string[] {
  const labelMap =
    role === INFILTRATION_NON_UNIFORM_COURIER_COVER_ROLE
      ? COURIER_BRANCH_LABELS
      : MAINTENANCE_BRANCH_LABELS

  return activeContextTags.map(
    (tag) => labelMap[tag] ?? `${tag} context favors non-uniform ${role} identity branches`
  )
}

export interface InfiltrationEncounterNonUniformIdentityTrees {
  readonly visible: boolean
  readonly claimedRole: InfiltrationCoverRole
  readonly archetypeLabel: string
  readonly postureLabel: string
  readonly branchLabels: readonly string[]
  readonly identitySummaryLabel: string
}

const EMPTY_PROJECTION: InfiltrationEncounterNonUniformIdentityTrees = Object.freeze({
  visible: false,
  claimedRole: INFILTRATION_NON_UNIFORM_COURIER_COVER_ROLE,
  archetypeLabel: '',
  postureLabel: '',
  branchLabels: [],
  identitySummaryLabel: '',
})

/** Projects non-uniform identity tree prep labels for courier/maintenance + context tag cases. */
export function projectInfiltrationEncounterNonUniformIdentityTrees(
  caseData: CaseInstance
): InfiltrationEncounterNonUniformIdentityTrees {
  if (!canProjectInfiltrationEncounterNonUniformIdentityTrees(caseData)) {
    return EMPTY_PROJECTION
  }

  const profile = caseData.infiltrationCoverProfile!
  const claimedRole = profile.claimedRole
  const activeContextTags = listActiveNonUniformIdentityContextTags(caseData, claimedRole)
  const tracks = readInfiltrationProbeState(caseData)
  const archetypeLabel = resolveArchetypeLabel(claimedRole, activeContextTags)
  const postureLabel = resolvePostureLabel(
    claimedRole,
    profile.documentTier ?? 2,
    tracks.awareness,
    tracks.probeProgress
  )
  const branchLabels = resolveBranchLabels(claimedRole, activeContextTags)

  return Object.freeze({
    visible: true,
    claimedRole,
    archetypeLabel,
    postureLabel,
    branchLabels,
    identitySummaryLabel: `${archetypeLabel} — ${postureLabel.toLowerCase()}`,
  })
}
