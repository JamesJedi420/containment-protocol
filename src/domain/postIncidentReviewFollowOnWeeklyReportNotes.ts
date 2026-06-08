/**
 * SPE-868 slice 11: surface weekly post-incident follow-on artifact narratives in report notes.
 *
 * Projects follow-on training-reference and recommendation-stub tokens from orchestration-created
 * review records into deterministic report notes — no PostIncidentReviewRecord schema changes.
 */

import {
  FOLLOW_ON_RECOMMENDATION_STUB_PREFIX,
  FOLLOW_ON_TRAINING_REF_PREFIX,
  isOrchestrationCreatedPostIncidentReviewRecord,
} from './postIncidentReviewFollowOnArtifact'
import type { PostIncidentReviewRecord, PostIncidentReviewRecordsMap } from './postIncidentReviewRegistry'
import type { ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function humanizeFollowOnToken(token: string): string {
  return token.replace(/-/g, ' ')
}

export function extractFollowOnArtifactTokenFromUnknownFields(
  unknownFields: readonly string[] | undefined
): string | undefined {
  return asStringArray(unknownFields).find(
    (field) =>
      field.startsWith(FOLLOW_ON_TRAINING_REF_PREFIX) ||
      field.startsWith(FOLLOW_ON_RECOMMENDATION_STUB_PREFIX)
  )
}

function collectMaterializedFollowOnReviewRefs(input: {
  priorReviews: PostIncidentReviewRecordsMap
  nextReviews: PostIncidentReviewRecordsMap
}): readonly string[] {
  return Object.keys(input.nextReviews)
    .filter((reviewRef) => {
      const nextRecord = input.nextReviews[reviewRef]
      if (!nextRecord || input.priorReviews[reviewRef]) {
        return false
      }

      if (!isOrchestrationCreatedPostIncidentReviewRecord(nextRecord)) {
        return false
      }

      return extractFollowOnArtifactTokenFromUnknownFields(nextRecord.unknownFields) !== undefined
    })
    .sort((left, right) => left.localeCompare(right))
}

function formatFollowOnNoteContent(
  record: PostIncidentReviewRecord,
  followOnToken: string
): string {
  if (followOnToken.startsWith(FOLLOW_ON_TRAINING_REF_PREFIX)) {
    const trainingRef = followOnToken.slice(FOLLOW_ON_TRAINING_REF_PREFIX.length)
    const trainingLabel = trainingRef ? humanizeFollowOnToken(trainingRef) : 'training reference'
    return `Post-incident follow-on — ${record.label}: training reference (${trainingLabel}).`
  }

  const stubSuffix = followOnToken.slice(FOLLOW_ON_RECOMMENDATION_STUB_PREFIX.length)
  const stubLabel = stubSuffix ? humanizeFollowOnToken(stubSuffix) : 'recommendation stub'
  return `Post-incident follow-on — ${record.label}: recommendation stub (${stubLabel}).`
}

/**
 * Builds deterministic weekly report notes for follow-on artifacts on reviews materialized this tick.
 */
export function buildWeeklyPostIncidentReviewFollowOnReportNotes(input: {
  priorReviews: PostIncidentReviewRecordsMap | null | undefined
  nextReviews: PostIncidentReviewRecordsMap | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const priorReviews = input.priorReviews ?? {}
  const nextReviews = input.nextReviews ?? {}
  const materializedRefs = collectMaterializedFollowOnReviewRefs({ priorReviews, nextReviews })

  if (materializedRefs.length === 0) {
    return []
  }

  const notes: ReportNote[] = []
  let sequence = input.sequenceStart

  for (const reviewRef of materializedRefs) {
    const record = nextReviews[reviewRef]
    if (!record) {
      continue
    }

    const followOnToken = extractFollowOnArtifactTokenFromUnknownFields(record.unknownFields)
    if (!followOnToken) {
      continue
    }

    notes.push(
      createDeterministicReportNote(
        formatFollowOnNoteContent(record, followOnToken),
        input.week,
        sequence,
        input.baseTimestamp,
        'system.week_delta',
        {
          reviewRef,
          reviewLabel: record.label,
          followOnKind: followOnToken.startsWith(FOLLOW_ON_TRAINING_REF_PREFIX)
            ? 'training_ref'
            : 'recommendation_stub',
          followOnToken,
          week: input.week,
        }
      )
    )
    sequence += 1
  }

  return notes
}
