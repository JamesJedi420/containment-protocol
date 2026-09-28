/**
 * SPE-1051 — pure post-loss adaptation unlock projector (slice 4).
 *
 * Callers own prior collapse history as CampaignScarId values and/or
 * LivingButLostMoraleMemoryKind values. When at least one known history id is
 * present, this module projects exactly one named adaptation unlock.
 *
 * The projection records the unlock only — it does not erase, rewrite, or
 * clear scar / living-but-lost catalog effects. It does not persist GameState,
 * run week-close, invent true-defeat, UI, after-action narrative, sealed-site
 * endings, or the full SPE-1051 adaptation list (audits, emergency authority,
 * backup sites, forbidden countermeasures).
 *
 * SPE-1694 (Post-loss legacy interventions) is canceled and is not an owner;
 * ownership of this unlock stays on SPE-1051.
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
 * Smallest authored unlock set that still names a real post-loss adaptation.
 * Full SPE-1051 list (audits, emergency authority, backup sites, forbidden
 * countermeasures) stays deferred.
 */
export const POST_LOSS_ADAPTATION_UNLOCK_IDS = ['stricter_access_rules'] as const
export type PostLossAdaptationUnlockId = (typeof POST_LOSS_ADAPTATION_UNLOCK_IDS)[number]

export const POST_LOSS_ADAPTATION_UNLOCK_OUTCOME_KINDS = ['adaptation_unlocked'] as const
export type PostLossAdaptationUnlockOutcomeKind =
  (typeof POST_LOSS_ADAPTATION_UNLOCK_OUTCOME_KINDS)[number]

/** Primary authored unlock for prior collapse history. */
export const POST_LOSS_PRIMARY_ADAPTATION_UNLOCK_ID: PostLossAdaptationUnlockId =
  'stricter_access_rules'

export interface PostLossAdaptationUnlockInput {
  /** Caller-owned prior scar ids from collapse history. */
  readonly priorScarIds?: readonly CampaignScarId[]
  /** Caller-owned prior living-but-lost / morale-memory catalog kinds. */
  readonly priorMoraleMemoryKinds?: readonly LivingButLostMoraleMemoryKind[]
}

export interface PostLossAdaptationUnlockProjection {
  readonly outcomeKind: 'adaptation_unlocked'
  readonly unlockId: PostLossAdaptationUnlockId
  /** Known prior scar ids that contributed (authored registry order, deduped). */
  readonly contributingScarIds: readonly CampaignScarId[]
  /** Known prior catalog kinds that contributed (authored catalog order, deduped). */
  readonly contributingMoraleMemoryKinds: readonly LivingButLostMoraleMemoryKind[]
  /**
   * Always true — this projector only records the unlock; it never erases or
   * rewrites original scar / catalog effects.
   */
  readonly preservesPriorCollapseHistory: true
}

export function isPostLossAdaptationUnlockId(value: unknown): value is PostLossAdaptationUnlockId {
  return POST_LOSS_ADAPTATION_UNLOCK_IDS.some((id) => id === value)
}

export function isPostLossAdaptationUnlockOutcomeKind(
  value: unknown
): value is PostLossAdaptationUnlockOutcomeKind {
  return POST_LOSS_ADAPTATION_UNLOCK_OUTCOME_KINDS.some((kind) => kind === value)
}

/**
 * Validate caller-owned inputs. At least one of priorScarIds or
 * priorMoraleMemoryKinds must be a non-empty array of known ids. Present
 * arrays must contain only known ids (unknown fails closed). Empty history,
 * omit of both fields, null, and malformed shapes fail closed.
 */
export function validatePostLossAdaptationUnlockInput(
  input: unknown
): input is PostLossAdaptationUnlockInput {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return false
  }
  const record = input as Record<string, unknown>

  let hasConfiguredHistory = false

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
 * Project caller-owned prior collapse history into one named post-loss
 * adaptation unlock. Omit / null / undefined / unknown / empty / malformed
 * inputs fail closed to undefined. Never invents additional unlocks, never
 * erases scar or catalog effects, and uses no randomness.
 */
export function projectPostLossAdaptationUnlock(
  input: PostLossAdaptationUnlockInput | null | undefined
): PostLossAdaptationUnlockProjection | undefined {
  if (!validatePostLossAdaptationUnlockInput(input)) return undefined

  const contributingScarIds = orderedUniqueScarIds(input.priorScarIds ?? [])
  const contributingMoraleMemoryKinds = orderedUniqueMoraleMemoryKinds(
    input.priorMoraleMemoryKinds ?? []
  )

  return Object.freeze({
    outcomeKind: 'adaptation_unlocked' as const,
    unlockId: POST_LOSS_PRIMARY_ADAPTATION_UNLOCK_ID,
    contributingScarIds,
    contributingMoraleMemoryKinds,
    preservesPriorCollapseHistory: true as const,
  })
}

export function listPostLossAdaptationUnlockIds(): readonly PostLossAdaptationUnlockId[] {
  return POST_LOSS_ADAPTATION_UNLOCK_IDS
}
