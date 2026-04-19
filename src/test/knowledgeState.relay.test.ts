// Tests for delayed relay path
import { describe, it, expect } from 'vitest'
import { applyAnomalySignatureSensing, applyRelayDelay, getKnowledgeKey } from '../domain/knowledge'

describe('Delayed Relay Path', () => {
  it('should update knowledge after relay delay', () => {
    const teamId = 'T1'
    const anomalyId = 'A1'
    const initial = {}
    // Simulate relay: knowledge is not available until after delay
    const relayed = applyRelayDelay(initial, teamId, anomalyId, 5, 2) // delay 2 weeks
    const key = getKnowledgeKey(teamId, anomalyId)
    expect(relayed[key]).toBeDefined()
    expect(relayed[key].tier).toBe('pending-relay')
    expect(relayed[key].relayAvailableWeek).toBe(7)
    // Simulate week 7: relay arrives, knowledge is confirmed
    const confirmed = applyAnomalySignatureSensing(relayed, teamId, anomalyId, 7)
    expect(confirmed[key].tier).toBe('confirmed')
    expect(confirmed[key].lastConfirmedWeek).toBe(7)
  })
})
