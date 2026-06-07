/**
 * SPE-1888 slice 1: welfare-debt accounting registry.
 *
 * Pure deterministic registry for coercive-procedure welfare debt tracking —
 * distinct from integrated health bundle wire-up (SPE-1889 slice 10).
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type WelfareDebtAccountingId = string

export type WelfareDebtCategory =
  | 'forced_isolation'
  | 'coerced_participation'
  | 'privilege_deprivation'
  | 'high_risk_personnel_sourcing'
  | 'punitive_handling'
  | 'coerced_medication'
  | 'coercive_interview'
  | 'harmful_restraint'

export const WELFARE_DEBT_CATEGORIES: readonly WelfareDebtCategory[] = [
  'forced_isolation',
  'coerced_participation',
  'privilege_deprivation',
  'high_risk_personnel_sourcing',
  'punitive_handling',
  'coerced_medication',
  'coercive_interview',
  'harmful_restraint',
] as const

export type WelfareDebtSeverityBand = 'low' | 'moderate' | 'high' | 'critical'

export const WELFARE_DEBT_SEVERITY_BANDS: readonly WelfareDebtSeverityBand[] = [
  'low',
  'moderate',
  'high',
  'critical',
] as const

export type WelfareDebtMitigationState =
  | 'unresolved'
  | 'acknowledged'
  | 'mitigated'
  | 'escalated'
  | 'waived'
  | 'denied'

export const WELFARE_DEBT_MITIGATION_STATES: readonly WelfareDebtMitigationState[] = [
  'unresolved',
  'acknowledged',
  'mitigated',
  'escalated',
  'waived',
  'denied',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface WelfareDebtAccountingRecord {
  readonly id: WelfareDebtAccountingId
  readonly label: string
  readonly summary?: string
  readonly subjectRef: string
  readonly debtCategory: WelfareDebtCategory
  readonly severityBand: WelfareDebtSeverityBand
  readonly mitigationState: WelfareDebtMitigationState
  readonly sourceProcedureLabel: string
  readonly reviewOwnerLabel: string
  readonly mitigationPathLabel?: string
  readonly containmentBenefitScore?: number
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type WelfareDebtAccountingValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_subject_ref'
  | 'invalid_debt_category'
  | 'invalid_severity_band'
  | 'invalid_mitigation_state'
  | 'missing_source_procedure_label'
  | 'missing_review_owner_label'
  | 'invalid_containment_benefit_score'
  | 'invalid_confidence'
  | 'unresolved_without_review_owner'
  | 'escalated_without_mitigation_path'
  | 'high_severity_without_containment_benefit'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface WelfareDebtAccountingValidationIssue {
  readonly code: WelfareDebtAccountingValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface WelfareDebtAccountingValidationResult {
  readonly valid: boolean
  readonly issues: readonly WelfareDebtAccountingValidationIssue[]
}

// ---------------------------------------------------------------------------
// Accounting projection
// ---------------------------------------------------------------------------

export interface WelfareDebtAccountingProjectionPolicy {
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
}

export interface WelfareDebtAccountingProjection {
  readonly recordId: WelfareDebtAccountingId
  readonly label: string
  readonly severityBand: WelfareDebtSeverityBand
  readonly mitigationState: WelfareDebtMitigationState
  readonly containmentBenefitScore: number | null
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const WELFARE_DEBT_CATEGORY_SET = new Set<string>(WELFARE_DEBT_CATEGORIES)
const WELFARE_DEBT_SEVERITY_BAND_SET = new Set<string>(WELFARE_DEBT_SEVERITY_BANDS)
const WELFARE_DEBT_MITIGATION_STATE_SET = new Set<string>(WELFARE_DEBT_MITIGATION_STATES)

const HIGH_SEVERITY_BANDS = new Set<WelfareDebtSeverityBand>(['high', 'critical'])

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

function pushIssue(
  issues: WelfareDebtAccountingValidationIssue[],
  issue: WelfareDebtAccountingValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: WelfareDebtAccountingValidationIssue[]) {
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
  issues: WelfareDebtAccountingValidationIssue[]
): WelfareDebtAccountingValidationResult {
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
  issues: WelfareDebtAccountingValidationIssue[],
  id: string,
  label: string,
  record: WelfareDebtAccountingRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Welfare-debt accounting record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Welfare-debt accounting record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Welfare-debt accounting record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Welfare-debt accounting record label ${label || '(unknown)'} contains a branded object number.`,
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
      detail: `Welfare-debt accounting record ${id || '(unknown)'} subjectRef contains a forbidden token.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function resolveConfidence(
  record: WelfareDebtAccountingRecord,
  policy: WelfareDebtAccountingProjectionPolicy
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

function resolveContainmentBenefitScore(
  record: WelfareDebtAccountingRecord,
  policy: WelfareDebtAccountingProjectionPolicy
): number | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)

  if (
    redactedFields.has('containmentBenefitScore') ||
    (policy.redactUnknown === true && unknownFields.includes('containmentBenefitScore'))
  ) {
    return null
  }

  const score = record.containmentBenefitScore
  return isValidUnitScore(score) ? score : null
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function isWelfareDebtCategory(value: unknown): value is WelfareDebtCategory {
  return typeof value === 'string' && WELFARE_DEBT_CATEGORY_SET.has(value)
}

export function isWelfareDebtSeverityBand(value: unknown): value is WelfareDebtSeverityBand {
  return typeof value === 'string' && WELFARE_DEBT_SEVERITY_BAND_SET.has(value)
}

export function isWelfareDebtMitigationState(value: unknown): value is WelfareDebtMitigationState {
  return typeof value === 'string' && WELFARE_DEBT_MITIGATION_STATE_SET.has(value)
}

export function validateWelfareDebtAccountingRecord(
  record: WelfareDebtAccountingRecord
): WelfareDebtAccountingValidationResult {
  const issues: WelfareDebtAccountingValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const subjectRef = normalizeToken(record.subjectRef)
  const sourceProcedureLabel = normalizeToken(record.sourceProcedureLabel)
  const reviewOwnerLabel = normalizeToken(record.reviewOwnerLabel)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Welfare-debt accounting record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Welfare-debt accounting record is missing label.',
    })
  }

  if (!subjectRef) {
    pushIssue(issues, {
      code: 'missing_subject_ref',
      severity: 'error',
      detail: 'Welfare-debt accounting record is missing subjectRef.',
    })
  }

  if (!isWelfareDebtCategory(record.debtCategory)) {
    pushIssue(issues, {
      code: 'invalid_debt_category',
      severity: 'error',
      detail: `Welfare-debt accounting record ${id || '(unknown)'} has invalid debtCategory.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isWelfareDebtSeverityBand(record.severityBand)) {
    pushIssue(issues, {
      code: 'invalid_severity_band',
      severity: 'error',
      detail: `Welfare-debt accounting record ${id || '(unknown)'} has invalid severityBand.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isWelfareDebtMitigationState(record.mitigationState)) {
    pushIssue(issues, {
      code: 'invalid_mitigation_state',
      severity: 'error',
      detail: `Welfare-debt accounting record ${id || '(unknown)'} has invalid mitigationState.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!sourceProcedureLabel) {
    pushIssue(issues, {
      code: 'missing_source_procedure_label',
      severity: 'error',
      detail: `Welfare-debt accounting record ${id || '(unknown)'} is missing sourceProcedureLabel.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!reviewOwnerLabel) {
    pushIssue(issues, {
      code: 'missing_review_owner_label',
      severity: 'error',
      detail: `Welfare-debt accounting record ${id || '(unknown)'} is missing reviewOwnerLabel.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.containmentBenefitScore !== undefined &&
    !isValidUnitScore(record.containmentBenefitScore)
  ) {
    pushIssue(issues, {
      code: 'invalid_containment_benefit_score',
      severity: 'error',
      detail: `Welfare-debt accounting record ${id || '(unknown)'} has invalid containmentBenefitScore.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Welfare-debt accounting record ${id || '(unknown)'} has invalid confidence.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  scanForbiddenTokens(issues, id, label, record)

  if (record.mitigationState === 'unresolved' && !reviewOwnerLabel) {
    pushIssue(issues, {
      code: 'unresolved_without_review_owner',
      severity: 'warning',
      detail: `Welfare-debt accounting record ${id || '(unknown)'} is unresolved without reviewOwnerLabel.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.mitigationState === 'escalated' && !normalizeToken(record.mitigationPathLabel ?? '')) {
    pushIssue(issues, {
      code: 'escalated_without_mitigation_path',
      severity: 'warning',
      detail: `Welfare-debt accounting record ${id || '(unknown)'} is escalated without mitigationPathLabel.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    isWelfareDebtSeverityBand(record.severityBand) &&
    HIGH_SEVERITY_BANDS.has(record.severityBand) &&
    record.containmentBenefitScore === undefined
  ) {
    pushIssue(issues, {
      code: 'high_severity_without_containment_benefit',
      severity: 'warning',
      detail: `Welfare-debt accounting record ${id || '(unknown)'} uses high/critical severity without containmentBenefitScore.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Projects welfare-debt accounting link fields from record-derived inputs.
 * Does not assert hidden dossier truth or automatic legitimacy outcomes.
 */
