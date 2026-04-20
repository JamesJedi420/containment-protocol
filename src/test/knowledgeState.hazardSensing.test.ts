// Tests for hazard-sensing and hazard-masking family
import { describe, it, expect } from 'vitest'
import { applyHazardSensing, applyHazardMasking, getKnowledgeKey } from '../domain/knowledge'

describe('Hazard Sensing and Masking', () => {
  it('should promote knowledge to confirmed when hazard is detected', () => {
    const teamId = 'T1'
    const hazardId = 'H1'
    const initial = {}
    const result = applyHazardSensing(initial, teamId, hazardId, 5)
    const key = getKnowledgeKey(teamId, hazardId)
    expect(result[key]).toBeDefined()
    expect(result[key].tier).toBe('confirmed')
    expect(result[key].lastConfirmedWeek).toBe(5)
    expect(result[key].subjectType).toBe('hazard')
  })
  it('should set knowledge to masked when hazard is masked', () => {
    const teamId = 'T1'
    const hazardId = 'H1'
    const initial = {}
    const result = applyHazardMasking(initial, teamId, hazardId, 6)
    const key = getKnowledgeKey(teamId, hazardId)
    expect(result[key]).toBeDefined()
    expect(result[key].tier).toBe('unknown')
    expect(result[key].masked).toBe(true)
    expect(result[key].lastMaskedWeek).toBe(6)
    expect(result[key].subjectType).toBe('hazard')
  })
})
