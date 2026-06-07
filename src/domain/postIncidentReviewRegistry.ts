/**
 * SPE-868 slice 5: post-incident review registry stub.
 *
 * Compact deterministic registry for structured retrospective records — distinct
 * from full SPE-868 retrospective engine and case lifecycle wire-up (SPE-1310).
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type PostIncidentReviewId = string

export type PostIncidentReviewRoute =
  | 'internal_command'
  | 'external_audit'
  | 'outside_review'
  | 'reform_mandate'

export const POST_INCIDENT_REVIEW_ROUTES: readonly PostIncidentReviewRoute[] = [
  'internal_command',
  'external_audit',
  'outside_review',
  'reform_mandate',
] as const

export type PostIncidentClosureOutcome =
  | 'solved'
  | 'administratively_cleared'
  | 'contained'
  | 'misclassified'
  | 'falsely_closed'
  | 'politically_buried'

export const POST_INCIDENT_CLOSURE_OUTCOMES: readonly PostIncidentClosureOutcome[] = [
  'solved',
  'administratively_cleared',
  'contained',
  'misclassified',
  'falsely_closed',
  'politically_buried',
] as const

export interface PostIncidentMilestoneTimings {
  readonly discoveryWeek?: number
  readonly responseWeek?: number
  readonly containmentWeek?: number
  readonly recoveryWeek?: number
  readonly reportingWeek?: number
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface PostIncidentReviewRecord {
  readonly id: PostIncidentReviewId
  readonly label: string
  readonly summary?: string
  readonly reviewRoute: PostIncidentReviewRoute
  readonly closureOutcome: PostIncidentClosureOutcome
  readonly milestoneTimings?: PostIncidentMilestoneTimings
  readonly procedureAdherenceScore?: number
  readonly recurrenceObserved?: boolean
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type PostIncidentReviewValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'invalid_review_route'
  | 'invalid_closure_outcome'
  | 'invalid_procedure_adherence_score'
  | 'invalid_confidence'
  | 'invalid_milestone_week'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface PostIncidentReviewValidationIssue {
  readonly code: PostIncidentReviewValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface PostIncidentReviewValidationResult {
  readonly valid: boolean
  readonly issues: readonly PostIncidentReviewValidationIssue[]
}

// ---------------------------------------------------------------------------
// Review summary projection
// ---------------------------------------------------------------------------

export interface PostIncidentReviewSummaryProjectionPolicy {
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
}

export interface PostIncidentReviewSummaryProjection {
  readonly reviewId: PostIncidentReviewId
  readonly label: string
  readonly reviewRoute: PostIncidentReviewRoute
  readonly closureOutcome: PostIncidentClosureOutcome
  readonly milestoneSpanWeeks: number | null
  readonly procedureAdherenceScore: number | null
  readonly recurrenceObserved: boolean | null
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const POST_INCIDENT_REVIEW_ROUTE_SET = new Set<string>(POST_INCIDENT_REVIEW_ROUTES)
const POST_INCIDENT_CLOSURE_OUTCOME_SET = new Set<string>(POST_INCIDENT_CLOSURE_OUTCOMES)

export const FRANCHISE_TOKEN_PATTERN =
  /\b(scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|goi-|group of interest|broken masquerade|masquerade breach|wiki\.|wikidot)\b/i

export const BRANDED_OBJECT_NUMBER_PATTERN = /\bSCP[\s-]?\d{3,4}\b/i

const MILESTONE_WEEK_FIELDS: readonly (keyof PostIncidentMilestoneTimings)[] = [
  'discoveryWeek',
  'responseWeek',
  'containmentWeek',
  'recoveryWeek',
  'reportingWeek',
]

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
  issues: PostIncidentReviewValidationIssue[],
  issue: PostIncidentReviewValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: PostIncidentReviewValidationIssue[]) {
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

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value === Math.trunc(value)
}

function freezeValidationResult(
  issues: PostIncidentReviewValidationIssue[]
): PostIncidentReviewValidationResult {
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

function scanForbiddenTokens(
  issues: PostIncidentReviewValidationIssue[],
  id: string,
  label: string,
  record: PostIncidentReviewRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Post-incident review record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Post-incident review record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Post-incident review record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Post-incident review record label ${label || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const summary = normalizeToken(record.summary ?? '')
  if (summary && containsFranchiseToken(summary)) {
    pushIssue(issues, {
      code: 'franchise_token_in_field',
      severity: 'error',
      detail: `Post-incident review record ${id || '(unknown)'} field summary contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (summary && containsBrandedObjectNumber(summary)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_field',
      severity: 'error',
      detail: `Post-incident review record ${id || '(unknown)'} field summary contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function resolveConfidence(
  record: PostIncidentReviewRecord,
  policy: PostIncidentReviewSummaryProjectionPolicy
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

function resolveMilestoneSpanWeeks(
  record: PostIncidentReviewRecord,
  policy: PostIncidentReviewSummaryProjectionPolicy
): number | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  if (
    redactedFields.has('milestoneTimings') ||
    (policy.redactUnknown === true && unknownFields.includes('milestoneTimings'))
  ) {
    return null
  }

  const timings = record.milestoneTimings
  if (!timings) {
    return null
  }

  const weeks = MILESTONE_WEEK_FIELDS.map((field) => timings[field]).filter(
    (value): value is number => isNonNegativeInteger(value)
  )

  if (weeks.length < 2) {
    return null
  }

  return Math.max(...weeks) - Math.min(...weeks)
}

function resolveProcedureAdherenceScore(
  record: PostIncidentReviewRecord,
  policy: PostIncidentReviewSummaryProjectionPolicy
): number | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  if (
    redactedFields.has('procedureAdherenceScore') ||
    (policy.redactUnknown === true && unknownFields.includes('procedureAdherenceScore'))
  ) {
    return null
  }

  return isValidUnitScore(record.procedureAdherenceScore)
    ? record.procedureAdherenceScore
    : null
}

function resolveRecurrenceObserved(
  record: PostIncidentReviewRecord,
  policy: PostIncidentReviewSummaryProjectionPolicy
): boolean | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  if (
    redactedFields.has('recurrenceObserved') ||
    (policy.redactUnknown === true && unknownFields.includes('recurrenceObserved'))
  ) {
    return null
  }

  return typeof record.recurrenceObserved === 'boolean' ? record.recurrenceObserved : null
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isPostIncidentReviewRoute(value: unknown): value is PostIncidentReviewRoute {
  return typeof value === 'string' && POST_INCIDENT_REVIEW_ROUTE_SET.has(value)
}

export function isPostIncidentClosureOutcome(value: unknown): value is PostIncidentClosureOutcome {
  return typeof value === 'string' && POST_INCIDENT_CLOSURE_OUTCOME_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validatePostIncidentReviewRecord(
  record: PostIncidentReviewRecord
): PostIncidentReviewValidationResult {
  const issues: PostIncidentReviewValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Post-incident review record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Post-incident review record is missing label.',
    })
  }

  if (!isPostIncidentReviewRoute(record.reviewRoute)) {
    pushIssue(issues, {
      code: 'invalid_review_route',
      severity: 'error',
      detail: `Post-incident review record ${id || '(unknown)'} has invalid reviewRoute ${String(record.reviewRoute)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isPostIncidentClosureOutcome(record.closureOutcome)) {
    pushIssue(issues, {
      code: 'invalid_closure_outcome',
      severity: 'error',
      detail: `Post-incident review record ${id || '(unknown)'} has invalid closureOutcome ${String(record.closureOutcome)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.procedureAdherenceScore !== undefined &&
    !isValidUnitScore(record.procedureAdherenceScore)
  ) {
    pushIssue(issues, {
      code: 'invalid_procedure_adherence_score',
      severity: 'error',
      detail: `Post-incident review record ${id || '(unknown)'} procedureAdherenceScore must be between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Post-incident review record ${id || '(unknown)'} confidence must be between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const field of MILESTONE_WEEK_FIELDS) {
    const value = record.milestoneTimings?.[field]
    if (value !== undefined && !isNonNegativeInteger(value)) {
      pushIssue(issues, {
        code: 'invalid_milestone_week',
        severity: 'error',
        detail: `Post-incident review record ${id || '(unknown)'} milestoneTimings.${field} must be a non-negative integer.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  scanForbiddenTokens(issues, id, label, record)

  return freezeValidationResult(issues)
}

/**
 * Projects a legibility-safe review summary for cross-registry linkage.
 * Does not assert hidden dossier truth or automatic lifecycle transitions.
 */
