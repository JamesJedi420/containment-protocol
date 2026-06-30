export type AffiliationFileWorkQueueRepairActionRecordId = string

export interface AffiliationFileWorkQueueRepairActionRecord {
  readonly id: AffiliationFileWorkQueueRepairActionRecordId
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly reasonCode: string
  readonly repairLabel: string
  readonly recordedWeek: number
}

export type AffiliationFileWorkQueueRepairActionRecordsMap = Record<
  AffiliationFileWorkQueueRepairActionRecordId,
  AffiliationFileWorkQueueRepairActionRecord
>

export interface AffiliationFileWorkQueueRepairActionRecordInput {
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly reasonCode: string
  readonly repairLabel: string
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

function normalizeReasonCode(value: unknown) {
  const reasonCode = normalizeToken(value)
  return reasonCode.startsWith('missing_') ? reasonCode : ''
}

export function buildAffiliationFileWorkQueueRepairActionRecordId(input: {
  readonly workQueueEntryId: string
  readonly reasonCode: string
}) {
  return `affiliation-file-repair-action:${input.workQueueEntryId}:${input.reasonCode}`
}

export function buildAffiliationFileWorkQueueRepairActionRecord(
  input: AffiliationFileWorkQueueRepairActionRecordInput
): AffiliationFileWorkQueueRepairActionRecord {
  const reasonCode = normalizeReasonCode(input.reasonCode)

  return Object.freeze({
    id: buildAffiliationFileWorkQueueRepairActionRecordId({
      workQueueEntryId: input.workQueueEntryId,
      reasonCode,
    }),
    workQueueEntryId: input.workQueueEntryId,
    subjectId: input.subjectId,
    subjectLabel: input.subjectLabel,
    reasonCode,
    repairLabel: input.repairLabel,
    recordedWeek: input.recordedWeek,
  })
}

function sanitizeRepairActionRecordEntry(
  value: unknown,
  expectedKey?: string
): AffiliationFileWorkQueueRepairActionRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const workQueueEntryId = normalizeToken(value.workQueueEntryId)
  const subjectId = normalizeToken(value.subjectId)
  const subjectLabel = normalizeToken(value.subjectLabel)
  const reasonCode = normalizeReasonCode(value.reasonCode)
  const repairLabel = normalizeToken(value.repairLabel)
  const recordedWeek = normalizeRecordedWeek(value.recordedWeek)

  if (
    !id ||
    !workQueueEntryId ||
    !subjectId ||
    !subjectLabel ||
    !reasonCode ||
    !repairLabel ||
    recordedWeek === undefined ||
    (expectedKey !== undefined && expectedKey !== id) ||
    id !== buildAffiliationFileWorkQueueRepairActionRecordId({ workQueueEntryId, reasonCode })
  ) {
    return null
  }

  return Object.freeze({
    id,
    workQueueEntryId,
    subjectId,
    subjectLabel,
    reasonCode,
    repairLabel,
    recordedWeek,
  })
}

/** Hydration: canonical repair-action ledger keyed by deterministic action record id. */
export function sanitizeAffiliationFileWorkQueueRepairActionRecords(
  value: unknown,
  fallback: AffiliationFileWorkQueueRepairActionRecordsMap = {}
): AffiliationFileWorkQueueRepairActionRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: AffiliationFileWorkQueueRepairActionRecordsMap = {}
  const seenIds = new Set<string>()

  for (const [key, entry] of Object.entries(value)) {
    const record = sanitizeRepairActionRecordEntry(entry, key)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}
