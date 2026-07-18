/**
 * SPE-2630 / SPE-956 slice 1: survivor informal morbidity / recurrence registry.
 * Pure deterministic evaluator — returns a frozen proposed-adjustment envelope.
 * Distinct from SPE-2620 advisory, SPE-2628 hotline, SPE-2629 async discussion,
 * and SPE-1682 survivor aftereffects. No GameState persistence, store, UI, or week-close.
 */

export const REGISTRY_SIGNAL_OUTCOMES = [
  'recorded',
  'deferred',
  'rejected',
  'weak_testimony',
] as const

export type RegistrySignalOutcome = (typeof REGISTRY_SIGNAL_OUTCOMES)[number]

export const RECOGNITION_STANCES = ['informal_only', 'contested', 'institution_refused'] as const

export type RecognitionStance = (typeof RECOGNITION_STANCES)[number]

export const CATALOG_RULES = ['open_community', 'pattern_only', 'closed'] as const

export type CatalogRule = (typeof CATALOG_RULES)[number]

export const SUPPORT_KNOWLEDGE_BANDS = ['none', 'peer_shared', 'registry_informed'] as const

export type SupportKnowledgeBand = (typeof SUPPORT_KNOWLEDGE_BANDS)[number]

export const CREDIBILITY_CEILINGS = ['anecdotal', 'community_weak'] as const

export type CredibilityCeiling = (typeof CREDIBILITY_CEILINGS)[number]

export const REGISTRY_ADJUSTMENT_SCOPES = ['support_knowledge', 'credibility_stance'] as const

export type RegistryAdjustmentScope = (typeof REGISTRY_ADJUSTMENT_SCOPES)[number]

export const REGISTRY_SIGNAL_INTENTS = [
  'record_symptom',
  'record_recurrence',
  'contribute_support',
] as const

export type RegistrySignalIntent = (typeof REGISTRY_SIGNAL_INTENTS)[number]

export interface SurvivorInformalRegistry {
  readonly id: string
  readonly recognitionStance: RecognitionStance
  readonly catalogRule: CatalogRule
  readonly supportKnowledgeBand: SupportKnowledgeBand
  readonly credibilityCeiling: CredibilityCeiling
}

export interface SurvivorRegistrySignal {
  readonly signalId: string
  readonly registryId: string
  readonly intent: RegistrySignalIntent
  readonly proposedScope: RegistryAdjustmentScope
  readonly proposedValue: string
}

export interface SurvivorSupportBaseline {
  readonly communityId: string
  readonly supportKnowledge: string
  readonly credibilityStance: string
}

export interface SurvivorRegistryProposedAdjustment {
  readonly scope: RegistryAdjustmentScope
  readonly fromValue: string
  readonly toValue: string
}

export interface SurvivorRegistryEvaluationInput {
  readonly registry?: SurvivorInformalRegistry | null
  readonly signal?: SurvivorRegistrySignal | null
  readonly baseline?: SurvivorSupportBaseline | null
}

export interface SurvivorRegistryEvaluationResult {
  readonly outcome: RegistrySignalOutcome
  readonly registryId: string | null
  readonly signalId: string | null
  readonly baseline: SurvivorSupportBaseline
  readonly resolved: SurvivorSupportBaseline
  readonly proposedAdjustment: SurvivorRegistryProposedAdjustment | null
  readonly reasonCodes: readonly string[]
}

const EMPTY_BASELINE: SurvivorSupportBaseline = Object.freeze({
  communityId: 'community:unknown',
  supportKnowledge: 'unchanged',
  credibilityStance: 'unchanged',
})

const RECOGNITION_SET = new Set<string>(RECOGNITION_STANCES)
const CATALOG_SET = new Set<string>(CATALOG_RULES)
const BAND_SET = new Set<string>(SUPPORT_KNOWLEDGE_BANDS)
const CEILING_SET = new Set<string>(CREDIBILITY_CEILINGS)
const SCOPE_SET = new Set<string>(REGISTRY_ADJUSTMENT_SCOPES)
const INTENT_SET = new Set<string>(REGISTRY_SIGNAL_INTENTS)

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

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function freezeBaseline(decision: SurvivorSupportBaseline): SurvivorSupportBaseline {
  return Object.freeze({
    communityId: decision.communityId,
    supportKnowledge: decision.supportKnowledge,
    credibilityStance: decision.credibilityStance,
  })
}

function cloneBaseline(decision: SurvivorSupportBaseline): SurvivorSupportBaseline {
  return freezeBaseline({ ...decision })
}

function freezeAdjustment(
  adjustment: SurvivorRegistryProposedAdjustment
): SurvivorRegistryProposedAdjustment {
  return Object.freeze({ ...adjustment })
}

function freezeResult(result: SurvivorRegistryEvaluationResult): SurvivorRegistryEvaluationResult {
  return Object.freeze({
    outcome: result.outcome,
    registryId: result.registryId,
    signalId: result.signalId,
    baseline: freezeBaseline(result.baseline),
    resolved: freezeBaseline(result.resolved),
    proposedAdjustment: result.proposedAdjustment
      ? freezeAdjustment(result.proposedAdjustment)
      : null,
    reasonCodes: uniqueSorted(result.reasonCodes),
  })
}

