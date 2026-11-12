/**
 * SPE-2122 slice 1: mass anomalous population emergence registry.
 *
 * Pure deterministic registry for single events that instantly create large
 * newly anomalous public populations requiring registration, triage, rights
 * review, education burden, and security surge capacity.
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type PopulationEmergenceId = string

export type EmergenceMagnitudeBand = 'local' | 'regional' | 'national' | 'global'

export const EMERGENCE_MAGNITUDE_BANDS: readonly EmergenceMagnitudeBand[] = [
  'local',
  'regional',
  'national',
  'global',
] as const

export type GovernanceMode = 'secrecy_restore' | 'managed_disclosure' | 'collapsed_masquerade'

export const GOVERNANCE_MODES: readonly GovernanceMode[] = [
  'secrecy_restore',
  'managed_disclosure',
  'collapsed_masquerade',
] as const

export type GovernanceSurgeBand = 'low' | 'elevated' | 'critical'

export const GOVERNANCE_SURGE_BANDS: readonly GovernanceSurgeBand[] = [
  'low',
  'elevated',
  'critical',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface PopulationEmergenceRecord {
  readonly id: PopulationEmergenceId
  readonly label: string
  readonly summary?: string
  readonly emergenceMagnitudeBand: EmergenceMagnitudeBand
  readonly newlyAnomalousCountEstimate: number
  readonly registrationBacklogWeeks: number
  readonly governanceMode: GovernanceMode
  readonly triageLanes: readonly string[]
  readonly rightsReviewQueueRefs?: readonly string[]
  readonly publicEducationBurden: number
  readonly securitySurgeRefs?: readonly string[]
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type PopulationEmergenceValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'invalid_emergence_magnitude_band'
  | 'invalid_governance_mode'
  | 'invalid_newly_anomalous_count_estimate'
  | 'invalid_registration_backlog_weeks'
  | 'invalid_public_education_burden'
  | 'invalid_confidence'
  | 'invalid_triage_lanes'
  | 'invalid_triage_lane'
  | 'empty_triage_lane'
  | 'empty_triage_lanes'
  | 'invalid_rights_review_queue_refs'
  | 'invalid_rights_review_queue_ref'
  | 'empty_rights_review_queue_ref'
  | 'invalid_security_surge_refs'
  | 'invalid_security_surge_ref'
  | 'empty_security_surge_ref'
  | 'global_magnitude_with_secrecy_restore'
  | 'national_magnitude_without_security_surge'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface PopulationEmergenceValidationIssue {
  readonly code: PopulationEmergenceValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface PopulationEmergenceValidationResult {
  readonly valid: boolean
  readonly issues: readonly PopulationEmergenceValidationIssue[]
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export interface GovernanceSurgeProjectionPolicy {
  readonly currentWeek?: number
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
  readonly suppressHiddenConflictLabels?: boolean
}

export interface TriageLaneSymptom {
  readonly lane: string
  readonly symptomDescriptor: string
  readonly capacityGapHint: string | null
}

export interface GovernanceSurgeProjection {
  readonly recordId: PopulationEmergenceId
  readonly label: string
  readonly emergenceMagnitudeBand: EmergenceMagnitudeBand
  readonly governanceMode: GovernanceMode
  readonly recordedPublicEducationBurden: number | null
  readonly effectivePublicEducationBurden: number | null
  readonly projectedRegistrationPressure: number | null
  readonly projectedRightsReviewPressure: number | null
  readonly governanceSurgeBand: GovernanceSurgeBand | null
  readonly triageLaneSymptoms: readonly TriageLaneSymptom[]
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const MAGNITUDE_BAND_SET = new Set<string>(EMERGENCE_MAGNITUDE_BANDS)
const GOVERNANCE_MODE_SET = new Set<string>(GOVERNANCE_MODES)

export const FRANCHISE_TOKEN_PATTERN =
  /(?:\b(?:scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|group of interest|broken masquerade|masquerade breach|wiki\.|wikidot)\b|goi-)/i

export const BRANDED_OBJECT_NUMBER_PATTERN = /\bSCP[\s-]?\d{3,4}\b/i

const MAGNITUDE_PRESSURE: Readonly<Record<EmergenceMagnitudeBand, number>> = {
  local: 0.12,
  regional: 0.28,
  national: 0.52,
  global: 0.78,
}

const GOVERNANCE_MODE_PRESSURE: Readonly<Record<GovernanceMode, number>> = {
  secrecy_restore: 0.08,
  managed_disclosure: 0.18,
  collapsed_masquerade: 0.32,
}

const GOVERNANCE_MODE_EDUCATION_ELEVATION: Readonly<Record<GovernanceMode, number>> = {
  secrecy_restore: 0,
  managed_disclosure: 0.04,
  collapsed_masquerade: 0.18,
}

const TRIAGE_LANE_SYMPTOM_PREFIX = 'Institutional triage lane pressure observed at'

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
  issues: PopulationEmergenceValidationIssue[],
  issue: PopulationEmergenceValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: PopulationEmergenceValidationIssue[]) {
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

function isValidNonNegativeInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && Number.isInteger(value)
}

function isValidNonNegativeNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function roundUnit(value: number): number {
  return Math.round(value * 1000) / 1000
}

function freezeValidationResult(
  issues: PopulationEmergenceValidationIssue[]
): PopulationEmergenceValidationResult {
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

function validateRequiredStringRefArray(
  issues: PopulationEmergenceValidationIssue[],
  id: string,
  fieldName: string,
  value: unknown,
  invalidArrayCode: PopulationEmergenceValidationCode,
  invalidEntryCode: PopulationEmergenceValidationCode,
  emptyEntryCode: PopulationEmergenceValidationCode
) {
  if (!Array.isArray(value)) {
    pushIssue(issues, {
      code: invalidArrayCode,
      severity: 'error',
      detail: `Population emergence record ${id || '(unknown)'} ${fieldName} must be an array.`,
      relatedIds: id ? [id] : undefined,
    })
    return
  }

  for (const entry of value) {
    if (typeof entry !== 'string') {
      pushIssue(issues, {
        code: invalidEntryCode,
        severity: 'error',
        detail: `Population emergence record ${id || '(unknown)'} ${fieldName} contains a non-string entry.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!normalizeToken(entry)) {
      pushIssue(issues, {
        code: emptyEntryCode,
        severity: 'error',
        detail: `Population emergence record ${id || '(unknown)'} ${fieldName} contains an empty entry.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }
}

function validateOptionalStringRefArray(
  issues: PopulationEmergenceValidationIssue[],
  id: string,
  fieldName: string,
  value: unknown,
  invalidArrayCode: PopulationEmergenceValidationCode,
  invalidEntryCode: PopulationEmergenceValidationCode,
  emptyEntryCode: PopulationEmergenceValidationCode
) {
  if (value === undefined) {
    return
  }

  validateRequiredStringRefArray(
    issues,
    id,
    fieldName,
    value,
    invalidArrayCode,
    invalidEntryCode,
    emptyEntryCode
  )
}

function scanStringFieldTokens(
  issues: PopulationEmergenceValidationIssue[],
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
      detail: `Population emergence record ${id || '(unknown)'} field ${field} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(token)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_field',
      severity: 'error',
      detail: `Population emergence record ${id || '(unknown)'} field ${field} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function scanRefArrayTokens(
  issues: PopulationEmergenceValidationIssue[],
  id: string,
  field: string,
  refs: readonly string[]
) {
  for (const ref of refs) {
    scanStringFieldTokens(issues, id, field, ref)
  }
}

function scanForbiddenTokens(
  issues: PopulationEmergenceValidationIssue[],
  id: string,
  label: string,
  record: PopulationEmergenceRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Population emergence record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Population emergence record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Population emergence record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Population emergence record label ${label || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.summary) {
    scanStringFieldTokens(issues, id, 'summary', record.summary)
  }

  scanRefArrayTokens(issues, id, 'triageLanes', asStringArray(record.triageLanes))
  scanRefArrayTokens(
    issues,
    id,
    'rightsReviewQueueRefs',
    asStringArray(record.rightsReviewQueueRefs)
  )
  scanRefArrayTokens(issues, id, 'securitySurgeRefs', asStringArray(record.securitySurgeRefs))
}

function resolveConfidence(
  record: PopulationEmergenceRecord,
  policy: GovernanceSurgeProjectionPolicy
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

function resolveGovernanceSurgeBand(score: number | null): GovernanceSurgeBand | null {
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

function masksProjectionInput(
  field: string,
  redactedFields: ReadonlySet<string>,
  unknownFields: readonly string[],
  policy: GovernanceSurgeProjectionPolicy
): boolean {
  return (
    redactedFields.has(field) ||
    (policy.redactUnknown === true && unknownFields.includes(field))
  )
}

function resolveEffectivePublicEducationBurden(
  record: PopulationEmergenceRecord,
  policy: GovernanceSurgeProjectionPolicy
): { recorded: number | null; effective: number | null } {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  if (
    masksProjectionInput('publicEducationBurden', redactedFields, unknownFields, policy) ||
    masksProjectionInput('governanceMode', redactedFields, unknownFields, policy)
  ) {
    return { recorded: null, effective: null }
  }

  const recorded = isValidUnitScore(record.publicEducationBurden)
    ? record.publicEducationBurden
    : null

  if (recorded === null) {
    return { recorded: null, effective: null }
  }

  const governanceMode = isGovernanceMode(record.governanceMode)
    ? record.governanceMode
    : 'managed_disclosure'
  const elevation = GOVERNANCE_MODE_EDUCATION_ELEVATION[governanceMode]

  return {
    recorded,
    effective: roundUnit(Math.min(1, recorded + elevation)),
  }
}

function resolveCapacityPressures(
  record: PopulationEmergenceRecord,
  policy: GovernanceSurgeProjectionPolicy
): {
  registrationPressure: number | null
  rightsReviewPressure: number | null
  surgeScore: number | null
} {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  const pressureFields = [
    'emergenceMagnitudeBand',
    'registrationBacklogWeeks',
    'governanceMode',
    'newlyAnomalousCountEstimate',
    'triageLanes',
    'rightsReviewQueueRefs',
    'securitySurgeRefs',
  ] as const

  if (
    pressureFields.some((field) =>
      masksProjectionInput(field, redactedFields, unknownFields, policy)
    )
  ) {
    return {
      registrationPressure: null,
      rightsReviewPressure: null,
      surgeScore: null,
    }
  }

  const magnitudeBand = isEmergenceMagnitudeBand(record.emergenceMagnitudeBand)
    ? record.emergenceMagnitudeBand
    : 'local'
  const governanceMode = isGovernanceMode(record.governanceMode)
    ? record.governanceMode
    : 'managed_disclosure'

  const currentWeek =
    typeof policy.currentWeek === 'number' && Number.isFinite(policy.currentWeek)
      ? Math.max(0, Math.trunc(policy.currentWeek))
      : 0

  const backlogWeeks = isValidNonNegativeNumber(record.registrationBacklogWeeks)
    ? record.registrationBacklogWeeks
    : 0
  const populationEstimate = isValidNonNegativeInteger(record.newlyAnomalousCountEstimate)
    ? record.newlyAnomalousCountEstimate
    : 0

  const backlogPressure = Math.min(0.25, backlogWeeks * 0.02)
  const populationPressure = Math.min(0.2, populationEstimate / 500_000)
  const triageLanePressure = Math.min(0.15, asStringArray(record.triageLanes).length * 0.03)
  const rightsQueuePressure = Math.min(
    0.12,
    asStringArray(record.rightsReviewQueueRefs).filter((ref) => normalizeToken(ref).length > 0)
      .length * 0.04
  )
  const surgeMitigation = hasNonEmptyRefArray(record.securitySurgeRefs) ? 0.08 : 0
  const weekDrift = currentWeek * 0.005

  const basePressure =
    MAGNITUDE_PRESSURE[magnitudeBand] +
    GOVERNANCE_MODE_PRESSURE[governanceMode] +
    backlogPressure +
    populationPressure +
    triageLanePressure +
    weekDrift -
    surgeMitigation

  const registrationPressure = roundUnit(Math.max(0, Math.min(1, basePressure)))
  const rightsReviewPressure = roundUnit(
    Math.max(0, Math.min(1, basePressure * 0.75 + rightsQueuePressure))
  )
  const surgeScore = roundUnit(Math.max(0, Math.min(1, basePressure + rightsQueuePressure * 0.5)))

  return {
    registrationPressure,
    rightsReviewPressure,
    surgeScore,
  }
}

function resolveCapacityGapHint(
  record: PopulationEmergenceRecord,
  lane: string,
  policy: GovernanceSurgeProjectionPolicy
): string | null {
  if (policy.suppressHiddenConflictLabels === true) {
    return null
  }

  const magnitudeBand = isEmergenceMagnitudeBand(record.emergenceMagnitudeBand)
    ? record.emergenceMagnitudeBand
    : 'local'
  return `capacity_gap:${magnitudeBand}:${normalizeToken(lane) || 'unknown_lane'}`
}

function buildTriageLaneSymptoms(
  record: PopulationEmergenceRecord,
  policy: GovernanceSurgeProjectionPolicy
): readonly TriageLaneSymptom[] {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  if (
    masksProjectionInput('triageLanes', redactedFields, unknownFields, policy) ||
    masksProjectionInput('emergenceMagnitudeBand', redactedFields, unknownFields, policy)
  ) {
    return Object.freeze([])
  }

  const lanes = asStringArray(record.triageLanes)
    .map((lane) => normalizeToken(lane))
    .filter((lane) => lane.length > 0)
    .sort((left, right) => left.localeCompare(right))

  return Object.freeze(
    lanes.map((lane) =>
      Object.freeze({
        lane,
        symptomDescriptor: `${TRIAGE_LANE_SYMPTOM_PREFIX} ${lane}`,
        capacityGapHint: resolveCapacityGapHint(record, lane, policy),
      })
    )
  )
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isEmergenceMagnitudeBand(value: unknown): value is EmergenceMagnitudeBand {
  return typeof value === 'string' && MAGNITUDE_BAND_SET.has(value)
}

export function isGovernanceMode(value: unknown): value is GovernanceMode {
  return typeof value === 'string' && GOVERNANCE_MODE_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validatePopulationEmergenceRecord(
  record: PopulationEmergenceRecord
): PopulationEmergenceValidationResult {
  const issues: PopulationEmergenceValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Population emergence record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Population emergence record is missing label.',
    })
  }

  if (!isEmergenceMagnitudeBand(record.emergenceMagnitudeBand)) {
    pushIssue(issues, {
      code: 'invalid_emergence_magnitude_band',
      severity: 'error',
      detail: `Population emergence record ${id || '(unknown)'} has invalid emergenceMagnitudeBand ${String(record.emergenceMagnitudeBand)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isGovernanceMode(record.governanceMode)) {
    pushIssue(issues, {
      code: 'invalid_governance_mode',
      severity: 'error',
      detail: `Population emergence record ${id || '(unknown)'} has invalid governanceMode ${String(record.governanceMode)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isValidNonNegativeInteger(record.newlyAnomalousCountEstimate)) {
    pushIssue(issues, {
      code: 'invalid_newly_anomalous_count_estimate',
      severity: 'error',
      detail: `Population emergence record ${id || '(unknown)'} newlyAnomalousCountEstimate must be a non-negative integer.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isValidNonNegativeNumber(record.registrationBacklogWeeks)) {
    pushIssue(issues, {
      code: 'invalid_registration_backlog_weeks',
      severity: 'error',
      detail: `Population emergence record ${id || '(unknown)'} registrationBacklogWeeks must be a non-negative number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isValidUnitScore(record.publicEducationBurden)) {
    pushIssue(issues, {
      code: 'invalid_public_education_burden',
      severity: 'error',
      detail: `Population emergence record ${id || '(unknown)'} publicEducationBurden must be between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Population emergence record ${id || '(unknown)'} confidence must be between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  validateRequiredStringRefArray(
    issues,
    id,
    'triageLanes',
    record.triageLanes,
    'invalid_triage_lanes',
    'invalid_triage_lane',
    'empty_triage_lane'
  )

  if (
    Array.isArray(record.triageLanes) &&
    !asStringArray(record.triageLanes).some((lane) => normalizeToken(lane).length > 0)
  ) {
    pushIssue(issues, {
      code: 'empty_triage_lanes',
      severity: 'error',
      detail: `Population emergence record ${id || '(unknown)'} triageLanes must include at least one lane.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  validateOptionalStringRefArray(
    issues,
    id,
    'rightsReviewQueueRefs',
    record.rightsReviewQueueRefs,
    'invalid_rights_review_queue_refs',
    'invalid_rights_review_queue_ref',
    'empty_rights_review_queue_ref'
  )

  validateOptionalStringRefArray(
    issues,
    id,
    'securitySurgeRefs',
    record.securitySurgeRefs,
    'invalid_security_surge_refs',
    'invalid_security_surge_ref',
    'empty_security_surge_ref'
  )

  scanForbiddenTokens(issues, id, label, record)

  if (
    record.emergenceMagnitudeBand === 'global' &&
    record.governanceMode === 'secrecy_restore'
  ) {
    pushIssue(issues, {
      code: 'global_magnitude_with_secrecy_restore',
      severity: 'warning',
      detail: `Population emergence record ${id || '(unknown)'} is global magnitude but governanceMode is secrecy_restore.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.emergenceMagnitudeBand === 'national' &&
    !hasNonEmptyRefArray(record.securitySurgeRefs)
  ) {
    pushIssue(issues, {
      code: 'national_magnitude_without_security_surge',
      severity: 'warning',
      detail: `Population emergence record ${id || '(unknown)'} is national magnitude but declares no securitySurgeRefs.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Projects deterministic governance surge capacity for registration, rights review,
 * and public education burden. SPE-2109 disclosure wire-up remains deferred.
 */
