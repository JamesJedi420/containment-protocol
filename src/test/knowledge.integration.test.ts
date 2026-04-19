import { describe, it, expect } from 'vitest'
import { assignTeam } from '../domain/sim/assign'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { createStartingState } from '../data/startingState'
import { getKnowledgeKey } from '../domain/knowledge'

// Test: Knowledge-state is updated to 'confirmed' for teams that resolve a case successfully

describe('Knowledge-State Integration', () => {
  it('confirms knowledge for teams on successful case resolution', () => {
    const state = createStartingState()
    // Assign team to case-001
    const assigned = assignTeam(state, 'case-001', 't_nightwatch')
    // Set up case for deterministic success
    assigned.cases['case-001'] = {
      ...assigned.cases['case-001'],
      status: 'in_progress',
      weeksRemaining: 1,
      difficulty: { combat: 1, investigation: 0, utility: 0, social: 0 },
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
    }
    // Advance week (should resolve case as success)
    const next = advanceWeek(assigned)
    // Check knowledge-state for the team and case
    const key = getKnowledgeKey('t_nightwatch', 'case-001')
    expect(next.knowledge[key]).toBeDefined()
    expect(next.knowledge[key].tier).toBe('confirmed')
    expect(next.knowledge[key].entityId).toBe('t_nightwatch')
    expect(next.knowledge[key].subjectId).toBe('case-001')
    expect(next.knowledge[key].lastConfirmedWeek).toBe(state.week)
    expect(next.knowledge[key].notes).toMatch(/containment success/i)
  })
})
