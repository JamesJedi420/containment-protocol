/**
 * SPE-1173 — emergency branch borrowing facility.
 *
 * Pure caller-owned packets let stressed branches request temporary support from
 * a shared center facility under explicit access conditions, with inspectable
 * later costs and branch-outcome deltas. No free infinite bailout path.
 *
 * This module does not persist GameState, run week-close, or draw facility UI.
 */

/** Representative shared emergency borrowing facility used by acceptance fixtures. */
export const EMERGENCY_BORROWING_FACILITY_ID = 'facility:central-emergency-borrow' as const

/** Representative strained branch used by acceptance fixtures. */
export const STRAINED_BRANCH_ID = 'branch:outpost-delta' as const

export const EMERGENCY_RESERVE_CLASSES = [
  'staff',
  'vehicles',
  'safehouse_capacity',
  'legal_cover',
  'funds',
  'contractors',
  'reagents',
] as const
export type EmergencyReserveClass = (typeof EMERGENCY_RESERVE_CLASSES)[number]

export const EMERGENCY_BORROWING_ACCESS_CONDITIONS = [
  'collateral',
  'supervision_escalation',
  'stigma',
  'penalty_pricing',
  'restricted_use',
  'audit_exposure',
] as const
export type EmergencyBorrowingAccessCondition =
  (typeof EMERGENCY_BORROWING_ACCESS_CONDITIONS)[number]

export const EMERGENCY_BORROWING_DISPOSITIONS = [
  'granted',
  'denied',
  'concealed',
] as const
export type EmergencyBorrowingDisposition = (typeof EMERGENCY_BORROWING_DISPOSITIONS)[number]

export const EMERGENCY_BORROWING_LATER_COST_KINDS = [
  'stigma',
  'audit_pressure',
  'tighter_supervision',
  'depleted_future_flexibility',
] as const
export type EmergencyBorrowingLaterCostKind =
  (typeof EMERGENCY_BORROWING_LATER_COST_KINDS)[number]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isMember<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.some((item) => item === value)
}

function freezeStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...values])
}

export interface EmergencyBorrowingAccessInput {
  readonly facilityId: string
  readonly branchId: string
  readonly underStrain: boolean
  readonly disclosedStrain: boolean
  readonly reserveClass: EmergencyReserveClass
  readonly accessConditions: readonly EmergencyBorrowingAccessCondition[]
  readonly centerReserveAvailable: boolean
}

export interface EmergencyBorrowingAccessResult {
  readonly facilityId: string
  readonly branchId: string
  readonly reserveClass: EmergencyReserveClass
  readonly accessAllowed: boolean
  readonly refusalReason:
    | 'not_under_strain'
    | 'center_reserve_unavailable'
    | 'missing_access_condition'
    | null
  readonly accessConditions: readonly EmergencyBorrowingAccessCondition[]
}

/**
 * Stressed branches may borrow only when under strain, center reserve is available,
 * and at least one authored access condition is present (no consequence-free rescue).
 */
export function evaluateEmergencyBorrowingAccess(
  input: unknown
): EmergencyBorrowingAccessResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.branchId)) return undefined
  if (typeof input.underStrain !== 'boolean') return undefined
  if (typeof input.disclosedStrain !== 'boolean') return undefined
  if (!isMember(input.reserveClass, EMERGENCY_RESERVE_CLASSES)) return undefined
  if (typeof input.centerReserveAvailable !== 'boolean') return undefined
  if (!Array.isArray(input.accessConditions)) return undefined

  const accessConditions: EmergencyBorrowingAccessCondition[] = []
  for (const condition of input.accessConditions) {
    if (!isMember(condition, EMERGENCY_BORROWING_ACCESS_CONDITIONS)) return undefined
    if (!accessConditions.includes(condition)) accessConditions.push(condition)
  }

  let refusalReason: EmergencyBorrowingAccessResult['refusalReason'] = null
  if (!input.underStrain) {
    refusalReason = 'not_under_strain'
  } else if (!input.centerReserveAvailable) {
    refusalReason = 'center_reserve_unavailable'
  } else if (accessConditions.length === 0) {
    refusalReason = 'missing_access_condition'
  }

  return Object.freeze({
    facilityId: input.facilityId,
    branchId: input.branchId,
    reserveClass: input.reserveClass,
    accessAllowed: refusalReason === null,
    refusalReason,
    accessConditions: freezeStrings(accessConditions) as readonly EmergencyBorrowingAccessCondition[],
  })
}

