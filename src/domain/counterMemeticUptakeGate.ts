/**
 * SPE-2570 / SPE-947 AC row 3: pure counter-memetic uptake-gate evaluator.
 * Lore + distributor + propagation delay + uptake → blocked | propagating | ready.
 * No GameState persistence, weekly mutation, store, or UI coupling.
 */

export const COUNTER_MEMETIC_LORE_STATES = ['missing', 'draft', 'crafted'] as const

export type CounterMemeticLoreState = (typeof COUNTER_MEMETIC_LORE_STATES)[number]

export const COUNTER_MEMETIC_UPTAKE_STATES = ['none', 'partial', 'sufficient'] as const

export type CounterMemeticUptakeState = (typeof COUNTER_MEMETIC_UPTAKE_STATES)[number]

export const COUNTER_MEMETIC_READINESS = ['blocked', 'propagating', 'ready'] as const

export type CounterMemeticReadiness = (typeof COUNTER_MEMETIC_READINESS)[number]

export interface CounterMemeticPlan {
  readonly id: string
  readonly label: string
  readonly loreState: CounterMemeticLoreState
  /** Non-empty trimmed id means a distributor has been chosen. */
  readonly distributorId?: string
  /** Finite weeks required before uptake can unlock the countermeasure. Must be > 0 when valid. */
  readonly requiredPropagationWeeks: number
  /** Finite weeks elapsed since publish. Must be >= 0 when valid. */
  readonly elapsedPropagationWeeks: number
  readonly uptakeState: CounterMemeticUptakeState
}

export interface CounterMemeticUptakeEvaluationInput {
  readonly plan?: CounterMemeticPlan | null
}

export interface CounterMemeticUptakeDecision {
  readonly planId: string
  readonly planLabel: string
  readonly loreState: CounterMemeticLoreState | 'unknown'
  readonly distributorId: string
  readonly requiredPropagationWeeks: number
  readonly elapsedPropagationWeeks: number
  readonly uptakeState: CounterMemeticUptakeState | 'unknown'
  readonly readiness: CounterMemeticReadiness
  readonly reasonCodes: readonly string[]
}