export function projectWelfareDebtAccounting(
  record: WelfareDebtAccountingRecord,
  policy: WelfareDebtAccountingProjectionPolicy = {}
): WelfareDebtAccountingProjection {
  const recordId = normalizeToken(record.id) || '(unknown)'
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)
  const confidence = resolveConfidence(record, policy)

  const benefitRedacted =
    redactedFields.has('containmentBenefitScore') ||
    (policy.redactUnknown === true && unknownFields.includes('containmentBenefitScore'))

  const redacted =
    benefitRedacted ||
    redactedFields.has('confidence') ||
    (confidence === null && record.confidence !== undefined && policy.minimumConfidence !== undefined)

  return Object.freeze({
    recordId,
    label: normalizeToken(record.label) || '(unknown)',
    severityBand: isWelfareDebtSeverityBand(record.severityBand) ? record.severityBand : 'moderate',
    mitigationState: isWelfareDebtMitigationState(record.mitigationState)
      ? record.mitigationState
      : 'unresolved',
    containmentBenefitScore: benefitRedacted
      ? null
      : resolveContainmentBenefitScore(record, policy),
    confidence,
    redacted,
    unknownFields,
  })
}

function defineRecord(record: WelfareDebtAccountingRecord): WelfareDebtAccountingRecord {
  return Object.freeze({ ...record })
}

