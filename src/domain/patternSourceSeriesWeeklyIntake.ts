/**
 * SPE-2110 slice 3: weekly readiness-gated processing-pipeline advance for persisted
 * pattern source series intake records.
 *
 * Pure deterministic tick: when readinessScore meets the gate for the current processingStatus,
 * advance one pipeline step and decrement readiness so re-tick in the same week is idempotent.
 * Does not add persistence fields or mutate unrelated record data.
 */

import {
  validatePatternSourceSeriesRecord,
  type PatternSourceSeriesRecord,
  type PatternSourceSeriesRecordsMap,
  type ProcessingStatus,
} from './patternSourceSeriesRegistry'

const READINESS_ADVANCE_COST = 0.3

const PIPELINE_NEXT_STATUS: Readonly<Partial<Record<ProcessingStatus, ProcessingStatus>>> = {
  unqueued: 'blurb_triaged',
  blurb_triaged: 'deep_pass',
  deep_pass: 'reconciled',
}

const READINESS_GATE_BY_STATUS: Readonly<Partial<Record<ProcessingStatus, number>>> = {
  unqueued: 0.1,
  blurb_triaged: 0.25,
  deep_pass: 0.5,
}

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function freezeRecord(record: PatternSourceSeriesRecord): PatternSourceSeriesRecord {
  return Object.freeze({ ...record })
}

function processingHistory(record: PatternSourceSeriesRecord): readonly ProcessingStatus[] {
  return record.processingHistory ?? []
}

function recordMatchesProcessingHistory(record: PatternSourceSeriesRecord): boolean {
  const history = processingHistory(record)
  if (history.length === 0) {
    return true
  }

  const last = history[history.length - 1]
  return last === record.processingStatus
}

/** Next pipeline status when the current status is eligible for auto-advance; undefined at terminal. */
export function resolvePatternSourceSeriesPipelineNextStatus(
  processingStatus: ProcessingStatus
): ProcessingStatus | undefined {
  return PIPELINE_NEXT_STATUS[processingStatus]
}

/** Minimum readinessScore required to advance from the current processing status. */
export function resolvePatternSourceSeriesReadinessGate(
  processingStatus: ProcessingStatus
): number | undefined {
  return READINESS_GATE_BY_STATUS[processingStatus]
}

function resolveNextReadinessScore(current: number): number {
  return Math.max(0, current - READINESS_ADVANCE_COST)
}

function appendProcessingHistory(
  record: PatternSourceSeriesRecord,
  nextStatus: ProcessingStatus
): readonly ProcessingStatus[] {
  const history = [...processingHistory(record)]
  const last = history[history.length - 1]

  if (last === nextStatus) {
    return history
  }

  history.push(nextStatus)
  return history
}

function buildPipelineAdvanceCandidate(
  record: PatternSourceSeriesRecord
): PatternSourceSeriesRecord | undefined {
  if (!recordMatchesProcessingHistory(record)) {
    return undefined
  }

  const nextStatus = resolvePatternSourceSeriesPipelineNextStatus(record.processingStatus)
  if (!nextStatus) {
    return undefined
  }

  const readinessGate = resolvePatternSourceSeriesReadinessGate(record.processingStatus)
  if (readinessGate === undefined || record.readinessScore < readinessGate) {
    return undefined
  }

  const nextReadinessScore = resolveNextReadinessScore(record.readinessScore)
  const nextHistory = appendProcessingHistory(record, nextStatus)

  return {
    ...record,
    processingStatus: nextStatus,
    readinessScore: nextReadinessScore,
    ...(nextHistory.length > 0 ? { processingHistory: nextHistory } : {}),
  }
}

/**
 * Advances one record when readiness meets the pipeline gate for the current processing status.
 * Returns the same reference when no bounded field changes.
 */
export function advancePatternSourceSeriesRecordForWeek(
  record: PatternSourceSeriesRecord,
  week: number
): PatternSourceSeriesRecord {
  void normalizeWeek(week)

  const candidate = buildPipelineAdvanceCandidate(record)
  if (!candidate) {
    return record
  }

  if (!validatePatternSourceSeriesRecord(candidate).valid) {
    return record
  }

  return freezeRecord(candidate)
}

/**
 * Applies one weekly intake pipeline pass over persisted pattern source series records.
 * Empty map is a no-op. Re-applying after advance is idempotent for the same week.
 */
export function applyWeeklyPatternSourceSeriesIntakeTick(
  records: PatternSourceSeriesRecordsMap | null | undefined,
  week: number
): PatternSourceSeriesRecordsMap {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return safeRecords
  }

  const normalizedWeek = normalizeWeek(week)
  const next: PatternSourceSeriesRecordsMap = { ...safeRecords }
  let changed = false

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const advanced = advancePatternSourceSeriesRecordForWeek(record, normalizedWeek)
    if (advanced !== record) {
      next[recordId] = advanced
      changed = true
    }
  }

  return changed ? next : safeRecords
}
