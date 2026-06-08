/**
 * SPE-868 slice 17: lightweight action-stub registry for follow-on recommendation records.
 *
 * Persists bounded `follow_on:action-stub:` tokens linked to recommendation registry entries.
 * Distinct from full retrospective action engine (SPE-868).
 */

import {
  BRANDED_OBJECT_NUMBER_PATTERN,
  FRANCHISE_TOKEN_PATTERN,
} from './postIncidentReviewRegistry'
import type { PostIncidentReviewRecommendationRecord } from './postIncidentReviewRecommendationRegistry'

export const FOLLOW_ON_ACTION_STUB_PREFIX = 'follow_on:action-stub:'

// ---------------------------------------------------------------------------
// Identifiers and records
// ---------------------------------------------------------------------------

export type PostIncidentReviewRecommendationActionId = string

export interface PostIncidentReviewRecommendationActionRecord {
  readonly id: PostIncidentReviewRecommendationActionId
  readonly label: string
  readonly recommendationRef: string
  readonly reviewRef: string
  readonly stubSuffix: string
  readonly actionToken: string
  readonly orchestrationWeek?: number
}

export type PostIncidentReviewRecommendationActionRecordsMap = Record<
  PostIncidentReviewRecommendationActionId,
  PostIncidentReviewRecommendationActionRecord
>

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type PostIncidentReviewRecommendationActionValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_recommendation_ref'
  | 'missing_review_ref'
  | 'missing_stub_suffix'
  | 'missing_action_token'
  | 'invalid_orchestration_week'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_stub_suffix'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_stub_suffix'

