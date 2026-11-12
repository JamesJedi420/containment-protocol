/**
 * SPE-1892 slice 1: contained-person custody status registry.
 *
 * Pure deterministic registry for custody stage, former-role category,
 * restriction level, and rights-review posture — distinct from integrated
 * health bundle wire-up (SPE-1889 slice 9).
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type CustodyStatusId = string

export type CustodyStage =
  | 'person_of_interest'
  | 'temporary_holding'
  | 'contained_person'
  | 'medical_hold'
  | 'transfer_pending'

export const CUSTODY_STAGES: readonly CustodyStage[] = [
  'person_of_interest',
  'temporary_holding',
  'contained_person',
  'medical_hold',
  'transfer_pending',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface CustodyStatusRecord {
  readonly id: CustodyStatusId
  readonly label: string
  readonly summary?: string
  readonly subjectRef: string
  readonly custodyStage: CustodyStage
  readonly formerRoleCategory: string
  readonly restrictionLevel: string
  readonly rightsReviewPending: boolean
  readonly holdCauseLabel?: string
  readonly transferDestinationLabel?: string
  readonly intakeWeekLabel?: string
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type CustodyStatusValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_subject_ref'
  | 'invalid_custody_stage'
  | 'missing_former_role_category'
  | 'missing_restriction_level'
  | 'invalid_rights_review_pending'
  | 'invalid_confidence'
  | 'medical_hold_without_documented_cause'
  | 'transfer_pending_without_rights_review_flag'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface CustodyStatusValidationIssue {
  readonly code: CustodyStatusValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface CustodyStatusValidationResult {
  readonly valid: boolean
  readonly issues: readonly CustodyStatusValidationIssue[]
}

// ---------------------------------------------------------------------------
// Disposition projection
// ---------------------------------------------------------------------------

export interface CustodyDispositionProjectionPolicy {
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
}

export interface CustodyDispositionProjection {
  readonly recordId: CustodyStatusId
  readonly label: string
  readonly custodyStage: CustodyStage
  readonly formerRoleCategory: string
  readonly restrictionLevel: string
  readonly rightsReviewPending: boolean
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const CUSTODY_STAGE_SET = new Set<string>(CUSTODY_STAGES)

export const FRANCHISE_TOKEN_PATTERN =
  /(?:\b(?:scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|group of interest|broken masquerade|masquerade breach)\b|goi-)/i

export const BRANDED_OBJECT_NUMBER_PATTERN = /\bSCP[\s-]?\d{3,4}\b/i

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

function pushIssue(issues: CustodyStatusValidationIssue[], issue: CustodyStatusValidationIssue) {
  issues.push(issue)
}

function sortValidationIssues(issues: CustodyStatusValidationIssue[]) {
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
  issues: CustodyStatusValidationIssue[]
): CustodyStatusValidationResult {
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
  issues: CustodyStatusValidationIssue[],
  id: string,
  label: string,
  record: CustodyStatusRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Custody status record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Custody status record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Custody status record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Custody status record label ${label || '(unknown)'} contains a branded object number.`,
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
      detail: `Custody status record ${id || '(unknown)'} subjectRef contains a forbidden token.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function resolveConfidence(
  record: CustodyStatusRecord,
  policy: CustodyDispositionProjectionPolicy
): number | null {
  const confidence = record.confidence
  if (!isValidUnitScore(confidence)) {
    return null
  }

  if (policy.minimumConfidence !== undefined && confidence < policy.minimumConfidence) {
    return null
  }

  return confidence
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function isCustodyStage(value: unknown): value is CustodyStage {
  return typeof value === 'string' && CUSTODY_STAGE_SET.has(value)
}

export function validateCustodyStatusRecord(
  record: CustodyStatusRecord
): CustodyStatusValidationResult {
  const issues: CustodyStatusValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const subjectRef = normalizeToken(record.subjectRef)
  const formerRoleCategory = normalizeToken(record.formerRoleCategory)
  const restrictionLevel = normalizeToken(record.restrictionLevel)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Custody status record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Custody status record is missing label.',
    })
  }

  if (!subjectRef) {
    pushIssue(issues, {
      code: 'missing_subject_ref',
      severity: 'error',
      detail: 'Custody status record is missing subjectRef.',
    })
  }

  if (!isCustodyStage(record.custodyStage)) {
    pushIssue(issues, {
      code: 'invalid_custody_stage',
      severity: 'error',
      detail: `Custody status record ${id || '(unknown)'} has invalid custodyStage.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!formerRoleCategory) {
    pushIssue(issues, {
      code: 'missing_former_role_category',
      severity: 'error',
      detail: `Custody status record ${id || '(unknown)'} is missing formerRoleCategory.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!restrictionLevel) {
    pushIssue(issues, {
      code: 'missing_restriction_level',
      severity: 'error',
      detail: `Custody status record ${id || '(unknown)'} is missing restrictionLevel.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (typeof record.rightsReviewPending !== 'boolean') {
    pushIssue(issues, {
      code: 'invalid_rights_review_pending',
      severity: 'error',
      detail: `Custody status record ${id || '(unknown)'} has invalid rightsReviewPending.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Custody status record ${id || '(unknown)'} has invalid confidence.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  scanForbiddenTokens(issues, id, label, record)

  if (record.custodyStage === 'medical_hold' && !normalizeToken(record.holdCauseLabel)) {
    pushIssue(issues, {
      code: 'medical_hold_without_documented_cause',
      severity: 'warning',
      detail: `Custody status record ${id || '(unknown)'} uses medical_hold without holdCauseLabel.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.custodyStage === 'transfer_pending' && record.rightsReviewPending !== true) {
    pushIssue(issues, {
      code: 'transfer_pending_without_rights_review_flag',
      severity: 'warning',
      detail: `Custody status record ${id || '(unknown)'} uses transfer_pending without rightsReviewPending.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Projects custody disposition fields from record-derived inputs.
 * Does not assert hidden dossier truth or automatic welfare outcomes.
 */
