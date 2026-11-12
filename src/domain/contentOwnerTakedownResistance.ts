/**
 * SPE-2572 / SPE-947 AC row 5: pure content-owner takedown-resistance evaluator.
 * Audience / status / profit / identity incentives → resists | yields | contested.
 * No GameState persistence, weekly mutation, store, or UI coupling.
 * Distinct from SPE-2569 platform outage / reach degrade (AC row 4).
 */

export const CONTENT_OWNER_INCENTIVE_KINDS = ['audience', 'status', 'profit', 'identity'] as const

export type ContentOwnerIncentiveKind = (typeof CONTENT_OWNER_INCENTIVE_KINDS)[number]

export const TAKEDOWN_RESISTANCE_OUTCOMES = ['resists', 'yields', 'contested'] as const

export type TakedownResistanceOutcome = (typeof TAKEDOWN_RESISTANCE_OUTCOMES)[number]

/**
 * Content-owner incentive weights. Each finite value >= 0 contributes to
 * resistanceScore. Omitted fields contribute 0 without marking config incomplete
 * when at least one other incentive is valid.
 */
export interface ContentOwnerIncentives {
  readonly audience?: number
  readonly status?: number
  readonly profit?: number
  readonly identity?: number
}

export interface ContentOwner {
  readonly id: string
  readonly label: string
  readonly incentives: ContentOwnerIncentives
}

export interface TakedownResistanceEvaluationInput {
  readonly owner?: ContentOwner | null
  /**
   * Finite resistance score at or above which the owner resists.
   * Must be > 0 when valid.
   */
  readonly resistThreshold: number
  /**
   * Finite floor for the contested band: contested when
   * contestedThreshold <= score < resistThreshold.
   * Defaults to resistThreshold / 2 when omitted and resistThreshold is valid.
   * Must be >= 0 and < resistThreshold when present.
   */
  readonly contestedThreshold?: number
}

export interface TakedownResistanceDecision {
  readonly ownerId: string
  readonly ownerLabel: string
  readonly audienceIncentive: number
  readonly statusIncentive: number
  readonly profitIncentive: number
  readonly identityIncentive: number
  readonly resistanceScore: number
  readonly resistThreshold: number
  readonly contestedThreshold: number
  readonly outcome: TakedownResistanceOutcome
  readonly reasonCodes: readonly string[]
}

const FALLBACK_INCENTIVE = 0

type OwnerLike = Partial<ContentOwner> & Record<string, unknown>
type IncentivesLike = Partial<ContentOwnerIncentives> & Record<string, unknown>

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

function roundMetric(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  const scaled = value * 1_000_000
  if (!Number.isFinite(scaled)) {
    return value
  }

  return Math.round(scaled) / 1_000_000
}

function freezeDecision(decision: TakedownResistanceDecision): TakedownResistanceDecision {
  return Object.freeze({
    ...decision,
    reasonCodes: uniqueSorted(decision.reasonCodes),
  })
}

function emptyYieldDecision(
  reasonCodes: readonly string[],
  thresholds: { resist: number; contested: number }
): TakedownResistanceDecision {
  return freezeDecision({
    ownerId: 'owner:unknown',
    ownerLabel: 'Unknown Owner',
    audienceIncentive: FALLBACK_INCENTIVE,
    statusIncentive: FALLBACK_INCENTIVE,
    profitIncentive: FALLBACK_INCENTIVE,
    identityIncentive: FALLBACK_INCENTIVE,
    resistanceScore: 0,
    resistThreshold: thresholds.resist,
    contestedThreshold: roundMetric(thresholds.contested),
    outcome: 'yields',
    reasonCodes,
  })
}

