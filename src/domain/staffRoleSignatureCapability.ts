/**
 * SPE-2222 slice 1: deterministic staff role signature capability schema.
 *
 * Each role package has one starting field niche before open progression.
 * This is not a progression tree, live staff record, GameState field, or
 * recruitment score. A recruitment-assessment family authorizes a channel
 * only; confidence, provenance, and hidden truth stay with their owners.
 */

export const STAFF_ROLE_SIGNATURE_NICHES = [
  'field_observation',
  'records_reconciliation',
  'containment_support',
  'public_interface',
  'logistics_control',
] as const
export type StaffRoleSignatureNiche = (typeof STAFF_ROLE_SIGNATURE_NICHES)[number]

/** CP-native recruitment-intelligence families. Source job titles are not capabilities. */
export const RECRUITMENT_ASSESSMENT_CAPABILITY_FAMILIES = [
  'candidate_background_assessment',
  'first_impression_assessment',
  'compatibility_assessment',
  'development_outlook',
  'direct_candidate_investigation',
] as const
export type RecruitmentAssessmentCapabilityFamily =
  (typeof RECRUITMENT_ASSESSMENT_CAPABILITY_FAMILIES)[number]

export interface StaffRoleSignatureCapability {
  readonly id: string
  readonly rolePackageRef: string
  readonly niche: StaffRoleSignatureNiche
  /** Present only when this package may open that assessment channel. */
  readonly recruitmentAssessmentFamily?: RecruitmentAssessmentCapabilityFamily
}

export interface StaffRoleSignatureValidationIssue {
  readonly code: string
  readonly field: string
  readonly capabilityId?: string
}

export interface StaffRoleSignatureValidationResult {
  readonly valid: boolean
  readonly issues: readonly StaffRoleSignatureValidationIssue[]
}

export type StaffRoleSignatureLookup =
  | { readonly status: 'found'; readonly capability: StaffRoleSignatureCapability }
  | { readonly status: 'unknown_capability_id' }
  | { readonly status: 'ambiguous_capability_id' }
  | { readonly status: 'invalid_capability_id' }

export type StaffRolePackageSignatureLookup =
  | { readonly status: 'found'; readonly capability: StaffRoleSignatureCapability }
  | { readonly status: 'unknown_role_package' }
  | { readonly status: 'duplicate_role_signature' }
  | { readonly status: 'invalid_role_package_ref' }

export interface RecruitmentAssessmentFamilyBinding {
  readonly rolePackageRef: string
  readonly family: RecruitmentAssessmentCapabilityFamily
}

const NICHE_SET: ReadonlySet<string> = new Set(STAFF_ROLE_SIGNATURE_NICHES)
const FAMILY_SET: ReadonlySet<string> = new Set(RECRUITMENT_ASSESSMENT_CAPABILITY_FAMILIES)
const SOURCE_SPECIFIC_LABELS: ReadonlySet<string> = new Set([
  'astrologer',
  'bartender',
  'receptionist',
  'scout',
])
const CAPABILITY_ID = /^role-signature:[a-z0-9]+(?:-[a-z0-9]+)*$/
const ROLE_PACKAGE_REF = /^role-package:[a-z0-9]+(?:-[a-z0-9]+)*$/

