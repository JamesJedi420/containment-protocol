import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { purchaseMarketInventory } from '../../domain/sim/market'
import {
  getCurrentWeekMarketTransactions,
  getFilteredMarketListings,
  getMarketListings,
  readMarketFilters,
  type MarketFilters,
} from './marketView'

describe('marketView', () => {
  it('builds deterministic procurement listings with weekly availability and pricing', () => {
    const game = createStartingState()
    const listings = getMarketListings(game)

    expect(listings.length).toBeGreaterThan(0)
    expect(listings.some((listing) => listing.category === 'material')).toBe(true)
    expect(listings.some((listing) => listing.featured)).toBe(true)
    expect(listings.every((listing) => listing.buyPrice >= listing.sellPrice)).toBe(true)
    expect(listings.every((listing) => listing.availableBundles >= 0)).toBe(true)
  })

  it('filters by featured category and material query text', () => {
    const game = createStartingState()
    const featuredOnly: MarketFilters = {
      q: '',
      category: 'featured',
      sort: 'recommended',
    }

    const featuredListings = getFilteredMarketListings(game, featuredOnly)

    expect(featuredListings.length).toBe(1)
    expect(featuredListings[0]?.featured).toBe(true)

    const byText = getFilteredMarketListings(game, {
      q: 'medical',
      category: 'material',
      sort: 'name',
    })

    expect(byText.length).toBeGreaterThan(0)
    expect(byText.every((listing) => listing.category === 'material')).toBe(true)
  })

  it('sorts listings by descending buy price', () => {
    const game = createStartingState()
    const sorted = getFilteredMarketListings(game, {
      q: '',
      category: 'all',
      sort: 'price-desc',
    })

    expect(sorted.length).toBeGreaterThan(1)
    expect(sorted[0]!.buyPrice).toBeGreaterThanOrEqual(sorted[1]!.buyPrice)
  })

  it('reflects current-week transaction history from domain events', () => {
    const game = createStartingState()
    const listing = getMarketListings(game)[0]

    expect(listing).toBeDefined()

    const purchased = purchaseMarketInventory(game, listing!.id, 1)
    const transactions = getCurrentWeekMarketTransactions(purchased)

    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toMatchObject({
      action: 'buy',
      listingId: listing!.id,
      itemId: listing!.itemId,
    })
  })

  it('provides actionable shortfall text when funding blocks a purchase', () => {
    const game = {
      ...createStartingState(),
      funding: 0,
    }

    const listing = getMarketListings(game).find((candidate) => candidate.buyPrice > 0)

    expect(listing).toBeDefined()
    expect(listing!.canBuyOne).toBe(false)
    expect(listing!.buyBlockedReason).toMatch(/need \+\$\d+/i)
  })

  it('normalizes invalid market query params to defaults', () => {
    const params = new URLSearchParams('q=%20%20%20&category=invalid&sort=broken')
    const filters = readMarketFilters(params)

    expect(filters.q).toBe('')
    expect(filters.category).toBe('all')
    expect(filters.sort).toBe('recommended')
  })
})
