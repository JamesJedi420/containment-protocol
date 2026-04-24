import type { ThreatFamily } from './modifiers'

export type OutcomeBand = 'catastrophic' | 'fail' | 'partial' | 'success' | 'strong'

export interface OutcomeThresholds {
  catastrophic: number
  fail: number
  partial: number
  success: number
  strong: number
}

export const OUTCOME_THRESHOLDS: OutcomeThresholds = {
  catastrophic: -3,
  fail: -1,
  partial: 0,
  success: 2,
  strong: 3,
}

export const OUTCOME_EXPLANATIONS: Record<OutcomeBand, string> = {
  catastrophic: 'Disaster: severe negative consequences.',
  fail: 'Failure: objective not achieved.',
  partial: 'Partial: mixed or limited results.',
  success: 'Success: objective achieved.',
  strong: 'Strong: exceptional or bonus results.',
}

export interface ContestResolutionInput {
  actorScore: number
  oppositionScore: number
  modifiers?: readonly number[]
  thresholds?: OutcomeThresholds
}

export interface ContestResolution {
  actorScore: number
  oppositionScore: number
  modifierTotal: number
  raw: number
  bounded: number
  band: OutcomeBand
}

export type ExclusiveOutcomeType = 'resolved' | 'failed' | 'partial' | 'unresolved'

export interface ExclusiveOutcomeRegistry<
  Id extends string = string,
  Outcome extends string = ExclusiveOutcomeType,
> {
  finalizedIds: Set<Id>
  recorders: Record<Outcome, (id: Id) => void>
}

export type ConsequenceKey =
  | 'breach'
  | 'calm'
  | 'contained'
  | 'confused'
  | 'critical-damage'
  | 'cured'
  | 'data-loss'
  | 'delayed'
  | 'emp-burnout'
  | 'enemy-disabled'
  | 'enemy-disrupted'
  | 'enemy-exposed'
  | 'equipment-damaged'
  | 'escalating'
  | 'exposed'
  | 'fatigued'
  | 'fear-spread'
  | 'fragmented'
  | 'hallucination'
  | 'hazard-neutralized'
  | 'hazard-spread'
  | 'infected'
  | 'intel-gain'
  | 'intel-leak'
  | 'interrupted'
  | 'malfunction'
  | 'mass-panic'
  | 'mind-control'
  | 'misled'
  | 'morale-boost'
  | 'mutation'
  | 'neutralized'
  | 'outbreak'
  | 'quarantined'
  | 'resource-loss'
  | 'secured'
  | 'surveillance-breach'
  | 'symptoms'
  | 'system-failure'
  | 'system-hacked'
  | 'system-stable'
  | 'toxin-exposure'
  | 'total-compromise'
  | 'uncertain'
  | 'unsettled'

export interface ConsequenceLadder {
  family: ThreatFamily
  bands: Partial<Record<OutcomeBand, readonly ConsequenceKey[]>>
}

export interface SevereHitTable {
  family: ThreatFamily
  outcomes: readonly ConsequenceKey[]
}

export interface ConsequenceRoute {
  family: ThreatFamily
  band: OutcomeBand
  consequences: ConsequenceKey[]
  severeHit: ConsequenceKey[]
}

const CONSEQUENCE_LADDER_MAP = {
  deception: {
    catastrophic: ['total-compromise', 'intel-leak'],
    fail: ['misled', 'fragmented'],
    partial: ['uncertain', 'delayed'],
    success: ['intel-gain'],
    strong: ['intel-gain', 'enemy-exposed'],
  },
  disruption: {
    catastrophic: ['system-failure', 'critical-damage'],
    fail: ['equipment-damaged', 'fatigued'],
    partial: ['delayed', 'resource-loss'],
    success: ['system-stable'],
    strong: ['system-stable', 'enemy-disrupted'],
  },
  containment: {
    catastrophic: ['breach', 'hazard-spread'],
    fail: ['exposed', 'escalating'],
    partial: ['contained', 'resource-loss'],
    success: ['contained'],
    strong: ['contained', 'hazard-neutralized'],
  },
  biological: {
    catastrophic: ['outbreak', 'mutation'],
    fail: ['infected', 'toxin-exposure'],
    partial: ['quarantined', 'symptoms'],
    success: ['neutralized'],
    strong: ['neutralized', 'cured'],
  },
  psychological: {
    catastrophic: ['mass-panic', 'mind-control'],
    fail: ['hallucination', 'fear-spread'],
    partial: ['unsettled', 'confused'],
    success: ['calm'],
    strong: ['calm', 'morale-boost'],
  },
  technological: {
    catastrophic: ['system-hacked', 'emp-burnout'],
    fail: ['surveillance-breach', 'malfunction'],
    partial: ['interrupted', 'data-loss'],
    success: ['secured'],
    strong: ['secured', 'enemy-disabled'],
  },
} as const satisfies Record<ThreatFamily, Partial<Record<OutcomeBand, readonly ConsequenceKey[]>>>

const SEVERE_HIT_TABLE_MAP = {
  deception: ['total-compromise', 'intel-leak', 'fragmented'],
  disruption: ['critical-damage', 'system-failure', 'fatigued'],
  containment: ['breach', 'hazard-spread', 'escalating'],
  biological: ['outbreak', 'mutation', 'toxin-exposure'],
  psychological: ['mass-panic', 'mind-control', 'hallucination'],
  technological: ['system-hacked', 'emp-burnout', 'malfunction'],
} as const satisfies Record<ThreatFamily, readonly ConsequenceKey[]>

