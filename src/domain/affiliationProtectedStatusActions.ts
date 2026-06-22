/**
 * SPE-1046: pure protected-status action restriction substrate over
 * read-only subject evidence. No persistence, weekly mutation, UI surfacing,
 * or enforcement wiring.
 */

import type { AffiliationDualLoyaltyDecision } from './affiliationDualLoyaltyRisk'
import type { AffiliationOnboardingDecision } from './affiliationOnboardingReadiness'
import type { AffiliationSiteClearanceDecision } from './affiliationSiteClearance'
import {
  ENTITY_WELFARE_PERMISSION_SURFACES,
  type EntityWelfarePermissionDecision,
  type EntityWelfarePermissionOutcome,
  type EntityWelfarePermissionSurface,
} from './entityWelfareStatusPermissions'

export type AffiliationProtectedStatus =
  | 'civilian'
  | 'witness'
  | 'contractor'
  | 'probationary_staff'
  | 'full_staff'
  | 'allied_personnel'
  | 'detainee'
  | 'informant'
  | 'compromised_person'
  | 'patient'
  | 'minor'
  | 'sapient_remains'
  | 'unknown'

export const AFFILIATION_PROTECTED_STATUSES: readonly AffiliationProtectedStatus[] = [
  'civilian',
  'witness',
  'contractor',
  'probationary_staff',
  'full_staff',
  'allied_personnel',
  'detainee',
  'informant',
  'compromised_person',
  'patient',
  'minor',
  'sapient_remains',
  'unknown',
] as const

export type AffiliationProtectedAction =
  | 'assign_mission'
  | 'grant_file_access'
  | 'grant_gear_access'
  | 'grant_room_access'
  | 'assign_housing'
  | 'transfer_site'
  | 'interrogate'
  | 'restrain'
  | 'sedate'
  | 'disclose_identity'
  | 'release'
  | 'quarantine'

export const AFFILIATION_PROTECTED_ACTIONS: readonly AffiliationProtectedAction[] = [
  'assign_mission',
  'grant_file_access',
  'grant_gear_access',
  'grant_room_access',
  'assign_housing',
  'transfer_site',
  'interrogate',
  'restrain',
  'sedate',
  'disclose_identity',
  'release',
  'quarantine',
] as const

export type AffiliationProtectedActionOutcome = EntityWelfarePermissionOutcome

export interface AffiliationProtectedStatusActionInput {
  readonly subjectId?: string
  readonly subjectLabel?: string
  readonly protectedStatus?: AffiliationProtectedStatus
  readonly action?: AffiliationProtectedAction
  readonly minor?: boolean
  readonly medicalHold?: boolean
  readonly careDutyActive?: boolean
  readonly dueProcessRequired?: boolean
  readonly reviewEvidenceRefs?: readonly string[]
  readonly permissionDecision?: EntityWelfarePermissionDecision
  readonly onboardingDecision?: AffiliationOnboardingDecision
  readonly siteClearanceDecision?: AffiliationSiteClearanceDecision
  readonly dualLoyaltyDecision?: AffiliationDualLoyaltyDecision
}

export interface AffiliationProtectedActionDecision {
  readonly subjectId: string
  readonly subjectLabel: string
  readonly protectedStatus: AffiliationProtectedStatus
  readonly protectedStatusLabel: string
  readonly action: AffiliationProtectedAction
  readonly actionLabel: string
  readonly outcome: AffiliationProtectedActionOutcome
  readonly outcomeLabel: string
  readonly decisionLabel: string
  readonly restrictedSurfaces: readonly EntityWelfarePermissionSurface[]
  readonly restrictedSurfaceLabels: readonly string[]
  readonly requiredReviewGates: readonly string[]
  readonly reviewEvidenceRefs: readonly string[]
  readonly reasonCodes: readonly string[]
}

type ProtectedStatusActionInputLike = Partial<AffiliationProtectedStatusActionInput> &
  Record<string, unknown>

const OUTCOME_RANK: Readonly<Record<AffiliationProtectedActionOutcome, number>> = {
  allowed: 0,
  restricted: 1,
  blocked: 2,
} as const

const CARE_PROTECTED_STATUSES: ReadonlySet<AffiliationProtectedStatus> = new Set([
  'minor',
  'patient',
  'sapient_remains',
])

const EXTERNAL_PROTECTED_STATUSES: ReadonlySet<AffiliationProtectedStatus> = new Set([
  'civilian',
  'witness',
  'informant',
  'contractor',
])

