/**
 * SPE-2111 slice 3: weekly orchestration for persisted visual-trigger hazard records.
 *
 * Pure deterministic tick: disposal-deadline compliance posture on hazardous media,
 * scheduled observer-awareness-band transitions when exposurePathWeeks is authored,
 * and occlusion-driven pursuit resolution. Does not add persistence fields or mutate
 * unrelated record data.
 */

import {
  OBSERVER_AWARENESS_BANDS,
  observerAwarenessEscalation,
  resolveDisposalDeadlineCompliance,
  resolvePursuitStateAfterOcclusion,
  validateVisualTriggerHazardRecord,
  type HazardousMediaInstance,
  type MediaSweepStatus,
  type ObserverAwarenessBand,
  type VisualTriggerHazardRecord,
  type VisualTriggerHazardRecordsMap,
} from './visualTriggerHazardRegistry'

const SWEEP_STATUS_ADVANCE: Readonly<Partial<Record<MediaSweepStatus, MediaSweepStatus>>> = {
  none: 'scheduled',
  scheduled: 'in_progress',
}

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function isFiniteWeek(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value === Math.trunc(value)
}

function freezeRecord(record: VisualTriggerHazardRecord): VisualTriggerHazardRecord {
  return Object.freeze({ ...record })
}

function freezeMediaInstance(instance: HazardousMediaInstance): HazardousMediaInstance {
  return Object.freeze({ ...instance })
}

/** Due week for the next scheduled observer-awareness-band step; undefined when not authored. */
export function resolveVisualTriggerHazardScheduledAwarenessDueWeek(
  record: VisualTriggerHazardRecord
): number | undefined {
  return isFiniteWeek(record.exposurePathWeeks) ? record.exposurePathWeeks : undefined
}

/** Next observer-awareness band on the ladder; undefined when already at full or invalid. */
export function resolveNextObserverAwarenessBand(
  band: ObserverAwarenessBand | undefined
): ObserverAwarenessBand | undefined {
  const current = band ?? 'unaware'
  const index = OBSERVER_AWARENESS_BANDS.indexOf(current)
  if (index < 0 || index >= OBSERVER_AWARENESS_BANDS.length - 1) {
    return undefined
  }

  return OBSERVER_AWARENESS_BANDS[index + 1]
}

/** Next sweep status when compliance posture requires sweep advance; undefined when no step applies. */
export function resolveNextSweepStatusForCompliancePosture(
  sweepStatus: MediaSweepStatus
): MediaSweepStatus | undefined {
  return SWEEP_STATUS_ADVANCE[sweepStatus]
}

function applyDisposalCompliancePosture(
  record: VisualTriggerHazardRecord,
  week: number
): VisualTriggerHazardRecord {
  const instances = record.hazardousMediaInstances
  if (!instances || instances.length === 0) {
    return record
  }

  const compliance = resolveDisposalDeadlineCompliance(record, week)
  if (compliance.pendingComplianceMediaInstanceIds.length === 0) {
    return record
  }

  const pendingIds = new Set(compliance.pendingComplianceMediaInstanceIds)
  const requiresSweep = compliance.requiredActions.includes('sweep')
  if (!requiresSweep) {
    return record
  }

  let changed = false
  const nextInstances = instances.map((instance) => {
    if (!pendingIds.has(instance.mediaInstanceId)) {
      return instance
    }

    const nextSweepStatus = resolveNextSweepStatusForCompliancePosture(instance.sweepStatus)
    if (!nextSweepStatus || nextSweepStatus === instance.sweepStatus) {
      return instance
    }

    changed = true
    return freezeMediaInstance({
      ...instance,
      sweepStatus: nextSweepStatus,
    })
  })

  if (!changed) {
    return record
  }

  return {
    ...record,
    hazardousMediaInstances: nextInstances,
  }
}

function applyScheduledAwarenessBandTransition(
  record: VisualTriggerHazardRecord,
  week: number
): VisualTriggerHazardRecord {
  const dueWeek = resolveVisualTriggerHazardScheduledAwarenessDueWeek(record)
  if (dueWeek === undefined || week < dueWeek) {
    return record
  }

  const priorBand = record.observerAwarenessBand ?? 'unaware'
  const nextBand = resolveNextObserverAwarenessBand(priorBand)
  if (!nextBand || nextBand === priorBand) {
    return record
  }

  const escalation = observerAwarenessEscalation(record, priorBand, nextBand)

  return {
    ...record,
    observerAwarenessBand: nextBand,
    pursuitState: escalation.pursuitState,
  }
}

function applyOcclusionPursuitResolution(record: VisualTriggerHazardRecord): VisualTriggerHazardRecord {
  const nextPursuitState = resolvePursuitStateAfterOcclusion(record)
  if (nextPursuitState === record.pursuitState) {
    return record
  }

  return {
    ...record,
    pursuitState: nextPursuitState,
  }
}

function buildWeeklyAdvanceCandidate(
  record: VisualTriggerHazardRecord,
  week: number
): VisualTriggerHazardRecord | undefined {
  let current = record

  const afterCompliance = applyDisposalCompliancePosture(current, week)
  if (afterCompliance !== current) {
    current = afterCompliance
  }

  const afterAwareness = applyScheduledAwarenessBandTransition(current, week)
  if (afterAwareness !== current) {
    current = afterAwareness
  }

  const afterOcclusion = applyOcclusionPursuitResolution(current)
  if (afterOcclusion !== current) {
    current = afterOcclusion
  }

  return current === record ? undefined : current
}

/**
 * Advances one record for the simulation week: compliance posture, scheduled awareness band,
 * and occlusion pursuit resolution. Returns the same reference when no bounded field changes.
 */
export function advanceVisualTriggerHazardRecordForWeek(
  record: VisualTriggerHazardRecord,
  week: number
): VisualTriggerHazardRecord {
  const normalizedWeek = normalizeWeek(week)
  const candidate = buildWeeklyAdvanceCandidate(record, normalizedWeek)
  if (!candidate) {
    return record
  }

  if (!validateVisualTriggerHazardRecord(candidate).valid) {
    return record
  }

  return freezeRecord(candidate)
}

/**
 * Applies one weekly orchestration pass over persisted visual-trigger hazard records.
 * Empty map is a no-op. Re-applying after advance is idempotent for the same week.
 */
export function applyWeeklyVisualTriggerHazardTick(
  records: VisualTriggerHazardRecordsMap | null | undefined,
  week: number
): VisualTriggerHazardRecordsMap {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return safeRecords
  }

  const normalizedWeek = normalizeWeek(week)
  const next: VisualTriggerHazardRecordsMap = { ...safeRecords }
  let changed = false

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const advanced = advanceVisualTriggerHazardRecordForWeek(record, normalizedWeek)
    if (advanced !== record) {
      next[recordId] = advanced
      changed = true
    }
  }

  return changed ? next : safeRecords
}
