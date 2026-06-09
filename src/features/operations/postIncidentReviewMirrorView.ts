import type { GameState } from '../../domain/models'
import {
  derivePostIncidentCloseoutRewardBranch,
  type PostIncidentCloseoutRewardBranch,
} from '../../domain/postIncidentReviewCloseoutRewardBranch'
import {
  POST_INCIDENT_REVIEW_STUB_REGISTRY,
  projectPostIncidentReviewSummary,
  type PostIncidentReviewRecord,
} from '../../domain/postIncidentReviewRegistry'

const CASE_CLOSEOUT_REVIEW_REF_PATTERN = /^review:case-([a-zA-Z0-9_-]+)-closeout$/
const NEAR_CATASTROPHE_REVIEW_REF_PATTERN = /^review:near-catastrophe-([a-zA-Z0-9_-]+)$/
const CYCLE_CLOSEOUT_REVIEW_REF_PATTERN = /^review:cycle-(\d+)-closeout$/
const ORCHESTRATION_WEEK_TOKEN_PREFIX = 'orchestration_week:'

export type PostIncidentReviewMirrorRecordSourceGroup =
  | 'qualifying_case_closeout'
  | 'qualifying_near_catastrophe'
  | 'recurrence_cycle_orchestration'
  | 'stub_fixture'
  | 'other_persisted'

export interface PostIncidentReviewMirrorRecordView {
  id: string
  label: string
  summaryLabel: string
  sourceGroup: PostIncidentReviewMirrorRecordSourceGroup
  sourceLabel: string
  linkedCaseIdLabel: string
  orchestrationWeekLabel: string
  reviewRouteLabel: string
  closureOutcomeLabel: string
  milestoneSpanWeeksLabel: string
  discoveryWeekLabel: string
  responseWeekLabel: string
  containmentWeekLabel: string
  recoveryWeekLabel: string
  reportingWeekLabel: string
  procedureAdherenceScoreLabel: string
  recurrenceObservedLabel: string
  closeoutRewardBranchLabel: string
  confidenceLabel: string
  unknownFieldLabels: readonly string[]
  redacted: boolean
}

export interface PostIncidentReviewMirrorSummaryView {
  totalRecords: number
  externalAuditRouteCount: number
  recurrenceObservedCount: number
  qualifyingCaseCloseoutCount: number
  qualifyingNearCatastropheCount: number
  orchestrationCreatedCount: number
  stubFixtureCount: number
  week: number
}

export interface PostIncidentReviewMirrorView {
  isEmpty: boolean
  hasQualifyingIncidentRecords: boolean
  summary: PostIncidentReviewMirrorSummaryView
  qualifyingIncidentRecords: readonly PostIncidentReviewMirrorRecordView[]
  records: readonly PostIncidentReviewMirrorRecordView[]
}

export function formatPostIncidentReviewEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

export function formatOptionalPostIncidentReviewEnumLabel(value: string | null): string {
  if (value === null) {
    return '—'
  }

  return formatPostIncidentReviewEnumLabel(value)
}

function listPersistedRecords(game: GameState): PostIncidentReviewRecord[] {
  const map = game.postIncidentReviewRecords ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function extractOrchestrationWeek(record: PostIncidentReviewRecord): number | undefined {
  for (const field of record.unknownFields ?? []) {
    if (!field.startsWith(ORCHESTRATION_WEEK_TOKEN_PREFIX)) {
      continue
    }

    const week = Number.parseInt(field.slice(ORCHESTRATION_WEEK_TOKEN_PREFIX.length), 10)
    if (Number.isFinite(week) && week >= 1 && week === Math.trunc(week)) {
      return week
    }
  }

  return undefined
}

function isOrchestrationCreated(record: PostIncidentReviewRecord): boolean {
  return extractOrchestrationWeek(record) !== undefined
}

function extractLinkedCaseId(recordId: string): string {
  const caseCloseoutMatch = CASE_CLOSEOUT_REVIEW_REF_PATTERN.exec(recordId)
  if (caseCloseoutMatch?.[1]) {
    return caseCloseoutMatch[1]
  }

  const nearCatastropheMatch = NEAR_CATASTROPHE_REVIEW_REF_PATTERN.exec(recordId)
  if (nearCatastropheMatch?.[1]) {
    return nearCatastropheMatch[1]
  }

  return ''
}

function classifySourceGroup(record: PostIncidentReviewRecord): PostIncidentReviewMirrorRecordSourceGroup {
  if (CASE_CLOSEOUT_REVIEW_REF_PATTERN.test(record.id)) {
    return isOrchestrationCreated(record) ? 'qualifying_case_closeout' : 'other_persisted'
  }

  if (NEAR_CATASTROPHE_REVIEW_REF_PATTERN.test(record.id)) {
    return isOrchestrationCreated(record) ? 'qualifying_near_catastrophe' : 'other_persisted'
  }

  if (CYCLE_CLOSEOUT_REVIEW_REF_PATTERN.test(record.id) && isOrchestrationCreated(record)) {
    return 'recurrence_cycle_orchestration'
  }

  if (POST_INCIDENT_REVIEW_STUB_REGISTRY[record.id] && !isOrchestrationCreated(record)) {
    return 'stub_fixture'
  }

  return 'other_persisted'
}

function sourceGroupLabel(group: PostIncidentReviewMirrorRecordSourceGroup): string {
  switch (group) {
    case 'qualifying_case_closeout':
      return 'Qualifying case closeout'
    case 'qualifying_near_catastrophe':
      return 'Near-catastrophe threshold'
    case 'recurrence_cycle_orchestration':
      return 'Recurrence cycle closeout'
    case 'stub_fixture':
      return 'Stub fixture'
    case 'other_persisted':
      return 'Other persisted'
  }
}

function isQualifyingIncidentSourceGroup(
  group: PostIncidentReviewMirrorRecordSourceGroup
): boolean {
  return group === 'qualifying_case_closeout' || group === 'qualifying_near_catastrophe'
}

function formatConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value.toFixed(2)
}