/** Coercive restraint ledger with high severity and unresolved mitigation. */
export const COERCIVE_RESTRAINT_LEDGER_FIXTURE: WelfareDebtAccountingRecord = defineRecord({
  id: 'welfare-debt:coercive-restraint-ledger-12',
  label: 'Coercive restraint ledger entry',
  summary: 'Harmful restraint procedure with documented containment benefit and unresolved welfare debt.',
  subjectRef: 'subject:contained-person-field-links',
  debtCategory: 'harmful_restraint',
  severityBand: 'high',
  mitigationState: 'unresolved',
  sourceProcedureLabel: 'extended mechanical restraint cycle',
  reviewOwnerLabel: 'ethics review board',
  mitigationPathLabel: 'independent welfare audit',
  containmentBenefitScore: 0.71,
  confidence: 0.83,
})

/** Forced sedation cycle with escalated mitigation and critical severity. */
export const FORCED_SEDATION_CYCLE_FIXTURE: WelfareDebtAccountingRecord = defineRecord({
  id: 'welfare-debt:forced-sedation-cycle-3',
  label: 'Forced sedation cycle welfare debt',
  summary: 'Coerced medication cycle with escalated review and elevated containment benefit.',
  subjectRef: 'subject:cooperative-field-asset-22',
  debtCategory: 'coerced_medication',
  severityBand: 'critical',
  mitigationState: 'escalated',
  sourceProcedureLabel: 'forced sedation stabilization cycle',
  reviewOwnerLabel: 'psychiatric review panel',
  mitigationPathLabel: 'external oversight escalation',
  containmentBenefitScore: 0.64,
  confidence: 0.79,
})

// ---------------------------------------------------------------------------
// Persistence / hydration
// ---------------------------------------------------------------------------

export type WelfareDebtAccountingRecordsMap = Record<
  WelfareDebtAccountingId,
  WelfareDebtAccountingRecord
>

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

