/**
 * SPE-1046: pure revocation/downgrade access outcome substrate over
 * read-only affiliation evidence. No persistence, weekly mutation, UI
 * surfacing, or enforcement wiring.
 */

import type { AffiliationDualLoyaltyDecision } from './affiliationDualLoyaltyRisk'
import type { AffiliationOnboardingDecision } from './affiliationOnboardingReadiness'
import type {
  AffiliationProtectedActionDecision,
  AffiliationProtectedActionOutcome,
} from './affiliationProtectedStatusActions'
import type { AffiliationSiteClearanceDecision } from './affiliationSiteClearance'
import {
  ENTITY_WELFARE_PERMISSION_SURFACES,
  type EntityWelfarePermissionDecision,
  type EntityWelfarePermissionSurface,
} from './entityWelfareStatusPermissions'

export type AffiliationRevocationKind =
  | 'suspension'
  | 'downgrade'
  | 'revocation'
  | 'quarantine'
  | 'expulsion'
  | 'probation'
  | 'clearance_review'
  | 'unknown'

export const AFFILIATION_REVOCATION_KINDS: readonly AffiliationRevocationKind[] = [
  'suspension',
  'downgrade',
  'revocation',
  'quarantine',
  'expulsion',
  'probation',
  'clearance_review',
  'unknown',
] as const

export type AffiliationRevocationCause =
  | 'policy_violation'
  | 'betrayal'
  | 'corruption'
  | 'trauma_instability'
  | 'exposure_risk'
  | 'patron_influence'
  | 'medical_hold'
  | 'site_breach'
  | 'dual_loyalty'
  | 'protected_status'
  | 'unknown'

export const AFFILIATION_REVOCATION_CAUSES: readonly AffiliationRevocationCause[] = [
  'policy_violation',
  'betrayal',
  'corruption',
  'trauma_instability',
  'exposure_risk',
  'patron_influence',
  'medical_hold',
  'site_breach',
  'dual_loyalty',
  'protected_status',
  'unknown',
] as const

export type AffiliationRevocationOutcome =
  | 'unchanged'
  | 'restricted'
  | 'downgraded'
  | 'suspended'
  | 'revoked'
  | 'blocked'

export const AFFILIATION_REVOCATION_OUTCOMES: readonly AffiliationRevocationOutcome[] = [
  'unchanged',
  'restricted',
  'downgraded',
  'suspended',
  'revoked',
  'blocked',
] as const

export type AffiliationTrustOutcome =
  | 'trusted'
  | 'watch'
  | 'restricted'
  | 'probation'
  | 'suspended'
  | 'revoked'
  | 'blocked'

export interface AffiliationRevocationOutcomeInput {
  readonly subjectId?: string
  readonly subjectLabel?: string
  readonly kind?: AffiliationRevocationKind
  readonly cause?: AffiliationRevocationCause
  readonly affectedSurfaces?: readonly EntityWelfarePermissionSurface[]
  readonly priorTrustBand?: AffiliationTrustOutcome
  readonly reviewEvidenceRefs?: readonly string[]
  readonly permissionDecision?: EntityWelfarePermissionDecision
  readonly onboardingDecision?: AffiliationOnboardingDecision
  readonly siteClearanceDecision?: AffiliationSiteClearanceDecision
  readonly dualLoyaltyDecision?: AffiliationDualLoyaltyDecision
  readonly protectedActionDecision?: AffiliationProtectedActionDecision
}

export interface AffiliationRevocationDecision {
  readonly subjectId: string
  readonly subjectLabel: string
  readonly kind: AffiliationRevocationKind
  readonly kindLabel: string
  readonly cause: AffiliationRevocationCause
  readonly causeLabel: string
  readonly outcome: AffiliationRevocationOutcome
  readonly outcomeLabel: string
  readonly trustOutcome: AffiliationTrustOutcome
  readonly trustOutcomeLabel: string
  readonly decisionLabel: string
  readonly affectedSurfaces: readonly EntityWelfarePermissionSurface[]
  readonly affectedSurfaceLabels: readonly string[]
  readonly blockedSurfaces: readonly EntityWelfarePermissionSurface[]
  readonly blockedSurfaceLabels: readonly string[]
  readonly reviewEvidenceRefs: readonly string[]
  readonly reasonCodes: readonly string[]
}

