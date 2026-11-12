/**
 * SPE-1886 slice 1: contained-person medication regimen registry.
 *
 * Pure deterministic registry for medication regimens tracking consent state,
 * delivery vector, interaction risk, and adverse-reaction flags — distinct from
 * integrated health bundle wire-up (SPE-1889 slice 8).
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type MedicationRegimenId = string

export type MedicationConsentStatus =
  | 'voluntary'
  | 'negotiated'
  | 'compelled'
  | 'emergency'
  | 'covert'

export const MEDICATION_CONSENT_STATUSES: readonly MedicationConsentStatus[] = [
  'voluntary',
  'negotiated',
  'compelled',
  'emergency',
  'covert',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface MedicationRegimenRecord {
  readonly id: MedicationRegimenId
  readonly label: string
  readonly summary?: string
  readonly subjectRef: string
  readonly consentStatus: MedicationConsentStatus
  readonly deliveryVector: string
  readonly dosageCadenceLabel?: string
  readonly intendedEffectLabel?: string
  readonly sideEffectProfileLabel?: string
  readonly containmentPurposeLabel?: string
  readonly monitoringRequired?: boolean
  readonly missedDoseFlag?: boolean
  readonly refusalFlag?: boolean
  readonly adverseReactionFlag: boolean
  readonly contraindicationFlag?: boolean
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type MedicationRegimenValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_subject_ref'
  | 'invalid_consent_status'
  | 'missing_delivery_vector'
  | 'invalid_adverse_reaction_flag'
  | 'invalid_confidence'
  | 'compelled_without_containment_purpose'
  | 'covert_without_monitoring_requirement'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface MedicationRegimenValidationIssue {
  readonly code: MedicationRegimenValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface MedicationRegimenValidationResult {
  readonly valid: boolean
  readonly issues: readonly MedicationRegimenValidationIssue[]
}

// ---------------------------------------------------------------------------
// Interaction projection
// ---------------------------------------------------------------------------

export interface MedicationInteractionRiskProjectionPolicy {
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
}

export interface MedicationInteractionRiskProjection {
  readonly recordId: MedicationRegimenId
  readonly label: string
  readonly consentStatus: MedicationConsentStatus
  readonly deliveryVector: string
  readonly interactionRiskScore: number | null
  readonly adverseReactionFlag: boolean
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const MEDICATION_CONSENT_STATUS_SET = new Set<string>(MEDICATION_CONSENT_STATUSES)

export const FRANCHISE_TOKEN_PATTERN =
  /(?:\b(?:scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|group of interest|broken masquerade|masquerade breach)\b|goi-)/i

export const BRANDED_OBJECT_NUMBER_PATTERN = /\bSCP[\s-]?\d{3,4}\b/i

const COERCED_CONSENT_STATUSES = new Set<MedicationConsentStatus>(['compelled', 'emergency', 'covert'])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isValidUnitScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === 'string')
}

function sortedStringArray(value: unknown): readonly string[] {
  return [...asStringArray(value).map((entry) => entry.trim()).filter((entry) => entry.length > 0)].sort(
    (left, right) => left.localeCompare(right)
  )
}

function containsFranchiseToken(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && FRANCHISE_TOKEN_PATTERN.test(token)
}

function containsBrandedObjectNumber(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && BRANDED_OBJECT_NUMBER_PATTERN.test(token)
}

function pushIssue(issues: MedicationRegimenValidationIssue[], issue: MedicationRegimenValidationIssue) {
  issues.push(issue)
}

function sortValidationIssues(issues: MedicationRegimenValidationIssue[]) {
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

function freezeValidationResult(
  issues: MedicationRegimenValidationIssue[]
): MedicationRegimenValidationResult {
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

function scanForbiddenTokens(
  issues: MedicationRegimenValidationIssue[],
  id: string,
  label: string,
  record: MedicationRegimenRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Medication regimen record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Medication regimen record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Medication regimen record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Medication regimen record label ${label || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const subjectRef = normalizeToken(record.subjectRef)
  if (subjectRef && (containsFranchiseToken(subjectRef) || containsBrandedObjectNumber(subjectRef))) {
    pushIssue(issues, {
      code: containsFranchiseToken(subjectRef)
        ? 'franchise_token_in_field'
        : 'branded_object_number_in_field',
      severity: 'error',
      detail: `Medication regimen record ${id || '(unknown)'} subjectRef contains a forbidden token.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function resolveConfidence(
  record: MedicationRegimenRecord,
  policy: MedicationInteractionRiskProjectionPolicy
): number | null {
  const confidence = record.confidence
  if (!isValidUnitScore(confidence)) {
    return null
  }

  if (
    policy.minimumConfidence !== undefined &&
    confidence < policy.minimumConfidence
  ) {
    return null
  }

  return confidence
}

function resolveInteractionRiskScore(
  record: MedicationRegimenRecord,
  policy: MedicationInteractionRiskProjectionPolicy
): number | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)

  if (
    redactedFields.has('interactionRiskScore') ||
    (policy.redactUnknown === true && unknownFields.includes('interactionRiskScore'))
  ) {
    return null
  }

  let score = 0.08

  if (COERCED_CONSENT_STATUSES.has(record.consentStatus)) {
    score += 0.18
  }

  if (record.adverseReactionFlag) {
    score += 0.35
  }

  if (record.contraindicationFlag) {
    score += 0.22
  }

  if (record.missedDoseFlag) {
    score += 0.1
  }

  if (record.refusalFlag) {
    score += 0.14
  }

  if (record.monitoringRequired === false && COERCED_CONSENT_STATUSES.has(record.consentStatus)) {
    score += 0.12
  }

  return Math.min(1, score)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function isMedicationConsentStatus(value: unknown): value is MedicationConsentStatus {
  return typeof value === 'string' && MEDICATION_CONSENT_STATUS_SET.has(value)
}

export function validateMedicationRegimenRecord(
  record: MedicationRegimenRecord
): MedicationRegimenValidationResult {
  const issues: MedicationRegimenValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const subjectRef = normalizeToken(record.subjectRef)
  const deliveryVector = normalizeToken(record.deliveryVector)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Medication regimen record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Medication regimen record is missing label.',
    })
  }

  if (!subjectRef) {
    pushIssue(issues, {
      code: 'missing_subject_ref',
      severity: 'error',
      detail: 'Medication regimen record is missing subjectRef.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isMedicationConsentStatus(record.consentStatus)) {
    pushIssue(issues, {
      code: 'invalid_consent_status',
      severity: 'error',
      detail: `Medication regimen record ${id || '(unknown)'} has invalid consentStatus ${String(record.consentStatus)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!deliveryVector) {
    pushIssue(issues, {
      code: 'missing_delivery_vector',
      severity: 'error',
      detail: `Medication regimen record ${id || '(unknown)'} is missing deliveryVector.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (typeof record.adverseReactionFlag !== 'boolean') {
    pushIssue(issues, {
      code: 'invalid_adverse_reaction_flag',
      severity: 'error',
      detail: `Medication regimen record ${id || '(unknown)'} adverseReactionFlag must be a boolean.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Medication regimen record ${id || '(unknown)'} confidence must be between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  scanForbiddenTokens(issues, id, label, record)

  if (
    isMedicationConsentStatus(record.consentStatus) &&
    COERCED_CONSENT_STATUSES.has(record.consentStatus) &&
    !normalizeToken(record.containmentPurposeLabel ?? '')
  ) {
    pushIssue(issues, {
      code: 'compelled_without_containment_purpose',
      severity: 'warning',
      detail: `Medication regimen record ${id || '(unknown)'} uses coerced consent without containmentPurposeLabel.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.consentStatus === 'covert' &&
    record.monitoringRequired !== true
  ) {
    pushIssue(issues, {
      code: 'covert_without_monitoring_requirement',
      severity: 'warning',
      detail: `Medication regimen record ${id || '(unknown)'} uses covert delivery without monitoringRequired.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Projects medication interaction risk from record-derived fields.
 * Does not assert hidden dossier truth or automatic welfare outcomes.
 */