export const CONSEQUENCE_LADDERS: readonly ConsequenceLadder[] = Object.entries(
  CONSEQUENCE_LADDER_MAP
).map(([family, bands]) => ({
  family: family as ThreatFamily,
  bands,
}))

export const SEVERE_HIT_TABLES: readonly SevereHitTable[] = Object.entries(SEVERE_HIT_TABLE_MAP).map(
  ([family, outcomes]) => ({
    family: family as ThreatFamily,
    outcomes,
  })
)

export function getOutcomeBand(
  value: number,
  thresholds: OutcomeThresholds = OUTCOME_THRESHOLDS
): OutcomeBand {
  if (value <= thresholds.catastrophic) return 'catastrophic'
  if (value <= thresholds.fail) return 'fail'
  if (value < thresholds.success) return 'partial'
  if (value < thresholds.strong) return 'success'
  return 'strong'
}

export function explainOutcome(band: OutcomeBand) {
  return OUTCOME_EXPLANATIONS[band]
}

export function clampOutcomeValue(
  value: number,
  thresholds: OutcomeThresholds = OUTCOME_THRESHOLDS
) {
  return Math.max(thresholds.catastrophic, Math.min(thresholds.strong, value))
}

export function resolveContest(input: ContestResolutionInput): ContestResolution {
  const thresholds = input.thresholds ?? OUTCOME_THRESHOLDS
  const modifierTotal = (input.modifiers ?? []).reduce((sum, value) => sum + value, 0)
  const raw = input.actorScore - input.oppositionScore + modifierTotal
  const bounded = clampOutcomeValue(raw, thresholds)

  return {
    actorScore: input.actorScore,
    oppositionScore: input.oppositionScore,
    modifierTotal,
    raw,
    bounded,
    band: getOutcomeBand(bounded, thresholds),
  }
}

export function recordExclusiveOutcome<
  Id extends string,
  Outcome extends string = ExclusiveOutcomeType,
>(
  registry: ExclusiveOutcomeRegistry<Id, Outcome>,
  id: Id,
  outcome: Outcome
) {
  if (registry.finalizedIds.has(id)) {
    return false
  }

  registry.recorders[outcome](id)
  registry.finalizedIds.add(id)
  return true
}

export function assertExclusiveOutcomeBuckets<
  Id extends string,
  Outcome extends string = ExclusiveOutcomeType,
>(
  buckets: Record<Outcome, readonly Id[]>,
  errorMessage = 'Weekly case outcome buckets overlap within the same tick.'
) {
  const bucketValues = Object.values(buckets)
  const uniqueIds = new Set(bucketValues.flatMap((bucket) => bucket as readonly Id[]))
  const bucketEntryCount = bucketValues.reduce<number>(
    (sum, bucket) => sum + (bucket as readonly Id[]).length,
    0
  )

  if (uniqueIds.size !== bucketEntryCount) {
    throw new Error(errorMessage)
  }
}

export function mapResolutionResultToExclusiveOutcome(
  result: 'success' | 'partial' | 'fail' | 'unresolved'
): ExclusiveOutcomeType {
  switch (result) {
    case 'success':
      return 'resolved'
    case 'fail':
      return 'failed'
    case 'partial':
      return 'partial'
    case 'unresolved':
      return 'unresolved'
  }
}

export function getConsequenceLadder(family: ThreatFamily): ConsequenceLadder | undefined {
  const bands = CONSEQUENCE_LADDER_MAP[family]
  if (!bands) {
    return undefined
  }

  return {
    family,
    bands,
  }
}

export function getConsequencesForBand(
  family: ThreatFamily,
  band: OutcomeBand
): ConsequenceKey[] {
  return [...(CONSEQUENCE_LADDER_MAP[family]?.[band] ?? [])]
}

export function getSevereHitTable(family: ThreatFamily): SevereHitTable | undefined {
  const outcomes = SEVERE_HIT_TABLE_MAP[family]
  if (!outcomes) {
    return undefined
  }

  return {
    family,
    outcomes,
  }
}

export function getSevereHitOutcomes(family: ThreatFamily): ConsequenceKey[] {
  return [...(SEVERE_HIT_TABLE_MAP[family] ?? [])]
}

export function resolveConsequenceRoute(
  family: ThreatFamily,
  band: OutcomeBand,
  includeSevereHit = false
): ConsequenceRoute {
  return {
    family,
    band,
    consequences: getConsequencesForBand(family, band),
    severeHit: includeSevereHit ? getSevereHitOutcomes(family) : [],
  }
}

export function describeConsequenceRoute(
  route: Pick<ConsequenceRoute, 'consequences' | 'severeHit'>,
  counterExplanation?: string
) {
  const parts: string[] = []

  if (route.consequences.length > 0) {
    parts.push(route.consequences.join(', '))
  }

  if (route.severeHit.length > 0) {
    parts.push(`Severe: ${route.severeHit.join(', ')}`)
  }

  if (counterExplanation) {
    parts.push(counterExplanation)
  }

  return parts.length > 0 ? parts.join(' | ') : 'No typed consequences routed.'
}