function deferredResult(
  reasonCodes: readonly string[],
  baseline: SurvivorSupportBaseline = EMPTY_BASELINE,
  extras: {
    registryId?: string | null
    signalId?: string | null
  } = {}
): SurvivorRegistryEvaluationResult {
  const frozenBaseline = cloneBaseline(baseline)
  return freezeResult({
    outcome: 'deferred',
    registryId: extras.registryId ?? null,
    signalId: extras.signalId ?? null,
    baseline: frozenBaseline,
    resolved: cloneBaseline(frozenBaseline),
    proposedAdjustment: null,
    reasonCodes,
  })
}

function rejectedResult(
  reasonCodes: readonly string[],
  baseline: SurvivorSupportBaseline,
  extras: {
    registryId?: string | null
    signalId?: string | null
  } = {}
): SurvivorRegistryEvaluationResult {
  const frozenBaseline = cloneBaseline(baseline)
  return freezeResult({
    outcome: 'rejected',
    registryId: extras.registryId ?? null,
    signalId: extras.signalId ?? null,
    baseline: frozenBaseline,
    resolved: cloneBaseline(frozenBaseline),
    proposedAdjustment: null,
    reasonCodes,
  })
}

function readScopeValue(decision: SurvivorSupportBaseline, scope: RegistryAdjustmentScope): string {
  switch (scope) {
    case 'support_knowledge':
      return decision.supportKnowledge
    case 'credibility_stance':
      return decision.credibilityStance
    default: {
      const _exhaustive: never = scope
      return _exhaustive
    }
  }
}

function applyAdjustment(
  decision: SurvivorSupportBaseline,
  scope: RegistryAdjustmentScope,
  toValue: string
): SurvivorSupportBaseline {
  switch (scope) {
    case 'support_knowledge':
      return freezeBaseline({ ...decision, supportKnowledge: toValue })
    case 'credibility_stance':
      return freezeBaseline({ ...decision, credibilityStance: toValue })
    default: {
      const _exhaustive: never = scope
      return _exhaustive
    }
  }
}

function isRecognitionStance(value: unknown): value is RecognitionStance {
  return typeof value === 'string' && RECOGNITION_SET.has(value)
}

function isCatalogRule(value: unknown): value is CatalogRule {
  return typeof value === 'string' && CATALOG_SET.has(value)
}

function isSupportKnowledgeBand(value: unknown): value is SupportKnowledgeBand {
  return typeof value === 'string' && BAND_SET.has(value)
}

function isCredibilityCeiling(value: unknown): value is CredibilityCeiling {
  return typeof value === 'string' && CEILING_SET.has(value)
}

function isAdjustmentScope(value: unknown): value is RegistryAdjustmentScope {
  return typeof value === 'string' && SCOPE_SET.has(value)
}

function isSignalIntent(value: unknown): value is RegistrySignalIntent {
  return typeof value === 'string' && INTENT_SET.has(value)
}

function tryNormalizeBaseline(value: unknown): SurvivorSupportBaseline | null {
  if (!isRecord(value)) {
    return null
  }

  const communityId = normalizeToken(value.communityId)
  const supportKnowledge = normalizeToken(value.supportKnowledge)
  const credibilityStance = normalizeToken(value.credibilityStance)

  if (!communityId || !supportKnowledge || !credibilityStance) {
    return null
  }

  return freezeBaseline({
    communityId,
    supportKnowledge,
    credibilityStance,
  })
}

/**
 * Evaluates whether a survivor-community informal registry signal may record
 * nonofficial support-knowledge value. Returns a proposed adjustment / resolved
 * snapshot — never a clinical database. Formal credibility elevation is capped
 * as weak testimony. Insufficient or missing inputs are no-ops.
 */
