/**
 * SPE-868 / SPE-2370 slice 5: recurrent catastrophe ↔ post-incident review ref wire-up.
 *
 * Pure deterministic ref resolution/validation/compose between persisted
 * recurrent catastrophe records and a supplied post-incident review registry map.
 */

import {
  FRANCHISE_TOKEN_PATTERN,
  BRANDED_OBJECT_NUMBER_PATTERN,
  getPostIncidentReviewById,
  projectPostIncidentReviewSummary,
  validatePostIncidentReviewRecord,
  type PostIncidentReviewRecordsMap,
  type PostIncidentReviewSummaryProjection,
  type PostIncidentReviewSummaryProjectionPolicy,
} from './postIncidentReviewRegistry'
import {
  validateRecurrentCatastropheRecord,
  type RecurrentCatastropheId,
  type RecurrentCatastropheRecord,
  type RecurrentCatastropheRecordsMap,
} from './recurrentCatastropheAmeliorationRegistry'

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
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
  issues: RecurrentCatastropheReviewRefValidationIssue[],
  issue: RecurrentCatastropheReviewRefValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: RecurrentCatastropheReviewRefValidationIssue[]) {
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
  issues: RecurrentCatastropheReviewRefValidationIssue[]
): RecurrentCatastropheReviewRefValidationResult {
  const sortedIssues = sortValidationIssues(issues)
  const hasError = sortedIssues.some((issue) => issue.severity === 'error')

  return Object.freeze({
    valid: !hasError,
    issues: Object.freeze(
      sortedIssues.map((issue) =>
        Object.freeze({
          ...issue,
          ...(issue.relatedIds ? { relatedIds: Object.freeze([...issue.relatedIds]) } : {}),
          ...(issue.relatedReviewRefs
            ? { relatedReviewRefs: Object.freeze([...issue.relatedReviewRefs]) }
            : {}),
        })
      )
    ),
  })
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value === Math.trunc(value)
}

export type RecurrentCatastropheReviewRefValidationCode =
  | 'missing_post_incident_review_ref'
  | 'duplicate_post_incident_review_ref'
  | 'franchise_token_in_review_ref'
  | 'branded_object_number_in_review_ref'
  | 'recurrence_without_post_incident_review'

export interface RecurrentCatastropheReviewRefValidationIssue {
  readonly code: RecurrentCatastropheReviewRefValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
  readonly relatedReviewRefs?: readonly string[]
}

export interface RecurrentCatastropheReviewRefValidationResult {
  readonly valid: boolean
  readonly issues: readonly RecurrentCatastropheReviewRefValidationIssue[]
}

export interface RecurrentCatastrophePostIncidentReviewLink {
  readonly reviewRef: string
  readonly reviewId: string
  readonly summary: PostIncidentReviewSummaryProjection
}

export interface RecurrentCatastrophePostIncidentReviewLinkSummary {
  readonly recordId: RecurrentCatastropheId
  readonly links: readonly RecurrentCatastrophePostIncidentReviewLink[]
  readonly linkedReviewCount: number
  readonly unresolvedReviewRefs: readonly string[]
}

function resolveReviewRecord(
  reviews: PostIncidentReviewRecordsMap | undefined,
  reviewRef: string
) {
  const review = getPostIncidentReviewById(reviews, reviewRef)
  if (!review || !validatePostIncidentReviewRecord(review).valid) {
    return null
  }

  return review
}

function buildReviewLink(
  reviewRef: string,
  policy: PostIncidentReviewSummaryProjectionPolicy,
  reviews: PostIncidentReviewRecordsMap | undefined
): RecurrentCatastrophePostIncidentReviewLink | null {
  const review = resolveReviewRecord(reviews, reviewRef)
  if (!review) {
    return null
  }

  return Object.freeze({
    reviewRef,
    reviewId: review.id,
    summary: projectPostIncidentReviewSummary(review, policy),
  })
}