export function projectMedicationInteractionRisk(
  record: MedicationRegimenRecord,
  policy: MedicationInteractionRiskProjectionPolicy = {}
): MedicationInteractionRiskProjection {
  const recordId = normalizeToken(record.id) || '(unknown)'
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)
  const confidence = resolveConfidence(record, policy)

  const interactionRedacted =
    redactedFields.has('interactionRiskScore') ||
    (policy.redactUnknown === true && unknownFields.includes('interactionRiskScore'))

  const redacted =
    interactionRedacted ||
    redactedFields.has('confidence') ||
    (confidence === null && record.confidence !== undefined && policy.minimumConfidence !== undefined)

  return Object.freeze({
    recordId,
    label: normalizeToken(record.label) || '(unknown)',
    consentStatus: isMedicationConsentStatus(record.consentStatus)
      ? record.consentStatus
      : 'voluntary',
    deliveryVector: normalizeToken(record.deliveryVector) || '(unknown)',
    interactionRiskScore: interactionRedacted ? null : resolveInteractionRiskScore(record, policy),
    adverseReactionFlag: record.adverseReactionFlag === true,
    confidence,
    redacted,
    unknownFields,
  })
}

function defineRecord(record: MedicationRegimenRecord): MedicationRegimenRecord {
  return Object.freeze({ ...record })
}

