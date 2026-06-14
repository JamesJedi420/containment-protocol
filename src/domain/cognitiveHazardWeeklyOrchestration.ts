/**
 * SPE-1309 slice 3: weekly orchestration for persisted cognitive hazard exposure records.
 *
 * Pure deterministic tick: project exposure review signals and advance memoryImpairmentBand
 * one bounded step when fear/memetic/countermeasure thresholds warrant. Sibling trigger-channel
 * compose uses slice 1 `inferTriggerChannelsFromPropagationResistance` without mutating
 * SPE-2108 / SPE-2116 weekly hooks.
 */

import {
  inferTriggerChannelsFromPropagationResistance,
  projectCognitiveHazardExposureReview,
  validateCognitiveHazardExposureRecord,
  type CognitiveHazardExposureRecord,
  type CognitiveHazardExposureRecordsMap,
  type CognitiveHazardExposureReview,
  type CognitiveHazardMemoryImpairmentBand,
  type CognitiveHazardTriggerChannel,
} from './cognitiveHazardEngine'
import type { PropagationResistanceTag } from './selfCensoringInformationRegistry'

const FRAGMENTED_ESCALATION_PRESSURE_THRESHOLD = 0.55
const ERASED_ESCALATION_PRESSURE_THRESHOLD = 0.75

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function freezeRecord(record: CognitiveHazardExposureRecord): CognitiveHazardExposureRecord {
  return Object.freeze({ ...record })
}

function sortedUniqueTriggerChannels(
  channels: readonly CognitiveHazardTriggerChannel[]
): readonly CognitiveHazardTriggerChannel[] {
  return Object.freeze([...new Set(channels)].sort((left, right) => left.localeCompare(right)))
}

/** Target memory impairment band from weekly projection signals; undefined when no transition applies. */
export function resolveTargetMemoryImpairmentBandFromProjection(
  record: CognitiveHazardExposureRecord,
  projection: CognitiveHazardExposureReview
): CognitiveHazardMemoryImpairmentBand | undefined {
  const band = record.memoryImpairmentBand
  const reviewBand = projection.exposureReviewBand
  const aggregatePressure = projection.aggregateExposurePressure

  if (band === 'erased') {
    return undefined
  }

  if (reviewBand === 'stable') {
    return undefined
  }

  if (band === 'intact') {
    return 'fragmented'
  }

  if (band === 'fragmented') {
    if (aggregatePressure !== null && aggregatePressure >= FRAGMENTED_ESCALATION_PRESSURE_THRESHOLD) {
      return 'compromised'
    }

    return undefined
  }

  if (band === 'compromised') {
    if (reviewBand !== 'critical') {
      return undefined
    }

    if (
      projection.countermeasureFailed ||
      (aggregatePressure !== null && aggregatePressure >= ERASED_ESCALATION_PRESSURE_THRESHOLD)
    ) {
      return 'erased'
    }

    return undefined
  }

  return undefined
}

function applyMemoryBandEffectFlags(
  record: CognitiveHazardExposureRecord,
  targetBand: CognitiveHazardMemoryImpairmentBand
): Pick<CognitiveHazardExposureRecord, 'knowledgeIntegrityDegraded' | 'agentDutyDegraded'> {
  if (targetBand === 'fragmented' || targetBand === 'compromised' || targetBand === 'erased') {
    return {
      knowledgeIntegrityDegraded: true,
      ...(targetBand === 'compromised' || targetBand === 'erased' ? { agentDutyDegraded: true } : {}),
    }
  }

  return {}
}

/**
 * Merges sibling propagation-resistance tags into active trigger channels via slice 1 attach helper.
 * Returns undefined when no new channels would be added.
 */
export function mergePropagationResistanceTriggerChannels(
  record: CognitiveHazardExposureRecord,
  propagationResistance: readonly PropagationResistanceTag[] | undefined
): CognitiveHazardExposureRecord | undefined {
  const inferred = inferTriggerChannelsFromPropagationResistance(propagationResistance)
  if (inferred.length === 0) {
    return undefined
  }

  const merged = sortedUniqueTriggerChannels([
    ...record.activeTriggerChannels,
    ...inferred,
  ])

  if (
    merged.length === record.activeTriggerChannels.length &&
    merged.every((channel, index) => channel === record.activeTriggerChannels[index])
  ) {
    return undefined
  }

  return {
    ...record,
    activeTriggerChannels: merged,
  }
}

function buildWeeklyAdvanceCandidate(
  record: CognitiveHazardExposureRecord
): CognitiveHazardExposureRecord | undefined {
  const projection = projectCognitiveHazardExposureReview(record)
  const targetBand = resolveTargetMemoryImpairmentBandFromProjection(record, projection)

  if (!targetBand || targetBand === record.memoryImpairmentBand) {
    return undefined
  }

  const effectFlags = applyMemoryBandEffectFlags(record, targetBand)

  return {
    ...record,
    memoryImpairmentBand: targetBand,
    ...effectFlags,
  }
}

/**
 * Advances one cognitive hazard exposure record for the simulation week using projected exposure semantics.
 * Returns the same reference when no bounded field changes.
 */
export function advanceCognitiveHazardExposureRecordForWeek(
  record: CognitiveHazardExposureRecord,
  week: number
): CognitiveHazardExposureRecord {
  normalizeWeek(week)
  const candidate = buildWeeklyAdvanceCandidate(record)
  if (!candidate) {
    return record
  }

  if (!validateCognitiveHazardExposureRecord(candidate).valid) {
    return record
  }

  return freezeRecord(candidate)
}

/**
 * Applies one weekly cognitive-hazard exposure pass over persisted records.
 * Empty map is a no-op. Re-applying after advance is idempotent for the same week.
 */
export function applyWeeklyCognitiveHazardExposureTick(
  records: CognitiveHazardExposureRecordsMap | null | undefined,
  week: number
): CognitiveHazardExposureRecordsMap {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return safeRecords
  }

  const normalizedWeek = normalizeWeek(week)
  const next: CognitiveHazardExposureRecordsMap = { ...safeRecords }
  let changed = false

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const advanced = advanceCognitiveHazardExposureRecordForWeek(record, normalizedWeek)
    if (advanced !== record) {
      next[recordId] = advanced
      changed = true
    }
  }

  return changed ? next : safeRecords
}
