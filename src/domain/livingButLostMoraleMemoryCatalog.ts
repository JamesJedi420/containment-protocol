/**
 * SPE-1051 — pure living-but-lost / morale-memory catalog (slice 3).
 *
 * Compact authored catalog of persistent morale, memory, and living-but-lost
 * effects that sit beside the slice-1 `survivor_trauma_scar` /
 * `morale_memory_drag` modifier. Callers own group identity, effect kinds,
 * optional prior effect kinds, and optional related scar ids.
 *
 * This module does not rewrite SCAR_DEFINITIONS, persist GameState, run
 * week-close, invent true-defeat / recovery paths, UI, after-action narrative,
 * or the full SPE-1051 living-but-lost taxonomy.
 */

import { isCampaignScarId, type CampaignScarId } from './campaignScarDegradedState'

/**
 * Compact catalog beyond the single trauma-scar morale modifier.
 * Full taxonomy (institutionalization, fugue, paranoia, chanting fixation,
 * dissociation, identity erosion, patron devotion, anomaly obsession, care
 * burden, recovery paths) stays deferred.
 */
export const LIVING_BUT_LOST_MORALE_MEMORY_KINDS = [
  'guilt',
  'distrust',
  'refusal',
  'protective_custody',
] as const
export type LivingButLostMoraleMemoryKind = (typeof LIVING_BUT_LOST_MORALE_MEMORY_KINDS)[number]

export const LIVING_BUT_LOST_MORALE_MEMORY_CATEGORIES = [
  'morale_memory',
  'living_but_lost',
] as const
export type LivingButLostMoraleMemoryCategory =
  (typeof LIVING_BUT_LOST_MORALE_MEMORY_CATEGORIES)[number]

export const LIVING_BUT_LOST_MORALE_MEMORY_GROUP_KINDS = ['survivor', 'staff'] as const
export type LivingButLostMoraleMemoryGroupKind =
  (typeof LIVING_BUT_LOST_MORALE_MEMORY_GROUP_KINDS)[number]

export const LIVING_BUT_LOST_MORALE_MEMORY_OUTCOME_KINDS = ['persistent_after_loss'] as const
export type LivingButLostMoraleMemoryOutcomeKind =
  (typeof LIVING_BUT_LOST_MORALE_MEMORY_OUTCOME_KINDS)[number]

export interface LivingButLostMoraleMemoryInput {
  /**
   * Optional newly configured effect kind. When omitted, priorEffectKinds must
   * supply at least one known kind (turnover carry).
   */
  readonly effectKind?: LivingButLostMoraleMemoryKind
  /** Required: survivor or staff group that retains the effect after loss. */
  readonly retainedByGroupId: string
  readonly retainedByGroupKind: LivingButLostMoraleMemoryGroupKind
  /** Caller-owned prior effect kinds that must survive personnel turnover. */
  readonly priorEffectKinds?: readonly LivingButLostMoraleMemoryKind[]
  /** Acknowledged for persistence; never clears catalog effects by itself. */
  readonly personnelTurnoverCount?: number
  /**
   * Optional scar adjacency. When present must be a known CampaignScarId
   * (typically `survivor_trauma_scar` beside `morale_memory_drag`).
   */
  readonly relatedScarId?: CampaignScarId
}

export interface LivingButLostMoraleMemoryEffect {
  readonly effectKind: LivingButLostMoraleMemoryKind
  readonly category: LivingButLostMoraleMemoryCategory
  readonly moraleMemoryDrag: number
  readonly livingButLostBurden: number
  readonly persistsAcrossPersonnelTurnover: true
}

export interface LivingButLostMoraleMemoryProjection {
  readonly outcomeKind: 'persistent_after_loss'
  readonly retainedByGroupId: string
  readonly retainedByGroupKind: LivingButLostMoraleMemoryGroupKind
  readonly activeEffects: readonly LivingButLostMoraleMemoryEffect[]
  readonly firedEffectKinds: readonly LivingButLostMoraleMemoryKind[]
  readonly relatedScarId: CampaignScarId | null
  readonly personnelTurnoverCount: number
}

interface EffectDefinition {
  readonly effectKind: LivingButLostMoraleMemoryKind
  readonly category: LivingButLostMoraleMemoryCategory
  readonly moraleMemoryDrag: number
  readonly livingButLostBurden: number
}

/**
 * Authored catalog table. Order is projection order (byte-stable).
 * Sits beside slice-1 `morale_memory_drag`; does not replace it.
 */
const EFFECT_DEFINITIONS: readonly EffectDefinition[] = Object.freeze([
  Object.freeze({
    effectKind: 'guilt' as const,
    category: 'morale_memory' as const,
    moraleMemoryDrag: 10,
    livingButLostBurden: 0,
  }),
  Object.freeze({
    effectKind: 'distrust' as const,
    category: 'morale_memory' as const,
    moraleMemoryDrag: 12,
    livingButLostBurden: 0,
  }),
  Object.freeze({
    effectKind: 'refusal' as const,
    category: 'morale_memory' as const,
    moraleMemoryDrag: 14,
    livingButLostBurden: 0,
  }),
  Object.freeze({
    effectKind: 'protective_custody' as const,
    category: 'living_but_lost' as const,
    moraleMemoryDrag: 6,
    livingButLostBurden: 20,
  }),
])

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function isLivingButLostMoraleMemoryKind(
  value: unknown
): value is LivingButLostMoraleMemoryKind {
  return LIVING_BUT_LOST_MORALE_MEMORY_KINDS.some((kind) => kind === value)
}