const STAFF_STATUSES: ReadonlySet<AffiliationProtectedStatus> = new Set([
  'full_staff',
  'probationary_staff',
  'allied_personnel',
])

const CUSTODY_STATUSES: ReadonlySet<AffiliationProtectedStatus> = new Set([
  'detainee',
  'compromised_person',
])

const COERCIVE_ACTIONS: ReadonlySet<AffiliationProtectedAction> = new Set([
  'interrogate',
  'restrain',
  'sedate',
  'disclose_identity',
])

const HIGH_RISK_ACTIONS: ReadonlySet<AffiliationProtectedAction> = new Set([
  ...COERCIVE_ACTIONS,
  'assign_mission',
])

const ACCESS_ACTION_SURFACES: Readonly<
  Partial<Record<AffiliationProtectedAction, EntityWelfarePermissionSurface>>
> = {
  assign_housing: 'housing',
  assign_mission: 'mission',
  grant_file_access: 'file',
  grant_gear_access: 'gear',
  grant_room_access: 'room',
}

function isRecord(value: unknown): value is ProtectedStatusActionInputLike {
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

function coerceProtectedStatus(status: unknown): AffiliationProtectedStatus {
  return AFFILIATION_PROTECTED_STATUSES.includes(status as AffiliationProtectedStatus)
    ? (status as AffiliationProtectedStatus)
    : 'unknown'
}

function coerceAction(action: unknown): AffiliationProtectedAction {
  return AFFILIATION_PROTECTED_ACTIONS.includes(action as AffiliationProtectedAction)
    ? (action as AffiliationProtectedAction)
    : 'assign_mission'
}

function normalizeSubjectId(input: ProtectedStatusActionInputLike | null) {
  const subjectId = normalizeToken(input?.subjectId)
  return subjectId.length > 0 ? subjectId : 'subject:unknown'
}

function normalizeSubjectLabel(input: ProtectedStatusActionInputLike | null, subjectId: string) {
  const subjectLabel = normalizeToken(input?.subjectLabel)
  return subjectLabel.length > 0 ? subjectLabel : subjectId
}

function normalizeStringList(values: unknown) {
  if (!Array.isArray(values)) {
    return []
  }

  return uniqueSorted(values.map((value) => normalizeToken(value)))
}

function maxOutcome(
  current: AffiliationProtectedActionOutcome,
  next: AffiliationProtectedActionOutcome
) {
  return OUTCOME_RANK[next] > OUTCOME_RANK[current] ? next : current
}

function getValidationReasonCodes(
  input: ProtectedStatusActionInputLike | null,
  protectedStatus: AffiliationProtectedStatus,
  action: AffiliationProtectedAction
) {
  const reasonCodes: string[] = []

  if (!input) {
    return ['invalid_protected_status_action_input']
  }

  if (!normalizeToken(input.subjectId)) {
    reasonCodes.push('missing_subject_id')
  }

  if (input.protectedStatus !== undefined && input.protectedStatus !== protectedStatus) {
    reasonCodes.push('invalid_protected_status')
  }

  if (input.action !== undefined && input.action !== action) {
    reasonCodes.push('invalid_protected_action')
  }

  return uniqueSorted(reasonCodes)
}

function basePolicy(
  protectedStatus: AffiliationProtectedStatus,
  action: AffiliationProtectedAction,
  input: ProtectedStatusActionInputLike | null
) {
  let outcome: AffiliationProtectedActionOutcome = 'allowed'
  const reasonCodes: string[] = []
  const requiredReviewGates: string[] = []
  const restrictedSurfaces: EntityWelfarePermissionSurface[] = []
  const hasReviewEvidence = normalizeStringList(input?.reviewEvidenceRefs).length > 0
  const accessSurface = ACCESS_ACTION_SURFACES[action]

  if (protectedStatus === 'unknown') {
    outcome = maxOutcome(outcome, 'restricted')
    reasonCodes.push('unknown_protected_status_restricted')
    requiredReviewGates.push('protected_status_review')
  }

  if (input?.minor === true && protectedStatus !== 'minor') {
    outcome = maxOutcome(outcome, 'blocked')
    reasonCodes.push('minor_evidence_status_mismatch_blocked')
  }

  if (input?.medicalHold === true && protectedStatus !== 'patient') {
    outcome = maxOutcome(outcome, 'restricted')
    reasonCodes.push('medical_hold_review_required')
    requiredReviewGates.push('medical_review')
  }

  if (CARE_PROTECTED_STATUSES.has(protectedStatus)) {
    if (HIGH_RISK_ACTIONS.has(action)) {
      outcome = maxOutcome(outcome, 'blocked')
      reasonCodes.push(`${protectedStatus}_${action}_blocked`)
    } else if (action === 'assign_housing' && input?.careDutyActive === true) {
      reasonCodes.push(`${protectedStatus}_care_housing_allowed`)
    } else if (action === 'release' || action === 'quarantine' || action === 'assign_housing') {
      outcome = maxOutcome(outcome, 'restricted')
      reasonCodes.push(`${protectedStatus}_${action}_care_review_required`)
      requiredReviewGates.push('care_duty_review')
      if (accessSurface) restrictedSurfaces.push(accessSurface)
    }
  }

  if (EXTERNAL_PROTECTED_STATUSES.has(protectedStatus)) {
    if (COERCIVE_ACTIONS.has(action)) {
      outcome = maxOutcome(outcome, hasReviewEvidence ? 'restricted' : 'blocked')
      reasonCodes.push(
        hasReviewEvidence
          ? `${protectedStatus}_${action}_review_restricted`
          : `${protectedStatus}_${action}_review_evidence_required`
      )
      requiredReviewGates.push('civilian_protection_review')
    } else if (accessSurface) {
      outcome = maxOutcome(outcome, 'restricted')
      restrictedSurfaces.push(accessSurface)
      reasonCodes.push(`${protectedStatus}_${accessSurface}_access_restricted`)
    }
  }

  if (STAFF_STATUSES.has(protectedStatus)) {
    if (protectedStatus === 'probationary_staff') {
      outcome = maxOutcome(outcome, 'restricted')
      reasonCodes.push('probationary_staff_access_restricted')
      if (accessSurface) restrictedSurfaces.push(accessSurface)
    } else {
      reasonCodes.push(`${protectedStatus}_action_baseline_allowed`)
    }
  }

  if (CUSTODY_STATUSES.has(protectedStatus)) {
    if (action === 'release' || action === 'transfer_site') {
      outcome = maxOutcome(outcome, 'restricted')
      reasonCodes.push(`${protectedStatus}_${action}_due_process_required`)
      requiredReviewGates.push('due_process_review')
    } else if (accessSurface && accessSurface !== 'housing') {
      outcome = maxOutcome(outcome, accessSurface === 'room' ? 'restricted' : 'blocked')
      restrictedSurfaces.push(accessSurface)
      reasonCodes.push(`${protectedStatus}_${accessSurface}_access_restricted`)
    }
  }

  if (input?.dueProcessRequired === true && !hasReviewEvidence) {
    outcome = maxOutcome(outcome, 'restricted')
    reasonCodes.push('due_process_evidence_required')
    requiredReviewGates.push('due_process_review')
  }

  if (reasonCodes.length === 0) {
    reasonCodes.push(`${protectedStatus}_${action}_allowed`)
  }

  return {
    outcome,
    reasonCodes,
    requiredReviewGates,
    restrictedSurfaces,
  }
}

function applyUpstreamPolicy(
  input: ProtectedStatusActionInputLike | null,
  action: AffiliationProtectedAction,
  currentOutcome: AffiliationProtectedActionOutcome,
  currentReasonCodes: readonly string[],
  currentRestrictedSurfaces: readonly EntityWelfarePermissionSurface[]
) {
  let outcome = currentOutcome
  const reasonCodes = [...currentReasonCodes]
  const restrictedSurfaces = [...currentRestrictedSurfaces]
  const actionSurface = ACCESS_ACTION_SURFACES[action]

  if (input?.permissionDecision) {
    const decision = input.permissionDecision
    if (!actionSurface || decision.surface === actionSurface) {
      if (decision.outcome === 'blocked') {
        outcome = maxOutcome(outcome, 'blocked')
        reasonCodes.push('upstream_permission_blocked')
      } else if (decision.outcome === 'restricted') {
        outcome = maxOutcome(outcome, 'restricted')
        reasonCodes.push('upstream_permission_restricted')
        restrictedSurfaces.push(decision.surface)
      }
    }
  }

  if (input?.siteClearanceDecision) {
    const decision = input.siteClearanceDecision
    if (!actionSurface || decision.surface === actionSurface) {
      if (decision.outcome === 'blocked') {
        outcome = maxOutcome(outcome, 'blocked')
        reasonCodes.push('upstream_site_clearance_blocked')
      } else if (decision.outcome === 'restricted') {
        outcome = maxOutcome(outcome, 'restricted')
        reasonCodes.push('upstream_site_clearance_restricted')
        restrictedSurfaces.push(decision.surface)
      }
    }
  }

  if (input?.dualLoyaltyDecision?.riskLevel === 'blocked') {
    outcome = maxOutcome(outcome, 'blocked')
    reasonCodes.push('upstream_dual_loyalty_blocked')
    restrictedSurfaces.push(...ENTITY_WELFARE_PERMISSION_SURFACES)
  } else if (input?.dualLoyaltyDecision?.riskLevel === 'restricted') {
    outcome = maxOutcome(outcome, 'restricted')
    reasonCodes.push('upstream_dual_loyalty_restricted')
    restrictedSurfaces.push(...input.dualLoyaltyDecision.restrictedSurfaces)
  }

  if (input?.onboardingDecision?.stage === 'lost') {
    outcome = maxOutcome(outcome, 'blocked')
    reasonCodes.push('upstream_onboarding_lost_blocked')
  } else if (input?.onboardingDecision && !input.onboardingDecision.fullAccessEligible) {
    outcome = maxOutcome(outcome, 'restricted')
    reasonCodes.push(`upstream_onboarding_${input.onboardingDecision.stage}_restricted`)
    if (actionSurface) restrictedSurfaces.push(actionSurface)
  }

  return {
    outcome,
    reasonCodes,
    restrictedSurfaces,
  }
}

export function evaluateAffiliationProtectedStatusAction(
  input: AffiliationProtectedStatusActionInput
): AffiliationProtectedActionDecision {
  const inputRecord = isRecord(input) ? input : null
  const subjectId = normalizeSubjectId(inputRecord)
  const subjectLabel = normalizeSubjectLabel(inputRecord, subjectId)
  const protectedStatus = coerceProtectedStatus(inputRecord?.protectedStatus)
  const action = coerceAction(inputRecord?.action)
  const reviewEvidenceRefs = normalizeStringList(inputRecord?.reviewEvidenceRefs)
  const policy = basePolicy(protectedStatus, action, inputRecord)
  const upstreamPolicy = applyUpstreamPolicy(
    inputRecord,
    action,
    policy.outcome,
    policy.reasonCodes,
    policy.restrictedSurfaces
  )
  const validationReasonCodes = getValidationReasonCodes(inputRecord, protectedStatus, action)
  const restrictedSurfaces = uniqueSurfaceOrder(upstreamPolicy.restrictedSurfaces)

  return Object.freeze({
    subjectId,
    subjectLabel,
    protectedStatus,
    protectedStatusLabel: formatEnumLabel(protectedStatus),
    action,
    actionLabel: formatEnumLabel(action),
    outcome: upstreamPolicy.outcome,
    outcomeLabel: formatEnumLabel(upstreamPolicy.outcome),
    decisionLabel: `${formatEnumLabel(action)}: ${formatEnumLabel(upstreamPolicy.outcome)}`,
    restrictedSurfaces: Object.freeze(restrictedSurfaces),
    restrictedSurfaceLabels: Object.freeze(
      restrictedSurfaces.map((surface) => formatEnumLabel(surface))
    ),
    requiredReviewGates: Object.freeze(uniqueSorted(policy.requiredReviewGates)),
    reviewEvidenceRefs: Object.freeze(reviewEvidenceRefs),
    reasonCodes: Object.freeze(
      uniqueSorted([...upstreamPolicy.reasonCodes, ...validationReasonCodes])
    ),
  })
}

export function evaluateAffiliationProtectedStatusActionSet(
  inputs: readonly AffiliationProtectedStatusActionInput[]
): readonly AffiliationProtectedActionDecision[] {
  return Object.freeze(
    [...inputs]
      .map((input) => evaluateAffiliationProtectedStatusAction(input))
      .sort((left, right) => {
        const subjectOrder = left.subjectId.localeCompare(right.subjectId)
        if (subjectOrder !== 0) return subjectOrder

        const statusOrder =
          AFFILIATION_PROTECTED_STATUSES.indexOf(left.protectedStatus) -
          AFFILIATION_PROTECTED_STATUSES.indexOf(right.protectedStatus)
        if (statusOrder !== 0) return statusOrder

        return (
          AFFILIATION_PROTECTED_ACTIONS.indexOf(left.action) -
          AFFILIATION_PROTECTED_ACTIONS.indexOf(right.action)
        )
      })
  )
}