export interface EmergencyBorrowingEventInput {
  readonly eventId: string
  readonly facilityId: string
  readonly branchId: string
  readonly reserveClass: EmergencyReserveClass
  readonly disposition: EmergencyBorrowingDisposition
  readonly accessAllowed: boolean
}

export interface EmergencyBorrowingEventResult {
  readonly eventId: string
  readonly facilityId: string
  readonly branchId: string
  readonly reserveClass: EmergencyReserveClass
  readonly disposition: EmergencyBorrowingDisposition
  readonly temporarySupportReceived: boolean
  readonly inspectable: true
}

/**
 * Project a borrowing event. Temporary support requires grant + prior accessAllowed.
 * Concealment and denial never deliver temporary support.
 */
export function projectEmergencyBorrowingEvent(
  input: unknown
): EmergencyBorrowingEventResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.eventId)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.branchId)) return undefined
  if (!isMember(input.reserveClass, EMERGENCY_RESERVE_CLASSES)) return undefined
  if (!isMember(input.disposition, EMERGENCY_BORROWING_DISPOSITIONS)) return undefined
  if (typeof input.accessAllowed !== 'boolean') return undefined

  const temporarySupportReceived =
    input.disposition === 'granted' && input.accessAllowed === true

  return Object.freeze({
    eventId: input.eventId,
    facilityId: input.facilityId,
    branchId: input.branchId,
    reserveClass: input.reserveClass,
    disposition: input.disposition,
    temporarySupportReceived,
    inspectable: true as const,
  })
}

export interface BorrowingLaterCostInput {
  readonly eventId: string
  readonly disposition: EmergencyBorrowingDisposition
  readonly temporarySupportReceived: boolean
  readonly accessConditions: readonly EmergencyBorrowingAccessCondition[]
}

export interface BorrowingLaterCostResult {
  readonly eventId: string
  readonly laterCostCreated: boolean
  readonly costKinds: readonly EmergencyBorrowingLaterCostKind[]
}

/**
 * Granted temporary support always creates later cost. Conditions map onto cost kinds.
 * Denial/concealment do not create borrowing later-cost surfaces from this projector.
 */
export function projectBorrowingLaterCost(
  input: unknown
): BorrowingLaterCostResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.eventId)) return undefined
  if (!isMember(input.disposition, EMERGENCY_BORROWING_DISPOSITIONS)) return undefined
  if (typeof input.temporarySupportReceived !== 'boolean') return undefined
  if (!Array.isArray(input.accessConditions)) return undefined

  const accessConditions: EmergencyBorrowingAccessCondition[] = []
  for (const condition of input.accessConditions) {
    if (!isMember(condition, EMERGENCY_BORROWING_ACCESS_CONDITIONS)) return undefined
    if (!accessConditions.includes(condition)) accessConditions.push(condition)
  }

  if (!input.temporarySupportReceived || input.disposition !== 'granted') {
    return Object.freeze({
      eventId: input.eventId,
      laterCostCreated: false,
      costKinds: Object.freeze([]) as readonly EmergencyBorrowingLaterCostKind[],
    })
  }

  const costKinds: EmergencyBorrowingLaterCostKind[] = []
  if (accessConditions.includes('stigma')) costKinds.push('stigma')
  if (accessConditions.includes('audit_exposure')) costKinds.push('audit_pressure')
  if (accessConditions.includes('supervision_escalation')) {
    costKinds.push('tighter_supervision')
  }
  if (
    accessConditions.includes('collateral') ||
    accessConditions.includes('penalty_pricing') ||
    accessConditions.includes('restricted_use')
  ) {
    costKinds.push('depleted_future_flexibility')
  }
  if (costKinds.length === 0) {
    costKinds.push('depleted_future_flexibility')
  }

  return Object.freeze({
    eventId: input.eventId,
    laterCostCreated: true,
    costKinds: freezeStrings(costKinds) as readonly EmergencyBorrowingLaterCostKind[],
  })
}

