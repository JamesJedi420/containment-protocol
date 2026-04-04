import { describe, expect, it } from 'vitest'
// cspell:words sato kellan
import { createStartingState } from '../data/startingState'
import type { ResolutionOutcome } from '../domain/models'
import { applyMissionResolutionAgentMutations } from '../domain/sim/missionResolutionAgents'
import {
  applyBetrayalConsequences,
  BETRAYAL_GOSSIP_DELTA,
  BETRAYAL_SOLIDARITY_DELTA,
  expireBetrayalConsequences,
  recoverTrustDamagePassively,
  TRUST_DAMAGE_CRITICAL,
} from '../domain/sim/betrayal'

describe('betrayal phase-2 mechanics', () => {
  it('triggers betrayal on mission fail with critical relationship and contribution gap', () => {
    const state = createStartingState()
    const agents = {
      ...state.agents,
      a_ava: {
        ...state.agents.a_ava,
        status: 'active' as const,
        relationships: { ...state.agents.a_ava.relationships, a_sato: -1.8 },
      },
      a_sato: {
        ...state.agents.a_sato,
        status: 'active' as const,
        relationships: { ...state.agents.a_sato.relationships, a_ava: -1.3 },
      },
    }

    const outcome: ResolutionOutcome = {
      caseId: 'case-001',
      mode: 'threshold',
      kind: 'case',
      delta: -250,
      result: 'fail',
      reasons: ['insufficient contribution'],
      agentPerformance: [
        {
          agentId: 'a_ava',
          effectivenessScore: 24,
          fieldPower: 10,
          containment: 9,
          investigation: 8,
          support: 7,
          stressImpact: 16,
          contribution: 5,
          threatHandled: 2,
          damageTaken: 18,
          healingPerformed: 0,
          evidenceGathered: 1,
          containmentActionsCompleted: 1,
          contributionByDomain: {
            field: 2,
            resilience: 2,
            control: 1,
            insight: 1,
            presence: 1,
            anomaly: 1,
          },
        },
        {
          agentId: 'a_sato',
          effectivenessScore: 92,
          fieldPower: 38,
          containment: 35,
          investigation: 30,
          support: 24,
          stressImpact: 8,
          contribution: 110,
          threatHandled: 21,
          damageTaken: 4,
          healingPerformed: 0,
          evidenceGathered: 10,
          containmentActionsCompleted: 12,
          contributionByDomain: {
            field: 20,
            resilience: 18,
            control: 16,
            insight: 15,
            presence: 13,
            anomaly: 12,
          },
        },
      ],
    }

    const result = applyMissionResolutionAgentMutations({
      agents,
      assignedAgents: [agents.a_ava, agents.a_sato],
      assignedAgentLeaderBonuses: {},
      effectiveCase: state.cases['case-001'],
      outcome,
      week: state.week,
      rng: () => 0.99,
    })

    expect(
      result.eventDrafts.some(
        (event) =>
          event.type === 'agent.relationship_changed' && event.payload.reason === 'betrayal'
      )
    ).toBe(true)

    const betrayer = result.nextAgents.a_ava
    expect(betrayer.trustDamageByAgent?.a_sato ?? 0).toBeGreaterThan(0)
    expect(
      betrayer.trustConsequenceStack?.some((entry) => entry.consequenceType === 'benching')
    ).toBe(true)
    expect(betrayer.status).toBe('recovering')
  })

  it('escalates to disciplinary and resignation only after cumulative trust damage', () => {
    const state = createStartingState()
    let agents: typeof state.agents = {
      ...state.agents,
      a_ava: {
        ...state.agents.a_ava,
        relationships: { ...state.agents.a_ava.relationships, a_sato: -1.9 },
      },
      a_sato: {
        ...state.agents.a_sato,
        relationships: { ...state.agents.a_sato.relationships, a_ava: -1.9 },
      },
    }

    const updates = [
      {
        leftId: 'a_ava',
        rightId: 'a_sato',
        leftPrevious: -1.8,
        rightPrevious: -1.8,
        leftNext: -1.9,
        rightNext: -1.8,
      },
    ]
    const performanceByAgentId = new Map([
      ['a_ava', { agentId: 'a_ava', contribution: 0 }],
      ['a_sato', { agentId: 'a_sato', contribution: 200 }],
    ])

    let disciplinaryTriggered = false

    for (let i = 0; i < 5; i++) {
      const cycle = applyBetrayalConsequences({
        agents,
        updates,
        outcome: 'fail',
        performanceByAgentId,
        week: state.week + i,
      })
      agents = cycle.nextAgents
      if (cycle.fundingDelta < 0) {
        disciplinaryTriggered = true
      }
    }

    expect(disciplinaryTriggered).toBe(true)
    expect(agents.a_ava.trustDamageByAgent?.a_sato ?? 0).toBeGreaterThanOrEqual(
      TRUST_DAMAGE_CRITICAL
    )
    expect(
      agents.a_ava.trustConsequenceStack?.some((entry) => entry.consequenceType === 'resignation')
    ).toBe(true)
    expect(agents.a_ava.status).toBe('resigned')
  })

  it('expires temporary betrayal consequences and restores baseline status/multiplier', () => {
    const state = createStartingState()
    const seeded = {
      ...state.agents,
      a_ava: {
        ...state.agents.a_ava,
        status: 'recovering' as const,
        performancePenaltyMultiplier: 0.7,
        trustConsequenceStack: [
          {
            reason: 'betrayal' as const,
            pairAgentId: 'a_sato',
            triggeredWeek: 3,
            consequenceType: 'benching' as const,
            expiresWeek: 5,
          },
          {
            reason: 'betrayal' as const,
            pairAgentId: 'a_sato',
            triggeredWeek: 3,
            consequenceType: 'performance_penalty' as const,
            expiresWeek: 5,
          },
          {
            reason: 'betrayal' as const,
            pairAgentId: 'a_sato',
            triggeredWeek: 3,
            consequenceType: 'disciplinary' as const,
          },
        ],
      },
    }

    const next = expireBetrayalConsequences(seeded, 5)

    expect(next.a_ava.status).toBe('active')
    expect(next.a_ava.performancePenaltyMultiplier).toBeUndefined()
    expect(next.a_ava.trustConsequenceStack).toHaveLength(1)
    expect(next.a_ava.trustConsequenceStack?.[0]?.consequenceType).toBe('disciplinary')
  })

  it('applies passive weekly trust recovery and clears pair-linked temporary penalties', () => {
    const state = createStartingState()
    const seeded = {
      ...state.agents,
      a_ava: {
        ...state.agents.a_ava,
        status: 'recovering' as const,
        trustDamageByAgent: { a_sato: 0.62 },
        performancePenaltyMultiplier: 0.7,
        trustConsequenceStack: [
          {
            reason: 'betrayal' as const,
            pairAgentId: 'a_sato',
            triggeredWeek: 2,
            consequenceType: 'benching' as const,
            expiresWeek: 8,
          },
          {
            reason: 'betrayal' as const,
            pairAgentId: 'a_sato',
            triggeredWeek: 2,
            consequenceType: 'performance_penalty' as const,
            expiresWeek: 8,
          },
        ],
      },
    }

    const next = recoverTrustDamagePassively(seeded)

    expect(next.a_ava.trustDamageByAgent?.a_sato).toBeCloseTo(0.57, 2)
    expect(
      next.a_ava.trustConsequenceStack?.some(
        (entry) => entry.consequenceType === 'performance_penalty'
      )
    ).toBe(false)
    expect(next.a_ava.performancePenaltyMultiplier).toBeUndefined()
    expect(next.a_ava.status).toBe('active')
  })

  it('applies solidarity ripple from allies toward betrayer when affinity to betrayed is high', () => {
    const state = createStartingState()
    const agents: typeof state.agents = {
      ...state.agents,
      a_ava: {
        ...state.agents.a_ava,
        status: 'active',
        relationships: { ...state.agents.a_ava.relationships, a_sato: -1.8, a_kellan: 0 },
      },
      a_sato: {
        ...state.agents.a_sato,
        status: 'active',
        relationships: { ...state.agents.a_sato.relationships, a_ava: -1.2, a_kellan: 0.6 },
      },
      a_kellan: {
        ...state.agents.a_kellan,
        status: 'active',
        relationships: { ...state.agents.a_kellan.relationships, a_sato: 1, a_ava: 0.2 },
      },
    }

    const result = applyBetrayalConsequences({
      agents,
      updates: [
        {
          leftId: 'a_ava',
          rightId: 'a_sato',
          leftPrevious: -1.7,
          rightPrevious: -1.1,
          leftNext: -1.85,
          rightNext: -1.2,
        },
        {
          leftId: 'a_kellan',
          rightId: 'a_sato',
          leftPrevious: 1,
          rightPrevious: 0.6,
          leftNext: 0.95,
          rightNext: 0.55,
        },
      ],
      outcome: 'fail',
      performanceByAgentId: new Map([
        ['a_ava', { agentId: 'a_ava', contribution: 5 }],
        ['a_sato', { agentId: 'a_sato', contribution: 95 }],
        ['a_kellan', { agentId: 'a_kellan', contribution: 90 }],
      ]),
      week: state.week,
    })

    expect(result.nextAgents.a_kellan.relationships.a_ava).toBeCloseTo(
      0.2 + BETRAYAL_SOLIDARITY_DELTA,
      2
    )
    expect(
      result.eventDrafts.some(
        (event) =>
          event.type === 'agent.relationship_changed' &&
          event.payload.agentId === 'a_kellan' &&
          event.payload.counterpartId === 'a_ava' &&
          event.payload.reason === 'betrayal'
      )
    ).toBe(true)
  })

  it('applies cross-team gossip ripple from non-participant observers toward betrayer', () => {
    const state = createStartingState()
    const agents: typeof state.agents = {
      ...state.agents,
      a_ava: {
        ...state.agents.a_ava,
        status: 'active',
        relationships: { ...state.agents.a_ava.relationships, a_sato: -1.8 },
      },
      a_sato: {
        ...state.agents.a_sato,
        status: 'active',
        relationships: { ...state.agents.a_sato.relationships, a_ava: -1.1 },
      },
      a_mina: {
        ...state.agents.a_mina,
        status: 'active',
        relationships: { ...state.agents.a_mina.relationships, a_sato: 0.9, a_ava: 0.15 },
      },
    }

    const result = applyBetrayalConsequences({
      agents,
      updates: [
        {
          leftId: 'a_ava',
          rightId: 'a_sato',
          leftPrevious: -1.7,
          rightPrevious: -1.0,
          leftNext: -1.85,
          rightNext: -1.1,
        },
      ],
      outcome: 'fail',
      performanceByAgentId: new Map([
        ['a_ava', { agentId: 'a_ava', contribution: 5 }],
        ['a_sato', { agentId: 'a_sato', contribution: 95 }],
      ]),
      week: state.week,
    })

    expect(result.nextAgents.a_mina.relationships.a_ava).toBeCloseTo(
      0.15 + BETRAYAL_GOSSIP_DELTA,
      2
    )
    expect(
      result.eventDrafts.some(
        (event) =>
          event.type === 'agent.relationship_changed' &&
          event.payload.agentId === 'a_mina' &&
          event.payload.counterpartId === 'a_ava' &&
          event.payload.reason === 'betrayal'
      )
    ).toBe(true)
  })

  it('damps repeated gossip ripple hits for the same observer-to-betrayer edge in one tick', () => {
    const state = createStartingState()
    const agents: typeof state.agents = {
      ...state.agents,
      a_ava: {
        ...state.agents.a_ava,
        status: 'active',
        relationships: {
          ...state.agents.a_ava.relationships,
          a_sato: -1.8,
          a_kellan: -1.75,
        },
      },
      a_sato: {
        ...state.agents.a_sato,
        status: 'active',
        relationships: { ...state.agents.a_sato.relationships, a_ava: -1.1 },
      },
      a_kellan: {
        ...state.agents.a_kellan,
        status: 'active',
        relationships: { ...state.agents.a_kellan.relationships, a_ava: -0.9 },
      },
      a_mina: {
        ...state.agents.a_mina,
        status: 'active',
        relationships: {
          ...state.agents.a_mina.relationships,
          a_sato: 0.95,
          a_kellan: 0.9,
          a_ava: 0.5,
        },
      },
    }

    const result = applyBetrayalConsequences({
      agents,
      updates: [
        {
          leftId: 'a_ava',
          rightId: 'a_sato',
          leftPrevious: -1.7,
          rightPrevious: -1,
          leftNext: -1.8,
          rightNext: -1.1,
        },
        {
          leftId: 'a_ava',
          rightId: 'a_kellan',
          leftPrevious: -1.65,
          rightPrevious: -0.8,
          leftNext: -1.75,
          rightNext: -0.9,
        },
      ],
      outcome: 'fail',
      performanceByAgentId: new Map([
        ['a_ava', { agentId: 'a_ava', contribution: 3 }],
        ['a_sato', { agentId: 'a_sato', contribution: 92 }],
        ['a_kellan', { agentId: 'a_kellan', contribution: 88 }],
      ]),
      week: state.week,
    })

    expect(result.nextAgents.a_mina.relationships.a_ava).toBeCloseTo(0.5 + BETRAYAL_GOSSIP_DELTA, 2)

    const minaToAvaEvents = result.eventDrafts.filter(
      (event) =>
        event.type === 'agent.relationship_changed' &&
        event.payload.agentId === 'a_mina' &&
        event.payload.counterpartId === 'a_ava' &&
        event.payload.reason === 'betrayal'
    )
    expect(minaToAvaEvents).toHaveLength(1)
  })
})
