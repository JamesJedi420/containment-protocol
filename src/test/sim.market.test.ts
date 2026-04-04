import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { getProcurementListing, getProcurementListings } from '../domain/market'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { purchaseMarketInventory, sellMarketInventory } from '../domain/sim/market'

describe('market procurement simulation', () => {
  it('builds deterministic listings from the same state', () => {
    const state = createStartingState()

    expect(getProcurementListings(state)).toEqual(getProcurementListings(state))
  })

  it('purchase deducts funding, increases inventory, records a transaction event, and reduces availability', () => {
    const state = createStartingState()
    const listing = getProcurementListings(state)[0]

    expect(listing).toBeDefined()

    const result = purchaseMarketInventory(state, listing!.id, 1)
    const nextListing = getProcurementListing(result, listing!.id)

    expect(result.funding).toBe(state.funding - listing!.buyPrice)
    expect(result.inventory[listing!.itemId]).toBe(
      (state.inventory[listing!.itemId] ?? 0) + listing!.bundleQuantity
    )
    expect(result.events.at(-1)).toMatchObject({
      type: 'market.transaction_recorded',
      payload: {
        action: 'buy',
        listingId: listing!.id,
        quantity: listing!.bundleQuantity,
      },
    })
    expect(nextListing?.remainingAvailability).toBe(
      Math.max(0, listing!.remainingAvailability - listing!.bundleQuantity)
    )
  })

  it('sell adds funding, removes inventory, records a transaction event, and increases availability', () => {
    const state = createStartingState()
    const listing = getProcurementListings(state).find(
      (candidate) => candidate.inventoryStock >= candidate.bundleQuantity
    )

    expect(listing).toBeDefined()

    const result = sellMarketInventory(state, listing!.id, 1)
    const nextListing = getProcurementListing(result, listing!.id)

    expect(result.funding).toBe(state.funding + listing!.sellPrice)
    expect(result.inventory[listing!.itemId]).toBe(
      (state.inventory[listing!.itemId] ?? 0) - listing!.bundleQuantity
    )
    expect(result.events.at(-1)).toMatchObject({
      type: 'market.transaction_recorded',
      payload: {
        action: 'sell',
        listingId: listing!.id,
        quantity: listing!.bundleQuantity,
      },
    })
    expect(nextListing?.remainingAvailability).toBe(
      listing!.remainingAvailability + listing!.bundleQuantity
    )
  })

  it('cannot buy beyond remaining availability', () => {
    const state = createStartingState()
    const listing = getProcurementListings(state).find(
      (candidate) => candidate.availableBundles > 0
    )

    expect(listing).toBeDefined()

    const result = purchaseMarketInventory(state, listing!.id, listing!.availableBundles + 1)

    expect(result).toBe(state)
  })

  it('weekly market refresh resets availability tracking to the new market week', () => {
    const state = createStartingState()
    const listing = getProcurementListings(state)[0]

    expect(listing).toBeDefined()

    const purchased = purchaseMarketInventory(state, listing!.id, 1)
    const advanced = advanceWeek({
      ...purchased,
      cases: {},
    })
    const advancedListing = getProcurementListing(advanced, listing!.id)

    expect(advanced.market.week).toBe(state.market.week + 1)
    expect(advancedListing).toBeDefined()
    expect(advancedListing?.remainingAvailability).toBe(advancedListing?.totalAvailability)
  })

  it('generates unique market transaction IDs within the same week', () => {
    const state = createStartingState()
    const listing = getProcurementListings(state)[0]

    expect(listing).toBeDefined()

    const purchased = purchaseMarketInventory(state, listing!.id, 1)
    const sold = sellMarketInventory(purchased, listing!.id, 1)
    const marketTransactions = sold.events.filter(
      (event) => event.type === 'market.transaction_recorded'
    )

    expect(marketTransactions).toHaveLength(2)
    expect(marketTransactions[0]!.payload.transactionId).not.toBe(
      marketTransactions[1]!.payload.transactionId
    )
    expect(marketTransactions[0]!.payload.transactionId).toMatch(
      new RegExp(`^market-${state.week}-${state.market.week}-\\d+$`)
    )
  })
})