export function projectGovernanceSurge(
  record: PopulationEmergenceRecord,
  policy: GovernanceSurgeProjectionPolicy = {}
): GovernanceSurgeProjection {
  const recordId = normalizeToken(record.id) || '(unknown)'
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)
  const confidence = resolveConfidence(record, policy)
  const { recorded, effective } = resolveEffectivePublicEducationBurden(record, policy)
  const { registrationPressure, rightsReviewPressure, surgeScore } = resolveCapacityPressures(
    record,
    policy
  )

  const triageRedacted =
    redactedFields.has('triageLanes') ||
    (policy.redactUnknown === true && unknownFields.includes('triageLanes'))

  const triageLaneSymptoms = triageRedacted
    ? Object.freeze([])
    : buildTriageLaneSymptoms(record, policy)

  const educationBurdenRedacted =
    redactedFields.has('publicEducationBurden') ||
    redactedFields.has('governanceMode') ||
    (policy.redactUnknown === true &&
      (unknownFields.includes('publicEducationBurden') ||
        unknownFields.includes('governanceMode')))

  const capacityRedacted = (
    [
      'emergenceMagnitudeBand',
      'registrationBacklogWeeks',
      'governanceMode',
      'newlyAnomalousCountEstimate',
      'triageLanes',
      'rightsReviewQueueRefs',
      'securitySurgeRefs',
    ] as const
  ).some((field) =>
    masksProjectionInput(field, redactedFields, unknownFields, policy)
  )

  const redacted =
    triageRedacted ||
    educationBurdenRedacted ||
    capacityRedacted ||
    redactedFields.has('confidence') ||
    (policy.redactUnknown === true && unknownFields.includes('confidence')) ||
    (confidence === null &&
      record.confidence !== undefined &&
      policy.minimumConfidence !== undefined)

  return Object.freeze({
    recordId,
    label: normalizeToken(record.label) || '(unknown)',
    emergenceMagnitudeBand: isEmergenceMagnitudeBand(record.emergenceMagnitudeBand)
      ? record.emergenceMagnitudeBand
      : 'local',
    governanceMode: isGovernanceMode(record.governanceMode)
      ? record.governanceMode
      : 'managed_disclosure',
    recordedPublicEducationBurden: recorded,
    effectivePublicEducationBurden: effective,
    projectedRegistrationPressure: registrationPressure,
    projectedRightsReviewPressure: rightsReviewPressure,
    governanceSurgeBand: resolveGovernanceSurgeBand(surgeScore),
    triageLaneSymptoms,
    confidence,
    redacted,
    unknownFields,
  })
}