export function projectPostIncidentReviewSummary(
  record: PostIncidentReviewRecord,
  policy: PostIncidentReviewSummaryProjectionPolicy = {}
): PostIncidentReviewSummaryProjection {
  const reviewId = normalizeToken(record.id) || '(unknown)'
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)
  const confidence = resolveConfidence(record, policy)
  const milestoneSpanWeeks = resolveMilestoneSpanWeeks(record, policy)
  const procedureAdherenceScore = resolveProcedureAdherenceScore(record, policy)
  const recurrenceObserved = resolveRecurrenceObserved(record, policy)

  const redacted =
    redactedFields.has('milestoneTimings') ||
    redactedFields.has('procedureAdherenceScore') ||
    redactedFields.has('recurrenceObserved') ||
    redactedFields.has('confidence') ||
    (policy.redactUnknown === true &&
      (unknownFields.includes('milestoneTimings') ||
        unknownFields.includes('procedureAdherenceScore') ||
        unknownFields.includes('recurrenceObserved') ||
        unknownFields.includes('confidence'))) ||
    (confidence === null && record.confidence !== undefined && policy.minimumConfidence !== undefined)

  return Object.freeze({
    reviewId,
    label: normalizeToken(record.label) || '(unknown)',
    reviewRoute: isPostIncidentReviewRoute(record.reviewRoute)
      ? record.reviewRoute
      : 'internal_command',
    closureOutcome: isPostIncidentClosureOutcome(record.closureOutcome)
      ? record.closureOutcome
      : 'contained',
    milestoneSpanWeeks,
    procedureAdherenceScore,
    recurrenceObserved,
    confidence,
    redacted,
    unknownFields,
  })
}

