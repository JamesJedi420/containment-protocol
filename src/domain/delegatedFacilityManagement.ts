/**
 * SPE-1565 — delegated facility management model.
 *
 * Pure caller-owned packets assign managers/deputies with separable competence,
 * loyalty, ambition, and autonomy bands; project absence-run outcomes; surface
 * control-vs-bandwidth tradeoffs; and authorize reuse of the existing
 * facility-maintenance recovery transaction (SPE-3182) without minting free
 * maintenance resources or privately recalculating debt.
 *
 * This module does not persist GameState, run week-close, or simulate full HR.
 */

/** Representative facility used by acceptance fixtures. */
export const DELEGATED_FACILITY_ID = 'facility:annex-ops' as const

/** Representative delegated manager used by acceptance fixtures. */
export const DELEGATED_MANAGER_ID = 'manager:deputy-karis' as const

export const DELEGATED_MANAGER_ROLES = ['manager', 'deputy', 'underling'] as const
export type DelegatedManagerRole = (typeof DELEGATED_MANAGER_ROLES)[number]

export const DELEGATED_ATTRIBUTE_BANDS = ['low', 'moderate', 'high'] as const
export type DelegatedAttributeBand = (typeof DELEGATED_ATTRIBUTE_BANDS)[number]

export const DELEGATED_ABSENCE_OUTCOMES = [
  'maintain',
  'improve',
  'compromise',
] as const
export type DelegatedAbsenceOutcome = (typeof DELEGATED_ABSENCE_OUTCOMES)[number]

export const DELEGATED_RISK_BANDS = ['reduced', 'baseline', 'elevated'] as const
export type DelegatedRiskBand = (typeof DELEGATED_RISK_BANDS)[number]

export const DELEGATED_LEGITIMACY_AUTHORITIES = [
  'owner',
  'licensing',
  'auditor',
  'none',
] as const
export type DelegatedLegitimacyAuthority =
  (typeof DELEGATED_LEGITIMACY_AUTHORITIES)[number]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isMember<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.some((item) => item === value)
}

function bandRank(band: DelegatedAttributeBand): number {
  return DELEGATED_ATTRIBUTE_BANDS.indexOf(band)
}

export interface DelegatedManagerAssignmentInput {
  readonly facilityId: string
  readonly managerId: string
  readonly role: DelegatedManagerRole
  readonly competence: DelegatedAttributeBand
  readonly loyalty: DelegatedAttributeBand
  readonly ambition: DelegatedAttributeBand
  readonly autonomy: DelegatedAttributeBand
  readonly legitimacyAuthority: DelegatedLegitimacyAuthority
  readonly serviceNodeFront: boolean
}

export interface DelegatedManagerAssignmentResult {
  readonly facilityId: string
  readonly managerId: string
  readonly role: DelegatedManagerRole
  readonly competence: DelegatedAttributeBand
  readonly loyalty: DelegatedAttributeBand
  readonly ambition: DelegatedAttributeBand
  readonly autonomy: DelegatedAttributeBand
  readonly legitimacyAuthority: DelegatedLegitimacyAuthority
  readonly serviceNodeFront: boolean
  readonly assignmentValid: boolean
  readonly masksHiddenFunction: boolean
}

/** Assign a delegated manager when legitimacy authority is present (not possession alone). */
export function projectDelegatedManagerAssignment(
  input: unknown
): DelegatedManagerAssignmentResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.managerId)) return undefined
  if (!isMember(input.role, DELEGATED_MANAGER_ROLES)) return undefined
  if (!isMember(input.competence, DELEGATED_ATTRIBUTE_BANDS)) return undefined
  if (!isMember(input.loyalty, DELEGATED_ATTRIBUTE_BANDS)) return undefined
  if (!isMember(input.ambition, DELEGATED_ATTRIBUTE_BANDS)) return undefined
  if (!isMember(input.autonomy, DELEGATED_ATTRIBUTE_BANDS)) return undefined
  if (!isMember(input.legitimacyAuthority, DELEGATED_LEGITIMACY_AUTHORITIES)) {
    return undefined
  }
  if (typeof input.serviceNodeFront !== 'boolean') return undefined

  const assignmentValid = input.legitimacyAuthority !== 'none'
  return Object.freeze({
    facilityId: input.facilityId,
    managerId: input.managerId,
    role: input.role,
    competence: input.competence,
    loyalty: input.loyalty,
    ambition: input.ambition,
    autonomy: input.autonomy,
    legitimacyAuthority: input.legitimacyAuthority,
    serviceNodeFront: input.serviceNodeFront,
    assignmentValid,
    masksHiddenFunction: assignmentValid && input.serviceNodeFront,
  })
}

