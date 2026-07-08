import type { AffiliationFileWorkQueueSourceBucket } from './affiliationFileWorkQueueActionRecords'

export type AffiliationFileWorkQueueNonMissionEnforcementRecordId = string

export type AffiliationFileWorkQueueNonMissionEnforcementKind =
  | 'blocked_non_mission_access_enforced'
  | 'restricted_non_mission_access_enforced'
  | 'allowed_non_mission_access_verified'

export interface AffiliationFileWorkQueueNonMissionEnforcementRecord {
  readonly id: AffiliationFileWorkQueueNonMissionEnforcementRecordId
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly sourceBucket: AffiliationFileWorkQueueSourceBucket
  readonly sourceReasonCodes: readonly string[]
  readonly enforcementKind: AffiliationFileWorkQueueNonMissionEnforcementKind
  readonly enforcementLabel: string
  readonly recordedWeek: number
}

export type AffiliationFileWorkQueueNonMissionEnforcementRecordsMap = Record<
  AffiliationFileWorkQueueNonMissionEnforcementRecordId,
  AffiliationFileWorkQueueNonMissionEnforcementRecord
>

export interface AffiliationFileWorkQueueNonMissionEnforcementRecordInput {
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly sourceBucket: AffiliationFileWorkQueueSourceBucket
  readonly sourceReasonCodes: readonly string[]
  readonly enforcementKind: AffiliationFileWorkQueueNonMissionEnforcementKind
  readonly enforcementLabel: string
  readonly recordedWeek: number
}

const ENFORCEMENT_KINDS: readonly AffiliationFileWorkQueueNonMissionEnforcementKind[] = [
  'blocked_non_mission_access_enforced',
  'restricted_non_mission_access_enforced',
  'allowed_non_mission_access_verified',
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

function normalizeSourceBucket(value: unknown): AffiliationFileWorkQueueSourceBucket | undefined {
  return SOURCE_BUCKETS.includes(value as AffiliationFileWorkQueueSourceBucket)
    ? (value as AffiliationFileWorkQueueSourceBucket)
    : undefined
}

function normalizeEnforcementKind(
  value: unknown
): AffiliationFileWorkQueueNonMissionEnforcementKind | undefined {
  return ENFORCEMENT_KINDS.includes(value as AffiliationFileWorkQueueNonMissionEnforcementKind)
    ? (value as AffiliationFileWorkQueueNonMissionEnforcementKind)
    : undefined
}

export function getAffiliationFileWorkQueueNonMissionEnforcementForBucket(
  bucket: AffiliationFileWorkQueueSourceBucket
): {
  readonly enforcementKind: AffiliationFileWorkQueueNonMissionEnforcementKind
  readonly enforcementLabel: string
} | null {
  switch (bucket) {
    case 'blocked':
      return Object.freeze({
        enforcementKind: 'blocked_non_mission_access_enforced',
        enforcementLabel: 'Blocked non-mission access enforced',
      })
    case 'restricted':
      return Object.freeze({
        enforcementKind: 'restricted_non_mission_access_enforced',
        enforcementLabel: 'Restricted non-mission access enforced',
      })
    case 'allowed':
      return Object.freeze({
        enforcementKind: 'allowed_non_mission_access_verified',
        enforcementLabel: 'Allowed non-mission access verified',
      })
    case 'missing_review':
      return null
  }
}

function isValidEnforcementPair(input: {
  readonly sourceBucket: AffiliationFileWorkQueueSourceBucket
  readonly enforcementKind: AffiliationFileWorkQueueNonMissionEnforcementKind
}) {
  return (
    (input.sourceBucket === 'blocked' &&
      input.enforcementKind === 'blocked_non_mission_access_enforced') ||
    (input.sourceBucket === 'restricted' &&
      input.enforcementKind === 'restricted_non_mission_access_enforced') ||
    (input.sourceBucket === 'allowed' &&
      input.enforcementKind === 'allowed_non_mission_access_verified')
  )
}

export function buildAffiliationFileWorkQueueNonMissionEnforcementRecordId(input: {
  readonly workQueueEntryId: string
  readonly sourceBucket: AffiliationFileWorkQueueSourceBucket
}) {
  return `affiliation-file-non-mission-enforcement:${input.workQueueEntryId}:${input.sourceBucket}`
}

export function buildAffiliationFileWorkQueueNonMissionEnforcementRecord(
  input: AffiliationFileWorkQueueNonMissionEnforcementRecordInput
): AffiliationFileWorkQueueNonMissionEnforcementRecord {
  const sourceReasonCodes = normalizeReasonCodes(input.sourceReasonCodes)

  return Object.freeze({
    id: buildAffiliationFileWorkQueueNonMissionEnforcementRecordId({
      workQueueEntryId: input.workQueueEntryId,
      sourceBucket: input.sourceBucket,
    }),
    workQueueEntryId: input.workQueueEntryId,
    subjectId: input.subjectId,
    subjectLabel: input.subjectLabel,
    sourceBucket: input.sourceBucket,
    sourceReasonCodes: Object.freeze(sourceReasonCodes),
    enforcementKind: input.enforcementKind,
    enforcementLabel: input.enforcementLabel,
    recordedWeek: input.recordedWeek,
  })
}

function sanitizeNonMissionEnforcementRecordEntry(
  value: unknown,
  expectedKey?: string
): AffiliationFileWorkQueueNonMissionEnforcementRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const workQueueEntryId = normalizeToken(value.workQueueEntryId)
  const subjectId = normalizeToken(value.subjectId)
  const subjectLabel = normalizeToken(value.subjectLabel)
  const sourceBucket = normalizeSourceBucket(value.sourceBucket)
  const enforcementKind = normalizeEnforcementKind(value.enforcementKind)
  const enforcementLabel = normalizeToken(value.enforcementLabel)
  const recordedWeek = normalizeRecordedWeek(value.recordedWeek)

  if (
    !id ||
    !workQueueEntryId ||
    !subjectId ||
    !subjectLabel ||
    !sourceBucket ||
    !enforcementKind ||
    !enforcementLabel ||
    recordedWeek === undefined ||
    !isValidEnforcementPair({ sourceBucket, enforcementKind }) ||
    (expectedKey !== undefined && expectedKey !== id) ||
    id !==
      buildAffiliationFileWorkQueueNonMissionEnforcementRecordId({
        workQueueEntryId,
        sourceBucket,
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
    sourceReasonCodes: Object.freeze(normalizeReasonCodes(value.sourceReasonCodes)),
    enforcementKind,
    enforcementLabel,
    recordedWeek,
  })
}

/** Hydration: canonical non-mission enforcement ledger keyed by deterministic record id. */
export function sanitizeAffiliationFileWorkQueueNonMissionEnforcementRecords(
  value: unknown,
  fallback: AffiliationFileWorkQueueNonMissionEnforcementRecordsMap = {}
): AffiliationFileWorkQueueNonMissionEnforcementRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: AffiliationFileWorkQueueNonMissionEnforcementRecordsMap = {}
  const seenIds = new Set<string>()

  for (const [key, entry] of Object.entries(value)) {
    const record = sanitizeNonMissionEnforcementRecordEntry(entry, key)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}
