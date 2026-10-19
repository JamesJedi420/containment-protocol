/**
 * SPE-1012 — degraded-care facility risk model.
 *
 * Pure caller-owned packets model underfunded care sites where understaffing,
 * closed wings, weak oversight, and hidden resident agency amplify anomaly
 * risk. Official quality claims can contradict floor conditions; hidden zones
 * become operational; residents act as witnesses/channels; care-schedule
 * failures are auditable; hospital transfer does not clear symbolic threat.
 *
 * This module does not persist GameState, run week-close, or simulate full
 * healthcare systems.
 */

export const DEGRADED_CARE_FACILITY_ID = 'facility:degraded-care-ward' as const

export const CARE_QUALITY_CLAIMS = [
  'excellent',
  'adequate',
  'under_review',
] as const
export type CareQualityClaim = (typeof CARE_QUALITY_CLAIMS)[number]

export const OBSERVED_FLOOR_CONDITIONS = [
  'stable',
  'neglect',
  'rough_handling',
  'absent_safety_knowledge',
] as const
export type ObservedFloorCondition = (typeof OBSERVED_FLOOR_CONDITIONS)[number]

export const HIDDEN_ZONE_KINDS = [
  'inactive_wing',
  'basement',
  'partially_closed',
] as const
export type HiddenZoneKind = (typeof HIDDEN_ZONE_KINDS)[number]

export const HIDDEN_ZONE_USES = [
  'none',
  'contraband_route',
  'anomaly_habitat',
  'body_storage',
  'hidden_production',
] as const
export type HiddenZoneUse = (typeof HIDDEN_ZONE_USES)[number]

export const RESIDENT_AGENCY_ROLES = [
  'passive',
  'witness',
  'channel',
  'contraband_holder',
] as const
export type ResidentAgencyRole = (typeof RESIDENT_AGENCY_ROLES)[number]

export const STAFF_KNOWLEDGE_ROLES = [
  'administrator',
  'doctor',
  'aide',
  'resident',
] as const
export type StaffKnowledgeRole = (typeof STAFF_KNOWLEDGE_ROLES)[number]

export const CARE_SCHEDULE_FAILURES = [
  'skipped_meal',
  'missed_round',
  'absent_hygiene',
  'broken_recreation',
  'handoff_neglect',
] as const
export type CareScheduleFailure = (typeof CARE_SCHEDULE_FAILURES)[number]

export const RISK_BANDS = ['baseline', 'elevated', 'critical'] as const
export type RiskBand = (typeof RISK_BANDS)[number]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isMember<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

function riskRank(band: RiskBand): number {
  return RISK_BANDS.indexOf(band)
}

export interface DegradedCareRiskInput {
  readonly facilityId: string
  readonly understaffed: boolean
  readonly deferredMaintenance: boolean
  readonly intermittentMedicalCoverage: boolean
  readonly officialQualityClaim: CareQualityClaim
  readonly observedFloorCondition: ObservedFloorCondition
  readonly baselineAnomalyRisk: RiskBand
}

export interface DegradedCareRiskResult {
  readonly facilityId: string
  readonly effectiveAnomalyRisk: RiskBand
  readonly amplifiesVsBaseline: boolean
  readonly qualityClaimContradiction: boolean
  readonly officialQualityClaim: CareQualityClaim
  readonly observedFloorCondition: ObservedFloorCondition
}

function deriveEffectiveRisk(input: DegradedCareRiskInput): RiskBand {
  let rank = riskRank(input.baselineAnomalyRisk)
  if (input.understaffed) rank += 1
  if (input.deferredMaintenance) rank += 1
  if (input.intermittentMedicalCoverage) rank += 1
  if (input.observedFloorCondition !== 'stable') rank += 1
  if (rank <= 0) return 'baseline'
  if (rank === 1) return 'elevated'
  return 'critical'
}

