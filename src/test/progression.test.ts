import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  applyAgentXp,
  applyProgressionXp,
  getProgressionSnapshot,
  getLevelForXp,
  getXpThresholdForMaxLevel,
  getReachedLevels,
  getXpThresholdForLevel,
  getXpToNextLevel,
  PROGRESSION_MAX_LEVEL,
  synchronizeProgressionState,
} from '../domain/progression'

describe('progression helpers', () => {
  it('uses deterministic xp thresholds by level', () => {
    expect(getXpToNextLevel(1)).toBe(200)
    expect(getXpToNextLevel(2)).toBeGreaterThan(getXpToNextLevel(1))
    expect(getXpThresholdForLevel(2)).toBe(getXpToNextLevel(1))
    expect(getXpThresholdForLevel(3)).toBe(getXpToNextLevel(1) + getXpToNextLevel(2))
  })

  it('derives level from cumulative xp consistently', () => {
    const levelTwoThreshold = getXpThresholdForLevel(2)
    const levelThreeThreshold = getXpThresholdForLevel(3)

    expect(getLevelForXp(0)).toBe(1)
    expect(getLevelForXp(levelTwoThreshold - 1)).toBe(1)
    expect(getLevelForXp(levelTwoThreshold)).toBe(2)
    expect(getLevelForXp(levelThreeThreshold)).toBe(3)
  })

  it('builds a stable progression snapshot for the current level band', () => {
    const snapshot = getProgressionSnapshot({
      xp: getXpThresholdForLevel(2) + 25,
      level: 2,
    })

    expect(snapshot.currentLevelStartXp).toBe(getXpThresholdForLevel(2))
    expect(snapshot.nextLevelThresholdXp).toBe(getXpThresholdForLevel(3))
    expect(snapshot.xpIntoCurrentLevel).toBe(25)
    expect(snapshot.xpToNextLevel).toBe(getXpToNextLevel(2))
    expect(snapshot.progressPercent).toBe(Math.round((25 / getXpToNextLevel(2)) * 100))
  })

  it('applies xp gains and reports level-ups deterministically', () => {
    const state = createStartingState()
    const agent = {
      ...state.agents.a_ava,
      progression: {
        ...(state.agents.a_ava.progression ?? {
          xp: 0,
          level: 1,
          potentialTier: 'C' as const,
          growthProfile: 'balanced',
        }),
        xp: getXpThresholdForLevel(2) - 10,
        level: 1,
      },
      level: 1,
    }

    const progressionResult = applyProgressionXp(agent.progression!, 10)
    const agentResult = applyAgentXp(agent, 10)

    expect(progressionResult.leveledUp).toBe(true)
    expect(progressionResult.level).toBe(2)
    expect(agentResult.progression.xp).toBe(getXpThresholdForLevel(2))
    expect(agentResult.level).toBe(2)
  })

  it('treats zero and negative xp gains as no-ops', () => {
    const state = createStartingState()
    const progression = state.agents.a_ava.progression ?? {
      xp: 0,
      level: 1,
      potentialTier: 'C' as const,
      growthProfile: 'balanced',
    }

    const zeroGain = applyProgressionXp(progression, 0)
    const negativeGain = applyProgressionXp(progression, -50)

    expect(zeroGain.progression.xp).toBe(progression.xp)
    expect(zeroGain.progression.level).toBe(progression.level)
    expect(zeroGain.progression.skillTree).toMatchObject({
      skillPoints: 0,
      trainedRelationships: {},
    })
    expect(zeroGain.leveledUp).toBe(false)
    expect(negativeGain.progression).toEqual(zeroGain.progression)
    expect(negativeGain.leveledUp).toBe(false)
  })

  it('supports multi-level gains deterministically from the same starting xp', () => {
    const progression = {
      xp: 0,
      level: 1,
      potentialTier: 'C' as const,
      growthProfile: 'balanced',
    }
    const xpToLevelFour = getXpThresholdForLevel(4)

    const result = applyProgressionXp(progression, xpToLevelFour)

    expect(result.progression.xp).toBe(xpToLevelFour)
    expect(result.level).toBe(4)
    expect(result.leveledUp).toBe(true)
    expect(result.levelsGained).toBe(3)
    expect(result.reachedLevels).toEqual([2, 3, 4])
    expect(result.skillPointsGranted).toBe(3)
    expect(result.progression.skillTree?.skillPoints).toBe(3)
    expect(getLevelForXp(result.progression.xp)).toBe(4)
    expect(getXpThresholdForLevel(result.level)).toBe(xpToLevelFour)
  })

  it('synchronizes inconsistent stored level/xp state without losing authored progression level', () => {
    const synchronized = synchronizeProgressionState({
      xp: 420,
      level: 4,
      potentialTier: 'B',
      growthProfile: 'steady',
    })

    expect(synchronized.level).toBe(4)
    expect(synchronized.xp).toBe(getXpThresholdForLevel(4))
    expect(synchronized.skillTree).toMatchObject({ skillPoints: 0, trainedRelationships: {} })
    expect(getReachedLevels(1, synchronized.level)).toEqual([2, 3, 4])
  })

  it('caps level derivation at PROGRESSION_MAX_LEVEL for very large xp', () => {
    const xpBeyondCap = getXpThresholdForMaxLevel() + 1_000_000

    expect(getLevelForXp(xpBeyondCap)).toBe(PROGRESSION_MAX_LEVEL)
  })

  it('does not grant additional levels or skill points when already at max level', () => {
    const progression = {
      xp: getXpThresholdForMaxLevel(),
      level: PROGRESSION_MAX_LEVEL,
      potentialTier: 'S' as const,
      growthProfile: 'specialist',
    }

    const result = applyProgressionXp(progression, 50_000)

    expect(result.level).toBe(PROGRESSION_MAX_LEVEL)
    expect(result.leveledUp).toBe(false)
    expect(result.levelsGained).toBe(0)
    expect(result.reachedLevels).toEqual([])
    expect(result.skillPointsGranted).toBe(0)
    expect(result.progression.skillTree?.skillPoints ?? 0).toBe(0)
    expect(result.growthDelta).toEqual({})
  })

  it('stops level gain exactly at max level when xp gain would overshoot cap', () => {
    const startLevel = PROGRESSION_MAX_LEVEL - 1
    const progression = {
      xp: getXpThresholdForLevel(startLevel),
      level: startLevel,
      potentialTier: 'A' as const,
      growthProfile: 'balanced',
    }

    const result = applyProgressionXp(progression, getXpToNextLevel(startLevel) + 200_000)

    expect(result.level).toBe(PROGRESSION_MAX_LEVEL)
    expect(result.leveledUp).toBe(true)
    expect(result.levelsGained).toBe(1)
    expect(result.reachedLevels).toEqual([PROGRESSION_MAX_LEVEL])
    expect(result.skillPointsGranted).toBe(1)
    expect(result.progression.skillTree?.skillPoints).toBe(1)
  })

  it('returns stable max-level snapshot semantics', () => {
    const snapshot = getProgressionSnapshot({
      xp: getXpThresholdForMaxLevel() + 99_999,
      level: PROGRESSION_MAX_LEVEL,
    })

    expect(snapshot.level).toBe(PROGRESSION_MAX_LEVEL)
    expect(snapshot.currentLevelStartXp).toBe(getXpThresholdForMaxLevel())
    expect(snapshot.nextLevelThresholdXp).toBe(getXpThresholdForMaxLevel())
    expect(snapshot.xpToNextLevel).toBe(0)
    expect(snapshot.progressRatio).toBe(1)
    expect(snapshot.progressPercent).toBe(100)
  })
})