function readIncentive(
  incentives: IncentivesLike,
  kind: ContentOwnerIncentiveKind,
  invalidCode: string
): { value: number; valid: boolean; presentInvalid: boolean; reasonCodes: string[] } {
  const raw = incentives[kind]
  if (raw === undefined) {
    return { value: FALLBACK_INCENTIVE, valid: false, presentInvalid: false, reasonCodes: [] }
  }

  // Explicit null counts as present-but-invalid (distinct from omitted undefined).
  if (raw === null || !isNonNegativeFinite(raw)) {
    return {
      value: FALLBACK_INCENTIVE,
      valid: false,
      presentInvalid: true,
      reasonCodes: [invalidCode],
    }
  }

  return { value: raw, valid: true, presentInvalid: false, reasonCodes: [] }
}

/**
 * Evaluates whether a content owner resists, yields to, or contests a takedown
 * based on audience / status / profit / identity incentive weights.
 *
 * Priority:
 *   missing/invalid evaluation input, owner, or resistThreshold → yields
 *   no valid incentives, or any present-but-invalid incentive → yields
 *     (incomplete / invalid config never resists)
 *   score >= resistThreshold → resists
 *   score >= contestedThreshold → contested
 *   else → yields
 *
 * Does not model platform outage / reach failure (SPE-2569 / AC row 4).
 */
