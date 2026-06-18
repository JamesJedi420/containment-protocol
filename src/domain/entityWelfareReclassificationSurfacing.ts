/**
 * SPE-2490 slice 5: read-only surfacing for entity welfare reclassification weekly transitions.
 *
 * Compares pre-tick vs post-tick persisted records and formats transition summaries
 * for weekly report notes — safe labels only; no hidden truth beyond registry fields.
 */

import type {
  EntityWelfareReclassificationRecord,
  EntityWelfareReclassificationRecordsMap,
  ReclassificationState,
  ReviewGate,
} from './entityWelfareReclassificationRegistry'

export type EntityWelfareReclassificationWeeklyTransitionKind =
  | 'reclassification_state_changed'
  | 'review_gate_changed'

export interface EntityWelfareReclassificationWeeklyTransitionSummary {
  readonly recordId: string
  readonly label: string
  readonly transitionKinds: readonly EntityWelfareReclassificationWeeklyTransitionKind[]
  readonly priorReclassificationState: ReclassificationState
  readonly nextReclassificationState: ReclassificationState
  readonly priorReviewGate: ReviewGate | undefined
  readonly nextReviewGate: ReviewGate | undefined
  readonly structuredReasons: readonly string[]
}

function formatEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function resolveReviewGate(record: EntityWelfareReclassificationRecord): ReviewGate | undefined {
  return record.reviewGate
}

function composeWeeklyTransitionSummary(input: {
  priorRecord: EntityWelfareReclassificationRecord
  nextRecord: EntityWelfareReclassificationRecord
}): EntityWelfareReclassificationWeeklyTransitionSummary | undefined {
  const transitionKinds: EntityWelfareReclassificationWeeklyTransitionKind[] = []
  const structuredReasons: string[] = []

  const priorState = input.priorRecord.reclassificationState
  const nextState = input.nextRecord.reclassificationState
  if (priorState !== nextState) {
    transitionKinds.push('reclassification_state_changed')
    structuredReasons.push(`state:${priorState}->${nextState}`)
  }

  const priorReviewGate = resolveReviewGate(input.priorRecord)
  const nextReviewGate = resolveReviewGate(input.nextRecord)
  if (priorReviewGate !== nextReviewGate) {
    transitionKinds.push('review_gate_changed')
    structuredReasons.push(`reviewGate:${priorReviewGate ?? 'none'}->${nextReviewGate ?? 'none'}`)
  }

  if (transitionKinds.length === 0) {
    return undefined
  }

  return Object.freeze({
    recordId: input.nextRecord.id,
    label: input.nextRecord.label,
    transitionKinds: Object.freeze(
      [...transitionKinds].sort((left, right) => left.localeCompare(right))
    ),
    priorReclassificationState: priorState,
    nextReclassificationState: nextState,
    priorReviewGate,
    nextReviewGate,
    structuredReasons: Object.freeze(structuredReasons),
  })
}

/**
 * Builds transition summaries for records that changed during the weekly tick.
 */
export function composeEntityWelfareReclassificationWeeklyTransitionSummaries(input: {
  priorRecords: EntityWelfareReclassificationRecordsMap | null | undefined
  nextRecords: EntityWelfareReclassificationRecordsMap | null | undefined
}): readonly EntityWelfareReclassificationWeeklyTransitionSummary[] {
  const priorRecords = input.priorRecords ?? {}
  const nextRecords = input.nextRecords ?? {}
  const recordIds = Object.keys(nextRecords).sort((left, right) => left.localeCompare(right))

  if (recordIds.length === 0) {
    return []
  }

  const summaries: EntityWelfareReclassificationWeeklyTransitionSummary[] = []

  for (const recordId of recordIds) {
    const nextRecord = nextRecords[recordId]
    const priorRecord = priorRecords[recordId]
    if (!nextRecord || !priorRecord) {
      continue
    }

    const summary = composeWeeklyTransitionSummary({ priorRecord, nextRecord })
    if (summary) {
      summaries.push(summary)
    }
  }

  return Object.freeze(summaries)
}

export function formatEntityWelfareReclassificationWeeklyTransitionKindLabel(
  kind: EntityWelfareReclassificationWeeklyTransitionKind
): string {
  switch (kind) {
    case 'reclassification_state_changed':
      return 'Reclassification state changed'
    case 'review_gate_changed':
      return 'Review gate changed'
  }
}

function formatReviewGateLabel(reviewGate: ReviewGate | undefined): string {
  return reviewGate ? formatEnumLabel(reviewGate) : 'None'
}

export function formatEntityWelfareReclassificationWeeklyTransitionNoteContent(
  summary: EntityWelfareReclassificationWeeklyTransitionSummary
): string {
  const kindLabels = summary.transitionKinds.map((kind) =>
    formatEntityWelfareReclassificationWeeklyTransitionKindLabel(kind)
  )

  return `Entity welfare reclassification weekly transition — ${summary.label}: ${kindLabels.join('; ')}. State ${formatEnumLabel(summary.priorReclassificationState)} → ${formatEnumLabel(summary.nextReclassificationState)}; review gate ${formatReviewGateLabel(summary.priorReviewGate)} → ${formatReviewGateLabel(summary.nextReviewGate)}.`
}
