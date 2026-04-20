// cspell:words sato
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { normalizeGameState } from '../domain/teamSimulation'
import type { Agent } from '../domain/models'
import { calcTeamChemistry } from '../domain/sim/chemistry'

function makeAgent(id: string, overrides: Partial<Agent> = {}): Agent {
  const template = createStartingState().agents.a_ava

  return {
    ...template,
    id,
    name: `Agent ${id}`,
    role: 'hunter',
    baseStats: { combat: 60, investigation: 20, utility: 20, social: 20 },
    tags: [],
    relationships: {},
    fatigue: 0,
    status: 'active',
    assignment: { state: 'idle' },
    ...overrides,
  }
}

function makeRelationshipState(options: {
  result: 'success' | 'partial' | 'fail'
  initialLeft?: number
  initialRight?: number
  pairCount?: 2 | 1
}) {
  const { result, initialLeft = 0, initialRight = 0, pairCount = 2 } = options
  const state = createStartingState()

  const agents: Record<string, Agent> = {
    'agent-a': makeAgent('agent-a', {
      relationships: pairCount === 2 ? { 'agent-b': initialLeft } : {},
      baseStats:
        result === 'fail'
          ? { combat: 1, investigation: 0, utility: 0, social: 0 }
          : { combat: 120, investigation: 0, utility: 0, social: 0 },
    }),
  }

  if (pairCount === 2) {
    agents['agent-b'] = makeAgent('agent-b', {
      relationships: { 'agent-a': initialRight },
      baseStats:
        result === 'fail'
          ? { combat: 1, investigation: 0, utility: 0, social: 0 }
          : { combat: 120, investigation: 0, utility: 0, social: 0 },
    })
  }

  const difficultyCombat = result === 'success' ? 0 : result === 'partial' ? 200 : 10_000
  const partialMargin = result === 'partial' ? 20_000 : 1
  const memberIds = Object.keys(agents)

  state.agents = agents
  state.teams = {
    'team-relationship': {
      id: 'team-relationship',
      name: 'Relationship Team',
      memberIds,
      agentIds: memberIds,
      leaderId: 'agent-a',
      tags: [],
      assignedCaseId: 'case-relationship',
    },
  }
  state.cases = {
    'case-relationship': {
      ...state.cases['case-001'],
      id: 'case-relationship',
      templateId: 'case-relationship',
      title: 'Relationship Trial',
      status: 'in_progress',
      assignedTeamIds: ['team-relationship'],
      weeksRemaining: 1,
      mode: 'threshold',
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
      difficulty: { combat: difficultyCombat, investigation: 0, utility: 0, social: 0 },
      preferredTags: [],
      requiredTags: [],
      requiredRoles: [],
      stage: result === 'fail' ? 3 : 1,
      onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
      onUnresolved: {
        stageDelta: 1,
        deadlineResetWeeks: 2,
        spawnCount: { min: 0, max: 0 },
        spawnTemplateIds: [],
      },
    },
  }
  state.config = {
    ...state.config,
    partialMargin,
  }
  state.events = []
  state.reports = []

  return normalizeGameState(state)
}

