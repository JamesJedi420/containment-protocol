export interface TeamInsightsPrioritizationConfig {
  /** Relative weight applied to estimated outcome viability (success + partial value). */
  viabilityWeight: number
  /** Relative weight applied to urgency (stage/deadline pressure). */
  urgencyWeight: number
  /** Normalization window used to convert deadlineRemaining into pressure. */
  maxDeadlineForScoring: number
  /** Internal urgency split between stage pressure and deadline pressure. */
  urgencyStageWeight: number
  /** Internal urgency split between stage pressure and deadline pressure. */
  urgencyDeadlineWeight: number
  /** Value of partial odds when computing viability. */
  partialOddsValue: number
}

const PRIORITIZATION_SUM_EPSILON = 0.001

export const DEFAULT_TEAM_INSIGHTS_PRIORITIZATION: TeamInsightsPrioritizationConfig = {
  viabilityWeight: 0.65,
  urgencyWeight: 0.35,
  maxDeadlineForScoring: 12,
  urgencyStageWeight: 0.6,
  urgencyDeadlineWeight: 0.4,
  partialOddsValue: 0.5,
}

Object.freeze(DEFAULT_TEAM_INSIGHTS_PRIORITIZATION)

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeWeightPair(
  left: number,
  right: number,
  fallbackLeft: number,
  fallbackRight: number
) {
  let nextLeft = left
  let nextRight = right

  const sum = nextLeft + nextRight
  if (sum <= 0) {
    nextLeft = fallbackLeft
    nextRight = fallbackRight
  } else if (Math.abs(sum - 1) > PRIORITIZATION_SUM_EPSILON) {
    nextLeft /= sum
    nextRight /= sum
  }

  return { left: nextLeft, right: nextRight }
}

export function sanitizeTeamInsightsPrioritizationConfig(
  value: Partial<TeamInsightsPrioritizationConfig> | undefined,
  fallback: TeamInsightsPrioritizationConfig = DEFAULT_TEAM_INSIGHTS_PRIORITIZATION
): TeamInsightsPrioritizationConfig {
  const viabilityWeight =
    isFiniteNumber(value?.viabilityWeight) && value!.viabilityWeight >= 0
      ? value!.viabilityWeight
      : fallback.viabilityWeight
  const urgencyWeight =
    isFiniteNumber(value?.urgencyWeight) && value!.urgencyWeight >= 0
      ? value!.urgencyWeight
      : fallback.urgencyWeight
  const urgencyStageWeight =
    isFiniteNumber(value?.urgencyStageWeight) && value!.urgencyStageWeight >= 0
      ? value!.urgencyStageWeight
      : fallback.urgencyStageWeight
  const urgencyDeadlineWeight =
    isFiniteNumber(value?.urgencyDeadlineWeight) && value!.urgencyDeadlineWeight >= 0
      ? value!.urgencyDeadlineWeight
      : fallback.urgencyDeadlineWeight

  const normalizedOuter = normalizeWeightPair(
    viabilityWeight,
    urgencyWeight,
    fallback.viabilityWeight,
    fallback.urgencyWeight
  )
  const normalizedInner = normalizeWeightPair(
    urgencyStageWeight,
    urgencyDeadlineWeight,
    fallback.urgencyStageWeight,
    fallback.urgencyDeadlineWeight
  )

  return {
    viabilityWeight: normalizedOuter.left,
    urgencyWeight: normalizedOuter.right,
    maxDeadlineForScoring:
      isFiniteNumber(value?.maxDeadlineForScoring) && value!.maxDeadlineForScoring > 0
        ? Math.max(1, Math.round(value!.maxDeadlineForScoring))
        : fallback.maxDeadlineForScoring,
    urgencyStageWeight: normalizedInner.left,
    urgencyDeadlineWeight: normalizedInner.right,
    partialOddsValue: isFiniteNumber(value?.partialOddsValue)
      ? clamp(value!.partialOddsValue, 0, 1)
      : fallback.partialOddsValue,
  }
}

export function createTeamInsightsPrioritizationConfig(
  value?: Partial<TeamInsightsPrioritizationConfig>
) {
  return Object.freeze(sanitizeTeamInsightsPrioritizationConfig(value))
}

/**
 * Team assignment recommendation tuning knobs.
 *
 * Design can tweak these values in one shared file without touching
 * feature logic in `teamInsights.ts`.
 */
export const TEAM_INSIGHTS_PRIORITIZATION: TeamInsightsPrioritizationConfig = {
  ...createTeamInsightsPrioritizationConfig(DEFAULT_TEAM_INSIGHTS_PRIORITIZATION),
}

Object.freeze(TEAM_INSIGHTS_PRIORITIZATION)
