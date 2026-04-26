// SPE-687: Harvested-mind loadouts
// Compact predator-power layer. Hostiles that consume high-value minds gain
// victim-specific capabilities stored as a bounded loadout. Reserve organ slots
// allow swapping the active toolkit without re-hunting.
//
// All exported resolve functions are deterministic: same seedKey + same inputs
// always produce the same output. Pass rng() as the tie-break param where noted.

import type { HarvestSourceId, HarvestedMindLoadout, ReserveOrganSlot } from './models'

// ── RNG helpers (file-local, same FNV-1a + LCG pattern as pipeline.ts) ───────

function hashSeed(seedKey: string) {
  let hash = 2166136261

  for (let index = 0; index < seedKey.length; index += 1) {
    hash ^= seedKey.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function createDeterministicRng(seedKey: string) {
  let state = hashSeed(seedKey) || 1

  return () => {
    state = Math.imul(1664525, state) + 1013904223
    const unsigned = state >>> 0
    return unsigned / 0x100000000
  }
}

// ── Capability catalog ────────────────────────────────────────────────────────

/** A single capability entry in the harvest catalog. */
export interface HarvestCapabilityDescriptor {
  /** Stable opaque ID used in derivedCapabilityIds and test assertions. */
  id: string
  /** Human-readable label for authoring and debug review. */
  label: string
  /** Additive melee factor modifier applied to the hosting combat unit. */
  meleeMod: number
  /** Additive defense factor modifier applied to the hosting combat unit. */
  defenseMod: number
  /** Additive control-reach modifier (how far the hostile can project dominance). */
  controlReachMod: number
  /** Narrative hint used in intel explanations. */
  hint: string
}

/**
 * Capabilities available per harvest-source victim type.
 * Each source provides exactly one primary capability and optionally one
 * secondary capability at a deterministic RNG threshold (>= 0.55).
 */
export const HARVEST_CAPABILITY_CATALOG: Readonly<
  Record<HarvestSourceId, readonly HarvestCapabilityDescriptor[]>
> = {
  academic: [
    {
      id: 'academic:enhanced_cognition',
      label: 'Enhanced Cognition',
      meleeMod: 0,
      defenseMod: 0,
      controlReachMod: 1,
      hint: 'Harvested scholar mind expands perceptual range.',
    },
    {
      id: 'academic:pattern_recognition',
      label: 'Pattern Recognition',
      meleeMod: 0,
      defenseMod: 1,
      controlReachMod: 0,
      hint: 'Harvested researcher intuition improves threat anticipation.',
    },
  ],
  mystic: [
    {
      id: 'mystic:ward_sense',
      label: 'Ward Sense',
      meleeMod: 0,
      defenseMod: 1,
      controlReachMod: 1,
      hint: 'Harvested occult knowledge enables detection of protective barriers.',
    },
    {
      id: 'mystic:remote_sense',
      label: 'Remote Sense',
      meleeMod: 0,
      defenseMod: 0,
      controlReachMod: 2,
      hint: 'Harvested mystic perception extends surveillance reach.',
    },
  ],
  engineer: [
    {
      id: 'engineer:structural_exploit',
      label: 'Structural Exploitation',
      meleeMod: 1,
      defenseMod: 0,
      controlReachMod: 0,
      hint: 'Harvested technical mind identifies structural weak points.',
    },
    {
      id: 'engineer:trap_bypass',
      label: 'Trap Bypass',
      meleeMod: 0,
      defenseMod: 1,
      controlReachMod: 0,
      hint: 'Harvested engineering knowledge neutralises operative countermeasures.',
    },
  ],
  soldier: [
    {
      id: 'soldier:formation_awareness',
      label: 'Formation Awareness',
      meleeMod: 2,
      defenseMod: 0,
      controlReachMod: 0,
      hint: 'Harvested combat experience sharpens offensive timing.',
    },
    {
      id: 'soldier:defensive_discipline',
      label: 'Defensive Discipline',
      meleeMod: 0,
      defenseMod: 2,
      controlReachMod: 0,
      hint: 'Harvested military conditioning hardens the hostile against counterattack.',
    },
  ],
  administrator: [
    {
      id: 'administrator:cover_depth',
      label: 'Cover Depth',
      meleeMod: 0,
      defenseMod: 1,
      controlReachMod: 1,
      hint: 'Harvested bureaucratic knowledge deepens institutional cover.',
    },
    {
      id: 'administrator:social_infiltration',
      label: 'Social Infiltration',
      meleeMod: 0,
      defenseMod: 0,
      controlReachMod: 2,
      hint: 'Harvested administrative access extends covert reach into institutions.',
    },
  ],
}

// ── Resolve functions ─────────────────────────────────────────────────────────

/**
 * Resolves the active capability set for a given harvest source.
 *
 * Always includes the primary capability (index 0).
 * Includes the secondary capability (index 1) when the rng() roll >= 0.55.
 * This makes secondary capabilities consistently available for strong specimens
 * while preserving determinism across identical seeds.
 *
 * @param sourceId  The victim type that was harvested.
 * @param seedKey   Opaque string (typically unitId:sourceId) for seeded RNG.
 * @returns         Array of resolved capability IDs.
 */
function resolveCapabilityIds(sourceId: HarvestSourceId, seedKey: string): string[] {
  const capabilities = HARVEST_CAPABILITY_CATALOG[sourceId]
  const rng = createDeterministicRng(`${seedKey}:caps`)
  const ids = [capabilities[0].id]

  if (capabilities.length > 1 && rng() >= 0.55) {
    ids.push(capabilities[1].id)
  }

  return ids
}

/**
 * Builds a fresh HarvestedMindLoadout for a hostile that has just consumed
 * a victim of the given type. No reserve slots are pre-populated; the
 * caller adds reserves via subsequent harvests.
 *
 * @param activeSourceId  The victim type being consumed now.
 * @param seedKey         Opaque identifier (e.g. `${unitId}:initial`).
 */
export function resolveHarvestedLoadout(
  activeSourceId: HarvestSourceId,
  reserveSlots: ReserveOrganSlot[],
  seedKey: string
): HarvestedMindLoadout {
  return {
    activeSourceId,
    reserveSlots: reserveSlots.map((slot) => ({ ...slot })),
    derivedCapabilityIds: resolveCapabilityIds(activeSourceId, seedKey),
    seedKey,
  }
}

/**
 * Swaps the active harvest source by pulling from a reserve slot.
 * The previously active source is NOT placed into a reserve (it was consumed).
 * The target slot is marked occupied: false after the swap.
 *
 * Returns a new loadout (immutable pattern); the original is not mutated.
 *
 * @param loadout         Current loadout.
 * @param targetSlotIndex Reserve slot index to activate (0-based).
 */
export function swapReserveOrgan(
  loadout: HarvestedMindLoadout,
  targetSlotIndex: number
): HarvestedMindLoadout {
  const targetSlot = loadout.reserveSlots.find(
    (slot) => slot.slotIndex === targetSlotIndex && slot.occupied
  )

  if (!targetSlot) {
    // Slot is empty or invalid — return unchanged
    return loadout
  }

  const newSeedKey = `${loadout.seedKey}:swap:${targetSlotIndex}`
  const newCapabilityIds = resolveCapabilityIds(targetSlot.sourceId, newSeedKey)

  return {
    activeSourceId: targetSlot.sourceId,
    reserveSlots: loadout.reserveSlots.map((slot) =>
      slot.slotIndex === targetSlotIndex ? { ...slot, occupied: false } : { ...slot }
    ),
    derivedCapabilityIds: newCapabilityIds,
    seedKey: newSeedKey,
  }
}

/**
 * Looks up all resolved HarvestCapabilityDescriptors for the active loadout.
 * Returns an empty array if activeSourceId is null or an ID is unrecognised.
 */
export function resolveActiveCapabilities(
  loadout: HarvestedMindLoadout
): HarvestCapabilityDescriptor[] {
  if (!loadout.activeSourceId) return []

  const catalog = HARVEST_CAPABILITY_CATALOG[loadout.activeSourceId]

  return loadout.derivedCapabilityIds
    .map((id) => catalog.find((entry) => entry.id === id))
    .filter((entry): entry is HarvestCapabilityDescriptor => entry !== undefined)
}

/**
 * Aggregates the total combat modifier contributions from the active loadout.
 * Suitable for direct application in aggregateBattle buildMeleeValue / buildDefenseValue.
 */
export function aggregateLoadoutModifiers(loadout: HarvestedMindLoadout): {
  meleeMod: number
  defenseMod: number
  controlReachMod: number
} {
  const capabilities = resolveActiveCapabilities(loadout)

  return capabilities.reduce(
    (sum, cap) => ({
      meleeMod: sum.meleeMod + cap.meleeMod,
      defenseMod: sum.defenseMod + cap.defenseMod,
      controlReachMod: sum.controlReachMod + cap.controlReachMod,
    }),
    { meleeMod: 0, defenseMod: 0, controlReachMod: 0 }
  )
}
