// cspell:words lockdown medkits
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  getAgentEquipmentLoadoutViews,
  getGearRecommendationsForActiveCases,
} from './equipmentView'

describe('getGearRecommendationsForActiveCases', () => {
  it('returns at most five unresolved cases sorted by stage then deadline', () => {
    const game = createStartingState()
    const sampleCase = Object.values(game.cases)[0]

    game.cases = Object.fromEntries(
      Array.from({ length: 6 }, (_, index) => {
        const stage = 6 - index
        const deadlineRemaining = index + 1

        return [
          `case-${index + 1}`,
          {
            ...sampleCase,
            id: `case-${index + 1}`,
            title: `Case ${index + 1}`,
            status: 'open',
            stage,
            deadlineRemaining,
            tags: [],
            requiredTags: [],
            preferredTags: [],
            assignedTeamIds: [],
          },
        ]
      })
    )

    const recommendations = getGearRecommendationsForActiveCases(game)

    expect(recommendations).toHaveLength(5)
    expect(recommendations.map((item) => item.stage)).toEqual([6, 5, 4, 3, 2])
    expect(recommendations.map((item) => item.caseId)).toEqual([
      'case-1',
      'case-2',
      'case-3',
      'case-4',
      'case-5',
    ])
  })

  it('recommends ward seals for occult-tagged pressure', () => {
    const game = createStartingState()
    const sampleCase = Object.values(game.cases)[0]

    game.cases = {
      'case-occult': {
        ...sampleCase,
        id: 'case-occult',
        title: 'Ritual Site Lockdown',
        status: 'open',
        stage: 3,
        deadlineRemaining: 2,
        tags: ['occult', 'ritual', 'haunt'],
        requiredTags: ['occult'],
        preferredTags: ['containment'],
        assignedTeamIds: [],
      },
    }

    const recommendations = getGearRecommendationsForActiveCases(game)

    expect(recommendations).toHaveLength(1)
    expect(recommendations[0]?.itemId).toBe('ward_seals')
    expect(recommendations[0]?.reason).toMatch(/matches/i)
    expect(recommendations[0]?.stock).toBe(0)
    expect(recommendations[0]?.queued).toBe(0)
  })

  it('tracks queue and stock counts for the recommended item', () => {
    const game = createStartingState()
    const sampleCase = Object.values(game.cases)[0]

    game.cases = {
      'case-medical': {
        ...sampleCase,
        id: 'case-medical',
        title: 'Biohazard Sweep',
        status: 'open',
        stage: 4,
        deadlineRemaining: 1,
        tags: ['medical', 'biohazard'],
        requiredTags: [],
        preferredTags: ['injury'],
        assignedTeamIds: [],
      },
    }

    game.inventory.medkits = 3
    game.productionQueue = [
      {
        id: 'q-medkits-1',
        recipeId: 'med-kits',
        recipeName: 'Emergency Medkits',
        outputItemId: 'medkits',
        outputItemName: 'Emergency Medkits',
        outputQuantity: 1,
        startedWeek: 1,
        durationWeeks: 1,
        remainingWeeks: 1,
        fundingCost: 14,
      },
      {
        id: 'q-medkits-2',
        recipeId: 'med-kits',
        recipeName: 'Emergency Medkits',
        outputItemId: 'medkits',
        outputItemName: 'Emergency Medkits',
        outputQuantity: 1,
        startedWeek: 1,
        durationWeeks: 1,
        remainingWeeks: 1,
        fundingCost: 14,
      },
    ]

    const recommendations = getGearRecommendationsForActiveCases(game)

    expect(recommendations).toHaveLength(1)
    expect(recommendations[0]?.itemId).toBe('medkits')
    expect(recommendations[0]?.stock).toBe(3)
    expect(recommendations[0]?.queued).toBe(2)
  })

  it('builds deterministic loadout views from agent slots and inventory stock', () => {
    const game = createStartingState()
    game.inventory.signal_jammers = 2
    game.agents.a_mina = {
      ...game.agents.a_mina,
      equipmentSlots: {
        utility1: 'signal_jammers',
      },
      equipment: {
        signal_jammers: 1,
      },
    }

    const views = getAgentEquipmentLoadoutViews(game)
    const mina = views.find((view) => view.agentId === 'a_mina')

    expect(mina).toBeDefined()
    expect(mina?.summary.equippedItemCount).toBe(1)
    expect(mina?.summary.loadoutQuality).toBe(1)
    expect(mina?.slots.find((slot) => slot.slot === 'utility1')).toMatchObject({
      itemId: 'signal_jammers',
      itemName: 'Signal Jammers',
    })
    expect(mina?.slots.find((slot) => slot.slot === 'utility2')?.stockOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: 'signal_jammers',
          stock: 2,
        }),
      ])
    )
  })
})
