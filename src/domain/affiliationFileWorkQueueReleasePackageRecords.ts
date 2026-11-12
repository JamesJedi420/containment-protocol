import type { AffiliationFileWorkQueueReleaseFulfillmentKind } from './affiliationFileWorkQueueReleaseFulfillmentRecords'
import type { AffiliationFileWorkQueueReleaseOutcomeKind } from './affiliationFileWorkQueueReleaseOutcomeRecords'

export type AffiliationFileWorkQueueReleasePackageRecordId = string

export type AffiliationFileWorkQueueReleasePackageKind = 'safe_file_handoff_package'

export interface AffiliationFileWorkQueueReleasePackageRecord {
  readonly id: AffiliationFileWorkQueueReleasePackageRecordId
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly sourceOutcomeKind: AffiliationFileWorkQueueReleaseOutcomeKind
  readonly sourceFulfillmentKind: AffiliationFileWorkQueueReleaseFulfillmentKind
  readonly sourceReasonCodes: readonly string[]
  readonly packageKind: AffiliationFileWorkQueueReleasePackageKind
  readonly packageLabel: string
  readonly packageRef: string
  readonly recordedWeek: number
}

export type AffiliationFileWorkQueueReleasePackageRecordsMap = Record<
  AffiliationFileWorkQueueReleasePackageRecordId,
  AffiliationFileWorkQueueReleasePackageRecord
>

export interface AffiliationFileWorkQueueReleasePackageRecordInput {
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly sourceOutcomeKind: AffiliationFileWorkQueueReleaseOutcomeKind
  readonly sourceFulfillmentKind: AffiliationFileWorkQueueReleaseFulfillmentKind
  readonly sourceReasonCodes: readonly string[]
  readonly packageKind: AffiliationFileWorkQueueReleasePackageKind
  readonly packageLabel: string
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

function normalizeSourceFulfillmentKind(
  value: unknown
): AffiliationFileWorkQueueReleaseFulfillmentKind | undefined {
  return value === 'file_release_fulfilled' ? value : undefined
}

function normalizePackageKind(
  value: unknown
): AffiliationFileWorkQueueReleasePackageKind | undefined {
  return value === 'safe_file_handoff_package' ? value : undefined
}

export function getAffiliationFileWorkQueueReleasePackageForFulfillment(
  fulfillmentKind: AffiliationFileWorkQueueReleaseFulfillmentKind
): {
  readonly packageKind: AffiliationFileWorkQueueReleasePackageKind
  readonly packageLabel: string
} {
  switch (fulfillmentKind) {
    case 'file_release_fulfilled':
      return Object.freeze({
        packageKind: 'safe_file_handoff_package',
        packageLabel: 'Safe file handoff package',
      })
  }
}

function isValidPackagePair(input: {
  readonly sourceOutcomeKind: AffiliationFileWorkQueueReleaseOutcomeKind
  readonly sourceFulfillmentKind: AffiliationFileWorkQueueReleaseFulfillmentKind
  readonly packageKind: AffiliationFileWorkQueueReleasePackageKind
}) {
  return (
    input.sourceOutcomeKind === 'file_released' &&
    input.sourceFulfillmentKind === 'file_release_fulfilled' &&
    input.packageKind === 'safe_file_handoff_package'
  )
}

export function buildAffiliationFileWorkQueueReleasePackageRecordId(input: {
  readonly workQueueEntryId: string
  readonly sourceFulfillmentKind: AffiliationFileWorkQueueReleaseFulfillmentKind
}) {
  return `affiliation-file-release-package:${input.workQueueEntryId}:${input.sourceFulfillmentKind}`
}

function buildReleasePackageRef(input: {
  readonly workQueueEntryId: string
  readonly sourceFulfillmentKind: AffiliationFileWorkQueueReleaseFulfillmentKind
}) {
  return `release-package:${input.workQueueEntryId}:${input.sourceFulfillmentKind}`
}

export function buildAffiliationFileWorkQueueReleasePackageRecord(
  input: AffiliationFileWorkQueueReleasePackageRecordInput
): AffiliationFileWorkQueueReleasePackageRecord {
  const sourceReasonCodes = normalizeReasonCodes(input.sourceReasonCodes)
  const packageRef = buildReleasePackageRef({
    workQueueEntryId: input.workQueueEntryId,
    sourceFulfillmentKind: input.sourceFulfillmentKind,
  })

  return Object.freeze({
    id: buildAffiliationFileWorkQueueReleasePackageRecordId({
      workQueueEntryId: input.workQueueEntryId,
      sourceFulfillmentKind: input.sourceFulfillmentKind,
    }),
    workQueueEntryId: input.workQueueEntryId,
    subjectId: input.subjectId,
    subjectLabel: input.subjectLabel,
    sourceOutcomeKind: input.sourceOutcomeKind,
    sourceFulfillmentKind: input.sourceFulfillmentKind,
    sourceReasonCodes: Object.freeze(sourceReasonCodes),
    packageKind: input.packageKind,
    packageLabel: input.packageLabel,
    packageRef,
    recordedWeek: input.recordedWeek,
  })
}

function sanitizeReleasePackageRecordEntry(
  value: unknown,
  expectedKey?: string
): AffiliationFileWorkQueueReleasePackageRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const workQueueEntryId = normalizeToken(value.workQueueEntryId)
  const subjectId = normalizeToken(value.subjectId)
  const subjectLabel = normalizeToken(value.subjectLabel)
  const sourceOutcomeKind = normalizeSourceOutcomeKind(value.sourceOutcomeKind)
  const sourceFulfillmentKind = normalizeSourceFulfillmentKind(value.sourceFulfillmentKind)
  const packageKind = normalizePackageKind(value.packageKind)
  const packageLabel = normalizeToken(value.packageLabel)
  const packageRef = normalizeToken(value.packageRef)
  const recordedWeek = normalizeRecordedWeek(value.recordedWeek)

  if (
    !id ||
    !workQueueEntryId ||
    !subjectId ||
    !subjectLabel ||
    !sourceOutcomeKind ||
    !sourceFulfillmentKind ||
    !packageKind ||
    !packageLabel ||
    !packageRef ||
    recordedWeek === undefined ||
    !isValidPackagePair({ sourceOutcomeKind, sourceFulfillmentKind, packageKind }) ||
    (expectedKey !== undefined && expectedKey !== id) ||
    id !==
      buildAffiliationFileWorkQueueReleasePackageRecordId({
        workQueueEntryId,
        sourceFulfillmentKind,
      }) ||
    packageRef !== buildReleasePackageRef({ workQueueEntryId, sourceFulfillmentKind })
  ) {
    return null
  }

  return Object.freeze({
    id,
    workQueueEntryId,
    subjectId,
    subjectLabel,
    sourceOutcomeKind,
    sourceFulfillmentKind,
    sourceReasonCodes: Object.freeze(normalizeReasonCodes(value.sourceReasonCodes)),
    packageKind,
    packageLabel,
    packageRef,
    recordedWeek,
  })
}

/** Hydration: canonical release-package handoff ledger keyed by deterministic package record id. */
export function sanitizeAffiliationFileWorkQueueReleasePackageRecords(
  value: unknown,
  fallback: AffiliationFileWorkQueueReleasePackageRecordsMap = {}
): AffiliationFileWorkQueueReleasePackageRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: AffiliationFileWorkQueueReleasePackageRecordsMap = {}
  const seenIds = new Set<string>()

  for (const [key, entry] of Object.entries(value)) {
    const record = sanitizeReleasePackageRecordEntry(entry, key)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}
