import { describe, expect, it } from 'vitest'
import { createAgent } from '../domain/agent/factory'
import { normalizeAgent } from '../domain/agent/normalize'
import { getLevelForXp, getXpThresholdForLevel } from '../domain/progression'

describe('agent history progression.xp_gained reconciliation', () => {
  it('preserves legacy xp_gained logs by reconciling level fields before validation', () => {
    const totalXp = getXpThresholdForLevel(3)
    const xpAmount = 75
    const previousTotalXp = totalXp - xpAmount
    const expectedLevel = getLevelForXp(totalXp)
    const expectedLevelsGained = expectedLevel - getLevelForXp(previousTotalXp)

    const agent = createAgent({
      id: 'a_xp_legacy',
      name: 'Legacy XP',
      role: 'investigator',
      baseStats: { combat: 20, investigation: 50, utility: 30, social: 25 },
      abilities: [],
      tags: [],
      relationships: {},
      fatigue: 0,
      status: 'active',
    })

    const normalized = normalizeAgent({
      ...agent,
      history: {
        ...agent.history!,
        logs: [
          {
            id: 'evt-xp-legacy',
            schemaVersion: 1,
            type: 'progression.xp_gained',
            sourceSystem: 'agent',
            timestamp: '2042-01-08T00:00:00.000Z',
            payload: {
              week: 2,
              agentId: agent.id,
              agentName: agent.name,
              xpAmount,
              reason: ' mission_success ',
              totalXp,
              level: 1,
              levelsGained: 9,
            },
          },
        ],
      },
    })

    expect(normalized.history?.logs).toHaveLength(1)
    expect(normalized.history?.logs[0]).toMatchObject({
      type: 'progression.xp_gained',
      payload: {
        xpAmount,
        reason: 'mission_success',
        totalXp,
        level: expectedLevel,
        levelsGained: expectedLevelsGained,
      },
    })
  })
})
