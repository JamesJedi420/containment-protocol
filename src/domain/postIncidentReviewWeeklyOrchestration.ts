/**
 * SPE-868 slice 4/7: weekly retrospective creation for persisted post-incident review records.
 *
 * Pure deterministic tick: materialize missing review records when recurrent catastrophe
 * closeout refs qualify, when qualifying cases resolve, or when near-catastrophe thresholds
 * fire. Does not mutate existing hydrated entries or change sanitize/hydration contracts.
 */

import type { AnyOperationEventDraft } from './events'
import { isMajorIncidentCase } from './majorIncidents'
import type { CaseInstance, CaseKind } from './models'
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
const CASE_CLOSEOUT_REVIEW_REF_PATTERN = /^review:case-([a-zA-Z0-9_-]+)-closeout$/
const NEAR_CATASTROPHE_REVIEW_REF_PATTERN = /^review:near-catastrophe-([a-zA-Z0-9_-]+)$/

export type QualifyingIncidentReviewTrigger = 'case_resolved' | 'near_catastrophe_threshold'

export interface QualifyingIncidentReviewDraft {
  readonly reviewRef: string
  readonly caseId: string
  readonly caseTitle: string
  readonly trigger: QualifyingIncidentReviewTrigger
  readonly stage: number
  readonly kind: CaseKind
  readonly anchorWeek: number
}

type NearCatastropheQualifyingSnapshot = Pick<CaseInstance, 'kind' | 'stage' | 'deadlineRemaining'>

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

function buildCaseCloseoutMilestoneTimings(anchorWeek: number) {
  const week = normalizeWeek(anchorWeek)

  return {
    discoveryWeek: Math.max(0, week - 3),
    responseWeek: Math.max(0, week - 2),
    containmentWeek: Math.max(0, week - 1),
    reportingWeek: week,
  }
}

function buildNearCatastropheMilestoneTimings(anchorWeek: number) {
  const week = normalizeWeek(anchorWeek)

  return {
    discoveryWeek: Math.max(0, week - 2),
    responseWeek: Math.max(0, week - 1),
    reportingWeek: week,
  }
}

function isNearCatastropheQualifyingSnapshot(snapshot: NearCatastropheQualifyingSnapshot): boolean {
  return isMajorIncidentCase(snapshot as CaseInstance)
}

function qualifyingCaseCloseoutReviewRef(caseId: string): string {
  return `review:case-${normalizeToken(caseId)}-closeout`
}

function nearCatastropheReviewRef(caseId: string): string {
  return `review:near-catastrophe-${normalizeToken(caseId)}`
}

function pushQualifyingIncidentDraft(
  drafts: QualifyingIncidentReviewDraft[],
  seenRefs: Set<string>,
  draft: QualifyingIncidentReviewDraft
) {
  const normalizedRef = normalizeToken(draft.reviewRef)
  if (!normalizedRef || seenRefs.has(normalizedRef) || containsForbiddenToken(normalizedRef)) {
    return
  }

  seenRefs.add(normalizedRef)
  drafts.push(draft)
}

/**
 * Derives qualifying-incident review drafts from weekly case resolution and escalation events.
 * Resolved qualifying cases take precedence over near-catastrophe threshold drafts for the same caseId.
 */
export function resolveQualifyingIncidentReviewDraftsFromEventDrafts(
  eventDrafts: readonly AnyOperationEventDraft[],
  priorCasesById: Record<string, CaseInstance>,
  week: number
): readonly QualifyingIncidentReviewDraft[] {
  const normalizedWeek = normalizeWeek(week)
  const drafts: QualifyingIncidentReviewDraft[] = []
  const seenRefs = new Set<string>()
  const resolvedQualifyingCaseIds = new Set<string>()

  for (const eventDraft of eventDrafts) {
    if (eventDraft.type !== 'case.resolved') {
      continue
    }

    const { caseId, caseTitle, kind, stage } = eventDraft.payload
    const normalizedCaseId = normalizeToken(caseId)
    if (!normalizedCaseId) {
      continue
    }

    const priorCase = priorCasesById[normalizedCaseId]
    const snapshot: NearCatastropheQualifyingSnapshot = {
      kind,
      stage,
      deadlineRemaining: priorCase?.deadlineRemaining ?? 0,
    }

    if (!isNearCatastropheQualifyingSnapshot(snapshot)) {
      continue
    }

    resolvedQualifyingCaseIds.add(normalizedCaseId)
    pushQualifyingIncidentDraft(drafts, seenRefs, {
      reviewRef: qualifyingCaseCloseoutReviewRef(normalizedCaseId),
      caseId: normalizedCaseId,
      caseTitle: normalizeToken(caseTitle) || normalizedCaseId,
      trigger: 'case_resolved',
      stage,
      kind,
      anchorWeek: normalizedWeek,
    })
  }

  for (const eventDraft of eventDrafts) {
    if (eventDraft.type === 'case.escalated') {
      const { caseId, caseTitle, fromStage, toStage, deadlineRemaining, convertedToRaid } =
        eventDraft.payload
      const normalizedCaseId = normalizeToken(caseId)
      if (!normalizedCaseId || resolvedQualifyingCaseIds.has(normalizedCaseId)) {
        continue
      }

      const priorCase = priorCasesById[normalizedCaseId]
      const baseKind = priorCase?.kind ?? 'standard'
      const beforeSnapshot: NearCatastropheQualifyingSnapshot = {
        kind: baseKind,
        stage: fromStage,
        deadlineRemaining: priorCase?.deadlineRemaining ?? 0,
      }
      const afterSnapshot: NearCatastropheQualifyingSnapshot = {
        kind: convertedToRaid ? 'raid' : baseKind,
        stage: toStage,
        deadlineRemaining,
      }

      if (
        !isNearCatastropheQualifyingSnapshot(afterSnapshot) ||
        isNearCatastropheQualifyingSnapshot(beforeSnapshot)
      ) {
        continue
      }

      pushQualifyingIncidentDraft(drafts, seenRefs, {
        reviewRef: nearCatastropheReviewRef(normalizedCaseId),
        caseId: normalizedCaseId,
        caseTitle: normalizeToken(caseTitle) || normalizedCaseId,
        trigger: 'near_catastrophe_threshold',
        stage: toStage,
        kind: afterSnapshot.kind,
        anchorWeek: normalizedWeek,
      })
      continue
    }

    if (eventDraft.type === 'case.raid_converted') {
      const { caseId, caseTitle, stage } = eventDraft.payload
      const normalizedCaseId = normalizeToken(caseId)
      if (!normalizedCaseId || resolvedQualifyingCaseIds.has(normalizedCaseId)) {
        continue
      }

      const priorCase = priorCasesById[normalizedCaseId]
      if (priorCase?.kind === 'raid') {
        continue
      }

      pushQualifyingIncidentDraft(drafts, seenRefs, {
        reviewRef: nearCatastropheReviewRef(normalizedCaseId),
        caseId: normalizedCaseId,
        caseTitle: normalizeToken(caseTitle) || normalizedCaseId,
        trigger: 'near_catastrophe_threshold',
        stage,
        kind: 'raid',
        anchorWeek: normalizedWeek,
      })
    }
  }

  return Object.freeze(
    drafts.sort((left, right) => left.reviewRef.localeCompare(right.reviewRef))
  )
}

