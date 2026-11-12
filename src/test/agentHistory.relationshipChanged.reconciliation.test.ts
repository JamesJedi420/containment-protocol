import { describe, expect, it } from 'vitest'
import { createAgent } from '../domain/agent/factory'
import { normalizeAgent } from '../domain/agent/normalize'

describe('agent history agent.relationship_changed reconciliation', () => {
  it('preserves legacy relationship logs by reconciling chemistry before validation', () => {
    const agent = createAgent({
      id: 'a_relationship_legacy',
      name: 'Legacy Relationship',
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
            id: 'evt-relationship-legacy',
            schemaVersion: 1,
            type: 'agent.relationship_changed',
            sourceSystem: 'agent',
            timestamp: '2042-01-08T00:00:00.000Z',
            payload: {
              week: 2,
              agentId: agent.id,
              agentName: agent.name,
              counterpartId: 'a_counterpart',
              counterpartName: 'Counterpart',
              previousValue: 5,
              nextValue: -3,
              delta: 999,
              reason: 'passive_drift',
            },
          },
        ],
      },
    })

    expect(normalized.history?.logs).toHaveLength(1)
    expect(normalized.history?.logs[0]).toMatchObject({
      type: 'agent.relationship_changed',
      payload: {
        previousValue: 2,
        nextValue: -2,
        delta: -4,
        reason: 'passive_drift',
      },
    })
  })

  it('recomputes mismatched delta before validation', () => {
    const agent = createAgent({
      id: 'a_relationship_delta',
      name: 'Delta Mismatch',
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
            id: 'evt-relationship-delta',
            schemaVersion: 1,
            type: 'agent.relationship_changed',
            sourceSystem: 'agent',
            timestamp: '2042-01-08T00:00:00.000Z',
            payload: {
              week: 2,
              agentId: agent.id,
              agentName: agent.name,
              counterpartId: 'a_counterpart',
              counterpartName: 'Counterpart',
              previousValue: 0.2,
              nextValue: 0.4,
              delta: 0.15,
              reason: 'mission_success',
            },
          },
        ],
      },
    })

    expect(normalized.history?.logs).toHaveLength(1)
    expect(normalized.history?.logs[0]).toMatchObject({
      type: 'agent.relationship_changed',
      payload: {
        previousValue: 0.2,
        nextValue: 0.4,
        delta: 0.2,
      },
    })
  })

  it('preserves numeric-string chemistry when reconciling before validation', () => {
    const agent = createAgent({
      id: 'a_relationship_string',
      name: 'String Chemistry',
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
            id: 'evt-relationship-string',
            schemaVersion: 1,
            type: 'agent.relationship_changed',
            sourceSystem: 'agent',
            timestamp: '2042-01-08T00:00:00.000Z',
            payload: {
              week: 2,
              agentId: agent.id,
              agentName: agent.name,
              counterpartId: 'a_counterpart',
              counterpartName: 'Counterpart',
              previousValue: '0.12',
              nextValue: '0.28',
              delta: 'bad',
              reason: 'external_event',
            },
          },
        ],
      },
    })

    expect(normalized.history?.logs).toHaveLength(1)
    expect(normalized.history?.logs[0]).toMatchObject({
      type: 'agent.relationship_changed',
      payload: {
        previousValue: 0.12,
        nextValue: 0.28,
        delta: 0.16,
        reason: 'external_event',
      },
    })
  })

  it('falls back invalid relationship reasons to passive_drift before validation', () => {
    const agent = createAgent({
      id: 'a_relationship_reason',
      name: 'Reason Fallback',
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
            id: 'evt-relationship-reason',
            schemaVersion: 1,
            type: 'agent.relationship_changed',
            sourceSystem: 'agent',
            timestamp: '2042-01-08T00:00:00.000Z',
            payload: {
              week: 2,
              agentId: agent.id,
              agentName: agent.name,
              counterpartId: 'a_counterpart',
              counterpartName: 'Counterpart',
              previousValue: 0.1,
              nextValue: 0.2,
              delta: 0.1,
              reason: 'unsupported_reason',
            },
          },
        ],
      },
    })

    expect(normalized.history?.logs).toHaveLength(1)
    expect(normalized.history?.logs[0]).toMatchObject({
      type: 'agent.relationship_changed',
      payload: {
        reason: 'passive_drift',
      },
    })
  })
})