export interface BranchBorrowingOutcomeDeltaInput {
  readonly branchId: string
  readonly disposition: EmergencyBorrowingDisposition
  readonly temporarySupportReceived: boolean
  readonly baselineStability: 'collapsing' | 'strained' | 'stable'
}

export interface BranchBorrowingOutcomeDeltaResult {
  readonly branchId: string
  readonly disposition: EmergencyBorrowingDisposition
  readonly outcomeDiffersBecauseOfFacility: boolean
  readonly resultingStability: 'collapsing' | 'strained' | 'stable'
  readonly outcomeNote:
    | 'stabilized_by_grant'
    | 'grant_without_support'
    | 'worsened_by_denial'
    | 'concealed_strain_unresolved'
}

/** Branch stability outcome differs when the facility is used, denied, or concealed under strain. */
export function projectBranchBorrowingOutcomeDelta(
  input: unknown
): BranchBorrowingOutcomeDeltaResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.branchId)) return undefined
  if (!isMember(input.disposition, EMERGENCY_BORROWING_DISPOSITIONS)) return undefined
  if (typeof input.temporarySupportReceived !== 'boolean') return undefined
  if (
    input.baselineStability !== 'collapsing' &&
    input.baselineStability !== 'strained' &&
    input.baselineStability !== 'stable'
  ) {
    return undefined
  }

  if (input.disposition === 'granted' && input.temporarySupportReceived) {
    const resultingStability =
      input.baselineStability === 'collapsing' ? 'strained' : 'stable'
    return Object.freeze({
      branchId: input.branchId,
      disposition: input.disposition,
      outcomeDiffersBecauseOfFacility: resultingStability !== input.baselineStability,
      resultingStability,
      outcomeNote: 'stabilized_by_grant' as const,
    })
  }

  if (input.disposition === 'granted') {
    return Object.freeze({
      branchId: input.branchId,
      disposition: input.disposition,
      outcomeDiffersBecauseOfFacility: true,
      resultingStability: input.baselineStability,
      outcomeNote: 'grant_without_support' as const,
    })
  }

  if (input.disposition === 'denied') {
    const resultingStability =
      input.baselineStability === 'stable' ? 'strained' : 'collapsing'
    return Object.freeze({
      branchId: input.branchId,
      disposition: input.disposition,
      outcomeDiffersBecauseOfFacility: true,
      resultingStability,
      outcomeNote: 'worsened_by_denial' as const,
    })
  }

  return Object.freeze({
    branchId: input.branchId,
    disposition: input.disposition,
    outcomeDiffersBecauseOfFacility: true,
    resultingStability: input.baselineStability,
    outcomeNote: 'concealed_strain_unresolved' as const,
  })
}

/** Authored acceptance fixture: strained branch granted staff support with later stigma/audit cost. */
export function authoredStrainedBranchBorrowingFixture(): {
  readonly access: EmergencyBorrowingAccessResult
  readonly event: EmergencyBorrowingEventResult
  readonly laterCost: BorrowingLaterCostResult
  readonly outcome: BranchBorrowingOutcomeDeltaResult
} {
  const access = evaluateEmergencyBorrowingAccess({
    facilityId: EMERGENCY_BORROWING_FACILITY_ID,
    branchId: STRAINED_BRANCH_ID,
    underStrain: true,
    disclosedStrain: true,
    reserveClass: 'staff',
    accessConditions: ['stigma', 'audit_exposure', 'supervision_escalation'],
    centerReserveAvailable: true,
  })!

  const event = projectEmergencyBorrowingEvent({
    eventId: 'borrow:outpost-delta-staff-1',
    facilityId: EMERGENCY_BORROWING_FACILITY_ID,
    branchId: STRAINED_BRANCH_ID,
    reserveClass: 'staff',
    disposition: 'granted',
    accessAllowed: access.accessAllowed,
  })!

  const laterCost = projectBorrowingLaterCost({
    eventId: event.eventId,
    disposition: event.disposition,
    temporarySupportReceived: event.temporarySupportReceived,
    accessConditions: access.accessConditions,
  })!

  const outcome = projectBranchBorrowingOutcomeDelta({
    branchId: STRAINED_BRANCH_ID,
    disposition: event.disposition,
    temporarySupportReceived: event.temporarySupportReceived,
    baselineStability: 'strained',
  })!

  return Object.freeze({ access, event, laterCost, outcome })
}