/** Project amplified anomaly risk and quality-claim contradiction. */
export function projectDegradedCareRisk(
  input: unknown
): DegradedCareRiskResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (typeof input.understaffed !== 'boolean') return undefined
  if (typeof input.deferredMaintenance !== 'boolean') return undefined
  if (typeof input.intermittentMedicalCoverage !== 'boolean') return undefined
  if (!isMember(input.officialQualityClaim, CARE_QUALITY_CLAIMS)) return undefined
  if (!isMember(input.observedFloorCondition, OBSERVED_FLOOR_CONDITIONS)) {
    return undefined
  }
  if (!isMember(input.baselineAnomalyRisk, RISK_BANDS)) return undefined

  const typed = input as DegradedCareRiskInput
  const effectiveAnomalyRisk = deriveEffectiveRisk(typed)
  const qualityClaimContradiction =
    (typed.officialQualityClaim === 'excellent' ||
      typed.officialQualityClaim === 'adequate') &&
    typed.observedFloorCondition !== 'stable'

  return Object.freeze({
    facilityId: typed.facilityId,
    effectiveAnomalyRisk,
    amplifiesVsBaseline:
      riskRank(effectiveAnomalyRisk) > riskRank(typed.baselineAnomalyRisk),
    qualityClaimContradiction,
    officialQualityClaim: typed.officialQualityClaim,
    observedFloorCondition: typed.observedFloorCondition,
  })
}

export interface HiddenZoneActivationInput {
  readonly facilityId: string
  readonly zoneId: string
  readonly zoneKind: HiddenZoneKind
  readonly partiallyClosed: boolean
  readonly activatedUse: HiddenZoneUse
}

export interface HiddenZoneActivationResult {
  readonly facilityId: string
  readonly zoneId: string
  readonly zoneKind: HiddenZoneKind
  readonly operationallyImportant: boolean
  readonly activatedUse: HiddenZoneUse
}

/** Partially closed / inactive zones become operationally important when used. */
export function projectHiddenZoneActivation(
  input: unknown
): HiddenZoneActivationResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.zoneId)) return undefined
  if (!isMember(input.zoneKind, HIDDEN_ZONE_KINDS)) return undefined
  if (typeof input.partiallyClosed !== 'boolean') return undefined
  if (!isMember(input.activatedUse, HIDDEN_ZONE_USES)) return undefined

  const operationallyImportant =
    input.activatedUse !== 'none' &&
    (input.partiallyClosed ||
      input.zoneKind === 'inactive_wing' ||
      input.zoneKind === 'basement')

  return Object.freeze({
    facilityId: input.facilityId,
    zoneId: input.zoneId,
    zoneKind: input.zoneKind,
    operationallyImportant,
    activatedUse: input.activatedUse,
  })
}

export interface ResidentAgencyInput {
  readonly facilityId: string
  readonly residentId: string
  readonly agencyRole: ResidentAgencyRole
  readonly hidesSupplies: boolean
  readonly warnsInvestigators: boolean
}

export interface ResidentAgencyResult {
  readonly facilityId: string
  readonly residentId: string
  readonly agencyRole: ResidentAgencyRole
  readonly activeParticipant: boolean
  readonly meaningfulCaseActor: boolean
}

/** Residents act as witnesses, channels, or contraband holders — not scenery. */
export function projectResidentAgency(
  input: unknown
): ResidentAgencyResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.residentId)) return undefined
  if (!isMember(input.agencyRole, RESIDENT_AGENCY_ROLES)) return undefined
  if (typeof input.hidesSupplies !== 'boolean') return undefined
  if (typeof input.warnsInvestigators !== 'boolean') return undefined

  const meaningfulCaseActor =
    input.agencyRole !== 'passive' ||
    input.hidesSupplies ||
    input.warnsInvestigators

  return Object.freeze({
    facilityId: input.facilityId,
    residentId: input.residentId,
    agencyRole: input.agencyRole,
    activeParticipant: meaningfulCaseActor,
    meaningfulCaseActor,
  })
}

export interface CareScheduleAuditInput {
  readonly facilityId: string
  readonly failures: readonly CareScheduleFailure[]
}

