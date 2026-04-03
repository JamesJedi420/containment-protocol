import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildFactionRewardInfluence,
  buildFactionStates,
  getFactionPressureSpawnThreshold,
} from '../domain/factions'
import { createSeededRng } from '../domain/math'
import { buildMissionRewardBreakdown } from '../domain/missionResults'
import type { GameState, OperationEvent } from '../domain/models'
import { generateAmbientCases } from '../domain/caseGeneration'

function makeFactionEvent(
  factionId: string,
  factionName: string,
  delta: number,
  standingBefore: number,
  week = 1
): OperationEvent<'faction.standing_changed'> {
  return {
    id: `evt-${factionId}-${week}`,
    schemaVersion: 1,
    type: 'faction.standing_changed',
    sourceSystem: 'faction',
    timestamp: `2042-01-${String(week + 7).padStart(2, '0')}T00:00:00.001Z`,
    payload: {
      week,
      factionId,
      factionName,
      delta,
      standingBefore,
      standingAfter: standingBefore + delta,
      reason: 'case.resolved',
      caseId: `case-${week}`,
      caseTitle: `Case ${week}`,
    },
  }
}

describe('factions', () => {
  it('accumulates standing and exposes deterministic influence modifiers and opportunities', () => {
    const state = createStartingState()
    state.events = [
      makeFactionEvent('institutions', 'Academic Institutions', 5, 0, 1),
      makeFactionEvent('corporate_supply', 'Corporate Supply Chains', -6, 0, 2),
    ]

    const factions = buildFactionStates(state)
    const institutions = factions.find((faction) => faction.id === 'institutions')
    const corporateSupply = factions.find((faction) => faction.id === 'corporate_supply')

    expect(institutions?.standing).toBe(5)
    expect(institutions?.influenceModifiers.rewardModifier).toBeGreaterThan(0)
    expect(institutions?.opportunities.map((entry) => entry.label)).toContain('Research cooperation')

    expect(corporateSupply?.standing).toBe(-6)
    expect(corporateSupply?.influenceModifiers.rewardModifier).toBeLessThan(0)
    expect(corporateSupply?.opportunities.some((entry) => entry.direction === 'negative')).toBe(true)
  })

  it('modifies mission rewards from current faction standing for matching case families', () => {
    const supportiveState = createStartingState()
    supportiveState.events = [
      makeFactionEvent('occult_networks', 'Occult Networks', 8, 0, 1),
    ]

    const hostileState = createStartingState()
    hostileState.events = [
      makeFactionEvent('occult_networks', 'Occult Networks', -8, 0, 1),
    ]

    const occultCase = {
      ...supportiveState.cases['case-003'],
      id: 'case-occult-standing',
      tags: ['occult', 'ritual', 'spirit', 'chapel'],
      requiredTags: ['occultist'],
      preferredTags: ['ward-kit'],
      stage: 3,
    }

    const supportiveReward = buildMissionRewardBreakdown(
      occultCase,
      'success',
      supportiveState.config,
      supportiveState
    )
    const hostileReward = buildMissionRewardBreakdown(
      occultCase,
      'success',
      hostileState.config,
      hostileState
    )
    const influence = buildFactionRewardInfluence(occultCase, supportiveState)

    expect(influence.rewardModifier).toBeGreaterThan(0)
    expect(
      supportiveReward.factors.some((factor: { id: string }) => factor.id === 'faction-influence')
    ).toBe(true)
    expect(supportiveReward.fundingDelta).toBeGreaterThan(hostileReward.fundingDelta)
    expect(supportiveReward.reputationDelta).toBeGreaterThan(hostileReward.reputationDelta)
    expect(supportiveReward.strategicValueDelta).toBeGreaterThan(hostileReward.strategicValueDelta)
  })

  it('uses hostile standing to lower faction-pressure spawn thresholds deterministically', () => {
    const buildPressureState = (): GameState => {
      const state = createStartingState()
      state.config = { ...state.config, maxActiveCases: 8 }
      state.containmentRating = 85
      state.agency = {
        containmentRating: 85,
        clearanceLevel: state.clearanceLevel,
        funding: state.funding,
      }
      state.cases = {
        'case-occult-1': {
          ...state.cases['case-003'],
          id: 'case-occult-1',
          title: 'Ritual Pressure One',
          stage: 4,
          deadlineRemaining: 1,
          assignedTeamIds: [],
          status: 'open',
          tags: ['occult', 'ritual', 'chapel', 'tier-2'],
          requiredTags: ['occultist'],
          preferredTags: ['ritual-kit'],
        },
        'case-occult-2': {
          ...state.cases['case-003'],
          id: 'case-occult-2',
          title: 'Ritual Pressure Two',
          stage: 4,
          deadlineRemaining: 1,
          assignedTeamIds: [],
          status: 'open',
          tags: ['occult', 'ritual', 'reliquary', 'tier-2'],
          requiredTags: ['occultist'],
          preferredTags: ['ritual-kit'],
        },
      }

      return state
    }

    const neutralState = buildPressureState()
    const hostileState = buildPressureState()
    hostileState.events = [
      makeFactionEvent('occult_networks', 'Occult Networks', -8, 0, 1),
    ]

    const neutralFaction = buildFactionStates(neutralState).find(
      (faction) => faction.id === 'occult_networks'
    )
    const hostileFaction = buildFactionStates(hostileState).find(
      (faction) => faction.id === 'occult_networks'
    )
    const neutralResult = generateAmbientCases(neutralState, createSeededRng(4242).next)
    const hostileResult = generateAmbientCases(hostileState, createSeededRng(4242).next)

    expect(neutralFaction).toBeDefined()
    expect(hostileFaction).toBeDefined()
    expect(getFactionPressureSpawnThreshold(hostileFaction!)).toBeLessThan(
      getFactionPressureSpawnThreshold(neutralFaction!)
    )
    expect(neutralResult.spawnedCases).toHaveLength(0)
    expect(hostileResult.spawnedCases[0]).toMatchObject({
      trigger: 'faction_pressure',
      factionId: 'occult_networks',
    })
  })
})
