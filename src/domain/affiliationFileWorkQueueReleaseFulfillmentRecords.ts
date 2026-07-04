import type { AffiliationFileWorkQueueReleaseSourceBucket } from './affiliationFileWorkQueueReleaseActionRecords'
import type { AffiliationFileWorkQueueReleaseOutcomeKind } from './affiliationFileWorkQueueReleaseOutcomeRecords'

export type AffiliationFileWorkQueueReleaseFulfillmentRecordId = string

export type AffiliationFileWorkQueueReleaseFulfillmentKind = 'file_release_fulfilled'

export interface AffiliationFileWorkQueueReleaseFulfillmentRecord {
  readonly id: AffiliationFileWorkQueueReleaseFulfillmentRecordId
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly sourceOutcomeKind: AffiliationFileWorkQueueReleaseOutcomeKind
  readonly sourceBucket: AffiliationFileWorkQueueReleaseSourceBucket
  readonly sourceReasonCodes: readonly string[]
  readonly fulfillmentKind: AffiliationFileWorkQueueReleaseFulfillmentKind
  readonly fulfillmentLabel: string
  readonly recordedWeek: number
}

export type AffiliationFileWorkQueueReleaseFulfillmentRecordsMap = Record<
  AffiliationFileWorkQueueReleaseFulfillmentRecordId,
  AffiliationFileWorkQueueReleaseFulfillmentRecord
>

export interface AffiliationFileWorkQueueReleaseFulfillmentRecordInput {
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly sourceOutcomeKind: AffiliationFileWorkQueueReleaseOutcomeKind
  readonly sourceBucket: AffiliationFileWorkQueueReleaseSourceBucket
  readonly sourceReasonCodes: readonly string[]
  readonly fulfillmentKind: AffiliationFileWorkQueueReleaseFulfillmentKind
  readonly fulfillmentLabel: string
  readonly recordedWeek: number
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeRecordedWeek(value: unknown): number | undefined {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value === Math.trunc(value)
    ? value
    : undefined
}

function normalizeReasonCodes(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return [
    ...new Set(value.map((entry) => normalizeToken(entry)).filter((entry) => entry.length > 0)),
  ].sort((left, right) => left.localeCompare(right))
}

function normalizeSourceOutcomeKind(
  value: unknown
): AffiliationFileWorkQueueReleaseOutcomeKind | undefined {
  return value === 'file_released' || value === 'restricted_review_pending' ? value : undefined
}

function normalizeSourceBucket(
  value: unknown
): AffiliationFileWorkQueueReleaseSourceBucket | undefined {
  return value === 'allowed' || value === 'restricted' ? value : undefined
}

function normalizeFulfillmentKind(
  value: unknown
): AffiliationFileWorkQueueReleaseFulfillmentKind | undefined {
  return value === 'file_release_fulfilled' ? value : undefined
}

export function getAffiliationFileWorkQueueReleaseFulfillmentForOutcome(
  outcomeKind: AffiliationFileWorkQueueReleaseOutcomeKind
): {
  readonly fulfillmentKind: AffiliationFileWorkQueueReleaseFulfillmentKind
  readonly fulfillmentLabel: string
} | null {
  switch (outcomeKind) {
    case 'file_released':
      return Object.freeze({
        fulfillmentKind: 'file_release_fulfilled',
        fulfillmentLabel: 'File release fulfilled',
      })
    case 'restricted_review_pending':
      return null
  }
}

function isValidFulfillmentPair(input: {
  readonly sourceOutcomeKind: AffiliationFileWorkQueueReleaseOutcomeKind
  readonly sourceBucket: AffiliationFileWorkQueueReleaseSourceBucket
  readonly fulfillmentKind: AffiliationFileWorkQueueReleaseFulfillmentKind
}) {
  return (
    input.sourceOutcomeKind === 'file_released' &&
    input.sourceBucket === 'allowed' &&
    input.fulfillmentKind === 'file_release_fulfilled'
  )
}

export function buildAffiliationFileWorkQueueReleaseFulfillmentRecordId(input: {
  readonly workQueueEntryId: string
  readonly sourceOutcomeKind: AffiliationFileWorkQueueReleaseOutcomeKind
}) {
  return `affiliation-file-release-fulfillment:${input.workQueueEntryId}:${input.sourceOutcomeKind}`
}

export function buildAffiliationFileWorkQueueReleaseFulfillmentRecord(
  input: AffiliationFileWorkQueueReleaseFulfillmentRecordInput
): AffiliationFileWorkQueueReleaseFulfillmentRecord {
  const sourceReasonCodes = normalizeReasonCodes(input.sourceReasonCodes)

  return Object.freeze({
    id: buildAffiliationFileWorkQueueReleaseFulfillmentRecordId({
      workQueueEntryId: input.workQueueEntryId,
      sourceOutcomeKind: input.sourceOutcomeKind,
    }),
    workQueueEntryId: input.workQueueEntryId,
    subjectId: input.subjectId,
    subjectLabel: input.subjectLabel,
    sourceOutcomeKind: input.sourceOutcomeKind,
    sourceBucket: input.sourceBucket,
    sourceReasonCodes: Object.freeze(sourceReasonCodes),
    fulfillmentKind: input.fulfillmentKind,
    fulfillmentLabel: input.fulfillmentLabel,
    recordedWeek: input.recordedWeek,
  })
}

function sanitizeReleaseFulfillmentRecordEntry(
  value: unknown,
  expectedKey?: string
): AffiliationFileWorkQueueReleaseFulfillmentRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const workQueueEntryId = normalizeToken(value.workQueueEntryId)
  const subjectId = normalizeToken(value.subjectId)
  const subjectLabel = normalizeToken(value.subjectLabel)
  const sourceOutcomeKind = normalizeSourceOutcomeKind(value.sourceOutcomeKind)
  const sourceBucket = normalizeSourceBucket(value.sourceBucket)
  const fulfillmentKind = normalizeFulfillmentKind(value.fulfillmentKind)
  const fulfillmentLabel = normalizeToken(value.fulfillmentLabel)
  const recordedWeek = normalizeRecordedWeek(value.recordedWeek)

