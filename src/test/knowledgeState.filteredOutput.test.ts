// Tests for filtered report output
import { describe, it, expect } from 'vitest'
import { applyAnomalySignatureSensing, applyObscuredSignature, applyRelayDelay, getFilteredKnowledgeView, getKnowledgeKey } from '../domain/knowledge'

describe('Filtered Report Output', () => {
  it('should omit masked and pending-relay knowledge from public view', () => {
    const teamId = 'T1'
    const anomalyId = 'A1'
    let state = {}
    state = applyObscuredSignature(state, teamId, anomalyId, 5)
    // At this point, masked, not shown in public
    let publicView = getFilteredKnowledgeView(state, 'public')
    expect(Object.keys(publicView)).not.toContain(getKnowledgeKey(teamId, anomalyId))

    state = applyRelayDelay(state, teamId, anomalyId, 6, 2)
    // Still not shown in public (pending-relay)
    publicView = getFilteredKnowledgeView(state, 'public')
    expect(Object.keys(publicView)).not.toContain(getKnowledgeKey(teamId, anomalyId))

    state = applyAnomalySignatureSensing(state, teamId, anomalyId, 8)
    // Now confirmed, should be shown in public
    publicView = getFilteredKnowledgeView(state, 'public')
    expect(Object.keys(publicView)).toContain(getKnowledgeKey(teamId, anomalyId))
    expect(publicView[getKnowledgeKey(teamId, anomalyId)].tier).toBe('confirmed')

    // Internal view should always show all
    const internal = getFilteredKnowledgeView(state, 'internal')
    expect(Object.keys(internal)).toContain(getKnowledgeKey(teamId, anomalyId))

    // If masked, should be omitted from public
    const maskedState = applyObscuredSignature({}, teamId, anomalyId, 5)
    const publicMasked = getFilteredKnowledgeView(maskedState, 'public')
    expect(Object.keys(publicMasked)).not.toContain(getKnowledgeKey(teamId, anomalyId))
  })
})
