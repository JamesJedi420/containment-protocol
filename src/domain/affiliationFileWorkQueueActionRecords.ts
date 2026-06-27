export type AffiliationFileWorkQueueActionRecordId = string

export type AffiliationFileWorkQueueSourceBucket =
  | 'blocked'
  | 'restricted'
  | 'missing_review'
  | 'allowed'

export type AffiliationFileWorkQueueActionKind =
  | 'resolve_missing_review'
  | 'hold_blocked_access'
  | 'route_restricted_review'
  | 'monitor_allowed_access'

export interface AffiliationFileWorkQueueActionRecord {
  readonly id: AffiliationFileWorkQueueActionRecordId
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly actionKind: AffiliationFileWorkQueueActionKind
  readonly actionLabel: string
  readonly sourceBucket: AffiliationFileWorkQueueSourceBucket
  readonly sourceReasonCodes: readonly string[]
  readonly recordedWeek: number
}

export type AffiliationFileWorkQueueActionRecordsMap = Record<
  AffiliationFileWorkQueueActionRecordId,
  AffiliationFileWorkQueueActionRecord
>

export interface AffiliationFileWorkQueueActionRecordInput {
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly actionKind: AffiliationFileWorkQueueActionKind
  readonly actionLabel: string
  readonly sourceBucket: AffiliationFileWorkQueueSourceBucket
  readonly sourceReasonCodes: readonly string[]
  readonly recordedWeek: number
}

const ACTION_KINDS: readonly AffiliationFileWorkQueueActionKind[] = [
  'resolve_missing_review',
  'hold_blocked_access',
  'route_restricted_review',
  'monitor_allowed_access',
] as const

const SOURCE_BUCKETS: readonly AffiliationFileWorkQueueSourceBucket[] = [
  'blocked',
  'restricted',
  'missing_review',
  'allowed',
] as const

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeActionKind(value: unknown): AffiliationFileWorkQueueActionKind | undefined {
  return ACTION_KINDS.includes(value as AffiliationFileWorkQueueActionKind)
    ? (value as AffiliationFileWorkQueueActionKind)
    : undefined
}

function normalizeSourceBucket(value: unknown): AffiliationFileWorkQueueSourceBucket | undefined {
  return SOURCE_BUCKETS.includes(value as AffiliationFileWorkQueueSourceBucket)
    ? (value as AffiliationFileWorkQueueSourceBucket)
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

export function buildAffiliationFileWorkQueueActionRecordId(input: {
  readonly workQueueEntryId: string
  readonly actionKind: AffiliationFileWorkQueueActionKind
}) {
  return `affiliation-file-action:${input.workQueueEntryId}:${input.actionKind}`
}

export function buildAffiliationFileWorkQueueActionRecord(
  input: AffiliationFileWorkQueueActionRecordInput
): AffiliationFileWorkQueueActionRecord {
  const sourceReasonCodes = normalizeReasonCodes(input.sourceReasonCodes)

  return Object.freeze({
    id: buildAffiliationFileWorkQueueActionRecordId({
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

function sanitizeActionRecordEntry(
  value: unknown,
  expectedKey?: string
): AffiliationFileWorkQueueActionRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const workQueueEntryId = normalizeToken(value.workQueueEntryId)
  const subjectId = normalizeToken(value.subjectId)
  const subjectLabel = normalizeToken(value.subjectLabel)
  const actionKind = normalizeActionKind(value.actionKind)
  const actionLabel = normalizeToken(value.actionLabel)
  const sourceBucket = normalizeSourceBucket(value.sourceBucket)
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
    (expectedKey !== undefined && expectedKey !== id) ||
    id !== buildAffiliationFileWorkQueueActionRecordId({ workQueueEntryId, actionKind })
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

/** Hydration: canonical action ledger keyed by deterministic action record id. */
export function sanitizeAffiliationFileWorkQueueActionRecords(
  value: unknown,
  fallback: AffiliationFileWorkQueueActionRecordsMap = {}
): AffiliationFileWorkQueueActionRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: AffiliationFileWorkQueueActionRecordsMap = {}
  const seenIds = new Set<string>()

  for (const [key, entry] of Object.entries(value)) {
    const record = sanitizeActionRecordEntry(entry, key)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}