export function isLivingButLostMoraleMemoryCategory(
  value: unknown
): value is LivingButLostMoraleMemoryCategory {
  return LIVING_BUT_LOST_MORALE_MEMORY_CATEGORIES.some((category) => category === value)
}

export function isLivingButLostMoraleMemoryGroupKind(
  value: unknown
): value is LivingButLostMoraleMemoryGroupKind {
  return LIVING_BUT_LOST_MORALE_MEMORY_GROUP_KINDS.some((kind) => kind === value)
}

export function isLivingButLostMoraleMemoryOutcomeKind(
  value: unknown
): value is LivingButLostMoraleMemoryOutcomeKind {
  return LIVING_BUT_LOST_MORALE_MEMORY_OUTCOME_KINDS.some((kind) => kind === value)
}

/**
 * Validate caller-owned inputs. retainedByGroupId / retainedByGroupKind are
 * required. At least one of effectKind or priorEffectKinds (non-empty known
 * kinds) must be present. relatedScarId, when present, must be a known
 * CampaignScarId. Malformed fields fail closed.
 */
export function validateLivingButLostMoraleMemoryInput(
  input: unknown
): input is LivingButLostMoraleMemoryInput {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return false
  }
  const record = input as Record<string, unknown>

  if (!('retainedByGroupId' in record)) return false
  if (typeof record.retainedByGroupId !== 'string' || record.retainedByGroupId.length === 0) {
    return false
  }

  if (
    !('retainedByGroupKind' in record) ||
    !isLivingButLostMoraleMemoryGroupKind(record.retainedByGroupKind)
  ) {
    return false
  }

  let hasConfiguredEffect = false

  if ('effectKind' in record) {
    if (!isLivingButLostMoraleMemoryKind(record.effectKind)) return false
    hasConfiguredEffect = true
  }

  if ('priorEffectKinds' in record) {
    const prior = record.priorEffectKinds
    if (!Array.isArray(prior)) return false
    for (const kind of prior) {
      if (!isLivingButLostMoraleMemoryKind(kind)) return false
    }
    if (prior.length > 0) hasConfiguredEffect = true
  }

  if (!hasConfiguredEffect) return false

  if ('personnelTurnoverCount' in record) {
    if (!isNonNegativeFiniteNumber(record.personnelTurnoverCount)) return false
  }

  if ('relatedScarId' in record) {
    if (!isCampaignScarId(record.relatedScarId)) return false
  }

  return true
}

function buildEffectRecord(definition: EffectDefinition): LivingButLostMoraleMemoryEffect {
  return Object.freeze({
    effectKind: definition.effectKind,
    category: definition.category,
    moraleMemoryDrag: definition.moraleMemoryDrag,
    livingButLostBurden: definition.livingButLostBurden,
    persistsAcrossPersonnelTurnover: true as const,
  })
}

/**
 * Project caller-owned living-but-lost / morale-memory configuration into an
 * immutable catalog projection. Malformed / omitted inputs fail closed to
 * undefined.
 *
 * priorEffectKinds re-emit through personnel turnover (personnelTurnoverCount
 * does not clear effects). Catalog order is byte-stable.
 */
export function projectLivingButLostMoraleMemory(
  input: LivingButLostMoraleMemoryInput | null | undefined
): LivingButLostMoraleMemoryProjection | undefined {
  if (!validateLivingButLostMoraleMemoryInput(input)) return undefined

  const activeKinds = new Set<LivingButLostMoraleMemoryKind>()
  if (input.effectKind !== undefined) {
    activeKinds.add(input.effectKind)
  }
  if (input.priorEffectKinds) {
    for (const kind of input.priorEffectKinds) {
      activeKinds.add(kind)
    }
  }

  const activeEffects: LivingButLostMoraleMemoryEffect[] = []
  for (const definition of EFFECT_DEFINITIONS) {
    if (!activeKinds.has(definition.effectKind)) continue
    activeEffects.push(buildEffectRecord(definition))
  }

  return Object.freeze({
    outcomeKind: 'persistent_after_loss' as const,
    retainedByGroupId: input.retainedByGroupId,
    retainedByGroupKind: input.retainedByGroupKind,
    activeEffects: Object.freeze(activeEffects),
    firedEffectKinds: Object.freeze(activeEffects.map((effect) => effect.effectKind)),
    relatedScarId: input.relatedScarId === undefined ? null : input.relatedScarId,
    personnelTurnoverCount:
      input.personnelTurnoverCount === undefined ? 0 : input.personnelTurnoverCount,
  })
}

export function listLivingButLostMoraleMemoryKinds(): readonly LivingButLostMoraleMemoryKind[] {
  return LIVING_BUT_LOST_MORALE_MEMORY_KINDS
}
