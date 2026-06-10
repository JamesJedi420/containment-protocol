/**
 * SPE-1882 / SPE-1888 slice 5–6: minimal coercive contained-person procedure anchors.
 *
 * Bounded procedure refs for welfare-debt creation wire-up — not the full
 * coercive protocol model (SPE-1882 parent remains open).
 */

import type { CustodyStage } from './containedPersonCustodyStatusRegistry'
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
  /** Expected custody `restrictionLevel` when deriving drafts from custody status alone. */
  readonly custodyRestrictionLevel?: string
  /** Expected custody `custodyStage` when deriving drafts from custody status alone. */
  readonly custodyStage?: CustodyStage
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
  custodyRestrictionLevel: 'elevated',
  custodyStage: 'contained_person',
})

/** Privilege suspension enforcement with punitive handling and interview-compliance purpose. */
export const PRIVILEGE_SUSPENSION_ENFORCEMENT_ANCHOR: CoerciveProcedureAnchor = defineAnchor({
  procedureRef: 'coercive-procedure:privilege-suspension-enforcement',
  sourceProcedureLabel: 'privilege suspension cycle',
  debtCategory: 'privilege_deprivation',
  handlingMode: 'punitive',
  reviewOwnerLabel: 'ethics review board',
  mitigationPathLabel: 'restored visitation rights',
  coercionPressureTier: 'medium',
  custodyStatusRef: 'custody-status:privilege-suspended-hold',
  custodyRestrictionLevel: 'privilege_suspended',
  custodyStage: 'contained_person',
})

/** Coerced high-risk personnel sourcing authorized by compelled screening regimen and hold. */
export const COERCED_HIGH_RISK_PERSONNEL_SOURCING_ANCHOR: CoerciveProcedureAnchor = defineAnchor({
  procedureRef: 'coercive-procedure:coerced-high-risk-personnel-sourcing',
  sourceProcedureLabel: 'coerced high-risk personnel sourcing cycle',
  debtCategory: 'high_risk_personnel_sourcing',
  handlingMode: 'compelled',
  reviewOwnerLabel: 'personnel ethics panel',
  mitigationPathLabel: 'independent welfare audit',
  coercionPressureTier: 'high',
  regimenRef: 'medication-regimen:coercive-personnel-screening-beta',
  custodyStatusRef: 'custody-status:coerced-personnel-source-hold',
  custodyRestrictionLevel: 'coerced_sourcing',
  custodyStage: 'temporary_holding',
})

export const COERCIVE_PROCEDURE_ANCHORS: readonly CoerciveProcedureAnchor[] = Object.freeze([
  FORCED_SEDATION_STABILIZATION_ANCHOR,
  EXTENDED_MECHANICAL_RESTRAINT_ANCHOR,
  PRIVILEGE_SUSPENSION_ENFORCEMENT_ANCHOR,
  COERCED_HIGH_RISK_PERSONNEL_SOURCING_ANCHOR,
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
