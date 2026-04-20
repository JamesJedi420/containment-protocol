// Tests for obscured-signature counter-sensing path
import { describe, it, expect } from 'vitest'
import { applyObscuredSignature, getKnowledgeKey } from '../domain/knowledge'

describe('Obscured Signature Counter-Sensing', () => {
  it('should set knowledge to masked when signature is obscured', () => {
    const teamId = 'T1'
    const anomalyId = 'A1'
    const initial = {}
    // First, try to sense but signature is obscured
    const result = applyObscuredSignature(initial, teamId, anomalyId, 5)
    const key = getKnowledgeKey(teamId, anomalyId)
    expect(result[key]).toBeDefined()
    expect(result[key].tier).toBe('unknown')
    expect(result[key].masked).toBe(true)
    expect(result[key].lastMaskedWeek).toBe(5)
  })
})
