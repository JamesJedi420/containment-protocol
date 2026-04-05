import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildOperationExplanationBundle,
  explainCaseDifficulty,
  explainChemistry,
  explainGearImpact,
  explainPowerLayerImpact,
  explainRewardCalculation,
  explainTeamEffectiveness,
} from '../domain/explanations'
import { buildMissionRewardBreakdown } from '../domain/missionResults'
import { equipAgentItem } from '../domain/sim/equipment'
import { computeRequiredScore, computeTeamScore } from '../domain/sim/scoring'
import { getUniqueTeamMembers } from '../domain/teamSimulation'

describe('explanations', () => {
  it('explains case difficulty from the canonical required-score path', () => {
    const state = createStartingState()
    const currentCase = state.cases['case-001']
    const explanation = explainCaseDifficulty(currentCase, state.config)

    expect(explanation.requiredScore).toBeCloseTo(
      Number(computeRequiredScore(currentCase, state.config).toFixed(2)),
      6
    )
    expect(explanation.axes.map((axis) => axis.axis)).toEqual([
      'fieldPower',
      'containment',
      'investigation',
      'support',
    ])
    expect(explanation.axes.reduce((sum, axis) => sum + axis.weightedRequired, 0)).toBeCloseTo(
      explanation.requiredScore,
      2
    )
    expect(explanation.factors.map((factor) => factor.id)).toEqual([
      'stage',
      'duration',
      'deadline',
      'kind',
    ])
  })

  it('explains team effectiveness from the canonical score layers', () => {
    const state = createStartingState()
    state.partyCards = undefined

    const currentCase = state.cases['case-001']
    const team = state.teams['t_nightwatch']
    const agents = getUniqueTeamMembers(['t_nightwatch'], state.teams, state.agents)
    const expected = computeTeamScore(agents, currentCase, {
      inventory: state.inventory,
      supportTags: [...team.tags],
      teamTags: [...team.tags],
      leaderId: team.leaderId ?? null,
      preflight: {
        selectedTeamCount: 1,
        minTeamCount: undefined,
      },
      config: state.config,
    })

    const explanation = explainTeamEffectiveness(currentCase, state, ['t_nightwatch'])

    expect(explanation.finalScore).toBeCloseTo(Number(expected.score.toFixed(2)), 6)
    expect(explanation.requiredScore).toBeCloseTo(
      Number(computeRequiredScore(currentCase, state.config).toFixed(2)),
      6
    )
    expect(explanation.layerBreakdown?.layers.map((layer) => layer.id)).toEqual(
      expected.layerBreakdown.layers.map((layer) => layer.id)
    )
    expect(explanation.comparison?.finalDelta).toBeCloseTo(expected.comparison.finalDelta, 6)
    expect(explanation.performanceSummary).toEqual(expected.performanceSummary)
  })

  it('explains chemistry from live relationship data', () => {
    const state = createStartingState()
    state.partyCards = undefined
    state.agents['a_ava'] = {
      ...state.agents['a_ava'],
      relationships: { ...state.agents['a_ava'].relationships, a_mina: 2 },
    }
    state.agents['a_mina'] = {
      ...state.agents['a_mina'],
      relationships: { ...state.agents['a_mina'].relationships, a_ava: 2 },
    }
    state.teams['chem-team'] = {
      id: 'chem-team',
      name: 'Chem Team',
      memberIds: ['a_ava', 'a_mina'],
      agentIds: ['a_ava', 'a_mina'],
      leaderId: 'a_ava',
      tags: [],
    }

    const explanation = explainChemistry(state.cases['case-001'], state, ['chem-team'])

    expect(explanation.pairs).toBe(1)
    expect(explanation.bonus).toBeGreaterThan(0)
    expect(explanation.relationships[0]).toMatchObject({
      agentAId: 'a_ava',
      agentBId: 'a_mina',
      tone: 'positive',
    })
    expect(explanation.relationships[0]?.modifiers).toEqual(
      expect.arrayContaining(['high_trust', 'shared_history'])
    )
  })

  it('explains equipped gear and reserve support impacts', () => {
    const base = createStartingState()
    base.partyCards = undefined
    base.inventory = {
      ...base.inventory,
      ward_seals: 2,
    }

    const equipped = equipAgentItem(base, 'a_ava', 'secondary', 'ward_seals')
    const currentCase = {
      ...equipped.cases['case-001'],
      tags: ['occult', 'ritual', 'spirit'],
      requiredTags: ['occultist'],
      preferredTags: ['ward-kit'],
    }
    const explanation = explainGearImpact(currentCase, equipped, ['t_nightwatch'])

    expect(explanation.equippedItemCount).toBeGreaterThan(0)
    expect(explanation.activeContextItemCount).toBeGreaterThan(0)
    expect(explanation.reserveSupportBonus).toBeGreaterThan(0)
    expect(explanation.reserveReasons).not.toHaveLength(0)
    expect(explanation.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: 'ward_seals',
          contextActive: true,
        }),
      ])
    )
  })

  it('explains the full deterministic power layer from inventory, kits, and protocols', () => {
    const base = createStartingState()
    base.partyCards = undefined
    base.agency = {
      ...base.agency,
      containmentRating: 90,
      clearanceLevel: 2,
      funding: 200,
    }
    base.containmentRating = 90
    base.clearanceLevel = 2
    base.funding = 200
    base.inventory = {
      ...base.inventory,
      ward_seals: 2,
      ritual_components: 1,
    }

    const withSeal = equipAgentItem(base, 'a_ava', 'secondary', 'ward_seals')
    const equipped = equipAgentItem(withSeal, 'a_ava', 'utility2', 'ritual_components')
    const currentCase = {
      ...equipped.cases['case-001'],
      tags: ['occult', 'ritual', 'containment', 'anomaly', 'spirit'],
      requiredTags: [],
      preferredTags: [],
      weights: { combat: 0.05, investigation: 0.2, utility: 0.6, social: 0.15 },
    }

    const explanation = explainPowerLayerImpact(currentCase, equipped, ['t_nightwatch'])

    expect(explanation.inventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: 'ward_seals',
          equippedCount: 1,
          stockOnHand: 1,
        }),
      ])
    )
    expect(explanation.kits.map((kit) => kit.id)).toContain('occult-containment-kit')
    expect(explanation.kits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'occult-containment-kit',
          activeThresholds: [2],
          highestActiveThreshold: 2,
          statModifiers: [],
        }),
      ])
    )
    expect(explanation.protocols.map((protocol) => protocol.id)).toContain(
      'containment-doctrine-alpha'
    )
    expect(explanation.aggregateModifiers).not.toHaveLength(0)
  })

  it('explains reward calculation from the canonical reward breakdown', () => {
    const state = createStartingState()
    const currentCase = {
      ...state.cases['case-001'],
      stage: 3,
      tags: ['occult', 'ritual', 'spirit', 'chapel'],
      requiredTags: [],
      preferredTags: ['ward-kit'],
    }
    const expected = buildMissionRewardBreakdown(currentCase, 'success', state.config, state)
    const explanation = explainRewardCalculation(currentCase, 'success', state.config, state)

    expect(explanation.operationValue).toBe(expected.operationValue)
    expect(explanation.deltas).toEqual({
      funding: expected.fundingDelta,
      containment: expected.containmentDelta,
      reputation: expected.reputationDelta,
      strategicValue: expected.strategicValueDelta,
    })
    expect(explanation.factors.map((factor) => factor.id)).toEqual(
      expected.factors.map((factor) => factor.id)
    )
    expect(explanation.inventoryRewards).toEqual(expected.inventoryRewards)
    expect(explanation.factionStanding).toEqual(expected.factionStanding)
    expect(explanation.reasons).toEqual(expected.reasons)
  })

  it('builds a single operation explanation bundle for detail surfaces', () => {
    const state = createStartingState()
    state.partyCards = undefined

    const bundle = buildOperationExplanationBundle(
      state.cases['case-001'],
      state,
      ['t_nightwatch'],
      'partial'
    )

    expect(bundle.caseDifficulty.caseId).toBe('case-001')
    expect(bundle.teamEffectiveness.teamIds).toEqual(['t_nightwatch'])
    expect(bundle.rewardCalculation.outcome).toBe('partial')
    expect(bundle.chemistry.summary.length).toBeGreaterThan(0)
    expect(bundle.gearImpact.summary.length).toBeGreaterThan(0)
    expect(bundle.powerLayer.summary.length).toBeGreaterThan(0)
  })
})
