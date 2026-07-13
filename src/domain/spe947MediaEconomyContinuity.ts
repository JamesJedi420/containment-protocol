/**
 * SPE-2609 / SPE-947: smallest deterministic media-economy continuity surface.
 *
 * Authored economy weights / incentive factors over SPE-2606 commercialization
 * kind so lingering commercialization can modulate residual risk after local
 * containment. Compose-only inputs into SPE-2573 — no full media-economy
 * simulator, no kind vocabulary rewrite, no mid-week mutations, no SPE-2572
 * takedown AC rewrite, no SPE-1085 canon continuity rewrite.
 */

import {
  evaluatePostCaseMediaPersistence,
  type PostCaseMediaArtifact,
  type PostCaseMediaPersistenceDecision,
  type PostCaseMediaPersistenceInput,
} from './postCaseMediaPersistence'
import type { Spe947PostCaseMediaCaseRecordsMap } from './spe947EvaluatorPersistence'

/**
 * Compact authored economy weight (SPE-2572 incentive-field pattern peer).
 * Continuity truth lives here — bindings hold ids only (no dual truth).
 */
export interface Spe947MediaEconomyWeight {
  readonly id: string
  readonly label: string
  /**
   * Finite >= 0 base multiplier for matching commercialization artifact riskWeight.
   * Factor 1 = no change; >1 amplifies residual commercialization risk.
   */
  readonly continuityFactor: number
  /**
   * Optional profit-style incentive peer (SPE-2572 pattern). Finite >= 0 adds to
   * the effective continuity multiplier when present.
   */
  readonly profitIncentive?: number
  /**
   * Optional attention-style incentive peer. Finite >= 0 adds to the effective
   * continuity multiplier when present.
   */
  readonly attentionIncentive?: number
}

export type Spe947MediaEconomyWeightRecordsMap = Record<string, Spe947MediaEconomyWeight>

/**
 * Authored id-only link from a post-case media case to an economy weight.
 * Optional mediaArtifactId scopes modulation to one commercialization artifact.
 */
export interface Spe947MediaEconomyContinuityBinding {
  readonly id: string
  readonly caseId: string
  readonly economyWeightId: string
  readonly mediaArtifactId?: string
}

export type Spe947MediaEconomyContinuityBindingRecordsMap = Record<
  string,
  Spe947MediaEconomyContinuityBinding
>

export type Spe947MediaEconomyContinuityStatus =
  | 'modulated'
  | 'no_commercialization'
  | 'missing_case'
  | 'missing_economy_weight'
  | 'invalid_economy_weight'

export type Spe947MediaEconomyContinuityReasonCode =
  | 'unresolved_link'
  | 'missing_case'
  | 'missing_economy_weight'
  | 'invalid_economy_weight'
  | 'no_commercialization_target'
  | 'commercialization_continuity_applied'
  | 'adaptation_untouched'
  | 'media_persistence_remains_risky'
  | 'media_persistence_cleared'
  | 'media_persistence_blocked'

export interface Spe947MediaEconomyContinuityReading {
  readonly bindingId: string
  readonly caseId: string
  readonly caseLabel: string | null
  readonly economyWeightId: string
  readonly economyWeightLabel: string | null
  readonly continuityFactor: number | null
  readonly effectiveContinuityFactor: number | null
  readonly status: Spe947MediaEconomyContinuityStatus
  readonly baseDecision: PostCaseMediaPersistenceDecision | null
  readonly modulatedDecision: PostCaseMediaPersistenceDecision | null
  readonly remainsRisky: boolean
  readonly reasonCodes: readonly Spe947MediaEconomyContinuityReasonCode[]
}

