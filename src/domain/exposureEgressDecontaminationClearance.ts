/**
 * SPE-3151 slice 1: exposure egress and decontamination clearance.
 *
 * Pure deterministic integration that distinguishes physical exit from
 * decontamination, screening, and final duty clearance. Does not invent a
 * parallel exposure-duty state machine (SPE-2080), procedure engine, or
 * medical simulator. Consumes caller-supplied exposure/procedure flags.
 */

export const EGRESS_CLEARANCE_DISPOSITIONS = [
  'egress_blocked',
  'egress_permitted_still_exposed',
  'decontaminated_awaiting_screening',
  'cleared',
  'held',
] as const
export type EgressClearanceDisposition = (typeof EGRESS_CLEARANCE_DISPOSITIONS)[number]

export const EGRESS_CLEARANCE_REASONS = [
  'ok',
  'egress_unavailable',
  'still_exposed',
  'decontamination_incomplete',
  'screening_incomplete',
  'prerequisite_failed',
  'malformed_input',
] as const
export type EgressClearanceReason = (typeof EGRESS_CLEARANCE_REASONS)[number]

export interface ExposureEgressClearanceInput {
  readonly actorId: string
  readonly physicallyExitedZone: boolean
  readonly currentlyExposed: boolean
  readonly decontaminationComplete: boolean
  readonly screeningComplete: boolean
  readonly egressPermitted: boolean
  readonly debriefComplete?: boolean
}

export interface ExposureEgressClearanceResult {
  readonly actorId: string
  readonly disposition: EgressClearanceDisposition
  readonly reasons: readonly EgressClearanceReason[]
  readonly physicalExitDistinct: true
  readonly inventoryUnchanged: true
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function freezeReasons(reasons: readonly EgressClearanceReason[]): readonly EgressClearanceReason[] {
  return Object.freeze([...new Set(reasons)].sort())
}

function freezeResult(result: ExposureEgressClearanceResult): ExposureEgressClearanceResult {
  return Object.freeze({
    ...result,
    reasons: freezeReasons(result.reasons),
  })
}

/**
 * Resolve one egress/decontamination/screening/clearance step.
 * Physical exit never implies clearance. Idempotent: same input → same output.
 * Does not mutate any state.
 */
export function resolveExposureEgressClearance(
  input: unknown
): ExposureEgressClearanceResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.actorId)) return undefined
  if (typeof input.physicallyExitedZone !== 'boolean') return undefined
  if (typeof input.currentlyExposed !== 'boolean') return undefined
  if (typeof input.decontaminationComplete !== 'boolean') return undefined
  if (typeof input.screeningComplete !== 'boolean') return undefined
  if (typeof input.egressPermitted !== 'boolean') return undefined
  if (input.debriefComplete !== undefined && typeof input.debriefComplete !== 'boolean') {
    return undefined
  }

  const actorId = input.actorId.trim()
  const exited = input.physicallyExitedZone
  const exposed = input.currentlyExposed
  const decon = input.decontaminationComplete
  const screened = input.screeningComplete
  const egressOk = input.egressPermitted

  if (!egressOk) {
    return freezeResult({
      actorId,
      disposition: 'egress_blocked',
      reasons: ['egress_unavailable', 'prerequisite_failed'],
      physicalExitDistinct: true,
      inventoryUnchanged: true,
    })
  }

  if (!exited) {
    return freezeResult({
      actorId,
      disposition: 'held',
      reasons: ['ok'],
      physicalExitDistinct: true,
      inventoryUnchanged: true,
    })
  }

  // Physical exit occurred. Exposure is not cleared by movement alone.
  if (exposed || !decon) {
    return freezeResult({
      actorId,
      disposition: 'egress_permitted_still_exposed',
      reasons: exposed ? ['still_exposed', 'decontamination_incomplete'] : ['decontamination_incomplete'],
      physicalExitDistinct: true,
      inventoryUnchanged: true,
    })
  }

  if (!screened) {
    return freezeResult({
      actorId,
      disposition: 'decontaminated_awaiting_screening',
      reasons: ['screening_incomplete'],
      physicalExitDistinct: true,
      inventoryUnchanged: true,
    })
  }

  return freezeResult({
    actorId,
    disposition: 'cleared',
    reasons: ['ok'],
    physicalExitDistinct: true,
    inventoryUnchanged: true,
  })
}
