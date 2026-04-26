// Tests for defeat-condition certainty ladder
import { describe, it, expect } from 'vitest'
import { applyDefeatConditionKnowledge, getKnowledgeKey } from '../domain/knowledge'
import type { KnowledgeStateMap } from '../domain/knowledge'

describe('Defeat-Condition Knowledge Ladder', () => {
  it('should represent multi-level certainty for defeat condition', () => {
    const teamId = 'T1'
    const anomalyId = 'A1'
    let state: KnowledgeStateMap = {}
    // Unknown
    state = applyDefeatConditionKnowledge(state, teamId, anomalyId, 'unknown', 1)
    const key = getKnowledgeKey(teamId, anomalyId)
    expect(state[key].defeatConditionCertainty).toBe('unknown')
    // Suspected bypass
    state = applyDefeatConditionKnowledge(state, teamId, anomalyId, 'suspected', 2)
    expect(state[key].defeatConditionCertainty).toBe('suspected')
    // Bypass family known
    state = applyDefeatConditionKnowledge(state, teamId, anomalyId, 'family', 3)
    expect(state[key].defeatConditionCertainty).toBe('family')
    // Exact defeat known
    state = applyDefeatConditionKnowledge(state, teamId, anomalyId, 'exact', 4)
    expect(state[key].defeatConditionCertainty).toBe('exact')
  })
})
