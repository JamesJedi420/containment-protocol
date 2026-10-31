/**
 * SPE-312 — terrain-scaled survey clocks and coverage (pure, caller-owned).
 *
 * Terrain class changes both difficulty and search throughput. Survey actions
 * consume time only while uncleared cells remain; no instant full-scan.
 * Persistent area state supports repeated surveying. Site confirmation stays
 * with SPE-311; catastrophic misinformation with SPE-313.
 */

import { assertNonEmptyId, assertSafeIntegerInRange } from './assertBoundedInteger'

export const TERRAIN_SURVEY_CLOCKS_OWNER = 'SPE-312' as const

export const TERRAIN_SURVEY_CLASS_IDS = ['open', 'wooded', 'rugged', 'urban_ruin'] as const
export type TerrainSurveyClassId = (typeof TERRAIN_SURVEY_CLASS_IDS)[number]

export interface TerrainSurveyProfile {
  readonly terrainClassId: TerrainSurveyClassId
  /** Higher is harder (1–10). */
  readonly difficulty: number
  /** Cells cleared per tick (1–100). */
  readonly areaPerTick: number
  /** Time cost per tick; always ≥ 1 (no instant scan). */
  readonly timeCostPerTick: number
}

export interface SurveyAreaState {
  readonly areaId: string
  readonly totalCells: number
  readonly clearedCells: number
}

export interface SurveyTickResult {
  readonly timeSpent: number
  readonly cellsCleared: number
  readonly nextState: SurveyAreaState
  readonly complete: boolean
  readonly owner: typeof TERRAIN_SURVEY_CLOCKS_OWNER
}

const CLASS_SET = new Set<string>(TERRAIN_SURVEY_CLASS_IDS)

/** Authored baseline profiles — open is easier/faster than rugged. */
export const TERRAIN_SURVEY_PROFILES: Readonly<Record<TerrainSurveyClassId, TerrainSurveyProfile>> =
  Object.freeze({
    open: Object.freeze({
      terrainClassId: 'open',
      difficulty: 2,
      areaPerTick: 8,
      timeCostPerTick: 1,
    }),
    wooded: Object.freeze({
      terrainClassId: 'wooded',
      difficulty: 4,
      areaPerTick: 5,
      timeCostPerTick: 1,
    }),
    rugged: Object.freeze({
      terrainClassId: 'rugged',
      difficulty: 7,
      areaPerTick: 2,
      timeCostPerTick: 2,
    }),
    urban_ruin: Object.freeze({
      terrainClassId: 'urban_ruin',
      difficulty: 6,
      areaPerTick: 3,
      timeCostPerTick: 2,
    }),
  })

export function getTerrainSurveyProfile(
  terrainClassId: TerrainSurveyClassId
): TerrainSurveyProfile {
  if (!CLASS_SET.has(terrainClassId)) {
    throw new Error('terrain class is invalid')
  }
  return TERRAIN_SURVEY_PROFILES[terrainClassId]
}

export function createSurveyAreaState(input: SurveyAreaState): SurveyAreaState {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('survey area state is required')
  }
  const areaId = assertNonEmptyId(input.areaId, 'areaId')
  const totalCells = assertSafeIntegerInRange(input.totalCells, 'totalCells', 1, 1_000_000)
  const clearedCells = assertSafeIntegerInRange(input.clearedCells, 'clearedCells', 0, totalCells)
  return Object.freeze({ areaId, totalCells, clearedCells })
}

/**
 * Advance persistent survey coverage for a bounded area. Spends time only while
 * uncleared cells remain; never clears more cells than remain.
 */
export function applySurveyTick(
  areaInput: SurveyAreaState,
  profileInput: TerrainSurveyProfile,
  ticks: number
): SurveyTickResult {
  const area = createSurveyAreaState(areaInput)
  if (typeof profileInput !== 'object' || profileInput === null || Array.isArray(profileInput)) {
    throw new Error('terrain survey profile is required')
  }
  const profile = getTerrainSurveyProfile(profileInput.terrainClassId)
  if (
    profile.difficulty !== profileInput.difficulty ||
    profile.areaPerTick !== profileInput.areaPerTick ||
    profile.timeCostPerTick !== profileInput.timeCostPerTick
  ) {
    throw new Error('terrain survey profile does not match authored baseline')
  }
  const tickCount = assertSafeIntegerInRange(ticks, 'ticks', 1, 10_000)
  const remaining = area.totalCells - area.clearedCells
  if (remaining === 0) {
    throw new Error('survey area is already complete')
  }
  const ticksNeeded = Math.ceil(remaining / profile.areaPerTick)
  const effectiveTicks = Math.min(tickCount, ticksNeeded)
  const cellsCleared = Math.min(remaining, profile.areaPerTick * effectiveTicks)
  const timeSpent = profile.timeCostPerTick * effectiveTicks
  const clearedCells = area.clearedCells + cellsCleared
  const nextState = Object.freeze({
    areaId: area.areaId,
    totalCells: area.totalCells,
    clearedCells,
  })
  return Object.freeze({
    timeSpent,
    cellsCleared,
    nextState,
    complete: clearedCells >= area.totalCells,
    owner: TERRAIN_SURVEY_CLOCKS_OWNER,
  })
}

/** Compare two profiles: both difficulty and throughput must differ for AC demos. */
export function terrainChangesDifficultyAndThroughput(
  a: TerrainSurveyClassId,
  b: TerrainSurveyClassId
): boolean {
  const left = getTerrainSurveyProfile(a)
  const right = getTerrainSurveyProfile(b)
  return left.difficulty !== right.difficulty && left.areaPerTick !== right.areaPerTick
}
