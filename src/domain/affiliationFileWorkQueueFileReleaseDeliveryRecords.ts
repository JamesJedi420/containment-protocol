import type { AffiliationFileWorkQueueReleasePackageKind } from './affiliationFileWorkQueueReleasePackageRecords'

export type AffiliationFileWorkQueueFileReleaseDeliveryRecordId = string

export type AffiliationFileWorkQueueFileReleaseDeliveryKind = 'metadata_only_file_release_delivered'

export interface AffiliationFileWorkQueueFileReleaseDeliveryRecord {
  readonly id: AffiliationFileWorkQueueFileReleaseDeliveryRecordId
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly sourcePackageKind: AffiliationFileWorkQueueReleasePackageKind
  readonly sourcePackageRef: string
  readonly sourceReasonCodes: readonly string[]
  readonly deliveryKind: AffiliationFileWorkQueueFileReleaseDeliveryKind
  readonly deliveryLabel: string
  readonly deliveryRef: string
  readonly recordedWeek: number
}

export type AffiliationFileWorkQueueFileReleaseDeliveryRecordsMap = Record<
  AffiliationFileWorkQueueFileReleaseDeliveryRecordId,
  AffiliationFileWorkQueueFileReleaseDeliveryRecord
>

export interface AffiliationFileWorkQueueFileReleaseDeliveryRecordInput {
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly sourcePackageKind: AffiliationFileWorkQueueReleasePackageKind
  readonly sourcePackageRef: string
  readonly sourceReasonCodes: readonly string[]
  readonly deliveryKind: AffiliationFileWorkQueueFileReleaseDeliveryKind
  readonly deliveryLabel: string
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

function normalizeSourcePackageKind(
  value: unknown
): AffiliationFileWorkQueueReleasePackageKind | undefined {
  return value === 'safe_file_handoff_package' ? value : undefined
}

function normalizeDeliveryKind(
  value: unknown
): AffiliationFileWorkQueueFileReleaseDeliveryKind | undefined {
  return value === 'metadata_only_file_release_delivered' ? value : undefined
}

function isValidDeliveryPair(input: {
  readonly sourcePackageKind: AffiliationFileWorkQueueReleasePackageKind
  readonly deliveryKind: AffiliationFileWorkQueueFileReleaseDeliveryKind
}) {
  return (
    input.sourcePackageKind === 'safe_file_handoff_package' &&
    input.deliveryKind === 'metadata_only_file_release_delivered'
  )
}

export function getAffiliationFileWorkQueueFileReleaseDeliveryForPackage(
  packageKind: AffiliationFileWorkQueueReleasePackageKind
): {
  readonly deliveryKind: AffiliationFileWorkQueueFileReleaseDeliveryKind
  readonly deliveryLabel: string
} {
  switch (packageKind) {
    case 'safe_file_handoff_package':
      return Object.freeze({
        deliveryKind: 'metadata_only_file_release_delivered',
        deliveryLabel: 'Metadata-only file release delivered',
      })
  }
}

export function buildAffiliationFileWorkQueueFileReleaseDeliveryRecordId(input: {
  readonly workQueueEntryId: string
  readonly sourcePackageKind: AffiliationFileWorkQueueReleasePackageKind
}) {
  return `affiliation-file-release-delivery:${input.workQueueEntryId}:${input.sourcePackageKind}`
}

function buildFileReleaseDeliveryRef(input: {
  readonly workQueueEntryId: string
  readonly sourcePackageKind: AffiliationFileWorkQueueReleasePackageKind
}) {
  return `file-release-delivery:${input.workQueueEntryId}:${input.sourcePackageKind}`
}

export function buildAffiliationFileWorkQueueFileReleaseDeliveryRecord(
  input: AffiliationFileWorkQueueFileReleaseDeliveryRecordInput
): AffiliationFileWorkQueueFileReleaseDeliveryRecord {
  const sourceReasonCodes = normalizeReasonCodes(input.sourceReasonCodes)
  const deliveryRef = buildFileReleaseDeliveryRef({
    workQueueEntryId: input.workQueueEntryId,
    sourcePackageKind: input.sourcePackageKind,
  })

  return Object.freeze({
    id: buildAffiliationFileWorkQueueFileReleaseDeliveryRecordId({
      workQueueEntryId: input.workQueueEntryId,
      sourcePackageKind: input.sourcePackageKind,
    }),
    workQueueEntryId: input.workQueueEntryId,
    subjectId: input.subjectId,
    subjectLabel: input.subjectLabel,
    sourcePackageKind: input.sourcePackageKind,
    sourcePackageRef: input.sourcePackageRef,
    sourceReasonCodes: Object.freeze(sourceReasonCodes),
    deliveryKind: input.deliveryKind,
    deliveryLabel: input.deliveryLabel,
    deliveryRef,
    recordedWeek: input.recordedWeek,
  })
}

function buildReleasePackageRef(input: {
  readonly workQueueEntryId: string
  readonly sourcePackageKind: AffiliationFileWorkQueueReleasePackageKind
}) {
  return `release-package:${input.workQueueEntryId}:file_release_fulfilled`
}

function sanitizeFileReleaseDeliveryRecordEntry(
  value: unknown,
  expectedKey?: string
): AffiliationFileWorkQueueFileReleaseDeliveryRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const workQueueEntryId = normalizeToken(value.workQueueEntryId)
  const subjectId = normalizeToken(value.subjectId)
  const subjectLabel = normalizeToken(value.subjectLabel)
  const sourcePackageKind = normalizeSourcePackageKind(value.sourcePackageKind)
  const sourcePackageRef = normalizeToken(value.sourcePackageRef)
  const deliveryKind = normalizeDeliveryKind(value.deliveryKind)
  const deliveryLabel = normalizeToken(value.deliveryLabel)
  const deliveryRef = normalizeToken(value.deliveryRef)
  const recordedWeek = normalizeRecordedWeek(value.recordedWeek)

