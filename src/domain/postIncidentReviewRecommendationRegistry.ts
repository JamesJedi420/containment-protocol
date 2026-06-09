/**
 * SPE-868 slice 14: lightweight recommendation-stub registry for orchestration follow-ons.
 *
 * Persists bounded `follow_on:recommendation-stub:` tokens from review `unknownFields`
 * into a separate GameState map — distinct from full retrospective engine (SPE-868).
 */

import {
  BRANDED_OBJECT_NUMBER_PATTERN,
  FRANCHISE_TOKEN_PATTERN,
} from './postIncidentReviewRegistry'

// ---------------------------------------------------------------------------
// Identifiers and records
// ---------------------------------------------------------------------------

export type PostIncidentReviewRecommendationId = string

export interface PostIncidentReviewRecommendationRecord {
  readonly id: PostIncidentReviewRecommendationId
  readonly label: string
  readonly reviewRef: string
  readonly stubSuffix: string
  readonly followOnToken: string
  readonly orchestrationWeek?: number
}

export type PostIncidentReviewRecommendationRecordsMap = Record<
  PostIncidentReviewRecommendationId,
  PostIncidentReviewRecommendationRecord
>

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type PostIncidentReviewRecommendationValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_review_ref'
  | 'missing_stub_suffix'
  | 'missing_follow_on_token'
  | 'invalid_orchestration_week'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_stub_suffix'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_stub_suffix'

export interface PostIncidentReviewRecommendationValidationIssue {
  readonly code: PostIncidentReviewRecommendationValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface PostIncidentReviewRecommendationValidationResult {
  readonly valid: boolean
  readonly issues: readonly PostIncidentReviewRecommendationValidationIssue[]
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value === Math.trunc(value)
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
  issues: PostIncidentReviewRecommendationValidationIssue[],
  issue: PostIncidentReviewRecommendationValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: PostIncidentReviewRecommendationValidationIssue[]) {
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
  issues: PostIncidentReviewRecommendationValidationIssue[]
): PostIncidentReviewRecommendationValidationResult {
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
  issues: PostIncidentReviewRecommendationValidationIssue[],
  id: string,
  label: string,
  stubSuffix: string
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Post-incident recommendation record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Post-incident recommendation record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Post-incident recommendation record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Post-incident recommendation record label ${label || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(stubSuffix)) {
    pushIssue(issues, {
      code: 'franchise_token_in_stub_suffix',
      severity: 'error',
      detail: `Post-incident recommendation record ${id || '(unknown)'} stubSuffix contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(stubSuffix)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_stub_suffix',
      severity: 'error',
      detail: `Post-incident recommendation record ${id || '(unknown)'} stubSuffix contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function freezeRecord(
  record: PostIncidentReviewRecommendationRecord
): PostIncidentReviewRecommendationRecord {
  return Object.freeze({ ...record })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validatePostIncidentReviewRecommendationRecord(
  record: PostIncidentReviewRecommendationRecord
): PostIncidentReviewRecommendationValidationResult {
  const issues: PostIncidentReviewRecommendationValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const reviewRef = normalizeToken(record.reviewRef)
  const stubSuffix = normalizeToken(record.stubSuffix)
  const followOnToken = normalizeToken(record.followOnToken)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Post-incident recommendation record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Post-incident recommendation record is missing label.',
    })
  }

  if (!reviewRef) {
    pushIssue(issues, {
      code: 'missing_review_ref',
      severity: 'error',
      detail: `Post-incident recommendation record ${id || '(unknown)'} is missing reviewRef.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!stubSuffix) {
    pushIssue(issues, {
      code: 'missing_stub_suffix',
      severity: 'error',
      detail: `Post-incident recommendation record ${id || '(unknown)'} is missing stubSuffix.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!followOnToken) {
    pushIssue(issues, {
      code: 'missing_follow_on_token',
      severity: 'error',
      detail: `Post-incident recommendation record ${id || '(unknown)'} is missing followOnToken.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.orchestrationWeek !== undefined &&
    !isNonNegativeInteger(record.orchestrationWeek)
  ) {
    pushIssue(issues, {
      code: 'invalid_orchestration_week',
      severity: 'error',
      detail: `Post-incident recommendation record ${id || '(unknown)'} orchestrationWeek must be a non-negative integer.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  scanForbiddenTokens(issues, id, label, stubSuffix)

  return freezeValidationResult(issues)
}

function sanitizePostIncidentReviewRecommendationRecordEntry(
  value: unknown
): PostIncidentReviewRecommendationRecord | null {
  if (!isRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const label = normalizeToken(value.label)
  const reviewRef = normalizeToken(value.reviewRef)
  const stubSuffix = normalizeToken(value.stubSuffix)
  const followOnToken = normalizeToken(value.followOnToken)
  const orchestrationWeek = value.orchestrationWeek

  const record: PostIncidentReviewRecommendationRecord = {
    id,
    label,
    reviewRef,
    stubSuffix,
    followOnToken,
    ...(isNonNegativeInteger(orchestrationWeek) ? { orchestrationWeek } : {}),
  }

  if (!validatePostIncidentReviewRecommendationRecord(record).valid) {
    return null
  }

  return freezeRecord(record)
}

/** Hydration: canonical recommendation map keyed by record id; drops invalid and duplicate-id entries. */
export function sanitizePostIncidentReviewRecommendationRecords(
  value: unknown,
  fallback: PostIncidentReviewRecommendationRecordsMap = {}
): PostIncidentReviewRecommendationRecordsMap {
  if (!isRecord(value)) {
    return fallback
  }

  const next: PostIncidentReviewRecommendationRecordsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizePostIncidentReviewRecommendationRecordEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}

export function getPostIncidentReviewRecommendationById(
  registry: PostIncidentReviewRecommendationRecordsMap | undefined,
  recommendationId: string
): PostIncidentReviewRecommendationRecord | undefined {
  const normalized = normalizeToken(recommendationId)
  if (!normalized || !registry) {
    return undefined
  }

  return registry[normalized]
}