// ---------------------------------------------------------------------------
// Registry map / hydration
// ---------------------------------------------------------------------------

export type PostIncidentReviewRecordsMap = Record<PostIncidentReviewId, PostIncidentReviewRecord>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseMilestoneTimings(value: unknown): PostIncidentMilestoneTimings | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const timings: PostIncidentMilestoneTimings = {}
  let hasValue = false

  for (const field of MILESTONE_WEEK_FIELDS) {
    const week = value[field]
    if (isNonNegativeInteger(week)) {
      timings[field] = week
      hasValue = true
    }
  }

  return hasValue ? timings : undefined
}

function sanitizePostIncidentReviewRecordEntry(value: unknown): PostIncidentReviewRecord | null {
  if (!isRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const label = normalizeToken(value.label)
  const reviewRoute = typeof value.reviewRoute === 'string' ? value.reviewRoute : ''
  const closureOutcome =
    typeof value.closureOutcome === 'string' ? value.closureOutcome : ''
  const milestoneTimings = parseMilestoneTimings(value.milestoneTimings)
  const procedureAdherenceScore = value.procedureAdherenceScore
  const recurrenceObserved = value.recurrenceObserved
  const confidence = value.confidence
  const unknownFields = asStringArray(value.unknownFields)
  const redactedFields = asStringArray(value.redactedFields)
  const summary =
    typeof value.summary === 'string' && value.summary.trim().length > 0
      ? value.summary.trim()
      : undefined

  const record: PostIncidentReviewRecord = {
    id,
    label,
    reviewRoute: reviewRoute as PostIncidentReviewRoute,
    closureOutcome: closureOutcome as PostIncidentClosureOutcome,
    ...(summary ? { summary } : {}),
    ...(milestoneTimings ? { milestoneTimings } : {}),
    ...(isValidUnitScore(procedureAdherenceScore) ? { procedureAdherenceScore } : {}),
    ...(typeof recurrenceObserved === 'boolean' ? { recurrenceObserved } : {}),
    ...(isValidUnitScore(confidence) ? { confidence } : {}),
    ...(unknownFields.length > 0 ? { unknownFields } : {}),
    ...(redactedFields.length > 0 ? { redactedFields } : {}),
  }

  if (!validatePostIncidentReviewRecord(record).valid) {
    return null
  }

  return record
}

/** Hydration: canonical review map keyed by record id; drops invalid and duplicate-id entries. */
export function sanitizePostIncidentReviewRecords(
  value: unknown,
  fallback: PostIncidentReviewRecordsMap = {}
): PostIncidentReviewRecordsMap {
  if (!isRecord(value)) {
    return fallback
  }

  const next: PostIncidentReviewRecordsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizePostIncidentReviewRecordEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}

export function getPostIncidentReviewById(
  registry: PostIncidentReviewRecordsMap | undefined,
  reviewId: string
): PostIncidentReviewRecord | undefined {
  const normalized = normalizeToken(reviewId)
  if (!normalized || !registry) {
    return undefined
  }

  return registry[normalized]
}

function defineRecord(record: PostIncidentReviewRecord): PostIncidentReviewRecord {
  return Object.freeze({ ...record })
}

/** Structured retrospective after seasonal cascade recurrence recovery. */
export const RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE: PostIncidentReviewRecord = defineRecord({
  id: 'review:cycle-3-closeout',
  label: 'Manifestation cascade cycle 3 closeout review',
  summary: 'Structured retrospective after seasonal cascade recurrence recovery.',
  reviewRoute: 'internal_command',
  closureOutcome: 'contained',
  milestoneTimings: {
    discoveryWeek: 38,
    responseWeek: 39,
    containmentWeek: 40,
    recoveryWeek: 41,
    reportingWeek: 42,
  },
  procedureAdherenceScore: 0.71,
  recurrenceObserved: true,
  confidence: 0.74,
})

/** External audit route with administratively cleared outcome. */
export const EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE: PostIncidentReviewRecord = defineRecord({
  id: 'review:external-audit-cleared',
  label: 'External audit cleared near-catastrophe review',
  summary: 'Administratively cleared after external audit despite strategic governance gaps.',
  reviewRoute: 'external_audit',
  closureOutcome: 'administratively_cleared',
  milestoneTimings: {
    discoveryWeek: 10,
    responseWeek: 11,
    containmentWeek: 12,
    reportingWeek: 14,
  },
  procedureAdherenceScore: 0.58,
  recurrenceObserved: false,
  confidence: 0.66,
})

export const POST_INCIDENT_REVIEW_STUB_REGISTRY: PostIncidentReviewRecordsMap = Object.freeze({
  [RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]: RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
  [EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE.id]: EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE,
})
