// Tests for anomaly-signature sensing path
import { describe, it, expect } from 'vitest'
import { applyAnomalySignatureSensing, getKnowledgeKey } from '../domain/knowledge'

describe('Anomaly Signature Sensing', () => {
  it('should promote knowledge to confirmed when anomaly signature is detected', () => {
    const teamId = 'T1'
    const anomalyId = 'A1'
    const initial = {}
    const result = applyAnomalySignatureSensing(initial, teamId, anomalyId, 5)
    const key = getKnowledgeKey(teamId, anomalyId)
    expect(result[key]).toBeDefined()
    expect(result[key].tier).toBe('confirmed')
    expect(result[key].lastConfirmedWeek).toBe(5)
  })
})
