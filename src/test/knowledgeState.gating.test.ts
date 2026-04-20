// Tests for defeat-condition gating utility
import { describe, it, expect } from 'vitest'
import { applyDefeatConditionKnowledge, hasDefeatConditionCertainty } from '../domain/knowledge'

describe('Defeat-Condition Gating Utility', () => {
  it('should gate actions based on certainty ladder', () => {
    const teamId = 'T1'
    const anomalyId = 'A1'
    let state = {}
    state = applyDefeatConditionKnowledge(state, teamId, anomalyId, 'suspected', 1)
    expect(hasDefeatConditionCertainty(state, teamId, anomalyId, 'unknown')).toBe(true)
    expect(hasDefeatConditionCertainty(state, teamId, anomalyId, 'suspected')).toBe(true)
    expect(hasDefeatConditionCertainty(state, teamId, anomalyId, 'family')).toBe(false)
    expect(hasDefeatConditionCertainty(state, teamId, anomalyId, 'exact')).toBe(false)
    state = applyDefeatConditionKnowledge(state, teamId, anomalyId, 'family', 2)
    expect(hasDefeatConditionCertainty(state, teamId, anomalyId, 'family')).toBe(true)
    expect(hasDefeatConditionCertainty(state, teamId, anomalyId, 'exact')).toBe(false)
    state = applyDefeatConditionKnowledge(state, teamId, anomalyId, 'exact', 3)
    expect(hasDefeatConditionCertainty(state, teamId, anomalyId, 'exact')).toBe(true)
  })
})