/**
 * Builds one deterministic retrospective record for a qualifying incident draft.
 * Returns undefined when the candidate fails validation.
 */
export function buildQualifyingIncidentReviewRecordForDraft(
  draft: QualifyingIncidentReviewDraft,
  week: number
): PostIncidentReviewRecord | undefined {
  const normalizedRef = normalizeToken(draft.reviewRef)
  const normalizedWeek = normalizeWeek(week)
  const anchorWeek = normalizeWeek(draft.anchorWeek)

  if (!normalizedRef || containsForbiddenToken(normalizedRef)) {
    return undefined
  }

  const isCaseCloseout = CASE_CLOSEOUT_REVIEW_REF_PATTERN.test(normalizedRef)
  const isNearCatastrophe = NEAR_CATASTROPHE_REVIEW_REF_PATTERN.test(normalizedRef)

  if (!isCaseCloseout && !isNearCatastrophe) {
    return undefined
  }

  const candidate: PostIncidentReviewRecord =
    draft.trigger === 'case_resolved' && isCaseCloseout
      ? {
          id: normalizedRef,
          label: `Qualifying incident closeout review — ${draft.caseTitle}`,
          summary: 'Structured retrospective after qualifying incident resolution.',
          reviewRoute: 'internal_command',
          closureOutcome: 'contained',
          milestoneTimings: buildCaseCloseoutMilestoneTimings(anchorWeek),
          procedureAdherenceScore: 0.68,
          recurrenceObserved: false,
          confidence: 0.72,
          unknownFields: [orchestrationWeekToken(normalizedWeek)],
        }
      : {
          id: normalizedRef,
          label: `Near-catastrophe threshold review — ${draft.caseTitle}`,
          summary: 'Structured retrospective triggered by near-catastrophe escalation threshold.',
          reviewRoute: 'external_audit',
          closureOutcome: 'administratively_cleared',
          milestoneTimings: buildNearCatastropheMilestoneTimings(anchorWeek),
          procedureAdherenceScore: 0.55,
          recurrenceObserved: false,
          confidence: 0.61,
          unknownFields: [orchestrationWeekToken(normalizedWeek)],
        }

  if (!validatePostIncidentReviewRecord(candidate).valid) {
    return undefined
  }

  return freezeRecord(candidate)
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
 * Empty catastrophe map and no qualifying incident drafts is a no-op.
 * Re-applying after creation is idempotent for the same week.
 */
export function applyWeeklyPostIncidentReviewCreationTick(
  reviews: PostIncidentReviewRecordsMap | null | undefined,
  catastrophes: RecurrentCatastropheRecordsMap | null | undefined,
  week: number,
  qualifyingIncidentDrafts: readonly QualifyingIncidentReviewDraft[] = Object.freeze([])
): PostIncidentReviewRecordsMap {
  const safeReviews = reviews ?? {}
  const safeCatastrophes = catastrophes ?? {}
  const catastropheIds = Object.keys(safeCatastrophes)

  if (catastropheIds.length === 0 && qualifyingIncidentDrafts.length === 0) {
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

  for (const draft of qualifyingIncidentDrafts) {
    const reviewRef = normalizeToken(draft.reviewRef)
    if (!reviewRef || next[reviewRef]) {
      continue
    }

    const created = buildQualifyingIncidentReviewRecordForDraft(draft, normalizedWeek)
    if (!created) {
      continue
    }

    next[reviewRef] = created
    changed = true
  }

  return changed ? next : safeReviews
}
