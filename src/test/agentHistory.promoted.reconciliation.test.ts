import { describe, expect, it } from 'vitest'
import { createAgent } from '../domain/agent/factory'
import { normalizeAgent } from '../domain/agent/normalize'

describe('agent history agent.promoted reconciliation', () => {
  it('preserves legacy promoted logs by reconciling level fields before validation', () => {
    const agent = createAgent({
      id: 'a_promoted_legacy',
      name: 'Legacy Promoted',
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
            id: 'evt-promoted-legacy',
            schemaVersion: 1,
            type: 'agent.promoted',
            sourceSystem: 'agent',
            timestamp: '2042-01-08T00:00:00.000Z',
            payload: {
              week: 2,
              agentId: agent.id,
              agentName: agent.name,
              newRole: ' medic ',
              previousLevel: 4,
              newLevel: 2,
              levelsGained: 9,
              skillPointsGranted: -1.5,
            },
          },
        ],
      },
    })

    expect(normalized.history?.logs).toHaveLength(1)
    expect(normalized.history?.logs[0]).toMatchObject({
      type: 'agent.promoted',
      payload: {
        newRole: 'medic',
        previousLevel: 4,
        newLevel: 4,
        levelsGained: 0,
        skillPointsGranted: 0,
      },
    })
  })

  it('preserves legacy promoted logs with missing roles by applying the global-event fallback', () => {
    const agent = createAgent({
      id: 'a_promoted_missing_role',
      name: 'Missing Role',
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
            id: 'evt-promoted-missing-role',
            schemaVersion: 1,
            type: 'agent.promoted',
            sourceSystem: 'agent',
            timestamp: '2042-01-08T00:00:00.000Z',
            payload: {
              week: 2,
              agentId: agent.id,
              agentName: agent.name,
              previousLevel: 2,
              newLevel: 3,
              levelsGained: 1,
              skillPointsGranted: 1,
            },
          },
        ],
      },
    })

    expect(normalized.history?.logs).toHaveLength(1)
    expect(normalized.history?.logs[0]).toMatchObject({
      type: 'agent.promoted',
      payload: {
        newRole: 'hunter',
        previousLevel: 2,
        newLevel: 3,
        levelsGained: 1,
        skillPointsGranted: 1,
      },
    })
  })
})