type RevocationInputLike = Partial<AffiliationRevocationOutcomeInput> & Record<string, unknown>

const OUTCOME_RANK: Readonly<Record<AffiliationRevocationOutcome, number>> = {
  unchanged: 0,
  restricted: 1,
  downgraded: 2,
  suspended: 3,
  revoked: 4,
  blocked: 5,
} as const

const TRUST_RANK: Readonly<Record<AffiliationTrustOutcome, number>> = {
  trusted: 0,
  watch: 1,
  restricted: 2,
  probation: 3,
  suspended: 4,
  revoked: 5,
  blocked: 6,
} as const

const DEFAULT_SENSITIVE_SURFACES: readonly EntityWelfarePermissionSurface[] = [
  'file',
  'gear',
  'mission',
] as const

const QUARANTINE_SURFACES: readonly EntityWelfarePermissionSurface[] = [
  'room',
  'housing',
  'mission',
] as const

const BLOCKING_CAUSES: ReadonlySet<AffiliationRevocationCause> = new Set(['betrayal', 'corruption'])

const RESTRICTING_CAUSES: ReadonlySet<AffiliationRevocationCause> = new Set([
  'dual_loyalty',
  'exposure_risk',
  'patron_influence',
  'site_breach',
  'trauma_instability',
])

const CARE_CAUSES: ReadonlySet<AffiliationRevocationCause> = new Set([
  'medical_hold',
  'protected_status',
])

function isRecord(value: unknown): value is RevocationInputLike {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
    (left, right) => left.localeCompare(right)
  )
}

function uniqueSurfaceOrder(values: readonly EntityWelfarePermissionSurface[]) {
  return ENTITY_WELFARE_PERMISSION_SURFACES.filter((surface) => values.includes(surface))
}

function formatEnumLabel(value: string) {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? `${part[0]?.toUpperCase()}${part.slice(1)}` : part))
    .join(' ')
}

function coerceKind(kind: unknown): AffiliationRevocationKind {
  return AFFILIATION_REVOCATION_KINDS.includes(kind as AffiliationRevocationKind)
    ? (kind as AffiliationRevocationKind)
    : 'unknown'
}

function coerceCause(cause: unknown): AffiliationRevocationCause {
  return AFFILIATION_REVOCATION_CAUSES.includes(cause as AffiliationRevocationCause)
    ? (cause as AffiliationRevocationCause)
    : 'unknown'
}

function coerceTrustOutcome(value: unknown): AffiliationTrustOutcome {
  return typeof value === 'string' && value in TRUST_RANK
    ? (value as AffiliationTrustOutcome)
    : 'watch'
}

function coerceSurface(surface: unknown): EntityWelfarePermissionSurface | null {
  return ENTITY_WELFARE_PERMISSION_SURFACES.includes(surface as EntityWelfarePermissionSurface)
    ? (surface as EntityWelfarePermissionSurface)
    : null
}

function normalizeSubjectId(input: RevocationInputLike | null) {
  const subjectId = normalizeToken(input?.subjectId)
  return subjectId.length > 0 ? subjectId : 'subject:unknown'
}

function normalizeSubjectLabel(input: RevocationInputLike | null, subjectId: string) {
  const subjectLabel = normalizeToken(input?.subjectLabel)
  return subjectLabel.length > 0 ? subjectLabel : subjectId
}

function normalizeStringList(values: unknown) {
  if (!Array.isArray(values)) {
    return []
  }

  return uniqueSorted(values.map((value) => normalizeToken(value)))
}

function normalizeAffectedSurfaces(values: unknown) {
  if (!Array.isArray(values)) {
    return []
  }

  return uniqueSurfaceOrder(
    values
      .map((value) => coerceSurface(value))
      .filter((surface): surface is EntityWelfarePermissionSurface => surface !== null)
  )
}

function maxOutcome(current: AffiliationRevocationOutcome, next: AffiliationRevocationOutcome) {
  return OUTCOME_RANK[next] > OUTCOME_RANK[current] ? next : current
}

function maxTrust(current: AffiliationTrustOutcome, next: AffiliationTrustOutcome) {
  return TRUST_RANK[next] > TRUST_RANK[current] ? next : current
}

