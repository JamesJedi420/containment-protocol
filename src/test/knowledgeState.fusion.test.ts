// Tests for multi-source/team knowledge fusion
import { describe, it, expect } from 'vitest'
import { applyKnowledgeFusion, getKnowledgeKey } from '../domain/knowledge'
import type { KnowledgeStateMap } from '../domain/knowledge'

describe('Multi-source/Team Knowledge Fusion', () => {
  it('should fuse confirmed and partial knowledge to confirmed', () => {
    const teamA = 'A', teamB = 'B', anomalyId = 'X1'
    const stateA: KnowledgeStateMap = { [getKnowledgeKey(teamA, anomalyId)]: { tier: 'confirmed', entityId: teamA, subjectId: anomalyId, subjectType: 'anomaly', lastConfirmedWeek: 1 } }
    const stateB: KnowledgeStateMap = { [getKnowledgeKey(teamB, anomalyId)]: { tier: 'partial', entityId: teamB, subjectId: anomalyId, subjectType: 'anomaly', lastDecayedWeek: 2 } }
    const fused = applyKnowledgeFusion([stateA, stateB], anomalyId, 3)
    expect(fused.tier).toBe('confirmed')
    expect(fused.fusedFrom).toEqual([teamA, teamB])
    expect(fused.lastFusedWeek).toBe(3)
  })
  it('should fuse two partials to partial', () => {
    const teamA = 'A', teamB = 'B', anomalyId = 'X1'
    const stateA: KnowledgeStateMap = { [getKnowledgeKey(teamA, anomalyId)]: { tier: 'partial', entityId: teamA, subjectId: anomalyId, subjectType: 'anomaly', lastDecayedWeek: 2 } }
    const stateB: KnowledgeStateMap = { [getKnowledgeKey(teamB, anomalyId)]: { tier: 'partial', entityId: teamB, subjectId: anomalyId, subjectType: 'anomaly', lastDecayedWeek: 2 } }
    const fused = applyKnowledgeFusion([stateA, stateB], anomalyId, 3)
    expect(fused.tier).toBe('partial')
    expect(fused.fusedFrom).toEqual([teamA, teamB])
    expect(fused.lastFusedWeek).toBe(3)
  })
  it('should fuse unknown and confirmed to confirmed', () => {
    const teamA = 'A', teamB = 'B', anomalyId = 'X1'
    const stateA: KnowledgeStateMap = { [getKnowledgeKey(teamA, anomalyId)]: { tier: 'unknown', entityId: teamA, subjectId: anomalyId, subjectType: 'anomaly' } }
    const stateB: KnowledgeStateMap = { [getKnowledgeKey(teamB, anomalyId)]: { tier: 'confirmed', entityId: teamB, subjectId: anomalyId, subjectType: 'anomaly', lastConfirmedWeek: 1 } }
    const fused = applyKnowledgeFusion([stateA, stateB], anomalyId, 3)
    expect(fused.tier).toBe('confirmed')
    expect(fused.fusedFrom).toEqual([teamA, teamB])
    expect(fused.lastFusedWeek).toBe(3)
  })
})
