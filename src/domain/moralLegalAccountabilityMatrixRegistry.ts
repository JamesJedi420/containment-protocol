/**
 * SPE-1131 slice 1 anchor: moral-legal accountability matrix registry.
 *
 * Pure deterministic schema + projection for split moral, legal, institutional, and
 * public accountability outcomes — no full matrix engine or GameState persistence here.
 */

import {
  FRANCHISE_TOKEN_PATTERN,
} from './containedPersonTherapeuticCareRegistry'

export type MoralLegalAccountabilityMatrixId = string

export type AccountabilityOutcome =
  | 'cleared'
  | 'liable'
  | 'blamed'
  | 'condemned'
  | 'deferred'

export const ACCOUNTABILITY_OUTCOMES: readonly AccountabilityOutcome[] = [
  'cleared',
  'liable',
  'blamed',
  'condemned',
  'deferred',
] as const

export type ResponsibilityApplicability = 'immoral' | 'amoral' | 'inapplicable'

export const RESPONSIBILITY_APPLICABILITY_CLASSES: readonly ResponsibilityApplicability[] = [
  'immoral',
  'amoral',
  'inapplicable',
] as const

export interface MoralLegalAccountabilityMatrixRecord {
  readonly id: MoralLegalAccountabilityMatrixId
  readonly label: string
  readonly summary?: string
  readonly mitigationPathLabel: string
  readonly subjectRef?: string
  readonly moralOutcome: AccountabilityOutcome
  readonly legalOutcome: AccountabilityOutcome
  readonly institutionalOutcome: AccountabilityOutcome
  readonly publicOutcome: AccountabilityOutcome
  readonly responsibilityClass: ResponsibilityApplicability
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

export type MoralLegalAccountabilityMatrixValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_mitigation_path_label'
  | 'invalid_moral_outcome'
  | 'invalid_legal_outcome'
  | 'invalid_institutional_outcome'
  | 'invalid_public_outcome'
  | 'invalid_responsibility_class'
  | 'invalid_confidence'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'

export interface MoralLegalAccountabilityMatrixValidationIssue {
  readonly code: MoralLegalAccountabilityMatrixValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface MoralLegalAccountabilityMatrixValidationResult {
  readonly valid: boolean
  readonly issues: readonly MoralLegalAccountabilityMatrixValidationIssue[]
}

export interface MoralLegalAccountabilityMatrixProjection {
  readonly recordId: MoralLegalAccountabilityMatrixId
  readonly wiredRef: string
  readonly label: string
  readonly mitigationPathLabel: string
  readonly subjectRef: string | null
  readonly moralOutcome: AccountabilityOutcome
  readonly legalOutcome: AccountabilityOutcome
  readonly institutionalOutcome: AccountabilityOutcome
  readonly publicOutcome: AccountabilityOutcome
  readonly responsibilityClass: ResponsibilityApplicability
  readonly confidence: number | null
  readonly redacted: boolean
}

export type MoralLegalAccountabilityMatrixRecordsMap = Record<
  MoralLegalAccountabilityMatrixId,
  MoralLegalAccountabilityMatrixRecord
>

const ACCOUNTABILITY_OUTCOME_SET = new Set<string>(ACCOUNTABILITY_OUTCOMES)
const RESPONSIBILITY_CLASS_SET = new Set<string>(RESPONSIBILITY_APPLICABILITY_CLASSES)

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function slugifyMitigationPathLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function formatMoralLegalAccountabilityMatrixWiredRef(recordId: string): string {
  return `accountability-matrix:${normalizeToken(recordId)}`
}

function containsFranchiseToken(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && FRANCHISE_TOKEN_PATTERN.test(token)
}

function isValidUnitScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function freezeValidationResult(
  issues: MoralLegalAccountabilityMatrixValidationIssue[]
): MoralLegalAccountabilityMatrixValidationResult {
  const sortedIssues = [...issues].sort((left, right) => {
    const codeCompare = left.code.localeCompare(right.code)
    if (codeCompare !== 0) {
      return codeCompare
    }

    return left.detail.localeCompare(right.detail)
  })
  const hasError = sortedIssues.some((issue) => issue.severity === 'error')

  return Object.freeze({
    valid: !hasError,
    issues: Object.freeze(sortedIssues),
  })
}

export function validateMoralLegalAccountabilityMatrixRecord(
  record: MoralLegalAccountabilityMatrixRecord
): MoralLegalAccountabilityMatrixValidationResult {
  const issues: MoralLegalAccountabilityMatrixValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const mitigationPathLabel = normalizeToken(record.mitigationPathLabel)

  if (!id) {
    issues.push({
      code: 'missing_id',
      severity: 'error',
      detail: 'Accountability matrix record is missing id.',
    })
  }

  if (!label) {
    issues.push({
      code: 'missing_label',
      severity: 'error',
      detail: `Accountability matrix record ${id || '(unknown)'} is missing label.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!mitigationPathLabel) {
    issues.push({
      code: 'missing_mitigation_path_label',
      severity: 'error',
      detail: `Accountability matrix record ${id || '(unknown)'} is missing mitigationPathLabel.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const outcomeFields: Array<[keyof MoralLegalAccountabilityMatrixRecord, string]> = [
    ['moralOutcome', 'invalid_moral_outcome'],
    ['legalOutcome', 'invalid_legal_outcome'],
    ['institutionalOutcome', 'invalid_institutional_outcome'],
    ['publicOutcome', 'invalid_public_outcome'],
  ]

  for (const [field, code] of outcomeFields) {
    const value = record[field]
    if (typeof value !== 'string' || !ACCOUNTABILITY_OUTCOME_SET.has(value)) {
      issues.push({
        code: code as MoralLegalAccountabilityMatrixValidationCode,
        severity: 'error',
        detail: `Accountability matrix record ${id || '(unknown)'} has invalid ${String(field)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (!RESPONSIBILITY_CLASS_SET.has(record.responsibilityClass)) {
    issues.push({
      code: 'invalid_responsibility_class',
      severity: 'error',
      detail: `Accountability matrix record ${id || '(unknown)'} has invalid responsibilityClass.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    issues.push({
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Accountability matrix record ${id || '(unknown)'} has invalid confidence.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(id)) {
    issues.push({
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: 'Accountability matrix record id contains a franchise or source-literal token.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    issues.push({
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: 'Accountability matrix record label contains a franchise or source-literal token.',
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

export function projectMoralLegalAccountabilityMatrixReview(
  record: MoralLegalAccountabilityMatrixRecord
): MoralLegalAccountabilityMatrixProjection {
  const subjectRef = normalizeToken(record.subjectRef ?? '') || null
  const redacted = (record.redactedFields?.length ?? 0) > 0

  return Object.freeze({
    recordId: record.id,
    wiredRef: formatMoralLegalAccountabilityMatrixWiredRef(record.id),
    label: record.label,
    mitigationPathLabel: record.mitigationPathLabel,
    subjectRef,
    moralOutcome: record.moralOutcome,
    legalOutcome: record.legalOutcome,
    institutionalOutcome: record.institutionalOutcome,
    publicOutcome: record.publicOutcome,
    responsibilityClass: record.responsibilityClass,
    confidence:
      typeof record.confidence === 'number' && Number.isFinite(record.confidence)
        ? record.confidence
        : null,
    redacted,
  })
}

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

function sanitizeMoralLegalAccountabilityMatrixRecordEntry(
  value: unknown
): MoralLegalAccountabilityMatrixRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const label = normalizeToken(value.label)
  const mitigationPathLabel = normalizeToken(value.mitigationPathLabel)
  const moralOutcome = value.moralOutcome
  const legalOutcome = value.legalOutcome
  const institutionalOutcome = value.institutionalOutcome
  const publicOutcome = value.publicOutcome
  const responsibilityClass = value.responsibilityClass

  if (
    !id ||
    !label ||
    !mitigationPathLabel ||
    typeof moralOutcome !== 'string' ||
    !ACCOUNTABILITY_OUTCOME_SET.has(moralOutcome) ||
    typeof legalOutcome !== 'string' ||
    !ACCOUNTABILITY_OUTCOME_SET.has(legalOutcome) ||
    typeof institutionalOutcome !== 'string' ||
    !ACCOUNTABILITY_OUTCOME_SET.has(institutionalOutcome) ||
    typeof publicOutcome !== 'string' ||
    !ACCOUNTABILITY_OUTCOME_SET.has(publicOutcome) ||
    typeof responsibilityClass !== 'string' ||
    !RESPONSIBILITY_CLASS_SET.has(responsibilityClass)
  ) {
    return null
  }

  const summary =
    typeof value.summary === 'string' && value.summary.trim().length > 0
      ? value.summary.trim()
      : undefined
  const subjectRef = normalizeToken(value.subjectRef ?? '') || undefined
  const confidence = value.confidence
  const unknownFields = parseStringList(value.unknownFields)
  const redactedFields = parseStringList(value.redactedFields)

  const record: MoralLegalAccountabilityMatrixRecord = {
    id,
    label,
    mitigationPathLabel,
    moralOutcome: moralOutcome as AccountabilityOutcome,
    legalOutcome: legalOutcome as AccountabilityOutcome,
    institutionalOutcome: institutionalOutcome as AccountabilityOutcome,
    publicOutcome: publicOutcome as AccountabilityOutcome,
    responsibilityClass: responsibilityClass as ResponsibilityApplicability,
    ...(summary ? { summary } : {}),
    ...(subjectRef ? { subjectRef } : {}),
    ...(isValidUnitScore(confidence) ? { confidence } : {}),
    ...(unknownFields.length > 0 ? { unknownFields } : {}),
    ...(redactedFields.length > 0 ? { redactedFields } : {}),
  }

  if (!validateMoralLegalAccountabilityMatrixRecord(record).valid) {
    return null
  }

  return record
}

/** Hydration: canonical accountability matrix map keyed by record id; drops invalid and duplicate-id entries. */
export function sanitizeMoralLegalAccountabilityMatrixRecords(
  value: unknown,
  fallback: MoralLegalAccountabilityMatrixRecordsMap = {}
): MoralLegalAccountabilityMatrixRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: MoralLegalAccountabilityMatrixRecordsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeMoralLegalAccountabilityMatrixRecordEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}

export function listHydratedAccountabilityMatrixRecordsForMitigationPathLabel(
  records: MoralLegalAccountabilityMatrixRecordsMap | undefined,
  mitigationPathLabel: string
): MoralLegalAccountabilityMatrixRecord[] {
  const normalizedSlug = slugifyMitigationPathLabel(mitigationPathLabel)
  if (!normalizedSlug) {
    return []
  }

  return Object.values(records ?? {})
    .filter(
      (record) =>
        slugifyMitigationPathLabel(record.mitigationPathLabel) === normalizedSlug &&
        validateMoralLegalAccountabilityMatrixRecord(record).valid
    )
    .sort((left, right) => left.id.localeCompare(right.id))
}

export function listHydratedAccountabilityMatrixRecordsForSubjectRef(
  records: MoralLegalAccountabilityMatrixRecordsMap | undefined,
  subjectRef: string
): MoralLegalAccountabilityMatrixRecord[] {
  const normalizedSubjectRef = normalizeToken(subjectRef)
  if (!normalizedSubjectRef) {
    return []
  }

  return Object.values(records ?? {})
    .filter(
      (record) =>
        normalizeToken(record.subjectRef ?? '') === normalizedSubjectRef &&
        validateMoralLegalAccountabilityMatrixRecord(record).valid
    )
    .sort((left, right) => left.id.localeCompare(right.id))
}

/** Independent welfare audit mitigation path with split moral/legal outcomes. */
export const INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE: MoralLegalAccountabilityMatrixRecord =
  Object.freeze({
    id: 'accountability-matrix:independent-welfare-audit',
    label: 'Independent welfare audit accountability',
    summary: 'Institutionally blamed while legally deferred pending external audit.',
    mitigationPathLabel: 'independent welfare audit',
    subjectRef: 'subject:contained-person-field-links',
    moralOutcome: 'blamed',
    legalOutcome: 'deferred',
    institutionalOutcome: 'blamed',
    publicOutcome: 'deferred',
    responsibilityClass: 'immoral',
    confidence: 0.77,
  })

/** External oversight escalation path with divergent public condemnation. */
export const EXTERNAL_OVERSIGHT_ESCALATION_MATRIX_FIXTURE: MoralLegalAccountabilityMatrixRecord =
  Object.freeze({
    id: 'accountability-matrix:external-oversight-escalation',
    label: 'External oversight escalation accountability',
    summary: 'Legally liable while institutionally cleared under emergency doctrine.',
    mitigationPathLabel: 'external oversight escalation',
    subjectRef: 'subject:cooperative-field-asset-22',
    moralOutcome: 'blamed',
    legalOutcome: 'liable',
    institutionalOutcome: 'cleared',
    publicOutcome: 'condemned',
    responsibilityClass: 'immoral',
    confidence: 0.74,
  })