export function evaluateSurvivorInformalRegistrySignal(
  input: SurvivorRegistryEvaluationInput | null | undefined
): SurvivorRegistryEvaluationResult {
  if (input === null || input === undefined) {
    return deferredResult(['missing_evaluation_input'])
  }

  if (!isRecord(input)) {
    return deferredResult(['invalid_evaluation_input'])
  }

  const rawBaseline = input.baseline
  if (rawBaseline === null || rawBaseline === undefined) {
    return deferredResult(['missing_support_baseline'])
  }

  if (!isRecord(rawBaseline)) {
    return deferredResult(['invalid_support_baseline'])
  }

  const baseline = tryNormalizeBaseline(rawBaseline)
  if (!baseline) {
    return deferredResult(['invalid_support_baseline'])
  }

  const rawRegistry = input.registry
  if (rawRegistry === null || rawRegistry === undefined) {
    return deferredResult(['missing_survivor_registry'], baseline)
  }

  if (!isRecord(rawRegistry)) {
    return deferredResult(['invalid_survivor_registry'], baseline)
  }

  const rawSignal = input.signal
  if (rawSignal === null || rawSignal === undefined) {
    return deferredResult(['missing_registry_signal'], baseline, {
      registryId: normalizeToken((rawRegistry as SurvivorInformalRegistry).id) || null,
    })
  }

  if (!isRecord(rawSignal)) {
    return deferredResult(['invalid_registry_signal'], baseline, {
      registryId: normalizeToken((rawRegistry as SurvivorInformalRegistry).id) || null,
    })
  }

  const registry = rawRegistry as SurvivorInformalRegistry
  const signal = rawSignal as SurvivorRegistrySignal
  const registryId = normalizeToken(registry.id) || null
  const signalId = normalizeToken(signal.signalId) || null
  const signalRegistryId = normalizeToken(signal.registryId)

  if (!registryId) {
    return deferredResult(['missing_survivor_registry_id'], baseline)
  }

  if (
    !isRecognitionStance(registry.recognitionStance) ||
    !isCatalogRule(registry.catalogRule) ||
    !isSupportKnowledgeBand(registry.supportKnowledgeBand) ||
    !isCredibilityCeiling(registry.credibilityCeiling)
  ) {
    return deferredResult(['incomplete_registry_rules'], baseline, {
      registryId,
      signalId,
    })
  }

  if (!signalId) {
    return deferredResult(['missing_registry_signal_id'], baseline, {
      registryId,
    })
  }

  if (!isSignalIntent(signal.intent)) {
    return deferredResult(['missing_or_invalid_signal_intent'], baseline, {
      registryId,
      signalId,
    })
  }

  if (!isAdjustmentScope(signal.proposedScope)) {
    return deferredResult(['missing_or_invalid_proposed_scope'], baseline, {
      registryId,
      signalId,
    })
  }

  const proposedValue = normalizeToken(signal.proposedValue)
  if (!proposedValue) {
    return deferredResult(['missing_proposed_value'], baseline, {
      registryId,
      signalId,
    })
  }

  // Outcome priority: catalog rules before registry/signal mismatch (slice contract).
  if (registry.catalogRule === 'closed') {
    return rejectedResult(['catalog_closed', 'registry_rejected'], baseline, {
      registryId,
      signalId,
    })
  }

  if (registry.catalogRule === 'pattern_only' && signal.intent === 'record_symptom') {
    return deferredResult(['incomplete_catalog_rule'], baseline, {
      registryId,
      signalId,
    })
  }

  if (!signalRegistryId || signalRegistryId !== registryId) {
    return rejectedResult(['registry_rejected', 'registry_signal_mismatch'], baseline, {
      registryId,
      signalId,
    })
  }

  if (signal.proposedScope === 'credibility_stance') {
    if (signal.intent === 'contribute_support') {
      return freezeResult({
        outcome: 'weak_testimony',
        registryId,
        signalId,
        baseline,
        resolved: cloneBaseline(baseline),
        proposedAdjustment: null,
        reasonCodes: ['weak_testimony_ceiling'],
      })
    }

    return rejectedResult(['intent_scope_mismatch', 'registry_rejected'], baseline, {
      registryId,
      signalId,
    })
  }

  // Only support_knowledge remains after credibility_stance handling above.
  if (signal.proposedScope !== 'support_knowledge') {
    return rejectedResult(['intent_scope_mismatch', 'registry_rejected'], baseline, {
      registryId,
      signalId,
    })
  }

  const fromValue = readScopeValue(baseline, signal.proposedScope)
  const proposedAdjustment = freezeAdjustment({
    scope: signal.proposedScope,
    fromValue,
    toValue: proposedValue,
  })
  const resolved = applyAdjustment(baseline, signal.proposedScope, proposedValue)

  return freezeResult({
    outcome: 'recorded',
    registryId,
    signalId,
    baseline,
    resolved,
    proposedAdjustment,
    reasonCodes: ['credibility_capped_weak', 'registry_recorded'],
  })
}

/** Authored riverside survivor circle informal morbidity / recurrence registry. */
export const EXAMPLE_SURVIVOR_REGISTRY: SurvivorInformalRegistry = Object.freeze({
  id: 'registry:riverside-survivor-circle',
  recognitionStance: 'institution_refused',
  catalogRule: 'open_community',
  supportKnowledgeBand: 'peer_shared',
  credibilityCeiling: 'community_weak',
})

/** Authored support-knowledge baseline for the riverside survivor fixture. */
export const EXAMPLE_SURVIVOR_REGISTRY_BASELINE: SurvivorSupportBaseline = Object.freeze({
  communityId: 'community:riverside-survivors',
  supportKnowledge: 'none',
  credibilityStance: 'unrecognized',
})

/** Authored contribute_support signal that records nonofficial registry value. */
export const EXAMPLE_SURVIVOR_REGISTRY_SIGNAL: SurvivorRegistrySignal = Object.freeze({
  signalId: 'signal:riverside-recurrence-notes',
  registryId: 'registry:riverside-survivor-circle',
  intent: 'contribute_support',
  proposedScope: 'support_knowledge',
  proposedValue: 'recurrence_peer_notes',
})
