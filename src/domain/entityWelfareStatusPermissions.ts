/**
 * SPE-1046 slice 1: deterministic status-class permission decisions over
 * entity welfare reclassification records. Pure helper only; no GameState
 * persistence, weekly mutation, or UI coupling.
 */

import {
  isProposedDisposition,
  isReclassificationState,
  isReviewGate,
  validateEntityWelfareReclassificationRecord,
  type EntityWelfareReclassificationRecord,
  type ProposedDisposition,
  type ReclassificationState,
} from './entityWelfareReclassificationRegistry'

export type EntityWelfarePermissionSurface = 'room' | 'file' | 'gear' | 'housing' | 'mission'

export const ENTITY_WELFARE_PERMISSION_SURFACES: readonly EntityWelfarePermissionSurface[] = [
  'room',
  'file',
  'gear',
  'housing',
  'mission',
] as const

export type EntityWelfarePermissionOutcome = 'allowed' | 'restricted' | 'blocked'

export interface EntityWelfarePermissionDecision {
  readonly recordId: string
  readonly recordLabel: string
  readonly surface: EntityWelfarePermissionSurface
  readonly surfaceLabel: string
  readonly outcome: EntityWelfarePermissionOutcome
  readonly outcomeLabel: string
  readonly dispositionLabel: string
  readonly stateLabel: string
  readonly reviewGateLabel?: string
  readonly reasonCodes: readonly string[]
}

interface PermissionPolicyResult {
  readonly outcome: EntityWelfarePermissionOutcome
  readonly reasonCodes: readonly string[]
}

const BLOCKED_ALL_STATES: ReadonlySet<ReclassificationState> = new Set(['denied', 'reverted'])

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
    (left, right) => left.localeCompare(right)
  )
}

function formatEnumLabel(value: string) {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? `${part[0]?.toUpperCase()}${part.slice(1)}` : part))
    .join(' ')
}

function normalizeRecordId(record: EntityWelfareReclassificationRecord) {
  return typeof record.id === 'string' && record.id.trim().length > 0
    ? record.id.trim()
    : 'reclass:unknown'
}

function normalizeRecordLabel(record: EntityWelfareReclassificationRecord) {
  const label = typeof record.label === 'string' ? record.label.trim() : ''
  return label.length > 0 ? label : normalizeRecordId(record)
}

function coerceSurface(surface: EntityWelfarePermissionSurface): EntityWelfarePermissionSurface {
  return ENTITY_WELFARE_PERMISSION_SURFACES.includes(surface) ? surface : 'mission'
}

function evaluateApprovedDisposition(
  disposition: ProposedDisposition,
  surface: EntityWelfarePermissionSurface
): PermissionPolicyResult {
  if (disposition === 'cooperative') {
    if (surface === 'housing') {
      return { outcome: 'allowed', reasonCodes: ['approved_cooperative_housing_allowed'] }
    }

    if (surface === 'room') {
      return { outcome: 'blocked', reasonCodes: ['approved_cooperative_unrestricted_room_blocked'] }
    }

    return { outcome: 'restricted', reasonCodes: [`approved_cooperative_${surface}_restricted`] }
  }

  if (disposition === 'medical') {
    if (surface === 'housing') {
      return { outcome: 'allowed', reasonCodes: ['approved_medical_housing_allowed'] }
    }

    if (surface === 'room' || surface === 'file') {
      return { outcome: 'restricted', reasonCodes: [`approved_medical_${surface}_restricted`] }
    }

    return { outcome: 'blocked', reasonCodes: [`approved_medical_${surface}_blocked`] }
  }

  if (disposition === 'sapient_remains') {
    if (surface === 'gear' || surface === 'mission') {
      return { outcome: 'blocked', reasonCodes: [`approved_sapient_remains_${surface}_blocked`] }
    }

    return {
      outcome: 'restricted',
      reasonCodes: [`approved_sapient_remains_${surface}_protected_restricted`],
    }
  }

  if (disposition === 'hostile') {
    return { outcome: 'blocked', reasonCodes: ['approved_hostile_status_blocked'] }
  }

  return { outcome: 'restricted', reasonCodes: ['approved_unknown_disposition_restricted'] }
}

function evaluatePolicy(
  record: EntityWelfareReclassificationRecord,
  surface: EntityWelfarePermissionSurface
): PermissionPolicyResult {
  if (!isReclassificationState(record.reclassificationState)) {
    return { outcome: 'blocked', reasonCodes: ['invalid_reclassification_state'] }
  }

  if (record.reclassificationState === 'pending') {
    const reasonCodes = ['pending_reclassification_review']

    if (isReviewGate(record.reviewGate)) {
      reasonCodes.push(`review_gate_${record.reviewGate}`)
    }

    return { outcome: 'restricted', reasonCodes }
  }

  if (BLOCKED_ALL_STATES.has(record.reclassificationState)) {
    return {
      outcome: 'blocked',
      reasonCodes: [`${record.reclassificationState}_reclassification_blocked`],
    }
  }

  if (!isProposedDisposition(record.proposedDisposition)) {
    return { outcome: 'restricted', reasonCodes: ['invalid_proposed_disposition'] }
  }

  return evaluateApprovedDisposition(record.proposedDisposition, surface)
}

export function evaluateEntityWelfareStatusPermission(
  record: EntityWelfareReclassificationRecord,
  surface: EntityWelfarePermissionSurface
): EntityWelfarePermissionDecision {
  const resolvedSurface = coerceSurface(surface)
  const validation = validateEntityWelfareReclassificationRecord(record)
  const policy = evaluatePolicy(record, resolvedSurface)
  const validationReasonCodes = validation.issues
    .filter((issue) => issue.severity === 'error')
    .map((issue) => `validation_${issue.code}`)

  const reviewGateLabel = isReviewGate(record.reviewGate)
    ? formatEnumLabel(record.reviewGate)
    : undefined

  return Object.freeze({
    recordId: normalizeRecordId(record),
    recordLabel: normalizeRecordLabel(record),
    surface: resolvedSurface,
    surfaceLabel: formatEnumLabel(resolvedSurface),
    outcome: policy.outcome,
    outcomeLabel: formatEnumLabel(policy.outcome),
    dispositionLabel: isProposedDisposition(record.proposedDisposition)
      ? formatEnumLabel(record.proposedDisposition)
      : 'Invalid Disposition',
    stateLabel: isReclassificationState(record.reclassificationState)
      ? formatEnumLabel(record.reclassificationState)
      : 'Invalid State',
    ...(reviewGateLabel ? { reviewGateLabel } : {}),
    reasonCodes: Object.freeze(uniqueSorted([...policy.reasonCodes, ...validationReasonCodes])),
  })
}

export function evaluateEntityWelfareStatusPermissionSet(
  record: EntityWelfareReclassificationRecord
): readonly EntityWelfarePermissionDecision[] {
  return Object.freeze(
    ENTITY_WELFARE_PERMISSION_SURFACES.map((surface) =>
      evaluateEntityWelfareStatusPermission(record, surface)
    )
  )
}
