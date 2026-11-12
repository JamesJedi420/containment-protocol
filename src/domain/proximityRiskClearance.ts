/**
 * SPE-2079 — proximity-risk class orthogonal to information clearance.
 *
 * Pure caller-owned packets keep physical exposure-risk class separate from
 * information clearance so staff may work near hazardous zones without case
 * knowledge, and strategic-essential staff may be barred from anomaly zones
 * despite high clearance.
 *
 * This module does not persist GameState, author facility zoning / lockdown
 * packets (SPE-292 `facilityZoningLockdown`), or wire emergency routing (SPE-36).
 */

export const PROXIMITY_RISK_CLASSES = [
  'operationally_blind',
  'proximity_without_knowledge',
  'local_essential',
  'direct_contact',
  'strategic_essential_no_entry',
] as const
export type ProximityRiskClass = (typeof PROXIMITY_RISK_CLASSES)[number]

export const ZONE_CONTACT_KINDS = [
  'non_hazard',
  'proximity_hazard',
  'local_operations',
  'direct_anomaly_contact',
] as const
export type ZoneContactKind = (typeof ZONE_CONTACT_KINDS)[number]

export const INFORMATION_CLEARANCE_OUTCOMES = ['allowed', 'denied'] as const
export type InformationClearanceOutcome = (typeof INFORMATION_CLEARANCE_OUTCOMES)[number]

export const PROXIMITY_GATE_DENIAL_REASONS = [
  'none',
  'proximity_class_insufficient',
  'strategic_essential_contact_barred',
  'information_clearance_denied',
] as const
export type ProximityGateDenialReason = (typeof PROXIMITY_GATE_DENIAL_REASONS)[number]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isMember<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

function proximityRank(riskClass: ProximityRiskClass): number {
  return PROXIMITY_RISK_CLASSES.indexOf(riskClass)
}

function minimumClassForContact(kind: ZoneContactKind): ProximityRiskClass {
  switch (kind) {
    case 'non_hazard':
      return 'operationally_blind'
    case 'proximity_hazard':
      return 'proximity_without_knowledge'
    case 'local_operations':
      return 'local_essential'
    case 'direct_anomaly_contact':
      return 'direct_contact'
  }
}

export interface InformationClearanceDecisionInput {
  readonly outcome: InformationClearanceOutcome
  readonly clearanceLevel?: number
  readonly reasonCode?: string
}

export interface InformationClearanceDecision {
  readonly outcome: InformationClearanceOutcome
  readonly clearanceLevel: number | undefined
  readonly reasonCode: string | undefined
  readonly informationAllowed: boolean
}

/** Normalize a caller-owned information-clearance decision (orthogonal surface). */
export function projectInformationClearanceDecision(
  input: unknown
): InformationClearanceDecision | undefined {
  if (!isRecord(input)) return undefined
  if (!isMember(input.outcome, INFORMATION_CLEARANCE_OUTCOMES)) return undefined
  const clearanceLevel =
    input.clearanceLevel === undefined
      ? undefined
      : typeof input.clearanceLevel === 'number' &&
          Number.isFinite(input.clearanceLevel) &&
          input.clearanceLevel >= 0
        ? input.clearanceLevel
        : undefined
  if (input.clearanceLevel !== undefined && clearanceLevel === undefined) return undefined
  const reasonCode =
    input.reasonCode === undefined
      ? undefined
      : isNonEmptyString(input.reasonCode)
        ? input.reasonCode.trim()
        : undefined
  if (input.reasonCode !== undefined && reasonCode === undefined) return undefined

  return Object.freeze({
    outcome: input.outcome,
    clearanceLevel,
    reasonCode,
    informationAllowed: input.outcome === 'allowed',
  })
}

export interface ProximityZoneEntryInput {
  readonly staffId: string
  readonly zoneId: string
  readonly proximityRiskClass: ProximityRiskClass
  readonly zoneContactKind: ZoneContactKind
  readonly informationClearance: InformationClearanceDecisionInput
  /** Caller-owned explicit information gate; physical proximity alone is sufficient otherwise. */
  readonly requiresInformationClearance?: boolean
  /**
   * Explicit policy override allowing strategic-essential staff into a
   * direct anomaly-contact zone. Absent/false keeps the strategic bar.
   */
  readonly policyBreachFlag?: boolean
}

export interface ProximityZoneEntryResult {
  readonly staffId: string
  readonly zoneId: string
  readonly proximityRiskClass: ProximityRiskClass
  readonly zoneContactKind: ZoneContactKind
  readonly informationAllowed: boolean
  readonly informationClearanceRequired: boolean
  readonly proximityAllowed: boolean
  readonly entryAllowed: boolean
  readonly denialReason: ProximityGateDenialReason
  readonly reasonCodes: readonly string[]
  readonly strategicEssentialContactRequiresBreach: boolean
  readonly policyBreachFlag: boolean
  readonly orthogonalityPreserved: true
}

/**
 * Evaluate physical zone entry from proximity-risk class independently of
 * information clearance. Information denial blocks zone entry only when the
 * caller explicitly requests an information-clearance gate.
 */
