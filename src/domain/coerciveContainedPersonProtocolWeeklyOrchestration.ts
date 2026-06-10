/**
 * SPE-1882 slice 3: weekly orchestration for persisted coercive protocol records.
 *
 * Pure deterministic tick: runs tradeoff and coercion-risk projections each week
 * while preserving source records. Does not mutate welfare-debt accounting,
 * implement contradiction-check siblings, or add persistence fields.
 */

import {
  projectCoerciveProtocolRiskReview,
  projectContainmentCareTradeoff,
  type CoerciveProtocolId,
  type CoerciveProtocolRecord,
  type CoerciveProtocolRecordsMap,
  type CoerciveProtocolRiskReviewProjection,
  type ContainmentCareTradeoffProjection,
} from './coerciveContainedPersonProtocolRegistry'

export interface CoerciveProtocolWeeklyProjectionBundle {
  readonly recordId: CoerciveProtocolId
  readonly week: number
  readonly tradeoff: ContainmentCareTradeoffProjection
  readonly riskReview: CoerciveProtocolRiskReviewProjection
}

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

/**
 * Builds the deterministic weekly projection bundle for one protocol record.
 * Projections are derived from registry slice 1 helpers only.
 */
export function buildCoerciveProtocolWeeklyProjectionBundle(
  record: CoerciveProtocolRecord,
  week: number
): CoerciveProtocolWeeklyProjectionBundle {
  return Object.freeze({
    recordId: record.id,
    week: normalizeWeek(week),
    tradeoff: projectContainmentCareTradeoff(record),
    riskReview: projectCoerciveProtocolRiskReview(record),
  })
}

/**
 * Projects all persisted protocol records for the simulation week in stable id order.
 * Returns an empty frozen array when the map is empty.
 */
export function projectCoerciveProtocolRecordsForWeek(
  records: CoerciveProtocolRecordsMap | null | undefined,
  week: number
): readonly CoerciveProtocolWeeklyProjectionBundle[] {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return Object.freeze([])
  }

  const normalizedWeek = normalizeWeek(week)
  const bundles: CoerciveProtocolWeeklyProjectionBundle[] = []

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    bundles.push(buildCoerciveProtocolWeeklyProjectionBundle(record, normalizedWeek))
  }

  return Object.freeze(bundles)
}

/**
 * Applies one weekly orchestration pass over persisted coercive protocol records.
 * Runs deterministic projections but preserves source records byte-stable.
 * Empty map is a no-op. Re-applying after advance is idempotent for the same week.
 */
export function applyWeeklyCoerciveProtocolTick(
  records: CoerciveProtocolRecordsMap | null | undefined,
  week: number
): CoerciveProtocolRecordsMap {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return safeRecords
  }

  projectCoerciveProtocolRecordsForWeek(safeRecords, week)

  return safeRecords
}
