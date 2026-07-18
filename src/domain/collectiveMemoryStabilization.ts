/**
 * SPE-2631 / SPE-956 slice 1: collective memory-stabilization channel.
 * Pure deterministic evaluator — returns a frozen proposed-adjustment envelope.
 * Distinct from SPE-2620 advisory, SPE-2628 hotline, SPE-2629 async discussion
 * (institutional stabilize_memory), SPE-2630 survivor informal registry, and
 * SPE-1682 survivor aftereffects. No GameState persistence, store, UI, or week-close.
 */

export const MEMORY_SIGNAL_OUTCOMES = [
  'stabilized',
  'deferred',
  'rejected',
  'weak_testimony',
] as const

export type MemorySignalOutcome = (typeof MEMORY_SIGNAL_OUTCOMES)[number]

export const NARRATIVE_STANCES = [
  'shared_survivor',
  'community_oral',
  'contested_fragment',
] as const

export type NarrativeStance = (typeof NARRATIVE_STANCES)[number]

export const RECALL_WINDOWS = ['active_session', 'extended_recall', 'closed'] as const

export type RecallWindow = (typeof RECALL_WINDOWS)[number]

export const CREDIBILITY_CEILINGS = ['anecdotal', 'community_weak'] as const

export type CredibilityCeiling = (typeof CREDIBILITY_CEILINGS)[number]

export const STABILIZATION_RULES = [
  'open_shared',
  'procedure_fragments_only',
  'incomplete',
] as const

export type StabilizationRule = (typeof STABILIZATION_RULES)[number]

export const MEMORY_ADJUSTMENT_SCOPES = ['procedure_memory', 'credibility_stance'] as const

export type MemoryAdjustmentScope = (typeof MEMORY_ADJUSTMENT_SCOPES)[number]

export const MEMORY_SIGNAL_INTENTS = [
  'stabilize_recall',
  'share_narrative',
  'elevate_testimony',
] as const

export type MemorySignalIntent = (typeof MEMORY_SIGNAL_INTENTS)[number]

export interface CollectiveMemoryChannel {
  readonly id: string
  readonly narrativeStance: NarrativeStance
  readonly recallWindow: RecallWindow
  readonly credibilityCeiling: CredibilityCeiling
  readonly stabilizationRule: StabilizationRule
}

export interface CollectiveMemorySignal {
  readonly signalId: string
  readonly channelId: string
  readonly intent: MemorySignalIntent
  readonly proposedScope: MemoryAdjustmentScope
  readonly proposedValue: string
}

export interface CollectiveMemoryBaseline {
  readonly memberId: string
  readonly procedureMemory: string
  readonly credibilityStance: string
}

export interface CollectiveMemoryProposedAdjustment {
  readonly scope: MemoryAdjustmentScope
  readonly fromValue: string
  readonly toValue: string
}

export interface CollectiveMemoryEvaluationInput {
  readonly channel?: CollectiveMemoryChannel | null
  readonly signal?: CollectiveMemorySignal | null
  readonly baseline?: CollectiveMemoryBaseline | null
}

export interface CollectiveMemoryEvaluationResult {
  readonly outcome: MemorySignalOutcome
  readonly channelId: string | null
  readonly signalId: string | null
  readonly baseline: CollectiveMemoryBaseline
  readonly resolved: CollectiveMemoryBaseline
  readonly proposedAdjustment: CollectiveMemoryProposedAdjustment | null
  readonly reasonCodes: readonly string[]
}

const EMPTY_BASELINE: CollectiveMemoryBaseline = Object.freeze({
  memberId: 'member:unknown',
  procedureMemory: 'unchanged',
  credibilityStance: 'unchanged',
})

const NARRATIVE_SET = new Set<string>(NARRATIVE_STANCES)
const RECALL_SET = new Set<string>(RECALL_WINDOWS)
const CEILING_SET = new Set<string>(CREDIBILITY_CEILINGS)
const RULE_SET = new Set<string>(STABILIZATION_RULES)
const SCOPE_SET = new Set<string>(MEMORY_ADJUSTMENT_SCOPES)
const INTENT_SET = new Set<string>(MEMORY_SIGNAL_INTENTS)

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

function freezeBaseline(decision: CollectiveMemoryBaseline): CollectiveMemoryBaseline {
  return Object.freeze({
    memberId: decision.memberId,
    procedureMemory: decision.procedureMemory,
    credibilityStance: decision.credibilityStance,
  })
}

function cloneBaseline(decision: CollectiveMemoryBaseline): CollectiveMemoryBaseline {
  return freezeBaseline({ ...decision })
}

function freezeAdjustment(
  adjustment: CollectiveMemoryProposedAdjustment
): CollectiveMemoryProposedAdjustment {
  return Object.freeze({ ...adjustment })
}

