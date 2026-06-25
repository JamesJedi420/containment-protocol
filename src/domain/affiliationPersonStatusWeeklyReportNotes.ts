/**
 * SPE-2520: weekly report notes for durable affiliation person-status progression.
 */

import type {
  AffiliationPersonStatusRecord,
  AffiliationPersonStatusRecordsMap,
} from './affiliationPersonStatusRecords'
import type { ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'

export type AffiliationPersonStatusWeeklyProgressionTransitionKind =
  | 'onboarding_evidence_changed'
  | 'site_access_evidence_changed'
  | 'facility_access_evidence_changed'
  | 'review_evidence_changed'

export interface AffiliationPersonStatusWeeklyProgressionSummary {
  readonly recordId: string
  readonly subjectLabel: string
  readonly transitionKinds: readonly AffiliationPersonStatusWeeklyProgressionTransitionKind[]
  readonly structuredReasons: readonly string[]
}

const ONBOARDING_FIELDS = [
  'backgroundCleared',
  'trainingCompleted',
  'oathContractSigned',
] as const satisfies readonly (keyof AffiliationPersonStatusRecord)[]

const SITE_ACCESS_FIELDS = [
  'grantedSiteIds',
  'restrictedSiteIds',
  'blockedSiteIds',
] as const satisfies readonly (keyof AffiliationPersonStatusRecord)[]

const FACILITY_ACCESS_FIELDS = [
  'grantedFacilityIds',
  'restrictedFacilityIds',
  'blockedFacilityIds',
] as const satisfies readonly (keyof AffiliationPersonStatusRecord)[]

const REVIEW_EVIDENCE_FIELDS = [
  'protectedReviewEvidenceRefs',
  'revocationReviewEvidenceRefs',
] as const satisfies readonly (keyof AffiliationPersonStatusRecord)[]

function arraysEqual(left: readonly string[] | undefined, right: readonly string[] | undefined) {
  const leftValues = left ?? []
  const rightValues = right ?? []
  return (
    leftValues.length === rightValues.length &&
    leftValues.every((value, index) => value === rightValues[index])
  )
}

function fieldChanged(
  priorRecord: AffiliationPersonStatusRecord,
  nextRecord: AffiliationPersonStatusRecord,
  field: keyof AffiliationPersonStatusRecord
) {
  const priorValue = priorRecord[field]
  const nextValue = nextRecord[field]
  if (Array.isArray(priorValue) || Array.isArray(nextValue)) {
    return (
      arraysEqual(
        priorValue as readonly string[] | undefined,
        nextValue as readonly string[] | undefined
      ) === false
    )
  }

  return priorValue !== nextValue
}

function changedFields(
  priorRecord: AffiliationPersonStatusRecord,
  nextRecord: AffiliationPersonStatusRecord,
  fields: readonly (keyof AffiliationPersonStatusRecord)[]
) {
  return fields.filter((field) => fieldChanged(priorRecord, nextRecord, field))
}

function composeWeeklyProgressionSummary(input: {
  priorRecord: AffiliationPersonStatusRecord
  nextRecord: AffiliationPersonStatusRecord
}): AffiliationPersonStatusWeeklyProgressionSummary | undefined {
  const transitionKinds: AffiliationPersonStatusWeeklyProgressionTransitionKind[] = []
  const structuredReasons: string[] = []

  const onboardingChanges = changedFields(input.priorRecord, input.nextRecord, ONBOARDING_FIELDS)
  if (onboardingChanges.length > 0) {
    transitionKinds.push('onboarding_evidence_changed')
    structuredReasons.push(`onboarding:${onboardingChanges.join(',')}`)
  }

  const siteAccessChanges = changedFields(input.priorRecord, input.nextRecord, SITE_ACCESS_FIELDS)
  if (siteAccessChanges.length > 0) {
    transitionKinds.push('site_access_evidence_changed')
    structuredReasons.push(`siteAccess:${siteAccessChanges.join(',')}`)
  }

  const facilityAccessChanges = changedFields(
    input.priorRecord,
    input.nextRecord,
    FACILITY_ACCESS_FIELDS
  )
  if (facilityAccessChanges.length > 0) {
    transitionKinds.push('facility_access_evidence_changed')
    structuredReasons.push(`facilityAccess:${facilityAccessChanges.join(',')}`)
  }

  const reviewEvidenceChanges = changedFields(
    input.priorRecord,
    input.nextRecord,
    REVIEW_EVIDENCE_FIELDS
  )
  if (reviewEvidenceChanges.length > 0) {
    transitionKinds.push('review_evidence_changed')
    structuredReasons.push(`reviewEvidence:${reviewEvidenceChanges.join(',')}`)
  }

  if (transitionKinds.length === 0) {
    return undefined
  }

  return Object.freeze({
    recordId: input.nextRecord.id,
    subjectLabel: input.nextRecord.subjectLabel,
    transitionKinds: Object.freeze(
      [...transitionKinds].sort((left, right) => left.localeCompare(right))
    ),
    structuredReasons: Object.freeze(structuredReasons),
  })
}

export function composeAffiliationPersonStatusWeeklyProgressionSummaries(input: {
  priorRecords: AffiliationPersonStatusRecordsMap | null | undefined
  nextRecords: AffiliationPersonStatusRecordsMap | null | undefined
}): readonly AffiliationPersonStatusWeeklyProgressionSummary[] {
  const priorRecords = input.priorRecords ?? {}
  const nextRecords = input.nextRecords ?? {}
  const recordIds = Object.keys(nextRecords).sort((left, right) => left.localeCompare(right))
  const summaries: AffiliationPersonStatusWeeklyProgressionSummary[] = []

  for (const recordId of recordIds) {
    const priorRecord = priorRecords[recordId]
    const nextRecord = nextRecords[recordId]
    if (!priorRecord || !nextRecord) {
      continue
    }

    const summary = composeWeeklyProgressionSummary({ priorRecord, nextRecord })
    if (summary) {
      summaries.push(summary)
    }
  }

  return Object.freeze(summaries)
}

export function formatAffiliationPersonStatusWeeklyProgressionKindLabel(
  kind: AffiliationPersonStatusWeeklyProgressionTransitionKind
): string {
  switch (kind) {
    case 'onboarding_evidence_changed':
      return 'Onboarding evidence changed'
    case 'site_access_evidence_changed':
      return 'Site access evidence changed'
    case 'facility_access_evidence_changed':
      return 'Facility access evidence changed'
    case 'review_evidence_changed':
      return 'Review evidence changed'
  }
}

export function formatAffiliationPersonStatusWeeklyProgressionNoteContent(
  summary: AffiliationPersonStatusWeeklyProgressionSummary
): string {
  const kindLabels = summary.transitionKinds.map((kind) =>
    formatAffiliationPersonStatusWeeklyProgressionKindLabel(kind)
  )

  return `Affiliation person-status weekly progression - ${summary.subjectLabel}: ${kindLabels.join('; ')}.`
}

export function buildWeeklyAffiliationPersonStatusProgressionReportNotes(input: {
  priorRecords: AffiliationPersonStatusRecordsMap | null | undefined
  nextRecords: AffiliationPersonStatusRecordsMap | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const summaries = composeAffiliationPersonStatusWeeklyProgressionSummaries({
    priorRecords: input.priorRecords,
    nextRecords: input.nextRecords,
  })

  if (summaries.length === 0) {
    return []
  }

  const notes: ReportNote[] = []
  let sequence = input.sequenceStart

  for (const summary of summaries) {
    notes.push(
      createDeterministicReportNote(
        formatAffiliationPersonStatusWeeklyProgressionNoteContent(summary),
        input.week,
        sequence,
        input.baseTimestamp,
        'affiliation_person_status.weekly_progression',
        {
          recordId: summary.recordId,
          transitionKinds: [...summary.transitionKinds],
          structuredReasons: [...summary.structuredReasons],
          week: input.week,
        }
      )
    )
    sequence += 1
  }

  return notes
}
