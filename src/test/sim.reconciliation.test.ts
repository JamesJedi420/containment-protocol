import { describe, expect, it } from 'vitest'
// cspell:words sato cooldown
import { createStartingState } from '../data/startingState'
import {
  hasPairReconciledThisWeek,
  RECONCILIATION_COST,
  RECONCILIATION_DELTA_NEGATIVE,
  RECONCILIATION_DELTA_NON_NEGATIVE,
  reconcileAgents,
} from '../domain/sim/reconciliation'
import { TRUST_RECOVERY_PER_RECONCILIATION } from '../domain/sim/betrayal'

describe('reconcileAgents', () => {
  it('improves both directions, spends funding, and emits relationship events', () => {
    const state = createStartingState()
    const seeded = {
      ...state,
      agents: {
        ...state.agents,
        a_ava: {
          ...state.agents.a_ava,
          relationships: { ...state.agents.a_ava.relationships, a_sato: -1 },
        },
        a_sato: {
          ...state.agents.a_sato,
          relationships: { ...state.agents.a_sato.relationships, a_ava: -0.5 },
        },
      },
    }

    const next = reconcileAgents(seeded, 'a_ava', 'a_sato')

    expect(next.funding).toBe(seeded.funding - RECONCILIATION_COST)
    expect(next.agents.a_ava.relationships.a_sato).toBeCloseTo(
      -1 + RECONCILIATION_DELTA_NEGATIVE,
      2
    )
    expect(next.agents.a_sato.relationships.a_ava).toBeCloseTo(
      -0.5 + RECONCILIATION_DELTA_NEGATIVE,
      2
    )

    const relationshipEvents = next.events.filter((event) => event.type === 'agent.relationship_changed')
    expect(relationshipEvents).toHaveLength(2)
    expect(relationshipEvents[0]?.payload.reason).toBe('reconciliation')
    expect(relationshipEvents[1]?.payload.reason).toBe('reconciliation')
  })

  it('uses the smaller positive delta when relationship is already non-negative', () => {
    const state = createStartingState()
    const seeded = {
      ...state,
      agents: {
        ...state.agents,
        a_ava: {
          ...state.agents.a_ava,
          relationships: { ...state.agents.a_ava.relationships, a_sato: 0.4 },
        },
        a_sato: {
          ...state.agents.a_sato,
          relationships: { ...state.agents.a_sato.relationships, a_ava: 0 },
        },
      },
    }

    const next = reconcileAgents(seeded, 'a_ava', 'a_sato')

    expect(next.agents.a_ava.relationships.a_sato).toBeCloseTo(
      0.4 + RECONCILIATION_DELTA_NON_NEGATIVE,
      2
    )
    expect(next.agents.a_sato.relationships.a_ava).toBeCloseTo(
      0 + RECONCILIATION_DELTA_NON_NEGATIVE,
      2
    )
  })

  it('is a no-op when funding is insufficient', () => {
    const state = createStartingState()
    const seeded = {
      ...state,
      funding: RECONCILIATION_COST - 1,
      agents: {
        ...state.agents,
        a_ava: {
          ...state.agents.a_ava,
          relationships: { ...state.agents.a_ava.relationships, a_sato: -1 },
        },
      },
    }

    const next = reconcileAgents(seeded, 'a_ava', 'a_sato')

    expect(next.funding).toBe(seeded.funding)
    expect(next.agents.a_ava.relationships.a_sato).toBe(-1)
    expect(next.events).toHaveLength(seeded.events.length)
  })

  it('is a no-op when either agent is assigned on a case', () => {
    const state = createStartingState()
    const seeded = {
      ...state,
      agents: {
        ...state.agents,
        a_ava: {
          ...state.agents.a_ava,
          assignment: {
            state: 'assigned' as const,
            teamId: 't_nightwatch',
            caseId: 'case-001',
            startedWeek: state.week,
          },
          relationships: { ...state.agents.a_ava.relationships, a_sato: -1 },
        },
      },
    }

    const next = reconcileAgents(seeded, 'a_ava', 'a_sato')

    expect(next.agents.a_ava.relationships.a_sato).toBe(-1)
    expect(next.funding).toBe(seeded.funding)
    expect(next.events).toHaveLength(seeded.events.length)
  })

  it('enforces a per-pair weekly cooldown after reconciliation', () => {
    const state = createStartingState()
    const seeded = {
      ...state,
      agents: {
        ...state.agents,
        a_ava: {
          ...state.agents.a_ava,
          relationships: { ...state.agents.a_ava.relationships, a_sato: -1 },
        },
        a_sato: {
          ...state.agents.a_sato,
          relationships: { ...state.agents.a_sato.relationships, a_ava: -0.5 },
        },
      },
    }

    const first = reconcileAgents(seeded, 'a_ava', 'a_sato')
    expect(hasPairReconciledThisWeek(first, 'a_ava', 'a_sato')).toBe(true)

    const second = reconcileAgents(first, 'a_ava', 'a_sato')

    // No second spend or additional relationship change on the same week.
    expect(second.funding).toBe(first.funding)
    expect(second.agents.a_ava.relationships.a_sato).toBe(first.agents.a_ava.relationships.a_sato)
    expect(second.agents.a_sato.relationships.a_ava).toBe(first.agents.a_sato.relationships.a_ava)
    expect(second.events).toHaveLength(first.events.length)
  })

  it('reduces trust damage and clears temporary trust penalties for the reconciled pair', () => {
    const state = createStartingState()
    const seeded = {
      ...state,
      agents: {
        ...state.agents,
        a_ava: {
          ...state.agents.a_ava,
          status: 'recovering' as const,
          trustDamageByAgent: { a_sato: 0.75 },
          performancePenaltyMultiplier: 0.7,
          trustConsequenceStack: [
            {
              reason: 'betrayal' as const,
              pairAgentId: 'a_sato',
              triggeredWeek: state.week - 1,
              consequenceType: 'benching' as const,
              expiresWeek: state.week + 2,
            },
            {
              reason: 'betrayal' as const,
              pairAgentId: 'a_sato',
              triggeredWeek: state.week - 1,
              consequenceType: 'performance_penalty' as const,
              expiresWeek: state.week + 2,
            },
          ],
          relationships: { ...state.agents.a_ava.relationships, a_sato: -1 },
        },
        a_sato: {
          ...state.agents.a_sato,
          trustDamageByAgent: { a_ava: 0.3 },
          relationships: { ...state.agents.a_sato.relationships, a_ava: -0.8 },
        },
      },
    }

    const next = reconcileAgents(seeded, 'a_ava', 'a_sato')

    expect(next.agents.a_ava.trustDamageByAgent?.a_sato).toBeCloseTo(
      0.75 - TRUST_RECOVERY_PER_RECONCILIATION,
      2
    )
    expect(next.agents.a_sato.trustDamageByAgent).toEqual(undefined)
    expect(next.agents.a_ava.performancePenaltyMultiplier).toBeUndefined()
    expect(next.agents.a_ava.trustConsequenceStack ?? []).toHaveLength(0)
    expect(next.agents.a_ava.status).toBe('active')
  })
})