export interface DelegatedAbsenceOperationInput {
  readonly facilityId: string
  readonly managerId: string
  readonly assignmentValid: boolean
  readonly playerAbsent: boolean
  readonly competence: DelegatedAttributeBand
  readonly loyalty: DelegatedAttributeBand
  readonly ambition: DelegatedAttributeBand
}

export interface DelegatedAbsenceOperationResult {
  readonly facilityId: string
  readonly managerId: string
  readonly runsInPlayerAbsence: boolean
  readonly outcome: DelegatedAbsenceOutcome | 'idle'
  readonly inspectable: true
}

/** Project whether a valid manager runs the facility in player absence, and how. */
export function projectDelegatedAbsenceOperation(
  input: unknown
): DelegatedAbsenceOperationResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.managerId)) return undefined
  if (typeof input.assignmentValid !== 'boolean') return undefined
  if (typeof input.playerAbsent !== 'boolean') return undefined
  if (!isMember(input.competence, DELEGATED_ATTRIBUTE_BANDS)) return undefined
  if (!isMember(input.loyalty, DELEGATED_ATTRIBUTE_BANDS)) return undefined
  if (!isMember(input.ambition, DELEGATED_ATTRIBUTE_BANDS)) return undefined

  if (!input.assignmentValid || !input.playerAbsent) {
    return Object.freeze({
      facilityId: input.facilityId,
      managerId: input.managerId,
      runsInPlayerAbsence: false,
      outcome: 'idle' as const,
      inspectable: true as const,
    })
  }

  let outcome: DelegatedAbsenceOutcome = 'maintain'
  if (bandRank(input.loyalty) === 0 && bandRank(input.ambition) >= 1) {
    outcome = 'compromise'
  } else if (bandRank(input.competence) >= 2 && bandRank(input.loyalty) >= 1) {
    outcome = 'improve'
  }

  return Object.freeze({
    facilityId: input.facilityId,
    managerId: input.managerId,
    runsInPlayerAbsence: true,
    outcome,
    inspectable: true as const,
  })
}

export interface DelegatedManagerRiskEffectsInput {
  readonly managerId: string
  readonly competence: DelegatedAttributeBand
  readonly loyalty: DelegatedAttributeBand
  readonly ambition: DelegatedAttributeBand
  readonly autonomy: DelegatedAttributeBand
}

export interface DelegatedManagerRiskEffectsResult {
  readonly managerId: string
  readonly maintenanceRisk: DelegatedRiskBand
  readonly growthRisk: DelegatedRiskBand
  readonly compromiseRisk: DelegatedRiskBand
  readonly attributesMateriallyChangeRisk: boolean
}

/** Separable attribute bands map onto maintenance, growth, and compromise risk. */
export function projectDelegatedManagerRiskEffects(
  input: unknown
): DelegatedManagerRiskEffectsResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.managerId)) return undefined
  if (!isMember(input.competence, DELEGATED_ATTRIBUTE_BANDS)) return undefined
  if (!isMember(input.loyalty, DELEGATED_ATTRIBUTE_BANDS)) return undefined
  if (!isMember(input.ambition, DELEGATED_ATTRIBUTE_BANDS)) return undefined
  if (!isMember(input.autonomy, DELEGATED_ATTRIBUTE_BANDS)) return undefined

  const maintenanceRisk: DelegatedRiskBand =
    bandRank(input.competence) >= 2
      ? 'reduced'
      : bandRank(input.competence) === 0
        ? 'elevated'
        : 'baseline'

  // Ambition+autonomy elevation wins over competence reduction when both apply.
  let growthRisk: DelegatedRiskBand = 'baseline'
  if (bandRank(input.ambition) >= 2 && bandRank(input.autonomy) >= 1) {
    growthRisk = 'elevated'
  } else if (bandRank(input.competence) >= 2) {
    growthRisk = 'reduced'
  }

  const compromiseRisk: DelegatedRiskBand =
    bandRank(input.loyalty) === 0 ||
    (bandRank(input.ambition) >= 2 && bandRank(input.autonomy) >= 2)
      ? 'elevated'
      : bandRank(input.loyalty) >= 2
        ? 'reduced'
        : 'baseline'

  const attributesMateriallyChangeRisk =
    maintenanceRisk !== 'baseline' ||
    growthRisk !== 'baseline' ||
    compromiseRisk !== 'baseline'

  return Object.freeze({
    managerId: input.managerId,
    maintenanceRisk,
    growthRisk,
    compromiseRisk,
    attributesMateriallyChangeRisk,
  })
}