export interface CareScheduleAuditResult {
  readonly facilityId: string
  readonly failureCount: number
  readonly systemicNeglect: boolean
  readonly failures: readonly CareScheduleFailure[]
  readonly isolatedFlavorOnly: false
}

/** Skipped care cadence surfaces as auditable systemic neglect. */
export function projectCareScheduleAudit(
  input: unknown
): CareScheduleAuditResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!Array.isArray(input.failures)) return undefined

  const failures: CareScheduleFailure[] = []
  const seen = new Set<string>()
  for (const item of input.failures) {
    if (!isMember(item, CARE_SCHEDULE_FAILURES)) return undefined
    if (seen.has(item)) continue
    seen.add(item)
    failures.push(item)
  }

  return Object.freeze({
    facilityId: input.facilityId,
    failureCount: failures.length,
    systemicNeglect: failures.length > 0,
    failures: Object.freeze([...failures]),
    isolatedFlavorOnly: false as const,
  })
}

export interface RecoveryTransferThreatInput {
  readonly facilityId: string
  readonly caseId: string
  readonly transferKind: 'hospital' | 'recovery_room'
  readonly symbolicPressureActive: boolean
  readonly hauntingLinkedPressureActive: boolean
  readonly preTransferThreat: RiskBand
}

export interface RecoveryTransferThreatResult {
  readonly facilityId: string
  readonly caseId: string
  readonly transferKind: 'hospital' | 'recovery_room'
  readonly postTransferThreat: RiskBand
  readonly threatReduced: boolean
  readonly clinicalTransferInsufficient: boolean
}

/** Hospital/recovery transfer does not clear symbolic or haunting-linked threat. */
export function projectRecoveryTransferThreat(
  input: unknown
): RecoveryTransferThreatResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.caseId)) return undefined
  if (!isMember(input.transferKind, ['hospital', 'recovery_room'] as const)) {
    return undefined
  }
  if (typeof input.symbolicPressureActive !== 'boolean') return undefined
  if (typeof input.hauntingLinkedPressureActive !== 'boolean') return undefined
  if (!isMember(input.preTransferThreat, RISK_BANDS)) return undefined

  const pressureRemains =
    input.symbolicPressureActive || input.hauntingLinkedPressureActive
  const postTransferThreat = pressureRemains
    ? input.preTransferThreat
    : RISK_BANDS[Math.max(0, riskRank(input.preTransferThreat) - 1)]!

  return Object.freeze({
    facilityId: input.facilityId,
    caseId: input.caseId,
    transferKind: input.transferKind,
    postTransferThreat,
    threatReduced: riskRank(postTransferThreat) < riskRank(input.preTransferThreat),
    clinicalTransferInsufficient: pressureRemains,
  })
}

export interface UnevenStaffKnowledgeInput {
  readonly facilityId: string
  readonly role: StaffKnowledgeRole
  readonly knowsOfficialClaim: boolean
  readonly knowsFloorNeglect: boolean
  readonly knowsHiddenZone: boolean
}

export interface UnevenStaffKnowledgeResult {
  readonly facilityId: string
  readonly role: StaffKnowledgeRole
  readonly knowledgeFragmentCount: number
  readonly unevenInstitutionalKnowledge: true
}

/** Role-scoped fragments of site truth (not a shared omniscient staff model). */
export function projectUnevenStaffKnowledge(
  input: unknown
): UnevenStaffKnowledgeResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isMember(input.role, STAFF_KNOWLEDGE_ROLES)) return undefined
  if (typeof input.knowsOfficialClaim !== 'boolean') return undefined
  if (typeof input.knowsFloorNeglect !== 'boolean') return undefined
  if (typeof input.knowsHiddenZone !== 'boolean') return undefined

  const knowledgeFragmentCount = [
    input.knowsOfficialClaim,
    input.knowsFloorNeglect,
    input.knowsHiddenZone,
  ].filter(Boolean).length

  return Object.freeze({
    facilityId: input.facilityId,
    role: input.role,
    knowledgeFragmentCount,
    unevenInstitutionalKnowledge: true as const,
  })
}