type PlanLike = Partial<CounterMemeticPlan> & Record<string, unknown>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
      (left, right) => left.localeCompare(right)
    )
  )
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function normalizeId(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function normalizeLabel(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function isLoreState(value: unknown): value is CounterMemeticLoreState {
  return (
    typeof value === 'string' && (COUNTER_MEMETIC_LORE_STATES as readonly string[]).includes(value)
  )
}

function isUptakeState(value: unknown): value is CounterMemeticUptakeState {
  return (
    typeof value === 'string' &&
    (COUNTER_MEMETIC_UPTAKE_STATES as readonly string[]).includes(value)
  )
}

function freezeDecision(decision: CounterMemeticUptakeDecision): CounterMemeticUptakeDecision {
  return Object.freeze({
    ...decision,
    reasonCodes: uniqueSorted(decision.reasonCodes),
  })
}

/**
 * Evaluates whether a counter-memetic plan has cleared lore, distributor,
 * propagation-delay, and uptake gates so a dependent countermeasure is ready.
 *
 * Priority (first match):
 *   missing/invalid plan or enums → blocked
 *   lore not crafted → blocked
 *   missing distributor → blocked
 *   invalid required weeks → blocked
 *   missing/invalid elapsed weeks → blocked
 *   invalid uptake enum → blocked
 *   elapsed < required → propagating
 *   uptake not sufficient → blocked
 *   else → ready
 */
export function evaluateCounterMemeticUptakeGate(
  input: CounterMemeticUptakeEvaluationInput | null | undefined
): CounterMemeticUptakeDecision {
  const reasonCodes: string[] = []

  if (input === null || input === undefined) {
    reasonCodes.push('missing_evaluation_input')
    return freezeDecision({
      planId: 'plan:unknown',
      planLabel: 'Unknown Plan',
      loreState: 'unknown',
      distributorId: '',
      requiredPropagationWeeks: 0,
      elapsedPropagationWeeks: 0,
      uptakeState: 'unknown',
      readiness: 'blocked',
      reasonCodes,
    })
  }

  const plan = input.plan

  if (plan === null || plan === undefined) {
    reasonCodes.push('missing_plan')
    return freezeDecision({
      planId: 'plan:unknown',
      planLabel: 'Unknown Plan',
      loreState: 'unknown',
      distributorId: '',
      requiredPropagationWeeks: 0,
      elapsedPropagationWeeks: 0,
      uptakeState: 'unknown',
      readiness: 'blocked',
      reasonCodes,
    })
  }

  if (!isRecord(plan)) {
    reasonCodes.push('invalid_plan')
    return freezeDecision({
      planId: 'plan:unknown',
      planLabel: 'Unknown Plan',
      loreState: 'unknown',
      distributorId: '',
      requiredPropagationWeeks: 0,
      elapsedPropagationWeeks: 0,
      uptakeState: 'unknown',
      readiness: 'blocked',
      reasonCodes,
    })
  }

  const planRecord = plan as PlanLike
  const planId = normalizeId(planRecord.id, 'plan:unknown')
  const planLabel = normalizeLabel(planRecord.label, planId)

  let loreState: CounterMemeticLoreState | 'unknown' = 'unknown'
  if (!isLoreState(planRecord.loreState)) {
    reasonCodes.push('missing_or_invalid_lore_state')
  } else {
    loreState = planRecord.loreState
  }

  let distributorId = ''
  if (planRecord.distributorId === undefined || planRecord.distributorId === null) {
    reasonCodes.push('distributor_missing')
  } else if (
    typeof planRecord.distributorId !== 'string' ||
    planRecord.distributorId.trim().length === 0
  ) {
    reasonCodes.push('distributor_missing')
  } else {
    distributorId = planRecord.distributorId.trim()
  }

  let requiredPropagationWeeks = 0
  let hasValidRequiredWeeks = false
  if (!isPositiveFinite(planRecord.requiredPropagationWeeks)) {
    reasonCodes.push('invalid_required_propagation_weeks')
  } else {
    requiredPropagationWeeks = planRecord.requiredPropagationWeeks
    hasValidRequiredWeeks = true
  }

  let elapsedPropagationWeeks = 0
  let hasValidElapsedWeeks = false
  if (
    planRecord.elapsedPropagationWeeks === undefined ||
    planRecord.elapsedPropagationWeeks === null
  ) {
    reasonCodes.push('missing_elapsed_propagation_weeks')
  } else if (!isNonNegativeFinite(planRecord.elapsedPropagationWeeks)) {
    reasonCodes.push('invalid_elapsed_propagation_weeks')
  } else {
    elapsedPropagationWeeks = planRecord.elapsedPropagationWeeks
    hasValidElapsedWeeks = true
  }

  let uptakeState: CounterMemeticUptakeState | 'unknown' = 'unknown'
  if (!isUptakeState(planRecord.uptakeState)) {
    reasonCodes.push('missing_or_invalid_uptake_state')
  } else {
    uptakeState = planRecord.uptakeState
  }

  let readiness: CounterMemeticReadiness

  if (loreState === 'unknown') {
    reasonCodes.push('countermeasure_blocked')
    readiness = 'blocked'
  } else if (loreState !== 'crafted') {
    reasonCodes.push('lore_not_crafted')
    readiness = 'blocked'
  } else if (distributorId.length === 0) {
    readiness = 'blocked'
  } else if (!hasValidRequiredWeeks) {
    reasonCodes.push('countermeasure_blocked')
    readiness = 'blocked'
  } else if (!hasValidElapsedWeeks) {
    reasonCodes.push('countermeasure_blocked')
    readiness = 'blocked'
  } else if (uptakeState === 'unknown') {
    reasonCodes.push('countermeasure_blocked')
    readiness = 'blocked'
  } else if (elapsedPropagationWeeks < requiredPropagationWeeks) {
    reasonCodes.push('propagation_incomplete')
    readiness = 'propagating'
  } else if (uptakeState !== 'sufficient') {
    reasonCodes.push('uptake_insufficient')
    readiness = 'blocked'
  } else {
    reasonCodes.push('countermeasure_ready')
    readiness = 'ready'
  }

  return freezeDecision({
    planId,
    planLabel,
    loreState,
    distributorId,
    requiredPropagationWeeks,
    elapsedPropagationWeeks,
    uptakeState,
    readiness,
    reasonCodes,
  })
}

/** Compact fixture for tests and planning mirrors later — all gates pass when evaluated as-is. */
export const EXAMPLE_COUNTER_MEMETIC_PLAN: CounterMemeticPlan = Object.freeze({
  id: 'plan:corrective-lore-wave',
  label: 'Corrective lore wave',
  loreState: 'crafted',
  distributorId: 'distributor:civic-bulletin',
  requiredPropagationWeeks: 2,
  elapsedPropagationWeeks: 2,
  uptakeState: 'sufficient',
})
