/**
 * SPE-3520 — Triggered-effect recursion guard and execution-chain budget.
 *
 * Pure, deterministic chain-lineage tracker for anomaly/effect trigger chains.
 * Detects self/mutual/multi-node cycles and enforces a declared step budget.
 * Does not own effect resolution, persistence, or event bus; callers consume
 * the result and apply already-committed effects. No GameState mutation.
 */

export const TRIGGERED_EFFECT_RECURSION_GUARD_OWNER = 'SPE-3520' as const
export const TRIGGERED_EFFECT_RECURSION_GUARD_SCHEMA_VERSION = 'spe-3520.v1' as const

export const DEFAULT_CHAIN_STEP_BUDGET = 32 as const

export const TERMINATION_REASONS = [
  'self_trigger_cycle',
  'mutual_cycle',
  'multi_node_cycle',
  'step_budget_exceeded',
  'malformed_lineage',
  'missing_chain_identity',
] as const
export type TerminationReason = (typeof TERMINATION_REASONS)[number]

export interface EffectStep {
  readonly effectId: string
  readonly triggerId: string
  /** Stable identity of the chain this step belongs to. */
  readonly chainId: string
  /** Optional parent step identity for lineage (empty for root). */
  readonly parentStepId?: string
}

export interface ChainState {
  readonly chainId: string
  readonly lineage: readonly string[] // ordered effectIds from root
  readonly stepCount: number
  readonly consumedStepIds: ReadonlySet<string>
}

export interface GuardCheckInput {
  readonly step: EffectStep
  readonly currentState?: ChainState
  readonly budget?: number
}

export interface GuardCheckResult {
  readonly allowed: boolean
  readonly reason?: TerminationReason
  readonly nextState: ChainState
  readonly owner: typeof TRIGGERED_EFFECT_RECURSION_GUARD_OWNER
  readonly schemaVersion: typeof TRIGGERED_EFFECT_RECURSION_GUARD_SCHEMA_VERSION
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function emptyState(chainId: string): ChainState {
  return Object.freeze({
    chainId,
    lineage: Object.freeze([]),
    stepCount: 0,
    consumedStepIds: new Set<string>(),
  })
}

/**
 * Check whether the proposed step is permitted on the chain.
 * Returns the next immutable state whether allowed or terminated.
 * Idempotent on already-consumed step ids.
 */
export function checkTriggeredEffectStep(input: GuardCheckInput | null | undefined): GuardCheckResult {
  const budget = typeof input?.budget === 'number' && input.budget > 0 ? input.budget : DEFAULT_CHAIN_STEP_BUDGET

  if (input == null || typeof input !== 'object' || !isNonEmptyString(input.step?.effectId) || !isNonEmptyString(input.step?.triggerId) || !isNonEmptyString(input.step?.chainId)) {
    const chainId = normalizeId(input?.step?.chainId) || 'unknown'
    return Object.freeze({
      allowed: false,
      reason: 'malformed_lineage',
      nextState: emptyState(chainId),
      owner: TRIGGERED_EFFECT_RECURSION_GUARD_OWNER,
      schemaVersion: TRIGGERED_EFFECT_RECURSION_GUARD_SCHEMA_VERSION,
    })
  }

  const step = input.step
  const chainId = normalizeId(step.chainId)
  const effectId = normalizeId(step.effectId)
  const stepId = `${chainId}:${normalizeId(step.triggerId)}:${effectId}`

  const prior = input.currentState && input.currentState.chainId === chainId ? input.currentState : emptyState(chainId)

  // Idempotent replay of already-consumed step
  if (prior.consumedStepIds.has(stepId)) {
    return Object.freeze({
      allowed: true,
      nextState: prior,
      owner: TRIGGERED_EFFECT_RECURSION_GUARD_OWNER,
      schemaVersion: TRIGGERED_EFFECT_RECURSION_GUARD_SCHEMA_VERSION,
    })
  }

  if (prior.stepCount >= budget) {
    return Object.freeze({
      allowed: false,
      reason: 'step_budget_exceeded',
      nextState: prior,
      owner: TRIGGERED_EFFECT_RECURSION_GUARD_OWNER,
      schemaVersion: TRIGGERED_EFFECT_RECURSION_GUARD_SCHEMA_VERSION,
    })
  }

  // Direct self-trigger
  if (prior.lineage.length > 0 && prior.lineage[prior.lineage.length - 1] === effectId) {
    return Object.freeze({
      allowed: false,
      reason: 'self_trigger_cycle',
      nextState: prior,
      owner: TRIGGERED_EFFECT_RECURSION_GUARD_OWNER,
      schemaVersion: TRIGGERED_EFFECT_RECURSION_GUARD_SCHEMA_VERSION,
    })
  }

  // Mutual or multi-node cycle: effect already appears earlier in lineage
  if (prior.lineage.includes(effectId)) {
    const reason: TerminationReason = prior.lineage.length === 1 ? 'mutual_cycle' : 'multi_node_cycle'
    return Object.freeze({
      allowed: false,
      reason,
      nextState: prior,
      owner: TRIGGERED_EFFECT_RECURSION_GUARD_OWNER,
      schemaVersion: TRIGGERED_EFFECT_RECURSION_GUARD_SCHEMA_VERSION,
    })
  }

  // Allowed — extend lineage
  const nextLineage = Object.freeze([...prior.lineage, effectId])
  const nextConsumed = new Set(prior.consumedStepIds)
  nextConsumed.add(stepId)

  const nextState = Object.freeze({
    chainId,
    lineage: nextLineage,
    stepCount: prior.stepCount + 1,
    consumedStepIds: nextConsumed,
  })

  return Object.freeze({
    allowed: true,
    nextState,
    owner: TRIGGERED_EFFECT_RECURSION_GUARD_OWNER,
    schemaVersion: TRIGGERED_EFFECT_RECURSION_GUARD_SCHEMA_VERSION,
  })
}

/** Authoring-time static cycle check for a declared trigger definition. */
export function rejectStaticCycle(triggers: readonly { readonly from: string; readonly to: string }[]): boolean {
  const graph = new Map<string, string[]>()
  for (const edge of triggers) {
    if (!isNonEmptyString(edge.from) || !isNonEmptyString(edge.to)) continue
    const list = graph.get(edge.from) ?? []
    list.push(edge.to)
    graph.set(edge.from, list)
  }
  const visiting = new Set<string>()
  const visited = new Set<string>()
  function dfs(node: string): boolean {
    if (visiting.has(node)) return true // cycle
    if (visited.has(node)) return false
    visiting.add(node)
    for (const next of graph.get(node) ?? []) {
      if (dfs(next)) return true
    }
    visiting.delete(node)
    visited.add(node)
    return false
  }
  for (const node of graph.keys()) {
    if (dfs(node)) return true
  }
  return false
}
