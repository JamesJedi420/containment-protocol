/**
 * SPE-870 — threshold-triggered process safety coverage.
 *
 * Pure caller-owned coverage rules: named hazard-class matches and/or
 * quantity thresholds activate enhanced safety governance. Distinct from
 * detailed hazard analysis and equipment integrity. No GameState field.
 */

export const PROCESS_SAFETY_COVERAGE_OWNER = 'SPE-870' as const

export type CoverageTriggerBasis = 'hazard_class' | 'quantity_threshold' | 'both'

export interface ProcessSafetyCoverageRule {
  readonly ruleId: string
  readonly label: string
  /** Named high-hazard classes that force coverage when matched. */
  readonly hazardClasses: readonly string[]
  /** Quantity at or above this value forces coverage when set. */
  readonly quantityThreshold?: number
}

export interface ProcessInventorySnapshot {
  readonly processId: string
  readonly hazardClass: string
  readonly quantity: number
}

export interface ProcessSafetyCoverageState {
  readonly processId: string
  readonly covered: boolean
  readonly triggerBasis: CoverageTriggerBasis | 'none'
  readonly matchedRuleIds: readonly string[]
  readonly quantity: number
  readonly hazardClass: string
  /** Non-negative distance to nearest quantity threshold when applicable. */
  readonly quantityThresholdProximity: number | null
  readonly reasons: readonly string[]
}

function requireNonEmpty(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`process safety ${label} is required`)
  return trimmed
}

function compareAscii(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function requireFiniteNonNegative(value: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`process safety ${label} must be a finite number`)
  }
  if (value < 0) {
    throw new Error(`process safety ${label} must be >= 0`)
  }
  return value
}

/**
 * Fail-closed create for one coverage rule.
 */
export function createProcessSafetyCoverageRule(
  input: ProcessSafetyCoverageRule,
): ProcessSafetyCoverageRule {
  const ruleId = requireNonEmpty(input.ruleId, 'ruleId')
  const label = requireNonEmpty(input.label, 'label')
  const hazardClasses = [
    ...new Set(
      (input.hazardClasses ?? [])
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  ].sort(compareAscii)

  if (input.quantityThreshold !== undefined) {
    requireFiniteNonNegative(input.quantityThreshold, 'quantityThreshold')
  }

  const hasThreshold = input.quantityThreshold !== undefined
  if (hazardClasses.length === 0 && !hasThreshold) {
    throw new Error('process safety rule requires hazardClasses and/or quantityThreshold')
  }

  return Object.freeze({
    ruleId,
    label,
    hazardClasses: Object.freeze(hazardClasses),
    ...(hasThreshold
      ? { quantityThreshold: input.quantityThreshold as number }
      : {}),
  })
}

/**
 * Evaluate coverage for one process against a rule set.
 * Class match and quantity threshold can each independently cover.
 */
export function evaluateProcessSafetyCoverage(args: {
  readonly process: ProcessInventorySnapshot
  readonly rules: readonly ProcessSafetyCoverageRule[]
}): ProcessSafetyCoverageState {
  const processId = requireNonEmpty(args.process.processId, 'processId')
  const hazardClass = requireNonEmpty(args.process.hazardClass, 'hazardClass')
  const quantity = requireFiniteNonNegative(args.process.quantity, 'quantity')

  const matchedRuleIds: string[] = []
  const reasons: string[] = []
  let classHit = false
  let quantityHit = false
  let nearestProximity: number | null = null

  const sortedRules = [...args.rules].sort((a, b) => compareAscii(a.ruleId, b.ruleId))
  for (const rule of sortedRules) {
    const classMatch = rule.hazardClasses.includes(hazardClass)
    const quantityMatch =
      rule.quantityThreshold !== undefined && quantity >= rule.quantityThreshold

    if (rule.quantityThreshold !== undefined) {
      const proximity = Math.max(0, rule.quantityThreshold - quantity)
      if (nearestProximity === null || proximity < nearestProximity) {
        nearestProximity = proximity
      }
    }

    if (!classMatch && !quantityMatch) continue
    matchedRuleIds.push(rule.ruleId)
    if (classMatch) {
      classHit = true
      reasons.push(`${rule.ruleId}:hazard-class:${hazardClass}`)
    }
    if (quantityMatch) {
      quantityHit = true
      reasons.push(`${rule.ruleId}:quantity>=${rule.quantityThreshold}`)
    }
  }

  const covered = classHit || quantityHit
  const triggerBasis: ProcessSafetyCoverageState['triggerBasis'] = !covered
    ? 'none'
    : classHit && quantityHit
      ? 'both'
      : classHit
        ? 'hazard_class'
        : 'quantity_threshold'

  return Object.freeze({
    processId,
    covered,
    triggerBasis,
    matchedRuleIds: Object.freeze(matchedRuleIds),
    quantity,
    hazardClass,
    quantityThresholdProximity: nearestProximity,
    reasons: Object.freeze([...reasons].sort(compareAscii)),
  })
}
