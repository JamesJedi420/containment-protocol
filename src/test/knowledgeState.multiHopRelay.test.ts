// Tests for multi-hop/chained relay and relay failure
import { describe, it, expect } from 'vitest'
import { applyRelay, applyRelayFailure, getKnowledgeKey } from '../domain/knowledge'

describe('Multi-hop/Chained Relay', () => {
  it('should relay knowledge from team A to B, then B to C', () => {
    const teamA = 'A', teamB = 'B', teamC = 'C', anomalyId = 'X1'
    // Team A senses anomaly
    let state = { [getKnowledgeKey(teamA, anomalyId)]: { tier: 'confirmed', entityId: teamA, subjectId: anomalyId, subjectType: 'anomaly', lastConfirmedWeek: 1 } }
    // Relay from A to B
    state = applyRelay(state, teamA, teamB, anomalyId, 2)
    expect(state[getKnowledgeKey(teamB, anomalyId)]).toBeDefined()
    expect(state[getKnowledgeKey(teamB, anomalyId)].tier).toBe('relayed')
    expect(state[getKnowledgeKey(teamB, anomalyId)].relaySource).toBe(teamA)
    // Relay from B to C
    state = applyRelay(state, teamB, teamC, anomalyId, 3)
    expect(state[getKnowledgeKey(teamC, anomalyId)]).toBeDefined()
    expect(state[getKnowledgeKey(teamC, anomalyId)].tier).toBe('relayed')
    expect(state[getKnowledgeKey(teamC, anomalyId)].relaySource).toBe(teamB)
  })
  it('should mark relay as failed if relay fails', () => {
    const teamA = 'A', teamB = 'B', anomalyId = 'X1'
    let state = { [getKnowledgeKey(teamA, anomalyId)]: { tier: 'confirmed', entityId: teamA, subjectId: anomalyId, subjectType: 'anomaly', lastConfirmedWeek: 1 } }
    // Relay from A to B
    state = applyRelay(state, teamA, teamB, anomalyId, 2)
    // Relay failure for B
    state = applyRelayFailure(state, teamB, anomalyId, 3)
    expect(state[getKnowledgeKey(teamB, anomalyId)]).toBeDefined()
    expect(state[getKnowledgeKey(teamB, anomalyId)].relayFailed).toBe(true)
    expect(state[getKnowledgeKey(teamB, anomalyId)].tier).toBe('unknown')
  })
})
