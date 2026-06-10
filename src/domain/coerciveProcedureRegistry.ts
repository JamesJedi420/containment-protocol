/**
 * SPE-1882 / SPE-1888 slice 5: minimal coercive contained-person procedure anchors.
 *
 * Bounded procedure refs for welfare-debt creation wire-up — not the full
 * coercive protocol model (SPE-1882 parent remains open).
 */

import type { WelfareDebtCategory } from './welfareDebtAccountingRegistry'

// ---------------------------------------------------------------------------
// Handling modes (subset of SPE-1882 taxonomy)
// ---------------------------------------------------------------------------

export type CoerciveHandlingMode =
  | 'voluntary'
  | 'negotiated'
  | 'compelled'
  | 'emergency'
  | 'punitive'

export const COERCIVE_HANDLING_MODES: readonly CoerciveHandlingMode[] = [
  'voluntary',
  'negotiated',
  'compelled',
  'emergency',
  'punitive',
] as const

export type CoerciveCoercionPressureTier = 'medium' | 'high'

// ---------------------------------------------------------------------------
// Procedure anchors
// ---------------------------------------------------------------------------

export interface CoerciveProcedureAnchor {
  readonly procedureRef: string
  readonly sourceProcedureLabel: string
  readonly debtCategory: WelfareDebtCategory
  readonly handlingMode: CoerciveHandlingMode
  readonly reviewOwnerLabel: string
  readonly mitigationPathLabel: string
  readonly coercionPressureTier: CoerciveCoercionPressureTier
  /** Optional medication-regimen id that authorizes this coercive procedure. */
  readonly regimenRef?: string
  /** Optional custody-status id that authorizes restraint-style coercion. */
  readonly custodyStatusRef?: string
}

function defineAnchor(anchor: CoerciveProcedureAnchor): CoerciveProcedureAnchor {
  return Object.freeze({ ...anchor })
}

/** Forced sedation stabilization with compelled medication and containment purpose. */
export const FORCED_SEDATION_STABILIZATION_ANCHOR: CoerciveProcedureAnchor = defineAnchor({
  procedureRef: 'coercive-procedure:forced-sedation-stabilization',
  sourceProcedureLabel: 'forced sedation stabilization cycle',
  debtCategory: 'coerced_medication',
  handlingMode: 'compelled',
  reviewOwnerLabel: 'psychiatric review panel',
  mitigationPathLabel: 'independent welfare audit',
  coercionPressureTier: 'high',
  regimenRef: 'medication-regimen:coercive-sedative-beta',
})

/** Extended mechanical restraint with elevated custody restrictions. */
export const EXTENDED_MECHANICAL_RESTRAINT_ANCHOR: CoerciveProcedureAnchor = defineAnchor({
  procedureRef: 'coercive-procedure:extended-mechanical-restraint',
  sourceProcedureLabel: 'extended mechanical restraint cycle',
  debtCategory: 'harmful_restraint',
  handlingMode: 'compelled',
  reviewOwnerLabel: 'ethics review board',
  mitigationPathLabel: 'independent welfare audit',
  coercionPressureTier: 'high',
  custodyStatusRef: 'custody-status:former-hostile-hold',
})

export const COERCIVE_PROCEDURE_ANCHORS: readonly CoerciveProcedureAnchor[] = Object.freeze([
  FORCED_SEDATION_STABILIZATION_ANCHOR,
  EXTENDED_MECHANICAL_RESTRAINT_ANCHOR,
])

const COERCIVE_PROCEDURE_ANCHOR_BY_REF = new Map<string, CoerciveProcedureAnchor>(
  COERCIVE_PROCEDURE_ANCHORS.map((anchor) => [anchor.procedureRef, anchor])
)

export function resolveCoerciveProcedureAnchor(
  procedureRef: string
): CoerciveProcedureAnchor | undefined {
  const normalized = procedureRef.trim()
  return normalized.length > 0 ? COERCIVE_PROCEDURE_ANCHOR_BY_REF.get(normalized) : undefined
}