export function projectCustodyDisposition(
  record: CustodyStatusRecord,
  policy: CustodyDispositionProjectionPolicy = {}
): CustodyDispositionProjection {
  const recordId = normalizeToken(record.id) || '(unknown)'
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)
  const confidence = resolveConfidence(record, policy)

  const restrictionRedacted =
    redactedFields.has('restrictionLevel') ||
    (policy.redactUnknown === true && unknownFields.includes('restrictionLevel'))

  const redacted =
    restrictionRedacted ||
    redactedFields.has('confidence') ||
    (confidence === null && record.confidence !== undefined && policy.minimumConfidence !== undefined)

  return Object.freeze({
    recordId,
    label: normalizeToken(record.label) || '(unknown)',
    custodyStage: isCustodyStage(record.custodyStage) ? record.custodyStage : 'temporary_holding',
    formerRoleCategory: normalizeToken(record.formerRoleCategory) || '(unknown)',
    restrictionLevel: restrictionRedacted
      ? '(redacted)'
      : normalizeToken(record.restrictionLevel) || '(unknown)',
    rightsReviewPending: record.rightsReviewPending === true,
    confidence,
    redacted,
    unknownFields,
  })
}

function defineRecord(record: CustodyStatusRecord): CustodyStatusRecord {
  return Object.freeze({ ...record })
}

/** Contained-person hold with elevated restrictions and pending rights review. */
export const HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE: CustodyStatusRecord = defineRecord({
  id: 'custody-status:former-hostile-hold',
  label: 'Former hostile actor contained hold',
  summary: 'Contained-person custody with elevated restrictions and rights review pending.',
  subjectRef: 'subject:cooperative-field-asset-17',
  custodyStage: 'contained_person',
  formerRoleCategory: 'hostile_actor',
  restrictionLevel: 'elevated',
  rightsReviewPending: true,
  confidence: 0.81,
})

/** Contained-person hold with privilege suspension for interview-compliance enforcement. */
export const PRIVILEGE_SUSPENDED_CONTAINED_HOLD_FIXTURE: CustodyStatusRecord = defineRecord({
  id: 'custody-status:privilege-suspended-hold',
  label: 'Privilege-suspended contained hold',
  summary: 'Contained-person custody with privilege suspension for interview compliance.',
  subjectRef: 'subject:cooperative-field-asset-31',
  custodyStage: 'contained_person',
  formerRoleCategory: 'uncooperative_witness',
  restrictionLevel: 'privilege_suspended',
  rightsReviewPending: true,
  confidence: 0.68,
})

