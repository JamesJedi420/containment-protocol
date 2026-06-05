import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store/gameStore'
import { createStartingState } from '../../data/startingState'
import { getProcurementListings } from '../../domain/market'
import { getProcurementScreenView } from './procurementView'

describe('procurementView', () => {
  beforeEach(() => {
    useGameStore.persist.clearStorage()
    useGameStore.setState({ game: createStartingState() })
  })

  it('builds market options from canonical procurement listings with buyPrice as cost', () => {
    const game = createStartingState()
    useGameStore.setState({ game })

    const listings = getProcurementListings(game)
    const view = getProcurementScreenView()

    expect(view.options.length).toBeGreaterThan(listings.length)
    expect(view.options.some((option) => option.category === 'Fabrication')).toBe(true)

    for (const listing of listings) {
      const option = view.options.find((candidate) => candidate.id === listing.id)
      expect(option).toBeDefined()
      expect(option!.cost).toBe(listing.buyPrice)
      expect(option!.name).toBe(listing.itemName)
      expect(option!.source).toBe(listing.marketPacket.label)
    }
  })

  it('keeps insufficient funds out of blockers while still marking the option unaffordable', () => {
    const game = {
      ...createStartingState(),
      funding: 0,
    }
    useGameStore.setState({ game })

    const listing = getProcurementListings(game).find(
      (candidate) => candidate.accessAvailable && candidate.buyPrice > 0
    )

    expect(listing).toBeDefined()

    const option = getProcurementScreenView().options.find(
      (candidate) => candidate.id === listing!.id
    )

    expect(option).toBeDefined()
    expect(option!.affordable).toBe(false)
    expect(option!.blockers).not.toContain('Insufficient funds')
    expect(option!.blockers.every((blocker) => !/need \+\$/i.test(blocker))).toBe(true)
  })

  it('surfaces canonical access blockers when funding can cover a restricted listing', () => {
    const game = createStartingState()
    useGameStore.setState({ game })

    const listing = getProcurementListings(game).find(
      (candidate) => candidate.itemId === 'advanced_recon_suite'
    )

    expect(listing).toBeDefined()
    expect(game.funding).toBeGreaterThanOrEqual(listing!.buyPrice)

    const option = getProcurementScreenView().options.find(
      (candidate) => candidate.id === listing!.id
    )

    expect(option).toBeDefined()
    expect(option!.affordable).toBe(true)
    expect(option!.blockers.length).toBeGreaterThan(0)
    expect(option!.blockers.join(' ')).toMatch(/directorate special channel locked/i)
    expect(option!.accessLabel).toBe(listing!.accessLabel)
    expect(option!.availability).toMatch(/directorate special channel locked/i)
  })

  it('preserves fabrication queue options with canonical fabricationCost', () => {
    const game = createStartingState()
    useGameStore.setState({ game })

    const recipeListing = getProcurementListings(game).find(
      (candidate) => candidate.source === 'recipe' && candidate.fabricationCost !== undefined
    )

    expect(recipeListing).toBeDefined()

    const fabricationOption = getProcurementScreenView().options.find(
      (candidate) =>
        candidate.category === 'Fabrication' && candidate.id === recipeListing!.recipeId
    )

    expect(fabricationOption).toBeDefined()
    expect(fabricationOption!.cost).toBe(recipeListing!.fabricationCost)
    expect(fabricationOption!.source).toBe('Workshop')
  })
})
