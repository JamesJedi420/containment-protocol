// Tests for public-facing partial/cryptic knowledge in filtered output
import { describe, it, expect } from 'vitest'
import { applyDefeatConditionKnowledge, getFilteredKnowledgeView, getKnowledgeKey } from '../domain/knowledge'

describe('Filtered Output: Partial/Cryptic Defeat-Condition Knowledge', () => {
  it('should show suspected/family certainty as partial/cryptic in public view', () => {
    const teamId = 'T1'
    const anomalyId = 'A1'
    let state = {}
    // Suspected
    state = applyDefeatConditionKnowledge(state, teamId, anomalyId, 'suspected', 1)
    let publicView = getFilteredKnowledgeView(state, 'public')
    let key = getKnowledgeKey(teamId, anomalyId)
    expect(publicView[key]).toBeDefined()
    expect(publicView[key].notes).toBe('Possible bypass exists.')
    // Family
    state = applyDefeatConditionKnowledge(state, teamId, anomalyId, 'family', 2)
    publicView = getFilteredKnowledgeView(state, 'public')
    expect(publicView[key]).toBeDefined()
    expect(publicView[key].notes).toBe('Bypass method family suspected.')
    // Exact should not redact
    state = applyDefeatConditionKnowledge(state, teamId, anomalyId, 'exact', 3)
    publicView = getFilteredKnowledgeView(state, 'public')
    expect(publicView[key]).not.toBeUndefined()
    // Unknown should not appear
    state = applyDefeatConditionKnowledge({}, teamId, anomalyId, 'unknown', 4)
    publicView = getFilteredKnowledgeView(state, 'public')
    expect(publicView[key]).toBeUndefined()
  })
})
