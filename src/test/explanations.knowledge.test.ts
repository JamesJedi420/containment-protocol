// Tests for defeat-condition and relay explanation utilities
import { describe, it, expect } from 'vitest'
import { applyDefeatConditionKnowledge, applyRelayDelay } from '../domain/knowledge'
import { explainDefeatConditionKnowledge, explainRelayStatus } from '../domain/explanations'

describe('Knowledge/Relay Explanation Utilities', () => {
  it('should explain defeat-condition certainty', () => {
    const teamId = 'T1'
    const anomalyId = 'A1'
    let state = {}
    expect(explainDefeatConditionKnowledge(state, teamId, anomalyId)).toMatch(/No knowledge/)
    state = applyDefeatConditionKnowledge(state, teamId, anomalyId, 'suspected', 1)
    expect(explainDefeatConditionKnowledge(state, teamId, anomalyId)).toMatch(/Possible bypass exists/)
    state = applyDefeatConditionKnowledge(state, teamId, anomalyId, 'family', 2)
    expect(explainDefeatConditionKnowledge(state, teamId, anomalyId)).toMatch(/family is suspected/)
    state = applyDefeatConditionKnowledge(state, teamId, anomalyId, 'exact', 3)
    expect(explainDefeatConditionKnowledge(state, teamId, anomalyId)).toMatch(/Exact defeat/)
  })
  it('should explain relay status', () => {
    const teamId = 'T1'
    const anomalyId = 'A1'
    let state = {}
    state = applyRelayDelay(state, teamId, anomalyId, 1, 2)
    expect(explainRelayStatus(state, teamId, anomalyId, 1)).toMatch(/Relay in progress/)
    expect(explainRelayStatus(state, teamId, anomalyId, 2)).toMatch(/Relay in progress/)
    expect(explainRelayStatus(state, teamId, anomalyId, 3)).toBe('')
  })
})
