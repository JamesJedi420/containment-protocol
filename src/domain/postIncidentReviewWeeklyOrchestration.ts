/**
 * SPE-868 slice 4: weekly retrospective creation for persisted post-incident review records.
 *
 * Pure deterministic tick: when a recurrent catastrophe record anchors recurrence on the
 * simulation week, materialize missing postIncidentReviewRefs into the review registry map.
 * Does not mutate existing hydrated entries or change sanitize/hydration contracts.
 */

import {
  validateRecurrentCatastropheRecord,
  type RecurrentCatastropheRecord,
  type RecurrentCatastropheRecordsMap,
} from './recurrentCatastropheAmeliorationRegistry'
import {
  BRANDED_OBJECT_NUMBER_PATTERN,
  FRANCHISE_TOKEN_PATTERN,
  validatePostIncidentReviewRecord,
  type PostIncidentReviewRecord,
  type PostIncidentReviewRecordsMap,
} from './postIncidentReviewRegistry'

const ORCHESTRATION_WEEK_TOKEN_PREFIX = 'orchestration_week:'
const CYCLE_CLOSEOUT_REVIEW_REF_PATTERN = /^review:cycle-(\d+)-closeout$/

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function orchestrationWeekToken(week: number): string {
  return `${ORCHESTRATION_WEEK_TOKEN_PREFIX}${normalizeWeek(week)}`
}

function containsForbiddenToken(value: string): boolean {
  const token = normalizeToken(value)
  return (
    token.length > 0 &&
    (FRANCHISE_TOKEN_PATTERN.test(token) || BRANDED_OBJECT_NUMBER_PATTERN.test(token))
  )
}

function freezeRecord(record: PostIncidentReviewRecord): PostIncidentReviewRecord {
  return Object.freeze({ ...record })
}

function parseCycleCloseoutNumber(reviewRef: string): number | undefined {
  const match = CYCLE_CLOSEOUT_REVIEW_REF_PATTERN.exec(reviewRef)
  if (!match) {
    return undefined
  }

  const cycleNumber = Number.parseInt(match[1] ?? '', 10)
  if (!Number.isFinite(cycleNumber) || cycleNumber < 1 || cycleNumber !== Math.trunc(cycleNumber)) {
    return undefined
  }

  return cycleNumber
}

function buildCycleCloseoutMilestoneTimings(anchorWeek: number) {
  const week = normalizeWeek(anchorWeek)

  return {
    discoveryWeek: Math.max(0, week - 4),
    responseWeek: Math.max(0, week - 3),
    containmentWeek: Math.max(0, week - 2),
    recoveryWeek: Math.max(0, week - 1),
    reportingWeek: week,
  }
}

/** Whether a catastrophe record anchors recurrence on the simulation week. */
export function isRecurrentCatastropheAnchoredThisWeek(
  record: RecurrentCatastropheRecord,
  week: number
): boolean {
  const normalizedWeek = normalizeWeek(week)
  const lastOccurrenceWeek = record.lastOccurrenceWeek

  return (
    validateRecurrentCatastropheRecord(record).valid &&
    typeof lastOccurrenceWeek === 'number' &&
    Number.isFinite(lastOccurrenceWeek) &&
    lastOccurrenceWeek >= 0 &&
    lastOccurrenceWeek === Math.trunc(lastOccurrenceWeek) &&
    lastOccurrenceWeek === normalizedWeek &&
    record.recurrenceCount > 0
  )
}

/** Review refs that qualify for retrospective creation on the simulation week. */
export function resolveQualifyingPostIncidentReviewRefs(
  record: RecurrentCatastropheRecord,
  reviews: PostIncidentReviewRecordsMap,
  week: number
): readonly string[] {
  if (!isRecurrentCatastropheAnchoredThisWeek(record, week)) {
    return Object.freeze([])
  }

  const refs: string[] = []
  const seenRefs = new Set<string>()

  for (const ref of asStringArray(record.postIncidentReviewRefs)) {
    const normalizedRef = normalizeToken(ref)
    if (!normalizedRef || seenRefs.has(normalizedRef) || containsForbiddenToken(normalizedRef)) {
      continue
    }

    seenRefs.add(normalizedRef)

    if (reviews[normalizedRef]) {
      continue
    }

    const cycleNumber = parseCycleCloseoutNumber(normalizedRef)
    if (cycleNumber !== undefined && cycleNumber !== record.recurrenceCount) {
      continue
    }

    refs.push(normalizedRef)
  }

  return Object.freeze(refs.sort((left, right) => left.localeCompare(right)))
}