describe('relationship evolution after shared missions', () => {
  it('increases reciprocal relationships after a shared success', () => {
    const next = advanceWeek(makeRelationshipState({ result: 'success' }))

    expect(next.agents['agent-a'].relationships['agent-b']).toBeCloseTo(1.06, 2)
    expect(next.agents['agent-b'].relationships['agent-a']).toBeCloseTo(1.06, 2)
  })

  it('increases reciprocal relationships by a smaller amount on partial outcomes', () => {
    const next = advanceWeek(makeRelationshipState({ result: 'partial' }))

    expect(next.agents['agent-a'].relationships['agent-b']).toBeCloseTo(0.56, 2)
    expect(next.agents['agent-b'].relationships['agent-a']).toBeCloseTo(0.56, 2)
  })

  it('decreases reciprocal relationships after a shared failure', () => {
    const next = advanceWeek(makeRelationshipState({ result: 'fail' }))

    expect(next.agents['agent-a'].relationships['agent-b']).toBeCloseTo(-1.01, 2)
    expect(next.agents['agent-b'].relationships['agent-a']).toBeCloseTo(-1.01, 2)
  })

  it('clamps relationship values to the supported gameplay range', () => {
    const afterSuccess = advanceWeek(
      makeRelationshipState({ result: 'success', initialLeft: 2, initialRight: 2 })
    )
    const afterFailure = advanceWeek(
      makeRelationshipState({ result: 'fail', initialLeft: -2, initialRight: -2 })
    )

    expect(afterSuccess.agents['agent-a'].relationships['agent-b']).toBe(2)
    expect(afterSuccess.agents['agent-b'].relationships['agent-a']).toBe(2)
    expect(afterFailure.agents['agent-a'].relationships['agent-b']).toBe(-2)
    expect(afterFailure.agents['agent-b'].relationships['agent-a']).toBe(-2)
  })

  it('does not mutate relationships for solo assignments', () => {
    const next = advanceWeek(makeRelationshipState({ result: 'success', pairCount: 1 }))

    expect(next.agents['agent-a'].relationships).toEqual({})
  })

  it('feeds updated relationship values into downstream chemistry', () => {
    const start = makeRelationshipState({ result: 'success' })
    const before = calcTeamChemistry([start.agents['agent-a'], start.agents['agent-b']]).bonus
    const next = advanceWeek(start)
    const after = calcTeamChemistry([next.agents['agent-a'], next.agents['agent-b']]).bonus

    expect(after).toBeGreaterThan(before)
  })

  it('can update relationships asymmetrically when one teammate carries the mission', () => {
    const start = makeRelationshipState({ result: 'success', initialLeft: 1, initialRight: 0 })
    start.agents['agent-a'] = {
      ...start.agents['agent-a'],
      baseStats: { combat: 220, investigation: 0, utility: 0, social: 0 },
    }
    start.agents['agent-b'] = {
      ...start.agents['agent-b'],
      baseStats: { combat: 40, investigation: 0, utility: 0, social: 0 },
    }

    const next = advanceWeek(start)

    expect(
      next.agents['agent-b'].relationships['agent-a'] -
        start.agents['agent-b'].relationships['agent-a']
    ).toBeGreaterThan(
      next.agents['agent-a'].relationships['agent-b'] -
        start.agents['agent-a'].relationships['agent-b']
    )
  })

  it('emits relationship change events after shared missions', () => {
    const next = advanceWeek(makeRelationshipState({ result: 'success' }))
    const relationshipEvents = next.events.filter(
      (event) => event.type === 'agent.relationship_changed'
    )

    expect(relationshipEvents).toHaveLength(2)
    expect(relationshipEvents[0]).toMatchObject({
      sourceSystem: 'agent',
      payload: expect.objectContaining({ reason: 'mission_success' }),
    })
  })

  it('drifts relationships back toward neutral when agents are no longer working together', () => {
    const state = createStartingState()
    state.agents['a_ava'].relationships['a_sato'] = 1
    state.agents['a_sato'].relationships['a_ava'] = 1

    const next = advanceWeek(state)

    expect(next.agents['a_ava'].relationships['a_sato']).toBe(0.94)
    expect(next.agents['a_sato'].relationships['a_ava']).toBe(0.94)
    expect(
      next.events.some(
        (event) =>
          event.type === 'agent.relationship_changed' && event.payload.reason === 'passive_drift'
      )
    ).toBe(true)
  })

  it('drifts stronger relationships slightly faster to avoid frozen extremes', () => {
    const state = createStartingState()
    state.agents['a_ava'].relationships['a_sato'] = 2
    state.agents['a_sato'].relationships['a_ava'] = 2

    const next = advanceWeek(state)

    expect(next.agents['a_ava'].relationships['a_sato']).toBe(1.92)
    expect(next.agents['a_sato'].relationships['a_ava']).toBe(1.92)
  })
})