export function evaluateContentOwnerTakedownResistance(
  input: TakedownResistanceEvaluationInput | null | undefined
): TakedownResistanceDecision {
  const reasonCodes: string[] = []

  if (input === null || input === undefined) {
    reasonCodes.push('missing_evaluation_input')
    return emptyYieldDecision(reasonCodes, { resist: 0, contested: 0 })
  }

  let resistThreshold = 0
  let hasValidResistThreshold = false
  if (!isPositiveFinite(input.resistThreshold)) {
    reasonCodes.push('missing_or_invalid_resist_threshold')
  } else {
    resistThreshold = input.resistThreshold
    hasValidResistThreshold = true
  }

  let contestedThreshold = 0
  let hasValidContestedThreshold = false
  if (input.contestedThreshold === undefined) {
    if (hasValidResistThreshold) {
      // Keep raw default for band comparisons; round only the reported field.
      contestedThreshold = resistThreshold / 2
      hasValidContestedThreshold = true
    }
  } else if (!isNonNegativeFinite(input.contestedThreshold)) {
    reasonCodes.push('invalid_contested_threshold')
  } else if (hasValidResistThreshold && input.contestedThreshold >= resistThreshold) {
    reasonCodes.push('contested_threshold_not_below_resist')
  } else {
    contestedThreshold = input.contestedThreshold
    hasValidContestedThreshold = true
  }

  const owner = input.owner

  if (owner === null || owner === undefined) {
    reasonCodes.push('missing_owner')
    reasonCodes.push('takedown_yields')
    return emptyYieldDecision(reasonCodes, {
      resist: resistThreshold,
      contested: contestedThreshold,
    })
  }

  if (!isRecord(owner)) {
    reasonCodes.push('invalid_owner')
    reasonCodes.push('takedown_yields')
    return emptyYieldDecision(reasonCodes, {
      resist: resistThreshold,
      contested: contestedThreshold,
    })
  }

  const ownerRecord = owner as OwnerLike
  const ownerId = normalizeId(ownerRecord.id, 'owner:unknown')
  const ownerLabel = normalizeLabel(ownerRecord.label, ownerId)

  if (ownerRecord.incentives === null || ownerRecord.incentives === undefined) {
    reasonCodes.push('missing_incentives')
    reasonCodes.push('owner_config_incomplete')
    reasonCodes.push('takedown_yields')
    return freezeDecision({
      ownerId,
      ownerLabel,
      audienceIncentive: FALLBACK_INCENTIVE,
      statusIncentive: FALLBACK_INCENTIVE,
      profitIncentive: FALLBACK_INCENTIVE,
      identityIncentive: FALLBACK_INCENTIVE,
      resistanceScore: 0,
      resistThreshold,
      contestedThreshold,
      outcome: 'yields',
      reasonCodes,
    })
  }

  if (!isRecord(ownerRecord.incentives)) {
    reasonCodes.push('invalid_incentives')
    reasonCodes.push('owner_config_incomplete')
    reasonCodes.push('takedown_yields')
    return freezeDecision({
      ownerId,
      ownerLabel,
      audienceIncentive: FALLBACK_INCENTIVE,
      statusIncentive: FALLBACK_INCENTIVE,
      profitIncentive: FALLBACK_INCENTIVE,
      identityIncentive: FALLBACK_INCENTIVE,
      resistanceScore: 0,
      resistThreshold,
      contestedThreshold,
      outcome: 'yields',
      reasonCodes,
    })
  }

  const incentives = ownerRecord.incentives as IncentivesLike
  const audience = readIncentive(incentives, 'audience', 'invalid_audience_incentive')
  const status = readIncentive(incentives, 'status', 'invalid_status_incentive')
  const profit = readIncentive(incentives, 'profit', 'invalid_profit_incentive')
  const identity = readIncentive(incentives, 'identity', 'invalid_identity_incentive')

  reasonCodes.push(
    ...audience.reasonCodes,
    ...status.reasonCodes,
    ...profit.reasonCodes,
    ...identity.reasonCodes
  )

  const hasAnyValidIncentive = audience.valid || status.valid || profit.valid || identity.valid
  const hasPresentInvalidIncentive =
    audience.presentInvalid ||
    status.presentInvalid ||
    profit.presentInvalid ||
    identity.presentInvalid

  if (!hasAnyValidIncentive) {
    reasonCodes.push('missing_incentives')
    reasonCodes.push('owner_config_incomplete')
  } else if (hasPresentInvalidIncentive) {
    reasonCodes.push('owner_config_incomplete')
  }

  const incentivesComplete = hasAnyValidIncentive && !hasPresentInvalidIncentive
  const rawResistanceScore = incentivesComplete
    ? audience.value + status.value + profit.value + identity.value
    : 0
  const resistanceScore = roundMetric(rawResistanceScore)

  if (!hasValidResistThreshold || !hasValidContestedThreshold || !incentivesComplete) {
    reasonCodes.push('takedown_yields')
    return freezeDecision({
      ownerId,
      ownerLabel,
      audienceIncentive: audience.value,
      statusIncentive: status.value,
      profitIncentive: profit.value,
      identityIncentive: identity.value,
      resistanceScore: incentivesComplete ? resistanceScore : 0,
      resistThreshold,
      contestedThreshold: roundMetric(contestedThreshold),
      outcome: 'yields',
      reasonCodes,
    })
  }

  // Compare raw sum to thresholds so micro-rounding cannot flip the band (match footageExposureTraffic).
  let outcome: TakedownResistanceOutcome
  if (rawResistanceScore >= resistThreshold) {
    reasonCodes.push('incentive_resistance')
    outcome = 'resists'
  } else if (rawResistanceScore >= contestedThreshold) {
    reasonCodes.push('incentive_contested')
    outcome = 'contested'
  } else {
    reasonCodes.push('incentive_yield')
    outcome = 'yields'
  }

  return freezeDecision({
    ownerId,
    ownerLabel,
    audienceIncentive: audience.value,
    statusIncentive: status.value,
    profitIncentive: profit.value,
    identityIncentive: identity.value,
    resistanceScore,
    resistThreshold,
    contestedThreshold: roundMetric(contestedThreshold),
    outcome,
    reasonCodes,
  })
}

/** Compact fixture: viral creator whose audience + status incentives resist takedown. */
export const EXAMPLE_RESISTING_CONTENT_OWNER: ContentOwner = Object.freeze({
  id: 'owner:viral-streamer',
  label: 'Viral anomaly streamer',
  incentives: Object.freeze({
    audience: 4,
    status: 3,
    profit: 1,
    identity: 1,
  }),
})

/** Compact fixture: low-incentive owner who yields to takedown. */
export const EXAMPLE_YIELDING_CONTENT_OWNER: ContentOwner = Object.freeze({
  id: 'owner:reluctant-archivist',
  label: 'Reluctant archivist',
  incentives: Object.freeze({
    audience: 0,
    status: 0.5,
    profit: 0,
    identity: 0,
  }),
})