function formatUnitScore(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value.toFixed(2)
}

function formatMilestoneSpanWeeks(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return String(value)
}

function formatWeek(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return `W${value}`
}

function formatRecurrenceObserved(value: boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value ? 'Yes' : 'No'
}

export function formatCloseoutRewardBranchLabel(
  branch: PostIncidentCloseoutRewardBranch | undefined
): string {
  if (!branch) {
    return '—'
  }

  return formatPostIncidentReviewEnumLabel(branch)
}

function formatMilestoneWeek(
  record: PostIncidentReviewRecord,
  field: keyof NonNullable<PostIncidentReviewRecord['milestoneTimings']>,
  milestoneTimingsRedacted: boolean
): string {
  if (milestoneTimingsRedacted) {
    return '—'
  }

  return formatWeek(record.milestoneTimings?.[field])
}

function toRecordView(record: PostIncidentReviewRecord): PostIncidentReviewMirrorRecordView {
  const projection = projectPostIncidentReviewSummary(record)
  const milestoneTimingsRedacted = (record.redactedFields ?? []).includes('milestoneTimings')
  const sourceGroup = classifySourceGroup(record)
  const orchestrationWeek = extractOrchestrationWeek(record)
  const linkedCaseId = extractLinkedCaseId(record.id)

  const summaryLabel = record.summary?.trim() ? record.summary : '—'

  return Object.freeze({
    id: record.id,
    label: record.label,
    summaryLabel,
    sourceGroup,
    sourceLabel: sourceGroupLabel(sourceGroup),
    linkedCaseIdLabel: linkedCaseId || '—',
    orchestrationWeekLabel: orchestrationWeek === undefined ? '—' : `W${orchestrationWeek}`,
    reviewRouteLabel: formatOptionalPostIncidentReviewEnumLabel(projection.reviewRoute),
    closureOutcomeLabel: formatOptionalPostIncidentReviewEnumLabel(projection.closureOutcome),
    milestoneSpanWeeksLabel: formatMilestoneSpanWeeks(projection.milestoneSpanWeeks),
    discoveryWeekLabel: formatMilestoneWeek(record, 'discoveryWeek', milestoneTimingsRedacted),
    responseWeekLabel: formatMilestoneWeek(record, 'responseWeek', milestoneTimingsRedacted),
    containmentWeekLabel: formatMilestoneWeek(record, 'containmentWeek', milestoneTimingsRedacted),
    recoveryWeekLabel: formatMilestoneWeek(record, 'recoveryWeek', milestoneTimingsRedacted),
    reportingWeekLabel: formatMilestoneWeek(record, 'reportingWeek', milestoneTimingsRedacted),
    procedureAdherenceScoreLabel: formatUnitScore(projection.procedureAdherenceScore),
    recurrenceObservedLabel: formatRecurrenceObserved(projection.recurrenceObserved),
    closeoutRewardBranchLabel: formatCloseoutRewardBranchLabel(
      derivePostIncidentCloseoutRewardBranch(record)
    ),
    confidenceLabel: formatConfidence(projection.confidence),
    unknownFieldLabels: Object.freeze([...projection.unknownFields]),
    redacted: projection.redacted,
  })
}

/** Read-only mirror over hydrated `postIncidentReviewRecords`; does not re-validate dropped entries. */
export function getPostIncidentReviewMirrorView(game: GameState): PostIncidentReviewMirrorView {
  const records = listPersistedRecords(game)
  const week = game.week

  let externalAuditRouteCount = 0
  let recurrenceObservedCount = 0
  let qualifyingCaseCloseoutCount = 0
  let qualifyingNearCatastropheCount = 0
  let orchestrationCreatedCount = 0
  let stubFixtureCount = 0

  const recordViews = records.map((record) => {
    const projection = projectPostIncidentReviewSummary(record)
    const recordView = toRecordView(record)

    if (projection.reviewRoute === 'external_audit') {
      externalAuditRouteCount += 1
    }

    if (projection.recurrenceObserved === true) {
      recurrenceObservedCount += 1
    }

    if (recordView.sourceGroup === 'qualifying_case_closeout') {
      qualifyingCaseCloseoutCount += 1
    }

    if (recordView.sourceGroup === 'qualifying_near_catastrophe') {
      qualifyingNearCatastropheCount += 1
    }

    if (isOrchestrationCreated(record)) {
      orchestrationCreatedCount += 1
    }

    if (recordView.sourceGroup === 'stub_fixture') {
      stubFixtureCount += 1
    }

    return recordView
  })

  const qualifyingIncidentRecords = Object.freeze(
    recordViews.filter((record) => isQualifyingIncidentSourceGroup(record.sourceGroup))
  )

  return Object.freeze({
    isEmpty: records.length === 0,
    hasQualifyingIncidentRecords: qualifyingIncidentRecords.length > 0,
    summary: Object.freeze({
      totalRecords: records.length,
      externalAuditRouteCount,
      recurrenceObservedCount,
      qualifyingCaseCloseoutCount,
      qualifyingNearCatastropheCount,
      orchestrationCreatedCount,
      stubFixtureCount,
      week,
    }),
    qualifyingIncidentRecords,
    records: Object.freeze(recordViews),
  })
}
