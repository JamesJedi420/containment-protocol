/**
 * SPE-1051 — pure after-action cause-chain projector (slice 5).
 *
 * Callers own a terminal failure id and/or prior CampaignScarId values and/or
 * LivingButLostMoraleMemoryKind values. When at least one configured history
 * source is present, this module emits one after-action output that names a
 * cause chain: terminal failure, intermediate breakdowns, and at least one
 * hidden dependency — not only the end result.
 *
 * The projection records the explanation only — it does not erase, rewrite,
 * or clear scar / living-but-lost catalog / adaptation-unlock effects. It does
 * not persist GameState, run week-close, invent true-defeat, UI, sealed-site
 * endings, or a full SPE-868 review-metrics surface.
 */

import {
  isCampaignScarId,
  type CampaignScarId,
  CAMPAIGN_SCAR_IDS,
} from './campaignScarDegradedState'
import {
  isLivingButLostMoraleMemoryKind,
  type LivingButLostMoraleMemoryKind,
  LIVING_BUT_LOST_MORALE_MEMORY_KINDS,
} from './livingButLostMoraleMemoryCatalog'

/**
 * Smallest authored cause-chain set that still names intermediate breakdowns
 * and a hidden dependency. Broader multi-system collapse narratives stay
 * deferred.
 */
export const AFTER_ACTION_CAUSE_CHAIN_IDS = ['recoverable_failure_systemic_collapse'] as const
export type AfterActionCauseChainId = (typeof AFTER_ACTION_CAUSE_CHAIN_IDS)[number]

export const AFTER_ACTION_CAUSE_CHAIN_OUTCOME_KINDS = ['after_action_cause_chain'] as const
export type AfterActionCauseChainOutcomeKind =
  (typeof AFTER_ACTION_CAUSE_CHAIN_OUTCOME_KINDS)[number]

/** Primary authored chain for configured recoverable-failure history. */
export const AFTER_ACTION_PRIMARY_CHAIN_ID: AfterActionCauseChainId =
  'recoverable_failure_systemic_collapse'

/**
 * Default terminal when the caller omits terminalFailureId. Grounded in the
 * slice-1 site-abandonment → strained-logistics cascade end-state.
 */
export const AFTER_ACTION_DEFAULT_TERMINAL_FAILURE_ID = 'strained_logistics_collapse'

export const AFTER_ACTION_INTERMEDIATE_BREAKDOWN_IDS = [
  'site_access_degradation',
  'logistics_strain_escalation',
] as const
export type AfterActionIntermediateBreakdownId =
  (typeof AFTER_ACTION_INTERMEDIATE_BREAKDOWN_IDS)[number]

/**
 * Authored hidden dependency — not visible from the terminal label alone.
 * Reflects maintenance/routing backlog coupling behind logistics collapse.
 */
export const AFTER_ACTION_HIDDEN_DEPENDENCY_IDS = ['maintenance_routing_backlog'] as const
export type AfterActionHiddenDependencyId = (typeof AFTER_ACTION_HIDDEN_DEPENDENCY_IDS)[number]

export interface AfterActionCauseChainInput {
  /** Optional caller-owned terminal failure id (non-empty string when present). */
  readonly terminalFailureId?: string
  /** Caller-owned prior scar ids from collapse history. */
  readonly priorScarIds?: readonly CampaignScarId[]
  /** Caller-owned prior living-but-lost / morale-memory catalog kinds. */
  readonly priorMoraleMemoryKinds?: readonly LivingButLostMoraleMemoryKind[]
}

export interface AfterActionCauseChainProjection {
  readonly outcomeKind: 'after_action_cause_chain'
  readonly chainId: AfterActionCauseChainId
  readonly terminalFailureId: string
  /** Authored intermediate breakdowns that produced the terminal failure. */
  readonly intermediateBreakdownIds: readonly AfterActionIntermediateBreakdownId[]
  /**
   * Authored hidden dependencies (≥1). Explains systemic coupling that is not
   * visible from the terminal failure label alone.
   */
  readonly hiddenDependencyIds: readonly AfterActionHiddenDependencyId[]
  /** Known prior scar ids that contributed (authored registry order, deduped). */
  readonly contributingScarIds: readonly CampaignScarId[]
  /** Known prior catalog kinds that contributed (authored catalog order, deduped). */
  readonly contributingMoraleMemoryKinds: readonly LivingButLostMoraleMemoryKind[]
  /**
   * Always true — this projector names intermediate + hidden factors, never
   * only the terminal end result.
   */
  readonly explainsBeyondTerminalResult: true
}