export interface DelegationControlBandwidthTradeoffInput {
  readonly facilityId: string
  readonly assignmentValid: boolean
  readonly playerDirectControl: boolean
  readonly autonomy: DelegatedAttributeBand
}

export interface DelegationControlBandwidthTradeoffResult {
  readonly facilityId: string
  readonly tradeoffMeaningful: boolean
  readonly directControlRetained: boolean
  readonly operationalBandwidthGained: boolean
  readonly tradeoffNote:
    | 'direct_control_no_bandwidth'
    | 'bandwidth_at_control_cost'
    | 'invalid_assignment'
}

/** Delegation trades direct control for operational bandwidth (not free upkeep). */
export function projectDelegationControlBandwidthTradeoff(
  input: unknown
): DelegationControlBandwidthTradeoffResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (typeof input.assignmentValid !== 'boolean') return undefined
  if (typeof input.playerDirectControl !== 'boolean') return undefined
  if (!isMember(input.autonomy, DELEGATED_ATTRIBUTE_BANDS)) return undefined

  if (!input.assignmentValid) {
    return Object.freeze({
      facilityId: input.facilityId,
      tradeoffMeaningful: false,
      directControlRetained: input.playerDirectControl,
      operationalBandwidthGained: false,
      tradeoffNote: 'invalid_assignment' as const,
    })
  }

  if (input.playerDirectControl) {
    return Object.freeze({
      facilityId: input.facilityId,
      tradeoffMeaningful: true,
      directControlRetained: true,
      operationalBandwidthGained: false,
      tradeoffNote: 'direct_control_no_bandwidth' as const,
    })
  }

  return Object.freeze({
    facilityId: input.facilityId,
    tradeoffMeaningful: true,
    directControlRetained: false,
    operationalBandwidthGained: bandRank(input.autonomy) >= 1,
    tradeoffNote: 'bandwidth_at_control_cost' as const,
  })
}

export interface DelegatedMaintenanceRecoveryIntentInput {
  readonly facilityId: string
  readonly managerId: string
  readonly assignmentValid: boolean
  readonly competence: DelegatedAttributeBand
  readonly loyalty: DelegatedAttributeBand
  readonly routineMaintenanceAction: boolean
}

export interface DelegatedMaintenanceRecoveryIntentResult {
  readonly facilityId: string
  readonly managerId: string
  readonly mayConsumeExistingRecoveryTransaction: boolean
  readonly mintsFreeMaintenanceResources: false
  readonly recalculatesDebtPrivately: false
  readonly refusalReason:
    | 'invalid_assignment'
    | 'not_routine_action'
    | 'competence_or_loyalty_blocks'
    | null
}

/**
 * Authorized managers may consume the existing SPE-3182 recovery transaction as a
 * routine action. Never mint free resources or privately recalculate debt here.
 */
export function projectDelegatedMaintenanceRecoveryIntent(
  input: unknown
): DelegatedMaintenanceRecoveryIntentResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.managerId)) return undefined
  if (typeof input.assignmentValid !== 'boolean') return undefined
  if (!isMember(input.competence, DELEGATED_ATTRIBUTE_BANDS)) return undefined
  if (!isMember(input.loyalty, DELEGATED_ATTRIBUTE_BANDS)) return undefined
  if (typeof input.routineMaintenanceAction !== 'boolean') return undefined

  let refusalReason: DelegatedMaintenanceRecoveryIntentResult['refusalReason'] = null
  if (!input.assignmentValid) {
    refusalReason = 'invalid_assignment'
  } else if (!input.routineMaintenanceAction) {
    refusalReason = 'not_routine_action'
  } else if (bandRank(input.competence) === 0 || bandRank(input.loyalty) === 0) {
    refusalReason = 'competence_or_loyalty_blocks'
  }

  return Object.freeze({
    facilityId: input.facilityId,
    managerId: input.managerId,
    mayConsumeExistingRecoveryTransaction: refusalReason === null,
    mintsFreeMaintenanceResources: false as const,
    recalculatesDebtPrivately: false as const,
    refusalReason,
  })
}
