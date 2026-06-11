/**
 * SPE-848 slice 3: weekly orchestration for persisted surveillance intervention tuning records.
 *
 * Pure deterministic tick: reproject surveillance/contact/collateral signals, advance
 * intervention level when capacity and strain bands warrant bounded transitions, and
 * refresh short/medium/long horizon outcomes under the current intervention frame.
 */

import {
  projectSurveillanceInterventionTuningReview,
  validateSurveillanceInterventionTuningRecord,
  type InterventionHorizonOutcome,
  type InterventionHorizonOutcomes,
  type InterventionLevel,
  type SurveillanceInterventionTuningProjection,
  type SurveillanceInterventionTuningRecord,
  type SurveillanceInterventionTuningRecordsMap,
} from './surveillanceCapacityInterventionTuningRegistry'

const HIGH_SURVEILLANCE_ESCALATION_THRESHOLD = 0.65
const STRONG_SURVEILLANCE_ESCALATION_THRESHOLD = 0.75
const VERY_HIGH_SURVEILLANCE_ESCALATION_THRESHOLD = 0.8
const LOW_SURVEILLANCE_RELAXATION_THRESHOLD = 0.5
const MODERATE_SURVEILLANCE_DEESCALATION_THRESHOLD = 0.6
const HEALTHCARE_LOAD_CAPACITY_THRESHOLD = 0.4
const HEALTHCARE_LOAD_ESCALATION_THRESHOLD = 0.5
const HEALTHCARE_LOAD_RELAXATION_CEILING = 0.5
const HIGH_COLLATERAL_STRAIN_THRESHOLD = 0.55

const SUSTAINED_LEVELS: ReadonlySet<InterventionLevel> = new Set(['sustained', 'escalated'])

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function freezeRecord(
  record: SurveillanceInterventionTuningRecord
): SurveillanceInterventionTuningRecord {
  return Object.freeze({ ...record })
}

function resolveHealthcareLoadScore(record: SurveillanceInterventionTuningRecord): number | null {
  const score = record.healthcareLoadScore
  if (score === undefined || score === null) {
    return null
  }

  return score
}

function resolveCollateralStrainScore(record: SurveillanceInterventionTuningRecord): number | null {
  const score = record.collateralStrainScore
  if (score === undefined || score === null) {
    return null
  }

  return score
}

function horizonOutcomesEqual(
  left: InterventionHorizonOutcomes | undefined,
  right: InterventionHorizonOutcomes
): boolean {
  if (!left) {
    return false
  }

  return left.short === right.short && left.medium === right.medium && left.long === right.long
}

/** Target intervention level from weekly projection signals; undefined when no transition applies. */
export function resolveTargetInterventionLevelFromProjection(
  record: SurveillanceInterventionTuningRecord,
  projection: SurveillanceInterventionTuningProjection
): InterventionLevel | undefined {
  const level = record.currentInterventionLevel
  const surveillance = projection.surveillanceSignalScore
  const collateral = projection.collateralStrainScore ?? resolveCollateralStrainScore(record)
  const healthcareLoad = resolveHealthcareLoadScore(record)

  if (surveillance === null) {
    return undefined
  }

  if (
    (level === 'sustained' || level === 'escalated') &&
    collateral !== null &&
    collateral >= HIGH_COLLATERAL_STRAIN_THRESHOLD &&
    surveillance < LOW_SURVEILLANCE_RELAXATION_THRESHOLD
  ) {
    return 'alternative_support'
  }

  if (
    SUSTAINED_LEVELS.has(level) &&
    projection.sustainedUnderCollateralStrain &&
    healthcareLoad !== null &&
    healthcareLoad < HEALTHCARE_LOAD_RELAXATION_CEILING
  ) {
    return 'alternative_support'
  }

  if (
    level === 'escalated' &&
    collateral !== null &&
    collateral >= HIGH_COLLATERAL_STRAIN_THRESHOLD &&
    surveillance < MODERATE_SURVEILLANCE_DEESCALATION_THRESHOLD
  ) {
    return 'sustained'
  }

  if (
    level === 'relaxed' &&
    surveillance >= HIGH_SURVEILLANCE_ESCALATION_THRESHOLD &&
    (projection.monitoringExceedsContact ||
      (healthcareLoad !== null && healthcareLoad >= HEALTHCARE_LOAD_CAPACITY_THRESHOLD))
  ) {
    return 'sustained'
  }

  if (
    level === 'alternative_support' &&
    surveillance >= STRONG_SURVEILLANCE_ESCALATION_THRESHOLD &&
    projection.monitoringExceedsContact &&
    (collateral === null || collateral < HIGH_COLLATERAL_STRAIN_THRESHOLD)
  ) {
    return 'sustained'
  }

  if (
    level === 'sustained' &&
    surveillance >= VERY_HIGH_SURVEILLANCE_ESCALATION_THRESHOLD &&
    projection.monitoringExceedsContact &&
    healthcareLoad !== null &&
    healthcareLoad >= HEALTHCARE_LOAD_ESCALATION_THRESHOLD
  ) {
    return 'escalated'
  }

  return undefined
}

