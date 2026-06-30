export type AffiliationFileWorkQueueEvidenceResolutionRecordId = string

export type AffiliationFileWorkQueueEvidenceResolutionSourceBucket = 'missing_review'

export interface AffiliationFileWorkQueueEvidenceResolutionRecord {
  readonly id: AffiliationFileWorkQueueEvidenceResolutionRecordId
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly sourceBucket: AffiliationFileWorkQueueEvidenceResolutionSourceBucket
  readonly missingReasonCodes: readonly string[]
  readonly recordedWeek: number
}

export type AffiliationFileWorkQueueEvidenceResolutionRecordsMap = Record<
  AffiliationFileWorkQueueEvidenceResolutionRecordId,
  AffiliationFileWorkQueueEvidenceResolutionRecord
>

export interface AffiliationFileWorkQueueEvidenceResolutionRecordInput {
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly sourceBucket: AffiliationFileWorkQueueEvidenceResolutionSourceBucket
  readonly missingReasonCodes: readonly string[]
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

export function normalizeAffiliationFileWorkQueueMissingReasonCodes(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return [
    ...new Set(
      value
        .map((entry) => normalizeToken(entry))
        .filter((entry) => entry.length > 0 && entry.startsWith('missing_'))
    ),
  ].sort((left, right) => left.localeCompare(right))
}

export function buildAffiliationFileWorkQueueEvidenceResolutionReasonFingerprint(
  missingReasonCodes: readonly string[]
) {
  return normalizeAffiliationFileWorkQueueMissingReasonCodes([...missingReasonCodes]).join('+')
}

export function buildAffiliationFileWorkQueueEvidenceResolutionRecordId(input: {
  readonly workQueueEntryId: string
  readonly missingReasonCodes: readonly string[]
}) {
  const fingerprint = buildAffiliationFileWorkQueueEvidenceResolutionReasonFingerprint(
    input.missingReasonCodes
  )

  return `affiliation-file-evidence-resolution:${input.workQueueEntryId}:${fingerprint}`
}

export function buildAffiliationFileWorkQueueEvidenceResolutionRecord(
  input: AffiliationFileWorkQueueEvidenceResolutionRecordInput
): AffiliationFileWorkQueueEvidenceResolutionRecord {
  const missingReasonCodes = normalizeAffiliationFileWorkQueueMissingReasonCodes(
    input.missingReasonCodes
  )

  return Object.freeze({
    id: buildAffiliationFileWorkQueueEvidenceResolutionRecordId({
      workQueueEntryId: input.workQueueEntryId,
      missingReasonCodes,
    }),
    workQueueEntryId: input.workQueueEntryId,
    subjectId: input.subjectId,
    subjectLabel: input.subjectLabel,
    sourceBucket: input.sourceBucket,
    missingReasonCodes: Object.freeze(missingReasonCodes),
    recordedWeek: input.recordedWeek,
  })
}

function sanitizeEvidenceResolutionRecordEntry(
  value: unknown,
  expectedKey?: string
): AffiliationFileWorkQueueEvidenceResolutionRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const workQueueEntryId = normalizeToken(value.workQueueEntryId)
  const subjectId = normalizeToken(value.subjectId)
  const subjectLabel = normalizeToken(value.subjectLabel)
  const sourceBucket = normalizeToken(value.sourceBucket)
  const missingReasonCodes = normalizeAffiliationFileWorkQueueMissingReasonCodes(
    value.missingReasonCodes
  )
  const recordedWeek = normalizeRecordedWeek(value.recordedWeek)

  if (
    !id ||
    !workQueueEntryId ||
    !subjectId ||
    !subjectLabel ||
    sourceBucket !== 'missing_review' ||
    missingReasonCodes.length === 0 ||
    recordedWeek === undefined ||
    (expectedKey !== undefined && expectedKey !== id) ||
    id !==
      buildAffiliationFileWorkQueueEvidenceResolutionRecordId({
        workQueueEntryId,
        missingReasonCodes,
      })
  ) {
    return null
  }

  return Object.freeze({
    id,
    workQueueEntryId,
    subjectId,
    subjectLabel,
    sourceBucket,
    missingReasonCodes: Object.freeze(missingReasonCodes),
    recordedWeek,
  })
}

/** Hydration: canonical evidence-resolution ledger keyed by deterministic resolution record id. */
export function sanitizeAffiliationFileWorkQueueEvidenceResolutionRecords(
  value: unknown,
  fallback: AffiliationFileWorkQueueEvidenceResolutionRecordsMap = {}
): AffiliationFileWorkQueueEvidenceResolutionRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: AffiliationFileWorkQueueEvidenceResolutionRecordsMap = {}
  const seenIds = new Set<string>()

  for (const [key, entry] of Object.entries(value)) {
    const record = sanitizeEvidenceResolutionRecordEntry(entry, key)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}