  if (
    !id ||
    !workQueueEntryId ||
    !subjectId ||
    !subjectLabel ||
    !sourcePackageKind ||
    !sourcePackageRef ||
    !deliveryKind ||
    !deliveryLabel ||
    !deliveryRef ||
    recordedWeek === undefined ||
    !isValidDeliveryPair({ sourcePackageKind, deliveryKind }) ||
    sourcePackageRef !== buildReleasePackageRef({ workQueueEntryId, sourcePackageKind }) ||
    (expectedKey !== undefined && expectedKey !== id) ||
    id !==
      buildAffiliationFileWorkQueueFileReleaseDeliveryRecordId({
        workQueueEntryId,
        sourcePackageKind,
      }) ||
    deliveryRef !==
      buildFileReleaseDeliveryRef({
        workQueueEntryId,
        sourcePackageKind,
      })
  ) {
    return null
  }

  return Object.freeze({
    id,
    workQueueEntryId,
    subjectId,
    subjectLabel,
    sourcePackageKind,
    sourcePackageRef,
    sourceReasonCodes: Object.freeze(normalizeReasonCodes(value.sourceReasonCodes)),
    deliveryKind,
    deliveryLabel,
    deliveryRef,
    recordedWeek,
  })
}

/** Hydration: canonical file-release delivery ledger keyed by deterministic delivery id. */
export function sanitizeAffiliationFileWorkQueueFileReleaseDeliveryRecords(
  value: unknown,
  fallback: AffiliationFileWorkQueueFileReleaseDeliveryRecordsMap = {}
): AffiliationFileWorkQueueFileReleaseDeliveryRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: AffiliationFileWorkQueueFileReleaseDeliveryRecordsMap = {}
  const seenIds = new Set<string>()

  for (const [key, entry] of Object.entries(value)) {
    const record = sanitizeFileReleaseDeliveryRecordEntry(entry, key)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}
