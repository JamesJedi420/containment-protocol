import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { appendOperationEventDrafts } from '../domain/events'
import { generateAmbientCases } from '../domain/caseGeneration'
import {
  applyFactionMissionOutcome,
  buildFactionMissionContext,
  buildFactionOutcomeGrants,
  buildFactionRewardInfluence,
  buildFactionStates,
  createDefaultFactionStateMap,
  getFactionPressureSpawnThreshold,
  getFactionRecruitUnlocks,
  getFactionReputationTier,
  sanitizeFactionStateMap,
} from '../domain/factions'
import { createSeededRng } from '../domain/math'
import { buildMissionRewardBreakdown } from '../domain/missionResults'
import type { GameState } from '../domain/models'

function requireFactions(state: Pick<GameState, 'factions'>) {
  if (!state.factions) {
    throw new Error('Expected faction state to be present for this test.')
  }

  return state.factions
}

describe('factions', () => {
  it('maps continuous reputation thresholds into deterministic tiers and hostility', () => {
    expect(getFactionReputationTier(-75)).toBe('hostile')
    expect(getFactionReputationTier(-74)).toBe('unfriendly')
    expect(getFactionReputationTier(-24)).toBe('neutral')
    expect(getFactionReputationTier(24)).toBe('neutral')
    expect(getFactionReputationTier(25)).toBe('friendly')
    expect(getFactionReputationTier(75)).toBe('allied')

    const state = createStartingState()
    const factions = requireFactions(state)
    factions.oversight.reputation = -80

    const oversight = buildFactionStates(state).find((faction) => faction.id === 'oversight')

    expect(oversight).toMatchObject({
      reputation: -80,
      reputationTier: 'hostile',
      stateFlags: {
        isHostile: true,
      },
    })
  })

  it('tracks mission history, reveals hidden intel, and lets a contact go hostile independently', () => {
    let factions = createDefaultFactionStateMap()

    factions = applyFactionMissionOutcome(
      factions,
      {
        factionId: 'occult_networks',
        delta: 30,
        contactId: 'occult-caligo',
        contactDelta: -60,
      },
      'success'
    )
    factions = applyFactionMissionOutcome(
      factions,
      {
        factionId: 'occult_networks',
        delta: 5,
        contactId: 'occult-caligo',
        contactDelta: 0,
      },
      'fail'
    )

    const contact = factions.occult_networks.contacts.find((entry) => entry.id === 'occult-caligo')
    const occult = buildFactionStates({ ...createStartingState(), factions }).find(
      (faction) => faction.id === 'occult_networks'
    )

    expect(contact).toMatchObject({
      relationship: -60,
      status: 'hostile',
    })
    expect(occult).toMatchObject({
      reputation: 35,
      reputationTier: 'friendly',
      history: {
        missionsCompleted: 1,
        missionsFailed: 1,
        successRate: 50,
      },
      stateFlags: {
        isHostile: false,
      },
    })
    expect(occult?.knownModifiers.map((entry) => entry.label)).toContain('Blood price')
    expect(occult?.hiddenModifierCount).toBe(0)
    expect(occult?.lore.discovered.map((entry) => entry.label)).toContain('Ritual ledger')
  })

  it('keeps hidden faction effects out of visible state until interaction thresholds are met', () => {
    const state = createStartingState()

    const blackBudget = buildFactionStates(state).find((faction) => faction.id === 'black_budget')

    expect(blackBudget?.knownModifiers.map((entry) => entry.label)).not.toContain('Asset poaching')
    expect(blackBudget?.hiddenModifierCount).toBeGreaterThan(0)
  })

  it('preserves runtime modifier overrides during faction state hydration', () => {
    const factions = createDefaultFactionStateMap()

    factions.black_budget.modifiers.known.push({
      id: 'blackbudget-runtime-funding-flat',
      label: 'Runtime funding flat',
      description: 'Temporary covert payout rider.',
      effect: 'funding_flat',
      value: 4,
      tags: ['cyber'],
    })
    factions.black_budget.contacts = factions.black_budget.contacts.map((contact) =>
      contact.id === 'blackbudget-kincaid'
        ? {
            ...contact,
            modifiers: [
              ...(contact.modifiers ?? []),
              {
                id: 'blackbudget-kincaid-runtime-quality',
                label: 'Runtime recruit quality',
                description: 'Temporary recruiting quality rider.',
                effect: 'recruit_quality',
                value: 5,
              },
            ],
          }
        : contact
    )

    const hydrated = sanitizeFactionStateMap(factions)
    const kincaid = hydrated.black_budget.contacts.find((contact) => contact.id === 'blackbudget-kincaid')

    expect(hydrated.black_budget.modifiers.known).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'blackbudget-runtime-funding-flat',
          effect: 'funding_flat',
          value: 4,
        }),
      ])
    )
    expect(kincaid?.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'blackbudget-kincaid-runtime-quality',
          effect: 'recruit_quality',
          value: 5,
        }),
      ])
    )
  })

  it('modifies mission rewards from current faction reputation for matching case families', () => {
    const supportiveState = createStartingState()
    requireFactions(supportiveState).occult_networks.reputation = 45

    const hostileState = createStartingState()
    requireFactions(hostileState).occult_networks.reputation = -80

    const occultCase = {
      ...supportiveState.cases['case-003'],
      id: 'case-occult-standing',
      factionId: 'occult_networks',
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

  it('unlocks faction rewards and recruit channels at the correct tiers', () => {
    const state = createStartingState()
    const factions = requireFactions(state)
    factions.black_budget.reputation = 30

    const friendlyGrants = buildFactionOutcomeGrants(
      {
        kind: 'case',
        tags: ['cyber', 'signal', 'classified'],
        requiredTags: [],
        preferredTags: [],
        factionId: 'black_budget',
        contactId: 'blackbudget-kincaid',
      },
      'success',
      state
    )

    expect(friendlyGrants.fundingFlat).toBe(5)
    expect(friendlyGrants.favorGrants).toEqual([
      {
        factionId: 'black_budget',
        rewardId: 'blackbudget-intercept-favor',
        label: 'Intercept authority',
      },
    ])
    expect(friendlyGrants.recruitUnlocks).toEqual([])

    factions.black_budget.reputation = 80
    expect(getFactionRecruitUnlocks({ factions })).toEqual([])

    factions.black_budget.contacts = factions.black_budget.contacts.map((contact) =>
      contact.id === 'blackbudget-ossian'
        ? {
            ...contact,
            relationship: 20,
            status: 'active',
          }
        : contact
    )
    const recruitUnlocks = getFactionRecruitUnlocks({ factions })

    expect(recruitUnlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          factionId: 'black_budget',
          contactId: 'blackbudget-ossian',
          rewardId: 'blackbudget-operative-referral',
          minTier: 'allied',
        }),
      ])
    )
  })

  it('surfaces supportive faction-offered missions when reputation opens a cooperative channel', () => {
    const state = createStartingState()
    state.cases = {}
    state.config = { ...state.config, maxActiveCases: 4 }
    state.containmentRating = 82
    state.agency = {
      containmentRating: 82,
      clearanceLevel: state.clearanceLevel,
      funding: state.funding,
    }
    requireFactions(state).institutions.reputation = 80

    const result = generateAmbientCases(state, createSeededRng(8088).next)

    expect(result.spawnedCases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: 'faction_offer',
          factionId: 'institutions',
        }),
      ])
    )
    expect(
      Object.values(result.state.cases).some((currentCase) => currentCase.factionId === 'institutions')
    ).toBe(true)
  })

  it('applies active contact modifiers to faction mission context instead of treating them as inert data', () => {
    const boostedState = createStartingState()
    const dampenedState = createStartingState()
    const boostedFactions = requireFactions(boostedState)
    const dampenedFactions = requireFactions(dampenedState)

    boostedFactions.black_budget.reputation = 80
    dampenedFactions.black_budget.reputation = 80
    boostedFactions.black_budget.contacts = boostedFactions.black_budget.contacts.map((contact) =>
      contact.id === 'blackbudget-ossian'
        ? {
            ...contact,
            relationship: 26,
            status: 'active',
          }
        : contact
    )
    dampenedFactions.black_budget.contacts = dampenedFactions.black_budget.contacts.map((contact) =>
      contact.id === 'blackbudget-ossian'
        ? {
            ...contact,
            relationship: -20,
            status: 'inactive',
          }
        : contact
    )

    const caseData = {
      kind: 'case' as const,
      tags: ['classified', 'information', 'tech'],
      requiredTags: [],
      preferredTags: ['signal'],
      factionId: 'black_budget',
      contactId: 'blackbudget-ossian',
    }

    const boostedContext = buildFactionMissionContext(caseData, boostedState)
    const dampenedContext = buildFactionMissionContext(caseData, dampenedState)

    expect(boostedContext.scoreAdjustment).toBeGreaterThan(dampenedContext.scoreAdjustment)
    expect(boostedContext.reasons.join(' ')).toContain('Lena Ossian')
  })

  it('advances lore and hidden modifier discovery from non-mission faction interactions', () => {
    const state = appendOperationEventDrafts(createStartingState(), [
      {
        type: 'recruitment.scouting_initiated',
        sourceSystem: 'intel',
        payload: {
          week: 1,
          candidateId: 'cand-occult-01',
          candidateName: 'Occult Candidate',
          fundingCost: 6,
          stage: 1,
          projectedTier: 'B',
          confidence: 'medium',
          revealLevel: 1,
          sourceFactionId: 'occult_networks',
          sourceFactionName: 'Occult Networks',
          sourceContactId: 'occult-caligo',
          sourceContactName: 'Seraphine Caligo',
        },
      },
      {
        type: 'agent.hired',
        sourceSystem: 'agent',
        payload: {
          week: 1,
          candidateId: 'cand-occult-01',
          agentId: 'cand-occult-01',
          agentName: 'Occult Candidate',
          recruitCategory: 'agent',
          sourceFactionId: 'occult_networks',
          sourceFactionName: 'Occult Networks',
          sourceContactId: 'occult-caligo',
          sourceContactName: 'Seraphine Caligo',
        },
      },
    ])
    const occult = buildFactionStates(state).find((faction) => faction.id === 'occult_networks')

    expect(occult?.knownModifiers.map((entry) => entry.label)).toContain('Blood price')
    expect(occult?.lore.discovered.map((entry) => entry.label)).toContain('Ritual ledger')
  })

  it('opens adversarial infiltration channels only in hostile reputation windows', () => {
    const state = createStartingState()
    const factions = requireFactions(state)

    factions.occult_networks.reputation = -80
    factions.occult_networks.contacts = factions.occult_networks.contacts.map((contact) =>
      contact.id === 'occult-nem'
        ? {
            ...contact,
            relationship: -35,
            status: 'hostile',
          }
        : contact
    )

    expect(getFactionRecruitUnlocks({ factions })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          factionId: 'occult_networks',
          contactId: 'occult-nem',
          rewardId: 'occult-embedded-acolyte',
          disposition: 'adversarial',
          maxTier: 'unfriendly',
        }),
      ])
    )
  })

  it('projects newly opened recruit channels into mission reward previews after the outcome lands', () => {
    const state = createStartingState()
    const factions = requireFactions(state)
    factions.black_budget.reputation = 72
    factions.black_budget.contacts = factions.black_budget.contacts.map((contact) =>
      contact.id === 'blackbudget-ossian'
        ? {
            ...contact,
            relationship: 10,
            status: 'active',
          }
        : contact
    )

    const beforeUnlocks = getFactionRecruitUnlocks({ factions })
    const rewardBreakdown = buildMissionRewardBreakdown(
      {
        ...state.cases['case-003'],
        id: 'case-blackbudget-window',
        stage: 3,
        factionId: 'black_budget',
        contactId: 'blackbudget-ossian',
        tags: ['classified', 'information', 'tech'],
        requiredTags: [],
        preferredTags: ['signal'],
      },
      'success',
      state.config,
      state
    )

    expect(beforeUnlocks).toEqual([])
    expect(rewardBreakdown.factionUnlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          factionId: 'black_budget',
          contactId: 'blackbudget-ossian',
          label: 'Intercept operative referral',
        }),
      ])
    )
    expect(rewardBreakdown.reasons.join(' ')).toContain('New recruit channels')
  })

  it('applies flat funding and favor-gain faction modifiers to outcome grants', () => {
    const state = createStartingState()
    const factions = requireFactions(state)
    factions.black_budget.reputation = 30
    factions.black_budget.contacts = factions.black_budget.contacts.map((contact) =>
      contact.id === 'blackbudget-kincaid'
        ? {
            ...contact,
            relationship: 22,
            status: 'active',
            modifiers: [
              ...(contact.modifiers ?? []),
              {
                id: 'blackbudget-kincaid-flat-funding',
                label: 'Flat funding rider',
                description: 'Adds a fixed covert payout.',
                effect: 'funding_flat',
                value: 3,
                tags: ['cyber'],
              },
              {
                id: 'blackbudget-kincaid-extra-favor',
                label: 'Extra favor slot',
                description: 'Banks an additional favor on clean wins.',
                effect: 'favor_gain',
                value: 1,
                tags: ['cyber'],
              },
            ],
          }
        : contact
    )

    const grants = buildFactionOutcomeGrants(
      {
        kind: 'case',
        tags: ['cyber', 'relay', 'signal'],
        requiredTags: [],
        preferredTags: [],
        factionId: 'black_budget',
        contactId: 'blackbudget-kincaid',
      },
      'success',
      state
    )

    expect(grants.fundingFlat).toBe(8)
    expect(grants.favorGrants).toHaveLength(2)
  })

  it('suppresses hostile contacts without collapsing the parent faction tier', () => {
    const state = createStartingState()
    const factions = requireFactions(state)
    factions.black_budget.reputation = 80
    factions.black_budget.contacts = factions.black_budget.contacts.map((contact) =>
      contact.id === 'blackbudget-ossian'
        ? {
            ...contact,
            relationship: -60,
            status: 'hostile',
          }
        : contact
    )

    const blackBudget = buildFactionStates(state).find((faction) => faction.id === 'black_budget')
    const recruitUnlocks = getFactionRecruitUnlocks({ factions })

    expect(blackBudget?.reputationTier).toBe('allied')
    expect(
      recruitUnlocks.some(
        (unlock) =>
          unlock.factionId === 'black_budget' && unlock.contactId === 'blackbudget-ossian'
      )
    ).toBe(false)
  })

  it('uses hostile reputation to lower faction-pressure spawn thresholds deterministically', () => {
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
          factionId: 'occult_networks',
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
          factionId: 'occult_networks',
          tags: ['occult', 'ritual', 'reliquary', 'tier-2'],
          requiredTags: ['occultist'],
          preferredTags: ['ritual-kit'],
        },
      }

      return state
    }

    const neutralState = buildPressureState()
    const hostileState = buildPressureState()
    requireFactions(hostileState).occult_networks.reputation = -80

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