// ---------------------------------------------------------------------------
// Persistence / hydration
// ---------------------------------------------------------------------------

export type MassAnomalousPopulationEmergenceRecordsMap = Record<
  PopulationEmergenceId,
  PopulationEmergenceRecord
>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseStringList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function sanitizePopulationEmergenceRecordEntry(value: unknown): PopulationEmergenceRecord | null {
  if (!isRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const label = normalizeToken(value.label)
  const emergenceMagnitudeBand = value.emergenceMagnitudeBand
  const governanceMode = value.governanceMode

  if (
    !id ||
    !label ||
    typeof emergenceMagnitudeBand !== 'string' ||
    !isEmergenceMagnitudeBand(emergenceMagnitudeBand) ||
    typeof governanceMode !== 'string' ||
    !isGovernanceMode(governanceMode)
  ) {
    return null
  }

  const triageLanes = parseStringList(value.triageLanes)
  const rightsReviewQueueRefs = parseStringList(value.rightsReviewQueueRefs)
  const securitySurgeRefs = parseStringList(value.securitySurgeRefs)
  const unknownFields = parseStringList(value.unknownFields)
  const redactedFields = parseStringList(value.redactedFields)
  const summary =
    typeof value.summary === 'string' && value.summary.trim().length > 0
      ? value.summary.trim()
      : undefined
  const newlyAnomalousCountEstimate = value.newlyAnomalousCountEstimate
  const registrationBacklogWeeks = value.registrationBacklogWeeks
  const publicEducationBurden = value.publicEducationBurden
  const confidence = value.confidence

  const record: PopulationEmergenceRecord = {
    id,
    label,
    emergenceMagnitudeBand,
    governanceMode,
    triageLanes,
    newlyAnomalousCountEstimate:
      typeof newlyAnomalousCountEstimate === 'number' &&
      Number.isFinite(newlyAnomalousCountEstimate)
        ? newlyAnomalousCountEstimate
        : 0,
    registrationBacklogWeeks:
      typeof registrationBacklogWeeks === 'number' && Number.isFinite(registrationBacklogWeeks)
        ? registrationBacklogWeeks
        : 0,
    publicEducationBurden:
      typeof publicEducationBurden === 'number' && Number.isFinite(publicEducationBurden)
        ? publicEducationBurden
        : 0,
    ...(summary ? { summary } : {}),
    ...(rightsReviewQueueRefs.length > 0 ? { rightsReviewQueueRefs } : {}),
    ...(securitySurgeRefs.length > 0 ? { securitySurgeRefs } : {}),
    ...(isValidUnitScore(confidence) ? { confidence } : {}),
    ...(unknownFields.length > 0 ? { unknownFields } : {}),
    ...(redactedFields.length > 0 ? { redactedFields } : {}),
  }

  if (!validatePopulationEmergenceRecord(record).valid) {
    return null
  }

  return record
}

/** Hydration: canonical record map keyed by record id; drops invalid and duplicate-id entries. */
export function sanitizeMassAnomalousPopulationEmergenceRecords(
  value: unknown,
  fallback: MassAnomalousPopulationEmergenceRecordsMap = {}
): MassAnomalousPopulationEmergenceRecordsMap {
  if (!isRecord(value)) {
    return fallback
  }

  const next: MassAnomalousPopulationEmergenceRecordsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizePopulationEmergenceRecordEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}

function defineRecord(record: PopulationEmergenceRecord): PopulationEmergenceRecord {
  return Object.freeze({ ...record })
}

/** Managed disclosure with registration backlog and active triage lanes. */
export const MANAGED_DISCLOSURE_BACKLOG_FIXTURE: PopulationEmergenceRecord = defineRecord({
  id: 'population-emergence:managed-disclosure-wave-3',
  label: 'Managed disclosure registration surge',
  summary:
    'Regional emergence under managed disclosure with registration backlog and triage lanes.',
  emergenceMagnitudeBand: 'regional',
  newlyAnomalousCountEstimate: 48_000,
  registrationBacklogWeeks: 6,
  governanceMode: 'managed_disclosure',
  triageLanes: ['lane:registration-intake', 'lane:medical-screening', 'lane:rights-review'],
  rightsReviewQueueRefs: ['queue:rights-review-alpha'],
  publicEducationBurden: 0.42,
  securitySurgeRefs: ['surge:regional-security-cell-2'],
  confidence: 0.79,
})

/** Collapsed masquerade with education burden elevated by governance-mode projection. */
export const COLLAPSED_MASQUERADE_EDUCATION_FIXTURE: PopulationEmergenceRecord = defineRecord({
  id: 'population-emergence:collapsed-masquerade-education',
  label: 'Collapsed masquerade public education surge',
  summary:
    'National emergence after masquerade collapse with high public education burden baseline.',
  emergenceMagnitudeBand: 'national',
  newlyAnomalousCountEstimate: 210_000,
  registrationBacklogWeeks: 10,
  governanceMode: 'collapsed_masquerade',
  triageLanes: ['lane:public-education', 'lane:community-stabilization'],
  rightsReviewQueueRefs: ['queue:rights-review-national-1', 'queue:rights-review-national-2'],
  publicEducationBurden: 0.55,
  securitySurgeRefs: ['surge:national-response-brigade'],
  confidence: 0.74,
})