/** Temporary holding authorizing coerced high-risk personnel sourcing under screening. */
export const COERCED_PERSONNEL_SOURCE_HOLD_FIXTURE: CustodyStatusRecord = defineRecord({
  id: 'custody-status:coerced-personnel-source-hold',
  label: 'Coerced personnel source hold',
  summary: 'Temporary holding authorizing high-risk personnel sourcing under compelled screening.',
  subjectRef: 'subject:cooperative-field-asset-41',
  custodyStage: 'temporary_holding',
  formerRoleCategory: 'high_risk_field_asset',
  restrictionLevel: 'coerced_sourcing',
  rightsReviewPending: true,
  confidence: 0.72,
})

/** Transfer-pending custody with documented destination and rights review. */
export const TRANSFER_PENDING_REVIEW_FIXTURE: CustodyStatusRecord = defineRecord({
  id: 'custody-status:transfer-pending-review',
  label: 'Transfer pending rights review',
  summary: 'Transfer-pending custody awaiting institutional rights review.',
  subjectRef: 'subject:cooperative-field-asset-22',
  custodyStage: 'transfer_pending',
  formerRoleCategory: 'civilian_witness',
  restrictionLevel: 'standard',
  rightsReviewPending: true,
  transferDestinationLabel: 'regional holding annex',
  confidence: 0.77,
})

// ---------------------------------------------------------------------------
// Persistence / hydration
// ---------------------------------------------------------------------------

export type CustodyStatusRecordsMap = Record<CustodyStatusId, CustodyStatusRecord>

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

function sanitizeCustodyStatusRecordEntry(value: unknown): CustodyStatusRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const label = normalizeToken(value.label)
  const subjectRef = normalizeToken(value.subjectRef)
  const custodyStage = value.custodyStage
  const formerRoleCategory = normalizeToken(value.formerRoleCategory)
  const restrictionLevel = normalizeToken(value.restrictionLevel)
  const rightsReviewPending = value.rightsReviewPending

  if (
    !id ||
    !label ||
    !subjectRef ||
    typeof custodyStage !== 'string' ||
    !isCustodyStage(custodyStage) ||
    !formerRoleCategory ||
    !restrictionLevel ||
    typeof rightsReviewPending !== 'boolean'
  ) {
    return null
  }

  const summary =
    typeof value.summary === 'string' && value.summary.trim().length > 0
      ? value.summary.trim()
      : undefined
  const holdCauseLabel = normalizeToken(value.holdCauseLabel ?? '') || undefined
  const transferDestinationLabel = normalizeToken(value.transferDestinationLabel ?? '') || undefined
  const intakeWeekLabel = normalizeToken(value.intakeWeekLabel ?? '') || undefined
  const confidence = value.confidence
  const unknownFields = parseStringList(value.unknownFields)
  const redactedFields = parseStringList(value.redactedFields)

  const record: CustodyStatusRecord = {
    id,
    label,
    subjectRef,
    custodyStage,
    formerRoleCategory,
    restrictionLevel,
    rightsReviewPending,
    ...(summary ? { summary } : {}),
    ...(holdCauseLabel ? { holdCauseLabel } : {}),
    ...(transferDestinationLabel ? { transferDestinationLabel } : {}),
    ...(intakeWeekLabel ? { intakeWeekLabel } : {}),
    ...(isValidUnitScore(confidence) ? { confidence } : {}),
    ...(unknownFields.length > 0 ? { unknownFields } : {}),
    ...(redactedFields.length > 0 ? { redactedFields } : {}),
  }

  if (!validateCustodyStatusRecord(record).valid) {
    return null
  }

  return record
}

/** Hydration: canonical custody map keyed by record id; drops invalid and duplicate-id entries. */
export function sanitizeCustodyStatusRecords(
  value: unknown,
  fallback: CustodyStatusRecordsMap = {}
): CustodyStatusRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: CustodyStatusRecordsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeCustodyStatusRecordEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}