/** Voluntary oral stabilizer regimen with monitoring. */
export const VOLUNTARY_STABILIZER_REGIMEN_FIXTURE: MedicationRegimenRecord = defineRecord({
  id: 'medication-regimen:stabilizer-alpha',
  label: 'Stabilizer alpha voluntary regimen',
  summary: 'Voluntary oral stabilizer for contained-person mood regulation.',
  subjectRef: 'subject:cooperative-field-asset-17',
  consentStatus: 'voluntary',
  deliveryVector: 'oral',
  dosageCadenceLabel: 'daily',
  intendedEffectLabel: 'mood stabilization',
  sideEffectProfileLabel: 'mild sedation',
  monitoringRequired: true,
  adverseReactionFlag: false,
  confidence: 0.86,
})

/** Compelled personnel screening regimen authorizing high-risk sourcing. */
export const COERCED_PERSONNEL_SCREENING_REGIMEN_FIXTURE: MedicationRegimenRecord = defineRecord({
  id: 'medication-regimen:coercive-personnel-screening-beta',
  label: 'Coerced personnel screening regimen',
  summary: 'Compelled screening regimen authorizing high-risk personnel sourcing.',
  subjectRef: 'subject:cooperative-field-asset-41',
  consentStatus: 'compelled',
  deliveryVector: 'oral',
  dosageCadenceLabel: 'pre-deployment',
  intendedEffectLabel: 'risk screening clearance',
  sideEffectProfileLabel: 'cognitive dulling',
  containmentPurposeLabel: 'personnel risk screening',
  monitoringRequired: true,
  adverseReactionFlag: false,
  confidence: 0.76,
})

/** Compelled delivery with adverse reaction and elevated interaction risk. */
export const COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE: MedicationRegimenRecord = defineRecord({
  id: 'medication-regimen:coercive-sedative-beta',
  label: 'Coercive sedative beta regimen',
  summary: 'Compelled sedative delivery with documented adverse reaction flag.',
  subjectRef: 'subject:cooperative-field-asset-22',
  consentStatus: 'compelled',
  deliveryVector: 'intramuscular',
  dosageCadenceLabel: 'as needed',
  intendedEffectLabel: 'agitation suppression',
  sideEffectProfileLabel: 'cognitive dulling',
  containmentPurposeLabel: 'lockdown stabilization',
  monitoringRequired: true,
  adverseReactionFlag: true,
  contraindicationFlag: false,
  missedDoseFlag: false,
  confidence: 0.74,
})

