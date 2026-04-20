// Tests for time-based decay/regression of knowledge certainty
import { describe, it, expect } from 'vitest'
import { applyKnowledgeDecay, getKnowledgeKey } from '../domain/knowledge'

describe('Knowledge Decay/Regression', () => {
  it('should regress confirmed knowledge to partial after decay period', () => {
    const teamId = 'T1', anomalyId = 'A1'
    const initial = {
      [getKnowledgeKey(teamId, anomalyId)]: {
        tier: 'confirmed', entityId: teamId, subjectId: anomalyId, subjectType: 'anomaly', lastConfirmedWeek: 1
      }
    }
    // Decay after 3 weeks
    const result = applyKnowledgeDecay(initial, 4, { confirmedToPartial: 3 })
    expect(result[getKnowledgeKey(teamId, anomalyId)].tier).toBe('partial')
    expect(result[getKnowledgeKey(teamId, anomalyId)].decayed).toBe(true)
    expect(result[getKnowledgeKey(teamId, anomalyId)].lastDecayedWeek).toBe(4)
  })
  it('should regress partial knowledge to unknown after further decay', () => {
    const teamId = 'T1', anomalyId = 'A1'
    const initial = {
      [getKnowledgeKey(teamId, anomalyId)]: {
        tier: 'partial', entityId: teamId, subjectId: anomalyId, subjectType: 'anomaly', lastDecayedWeek: 4
      }
    }
    // Decay after 2 more weeks
    const result = applyKnowledgeDecay(initial, 6, { partialToUnknown: 2 })
    expect(result[getKnowledgeKey(teamId, anomalyId)].tier).toBe('unknown')
    expect(result[getKnowledgeKey(teamId, anomalyId)].decayed).toBe(true)
    expect(result[getKnowledgeKey(teamId, anomalyId)].lastDecayedWeek).toBe(6)
  })
})