  if (
    !id ||
    !workQueueEntryId ||
    !subjectId ||
    !subjectLabel ||
    !sourceOutcomeKind ||
    !sourceBucket ||
    !fulfillmentKind ||
    !fulfillmentLabel ||
    recordedWeek === undefined ||
    !isValidFulfillmentPair({ sourceOutcomeKind, sourceBucket, fulfillmentKind }) ||
    (expectedKey !== undefined && expectedKey !== id) ||
    id !==
      buildAffiliationFileWorkQueueReleaseFulfillmentRecordId({
        workQueueEntryId,
        sourceOutcomeKind,
      })
  ) {
    return null
  }

  return Object.freeze({
    id,
    workQueueEntryId,
    subjectId,
    subjectLabel,
    sourceOutcomeKind,
    sourceBucket,
    sourceReasonCodes: Object.freeze(normalizeReasonCodes(value.sourceReasonCodes)),
    fulfillmentKind,
    fulfillmentLabel,
    recordedWeek,
  })
}

/** Hydration: canonical release-fulfillment ledger keyed by deterministic fulfillment record id. */
export function sanitizeAffiliationFileWorkQueueReleaseFulfillmentRecords(
  value: unknown,
  fallback: AffiliationFileWorkQueueReleaseFulfillmentRecordsMap = {}
): AffiliationFileWorkQueueReleaseFulfillmentRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: AffiliationFileWorkQueueReleaseFulfillmentRecordsMap = {}
  const seenIds = new Set<string>()

  for (const [key, entry] of Object.entries(value)) {
    const record = sanitizeReleaseFulfillmentRecordEntry(entry, key)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}