function compareStrings(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function token(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function usesSourceSpecificLabel(value: string): boolean {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 0)
    .some((part) => SOURCE_SPECIFIC_LABELS.has(part))
}

function freezeCapability(input: StaffRoleSignatureCapability): StaffRoleSignatureCapability {
  const capability: StaffRoleSignatureCapability = {
    id: input.id,
    rolePackageRef: input.rolePackageRef,
    niche: input.niche,
  }
  if (input.recruitmentAssessmentFamily !== undefined) {
    return Object.freeze({
      ...capability,
      recruitmentAssessmentFamily: input.recruitmentAssessmentFamily,
    })
  }
  return Object.freeze(capability)
}

function issuesResult(
  issues: StaffRoleSignatureValidationIssue[]
): StaffRoleSignatureValidationResult {
  const ordered = issues
    .slice()
    .sort(
      (a, b) =>
        compareStrings(a.code, b.code) ||
        compareStrings(a.field, b.field) ||
        compareStrings(a.capabilityId ?? '', b.capabilityId ?? '')
    )
  return Object.freeze({
    valid: ordered.length === 0,
    issues: Object.freeze(ordered.map((issue) => Object.freeze({ ...issue }))),
  })
}

function validateCapability(
  input: unknown,
  index: number,
  issues: StaffRoleSignatureValidationIssue[]
): StaffRoleSignatureCapability | null {
  const field = `capabilities[${index}]`
  if (!isPlainRecord(input)) {
    issues.push({ code: 'invalid_capability', field })
    return null
  }

  const id = token(input.id)
  const rolePackageRef = token(input.rolePackageRef)
  const niche = token(input.niche)
  let legal = true

  if (!CAPABILITY_ID.test(id) || usesSourceSpecificLabel(id)) {
    issues.push({
      code: 'invalid_capability_id',
      field: `${field}.id`,
      ...(id ? { capabilityId: id } : {}),
    })
    legal = false
  }
  if (!ROLE_PACKAGE_REF.test(rolePackageRef) || usesSourceSpecificLabel(rolePackageRef)) {
    issues.push({
      code: 'invalid_role_package_ref',
      field: `${field}.rolePackageRef`,
      ...(id ? { capabilityId: id } : {}),
    })
    legal = false
  }
  if (!NICHE_SET.has(niche) || usesSourceSpecificLabel(niche)) {
    issues.push({
      code: 'unknown_niche',
      field: `${field}.niche`,
      ...(id ? { capabilityId: id } : {}),
    })
    legal = false
  }

  const family = input.recruitmentAssessmentFamily
  if (family !== undefined && (typeof family !== 'string' || !FAMILY_SET.has(family))) {
    issues.push({
      code: 'unknown_recruitment_assessment_family',
      field: `${field}.recruitmentAssessmentFamily`,
      ...(id ? { capabilityId: id } : {}),
    })
    legal = false
  }

  if (!legal || !NICHE_SET.has(niche)) return null

  return freezeCapability({
    id,
    rolePackageRef,
    niche: niche as StaffRoleSignatureNiche,
    ...(family === undefined
      ? {}
      : { recruitmentAssessmentFamily: family as RecruitmentAssessmentCapabilityFamily }),
  })
}

/**
 * Accept a list of signature capabilities. Exactly one capability may name
 * each role package. Malformed ids, unknown niches/families, and source-specific
 * labels fail closed. Capability ids are authorable; registry membership is
 * checked by lookup. Input order is not significant.
 */
export function validateStaffRoleSignatureCapabilities(
  input: unknown
): StaffRoleSignatureValidationResult {
  if (!Array.isArray(input)) {
    return issuesResult([{ code: 'invalid_registry', field: 'capabilities' }])
  }

  const issues: StaffRoleSignatureValidationIssue[] = []
  const seenIds = new Set<string>()
  const seenRoles = new Set<string>()

  for (let index = 0; index < input.length; index += 1) {
    const capability = validateCapability(input[index], index, issues)
    if (!capability) continue
    if (seenIds.has(capability.id)) {
      issues.push({
        code: 'duplicate_capability_id',
        field: `capabilities[${index}].id`,
        capabilityId: capability.id,
      })
    }
    if (seenRoles.has(capability.rolePackageRef)) {
      issues.push({
        code: 'duplicate_role_signature',
        field: `capabilities[${index}].rolePackageRef`,
        capabilityId: capability.id,
      })
    }
    seenIds.add(capability.id)
    seenRoles.add(capability.rolePackageRef)
  }

  return issuesResult(issues)
}

/** Frozen copy sorted by capability id. Returns null when validation fails. */
export function normalizeStaffRoleSignatureCapabilities(
  input: readonly StaffRoleSignatureCapability[]
): readonly StaffRoleSignatureCapability[] | null {
  const validation = validateStaffRoleSignatureCapabilities(input)
  if (!validation.valid) return null
  const ordered = input
    .map((capability, index) => validateCapability(capability, index, [])!)
    .sort(
      (a, b) => compareStrings(a.id, b.id) || compareStrings(a.rolePackageRef, b.rolePackageRef)
    )
  return Object.freeze(ordered)
}

export function lookupStaffRoleSignatureCapability(
  capabilities: readonly StaffRoleSignatureCapability[],
  capabilityId: string
): StaffRoleSignatureLookup {
  const id = token(capabilityId)
  if (!CAPABILITY_ID.test(id) || usesSourceSpecificLabel(id)) {
    return Object.freeze({ status: 'invalid_capability_id' })
  }
  const matches = capabilities.filter((capability) => capability.id === id)
  if (matches.length === 0) return Object.freeze({ status: 'unknown_capability_id' })
  if (matches.length > 1) return Object.freeze({ status: 'ambiguous_capability_id' })
  return Object.freeze({ status: 'found', capability: freezeCapability(matches[0]!) })
}

export function lookupStaffRoleSignatureByRolePackage(
  capabilities: readonly StaffRoleSignatureCapability[],
  rolePackageRef: string
): StaffRolePackageSignatureLookup {
  const roleRef = token(rolePackageRef)
  if (!ROLE_PACKAGE_REF.test(roleRef) || usesSourceSpecificLabel(roleRef)) {
    return Object.freeze({ status: 'invalid_role_package_ref' })
  }
  const matches = capabilities.filter((capability) => capability.rolePackageRef === roleRef)
  if (matches.length === 0) return Object.freeze({ status: 'unknown_role_package' })
  if (matches.length > 1) return Object.freeze({ status: 'duplicate_role_signature' })
  return Object.freeze({ status: 'found', capability: freezeCapability(matches[0]!) })
}

/**
 * Role packages that expose a recruitment-assessment family, in role-ref order.
 * Does not score candidates or read hidden truth.
 */
export function recruitmentAssessmentFamiliesByRolePackage(
  capabilities: readonly StaffRoleSignatureCapability[]
): readonly RecruitmentAssessmentFamilyBinding[] {
  const bindings: RecruitmentAssessmentFamilyBinding[] = []
  for (const capability of capabilities) {
    if (capability.recruitmentAssessmentFamily === undefined) continue
    bindings.push(
      Object.freeze({
        rolePackageRef: capability.rolePackageRef,
        family: capability.recruitmentAssessmentFamily,
      })
    )
  }
  bindings.sort(
    (a, b) =>
      compareStrings(a.rolePackageRef, b.rolePackageRef) || compareStrings(a.family, b.family)
  )
  return Object.freeze(bindings)
}

/** Authored slice-1 fixtures. Not live staff and not a second role registry. */
export const STAFF_ROLE_SIGNATURE_FIXTURE_CAPABILITIES: readonly StaffRoleSignatureCapability[] =
  Object.freeze([
    Object.freeze({
      id: 'role-signature:candidate-screen',
      rolePackageRef: 'role-package:candidate-screen',
      niche: 'public_interface',
      recruitmentAssessmentFamily: 'first_impression_assessment',
    }),
    Object.freeze({
      id: 'role-signature:background-review',
      rolePackageRef: 'role-package:background-review',
      niche: 'records_reconciliation',
      recruitmentAssessmentFamily: 'candidate_background_assessment',
    }),
    Object.freeze({
      id: 'role-signature:containment-tech',
      rolePackageRef: 'role-package:containment-tech',
      niche: 'containment_support',
    }),
  ])
