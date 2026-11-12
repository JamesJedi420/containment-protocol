/**
 * SPE-2121 slice 1: alternate-reality threshold route registry.
 *
 * Pure deterministic registry for doorways, frames, and portals that transport
 * actors between destination layers with explicit return rules and accountability.
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type ThresholdRouteId = string

export type ReturnRule = 'mandatory' | 'optional' | 'one_way' | 'unknown'

export const RETURN_RULES: readonly ReturnRule[] = [
  'mandatory',
  'optional',
  'one_way',
  'unknown',
] as const

export type AuthorizationClass =
  | 'public_threshold'
  | 'credential_gated'
  | 'clearance_bound'
  | 'containment_only'

export const AUTHORIZATION_CLASSES: readonly AuthorizationClass[] = [
  'public_threshold',
  'credential_gated',
  'clearance_bound',
  'containment_only',
] as const

export type JurisdictionHandoff = 'none' | 'partial' | 'full' | 'disputed'

export const JURISDICTION_HANDOFFS: readonly JurisdictionHandoff[] = [
  'none',
  'partial',
  'full',
  'disputed',
] as const

export type TransitRisk = 'low' | 'high' | 'lossy'

export const TRANSIT_RISKS: readonly TransitRisk[] = ['low', 'high', 'lossy'] as const

export type AccountabilityBand = 'low' | 'elevated' | 'critical'

export const ACCOUNTABILITY_BANDS: readonly AccountabilityBand[] = [
  'low',
  'elevated',
  'critical',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface ThresholdRouteRecord {
  readonly id: ThresholdRouteId
  readonly label: string
  readonly summary?: string
  readonly entryRef: string
  readonly destinationLayerId: string
  readonly returnRule: ReturnRule
  readonly authorizationClass: AuthorizationClass
  readonly jurisdictionHandoff: JurisdictionHandoff
  readonly transitRisk: TransitRisk
  readonly lostPersonRefs?: readonly string[]
  readonly roundTripScheduleRefs?: readonly string[]
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ThresholdRouteValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_entry_ref'
  | 'missing_destination_layer_id'
  | 'invalid_return_rule'
  | 'invalid_authorization_class'
  | 'invalid_jurisdiction_handoff'
  | 'invalid_transit_risk'
  | 'invalid_confidence'
  | 'invalid_lost_person_refs'
  | 'invalid_lost_person_ref'
  | 'empty_lost_person_ref'
  | 'invalid_round_trip_schedule_refs'
  | 'invalid_round_trip_schedule_ref'
  | 'empty_round_trip_schedule_ref'
  | 'one_way_with_mandatory_return_policy'
  | 'unknown_return_with_scheduled_round_trip'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface ThresholdRouteValidationIssue {
  readonly code: ThresholdRouteValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface ThresholdRouteValidationResult {
  readonly valid: boolean
  readonly issues: readonly ThresholdRouteValidationIssue[]
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export interface TransitAccountabilityProjectionPolicy {
  readonly currentWeek?: number
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
  readonly suppressHiddenConflictLabels?: boolean
}

export interface JurisdictionSymptom {
  readonly ref: string
  readonly symptomDescriptor: string
  readonly evidenceGapHint: string | null
}

export interface LostPersonCustodyForecast {
  readonly ref: string
  readonly custodyDescriptor: string
}

export interface TransitAccountabilityProjection {
  readonly recordId: ThresholdRouteId
  readonly label: string
  readonly returnRule: ReturnRule
  readonly jurisdictionHandoff: JurisdictionHandoff
  readonly transitRisk: TransitRisk
  readonly projectedPopulationRisk: number | null
  readonly projectedEvidenceRisk: number | null
  readonly accountabilityBand: AccountabilityBand | null
  readonly jurisdictionSymptoms: readonly JurisdictionSymptom[]
  readonly lostPersonForecasts: readonly LostPersonCustodyForecast[]
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const RETURN_RULE_SET = new Set<string>(RETURN_RULES)
const AUTHORIZATION_CLASS_SET = new Set<string>(AUTHORIZATION_CLASSES)
const JURISDICTION_HANDOFF_SET = new Set<string>(JURISDICTION_HANDOFFS)
const TRANSIT_RISK_SET = new Set<string>(TRANSIT_RISKS)

export const FRANCHISE_TOKEN_PATTERN =
  /(?:\b(?:scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|group of interest|broken masquerade|masquerade breach|wiki\.|wikidot)\b|goi-)/i

export const BRANDED_OBJECT_NUMBER_PATTERN = /\bSCP[\s-]?\d{3,4}\b/i

const RETURN_RULE_PRESSURE: Readonly<Record<ReturnRule, number>> = {
  mandatory: 0.05,
  optional: 0.12,
  one_way: 0.22,
  unknown: 0.18,
}

const TRANSIT_RISK_PRESSURE: Readonly<Record<TransitRisk, number>> = {
  low: 0.05,
  high: 0.15,
  lossy: 0.25,
}

const JURISDICTION_HANDOFF_PRESSURE: Readonly<Record<JurisdictionHandoff, number>> = {
  none: 0.02,
  partial: 0.1,
  full: 0.08,
  disputed: 0.18,
}

const AUTHORIZATION_MITIGATION: Readonly<Record<AuthorizationClass, number>> = {
  public_threshold: 0,
  credential_gated: 0.05,
  clearance_bound: 0.08,
  containment_only: 0.12,
}

const JURISDICTION_SYMPTOM_PREFIX: Readonly<Record<JurisdictionHandoff, string>> = {
  none: 'No jurisdiction handoff signal observed at',
  partial: 'Partial jurisdiction transfer observed at',
  full: 'Full jurisdiction transfer observed at',
  disputed: 'Disputed jurisdiction overlap observed at',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function sortedStringArray(value: unknown): readonly string[] {
  return Object.freeze(
    [...asStringArray(value)].sort((left, right) => left.localeCompare(right))
  )
}

function pushIssue(
  issues: ThresholdRouteValidationIssue[],
  issue: ThresholdRouteValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: ThresholdRouteValidationIssue[]) {
  return [...issues].sort((left, right) => {
    const codeCompare = left.code.localeCompare(right.code)
    if (codeCompare !== 0) {
      return codeCompare
    }

    const severityCompare = left.severity.localeCompare(right.severity)
    if (severityCompare !== 0) {
      return severityCompare
    }

    return left.detail.localeCompare(right.detail)
  })
}

function isValidUnitScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function roundUnit(value: number): number {
  return Math.round(value * 1000) / 1000
}

function freezeValidationResult(
  issues: ThresholdRouteValidationIssue[]
): ThresholdRouteValidationResult {
  const sortedIssues = sortValidationIssues(issues)
  const hasError = sortedIssues.some((issue) => issue.severity === 'error')

  return Object.freeze({
    valid: !hasError,
    issues: Object.freeze(
      sortedIssues.map((issue) =>
        Object.freeze({
          ...issue,
          ...(issue.relatedIds ? { relatedIds: Object.freeze([...issue.relatedIds]) } : {}),
        })
      )
    ),
  })
}

function containsFranchiseToken(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && FRANCHISE_TOKEN_PATTERN.test(token)
}

function containsBrandedObjectNumber(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && BRANDED_OBJECT_NUMBER_PATTERN.test(token)
}

function hasNonEmptyRefArray(value: unknown): boolean {
  return asStringArray(value).some((ref) => normalizeToken(ref).length > 0)
}

function validateOptionalStringRefArray(
  issues: ThresholdRouteValidationIssue[],
  id: string,
  fieldName: string,
  value: unknown,
  invalidArrayCode: ThresholdRouteValidationCode,
  invalidEntryCode: ThresholdRouteValidationCode,
  emptyEntryCode: ThresholdRouteValidationCode
) {
  if (value === undefined) {
    return
  }

  if (!Array.isArray(value)) {
    pushIssue(issues, {
      code: invalidArrayCode,
      severity: 'error',
      detail: `Threshold route record ${id || '(unknown)'} ${fieldName} must be an array.`,
      relatedIds: id ? [id] : undefined,
    })
    return
  }

  for (const entry of value) {
    if (typeof entry !== 'string') {
      pushIssue(issues, {
        code: invalidEntryCode,
        severity: 'error',
        detail: `Threshold route record ${id || '(unknown)'} ${fieldName} contains a non-string ref.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!normalizeToken(entry)) {
      pushIssue(issues, {
        code: emptyEntryCode,
        severity: 'error',
        detail: `Threshold route record ${id || '(unknown)'} ${fieldName} contains an empty ref.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }
}

function scanStringFieldTokens(
  issues: ThresholdRouteValidationIssue[],
  id: string,
  field: string,
  value: string
) {
  const token = normalizeToken(value)
  if (!token) {
    return
  }

  if (containsFranchiseToken(token)) {
    pushIssue(issues, {
      code: 'franchise_token_in_field',
      severity: 'error',
      detail: `Threshold route record ${id || '(unknown)'} field ${field} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(token)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_field',
      severity: 'error',
      detail: `Threshold route record ${id || '(unknown)'} field ${field} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function scanRefArrayTokens(
  issues: ThresholdRouteValidationIssue[],
  id: string,
  field: string,
  refs: readonly string[]
) {
  for (const ref of refs) {
    scanStringFieldTokens(issues, id, field, ref)
  }
}

function scanForbiddenTokens(
  issues: ThresholdRouteValidationIssue[],
  id: string,
  label: string,
  record: ThresholdRouteRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Threshold route record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Threshold route record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Threshold route record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Threshold route record label ${label || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.summary) {
    scanStringFieldTokens(issues, id, 'summary', record.summary)
  }

  scanStringFieldTokens(issues, id, 'entryRef', record.entryRef)
  scanStringFieldTokens(issues, id, 'destinationLayerId', record.destinationLayerId)
  scanRefArrayTokens(issues, id, 'lostPersonRefs', asStringArray(record.lostPersonRefs))
  scanRefArrayTokens(
    issues,
    id,
    'roundTripScheduleRefs',
    asStringArray(record.roundTripScheduleRefs)
  )
}

function resolveConfidence(
  record: ThresholdRouteRecord,
  policy: TransitAccountabilityProjectionPolicy
): number | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  if (redactedFields.has('confidence')) {
    return null
  }

  const confidence = record.confidence ?? null
  if (
    confidence !== null &&
    policy.minimumConfidence !== undefined &&
    confidence < policy.minimumConfidence
  ) {
    return null
  }

  if (policy.redactUnknown === true && unknownFields.includes('confidence')) {
    return null
  }

  return confidence
}

function resolveAccountabilityBand(score: number | null): AccountabilityBand | null {
  if (score === null) {
    return null
  }

  if (score < 0.34) {
    return 'low'
  }

  if (score < 0.67) {
    return 'elevated'
  }

  return 'critical'
}

function resolveLostPersonPressure(record: ThresholdRouteRecord): number {
  const refs = asStringArray(record.lostPersonRefs)
    .map((ref) => normalizeToken(ref))
    .filter((ref) => ref.length > 0)

  return Math.min(0.2, refs.length * 0.05)
}

function masksRiskInput(
  field: string,
  redactedFields: ReadonlySet<string>,
  unknownFields: readonly string[],
  policy: TransitAccountabilityProjectionPolicy
): boolean {
  return (
    redactedFields.has(field) ||
    (policy.redactUnknown === true && unknownFields.includes(field))
  )
}

function resolveProjectedRisks(
  record: ThresholdRouteRecord,
  policy: TransitAccountabilityProjectionPolicy
): { populationRisk: number | null; evidenceRisk: number | null } {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  const riskInputFields = [
    'transitRisk',
    'returnRule',
    'jurisdictionHandoff',
    'authorizationClass',
    'lostPersonRefs',
  ] as const

  if (
    riskInputFields.some((field) =>
      masksRiskInput(field, redactedFields, unknownFields, policy)
    )
  ) {
    return { populationRisk: null, evidenceRisk: null }
  }

  const returnRule = isReturnRule(record.returnRule) ? record.returnRule : 'unknown'
  const transitRisk = isTransitRisk(record.transitRisk) ? record.transitRisk : 'low'
  const jurisdictionHandoff = isJurisdictionHandoff(record.jurisdictionHandoff)
    ? record.jurisdictionHandoff
    : 'none'
  const authorizationClass = isAuthorizationClass(record.authorizationClass)
    ? record.authorizationClass
    : 'public_threshold'

  const currentWeek =
    typeof policy.currentWeek === 'number' && Number.isFinite(policy.currentWeek)
      ? Math.max(0, Math.trunc(policy.currentWeek))
      : 0

  const weekDrift = currentWeek * 0.01
  const lostPersonPressure = resolveLostPersonPressure(record)
  const basePressure =
    RETURN_RULE_PRESSURE[returnRule] +
    TRANSIT_RISK_PRESSURE[transitRisk] +
    JURISDICTION_HANDOFF_PRESSURE[jurisdictionHandoff] +
    lostPersonPressure +
    weekDrift

  const mitigation = AUTHORIZATION_MITIGATION[authorizationClass]
  const populationRisk = roundUnit(Math.max(0, Math.min(1, basePressure - mitigation * 0.6)))
  const evidenceRisk = roundUnit(
    Math.max(0, Math.min(1, basePressure * 0.85 + JURISDICTION_HANDOFF_PRESSURE[jurisdictionHandoff]))
  )

  return { populationRisk, evidenceRisk }
}

function resolveEvidenceGapHint(
  record: ThresholdRouteRecord,
  ref: string,
  policy: TransitAccountabilityProjectionPolicy
): string | null {
  if (policy.suppressHiddenConflictLabels === true) {
    return null
  }

  const transitRisk = isTransitRisk(record.transitRisk) ? record.transitRisk : 'low'
  return `evidence_chain_gap:${transitRisk}:${normalizeToken(ref) || 'unknown_ref'}`
}

function buildJurisdictionSymptoms(
  record: ThresholdRouteRecord,
  policy: TransitAccountabilityProjectionPolicy
): readonly JurisdictionSymptom[] {
  const jurisdictionHandoff = isJurisdictionHandoff(record.jurisdictionHandoff)
    ? record.jurisdictionHandoff
    : 'none'
  const entryRef = normalizeToken(record.entryRef) || 'unknown_entry'
  const destinationLayerId = normalizeToken(record.destinationLayerId) || 'unknown_layer'

  const refs = [entryRef, destinationLayerId].sort((left, right) => left.localeCompare(right))

  return Object.freeze(
    refs.map((ref) =>
      Object.freeze({
        ref,
        symptomDescriptor: `${JURISDICTION_SYMPTOM_PREFIX[jurisdictionHandoff]} ${ref}`,
        evidenceGapHint: resolveEvidenceGapHint(record, ref, policy),
      })
    )
  )
}

function buildLostPersonForecasts(
  record: ThresholdRouteRecord
): readonly LostPersonCustodyForecast[] {
  const refs = asStringArray(record.lostPersonRefs)
    .map((ref) => normalizeToken(ref))
    .filter((ref) => ref.length > 0)
    .sort((left, right) => left.localeCompare(right))

  return Object.freeze(
    refs.map((ref) =>
      Object.freeze({
        ref,
        custodyDescriptor: `Unaccounted transit subject forecast for ${ref}`,
      })
    )
  )
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isReturnRule(value: unknown): value is ReturnRule {
  return typeof value === 'string' && RETURN_RULE_SET.has(value)
}

export function isAuthorizationClass(value: unknown): value is AuthorizationClass {
  return typeof value === 'string' && AUTHORIZATION_CLASS_SET.has(value)
}

export function isJurisdictionHandoff(value: unknown): value is JurisdictionHandoff {
  return typeof value === 'string' && JURISDICTION_HANDOFF_SET.has(value)
}

export function isTransitRisk(value: unknown): value is TransitRisk {
  return typeof value === 'string' && TRANSIT_RISK_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateThresholdRouteRecord(
  record: ThresholdRouteRecord
): ThresholdRouteValidationResult {
  const issues: ThresholdRouteValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const entryRef = normalizeToken(record.entryRef)
  const destinationLayerId = normalizeToken(record.destinationLayerId)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Threshold route record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Threshold route record is missing label.',
    })
  }

  if (!entryRef) {
    pushIssue(issues, {
      code: 'missing_entry_ref',
      severity: 'error',
      detail: `Threshold route record ${id || '(unknown)'} is missing entryRef.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!destinationLayerId) {
    pushIssue(issues, {
      code: 'missing_destination_layer_id',
      severity: 'error',
      detail: `Threshold route record ${id || '(unknown)'} is missing destinationLayerId.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isReturnRule(record.returnRule)) {
    pushIssue(issues, {
      code: 'invalid_return_rule',
      severity: 'error',
      detail: `Threshold route record ${id || '(unknown)'} has invalid returnRule ${String(record.returnRule)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isAuthorizationClass(record.authorizationClass)) {
    pushIssue(issues, {
      code: 'invalid_authorization_class',
      severity: 'error',
      detail: `Threshold route record ${id || '(unknown)'} has invalid authorizationClass ${String(record.authorizationClass)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isJurisdictionHandoff(record.jurisdictionHandoff)) {
    pushIssue(issues, {
      code: 'invalid_jurisdiction_handoff',
      severity: 'error',
      detail: `Threshold route record ${id || '(unknown)'} has invalid jurisdictionHandoff ${String(record.jurisdictionHandoff)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isTransitRisk(record.transitRisk)) {
    pushIssue(issues, {
      code: 'invalid_transit_risk',
      severity: 'error',
      detail: `Threshold route record ${id || '(unknown)'} has invalid transitRisk ${String(record.transitRisk)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Threshold route record ${id || '(unknown)'} confidence must be between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  validateOptionalStringRefArray(
    issues,
    id,
    'lostPersonRefs',
    record.lostPersonRefs,
    'invalid_lost_person_refs',
    'invalid_lost_person_ref',
    'empty_lost_person_ref'
  )

  validateOptionalStringRefArray(
    issues,
    id,
    'roundTripScheduleRefs',
    record.roundTripScheduleRefs,
    'invalid_round_trip_schedule_refs',
    'invalid_round_trip_schedule_ref',
    'empty_round_trip_schedule_ref'
  )

  scanForbiddenTokens(issues, id, label, record)

  if (record.returnRule === 'one_way' && hasNonEmptyRefArray(record.roundTripScheduleRefs)) {
    pushIssue(issues, {
      code: 'one_way_with_mandatory_return_policy',
      severity: 'error',
      detail: `Threshold route record ${id || '(unknown)'} is one_way but declares scheduled round-trip operations.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.returnRule === 'unknown' && hasNonEmptyRefArray(record.roundTripScheduleRefs)) {
    pushIssue(issues, {
      code: 'unknown_return_with_scheduled_round_trip',
      severity: 'warning',
      detail: `Threshold route record ${id || '(unknown)'} has unknown returnRule but scheduled round-trip operations.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Projects deterministic transit accountability for population and evidence custody.
 * SPE-765 route-graph wiring remains deferred.
 */
