import { type GameState } from '../models'
import { ensureNormalizedGameState, normalizeGameState } from '../teamSimulation'

export const MAX_ACADEMY_TIER = 3

/**
 * Funding cost to upgrade from tier N to tier N+1.
 * Index 0 = tier 0 → 1, index 1 = tier 1 → 2, index 2 = tier 2 → 3.
 */
export const ACADEMY_UPGRADE_COSTS: readonly number[] = [200, 500, 1000]

/**
 * Returns the funding cost to upgrade from the current tier, or null if already at max.
 */
export function getAcademyUpgradeCost(tier: number): number | null {
  if (tier >= MAX_ACADEMY_TIER) {
    return null
  }

  return ACADEMY_UPGRADE_COSTS[tier] ?? null
}

/**
 * Returns the permanent stat bonus applied on training completion for the given tier.
 * Tier 0: no bonus. Tiers 1–3: +1 to the trained stat.
 */
export function getAcademyStatBonus(tier: number): number {
  return tier >= 1 ? 1 : 0
}

/**
 * Upgrades the academy by one tier, deducting the funding cost.
 * No-op if already at MAX_ACADEMY_TIER or if funding is insufficient.
 */
export function upgradeAcademy(state: GameState): GameState {
  const currentTier = state.academyTier ?? 0
  const cost = getAcademyUpgradeCost(currentTier)

  if (cost === null || state.funding < cost) {
    return ensureNormalizedGameState(state)
  }

  return normalizeGameState({
    ...state,
    academyTier: currentTier + 1,
    funding: state.funding - cost,
  })
}