function sanitizeWelfareDebtAccountingRecordEntry(
  value: unknown
): WelfareDebtAccountingRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const label = normalizeToken(value.label)
  const subjectRef = normalizeToken(value.subjectRef)
  const debtCategory = value.debtCategory
  const severityBand = value.severityBand
  const mitigationState = value.mitigationState
  const sourceProcedureLabel = normalizeToken(value.sourceProcedureLabel)
  const reviewOwnerLabel = normalizeToken(value.reviewOwnerLabel)

  if (
    !id ||
    !label ||
    !subjectRef ||
    typeof debtCategory !== 'string' ||
    !isWelfareDebtCategory(debtCategory) ||
    typeof severityBand !== 'string' ||
    !isWelfareDebtSeverityBand(severityBand) ||
    typeof mitigationState !== 'string' ||
    !isWelfareDebtMitigationState(mitigationState) ||
    !sourceProcedureLabel ||
    !reviewOwnerLabel
  ) {
    return null
  }

  const summary =
    typeof value.summary === 'string' && value.summary.trim().length > 0
      ? value.summary.trim()
      : undefined
  const mitigationPathLabel = normalizeToken(value.mitigationPathLabel ?? '') || undefined
  const containmentBenefitScore = value.containmentBenefitScore
  const confidence = value.confidence
  const unknownFields = parseStringList(value.unknownFields)
  const redactedFields = parseStringList(value.redactedFields)

  const record: WelfareDebtAccountingRecord = {
    id,
    label,
    subjectRef,
    debtCategory,
    severityBand,
    mitigationState,
    sourceProcedureLabel,
    reviewOwnerLabel,
    ...(summary ? { summary } : {}),
    ...(mitigationPathLabel ? { mitigationPathLabel } : {}),
    ...(isValidUnitScore(containmentBenefitScore) ? { containmentBenefitScore } : {}),
    ...(isValidUnitScore(confidence) ? { confidence } : {}),
    ...(unknownFields.length > 0 ? { unknownFields } : {}),
    ...(redactedFields.length > 0 ? { redactedFields } : {}),
  }

  if (!validateWelfareDebtAccountingRecord(record).valid) {
    return null
  }

  return record
}

/** Hydration: canonical welfare-debt map keyed by record id; drops invalid and duplicate-id entries. */
export function sanitizeWelfareDebtAccountingRecords(
  value: unknown,
  fallback: WelfareDebtAccountingRecordsMap = {}
): WelfareDebtAccountingRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: WelfareDebtAccountingRecordsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeWelfareDebtAccountingRecordEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}

// ---------------------------------------------------------------------------
// Weekly orchestration (SPE-1888 slice 3)
// ---------------------------------------------------------------------------

/** Containment benefit below this threshold triggers legitimacy escalation and severity drift. */
const CONTAINMENT_BENEFIT_ESCALATION_THRESHOLD = 0.55

const TERMINAL_MITIGATION_STATES = new Set<WelfareDebtMitigationState>([
  'mitigated',
  'waived',
  'denied',
])

const HIGH_PRESSURE_DEBT_CATEGORIES = new Set<WelfareDebtCategory>([
  'harmful_restraint',
  'coerced_medication',
  'punitive_handling',
  'high_risk_personnel_sourcing',
])

const MEDIUM_PRESSURE_DEBT_CATEGORIES = new Set<WelfareDebtCategory>([
  'forced_isolation',
  'coercive_interview',
  'privilege_deprivation',
])

const REVIEW_CADENCE_WEEK_INTERVAL: Readonly<Record<WelfareDebtCategory, number>> = {
  harmful_restraint: 1,
  coerced_medication: 1,
  punitive_handling: 1,
  high_risk_personnel_sourcing: 1,
  forced_isolation: 2,
  coercive_interview: 2,
  privilege_deprivation: 2,
  coerced_participation: 4,
}

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function freezeWelfareDebtRecord(record: WelfareDebtAccountingRecord): WelfareDebtAccountingRecord {
  return Object.freeze({ ...record })
}

function hasLowContainmentBenefit(record: WelfareDebtAccountingRecord): boolean {
  const score = record.containmentBenefitScore
  if (score === undefined) {
    return HIGH_SEVERITY_BANDS.has(record.severityBand)
  }

  return isValidUnitScore(score) && score < CONTAINMENT_BENEFIT_ESCALATION_THRESHOLD
}

function isHighPressureDebtCategory(category: WelfareDebtCategory): boolean {
  return HIGH_PRESSURE_DEBT_CATEGORIES.has(category)
}

/** Whether the simulation week is a welfare-review due week for the declared debt category. */
export function isWelfareDebtReviewDueWeek(week: number, debtCategory: WelfareDebtCategory): boolean {
  const normalizedWeek = normalizeWeek(week)
  const interval = REVIEW_CADENCE_WEEK_INTERVAL[debtCategory]
  return normalizedWeek % interval === 0
}

/** Next severity band on the ladder; undefined when already critical or invalid. */
export function resolveNextWelfareDebtSeverityBand(
  severityBand: WelfareDebtSeverityBand
): WelfareDebtSeverityBand | undefined {
  const index = WELFARE_DEBT_SEVERITY_BANDS.indexOf(severityBand)
  if (index < 0 || index >= WELFARE_DEBT_SEVERITY_BANDS.length - 1) {
    return undefined
  }

  return WELFARE_DEBT_SEVERITY_BANDS[index + 1]
}