export function projectTransitAccountability(
  record: ThresholdRouteRecord,
  policy: TransitAccountabilityProjectionPolicy = {}
): TransitAccountabilityProjection {
  const recordId = normalizeToken(record.id) || '(unknown)'
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)
  const confidence = resolveConfidence(record, policy)
  const { populationRisk, evidenceRisk } = resolveProjectedRisks(record, policy)

  const jurisdictionRedacted =
    redactedFields.has('jurisdictionHandoff') ||
    (policy.redactUnknown === true && unknownFields.includes('jurisdictionHandoff'))

  const jurisdictionSymptoms = jurisdictionRedacted
    ? Object.freeze([])
    : buildJurisdictionSymptoms(record, policy)

  const lostPersonRedacted =
    redactedFields.has('lostPersonRefs') ||
    (policy.redactUnknown === true && unknownFields.includes('lostPersonRefs'))

  const lostPersonForecasts = lostPersonRedacted
    ? Object.freeze([])
    : buildLostPersonForecasts(record)

  const riskRedacted =
    redactedFields.has('transitRisk') ||
    (policy.redactUnknown === true && unknownFields.includes('transitRisk'))

  const redacted =
    jurisdictionRedacted ||
    lostPersonRedacted ||
    riskRedacted ||
    redactedFields.has('confidence') ||
    (policy.redactUnknown === true && unknownFields.includes('confidence')) ||
    (confidence === null && record.confidence !== undefined && policy.minimumConfidence !== undefined)

  const activeRisks = [populationRisk, evidenceRisk].filter(
    (risk): risk is number => risk !== null
  )
  const accountabilityScore =
    activeRisks.length === 0 ? null : roundUnit(Math.max(...activeRisks))

  return Object.freeze({
    recordId,
    label: normalizeToken(record.label) || '(unknown)',
    returnRule: isReturnRule(record.returnRule) ? record.returnRule : 'unknown',
    jurisdictionHandoff: isJurisdictionHandoff(record.jurisdictionHandoff)
      ? record.jurisdictionHandoff
      : 'none',
    transitRisk: isTransitRisk(record.transitRisk) ? record.transitRisk : 'low',
    projectedPopulationRisk: populationRisk,
    projectedEvidenceRisk: evidenceRisk,
    accountabilityBand: resolveAccountabilityBand(accountabilityScore),
    jurisdictionSymptoms,
    lostPersonForecasts,
    confidence,
    redacted,
    unknownFields,
  })
}