export function isAfterActionCauseChainId(value: unknown): value is AfterActionCauseChainId {
  return AFTER_ACTION_CAUSE_CHAIN_IDS.some((id) => id === value)
}

export function isAfterActionCauseChainOutcomeKind(
  value: unknown
): value is AfterActionCauseChainOutcomeKind {
  return AFTER_ACTION_CAUSE_CHAIN_OUTCOME_KINDS.some((kind) => kind === value)
}

export function isAfterActionIntermediateBreakdownId(
  value: unknown
): value is AfterActionIntermediateBreakdownId {
  return AFTER_ACTION_INTERMEDIATE_BREAKDOWN_IDS.some((id) => id === value)
}

export function isAfterActionHiddenDependencyId(
  value: unknown
): value is AfterActionHiddenDependencyId {
  return AFTER_ACTION_HIDDEN_DEPENDENCY_IDS.some((id) => id === value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/**
 * Validate caller-owned inputs. At least one of terminalFailureId (non-empty),
 * priorScarIds (non-empty known), or priorMoraleMemoryKinds (non-empty known)
 * must be present. Present arrays must contain only known ids (unknown fails
 * closed). Empty history, omit of all sources, null, and malformed shapes fail
 * closed.
 */
export function validateAfterActionCauseChainInput(
  input: unknown
): input is AfterActionCauseChainInput {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return false
  }
  const record = input as Record<string, unknown>

  let hasConfiguredHistory = false

  if ('terminalFailureId' in record) {
    if (!isNonEmptyString(record.terminalFailureId)) return false
    hasConfiguredHistory = true
  }

  if ('priorScarIds' in record) {
    const prior = record.priorScarIds
    if (!Array.isArray(prior)) return false
    for (const id of prior) {
      if (!isCampaignScarId(id)) return false
    }
    if (prior.length > 0) hasConfiguredHistory = true
  }

  if ('priorMoraleMemoryKinds' in record) {
    const prior = record.priorMoraleMemoryKinds
    if (!Array.isArray(prior)) return false
    for (const kind of prior) {
      if (!isLivingButLostMoraleMemoryKind(kind)) return false
    }
    if (prior.length > 0) hasConfiguredHistory = true
  }

  return hasConfiguredHistory
}

function orderedUniqueScarIds(ids: readonly CampaignScarId[]): readonly CampaignScarId[] {
  const present = new Set(ids)
  return Object.freeze(CAMPAIGN_SCAR_IDS.filter((id) => present.has(id)))
}

function orderedUniqueMoraleMemoryKinds(
  kinds: readonly LivingButLostMoraleMemoryKind[]
): readonly LivingButLostMoraleMemoryKind[] {
  const present = new Set(kinds)
  return Object.freeze(LIVING_BUT_LOST_MORALE_MEMORY_KINDS.filter((kind) => present.has(kind)))
}

/**
 * Project caller-owned failure / scar / catalog history into one after-action
 * cause-chain explanation. Omit / null / undefined / unknown / empty /
 * malformed inputs fail closed to undefined. Never invents additional chains,
 * never erases scar/catalog/unlock effects, and uses no randomness.
 */
export function projectAfterActionCauseChain(
  input: AfterActionCauseChainInput | null | undefined
): AfterActionCauseChainProjection | undefined {
  if (!validateAfterActionCauseChainInput(input)) return undefined

  const contributingScarIds = orderedUniqueScarIds(input.priorScarIds ?? [])
  const contributingMoraleMemoryKinds = orderedUniqueMoraleMemoryKinds(
    input.priorMoraleMemoryKinds ?? []
  )

  const terminalFailureId = isNonEmptyString(input.terminalFailureId)
    ? input.terminalFailureId
    : AFTER_ACTION_DEFAULT_TERMINAL_FAILURE_ID

  return Object.freeze({
    outcomeKind: 'after_action_cause_chain' as const,
    chainId: AFTER_ACTION_PRIMARY_CHAIN_ID,
    terminalFailureId,
    intermediateBreakdownIds: Object.freeze([...AFTER_ACTION_INTERMEDIATE_BREAKDOWN_IDS]),
    hiddenDependencyIds: Object.freeze([...AFTER_ACTION_HIDDEN_DEPENDENCY_IDS]),
    contributingScarIds,
    contributingMoraleMemoryKinds,
    explainsBeyondTerminalResult: true as const,
  })
}

export function listAfterActionCauseChainIds(): readonly AfterActionCauseChainId[] {
  return AFTER_ACTION_CAUSE_CHAIN_IDS
}

export function listAfterActionHiddenDependencyIds(): readonly AfterActionHiddenDependencyId[] {
  return AFTER_ACTION_HIDDEN_DEPENDENCY_IDS
}
