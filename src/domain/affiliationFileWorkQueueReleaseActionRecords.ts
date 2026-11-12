export type AffiliationFileWorkQueueReleaseActionRecordId = string

export type AffiliationFileWorkQueueReleaseSourceBucket = 'restricted' | 'allowed'

export type AffiliationFileWorkQueueReleaseActionKind =
  | 'file_release_authorized'
  | 'restricted_release_review_routed'

export interface AffiliationFileWorkQueueReleaseActionRecord {
  readonly id: AffiliationFileWorkQueueReleaseActionRecordId
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly actionKind: AffiliationFileWorkQueueReleaseActionKind
  readonly actionLabel: string
  readonly sourceBucket: AffiliationFileWorkQueueReleaseSourceBucket
  readonly sourceReasonCodes: readonly string[]
  readonly recordedWeek: number
}

export type AffiliationFileWorkQueueReleaseActionRecordsMap = Record<
  AffiliationFileWorkQueueReleaseActionRecordId,
  AffiliationFileWorkQueueReleaseActionRecord
>

export interface AffiliationFileWorkQueueReleaseActionRecordInput {
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly actionKind: AffiliationFileWorkQueueReleaseActionKind
  readonly actionLabel: string
  readonly sourceBucket: AffiliationFileWorkQueueReleaseSourceBucket
  readonly sourceReasonCodes: readonly string[]
  readonly recordedWeek: number
}

const RELEASE_ACTION_KINDS: readonly AffiliationFileWorkQueueReleaseActionKind[] = [
  'file_release_authorized',
  'restricted_release_review_routed',
] as const

const RELEASE_SOURCE_BUCKETS: readonly AffiliationFileWorkQueueReleaseSourceBucket[] = [
  'restricted',
  'allowed',
] as const

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeReleaseActionKind(
  value: unknown
): AffiliationFileWorkQueueReleaseActionKind | undefined {
  return RELEASE_ACTION_KINDS.includes(value as AffiliationFileWorkQueueReleaseActionKind)
    ? (value as AffiliationFileWorkQueueReleaseActionKind)
    : undefined
}

function normalizeReleaseSourceBucket(
  value: unknown
): AffiliationFileWorkQueueReleaseSourceBucket | undefined {
  return RELEASE_SOURCE_BUCKETS.includes(value as AffiliationFileWorkQueueReleaseSourceBucket)
    ? (value as AffiliationFileWorkQueueReleaseSourceBucket)
    : undefined
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

export function getAffiliationFileWorkQueueReleaseActionForBucket(bucket: string): {
  readonly actionKind: AffiliationFileWorkQueueReleaseActionKind
  readonly actionLabel: string
} | null {
  switch (bucket) {
    case 'allowed':
      return Object.freeze({
        actionKind: 'file_release_authorized',
        actionLabel: 'File release authorized',
      })
    case 'restricted':
      return Object.freeze({
        actionKind: 'restricted_release_review_routed',
        actionLabel: 'Restricted release review routed',
      })
    default:
      return null
  }
}

export function buildAffiliationFileWorkQueueReleaseActionRecordId(input: {
  readonly workQueueEntryId: string
  readonly actionKind: AffiliationFileWorkQueueReleaseActionKind
}) {
  return `affiliation-file-release-action:${input.workQueueEntryId}:${input.actionKind}`
}

export function buildAffiliationFileWorkQueueReleaseActionRecord(
  input: AffiliationFileWorkQueueReleaseActionRecordInput
): AffiliationFileWorkQueueReleaseActionRecord {
  const sourceReasonCodes = normalizeReasonCodes(input.sourceReasonCodes)

  return Object.freeze({
    id: buildAffiliationFileWorkQueueReleaseActionRecordId({
      workQueueEntryId: input.workQueueEntryId,
      actionKind: input.actionKind,
    }),
    workQueueEntryId: input.workQueueEntryId,
    subjectId: input.subjectId,
    subjectLabel: input.subjectLabel,
    actionKind: input.actionKind,
    actionLabel: input.actionLabel,
    sourceBucket: input.sourceBucket,
    sourceReasonCodes: Object.freeze(sourceReasonCodes),
    recordedWeek: input.recordedWeek,
  })
}

function sanitizeReleaseActionRecordEntry(
  value: unknown,
  expectedKey?: string
): AffiliationFileWorkQueueReleaseActionRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const workQueueEntryId = normalizeToken(value.workQueueEntryId)
  const subjectId = normalizeToken(value.subjectId)
  const subjectLabel = normalizeToken(value.subjectLabel)
  const actionKind = normalizeReleaseActionKind(value.actionKind)
  const actionLabel = normalizeToken(value.actionLabel)
  const sourceBucket = normalizeReleaseSourceBucket(value.sourceBucket)
  const recordedWeek = normalizeRecordedWeek(value.recordedWeek)

  if (
    !id ||
    !workQueueEntryId ||
    !subjectId ||
    !subjectLabel ||
    !actionKind ||
    !actionLabel ||
    !sourceBucket ||
    recordedWeek === undefined ||
    (sourceBucket === 'allowed' && actionKind !== 'file_release_authorized') ||
    (sourceBucket === 'restricted' && actionKind !== 'restricted_release_review_routed') ||
    (expectedKey !== undefined && expectedKey !== id) ||
    id !== buildAffiliationFileWorkQueueReleaseActionRecordId({ workQueueEntryId, actionKind })
  ) {
    return null
  }

  return Object.freeze({
    id,
    workQueueEntryId,
    subjectId,
    subjectLabel,
    actionKind,
    actionLabel,
    sourceBucket,
    sourceReasonCodes: Object.freeze(normalizeReasonCodes(value.sourceReasonCodes)),
    recordedWeek,
  })
}

/** Hydration: canonical release-action ledger keyed by deterministic action record id. */
export function sanitizeAffiliationFileWorkQueueReleaseActionRecords(
  value: unknown,
  fallback: AffiliationFileWorkQueueReleaseActionRecordsMap = {}
): AffiliationFileWorkQueueReleaseActionRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: AffiliationFileWorkQueueReleaseActionRecordsMap = {}
  const seenIds = new Set<string>()

  for (const [key, entry] of Object.entries(value)) {
    const record = sanitizeReleaseActionRecordEntry(entry, key)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}
