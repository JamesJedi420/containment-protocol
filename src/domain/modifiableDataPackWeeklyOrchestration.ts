/**
 * SPE-2493 slice 2: weekly governance orchestration for persisted modifiable data-pack records.
 *
 * Pure deterministic tick: re-validates hydrated records, drops invalid entries without
 * re-importing rejected payloads, and emits governance receipts for needs_revision observation.
 * Applied records are idempotent skips with no report notes.
 */

import {
  validateModifiableDataPackRecord,
  type DataPackValidationPolicy,
  type DataPackReasonCode,
  type ModifiableDataPackImportStatus,
  type ModifiableDataPackRecord,
  type ModifiableDataPackRecordsMap,
} from './modifiableDataPackValidation'

export type ModifiableDataPackWeeklyTickOutcome = 'observed' | 'skipped' | 'removed'

export type ModifiableDataPackWeeklyTickSkipCode = 'import_status_stable'

export interface ModifiableDataPackWeeklyTickReceipt {
  readonly packId: string
  readonly outcome: ModifiableDataPackWeeklyTickOutcome
  readonly executionWeek: number
  readonly importStatus: ModifiableDataPackImportStatus
  readonly skipCode?: ModifiableDataPackWeeklyTickSkipCode
  readonly reasonCodes: readonly DataPackReasonCode[]
}

export interface ModifiableDataPackWeeklyTickResult {
  readonly records: ModifiableDataPackRecordsMap
  readonly receipts: readonly ModifiableDataPackWeeklyTickReceipt[]
}

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function freezeReceipt(receipt: ModifiableDataPackWeeklyTickReceipt): ModifiableDataPackWeeklyTickReceipt {
  return Object.freeze({
    ...receipt,
    reasonCodes: Object.freeze([...receipt.reasonCodes]),
  })
}

/**
 * Advances one persisted modifiable data-pack record for the simulation week.
 * Invalid records are removed; applied records skip; needs_revision records are observed.
 */
export function advanceModifiableDataPackRecordForWeek(
  record: ModifiableDataPackRecord,
  week: number,
  policy?: DataPackValidationPolicy
): {
  readonly record: ModifiableDataPackRecord | null
  readonly receipt: ModifiableDataPackWeeklyTickReceipt
} {
  const normalizedWeek = normalizeWeek(week)
  const validation = validateModifiableDataPackRecord(record, policy)

  if (!validation.valid) {
    return {
      record: null,
      receipt: freezeReceipt({
        packId: record.packId,
        outcome: 'removed',
        executionWeek: normalizedWeek,
        importStatus: record.importStatus,
        reasonCodes: Object.freeze([]),
      }),
    }
  }

  if (record.importStatus === 'needs_revision') {
    return {
      record,
      receipt: freezeReceipt({
        packId: record.packId,
        outcome: 'observed',
        executionWeek: normalizedWeek,
        importStatus: 'needs_revision',
        reasonCodes: record.reasonCodes,
      }),
    }
  }

  return {
    record,
    receipt: freezeReceipt({
      packId: record.packId,
      outcome: 'skipped',
      executionWeek: normalizedWeek,
      importStatus: 'applied',
      skipCode: 'import_status_stable',
      reasonCodes: record.reasonCodes,
    }),
  }
}

/**
 * One deterministic weekly governance pass over persisted modifiable data-pack records.
 * Empty map is a no-op. Re-applying for the same week on stable applied records is idempotent.
 */
export function applyWeeklyModifiableDataPackGovernanceTick(
  records: ModifiableDataPackRecordsMap | null | undefined,
  week: number,
  policy?: DataPackValidationPolicy
): ModifiableDataPackWeeklyTickResult {
  const safeRecords = records ?? {}
  const packIds = Object.keys(safeRecords).sort((left, right) => left.localeCompare(right))

  if (packIds.length === 0) {
    return {
      records: safeRecords,
      receipts: Object.freeze([]),
    }
  }

  const next: ModifiableDataPackRecordsMap = {}
  const receipts: ModifiableDataPackWeeklyTickReceipt[] = []
  let changed = false

  for (const packId of packIds) {
    const record = safeRecords[packId]
    if (!record) {
      continue
    }

    const advanced = advanceModifiableDataPackRecordForWeek(record, week, policy)

    receipts.push(advanced.receipt)

    if (advanced.record === null) {
      changed = true
      continue
    }

    if (advanced.record !== record) {
      changed = true
    }

    next[packId] = advanced.record
  }

  return {
    records: changed ? next : safeRecords,
    receipts: Object.freeze(receipts.map((receipt) => freezeReceipt(receipt))),
  }
}
