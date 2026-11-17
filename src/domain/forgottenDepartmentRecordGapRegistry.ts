/**
 * SPE-2137 slice 1: forgotten department record gap registry.
 *
 * Pure deterministic registry representing forgotten institutional departments
 * or units through gaps in surviving records. Absence is a signal, not a verified
 * explanation. Distinct from missing-time evidence (SPE-888) and broader archives
 * (SPE-1032). Parent SPE-2108 remains completed.
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type ForgottenDepartmentRecordGapId = string

export type RecordGapKind =
  | 'missing_record'
  | 'staffing_gap'
  | 'budget_gap'
  | 'room_trace_gap'
  | 'other_absence'

export const RECORD_GAP_KINDS: readonly RecordGapKind[] = [
  'missing_record',
  'staffing_gap',
  'budget_gap',
  'room_trace_gap',
  'other_absence',
] as const

export type RediscoveryRisk = 'negligible' | 'low' | 'moderate' | 'high' | 'unknown'

export const REDISCOVERY_RISKS: readonly RediscoveryRisk[] = [
  'negligible',
  'low',
  'moderate',
  'high',
  'unknown',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface ForgottenDepartmentRecordGapRecord {
  readonly id: ForgottenDepartmentRecordGapId
  readonly departmentLabelRef: string
  readonly recordGapKind: RecordGapKind
  readonly absenceSignals: readonly string[]
  readonly rediscoveryRisk: RediscoveryRisk
  readonly summary?: string
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ForgottenDepartmentRecordGapValidationCode =
  | 'missing_id'
  | 'missing_department_label_ref'
  | 'invalid_record_gap_kind'
  | 'empty_absence_signals'
  | 'blank_absence_signal'
  | 'duplicate_absence_signal'
  | 'invalid_rediscovery_risk'
  | 'franchise_token_in_id'
  | 'franchise_token_in_field'

export interface ForgottenDepartmentRecordGapValidationIssue {
  readonly code: ForgottenDepartmentRecordGapValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface ForgottenDepartmentRecordGapValidationResult {
  readonly valid: boolean
  readonly issues: readonly ForgottenDepartmentRecordGapValidationIssue[]
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export interface ForgottenDepartmentRecordGapProjection {
  readonly recordId: ForgottenDepartmentRecordGapId
  readonly departmentLabelRef: string
  readonly recordGapKind: RecordGapKind
  readonly absenceSignals: readonly string[]
  readonly rediscoveryRisk: RediscoveryRisk
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

const GAP_KIND_SET = new Set<string>(RECORD_GAP_KINDS)
const RISK_SET = new Set<string>(REDISCOVERY_RISKS)

export const FRANCHISE_TOKEN_PATTERN =
  /(?:\b(?:scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|group of interest|broken masquerade|masquerade breach)\b|goi-)/i

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function pushIssue(
  issues: ForgottenDepartmentRecordGapValidationIssue[],
  issue: ForgottenDepartmentRecordGapValidationIssue
): void {
  issues.push(issue)
}

function containsFranchiseToken(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && FRANCHISE_TOKEN_PATTERN.test(token)
}

function sortedUniqueSignals(signals: readonly string[]): {
  readonly signals: readonly string[]
  readonly duplicates: readonly string[]
  readonly blanks: number
} {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  let blanks = 0
  const cleaned: string[] = []

  for (const raw of signals) {
    const token = normalizeToken(raw)
    if (token.length === 0) {
      blanks += 1
      continue
    }
    if (seen.has(token)) {
      duplicates.add(token)
      continue
    }
    seen.add(token)
    cleaned.push(token)
  }

  cleaned.sort((left, right) => left.localeCompare(right))
  return {
    signals: cleaned,
    duplicates: [...duplicates].sort((left, right) => left.localeCompare(right)),
    blanks,
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateForgottenDepartmentRecordGapRecord(
  record: ForgottenDepartmentRecordGapRecord
): ForgottenDepartmentRecordGapValidationResult {
  const issues: ForgottenDepartmentRecordGapValidationIssue[] = []
  const id = normalizeToken(record.id)
  const departmentLabelRef = normalizeToken(record.departmentLabelRef)

  if (id.length === 0) {
    pushIssue(issues, {
      code: 'missing_id',
      detail: 'Forgotten department record gap requires a nonempty id.',
      severity: 'error',
    })
  } else if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      detail: `Record ${id} id contains a franchise token.`,
      severity: 'error',
      relatedIds: [id],
    })
  }

  if (departmentLabelRef.length === 0) {
    pushIssue(issues, {
      code: 'missing_department_label_ref',
      detail: `Record ${id || '(unknown)'} requires a nonempty departmentLabelRef.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  } else if (containsFranchiseToken(departmentLabelRef)) {
    pushIssue(issues, {
      code: 'franchise_token_in_field',
      detail: `Record ${id || '(unknown)'} departmentLabelRef contains a franchise token.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!GAP_KIND_SET.has(record.recordGapKind)) {
    pushIssue(issues, {
      code: 'invalid_record_gap_kind',
      detail: `Record ${id || '(unknown)'} has invalid recordGapKind.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  const signals = Array.isArray(record.absenceSignals) ? record.absenceSignals : []
  const { signals: cleaned, duplicates, blanks } = sortedUniqueSignals(signals)

  if (blanks > 0) {
    pushIssue(issues, {
      code: 'blank_absence_signal',
      detail: `Record ${id || '(unknown)'} has ${blanks} blank absence signal(s).`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (duplicates.length > 0) {
    pushIssue(issues, {
      code: 'duplicate_absence_signal',
      detail: `Record ${id || '(unknown)'} has duplicate absence signals: ${duplicates.join(', ')}.`,
      severity: 'error',
      relatedIds: id ? [id, ...duplicates] : duplicates,
    })
  }

  if (cleaned.length === 0) {
    pushIssue(issues, {
      code: 'empty_absence_signals',
      detail: `Record ${id || '(unknown)'} requires at least one unique absence signal.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!RISK_SET.has(record.rediscoveryRisk)) {
    pushIssue(issues, {
      code: 'invalid_rediscovery_risk',
      detail: `Record ${id || '(unknown)'} has invalid rediscoveryRisk.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export function projectForgottenDepartmentRecordGap(
  record: ForgottenDepartmentRecordGapRecord
): ForgottenDepartmentRecordGapProjection {
  const { signals } = sortedUniqueSignals(record.absenceSignals)
  return {
    recordId: normalizeToken(record.id),
    departmentLabelRef: normalizeToken(record.departmentLabelRef),
    recordGapKind: record.recordGapKind,
    absenceSignals: signals,
    rediscoveryRisk: record.rediscoveryRisk,
  }
}