function freezeResult(result: CollectiveMemoryEvaluationResult): CollectiveMemoryEvaluationResult {
  return Object.freeze({
    outcome: result.outcome,
    channelId: result.channelId,
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
  baseline: CollectiveMemoryBaseline = EMPTY_BASELINE,
  extras: {
    channelId?: string | null
    signalId?: string | null
  } = {}
): CollectiveMemoryEvaluationResult {
  const frozenBaseline = cloneBaseline(baseline)
  return freezeResult({
    outcome: 'deferred',
    channelId: extras.channelId ?? null,
    signalId: extras.signalId ?? null,
    baseline: frozenBaseline,
    resolved: cloneBaseline(frozenBaseline),
    proposedAdjustment: null,
    reasonCodes,
  })
}

function rejectedResult(
  reasonCodes: readonly string[],
  baseline: CollectiveMemoryBaseline,
  extras: {
    channelId?: string | null
    signalId?: string | null
  } = {}
): CollectiveMemoryEvaluationResult {
  const frozenBaseline = cloneBaseline(baseline)
  return freezeResult({
    outcome: 'rejected',
    channelId: extras.channelId ?? null,
    signalId: extras.signalId ?? null,
    baseline: frozenBaseline,
    resolved: cloneBaseline(frozenBaseline),
    proposedAdjustment: null,
    reasonCodes,
  })
}

function readScopeValue(decision: CollectiveMemoryBaseline, scope: MemoryAdjustmentScope): string {
  switch (scope) {
    case 'procedure_memory':
      return decision.procedureMemory
    case 'credibility_stance':
      return decision.credibilityStance
    default: {
      const _exhaustive: never = scope
      return _exhaustive
    }
  }
}

function applyAdjustment(
  decision: CollectiveMemoryBaseline,
  scope: MemoryAdjustmentScope,
  toValue: string
): CollectiveMemoryBaseline {
  switch (scope) {
    case 'procedure_memory':
      return freezeBaseline({ ...decision, procedureMemory: toValue })
    case 'credibility_stance':
      return freezeBaseline({ ...decision, credibilityStance: toValue })
    default: {
      const _exhaustive: never = scope
      return _exhaustive
    }
  }
}

function isNarrativeStance(value: unknown): value is NarrativeStance {
  return typeof value === 'string' && NARRATIVE_SET.has(value)
}

function isRecallWindow(value: unknown): value is RecallWindow {
  return typeof value === 'string' && RECALL_SET.has(value)
}

function isCredibilityCeiling(value: unknown): value is CredibilityCeiling {
  return typeof value === 'string' && CEILING_SET.has(value)
}

function isStabilizationRule(value: unknown): value is StabilizationRule {
  return typeof value === 'string' && RULE_SET.has(value)
}

function isAdjustmentScope(value: unknown): value is MemoryAdjustmentScope {
  return typeof value === 'string' && SCOPE_SET.has(value)
}

function isSignalIntent(value: unknown): value is MemorySignalIntent {
  return typeof value === 'string' && INTENT_SET.has(value)
}

function tryNormalizeBaseline(value: unknown): CollectiveMemoryBaseline | null {
  if (!isRecord(value)) {
    return null
  }

  const memberId = normalizeToken(value.memberId)
  const procedureMemory = normalizeToken(value.procedureMemory)
  const credibilityStance = normalizeToken(value.credibilityStance)

  if (!memberId || !procedureMemory || !credibilityStance) {
    return null
  }

  return freezeBaseline({
    memberId,
    procedureMemory,
    credibilityStance,
  })
}

/**
 * Evaluates whether a collective memory-stabilization signal may align fragmented
 * procedure recall via shared narrative. Returns a proposed adjustment / resolved
 * snapshot — never an institutional transcript forum (SPE-2629) or clinical record.
 * Formal credibility elevation is capped as weak testimony. Insufficient or missing
 * inputs are no-ops.
 */
export function evaluateCollectiveMemoryStabilization(
  input: CollectiveMemoryEvaluationInput | null | undefined
): CollectiveMemoryEvaluationResult {
  if (input === null || input === undefined) {
    return deferredResult(['missing_evaluation_input'])
  }

  if (!isRecord(input)) {
    return deferredResult(['invalid_evaluation_input'])
  }

  const rawBaseline = input.baseline
  if (rawBaseline === null || rawBaseline === undefined) {
    return deferredResult(['missing_memory_baseline'])
  }

  if (!isRecord(rawBaseline)) {
    return deferredResult(['invalid_memory_baseline'])
  }

  const baseline = tryNormalizeBaseline(rawBaseline)
  if (!baseline) {
    return deferredResult(['invalid_memory_baseline'])
  }

  const rawChannel = input.channel
  if (rawChannel === null || rawChannel === undefined) {
    return deferredResult(['missing_memory_channel'], baseline)
  }

  if (!isRecord(rawChannel)) {
    return deferredResult(['invalid_memory_channel'], baseline)
  }

  const rawSignal = input.signal
  if (rawSignal === null || rawSignal === undefined) {
    return deferredResult(['missing_memory_signal'], baseline, {
      channelId: normalizeToken((rawChannel as CollectiveMemoryChannel).id) || null,
    })
  }

  if (!isRecord(rawSignal)) {
    return deferredResult(['invalid_memory_signal'], baseline, {
      channelId: normalizeToken((rawChannel as CollectiveMemoryChannel).id) || null,
    })
  }

  const memoryChannel = rawChannel as CollectiveMemoryChannel
  const signal = rawSignal as CollectiveMemorySignal
  const channelId = normalizeToken(memoryChannel.id) || null
  const signalId = normalizeToken(signal.signalId) || null
  const signalChannelId = normalizeToken(signal.channelId)

  if (!channelId) {
    return deferredResult(['missing_memory_channel_id'], baseline)
  }

  if (!signalId) {
    return deferredResult(['missing_memory_signal_id'], baseline, {
      channelId,
    })
  }

  if (!isSignalIntent(signal.intent)) {
    return deferredResult(['missing_or_invalid_signal_intent'], baseline, {
      channelId,
      signalId,
    })
  }

  if (!isAdjustmentScope(signal.proposedScope)) {
    return deferredResult(['missing_or_invalid_proposed_scope'], baseline, {
      channelId,
      signalId,
    })
  }

  const proposedValue = normalizeToken(signal.proposedValue)
  if (!proposedValue) {
    return deferredResult(['missing_proposed_value'], baseline, {
      channelId,
      signalId,
    })
  }

  if (
    !isNarrativeStance(memoryChannel.narrativeStance) ||
    !isRecallWindow(memoryChannel.recallWindow) ||
    !isCredibilityCeiling(memoryChannel.credibilityCeiling) ||
    !isStabilizationRule(memoryChannel.stabilizationRule)
  ) {
    return deferredResult(['incomplete_stabilization_rules'], baseline, {
      channelId,
      signalId,
    })
  }

  // Outcome priority: stabilization / recall rules before channel/signal mismatch.
  if (memoryChannel.stabilizationRule === 'incomplete') {
    return deferredResult(['incomplete_stabilization_rule'], baseline, {
      channelId,
      signalId,
    })
  }

  if (memoryChannel.recallWindow === 'closed') {
    return rejectedResult(['memory_rejected', 'recall_window_closed'], baseline, {
      channelId,
      signalId,
    })
  }

  if (
    memoryChannel.stabilizationRule === 'procedure_fragments_only' &&
    signal.intent === 'share_narrative'
  ) {
    return deferredResult(['incomplete_stabilization_rule'], baseline, {
      channelId,
      signalId,
    })
  }

  if (!signalChannelId || signalChannelId !== channelId) {
    return rejectedResult(['channel_signal_mismatch', 'memory_rejected'], baseline, {
      channelId,
      signalId,
    })
  }

  if (signal.proposedScope === 'credibility_stance') {
    if (signal.intent === 'elevate_testimony') {
      return freezeResult({
        outcome: 'weak_testimony',
        channelId,
        signalId,
        baseline,
        resolved: cloneBaseline(baseline),
        proposedAdjustment: null,
        reasonCodes: ['weak_testimony_ceiling'],
      })
    }

    return rejectedResult(['intent_scope_mismatch', 'memory_rejected'], baseline, {
      channelId,
      signalId,
    })
  }

  // Only procedure_memory remains after credibility_stance handling above.
  if (signal.proposedScope !== 'procedure_memory') {
    return rejectedResult(['intent_scope_mismatch', 'memory_rejected'], baseline, {
      channelId,
      signalId,
    })
  }

  if (signal.intent === 'elevate_testimony') {
    return rejectedResult(['intent_scope_mismatch', 'memory_rejected'], baseline, {
      channelId,
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
    outcome: 'stabilized',
    channelId,
    signalId,
    baseline,
    resolved,
    proposedAdjustment,
    reasonCodes: ['credibility_capped_weak', 'memory_stabilized'],
  })
}

/** Authored riverside survivor/community memory-stabilization channel. */
export const EXAMPLE_MEMORY_STABILIZATION_CHANNEL: CollectiveMemoryChannel = Object.freeze({
  id: 'channel:riverside-memory-circle',
  narrativeStance: 'shared_survivor',
  recallWindow: 'active_session',
  credibilityCeiling: 'community_weak',
  stabilizationRule: 'open_shared',
})

/** Authored procedure-memory baseline for the riverside memory fixture. */
export const EXAMPLE_MEMORY_STABILIZATION_BASELINE: CollectiveMemoryBaseline = Object.freeze({
  memberId: 'member:riverside-uncertain',
  procedureMemory: 'fragmented_lockdown_steps',
  credibilityStance: 'anecdotal',
})

/** Authored stabilize_recall signal that aligns fragmented procedure memory. */
export const EXAMPLE_MEMORY_STABILIZATION_SIGNAL: CollectiveMemorySignal = Object.freeze({
  signalId: 'signal:riverside-lockdown-recall',
  channelId: 'channel:riverside-memory-circle',
  intent: 'stabilize_recall',
  proposedScope: 'procedure_memory',
  proposedValue: 'shared_lockdown_sequence',
})