function getValidationReasonCodes(
  input: RevocationInputLike | null,
  kind: AffiliationRevocationKind,
  cause: AffiliationRevocationCause
) {
  const reasonCodes: string[] = []

  if (!input) {
    return ['invalid_revocation_input']
  }

  if (!normalizeToken(input.subjectId)) {
    reasonCodes.push('missing_subject_id')
  }

  if (input.kind !== undefined && input.kind !== kind) {
    reasonCodes.push('invalid_revocation_kind')
  }

  if (input.cause !== undefined && input.cause !== cause) {
    reasonCodes.push('invalid_revocation_cause')
  }

  if (
    Array.isArray(input.affectedSurfaces) &&
    input.affectedSurfaces.some((surface) => coerceSurface(surface) === null)
  ) {
    reasonCodes.push('invalid_affected_surface')
  }

  return uniqueSorted(reasonCodes)
}

function defaultAffectedSurfaces(
  kind: AffiliationRevocationKind,
  affectedSurfaces: readonly EntityWelfarePermissionSurface[]
) {
  if (affectedSurfaces.length > 0) {
    return affectedSurfaces
  }

  if (kind === 'quarantine') {
    return QUARANTINE_SURFACES
  }

  if (kind === 'revocation' || kind === 'expulsion' || kind === 'downgrade') {
    return DEFAULT_SENSITIVE_SURFACES
  }

  return ENTITY_WELFARE_PERMISSION_SURFACES
}

function basePolicy(
  kind: AffiliationRevocationKind,
  cause: AffiliationRevocationCause,
  affectedSurfaces: readonly EntityWelfarePermissionSurface[],
  priorTrustBand: AffiliationTrustOutcome
) {
  let outcome: AffiliationRevocationOutcome = 'unchanged'
  let trustOutcome: AffiliationTrustOutcome = priorTrustBand
  const reasonCodes: string[] = []
  const blockedSurfaces: EntityWelfarePermissionSurface[] = []

  if (kind === 'unknown') {
    outcome = maxOutcome(outcome, 'restricted')
    trustOutcome = maxTrust(trustOutcome, 'watch')
    reasonCodes.push('unknown_revocation_kind_restricted')
  }

  if (cause === 'unknown') {
    outcome = maxOutcome(outcome, 'restricted')
    trustOutcome = maxTrust(trustOutcome, 'watch')
    reasonCodes.push('unknown_revocation_cause_restricted')
  }

  if (kind === 'suspension') {
    outcome = maxOutcome(outcome, 'suspended')
    trustOutcome = maxTrust(trustOutcome, 'suspended')
    blockedSurfaces.push(...affectedSurfaces.filter((surface) => surface !== 'housing'))
    reasonCodes.push('suspension_access_suspended')
  } else if (kind === 'probation' || kind === 'clearance_review') {
    outcome = maxOutcome(outcome, 'restricted')
    trustOutcome = maxTrust(trustOutcome, kind === 'probation' ? 'probation' : 'restricted')
    reasonCodes.push(`${kind}_access_restricted`)
  } else if (kind === 'downgrade') {
    outcome = maxOutcome(outcome, 'downgraded')
    trustOutcome = maxTrust(trustOutcome, 'restricted')
    blockedSurfaces.push(
      ...affectedSurfaces.filter((surface) => surface === 'file' || surface === 'gear')
    )
    reasonCodes.push('downgrade_sensitive_access_reduced')
  } else if (kind === 'revocation' || kind === 'expulsion') {
    outcome = maxOutcome(outcome, 'revoked')
    trustOutcome = maxTrust(trustOutcome, 'revoked')
    blockedSurfaces.push(
      ...affectedSurfaces.filter(
        (surface) => surface === 'file' || surface === 'gear' || surface === 'mission'
      )
    )
    reasonCodes.push(`${kind}_sensitive_access_revoked`)
  } else if (kind === 'quarantine') {
    outcome = maxOutcome(outcome, 'suspended')
    trustOutcome = maxTrust(trustOutcome, 'suspended')
    blockedSurfaces.push(...affectedSurfaces.filter((surface) => surface === 'mission'))
    reasonCodes.push('quarantine_mission_site_movement_blocked')
  }

  if (BLOCKING_CAUSES.has(cause)) {
    outcome = maxOutcome(outcome, 'blocked')
    trustOutcome = maxTrust(trustOutcome, 'blocked')
    blockedSurfaces.push(...ENTITY_WELFARE_PERMISSION_SURFACES)
    reasonCodes.push(`${cause}_revocation_blocked`)
  } else if (RESTRICTING_CAUSES.has(cause)) {
    outcome = maxOutcome(outcome, 'restricted')
    trustOutcome = maxTrust(trustOutcome, 'restricted')
    reasonCodes.push(`${cause}_revocation_restricted`)
  } else if (CARE_CAUSES.has(cause)) {
    outcome = maxOutcome(outcome, 'restricted')
    trustOutcome = maxTrust(trustOutcome, 'restricted')
    blockedSurfaces.push(...affectedSurfaces.filter((surface) => surface === 'mission'))
    reasonCodes.push(`${cause}_care_outcome_restricted`)
  } else if (cause === 'policy_violation') {
    outcome = maxOutcome(outcome, 'restricted')
    trustOutcome = maxTrust(trustOutcome, 'probation')
    reasonCodes.push('policy_violation_review_required')
  }

  if (reasonCodes.length === 0) {
    reasonCodes.push('revocation_outcome_unchanged')
  }

  return { outcome, trustOutcome, blockedSurfaces, reasonCodes }
}

