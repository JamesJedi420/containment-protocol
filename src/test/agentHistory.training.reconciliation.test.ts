import { describe, expect, it } from 'vitest'
import { createAgent } from '../domain/agent/factory'
import { normalizeAgent } from '../domain/agent/normalize'

describe('agent history training event reconciliation', () => {
  it('preserves legacy agent.training_started logs by reconciling program and numerics before validation', () => {
    const agent = createAgent({
      id: 'a_training_started_legacy',
      name: 'Legacy Started',
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
            id: 'evt-training-started-legacy',
            schemaVersion: 1,
            type: 'agent.training_started',
            sourceSystem: 'agent',
            timestamp: '2042-01-08T00:00:00.000Z',
            payload: {
              week: 2,
              queueId: 'queue-legacy',
              agentId: agent.id,
              agentName: agent.name,
              trainingId: 'legacy-unknown-program',
              trainingName: 'Legacy Course Name',
              etaWeeks: -2.7,
              fundingCost: Number.NaN,
            },
          },
        ],
      },
    })

    expect(normalized.history?.logs).toHaveLength(1)
    expect(normalized.history?.logs[0]).toMatchObject({
      type: 'agent.training_started',
      payload: {
        trainingId: 'combat-drills',
        trainingName: 'Close-Quarters Drills',
        etaWeeks: 1,
        fundingCost: 0,
      },
    })
  })

  it('preserves legacy agent.training_completed logs by reconciling program before validation', () => {
    const agent = createAgent({
      id: 'a_training_completed_legacy',
      name: 'Legacy Completed',
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
            id: 'evt-training-completed-legacy',
            schemaVersion: 1,
            type: 'agent.training_completed',
            sourceSystem: 'agent',
            timestamp: '2042-01-08T00:00:00.000Z',
            payload: {
              week: 2,
              queueId: 'queue-legacy',
              agentId: agent.id,
              agentName: agent.name,
              trainingId: 'legacy-unknown-program',
              trainingName: 'Analysis Lab',
            },
          },
        ],
      },
    })

    expect(normalized.history?.logs).toHaveLength(1)
    expect(normalized.history?.logs[0]).toMatchObject({
      type: 'agent.training_completed',
      payload: {
        trainingId: 'analysis-lab',
        trainingName: 'Analysis Lab',
      },
    })
  })

  it('preserves legacy agent.training_cancelled logs by clamping refund to program fundingCost', () => {
    const agent = createAgent({
      id: 'a_training_cancelled_legacy',
      name: 'Legacy Cancelled',
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
            id: 'evt-training-cancelled-legacy',
            schemaVersion: 1,
            type: 'agent.training_cancelled',
            sourceSystem: 'agent',
            timestamp: '2042-01-08T00:00:00.000Z',
            payload: {
              week: 2,
              agentId: agent.id,
              agentName: agent.name,
              trainingId: 'combat-drills',
              trainingName: 'Close-Quarters Drills',
              refund: 999.8,
            },
          },
        ],
      },
    })

    expect(normalized.history?.logs).toHaveLength(1)
    expect(normalized.history?.logs[0]).toMatchObject({
      type: 'agent.training_cancelled',
      payload: {
        trainingId: 'combat-drills',
        trainingName: 'Close-Quarters Drills',
        refund: 10,
      },
    })
  })

  it('preserves numeric-string training fields when reconciling before validation', () => {
    const agent = createAgent({
      id: 'a_training_string',
      name: 'String Training',
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
            id: 'evt-training-started-string',
            schemaVersion: 1,
            type: 'agent.training_started',
            sourceSystem: 'agent',
            timestamp: '2042-01-08T00:00:00.000Z',
            payload: {
              week: 2,
              queueId: 'queue-string',
              agentId: agent.id,
              agentName: agent.name,
              trainingId: 'combat-drills',
              trainingName: 'Close-Quarters Drills',
              etaWeeks: '2.9',
              fundingCost: '7.1',
            },
          },
          {
            id: 'evt-training-cancelled-string',
            schemaVersion: 1,
            type: 'agent.training_cancelled',
            sourceSystem: 'agent',
            timestamp: '2042-01-08T00:00:00.001Z',
            payload: {
              week: 2,
              agentId: agent.id,
              agentName: agent.name,
              trainingId: 'combat-drills',
              trainingName: 'Close-Quarters Drills',
              refund: '4.8',
            },
          },
        ],
      },
    })

    expect(normalized.history?.logs).toHaveLength(2)
    expect(normalized.history?.logs[0]).toMatchObject({
      type: 'agent.training_started',
      payload: {
        etaWeeks: 2,
        fundingCost: 7,
      },
    })
    expect(normalized.history?.logs[1]).toMatchObject({
      type: 'agent.training_cancelled',
      payload: {
        refund: 4,
      },
    })
  })
})
