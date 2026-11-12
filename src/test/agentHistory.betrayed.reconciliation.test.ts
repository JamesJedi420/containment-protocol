import { describe, expect, it } from 'vitest'
import { createAgent } from '../domain/agent/factory'
import { normalizeAgent } from '../domain/agent/normalize'

describe('agent history agent.betrayed reconciliation', () => {
  it('preserves legacy betrayed logs by reconciling trust damage before validation', () => {
    const agent = createAgent({
      id: 'a_betrayed_legacy',
      name: 'Legacy Betrayed',
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
            id: 'evt-betrayed-legacy',
            schemaVersion: 1,
            type: 'agent.betrayed',
            sourceSystem: 'agent',
            timestamp: '2042-01-08T00:00:00.000Z',
            payload: {
              week: 2,
              betrayerId: agent.id,
              betrayerName: agent.name,
              betrayedId: 'a_counterpart',
              betrayedName: 'Counterpart',
              trustDamageDelta: -0.35,
              trustDamageTotal: Number.NaN,
              triggeredConsequences: ['benching', 'not-a-consequence'],
            },
          },
        ],
      },
    })

    expect(normalized.history?.logs).toHaveLength(1)
    expect(normalized.history?.logs[0]).toMatchObject({
      type: 'agent.betrayed',
      payload: {
        trustDamageDelta: 0,
        trustDamageTotal: 0,
        triggeredConsequences: ['benching'],
      },
    })
  })

  it('lifts trustDamageTotal up to trustDamageDelta before validation', () => {
    const agent = createAgent({
      id: 'a_betrayed_total',
      name: 'Total Lift',
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
            id: 'evt-betrayed-total',
            schemaVersion: 1,
            type: 'agent.betrayed',
            sourceSystem: 'agent',
            timestamp: '2042-01-08T00:00:00.000Z',
            payload: {
              week: 2,
              betrayerId: agent.id,
              betrayerName: agent.name,
              betrayedId: 'a_counterpart',
              betrayedName: 'Counterpart',
              trustDamageDelta: 0.8,
              trustDamageTotal: 0.2,
              triggeredConsequences: [],
            },
          },
        ],
      },
    })

    expect(normalized.history?.logs).toHaveLength(1)
    expect(normalized.history?.logs[0]).toMatchObject({
      type: 'agent.betrayed',
      payload: {
        trustDamageDelta: 0.8,
        trustDamageTotal: 0.8,
      },
    })
  })

  it('preserves numeric-string trust damage when reconciling before validation', () => {
    const agent = createAgent({
      id: 'a_betrayed_string',
      name: 'String Damage',
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
            id: 'evt-betrayed-string',
            schemaVersion: 1,
            type: 'agent.betrayed',
            sourceSystem: 'agent',
            timestamp: '2042-01-08T00:00:00.000Z',
            payload: {
              week: 2,
              betrayerId: agent.id,
              betrayerName: agent.name,
              betrayedId: 'a_counterpart',
              betrayedName: 'Counterpart',
              trustDamageDelta: '0.35',
              trustDamageTotal: '1.10',
              triggeredConsequences: [],
            },
          },
        ],
      },
    })

    expect(normalized.history?.logs).toHaveLength(1)
    expect(normalized.history?.logs[0]).toMatchObject({
      type: 'agent.betrayed',
      payload: {
        trustDamageDelta: 0.35,
        trustDamageTotal: 1.1,
      },
    })
  })
})