export function validateRecurrentCatastrophePostIncidentReviewRefs(
  record: RecurrentCatastropheRecord,
  reviews: PostIncidentReviewRecordsMap | undefined
): RecurrentCatastropheReviewRefValidationResult {
  const issues: RecurrentCatastropheReviewRefValidationIssue[] = []
  const id = normalizeToken(record.id)
  const refs = asStringArray(record.postIncidentReviewRefs)
  const seenRefs = new Set<string>()

  for (const ref of refs) {
    const normalizedRef = normalizeToken(ref)
    if (!normalizedRef) {
      continue
    }

    if (containsFranchiseToken(normalizedRef)) {
      pushIssue(issues, {
        code: 'franchise_token_in_review_ref',
        severity: 'error',
        detail: `Recurrent catastrophe record ${id || '(unknown)'} postIncidentReviewRefs contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
        relatedReviewRefs: [normalizedRef],
      })
    }

    if (containsBrandedObjectNumber(normalizedRef)) {
      pushIssue(issues, {
        code: 'branded_object_number_in_review_ref',
        severity: 'error',
        detail: `Recurrent catastrophe record ${id || '(unknown)'} postIncidentReviewRefs contains a branded object number.`,
        relatedIds: id ? [id] : undefined,
        relatedReviewRefs: [normalizedRef],
      })
    }

    if (seenRefs.has(normalizedRef)) {
      pushIssue(issues, {
        code: 'duplicate_post_incident_review_ref',
        severity: 'warning',
        detail: `Recurrent catastrophe record ${id || '(unknown)'} repeats postIncidentReviewRef ${normalizedRef}.`,
        relatedIds: id ? [id] : undefined,
        relatedReviewRefs: [normalizedRef],
      })
      continue
    }

    seenRefs.add(normalizedRef)

    if (!resolveReviewRecord(reviews, normalizedRef)) {
      pushIssue(issues, {
        code: 'missing_post_incident_review_ref',
        severity: 'warning',
        detail: `Recurrent catastrophe record ${id || '(unknown)'} postIncidentReviewRef ${normalizedRef} does not resolve in the review registry.`,
        relatedIds: id ? [id] : undefined,
        relatedReviewRefs: [normalizedRef],
      })
    }
  }

  if (
    isNonNegativeInteger(record.recurrenceCount) &&
    record.recurrenceCount > 0 &&
    refs.every((ref) => !normalizeToken(ref))
  ) {
    pushIssue(issues, {
      code: 'recurrence_without_post_incident_review',
      severity: 'warning',
      detail: `Recurrent catastrophe record ${id || '(unknown)'} reports recurrenceCount without postIncidentReviewRefs.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

export function resolveRecurrentCatastrophePostIncidentReviewLinks(
  record: RecurrentCatastropheRecord,
  reviews: PostIncidentReviewRecordsMap | undefined,
  policy: PostIncidentReviewSummaryProjectionPolicy = {}
): readonly RecurrentCatastrophePostIncidentReviewLink[] {
  if (!validateRecurrentCatastropheRecord(record).valid) {
    return Object.freeze([])
  }

  const links: RecurrentCatastrophePostIncidentReviewLink[] = []
  const seenRefs = new Set<string>()

  for (const ref of asStringArray(record.postIncidentReviewRefs)) {
    const normalizedRef = normalizeToken(ref)
    if (!normalizedRef || seenRefs.has(normalizedRef)) {
      continue
    }

    seenRefs.add(normalizedRef)
    const link = buildReviewLink(normalizedRef, policy, reviews)
    if (link) {
      links.push(link)
    }
  }

  links.sort((left, right) => left.reviewRef.localeCompare(right.reviewRef))

  return Object.freeze(links)
}

export function composeRecurrentCatastrophePostIncidentReviewLinks(
  records: RecurrentCatastropheRecordsMap | undefined,
  reviews: PostIncidentReviewRecordsMap | undefined,
  policy: PostIncidentReviewSummaryProjectionPolicy = {}
): readonly RecurrentCatastrophePostIncidentReviewLinkSummary[] {
  if (!records) {
    return Object.freeze([])
  }

  const summaries: RecurrentCatastrophePostIncidentReviewLinkSummary[] = []

  for (const record of Object.values(records)) {
    if (!validateRecurrentCatastropheRecord(record).valid) {
      continue
    }

    const links = resolveRecurrentCatastrophePostIncidentReviewLinks(record, reviews, policy)
    const unresolvedReviewRefs = Object.freeze(
      asStringArray(record.postIncidentReviewRefs)
        .map((ref) => normalizeToken(ref))
        .filter((ref) => ref.length > 0)
        .filter((ref) => !links.some((link) => link.reviewRef === ref))
        .sort((left, right) => left.localeCompare(right))
    )

    summaries.push(
      Object.freeze({
        recordId: record.id,
        links,
        linkedReviewCount: links.length,
        unresolvedReviewRefs,
      })
    )
  }

  summaries.sort((left, right) => left.recordId.localeCompare(right.recordId))

  return Object.freeze(summaries)
}
