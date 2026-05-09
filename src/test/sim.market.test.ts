import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  getProcurementListing,
  getProcurementListings,
  getProcurementMarketPackets,
} from '../domain/market'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { purchaseMarketInventory, sellMarketInventory } from '../domain/sim/market'

describe('market procurement simulation', () => {
  it('builds deterministic listings from the same state', () => {
    const state = createStartingState()

    expect(getProcurementListings(state)).toEqual(getProcurementListings(state))
  })

  it('builds deterministic market packets for exchange boundaries', () => {
    const state = createStartingState()
    const packets = getProcurementMarketPackets(state)

    expect(packets).toEqual(getProcurementMarketPackets(state))
    expect(packets.map((packet) => packet.id)).toEqual([
      'agency_supplier_roster',
      'gray_market_broker',
    ])
    expect(packets.find((packet) => packet.id === 'agency_supplier_roster')).toMatchObject({
      marketBoundary: 'agency-supplier-roster',
      legalityAccessMode: 'licensed',
      liquidityProfile: 'stable',
      available: true,
    })
    expect(packets.find((packet) => packet.id === 'gray_market_broker')).toMatchObject({
      marketBoundary: 'settlement-gray-market',
      legalityAccessMode: 'covert',
      liquidityProfile: 'thin',
      available: true,
    })
  })

  it('purchase deducts funding, increases inventory, records a transaction event, and reduces availability', () => {
    const state = createStartingState()
    const listing = getProcurementListings(state).find(
      (candidate) => candidate.accessAvailable && candidate.availableBundles > 0
    )

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

  it('blocks restricted acquisition classes separately from budget', () => {
    const state = createStartingState()
    const restrictedListing = getProcurementListings(state).find(
      (candidate) => candidate.itemId === 'advanced_recon_suite'
    )

    expect(restrictedListing).toBeDefined()
    expect(state.funding).toBeGreaterThanOrEqual(restrictedListing!.buyPrice)
    expect(restrictedListing!.accessAvailable).toBe(false)
    expect(restrictedListing!.accessBlockedReason).toMatch(/directorate special channel locked/i)

    const result = purchaseMarketInventory(state, restrictedListing!.id, 1)

    expect(result).toBe(state)
  })

  it('allows a restricted acquisition class after clearance unlocks its channel', () => {
    const state = createStartingState()
    const clearedState = {
      ...state,
      clearanceLevel: 2,
      agency: state.agency ? { ...state.agency, clearanceLevel: 2 } : state.agency,
    }
    const restrictedListing = getProcurementListings(clearedState).find(
      (candidate) => candidate.itemId === 'advanced_recon_suite'
    )

    expect(restrictedListing).toBeDefined()
    expect(restrictedListing!.accessAvailable).toBe(true)

    const result = purchaseMarketInventory(clearedState, restrictedListing!.id, 1)

    expect(result.funding).toBe(clearedState.funding - restrictedListing!.buyPrice)
    expect(result.inventory.advanced_recon_suite).toBe(
      (clearedState.inventory.advanced_recon_suite ?? 0) + restrictedListing!.bundleQuantity
    )
  })

  it('applies market packet boundary effects to equipment listings', () => {
    const state = createStartingState()
    const grayMarketEquipment = getProcurementListings(state).find(
      (candidate) => candidate.itemId === 'combat_stims'
    )
    const rosterEquipment = getProcurementListings(state).find(
      (candidate) => candidate.itemId === 'field_plate'
    )

    expect(grayMarketEquipment).toBeDefined()
    expect(rosterEquipment).toBeDefined()
    expect(grayMarketEquipment!.category).toBe('equipment')
    expect(rosterEquipment!.category).toBe('equipment')
    expect(grayMarketEquipment!.marketPacket).toMatchObject({
      id: 'gray_market_broker',
      marketBoundary: 'settlement-gray-market',
      legalityAccessMode: 'covert',
    })
    expect(rosterEquipment!.marketPacket).toMatchObject({
      id: 'agency_supplier_roster',
      marketBoundary: 'agency-supplier-roster',
      legalityAccessMode: 'licensed',
    })
    expect(grayMarketEquipment!.marketPacket.priceMultiplier).toBeGreaterThan(
      rosterEquipment!.marketPacket.priceMultiplier
    )
    expect(grayMarketEquipment!.marketPacket.availabilityMultiplier).toBeLessThan(
      rosterEquipment!.marketPacket.availabilityMultiplier
    )
  })

  it('uses packet access rules to block covert exchange under sanctioned posture', () => {
    const state = createStartingState()
    const sanctionedState = {
      ...state,
      legitimacy: {
        sanctionLevel: 'sanctioned' as const,
        accessReason: 'audit posture',
        falloutRisk: 'none' as const,
      },
    }
    const grayMarketEquipment = getProcurementListings(sanctionedState).find(
      (candidate) => candidate.itemId === 'combat_stims'
    )

    expect(grayMarketEquipment).toBeDefined()
    expect(state.funding).toBeGreaterThanOrEqual(grayMarketEquipment!.buyPrice)
    expect(grayMarketEquipment!.marketPacket.available).toBe(false)
    expect(grayMarketEquipment!.totalAvailability).toBe(0)
    expect(grayMarketEquipment!.accessAvailable).toBe(false)
    expect(grayMarketEquipment!.accessBlockedReason).toMatch(/sanctioned audit posture/i)

    const result = purchaseMarketInventory(sanctionedState, grayMarketEquipment!.id, 1)

    expect(result).toBe(sanctionedState)
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
    const listing = getProcurementListings(state).find(
      (candidate) => candidate.accessAvailable && candidate.availableBundles > 0
    )

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
