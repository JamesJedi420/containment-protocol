import type {
  AffiliationFileWorkQueueReleaseActionKind,
  AffiliationFileWorkQueueReleaseSourceBucket,
} from './affiliationFileWorkQueueReleaseActionRecords'

export type AffiliationFileWorkQueueReleaseOutcomeRecordId = string

export type AffiliationFileWorkQueueReleaseOutcomeKind =
  | 'file_released'
  | 'restricted_review_pending'

export interface AffiliationFileWorkQueueReleaseOutcomeRecord {
  readonly id: AffiliationFileWorkQueueReleaseOutcomeRecordId
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly sourceActionKind: AffiliationFileWorkQueueReleaseActionKind
  readonly sourceBucket: AffiliationFileWorkQueueReleaseSourceBucket
  readonly sourceReasonCodes: readonly string[]
  readonly outcomeKind: AffiliationFileWorkQueueReleaseOutcomeKind
  readonly outcomeLabel: string
  readonly recordedWeek: number
}

export type AffiliationFileWorkQueueReleaseOutcomeRecordsMap = Record<
  AffiliationFileWorkQueueReleaseOutcomeRecordId,
  AffiliationFileWorkQueueReleaseOutcomeRecord
>

export interface AffiliationFileWorkQueueReleaseOutcomeRecordInput {
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly sourceActionKind: AffiliationFileWorkQueueReleaseActionKind
  readonly sourceBucket: AffiliationFileWorkQueueReleaseSourceBucket
  readonly sourceReasonCodes: readonly string[]
  readonly outcomeKind: AffiliationFileWorkQueueReleaseOutcomeKind
  readonly outcomeLabel: string
  readonly recordedWeek: number
}

const OUTCOME_KINDS: readonly AffiliationFileWorkQueueReleaseOutcomeKind[] = [
  'file_released',
  'restricted_review_pending',
] as const

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

function normalizeSourceActionKind(
  value: unknown
): AffiliationFileWorkQueueReleaseActionKind | undefined {
  return value === 'file_release_authorized' || value === 'restricted_release_review_routed'
    ? value
    : undefined
}

function normalizeSourceBucket(
  value: unknown
): AffiliationFileWorkQueueReleaseSourceBucket | undefined {
  return value === 'allowed' || value === 'restricted' ? value : undefined
}

function normalizeOutcomeKind(
  value: unknown
): AffiliationFileWorkQueueReleaseOutcomeKind | undefined {
  return OUTCOME_KINDS.includes(value as AffiliationFileWorkQueueReleaseOutcomeKind)
    ? (value as AffiliationFileWorkQueueReleaseOutcomeKind)
    : undefined
}

export function getAffiliationFileWorkQueueReleaseOutcomeForAction(
  actionKind: AffiliationFileWorkQueueReleaseActionKind
): {
  readonly outcomeKind: AffiliationFileWorkQueueReleaseOutcomeKind
  readonly outcomeLabel: string
} {
  switch (actionKind) {
    case 'file_release_authorized':
      return Object.freeze({
        outcomeKind: 'file_released',
        outcomeLabel: 'File released',
      })
    case 'restricted_release_review_routed':
      return Object.freeze({
        outcomeKind: 'restricted_review_pending',
        outcomeLabel: 'Restricted review pending',
      })
  }
}

function isValidOutcomePair(input: {
  readonly sourceActionKind: AffiliationFileWorkQueueReleaseActionKind
  readonly sourceBucket: AffiliationFileWorkQueueReleaseSourceBucket
  readonly outcomeKind: AffiliationFileWorkQueueReleaseOutcomeKind
}) {
  return (
    (input.sourceActionKind === 'file_release_authorized' &&
      input.sourceBucket === 'allowed' &&
      input.outcomeKind === 'file_released') ||
    (input.sourceActionKind === 'restricted_release_review_routed' &&
      input.sourceBucket === 'restricted' &&
      input.outcomeKind === 'restricted_review_pending')
  )
}

export function buildAffiliationFileWorkQueueReleaseOutcomeRecordId(input: {
  readonly workQueueEntryId: string
  readonly sourceActionKind: AffiliationFileWorkQueueReleaseActionKind
}) {
  return `affiliation-file-release-outcome:${input.workQueueEntryId}:${input.sourceActionKind}`
}

export function buildAffiliationFileWorkQueueReleaseOutcomeRecord(
  input: AffiliationFileWorkQueueReleaseOutcomeRecordInput
): AffiliationFileWorkQueueReleaseOutcomeRecord {
  const sourceReasonCodes = normalizeReasonCodes(input.sourceReasonCodes)

  return Object.freeze({
    id: buildAffiliationFileWorkQueueReleaseOutcomeRecordId({
      workQueueEntryId: input.workQueueEntryId,
      sourceActionKind: input.sourceActionKind,
    }),
    workQueueEntryId: input.workQueueEntryId,
    subjectId: input.subjectId,
    subjectLabel: input.subjectLabel,
    sourceActionKind: input.sourceActionKind,
    sourceBucket: input.sourceBucket,
    sourceReasonCodes: Object.freeze(sourceReasonCodes),
    outcomeKind: input.outcomeKind,
    outcomeLabel: input.outcomeLabel,
    recordedWeek: input.recordedWeek,
  })
}

function sanitizeReleaseOutcomeRecordEntry(
  value: unknown,
  expectedKey?: string
): AffiliationFileWorkQueueReleaseOutcomeRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const workQueueEntryId = normalizeToken(value.workQueueEntryId)
  const subjectId = normalizeToken(value.subjectId)
  const subjectLabel = normalizeToken(value.subjectLabel)
  const sourceActionKind = normalizeSourceActionKind(value.sourceActionKind)
  const sourceBucket = normalizeSourceBucket(value.sourceBucket)
  const outcomeKind = normalizeOutcomeKind(value.outcomeKind)
  const outcomeLabel = normalizeToken(value.outcomeLabel)
  const recordedWeek = normalizeRecordedWeek(value.recordedWeek)

  if (
    !id ||
    !workQueueEntryId ||
    !subjectId ||
    !subjectLabel ||
    !sourceActionKind ||
    !sourceBucket ||
    !outcomeKind ||
    !outcomeLabel ||
    recordedWeek === undefined ||
    !isValidOutcomePair({ sourceActionKind, sourceBucket, outcomeKind }) ||
    (expectedKey !== undefined && expectedKey !== id) ||
    id !==
      buildAffiliationFileWorkQueueReleaseOutcomeRecordId({
        workQueueEntryId,
        sourceActionKind,
      })
  ) {
    return null
  }

  return Object.freeze({
    id,
    workQueueEntryId,
    subjectId,
    subjectLabel,
    sourceActionKind,
    sourceBucket,
    sourceReasonCodes: Object.freeze(normalizeReasonCodes(value.sourceReasonCodes)),
    outcomeKind,
    outcomeLabel,
    recordedWeek,
  })
}

/** Hydration: canonical release-outcome ledger keyed by deterministic outcome record id. */
export function sanitizeAffiliationFileWorkQueueReleaseOutcomeRecords(
  value: unknown,
  fallback: AffiliationFileWorkQueueReleaseOutcomeRecordsMap = {}
): AffiliationFileWorkQueueReleaseOutcomeRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: AffiliationFileWorkQueueReleaseOutcomeRecordsMap = {}
  const seenIds = new Set<string>()

  for (const [key, entry] of Object.entries(value)) {
    const record = sanitizeReleaseOutcomeRecordEntry(entry, key)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}
