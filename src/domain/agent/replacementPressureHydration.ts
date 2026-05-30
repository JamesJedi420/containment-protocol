import { ATTRITION_CALIBRATION } from '../sim/calibration'
import type { ReplacementPressureState } from '../models'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function clampFiniteScalar(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(min, Math.min(max, Math.trunc(value)))
}

function sanitizeReasonCodes(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const next = [
    ...new Set(
      value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    ),
  ].sort((left, right) => left.localeCompare(right))

  return next.length > 0 ? next : undefined
}

function sanitizeRecruitmentPriorityBand(
  value: unknown
): ReplacementPressureState['recruitmentPriorityBand'] | undefined {
  return value === 'stable' || value === 'elevated' || value === 'critical' ? value : undefined
}

/**
 * Hydration problem 464: finite scalars, reasonCodes, strip unknown `replacementBacklog` arrays.
 */
export function sanitizeReplacementPressureState(
  raw: unknown
): ReplacementPressureState | undefined {
  if (!isRecord(raw)) {
    return undefined
  }

  const maxPressure = ATTRITION_CALIBRATION.maxReplacementPressure

  const replacementPressure = clampFiniteScalar(raw.replacementPressure, 0, 0, maxPressure)
  const staffingGap = clampFiniteScalar(raw.staffingGap, 0, 0, 999)
  const activeLossCount = clampFiniteScalar(raw.activeLossCount, 0, 0, 999)
  const criticalRoleLossCount = clampFiniteScalar(raw.criticalRoleLossCount, 0, 0, 99)
  const temporaryUnavailableCount =
    raw.temporaryUnavailableCount === undefined
      ? undefined
      : clampFiniteScalar(raw.temporaryUnavailableCount, 0, 0, 999)
  const activeUnavailableCount =
    raw.activeUnavailableCount === undefined
      ? undefined
      : clampFiniteScalar(raw.activeUnavailableCount, 0, 0, 999)
  const deploymentTriagePenalty =
    raw.deploymentTriagePenalty === undefined
      ? undefined
      : clampFiniteScalar(raw.deploymentTriagePenalty, 0, 0, 8)
  const deploymentSetupDelayWeeks =
    raw.deploymentSetupDelayWeeks === undefined
      ? undefined
      : clampFiniteScalar(raw.deploymentSetupDelayWeeks, 0, 0, 4)
  const recoveryThroughputPenalty =
    raw.recoveryThroughputPenalty === undefined
      ? undefined
      : clampFiniteScalar(raw.recoveryThroughputPenalty, 0, 0, 4)
  const teamRecoveryPressurePenalty =
    raw.teamRecoveryPressurePenalty === undefined
      ? undefined
      : clampFiniteScalar(raw.teamRecoveryPressurePenalty, 0, 0, 4)

  const reasonCodes = sanitizeReasonCodes(raw.reasonCodes)
  const recruitmentPriorityBand = sanitizeRecruitmentPriorityBand(raw.recruitmentPriorityBand)

  const constrained = typeof raw.constrained === 'boolean' ? raw.constrained : undefined
  const severeConstraint =
    typeof raw.severeConstraint === 'boolean' ? raw.severeConstraint : undefined

  if (
    replacementPressure === 0 &&
    staffingGap === 0 &&
    activeLossCount === 0 &&
    criticalRoleLossCount === 0 &&
    !reasonCodes &&
    !recruitmentPriorityBand &&
    constrained === undefined &&
    severeConstraint === undefined &&
    temporaryUnavailableCount === undefined &&
    activeUnavailableCount === undefined &&
    deploymentTriagePenalty === undefined &&
    deploymentSetupDelayWeeks === undefined &&
    recoveryThroughputPenalty === undefined &&
    teamRecoveryPressurePenalty === undefined
  ) {
    return undefined
  }

  return {
    replacementPressure,
    staffingGap,
    activeLossCount,
    criticalRoleLossCount,
    ...(temporaryUnavailableCount !== undefined ? { temporaryUnavailableCount } : {}),
    ...(activeUnavailableCount !== undefined ? { activeUnavailableCount } : {}),
    ...(constrained !== undefined ? { constrained } : {}),
    ...(severeConstraint !== undefined ? { severeConstraint } : {}),
    ...(deploymentTriagePenalty !== undefined ? { deploymentTriagePenalty } : {}),
    ...(deploymentSetupDelayWeeks !== undefined ? { deploymentSetupDelayWeeks } : {}),
    ...(recoveryThroughputPenalty !== undefined ? { recoveryThroughputPenalty } : {}),
    ...(teamRecoveryPressurePenalty !== undefined ? { teamRecoveryPressurePenalty } : {}),
    ...(recruitmentPriorityBand ? { recruitmentPriorityBand } : {}),
    ...(reasonCodes ? { reasonCodes } : {}),
  }
}
