import { describe, expect, it } from 'vitest'
import {
  TERRAIN_SURVEY_PROFILES,
  applySurveyTick,
  createSurveyAreaState,
  getTerrainSurveyProfile,
  terrainChangesDifficultyAndThroughput,
} from '../domain/terrainSurveyClocks'

describe('SPE-312 terrain-scaled survey clocks and coverage', () => {
  it('changes both difficulty and search throughput across terrain classes', () => {
    expect(terrainChangesDifficultyAndThroughput('open', 'rugged')).toBe(true)
    const open = getTerrainSurveyProfile('open')
    const rugged = getTerrainSurveyProfile('rugged')
    expect(rugged.difficulty).toBeGreaterThan(open.difficulty)
    expect(rugged.areaPerTick).toBeLessThan(open.areaPerTick)
    expect(rugged.timeCostPerTick).toBeGreaterThanOrEqual(open.timeCostPerTick)
  })

  it('clears a bounded area over time without instant full-scan', () => {
    const area = createSurveyAreaState({
      areaId: 'quad-a',
      totalCells: 20,
      clearedCells: 0,
    })
    const open = TERRAIN_SURVEY_PROFILES.open
    const first = applySurveyTick(area, open, 1)
    expect(first.timeSpent).toBe(1)
    expect(first.cellsCleared).toBe(8)
    expect(first.complete).toBe(false)
    expect(first.nextState.clearedCells).toBe(8)

    const second = applySurveyTick(first.nextState, open, 1)
    expect(second.nextState.clearedCells).toBe(16)
    expect(second.complete).toBe(false)

    const third = applySurveyTick(second.nextState, open, 1)
    expect(third.cellsCleared).toBe(4)
    expect(third.nextState.clearedCells).toBe(20)
    expect(third.complete).toBe(true)
    expect(third.timeSpent).toBeGreaterThan(0)
  })

  it('persists repeated surveying and scales slower on rugged terrain', () => {
    const area = createSurveyAreaState({
      areaId: 'ridge',
      totalCells: 10,
      clearedCells: 0,
    })
    const openPass = applySurveyTick(area, TERRAIN_SURVEY_PROFILES.open, 1)
    const ruggedPass = applySurveyTick(area, TERRAIN_SURVEY_PROFILES.rugged, 1)
    expect(ruggedPass.cellsCleared).toBeLessThan(openPass.cellsCleared)
    expect(ruggedPass.timeSpent).toBeGreaterThan(openPass.timeSpent)

    const continued = applySurveyTick(ruggedPass.nextState, TERRAIN_SURVEY_PROFILES.rugged, 2)
    expect(continued.nextState.clearedCells).toBe(
      ruggedPass.nextState.clearedCells + continued.cellsCleared
    )
    expect(continued.nextState.areaId).toBe('ridge')
  })

  it('is deterministic and does not mutate inputs', () => {
    const area = { areaId: 'a1', totalCells: 12, clearedCells: 2 }
    const profile = { ...TERRAIN_SURVEY_PROFILES.wooded }
    const beforeArea = structuredClone(area)
    const beforeProfile = structuredClone(profile)
    const first = applySurveyTick(area, profile, 2)
    const second = applySurveyTick(area, profile, 2)
    expect(first).toEqual(second)
    expect(Object.isFrozen(first.nextState)).toBe(true)
    expect(area).toEqual(beforeArea)
    expect(profile).toEqual(beforeProfile)
  })

  it('rejects instant zero-tick scans and malformed area state', () => {
    const area = createSurveyAreaState({ areaId: 'x', totalCells: 5, clearedCells: 0 })
    expect(() => applySurveyTick(area, TERRAIN_SURVEY_PROFILES.open, 0)).toThrow(/ticks/)
    expect(() => createSurveyAreaState({ areaId: 'x', totalCells: 5, clearedCells: 6 })).toThrow(
      /clearedCells/
    )
    expect(() => getTerrainSurveyProfile('swamp' as never)).toThrow(/terrain class/)
  })
})
