// Edge-case tests for conflicting/rapid state changes
import { describe, it, expect } from 'vitest'
import {
  applyAnomalySignatureSensing,
  applyObscuredSignature,
  applyRelayDelay,
  applyDefeatConditionKnowledge,
  getKnowledgeKey
} from '../domain/knowledge'
import type { KnowledgeStateMap } from '../domain/knowledge'

describe('Knowledge State Edge Cases', () => {
  it('should resolve to confirmed after rapid masking and sensing', () => {
    const teamId = 'T1'
    const anomalyId = 'A1'
    let state: KnowledgeStateMap = {}
    state = applyObscuredSignature(state, teamId, anomalyId, 1)
    state = applyAnomalySignatureSensing(state, teamId, anomalyId, 2)
    const key = getKnowledgeKey(teamId, anomalyId)
    expect(state[key].tier).toBe('confirmed')
    expect(state[key].masked).toBeUndefined()
  })
  it('should resolve to masked if masking follows sensing', () => {
    const teamId = 'T1'
    const anomalyId = 'A1'
    let state: KnowledgeStateMap = {}
    state = applyAnomalySignatureSensing(state, teamId, anomalyId, 1)
    state = applyObscuredSignature(state, teamId, anomalyId, 2)
    const key = getKnowledgeKey(teamId, anomalyId)
    expect(state[key].tier).toBe('unknown')
    expect(state[key].masked).toBe(true)
  })
  it('should handle rapid relay and confirmation', () => {
    const teamId = 'T1'
    const anomalyId = 'A1'
    let state: KnowledgeStateMap = {}
    state = applyRelayDelay(state, teamId, anomalyId, 1, 2)
    state = applyAnomalySignatureSensing(state, teamId, anomalyId, 2)
    const key = getKnowledgeKey(teamId, anomalyId)
    expect(state[key].tier).toBe('confirmed')
    expect(state[key].relayAvailableWeek).toBeUndefined()
  })
  it('should handle defeat-condition certainty regression', () => {
    const teamId = 'T1'
    const anomalyId = 'A1'
    let state: KnowledgeStateMap = {}
    state = applyDefeatConditionKnowledge(state, teamId, anomalyId, 'exact', 1)
    state = applyDefeatConditionKnowledge(state, teamId, anomalyId, 'suspected', 2)
    const key = getKnowledgeKey(teamId, anomalyId)
    expect(state[key].defeatConditionCertainty).toBe('suspected')
  })
})