export interface Spe947MediaEconomyContinuityMaps {
  readonly spe947PostCaseMediaCases?: Spe947PostCaseMediaCaseRecordsMap
  readonly spe947MediaEconomyWeights?: Spe947MediaEconomyWeightRecordsMap
  readonly spe947MediaEconomyContinuityBindings?: Spe947MediaEconomyContinuityBindingRecordsMap
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
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

function readOptionalIncentive(value: unknown): { ok: boolean; value: number } {
  if (value === undefined) {
    return { ok: true, value: 0 }
  }

  if (!isNonNegativeFinite(value)) {
    return { ok: false, value: 0 }
  }

  return { ok: true, value }
}

function resolveEffectiveContinuityFactor(
  weight: Spe947MediaEconomyWeight
): { ok: true; factor: number } | { ok: false } {
  if (!isNonNegativeFinite(weight.continuityFactor)) {
    return { ok: false }
  }

  const profit = readOptionalIncentive(weight.profitIncentive)
  const attention = readOptionalIncentive(weight.attentionIncentive)
  if (!profit.ok || !attention.ok) {
    return { ok: false }
  }

  return {
    ok: true,
    factor: roundMetric(weight.continuityFactor + profit.value + attention.value),
  }
}

function reasonCodeForDecision(
  decision: PostCaseMediaPersistenceDecision
): Spe947MediaEconomyContinuityReasonCode {
  switch (decision.outcome) {
    case 'remains_risky':
      return 'media_persistence_remains_risky'
    case 'cleared':
      return 'media_persistence_cleared'
    case 'blocked':
      return 'media_persistence_blocked'
    default: {
      const _exhaustive: never = decision.outcome
      return _exhaustive
    }
  }
}

function shouldModulateArtifact(
  artifact: PostCaseMediaArtifact,
  binding: Spe947MediaEconomyContinuityBinding
): boolean {
  if (artifact.kind !== 'commercialization') {
    return false
  }

  if (binding.mediaArtifactId !== undefined && binding.mediaArtifactId.length > 0) {
    return artifact.id === binding.mediaArtifactId
  }

  return true
}

/**
 * Compose optional SPE-2573 input with commercialization riskWeight modulation.
 * Adaptation (and other kinds) are never scaled — no dual truth / collapsed label.
 * Returns null when case is missing (compose no-op).
 */
export function composeCommercializationContinuityMediaInput(input: {
  caseRecord: PostCaseMediaPersistenceInput | null | undefined
  economyWeight: Spe947MediaEconomyWeight | null | undefined
  binding: Spe947MediaEconomyContinuityBinding
}): PostCaseMediaPersistenceInput | null {
  const caseRecord = input.caseRecord
  if (caseRecord === null || caseRecord === undefined) {
    return null
  }

  const weight = input.economyWeight
  if (weight === null || weight === undefined) {
    return caseRecord
  }

  const resolved = resolveEffectiveContinuityFactor(weight)
  if (!resolved.ok) {
    return caseRecord
  }

  const artifacts = caseRecord.mediaArtifacts
  if (artifacts === null || artifacts === undefined || !Array.isArray(artifacts)) {
    return caseRecord
  }

  const nextArtifacts = artifacts.map((artifact) => {
    if (!shouldModulateArtifact(artifact, input.binding)) {
      return artifact
    }

    return Object.freeze({
      ...artifact,
      riskWeight: roundMetric(artifact.riskWeight * resolved.factor),
    })
  })

  return Object.freeze({
    ...caseRecord,
    mediaArtifacts: Object.freeze(nextArtifacts),
  })
}

/**
 * Resolve one authored case → economy-weight continuity reading.
 * Missing case/weight and invalid factors never throw.
 */
export function resolveSpe947MediaEconomyContinuity(input: {
  binding: Spe947MediaEconomyContinuityBinding
  maps: Spe947MediaEconomyContinuityMaps
}): Spe947MediaEconomyContinuityReading {
  const binding = input.binding
  const maps = input.maps ?? {}
  const cases = maps.spe947PostCaseMediaCases ?? {}
  const weights = maps.spe947MediaEconomyWeights ?? {}
  const caseRecord = cases[binding.caseId]
  const weight = weights[binding.economyWeightId]
  const reasonCodes: Spe947MediaEconomyContinuityReasonCode[] = []

  if (caseRecord === undefined) {
    reasonCodes.push('missing_case')
    reasonCodes.push('unresolved_link')
    return Object.freeze({
      bindingId: binding.id,
      caseId: binding.caseId,
      caseLabel: null,
      economyWeightId: binding.economyWeightId,
      economyWeightLabel: weight?.label ?? null,
      continuityFactor: weight !== undefined ? weight.continuityFactor : null,
      effectiveContinuityFactor: null,
      status: 'missing_case',
      baseDecision: null,
      modulatedDecision: null,
      remainsRisky: false,
      reasonCodes: Object.freeze(reasonCodes),
    })
  }

  if (weight === undefined) {
    reasonCodes.push('missing_economy_weight')
    reasonCodes.push('unresolved_link')
    return Object.freeze({
      bindingId: binding.id,
      caseId: binding.caseId,
      caseLabel: caseRecord.caseLabel ?? null,
      economyWeightId: binding.economyWeightId,
      economyWeightLabel: null,
      continuityFactor: null,
      effectiveContinuityFactor: null,
      status: 'missing_economy_weight',
      baseDecision: null,
      modulatedDecision: null,
      remainsRisky: false,
      reasonCodes: Object.freeze(reasonCodes),
    })
  }

  const resolved = resolveEffectiveContinuityFactor(weight)
  if (!resolved.ok) {
    reasonCodes.push('invalid_economy_weight')
    reasonCodes.push('unresolved_link')
    return Object.freeze({
      bindingId: binding.id,
      caseId: binding.caseId,
      caseLabel: caseRecord.caseLabel ?? null,
      economyWeightId: binding.economyWeightId,
      economyWeightLabel: weight.label,
      continuityFactor: isNonNegativeFinite(weight.continuityFactor)
        ? weight.continuityFactor
        : null,
      effectiveContinuityFactor: null,
      status: 'invalid_economy_weight',
      baseDecision: null,
      modulatedDecision: null,
      remainsRisky: false,
      reasonCodes: Object.freeze(reasonCodes),
    })
  }

  const baseDecision = evaluatePostCaseMediaPersistence(caseRecord)
  const artifacts = caseRecord.mediaArtifacts ?? []
  const hasAdaptation = artifacts.some((artifact) => artifact.kind === 'adaptation')
  const hasCommercialTarget = artifacts.some((artifact) =>
    shouldModulateArtifact(artifact, binding)
  )

  if (!hasCommercialTarget) {
    reasonCodes.push('no_commercialization_target')
    if (hasAdaptation) {
      reasonCodes.push('adaptation_untouched')
    }
    reasonCodes.push(reasonCodeForDecision(baseDecision))
    return Object.freeze({
      bindingId: binding.id,
      caseId: binding.caseId,
      caseLabel: caseRecord.caseLabel ?? null,
      economyWeightId: binding.economyWeightId,
      economyWeightLabel: weight.label,
      continuityFactor: weight.continuityFactor,
      effectiveContinuityFactor: resolved.factor,
      status: 'no_commercialization',
      baseDecision,
      modulatedDecision: baseDecision,
      remainsRisky: baseDecision.remainsRisky,
      reasonCodes: Object.freeze(reasonCodes),
    })
  }

  const composed = composeCommercializationContinuityMediaInput({
    caseRecord,
    economyWeight: weight,
    binding,
  })
  const modulatedDecision = evaluatePostCaseMediaPersistence(composed)

  reasonCodes.push('commercialization_continuity_applied')
  if (hasAdaptation) {
    reasonCodes.push('adaptation_untouched')
  }
  reasonCodes.push(reasonCodeForDecision(modulatedDecision))

  return Object.freeze({
    bindingId: binding.id,
    caseId: binding.caseId,
    caseLabel: caseRecord.caseLabel ?? null,
    economyWeightId: binding.economyWeightId,
    economyWeightLabel: weight.label,
    continuityFactor: weight.continuityFactor,
    effectiveContinuityFactor: resolved.factor,
    status: 'modulated',
    baseDecision,
    modulatedDecision,
    remainsRisky: modulatedDecision.remainsRisky,
    reasonCodes: Object.freeze(reasonCodes),
  })
}

/**
 * Compose continuity readings for all authored bindings.
 * Empty bindings → empty list (no-op). Deterministic order by binding id.
 */
export function composeSpe947MediaEconomyContinuityReadings(input: {
  maps: Spe947MediaEconomyContinuityMaps
}): readonly Spe947MediaEconomyContinuityReading[] {
  const bindings = input.maps?.spe947MediaEconomyContinuityBindings ?? {}
  const bindingIds = Object.keys(bindings).sort((left, right) => left.localeCompare(right))

  return Object.freeze(
    bindingIds.flatMap((bindingId) => {
      const binding = bindings[bindingId]
      if (!binding) {
        return []
      }

      return [
        resolveSpe947MediaEconomyContinuity({
          binding,
          maps: input.maps,
        }),
      ]
    })
  )
}

/**
 * Weak post-containment residue: adaptation + commercialization below threshold
 * until commercialization continuity factor is applied.
 */
export const EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE: PostCaseMediaPersistenceInput =
  Object.freeze({
    caseId: 'case:merch-residue-weak',
    caseLabel: 'Weak merch residue after containment',
    localContainmentSucceeded: true,
    riskThreshold: 3,
    mediaArtifacts: Object.freeze([
      Object.freeze({
        id: 'media:adaptation-drama-cut',
        label: 'Unauthorized drama adaptation cut',
        kind: 'adaptation' as const,
        persistsAfterContainment: true,
        riskWeight: 1,
      }),
      Object.freeze({
        id: 'media:commercial-merch-line',
        label: 'Residual merch catalog listing',
        kind: 'commercialization' as const,
        persistsAfterContainment: true,
        riskWeight: 1,
      }),
    ]),
  })

/** Compact EXAMPLE economy weight: continuity factor pushes commercialization over threshold. */
export const SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT: Spe947MediaEconomyWeight = Object.freeze({
  id: 'economy:merch-attention-boost',
  label: 'Merch attention continuity band',
  continuityFactor: 2,
  profitIncentive: 0.5,
  attentionIncentive: 0.5,
})

/** Authored EXAMPLE binding: weak merch case → economy weight (commercialization artifact only). */
export const SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING: Spe947MediaEconomyContinuityBinding =
  Object.freeze({
    id: `spe947-media-economy:${EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE.caseId}`,
    caseId: EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE.caseId!,
    economyWeightId: SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT.id,
    mediaArtifactId: 'media:commercial-merch-line',
  })
