/**
 * SPE-2108 slice 3: weekly retention-decay expiry and rediscovery-loop advance for persisted
 * self-censoring information records.
 *
 * Pure deterministic tick: each week decrements retentionDecayTimer until expiry (field cleared);
 * when the simulation week reaches rediscoveryLoop.lastAlarmWeek, decrement loopCount and clear
 * alarm refs when the loop completes. Does not add persistence fields or mutate unrelated record data.
 */

import {
  validateSelfCensoringInformationRecord,
  type RediscoveryLoop,
  type SelfCensoringInformationRecord,
  type SelfCensoringInformationRecordsMap,
} from './selfCensoringInformationRegistry'

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function isFiniteWeek(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value === Math.trunc(value)
}

function isValidLoopCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value === Math.trunc(value)
}

function freezeRecord(record: SelfCensoringInformationRecord): SelfCensoringInformationRecord {
  return Object.freeze({ ...record })
}

/** Rediscovery alarm due week from lastAlarmWeek; undefined when no alarm is scheduled. */
export function resolveSelfCensoringRediscoveryAlarmDueWeek(
  record: SelfCensoringInformationRecord
): number | undefined {
  const loop = record.rediscoveryLoop
  if (!loop || !isValidLoopCount(loop.loopCount) || loop.loopCount === 0) {
    return undefined
  }

  const lastAlarmWeek = loop.lastAlarmWeek
  return isFiniteWeek(lastAlarmWeek) ? lastAlarmWeek : undefined
}

function resolveNextRetentionDecayTimer(
  timer: number | undefined
): number | undefined {
  if (!isFiniteWeek(timer)) {
    return undefined
  }

  if (timer <= 1) {
    return undefined
  }

  return timer - 1
}

function resolveNextRediscoveryLoop(
  loop: RediscoveryLoop | undefined,
  week: number
): RediscoveryLoop | undefined {
  if (!loop || !isValidLoopCount(loop.loopCount) || loop.loopCount === 0) {
    return loop
  }

  const lastAlarmWeek = loop.lastAlarmWeek
  if (!isFiniteWeek(lastAlarmWeek) || week < lastAlarmWeek) {
    return loop
  }

  const nextLoopCount = loop.loopCount - 1
  if (nextLoopCount === 0) {
    return { loopCount: 0 }
  }

  const forgottenWarningRefs = loop.forgottenWarningRefs
  return {
    loopCount: nextLoopCount,
    ...(forgottenWarningRefs && forgottenWarningRefs.length > 0
      ? { forgottenWarningRefs }
      : {}),
  }
}

function buildCandidateRecord(
  record: SelfCensoringInformationRecord,
  week: number
): SelfCensoringInformationRecord {
  const nextRetentionDecayTimer = resolveNextRetentionDecayTimer(record.retentionDecayTimer)
  const nextRediscoveryLoop = resolveNextRediscoveryLoop(record.rediscoveryLoop, week)

  const retentionChanged = nextRetentionDecayTimer !== record.retentionDecayTimer
  const rediscoveryChanged = nextRediscoveryLoop !== record.rediscoveryLoop

  if (!retentionChanged && !rediscoveryChanged) {
    return record
  }

  const withRetention: SelfCensoringInformationRecord = retentionChanged
    ? nextRetentionDecayTimer === undefined
      ? (() => {
          const { retentionDecayTimer: _retentionDecayTimer, ...withoutTimer } = record
          void _retentionDecayTimer
          return withoutTimer
        })()
      : { ...record, retentionDecayTimer: nextRetentionDecayTimer }
    : record

  if (!rediscoveryChanged) {
    return withRetention
  }

  if (nextRediscoveryLoop === undefined) {
    const { rediscoveryLoop: _rediscoveryLoop, ...withoutLoop } = withRetention
    void _rediscoveryLoop
    return withoutLoop
  }

  return {
    ...withRetention,
    rediscoveryLoop: nextRediscoveryLoop,
  }
}

/**
 * Advances one record for the simulation week: retention timer countdown and rediscovery due-week.
 * Returns the same reference when no bounded field changes.
 */
export function advanceSelfCensoringInformationRecordForWeek(
  record: SelfCensoringInformationRecord,
  week: number
): SelfCensoringInformationRecord {
  const normalizedWeek = normalizeWeek(week)
  const candidate = buildCandidateRecord(record, normalizedWeek)

  if (candidate === record) {
    return record
  }

  if (!validateSelfCensoringInformationRecord(candidate).valid) {
    return record
  }

  return freezeRecord(candidate)
}

/**
 * Applies one weekly retention/rediscovery pass over persisted self-censoring information records.
 * Empty map is a no-op. Re-applying after advance is idempotent for the same week.
 */
export function applyWeeklySelfCensoringInformationTick(
  records: SelfCensoringInformationRecordsMap | null | undefined,
  week: number
): SelfCensoringInformationRecordsMap {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return safeRecords
  }

  const normalizedWeek = normalizeWeek(week)
  const next: SelfCensoringInformationRecordsMap = { ...safeRecords }
  let changed = false

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const advanced = advanceSelfCensoringInformationRecordForWeek(record, normalizedWeek)
    if (advanced !== record) {
      next[recordId] = advanced
      changed = true
    }
  }

  return changed ? next : safeRecords
}
