/**
 * SPE-2609 / SPE-2610 / SPE-947: media-economy continuity surface + GameState
 * persistence for authored economy weights / continuity bindings.
 *
 * Authored economy weights / incentive factors over SPE-2606 commercialization
 * kind so lingering commercialization can modulate residual risk after local
 * containment. Compose-only inputs into SPE-2573 — no full media-economy
 * simulator, no kind vocabulary rewrite, no mid-week mutations, no SPE-2572
 * takedown AC rewrite, no SPE-1085 canon continuity rewrite.
 *
 * SPE-2610: sanitize/hydrate for `spe947MediaEconomyWeights` and
 * `spe947MediaEconomyContinuityBindings` (round-trip only; SPE-2576 pattern).
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
  | 'media_blocked'
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

type PlainRecord = Record<string, unknown>

function isPlainRecord(value: unknown): value is PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeId(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function normalizeLabel(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function sanitizeSpe947MediaEconomyWeightEntry(value: unknown): Spe947MediaEconomyWeight | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeId(value.id, '')
  const label = normalizeLabel(value.label, id)
  if (id.length === 0 || label.length === 0 || !isNonNegativeFinite(value.continuityFactor)) {
    return null
  }

  if (value.profitIncentive !== undefined && !isNonNegativeFinite(value.profitIncentive)) {
    return null
  }

  if (value.attentionIncentive !== undefined && !isNonNegativeFinite(value.attentionIncentive)) {
    return null
  }

  return Object.freeze({
    id,
    label,
    continuityFactor: value.continuityFactor,
    ...(value.profitIncentive !== undefined ? { profitIncentive: value.profitIncentive } : {}),
    ...(value.attentionIncentive !== undefined
      ? { attentionIncentive: value.attentionIncentive }
      : {}),
  })
}

function sanitizeSpe947MediaEconomyContinuityBindingEntry(
  value: unknown
): Spe947MediaEconomyContinuityBinding | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeId(value.id, '')
  const caseId = normalizeId(value.caseId, '')
  const economyWeightId = normalizeId(value.economyWeightId, '')
  if (id.length === 0 || caseId.length === 0 || economyWeightId.length === 0) {
    return null
  }

  const mediaArtifactId =
    typeof value.mediaArtifactId === 'string' && value.mediaArtifactId.trim().length > 0
      ? value.mediaArtifactId.trim()
      : undefined

  return Object.freeze({
    id,
    caseId,
    economyWeightId,
    ...(mediaArtifactId !== undefined ? { mediaArtifactId } : {}),
  })
}

function sanitizeKeyedRecordMap<T extends { readonly id: string }>(
  value: unknown,
  fallback: Record<string, T>,
  sanitizeEntry: (entry: unknown) => T | null
): Record<string, T> {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: Record<string, T> = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}

/** Hydration: canonical economy-weight map keyed by weight id; drops invalid/duplicate-id. */
export function sanitizeSpe947MediaEconomyWeights(
  value: unknown,
  fallback: Spe947MediaEconomyWeightRecordsMap = {}
): Spe947MediaEconomyWeightRecordsMap {
  return sanitizeKeyedRecordMap(value, fallback, sanitizeSpe947MediaEconomyWeightEntry)
}

/** Hydration: continuity bindings keyed by binding id; drops invalid/duplicate-id. */
export function sanitizeSpe947MediaEconomyContinuityBindings(
  value: unknown,
  fallback: Spe947MediaEconomyContinuityBindingRecordsMap = {}
): Spe947MediaEconomyContinuityBindingRecordsMap {
  return sanitizeKeyedRecordMap(value, fallback, sanitizeSpe947MediaEconomyContinuityBindingEntry)
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

    // Keep the raw product so factor 1 is a true no-op and threshold math
    // matches SPE-2573 (do not pre-round individual weights to 0 / cleared).
    return Object.freeze({
      ...artifact,
      riskWeight: artifact.riskWeight * resolved.factor,
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
      continuityFactor:
        weight !== undefined && isNonNegativeFinite(weight.continuityFactor)
          ? weight.continuityFactor
          : null,
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

  // Malformed / incomplete media config never gets continuity modulation.
  if (baseDecision.outcome === 'blocked') {
    reasonCodes.push(reasonCodeForDecision(baseDecision))
    return Object.freeze({
      bindingId: binding.id,
      caseId: binding.caseId,
      caseLabel: caseRecord.caseLabel ?? null,
      economyWeightId: binding.economyWeightId,
      economyWeightLabel: weight.label,
      continuityFactor: weight.continuityFactor,
      effectiveContinuityFactor: resolved.factor,
      status: 'media_blocked',
      baseDecision,
      modulatedDecision: baseDecision,
      remainsRisky: false,
      reasonCodes: Object.freeze(reasonCodes),
    })
  }

  const rawArtifacts = caseRecord.mediaArtifacts
  const artifacts = Array.isArray(rawArtifacts) ? rawArtifacts : []
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

/** Compact SPE-2610 persistence fixture: authored weight + binding only (empty defaults ≠ AC). */
export const SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE = Object.freeze({
  spe947MediaEconomyWeights: Object.freeze({
    [SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT.id]: SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT,
  }),
  spe947MediaEconomyContinuityBindings: Object.freeze({
    [SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING.id]:
      SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING,
  }),
})