function applyUpstreamPolicy(
  input: RevocationInputLike | null,
  currentOutcome: AffiliationRevocationOutcome,
  currentTrust: AffiliationTrustOutcome,
  currentBlockedSurfaces: readonly EntityWelfarePermissionSurface[],
  currentReasonCodes: readonly string[]
) {
  let outcome = currentOutcome
  let trustOutcome = currentTrust
  const blockedSurfaces = [...currentBlockedSurfaces]
  const reasonCodes = [...currentReasonCodes]

  if (input?.permissionDecision?.outcome === 'blocked') {
    outcome = maxOutcome(outcome, 'blocked')
    trustOutcome = maxTrust(trustOutcome, 'blocked')
    blockedSurfaces.push(input.permissionDecision.surface)
    reasonCodes.push('upstream_permission_blocked')
  } else if (input?.permissionDecision?.outcome === 'restricted') {
    outcome = maxOutcome(outcome, 'restricted')
    trustOutcome = maxTrust(trustOutcome, 'restricted')
    reasonCodes.push('upstream_permission_restricted')
  }

  if (input?.siteClearanceDecision?.outcome === 'blocked') {
    outcome = maxOutcome(outcome, 'blocked')
    trustOutcome = maxTrust(trustOutcome, 'blocked')
    blockedSurfaces.push(input.siteClearanceDecision.surface)
    reasonCodes.push('upstream_site_clearance_blocked')
  } else if (input?.siteClearanceDecision?.outcome === 'restricted') {
    outcome = maxOutcome(outcome, 'restricted')
    trustOutcome = maxTrust(trustOutcome, 'restricted')
    reasonCodes.push('upstream_site_clearance_restricted')
  }

  if (input?.dualLoyaltyDecision?.riskLevel === 'blocked') {
    outcome = maxOutcome(outcome, 'blocked')
    trustOutcome = maxTrust(trustOutcome, 'blocked')
    blockedSurfaces.push(...ENTITY_WELFARE_PERMISSION_SURFACES)
    reasonCodes.push('upstream_dual_loyalty_blocked')
  } else if (input?.dualLoyaltyDecision?.riskLevel === 'restricted') {
    outcome = maxOutcome(outcome, 'restricted')
    trustOutcome = maxTrust(trustOutcome, 'restricted')
    reasonCodes.push('upstream_dual_loyalty_restricted')
  }

  if (
    input?.protectedActionDecision?.outcome ===
    ('blocked' satisfies AffiliationProtectedActionOutcome)
  ) {
    outcome = maxOutcome(outcome, 'blocked')
    trustOutcome = maxTrust(trustOutcome, 'blocked')
    blockedSurfaces.push(...input.protectedActionDecision.restrictedSurfaces)
    reasonCodes.push('upstream_protected_action_blocked')
  } else if (
    input?.protectedActionDecision?.outcome ===
    ('restricted' satisfies AffiliationProtectedActionOutcome)
  ) {
    outcome = maxOutcome(outcome, 'restricted')
    trustOutcome = maxTrust(trustOutcome, 'restricted')
    reasonCodes.push('upstream_protected_action_restricted')
  }

  if (input?.onboardingDecision?.stage === 'lost') {
    outcome = maxOutcome(outcome, 'blocked')
    trustOutcome = maxTrust(trustOutcome, 'blocked')
    blockedSurfaces.push(...ENTITY_WELFARE_PERMISSION_SURFACES)
    reasonCodes.push('upstream_onboarding_lost_blocked')
  } else if (input?.onboardingDecision && !input.onboardingDecision.fullAccessEligible) {
    outcome = maxOutcome(outcome, 'restricted')
    trustOutcome = maxTrust(trustOutcome, 'restricted')
    reasonCodes.push(`upstream_onboarding_${input.onboardingDecision.stage}_restricted`)
  }

  return { outcome, trustOutcome, blockedSurfaces, reasonCodes }
}

