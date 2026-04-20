import { describe, expect, it } from 'vitest'

import { advanceRecoveryDowntimeForWeek } from '../../domain/sim/recoveryDowntime'
import type { Agent } from '../../domain/agent/models'
import type { DowntimeActivity, RecoveryState } from '../../domain/sim/recoveryDowntime'

const baseAgent: Agent = {
  id: 'a1',
  name: 'Test Agent',
  role: 'tech',
  baseStats: { combat: 10, investigation: 10, utility: 10, social: 10 },
  tags: [],
  relationships: {},
  fatigue: 50,
  status: 'active',
}

describe('advanceRecoveryDowntimeForWeek', () => {
  it('progresses recovery and trauma deterministically', () => {
    const agents = {
      a1: {
        ...baseAgent,
        recoveryStatus: { state: 'recovering' as RecoveryState, sinceWeek: 1 },
        trauma: { traumaLevel: 2, traumaTags: ['shock'], lastEventWeek: 1 },
        downtimeActivity: { activity: 'therapy' as DowntimeActivity, sinceWeek: 1 },
        fatigue: 20,
      },
    }
    const teams = {}
    const downtimeAssignments = { a1: 'therapy' as DowntimeActivity }
    const result = advanceRecoveryDowntimeForWeek({
      week: 2,
      sourceAgents: agents,
      sourceTeams: teams,
      downtimeAssignments,
    })
    const updated = result.updatedAgents.a1
    expect(updated.recoveryStatus?.state === 'recovering' || updated.recoveryStatus?.state === 'healthy').toBe(true)
    expect((updated.trauma?.traumaLevel ?? 0)).toBeLessThanOrEqual(2)
  })

  it('returns to healthy if fatigue and trauma are low', () => {
    const agents = {
      a1: {
        ...baseAgent,
        recoveryStatus: { state: 'recovering' as RecoveryState, sinceWeek: 1 },
        trauma: { traumaLevel: 0, traumaTags: [], lastEventWeek: 1 },
        downtimeActivity: { activity: 'rest' as DowntimeActivity, sinceWeek: 1 },
        fatigue: 5,
      },
    }
    const teams = {}
    const downtimeAssignments = { a1: 'rest' as DowntimeActivity }
    const result = advanceRecoveryDowntimeForWeek({
      week: 2,
      sourceAgents: agents,
      sourceTeams: teams,
      downtimeAssignments,
    })
    expect(result.updatedAgents.a1.recoveryStatus?.state).toBe('healthy')
  })
})
