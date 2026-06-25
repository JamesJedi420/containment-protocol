/**
 * SPE-2520: conservative weekly progression for durable affiliation person-status records.
 *
 * Applies authored weekly evidence entries without removing existing evidence. Mission routing
 * continues to read the bounded evidence fields only; weeklyProgression remains persisted for audit.
 */

import type {
  AffiliationPersonStatusRecord,
  AffiliationPersonStatusRecordsMap,
  AffiliationPersonStatusWeeklyProgressionEntry,
} from './affiliationPersonStatusRecords'

const STRING_LIST_FIELDS = [
  'grantedSiteIds',
  'restrictedSiteIds',
  'blockedSiteIds',
  'grantedFacilityIds',
  'restrictedFacilityIds',
  'blockedFacilityIds',
  'protectedReviewEvidenceRefs',
  'revocationReviewEvidenceRefs',
] as const satisfies readonly (keyof AffiliationPersonStatusWeeklyProgressionEntry &
  keyof AffiliationPersonStatusRecord)[]

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
    (left, right) => left.localeCompare(right)
  )
}

function mergeBooleanEvidence(
  current: boolean | undefined,
  authored: boolean | undefined
): boolean | undefined {
  if (authored === undefined) {
    return current
  }

  return current === true ? true : authored
}

function mergeStringEvidence(
  current: readonly string[] | undefined,
  authored: readonly string[] | undefined
): readonly string[] | undefined {
  if (!authored || authored.length === 0) {
    return current
  }

  return uniqueSorted([...(current ?? []), ...authored])
}

function arraysEqual(left: readonly string[] | undefined, right: readonly string[] | undefined) {
  const leftValues = left ?? []
  const rightValues = right ?? []
  return (
    leftValues.length === rightValues.length &&
    leftValues.every((value, index) => value === rightValues[index])
  )
}

function sortedDueEntries(
  record: AffiliationPersonStatusRecord,
  week: number
): readonly AffiliationPersonStatusWeeklyProgressionEntry[] {
  return [...(record.weeklyProgression ?? [])]
    .filter((entry) => entry.week <= week)
    .sort((left, right) => {
      const weekCompare = left.week - right.week
      return weekCompare !== 0 ? weekCompare : left.id.localeCompare(right.id)
    })
}

/**
 * Advances one durable person-status record for the target simulation week.
 * Returns the same reference when no bounded evidence field changes.
 */
export function advanceAffiliationPersonStatusRecordForWeek(
  record: AffiliationPersonStatusRecord,
  week: number
): AffiliationPersonStatusRecord {
  const entries = sortedDueEntries(record, normalizeWeek(week))
  if (entries.length === 0) {
    return record
  }

  let next: AffiliationPersonStatusRecord = record
  let changed = false

  for (const entry of entries) {
    const backgroundCleared = mergeBooleanEvidence(next.backgroundCleared, entry.backgroundCleared)
    const trainingCompleted = mergeBooleanEvidence(next.trainingCompleted, entry.trainingCompleted)
    const oathContractSigned = mergeBooleanEvidence(
      next.oathContractSigned,
      entry.oathContractSigned
    )

    const candidate: AffiliationPersonStatusRecord = {
      ...next,
      ...(backgroundCleared !== undefined ? { backgroundCleared } : {}),
      ...(trainingCompleted !== undefined ? { trainingCompleted } : {}),
      ...(oathContractSigned !== undefined ? { oathContractSigned } : {}),
    }
    const candidateWithLists = candidate as AffiliationPersonStatusRecord &
      Partial<Record<(typeof STRING_LIST_FIELDS)[number], readonly string[]>>

    for (const field of STRING_LIST_FIELDS) {
      const merged = mergeStringEvidence(next[field], entry[field])
      if (merged && !arraysEqual(next[field], merged)) {
        candidateWithLists[field] = merged
      }
    }

    if (
      candidate.backgroundCleared !== next.backgroundCleared ||
      candidate.trainingCompleted !== next.trainingCompleted ||
      candidate.oathContractSigned !== next.oathContractSigned ||
      STRING_LIST_FIELDS.some((field) => !arraysEqual(candidate[field], next[field]))
    ) {
      next = Object.freeze(candidate)
      changed = true
    }
  }

  return changed ? next : record
}

/**
 * Applies one weekly progression pass across durable person-status records.
 * Empty maps are no-ops and repeated ticks at the same week are idempotent.
 */
export function applyWeeklyAffiliationPersonStatusProgressionTick(
  records: AffiliationPersonStatusRecordsMap | null | undefined,
  week: number
): AffiliationPersonStatusRecordsMap {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return safeRecords
  }

  const normalizedWeek = normalizeWeek(week)
  const next: AffiliationPersonStatusRecordsMap = { ...safeRecords }
  let changed = false

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const advanced = advanceAffiliationPersonStatusRecordForWeek(record, normalizedWeek)
    if (advanced !== record) {
      next[recordId] = advanced
      changed = true
    }
  }

  return changed ? next : safeRecords
}