export function evaluateAffiliationRevocationOutcome(
  input: AffiliationRevocationOutcomeInput
): AffiliationRevocationDecision {
  const inputRecord = isRecord(input) ? input : null
  const subjectId = normalizeSubjectId(inputRecord)
  const subjectLabel = normalizeSubjectLabel(inputRecord, subjectId)
  const kind = coerceKind(inputRecord?.kind)
  const cause = coerceCause(inputRecord?.cause)
  const priorTrustBand = coerceTrustOutcome(inputRecord?.priorTrustBand)
  const reviewEvidenceRefs = normalizeStringList(inputRecord?.reviewEvidenceRefs)
  const affectedSurfaces = defaultAffectedSurfaces(
    kind,
    normalizeAffectedSurfaces(inputRecord?.affectedSurfaces)
  )
  const policy = basePolicy(kind, cause, affectedSurfaces, priorTrustBand)
  const upstream = applyUpstreamPolicy(
    inputRecord,
    policy.outcome,
    policy.trustOutcome,
    policy.blockedSurfaces,
    policy.reasonCodes
  )
  const validationReasonCodes = getValidationReasonCodes(inputRecord, kind, cause)
  const blockedSurfaces = uniqueSurfaceOrder(upstream.blockedSurfaces)

  return Object.freeze({
    subjectId,
    subjectLabel,
    kind,
    kindLabel: formatEnumLabel(kind),
    cause,
    causeLabel: formatEnumLabel(cause),
    outcome: upstream.outcome,
    outcomeLabel: formatEnumLabel(upstream.outcome),
    trustOutcome: upstream.trustOutcome,
    trustOutcomeLabel: formatEnumLabel(upstream.trustOutcome),
    decisionLabel: `${formatEnumLabel(kind)}: ${formatEnumLabel(upstream.outcome)}`,
    affectedSurfaces: Object.freeze(affectedSurfaces),
    affectedSurfaceLabels: Object.freeze(
      affectedSurfaces.map((surface) => formatEnumLabel(surface))
    ),
    blockedSurfaces: Object.freeze(blockedSurfaces),
    blockedSurfaceLabels: Object.freeze(blockedSurfaces.map((surface) => formatEnumLabel(surface))),
    reviewEvidenceRefs: Object.freeze(reviewEvidenceRefs),
    reasonCodes: Object.freeze(uniqueSorted([...upstream.reasonCodes, ...validationReasonCodes])),
  })
}

export function evaluateAffiliationRevocationOutcomeSet(
  inputs: readonly AffiliationRevocationOutcomeInput[]
): readonly AffiliationRevocationDecision[] {
  return Object.freeze(
    [...inputs]
      .map((input) => evaluateAffiliationRevocationOutcome(input))
      .sort((left, right) => {
        const subjectOrder = left.subjectId.localeCompare(right.subjectId)
        if (subjectOrder !== 0) return subjectOrder

        const kindOrder =
          AFFILIATION_REVOCATION_KINDS.indexOf(left.kind) -
          AFFILIATION_REVOCATION_KINDS.indexOf(right.kind)
        if (kindOrder !== 0) return kindOrder

        return (
          AFFILIATION_REVOCATION_CAUSES.indexOf(left.cause) -
          AFFILIATION_REVOCATION_CAUSES.indexOf(right.cause)
        )
      })
  )
}