// ---------------------------------------------------------------------------
// Persistence / hydration
// ---------------------------------------------------------------------------

export type MedicationRegimenRecordsMap = Record<MedicationRegimenId, MedicationRegimenRecord>

function isPlainRecord(value: unknown): value is Record<string, unknown> {
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

function sanitizeMedicationRegimenRecordEntry(value: unknown): MedicationRegimenRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const label = normalizeToken(value.label)
  const subjectRef = normalizeToken(value.subjectRef)
  const consentStatus = value.consentStatus
  const deliveryVector = normalizeToken(value.deliveryVector)
  const adverseReactionFlag = value.adverseReactionFlag

  if (
    !id ||
    !label ||
    !subjectRef ||
    typeof consentStatus !== 'string' ||
    !isMedicationConsentStatus(consentStatus) ||
    !deliveryVector ||
    typeof adverseReactionFlag !== 'boolean'
  ) {
    return null
  }

  const summary =
    typeof value.summary === 'string' && value.summary.trim().length > 0
      ? value.summary.trim()
      : undefined
  const dosageCadenceLabel = normalizeToken(value.dosageCadenceLabel ?? '') || undefined
  const intendedEffectLabel = normalizeToken(value.intendedEffectLabel ?? '') || undefined
  const sideEffectProfileLabel = normalizeToken(value.sideEffectProfileLabel ?? '') || undefined
  const containmentPurposeLabel = normalizeToken(value.containmentPurposeLabel ?? '') || undefined
  const monitoringRequired =
    typeof value.monitoringRequired === 'boolean' ? value.monitoringRequired : undefined
  const missedDoseFlag = typeof value.missedDoseFlag === 'boolean' ? value.missedDoseFlag : undefined
  const refusalFlag = typeof value.refusalFlag === 'boolean' ? value.refusalFlag : undefined
  const contraindicationFlag =
    typeof value.contraindicationFlag === 'boolean' ? value.contraindicationFlag : undefined
  const confidence = value.confidence
  const unknownFields = parseStringList(value.unknownFields)
  const redactedFields = parseStringList(value.redactedFields)

  const record: MedicationRegimenRecord = {
    id,
    label,
    subjectRef,
    consentStatus,
    deliveryVector,
    adverseReactionFlag,
    ...(summary ? { summary } : {}),
    ...(dosageCadenceLabel ? { dosageCadenceLabel } : {}),
    ...(intendedEffectLabel ? { intendedEffectLabel } : {}),
    ...(sideEffectProfileLabel ? { sideEffectProfileLabel } : {}),
    ...(containmentPurposeLabel ? { containmentPurposeLabel } : {}),
    ...(monitoringRequired !== undefined ? { monitoringRequired } : {}),
    ...(missedDoseFlag !== undefined ? { missedDoseFlag } : {}),
    ...(refusalFlag !== undefined ? { refusalFlag } : {}),
    ...(contraindicationFlag !== undefined ? { contraindicationFlag } : {}),
    ...(isValidUnitScore(confidence) ? { confidence } : {}),
    ...(unknownFields.length > 0 ? { unknownFields } : {}),
    ...(redactedFields.length > 0 ? { redactedFields } : {}),
  }

  if (!validateMedicationRegimenRecord(record).valid) {
    return null
  }

  return record
}

/** Hydration: canonical regimen map keyed by record id; drops invalid and duplicate-id entries. */
export function sanitizeMedicationRegimenRecords(
  value: unknown,
  fallback: MedicationRegimenRecordsMap = {}
): MedicationRegimenRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: MedicationRegimenRecordsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeMedicationRegimenRecordEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}