function applyMitigationAcknowledgmentStep(
  record: WelfareDebtAccountingRecord,
  week: number
): WelfareDebtAccountingRecord {
  if (record.mitigationState !== 'unresolved') {
    return record
  }

  if (!isWelfareDebtReviewDueWeek(week, record.debtCategory)) {
    return record
  }

  if (!normalizeToken(record.reviewOwnerLabel)) {
    return record
  }

  return {
    ...record,
    mitigationState: 'acknowledged',
  }
}

function applyLegitimacyEscalationStep(
  record: WelfareDebtAccountingRecord,
  week: number
): WelfareDebtAccountingRecord {
  if (record.mitigationState !== 'acknowledged') {
    return record
  }

  if (!isWelfareDebtReviewDueWeek(week, record.debtCategory)) {
    return record
  }

  if (!isHighPressureDebtCategory(record.debtCategory) || !hasLowContainmentBenefit(record)) {
    return record
  }

  return {
    ...record,
    mitigationState: 'escalated',
  }
}

function applySeverityDriftStep(
  record: WelfareDebtAccountingRecord,
  week: number
): WelfareDebtAccountingRecord {
  if (
    TERMINAL_MITIGATION_STATES.has(record.mitigationState) ||
    record.mitigationState === 'escalated'
  ) {
    return record
  }

  if (!isWelfareDebtReviewDueWeek(week, record.debtCategory)) {
    return record
  }

  if (!isHighPressureDebtCategory(record.debtCategory) && !MEDIUM_PRESSURE_DEBT_CATEGORIES.has(record.debtCategory)) {
    return record
  }

  if (!hasLowContainmentBenefit(record)) {
    return record
  }

  const nextSeverityBand = resolveNextWelfareDebtSeverityBand(record.severityBand)
  if (!nextSeverityBand || nextSeverityBand === record.severityBand) {
    return record
  }

  return {
    ...record,
    severityBand: nextSeverityBand,
  }
}

function buildWeeklyAdvanceCandidate(
  record: WelfareDebtAccountingRecord,
  week: number
): WelfareDebtAccountingRecord | undefined {
  if (TERMINAL_MITIGATION_STATES.has(record.mitigationState)) {
    return undefined
  }

  let current = record

  const afterAcknowledgment = applyMitigationAcknowledgmentStep(current, week)
  if (afterAcknowledgment !== current) {
    current = afterAcknowledgment
  }

  const afterSeverityDrift = applySeverityDriftStep(current, week)
  if (afterSeverityDrift !== current) {
    current = afterSeverityDrift
  }

  const afterEscalation = applyLegitimacyEscalationStep(current, week)
  if (afterEscalation !== current) {
    current = afterEscalation
  }

  return current === record ? undefined : current
}

/**
 * Advances one record for the simulation week: review acknowledgment, legitimacy escalation,
 * and severity drift derived from coercive-procedure category inputs. Returns the same
 * reference when no bounded field changes.
 */
export function advanceWelfareDebtAccountingRecordForWeek(
  record: WelfareDebtAccountingRecord,
  week: number
): WelfareDebtAccountingRecord {
  const normalizedWeek = normalizeWeek(week)
  const candidate = buildWeeklyAdvanceCandidate(record, normalizedWeek)
  if (!candidate) {
    return record
  }

  if (!validateWelfareDebtAccountingRecord(candidate).valid) {
    return record
  }

  return freezeWelfareDebtRecord(candidate)
}

/**
 * Applies one weekly orchestration pass over persisted welfare-debt accounting records.
 * Empty map is a no-op. Re-applying after advance is idempotent for the same week.
 */
export function applyWeeklyWelfareDebtAccountingTick(
  records: WelfareDebtAccountingRecordsMap | null | undefined,
  week: number
): WelfareDebtAccountingRecordsMap {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return safeRecords
  }

  const normalizedWeek = normalizeWeek(week)
  const next: WelfareDebtAccountingRecordsMap = { ...safeRecords }
  let changed = false

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const advanced = advanceWelfareDebtAccountingRecordForWeek(record, normalizedWeek)
    if (advanced !== record) {
      next[recordId] = advanced
      changed = true
    }
  }

  return changed ? next : safeRecords
}