export function evaluateProximityZoneEntry(
  input: unknown
): ProximityZoneEntryResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.staffId)) return undefined
  if (!isNonEmptyString(input.zoneId)) return undefined
  if (!isMember(input.proximityRiskClass, PROXIMITY_RISK_CLASSES)) return undefined
  if (!isMember(input.zoneContactKind, ZONE_CONTACT_KINDS)) return undefined
  if (input.policyBreachFlag !== undefined && typeof input.policyBreachFlag !== 'boolean') {
    return undefined
  }
  if (
    input.requiresInformationClearance !== undefined &&
    typeof input.requiresInformationClearance !== 'boolean'
  ) {
    return undefined
  }

  const information = projectInformationClearanceDecision(input.informationClearance)
  if (!information) return undefined

  const policyBreachFlag = input.policyBreachFlag === true
  const requiredClass = minimumClassForContact(input.zoneContactKind)
  const strategicEssentialContactRequiresBreach =
    input.proximityRiskClass === 'strategic_essential_no_entry' &&
    input.zoneContactKind === 'direct_anomaly_contact'

  const reasonCodes: string[] = []
  let denialReason: ProximityGateDenialReason = 'none'
  let proximityAllowed = true

  if (strategicEssentialContactRequiresBreach && !policyBreachFlag) {
    proximityAllowed = false
    denialReason = 'strategic_essential_contact_barred'
    reasonCodes.push('strategic_essential_contact_barred')
  } else if (proximityRank(input.proximityRiskClass) < proximityRank(requiredClass)) {
    // strategic_essential_no_entry ranks above direct_contact in the enum order,
    // so rank alone would allow contact — the strategic bar above handles that.
    proximityAllowed = false
    denialReason = 'proximity_class_insufficient'
    reasonCodes.push('proximity_class_insufficient')
    reasonCodes.push(`required:${requiredClass}`)
  }

  if (policyBreachFlag && strategicEssentialContactRequiresBreach && proximityAllowed) {
    reasonCodes.push('policy_breach_flag_acknowledged')
  }

  const informationAllowed = information.informationAllowed
  if (!informationAllowed) {
    reasonCodes.push('information_clearance_denied')
    if (information.reasonCode) reasonCodes.push(information.reasonCode)
  }

  const informationClearanceRequired = input.requiresInformationClearance === true
  const entryAllowed = proximityAllowed && (!informationClearanceRequired || informationAllowed)
  if (!entryAllowed && denialReason === 'none' && !informationAllowed) {
    denialReason = 'information_clearance_denied'
  }

  return Object.freeze({
    staffId: input.staffId.trim(),
    zoneId: input.zoneId.trim(),
    proximityRiskClass: input.proximityRiskClass,
    zoneContactKind: input.zoneContactKind,
    informationAllowed,
    informationClearanceRequired,
    proximityAllowed,
    entryAllowed,
    denialReason,
    reasonCodes: Object.freeze([...reasonCodes]),
    strategicEssentialContactRequiresBreach,
    policyBreachFlag,
    orthogonalityPreserved: true as const,
  })
}

/**
 * Assignability check: strategic-essential cannot be placed on direct
 * anomaly-contact duty without an explicit policy-breach flag.
 */
export function evaluateStrategicEssentialZoneAssignment(input: unknown):
  | {
      readonly staffId: string
      readonly zoneId: string
      readonly assignmentAllowed: boolean
      readonly denialReason: ProximityGateDenialReason
      readonly reasonCodes: readonly string[]
      readonly policyBreachFlag: boolean
    }
  | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.staffId)) return undefined
  if (!isNonEmptyString(input.zoneId)) return undefined
  if (!isMember(input.proximityRiskClass, PROXIMITY_RISK_CLASSES)) return undefined
  if (!isMember(input.zoneContactKind, ZONE_CONTACT_KINDS)) return undefined
  if (input.policyBreachFlag !== undefined && typeof input.policyBreachFlag !== 'boolean') {
    return undefined
  }

  const policyBreachFlag = input.policyBreachFlag === true
  const barred =
    input.proximityRiskClass === 'strategic_essential_no_entry' &&
    input.zoneContactKind === 'direct_anomaly_contact' &&
    !policyBreachFlag

  if (barred) {
    return Object.freeze({
      staffId: input.staffId.trim(),
      zoneId: input.zoneId.trim(),
      assignmentAllowed: false,
      denialReason: 'strategic_essential_contact_barred' as const,
      reasonCodes: Object.freeze(['strategic_essential_contact_barred'] as const),
      policyBreachFlag,
    })
  }

  const requiredClass = minimumClassForContact(input.zoneContactKind)
  if (proximityRank(input.proximityRiskClass) < proximityRank(requiredClass)) {
    return Object.freeze({
      staffId: input.staffId.trim(),
      zoneId: input.zoneId.trim(),
      assignmentAllowed: false,
      denialReason: 'proximity_class_insufficient' as const,
      reasonCodes: Object.freeze([
        'proximity_class_insufficient',
        `required:${requiredClass}`,
      ]),
      policyBreachFlag,
    })
  }

  return Object.freeze({
    staffId: input.staffId.trim(),
    zoneId: input.zoneId.trim(),
    assignmentAllowed: true,
    denialReason: 'none' as const,
    reasonCodes: Object.freeze(
      policyBreachFlag &&
        input.proximityRiskClass === 'strategic_essential_no_entry' &&
        input.zoneContactKind === 'direct_anomaly_contact'
        ? (['policy_breach_flag_acknowledged'] as const)
        : ([] as const)
    ),
    policyBreachFlag,
  })
}
