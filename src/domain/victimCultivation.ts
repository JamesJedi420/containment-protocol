// SPE-687: Institutional victim cultivation
// Models predatory institutions that mature and sort victims for harvest.
// An institution funnel progresses through stages as its victim pool grows.
// At the "harvesting" stage, resolveInstitutionOutput returns a HarvestSourceId
// the calling system may consume to build a HarvestedMindLoadout.
//
// All resolve functions are deterministic given the same seedKey.

import type { HarvestSourceId, InstitutionFunnelStage, InstitutionFunnelState } from './models'

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

// ── Stage ordering ────────────────────────────────────────────────────────────

const STAGE_ORDER: readonly InstitutionFunnelStage[] = [
  'recruiting',
  'maturing',
  'sorting',
  'harvesting',
]

function nextStage(stage: InstitutionFunnelStage): InstitutionFunnelStage | null {
  const index = STAGE_ORDER.indexOf(stage)
  return index >= 0 && index < STAGE_ORDER.length - 1 ? STAGE_ORDER[index + 1] : null
}

// ── Institution funnel profiles ───────────────────────────────────────────────

export interface InstitutionFunnelProfile {
  /** Human-readable label for authoring and debug review. */
  label: string
  /**
   * Minimum victimPoolSize required to advance FROM each stage.
   * Key = current stage; value = threshold that must be reached to advance.
   * 'harvesting' has no threshold (terminal stage).
   */
  stageThresholds: Partial<Record<InstitutionFunnelStage, number>>
  /**
   * Ordered preference of victim types this institution tends to produce.
   * First entry is the primary output; second is the fallback.
   * Used by resolveInstitutionOutput when pool has multiple surplus victims.
   */
  sortCriteria: readonly HarvestSourceId[]
}

export const INSTITUTION_FUNNEL_PROFILES: Readonly<Record<string, InstitutionFunnelProfile>> = {
  // A captured or subverted school — academic and engineering pipeline
  school: {
    label: 'School (Front)',
    stageThresholds: {
      recruiting: 3,
      maturing: 6,
      sorting: 10,
    },
    sortCriteria: ['academic', 'engineer'],
  },
  // A captured clinic or hospital — mystic/academic crossover
  clinic: {
    label: 'Clinic (Front)',
    stageThresholds: {
      recruiting: 2,
      maturing: 5,
      sorting: 8,
    },
    sortCriteria: ['mystic', 'academic'],
  },
  // A prestige academy with military or administrative graduates
  academy: {
    label: 'Academy (Front)',
    stageThresholds: {
      recruiting: 4,
      maturing: 8,
      sorting: 12,
    },
    sortCriteria: ['soldier', 'administrator'],
  },
}

// ── Core resolve functions ────────────────────────────────────────────────────

/**
 * Advances the cultivation stage if victimPoolSize meets the threshold for the
 * current stage. Returns a new state (immutable pattern); original is not mutated.
 *
 * At most one stage transition happens per call — callers must call again after
 * adding victims to drive multi-step advancement.
 *
 * @param state   Current funnel state.
 * @returns       Updated state (stage and seedKey may change).
 */
export function advanceCultivationStage(state: InstitutionFunnelState): InstitutionFunnelState {
  const profile = INSTITUTION_FUNNEL_PROFILES[state.templateId]

  if (!profile) return state // unknown template — no-op

  const threshold = profile.stageThresholds[state.stage]

  if (threshold === undefined || state.victimPoolSize < threshold) {
    return state // not yet ready to advance
  }

  const next = nextStage(state.stage)

  if (!next) return state // already at harvesting

  return {
    ...state,
    stage: next,
    seedKey: `${state.seedKey}:${next}`,
  }
}

/**
 * Resolves a victim type output when the institution is at the 'harvesting' stage.
 * Returns null for all earlier stages (no output ready).
 *
 * The primary sortCriteria entry is produced unless the seeded RNG roll >= 0.6,
 * in which case the secondary entry is produced instead (if one exists).
 * This makes the primary type dominant while the secondary type still appears
 * roughly 40% of the time for institutions with two sortCriteria entries.
 *
 * @param state   Current funnel state.
 * @returns       A HarvestSourceId ready for loadout construction, or null.
 */
export function resolveInstitutionOutput(
  state: InstitutionFunnelState
): HarvestSourceId | null {
  if (state.stage !== 'harvesting') return null

  const profile = INSTITUTION_FUNNEL_PROFILES[state.templateId]

  if (!profile || profile.sortCriteria.length === 0) return null

  const rng = createDeterministicRng(`${state.seedKey}:output`)
  const roll = rng()

  if (profile.sortCriteria.length >= 2 && roll >= 0.6) {
    return profile.sortCriteria[1]
  }

  return profile.sortCriteria[0]
}