export interface PostIncidentReviewRecommendationActionValidationIssue {
  readonly code: PostIncidentReviewRecommendationActionValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface PostIncidentReviewRecommendationActionValidationResult {
  readonly valid: boolean
  readonly issues: readonly PostIncidentReviewRecommendationActionValidationIssue[]
}

const ACTION_ID_PREFIX = 'action:'

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
  issues: PostIncidentReviewRecommendationActionValidationIssue[],
  issue: PostIncidentReviewRecommendationActionValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: PostIncidentReviewRecommendationActionValidationIssue[]) {
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
  issues: PostIncidentReviewRecommendationActionValidationIssue[]
): PostIncidentReviewRecommendationActionValidationResult {
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
  issues: PostIncidentReviewRecommendationActionValidationIssue[],
  id: string,
  label: string,
  stubSuffix: string
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Post-incident recommendation action record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Post-incident recommendation action record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Post-incident recommendation action record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Post-incident recommendation action record label ${label || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(stubSuffix)) {
    pushIssue(issues, {
      code: 'franchise_token_in_stub_suffix',
      severity: 'error',
      detail: `Post-incident recommendation action record ${id || '(unknown)'} stubSuffix contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(stubSuffix)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_stub_suffix',
      severity: 'error',
      detail: `Post-incident recommendation action record ${id || '(unknown)'} stubSuffix contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function freezeRecord(
  record: PostIncidentReviewRecommendationActionRecord
): PostIncidentReviewRecommendationActionRecord {
  return Object.freeze({ ...record })
}

function buildActionId(stubSuffix: string): string {
  return `${ACTION_ID_PREFIX}${stubSuffix}`
}

function buildActionToken(stubSuffix: string): string {
  return `${FOLLOW_ON_ACTION_STUB_PREFIX}${stubSuffix}`
}

/** Returns a bounded stub suffix from a follow-on action-stub token, or undefined. */
export function parseFollowOnActionStubToken(token: string): string | undefined {
  if (!token.startsWith(FOLLOW_ON_ACTION_STUB_PREFIX)) {
    return undefined
  }

  const stubSuffix = token.slice(FOLLOW_ON_ACTION_STUB_PREFIX.length).trim()
  return stubSuffix.length > 0 ? stubSuffix : undefined
}

/**
 * Builds one action registry record from a persisted recommendation record.
 * Returns undefined when the recommendation is ineligible or validation fails.
 */
export function buildRecommendationActionRecordFromRecommendation(
  recommendation: PostIncidentReviewRecommendationRecord
): PostIncidentReviewRecommendationActionRecord | undefined {
  const recommendationRef = normalizeToken(recommendation.id)
  const reviewRef = normalizeToken(recommendation.reviewRef)
  const stubSuffix = normalizeToken(recommendation.stubSuffix)
  if (!recommendationRef || !reviewRef || !stubSuffix) {
    return undefined
  }

  const actionToken = buildActionToken(stubSuffix)
  const candidate: PostIncidentReviewRecommendationActionRecord = {
    id: buildActionId(stubSuffix),
    label: `Follow-on recommendation action — ${normalizeToken(recommendation.label) || recommendationRef}`,
    recommendationRef,
    reviewRef,
    stubSuffix,
    actionToken,
    ...(recommendation.orchestrationWeek !== undefined
      ? { orchestrationWeek: recommendation.orchestrationWeek }
      : {}),
  }

  if (!validatePostIncidentReviewRecommendationActionRecord(candidate).valid) {
    return undefined
  }

  return freezeRecord(candidate)
}

export function validatePostIncidentReviewRecommendationActionRecord(
  record: PostIncidentReviewRecommendationActionRecord
): PostIncidentReviewRecommendationActionValidationResult {
  const issues: PostIncidentReviewRecommendationActionValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const recommendationRef = normalizeToken(record.recommendationRef)
  const reviewRef = normalizeToken(record.reviewRef)
  const stubSuffix = normalizeToken(record.stubSuffix)
  const actionToken = normalizeToken(record.actionToken)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Post-incident recommendation action record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Post-incident recommendation action record is missing label.',
    })
  }

  if (!recommendationRef) {
    pushIssue(issues, {
      code: 'missing_recommendation_ref',
      severity: 'error',
      detail: `Post-incident recommendation action record ${id || '(unknown)'} is missing recommendationRef.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!reviewRef) {
    pushIssue(issues, {
      code: 'missing_review_ref',
      severity: 'error',
      detail: `Post-incident recommendation action record ${id || '(unknown)'} is missing reviewRef.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!stubSuffix) {
    pushIssue(issues, {
      code: 'missing_stub_suffix',
      severity: 'error',
      detail: `Post-incident recommendation action record ${id || '(unknown)'} is missing stubSuffix.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!actionToken) {
    pushIssue(issues, {
      code: 'missing_action_token',
      severity: 'error',
      detail: `Post-incident recommendation action record ${id || '(unknown)'} is missing actionToken.`,
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
      detail: `Post-incident recommendation action record ${id || '(unknown)'} orchestrationWeek must be a non-negative integer.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  scanForbiddenTokens(issues, id, label, stubSuffix)

  return freezeValidationResult(issues)
}

function sanitizePostIncidentReviewRecommendationActionRecordEntry(
  value: unknown
): PostIncidentReviewRecommendationActionRecord | null {
  if (!isRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const label = normalizeToken(value.label)
  const recommendationRef = normalizeToken(value.recommendationRef)
  const reviewRef = normalizeToken(value.reviewRef)
  const stubSuffix = normalizeToken(value.stubSuffix)
  const actionToken = normalizeToken(value.actionToken)
  const orchestrationWeek = value.orchestrationWeek

  const record: PostIncidentReviewRecommendationActionRecord = {
    id,
    label,
    recommendationRef,
    reviewRef,
    stubSuffix,
    actionToken,
    ...(isNonNegativeInteger(orchestrationWeek) ? { orchestrationWeek } : {}),
  }

  if (!validatePostIncidentReviewRecommendationActionRecord(record).valid) {
    return null
  }

  return freezeRecord(record)
}

/** Hydration: canonical action map keyed by record id; drops invalid and duplicate-id entries. */
export function sanitizePostIncidentReviewRecommendationActionRecords(
  value: unknown,
  fallback: PostIncidentReviewRecommendationActionRecordsMap = {}
): PostIncidentReviewRecommendationActionRecordsMap {
  if (!isRecord(value)) {
    return fallback
  }

  const next: PostIncidentReviewRecommendationActionRecordsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizePostIncidentReviewRecommendationActionRecordEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}

export function getPostIncidentReviewRecommendationActionById(
  registry: PostIncidentReviewRecommendationActionRecordsMap | undefined,
  actionId: string
): PostIncidentReviewRecommendationActionRecord | undefined {
  const normalized = normalizeToken(actionId)
  if (!normalized || !registry) {
    return undefined
  }

  return registry[normalized]
}