/**
 * Builds one deterministic retrospective record for a qualifying review ref.
 * Returns undefined when the candidate fails validation.
 */
export function buildPostIncidentReviewRecordForRef(
  reviewRef: string,
  record: RecurrentCatastropheRecord,
  week: number
): PostIncidentReviewRecord | undefined {
  const normalizedRef = normalizeToken(reviewRef)
  const normalizedWeek = normalizeWeek(week)

  if (!normalizedRef || containsForbiddenToken(normalizedRef)) {
    return undefined
  }

  const cycleNumber = parseCycleCloseoutNumber(normalizedRef)
  const anchorWeek = record.lastOccurrenceWeek ?? normalizedWeek

  const candidate: PostIncidentReviewRecord =
    cycleNumber !== undefined
      ? {
          id: normalizedRef,
          label: `Manifestation cascade cycle ${cycleNumber} closeout review`,
          summary: 'Structured retrospective after seasonal cascade recurrence recovery.',
          reviewRoute: 'internal_command',
          closureOutcome: 'contained',
          milestoneTimings: buildCycleCloseoutMilestoneTimings(anchorWeek),
          procedureAdherenceScore: 0.71,
          recurrenceObserved: true,
          confidence: 0.74,
          unknownFields: [orchestrationWeekToken(normalizedWeek)],
        }
      : {
          id: normalizedRef,
          label: 'Pending post-incident closeout review',
          summary: 'Structured retrospective pending formal milestone capture.',
          reviewRoute: 'internal_command',
          closureOutcome: 'contained',
          milestoneTimings: { reportingWeek: anchorWeek },
          procedureAdherenceScore: 0.5,
          recurrenceObserved: true,
          confidence: 0.5,
          unknownFields: [orchestrationWeekToken(normalizedWeek)],
        }

  if (!validatePostIncidentReviewRecord(candidate).valid) {
    return undefined
  }

  return freezeRecord(candidate)
}

/**
 * Applies one weekly retrospective-creation pass over persisted review records.
 * Empty catastrophe map is a no-op. Re-applying after creation is idempotent for the same week.
 */
export function applyWeeklyPostIncidentReviewCreationTick(
  reviews: PostIncidentReviewRecordsMap | null | undefined,
  catastrophes: RecurrentCatastropheRecordsMap | null | undefined,
  week: number
): PostIncidentReviewRecordsMap {
  const safeReviews = reviews ?? {}
  const safeCatastrophes = catastrophes ?? {}
  const catastropheIds = Object.keys(safeCatastrophes)

  if (catastropheIds.length === 0) {
    return safeReviews
  }

  const normalizedWeek = normalizeWeek(week)
  const next: PostIncidentReviewRecordsMap = { ...safeReviews }
  let changed = false

  for (const catastropheId of catastropheIds.sort((left, right) => left.localeCompare(right))) {
    const catastrophe = safeCatastrophes[catastropheId]
    if (!catastrophe) {
      continue
    }

    const qualifyingRefs = resolveQualifyingPostIncidentReviewRefs(
      catastrophe,
      next,
      normalizedWeek
    )

    for (const reviewRef of qualifyingRefs) {
      if (next[reviewRef]) {
        continue
      }

      const created = buildPostIncidentReviewRecordForRef(reviewRef, catastrophe, normalizedWeek)
      if (!created) {
        continue
      }

      next[reviewRef] = created
      changed = true
    }
  }

  return changed ? next : safeReviews
}
