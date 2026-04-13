import { describe, it, expect } from 'vitest'
import { progressAttritionState, computeReplacementPressure } from '../domain/agent/attrition'
import type { AgentAttritionState } from '../domain/models'
import type { Agent } from '../domain/agent/models'


describe('progressAttritionState', () => {
  it('returns to active when returnEligibleWeek is reached', () => {
    const prev: AgentAttritionState = {
      attritionStatus: 'temporarily_unavailable',
      attritionCategory: 'temporary_leave',
      attritionSinceWeek: 1,
      returnEligibleWeek: 5,
      lossReasonCodes: ['leave'],
      replacementPriority: 1,
      retentionPressure: 2,
    }
    const result = progressAttritionState(prev, 5)
    expect(result.attritionStatus).toBe('active')
    expect(result.returnEligibleWeek).toBeUndefined()
    expect(result.lossReasonCodes).toEqual([])
  })

  it('remains lost if already lost', () => {
    const prev: AgentAttritionState = {
      attritionStatus: 'lost',
      attritionCategory: 'fatality',
      attritionSinceWeek: 2,
      lossReasonCodes: ['fatality'],
      replacementPriority: 1,
      retentionPressure: 0,
    }
    const result = progressAttritionState(prev, 10)
    expect(result).toBe(prev)
  })

  it('keeps at_risk agents from escalating to lost until the calibrated timeout is reached', () => {
    const prev: AgentAttritionState = {
      attritionStatus: 'at_risk',
      attritionCategory: 'burnout',
      attritionSinceWeek: 1,
      lossReasonCodes: ['burnout'],
      replacementPriority: 1,
      retentionPressure: 2,
    }
    const result = progressAttritionState(prev, 4)
    expect(result.attritionStatus).toBe('at_risk')

    const escalated = progressAttritionState(prev, 6)
    expect(escalated.attritionStatus).toBe('lost')
    expect(escalated.lossReasonCodes).toContain('timed_out')
  })

  it('counts stacked critical role losses more aggressively than a single isolated loss', () => {
    const criticalLosses: Agent[] = [
      { id: '1', name: 'A', role: 'field_recon', baseStats: { combat: 0, investigation: 0, utility: 0, social: 0 }, tags: [], relationships: {}, attritionState: { attritionStatus: 'lost', lossReasonCodes: [], replacementPriority: 1, retentionPressure: 0 }, fatigue: 0, status: 'active' },
      { id: '2', name: 'B', role: 'field_recon', baseStats: { combat: 0, investigation: 0, utility: 0, social: 0 }, tags: [], relationships: {}, attritionState: { attritionStatus: 'lost', lossReasonCodes: [], replacementPriority: 1, retentionPressure: 0 }, fatigue: 0, status: 'active' },
    ]
    const state = computeReplacementPressure(criticalLosses, ['field_recon'])

    expect(state.activeLossCount).toBe(2)
    expect(state.criticalRoleLossCount).toBe(2)
    expect(state.replacementPressure).toBe(3)
    expect(state.staffingGap).toBe(2)
  })

  it('counts lost agents and critical role losses', () => {
    const agents: Agent[] = [
      { id: '1', name: 'A', role: 'field_recon', baseStats: { combat: 0, investigation: 0, utility: 0, social: 0 }, tags: [], relationships: {}, attritionState: { attritionStatus: 'lost', lossReasonCodes: [], replacementPriority: 1, retentionPressure: 0 }, fatigue: 0, status: 'active' },
      { id: '2', name: 'B', role: 'tech', baseStats: { combat: 0, investigation: 0, utility: 0, social: 0 }, tags: [], relationships: {}, attritionState: { attritionStatus: 'active', lossReasonCodes: [], replacementPriority: 1, retentionPressure: 0 }, fatigue: 0, status: 'active' },
      { id: '3', name: 'C', role: 'field_recon', baseStats: { combat: 0, investigation: 0, utility: 0, social: 0 }, tags: [], relationships: {}, attritionState: { attritionStatus: 'lost', lossReasonCodes: [], replacementPriority: 1, retentionPressure: 0 }, fatigue: 0, status: 'active' },
    ]
    const state = computeReplacementPressure(agents, ['field_recon'])
    expect(state.activeLossCount).toBe(2)
    expect(state.criticalRoleLossCount).toBe(2)
    expect(state.replacementPressure).toBe(3)
    expect(state.staffingGap).toBe(2)
  })
})