/** Refreshes horizon outcome bands from the current intervention frame and projection signals. */
export function deriveWeeklyInterventionHorizonOutcomes(
  record: SurveillanceInterventionTuningRecord,
  projection: SurveillanceInterventionTuningProjection
): InterventionHorizonOutcomes {
  const short: InterventionHorizonOutcome = projection.monitoringExceedsContact
    ? 'elevated_isolation_pressure'
    : 'contact_recovery_signal'

  const medium: InterventionHorizonOutcome =
    projection.sustainedUnderCollateralStrain ||
    (projection.collateralStrainScore !== null &&
      projection.collateralStrainScore >= HIGH_COLLATERAL_STRAIN_THRESHOLD)
      ? 'collateral_strain_elevated'
      : 'compliance_metric_stable'

  let longOutcome: InterventionHorizonOutcome = 'compliance_metric_stable'
  if (record.currentInterventionLevel === 'alternative_support') {
    longOutcome = 'contact_recovery_signal'
  } else if (projection.sustainedUnderCollateralStrain) {
    longOutcome = 'legitimacy_erosion_risk'
  }

  return Object.freeze({
    short,
    medium: medium,
    long: longOutcome,
  })
}

function buildWeeklyAdvanceCandidate(
  record: SurveillanceInterventionTuningRecord
): SurveillanceInterventionTuningRecord | undefined {
  const projection = projectSurveillanceInterventionTuningReview(record)
  const targetLevel = resolveTargetInterventionLevelFromProjection(record, projection)
  const horizonOutcomes = deriveWeeklyInterventionHorizonOutcomes(
    targetLevel ? { ...record, currentInterventionLevel: targetLevel } : record,
    projection
  )

  const levelChanged = targetLevel !== undefined && targetLevel !== record.currentInterventionLevel
  const horizonsChanged = !horizonOutcomesEqual(record.horizonOutcomes, horizonOutcomes)

  if (!levelChanged && !horizonsChanged) {
    return undefined
  }

  return {
    ...record,
    ...(levelChanged ? { currentInterventionLevel: targetLevel } : {}),
    horizonOutcomes,
  }
}

/**
 * Advances one tuning record for the simulation week using projected signal semantics.
 * Returns the same reference when no bounded field changes.
 */
export function advanceSurveillanceInterventionTuningRecordForWeek(
  record: SurveillanceInterventionTuningRecord,
  week: number
): SurveillanceInterventionTuningRecord {
  normalizeWeek(week)
  const candidate = buildWeeklyAdvanceCandidate(record)
  if (!candidate) {
    return record
  }

  if (!validateSurveillanceInterventionTuningRecord(candidate).valid) {
    return record
  }

  return freezeRecord(candidate)
}

/**
 * Applies one weekly surveillance-intervention tuning pass over persisted records.
 * Empty map is a no-op. Re-applying after advance is idempotent for the same week.
 */
export function applyWeeklySurveillanceInterventionTuningTick(
  records: SurveillanceInterventionTuningRecordsMap | null | undefined,
  week: number
): SurveillanceInterventionTuningRecordsMap {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return safeRecords
  }

  const normalizedWeek = normalizeWeek(week)
  const next: SurveillanceInterventionTuningRecordsMap = { ...safeRecords }
  let changed = false

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const advanced = advanceSurveillanceInterventionTuningRecordForWeek(record, normalizedWeek)
    if (advanced !== record) {
      next[recordId] = advanced
      changed = true
    }
  }

  return changed ? next : safeRecords
}