function defineRecord(record: ThresholdRouteRecord): ThresholdRouteRecord {
  return Object.freeze({ ...record })
}

/** Optional-return threshold with partial jurisdiction handoff. */
export const OPTIONAL_RETURN_JURISDICTION_FIXTURE: ThresholdRouteRecord = defineRecord({
  id: 'threshold-route:optional-return-frame-b',
  label: 'Optional-return observation frame',
  summary: 'Cross-layer frame with optional return and partial jurisdiction transfer.',
  entryRef: 'site:observation-wing-frame-b',
  destinationLayerId: 'layer:adjacent-reality-shelf-2',
  returnRule: 'optional',
  authorizationClass: 'credential_gated',
  jurisdictionHandoff: 'partial',
  transitRisk: 'low',
  confidence: 0.81,
})

/** One-way threshold route without scheduled return operations. */
export const ONE_WAY_ROUTE_FIXTURE: ThresholdRouteRecord = defineRecord({
  id: 'threshold-route:one-way-archive-portal',
  label: 'One-way archive portal',
  summary: 'Single-direction threshold with clearance-bound access and disputed jurisdiction.',
  entryRef: 'site:archive-vault-threshold-7',
  destinationLayerId: 'layer:sealed-records-pocket',
  returnRule: 'one_way',
  authorizationClass: 'clearance_bound',
  jurisdictionHandoff: 'disputed',
  transitRisk: 'high',
  lostPersonRefs: ['person:transit-subject-missing-4'],
  confidence: 0.72,
})
