import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  getProcurementAllocations,
  getProcurementListing,
  getProcurementListings,
  getProcurementMarketPackets,
} from '../domain/market'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  acknowledgeLicensedHandlingDoctrine,
  purchaseMarketInventory,
  sellMarketInventory,
} from '../domain/sim/market'
import { queueFabrication } from '../domain/sim/production'

describe('market procurement simulation', () => {
  function createDiscountedMarketState() {
    const state = createStartingState()

    return {
      ...state,
      market: {
        ...state.market,
        pressure: 'discounted' as const,
      },
    }
  }

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
        allocation: {
          resourceClass: 'supplier_attention_slot',
          source: listing!.marketPacket.id,
          destinationUse: listing!.id,
          substitutionStatus: 'none',
        },
      },
    })
    expect(nextListing?.remainingAvailability).toBe(
      Math.max(0, listing!.remainingAvailability - listing!.bundleQuantity)
    )
  })

  it('records supplier attention allocation packets deterministically', () => {
    const state = createStartingState()
    const listing = getProcurementListings(state).find(
      (candidate) =>
        candidate.itemId === 'field_plate' &&
        candidate.allocationStatus.purchaseAvailable &&
        candidate.availableBundles > 0
    )

    expect(listing).toBeDefined()

    const result = purchaseMarketInventory(state, listing!.id, 1)
    const allocations = getProcurementAllocations(result)

    expect(allocations).toEqual(getProcurementAllocations(result))
    expect(allocations).toHaveLength(1)
    expect(allocations[0]).toMatchObject({
      resourceClass: 'supplier_attention_slot',
      source: 'agency_supplier_roster',
      sourceLabel: 'Agency supplier roster',
      destinationUse: listing!.id,
      destinationLabel: listing!.itemName,
      urgency: 'standard',
      expectedBenefit: `${listing!.bundleQuantity}x ${listing!.itemName}`,
      delayWeeks: 0,
      substitutionStatus: 'none',
    })
  })

  it('records licensed handling allocation packets for controlled purchases', () => {
    const state = createDiscountedMarketState()
    const listing = getProcurementListings(state).find(
      (candidate) =>
        candidate.itemId === 'combat_stims' &&
        candidate.resourceStatuses.some(
          (status) =>
            status.resourceClass === 'licensed_handling_capacity' && status.purchaseAvailable
        ) &&
        candidate.availableBundles > 0
    )

    expect(listing).toBeDefined()

    const result = purchaseMarketInventory(state, listing!.id, 1)
    const allocations = getProcurementAllocations(result)

    expect(allocations).toEqual(getProcurementAllocations(result))
    expect(allocations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceClass: 'licensed_handling_capacity',
          source: 'licensed_handling_desk',
          sourceLabel: 'Licensed handling desk',
          destinationUse: listing!.id,
          destinationLabel: listing!.itemName,
          urgency: 'standard',
          expectedBenefit: `${listing!.bundleQuantity}x ${listing!.itemName}`,
          delayWeeks: 0,
          substitutionStatus: 'none',
        }),
      ])
    )
    expect(result.events.at(-1)).toMatchObject({
      type: 'market.transaction_recorded',
      payload: {
        allocations: expect.arrayContaining([
          expect.objectContaining({
            resourceClass: 'licensed_handling_capacity',
            source: 'licensed_handling_desk',
          }),
        ]),
      },
    })
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

  it('makes one procurement use unavailable when supplier attention is committed elsewhere', () => {
    const state = createStartingState()
    const fieldPlate = getProcurementListings(state).find(
      (candidate) => candidate.itemId === 'field_plate'
    )

    expect(fieldPlate).toBeDefined()

    const afterFieldPlate = purchaseMarketInventory(state, fieldPlate!.id, 1)
    const wardSealBatch = getProcurementListings(afterFieldPlate).find(
      (candidate) => candidate.id === 'ward-seals'
    )

    expect(wardSealBatch).toBeDefined()
    expect(wardSealBatch!.allocationStatus.state).toBe('committed_elsewhere')
    expect(wardSealBatch!.allocationStatus.purchaseAvailable).toBe(false)
    expect(wardSealBatch!.allocationStatus.displacedAlternativeUse).toBe(fieldPlate!.itemName)

    const blocked = purchaseMarketInventory(afterFieldPlate, wardSealBatch!.id, 1)

    expect(blocked).toBe(afterFieldPlate)
  })

  it('uses a degraded substitute when agency supplier attention is displaced', () => {
    const state = createStartingState()
    const fieldPlate = getProcurementListings(state).find(
      (candidate) => candidate.itemId === 'field_plate'
    )

    expect(fieldPlate).toBeDefined()

    const afterFieldPlate = purchaseMarketInventory(state, fieldPlate!.id, 1)
    const substitutedHazmat = getProcurementListings(afterFieldPlate).find(
      (candidate) => candidate.itemId === 'hazmat_suit'
    )

    expect(substitutedHazmat).toBeDefined()
    expect(substitutedHazmat!.allocationStatus.state).toBe('substituted')
    expect(substitutedHazmat!.allocationStatus.substitution).toMatchObject({
      source: 'gray_market_broker',
      sourceLabel: 'Gray-market broker',
      delayWeeks: 1,
      priceMultiplier: 1.35,
    })
    expect(substitutedHazmat!.buyPrice).toBe(
      substitutedHazmat!.allocationStatus.substitution!.unitPrice
    )

    const afterSubstitution = purchaseMarketInventory(afterFieldPlate, substitutedHazmat!.id, 1)
    const substitutionEvent = afterSubstitution.events.at(-1)

    expect(afterSubstitution.inventory.hazmat_suit).toBe(
      (afterFieldPlate.inventory.hazmat_suit ?? 0) + substitutedHazmat!.bundleQuantity
    )
    expect(substitutionEvent).toMatchObject({
      type: 'market.transaction_recorded',
      payload: {
        listingId: substitutedHazmat!.id,
        totalPrice: substitutedHazmat!.buyPrice,
        allocation: {
          source: 'gray_market_broker',
          displacedAlternativeUse: fieldPlate!.itemName,
          substitutionStatus: 'degraded_substitute',
          delayWeeks: 1,
        },
      },
    })
  })

  it('makes reagent-backed procurement unavailable when reagent stock is committed elsewhere', () => {
    const state = createStartingState()
    const afterWardFabrication = queueFabrication(state, 'ward-seals')
    const ritualComponents = getProcurementListings(afterWardFabrication).find(
      (candidate) => candidate.id === 'ritual-components'
    )

    expect(ritualComponents).toBeDefined()

    const reagentStatus = ritualComponents!.resourceStatuses.find(
      (status) => status.resourceClass === 'reagent_stock'
    )

    expect(reagentStatus).toMatchObject({
      source: 'occult_reagents',
      sourceLabel: 'Occult Reagents',
      state: 'committed_elsewhere',
      purchaseAvailable: false,
      displacedAlternativeUse: 'Ward Seal Batch',
    })

    const blocked = purchaseMarketInventory(afterWardFabrication, ritualComponents!.id, 1)

    expect(blocked).toBe(afterWardFabrication)
  })

  it('uses a degraded reagent substitute for equipment when reagent stock is committed', () => {
    const state = createStartingState()
    const afterWardFabrication = queueFabrication(state, 'ward-seals')
    const emfSensors = getProcurementListings(afterWardFabrication).find(
      (candidate) => candidate.id === 'emf-sensors'
    )

    expect(emfSensors).toBeDefined()

    const reagentStatus = emfSensors!.resourceStatuses.find(
      (status) => status.resourceClass === 'reagent_stock'
    )

    expect(reagentStatus).toMatchObject({
      source: 'occult_reagents',
      state: 'substituted',
      displacedAlternativeUse: 'Ward Seal Batch',
      substitution: {
        source: 'gray_market_broker',
        sourceLabel: 'Synthetic reagent substitute',
        delayWeeks: 1,
        priceMultiplier: 1.25,
      },
    })
    expect(emfSensors!.buyPrice).toBe(reagentStatus!.substitution!.unitPrice)

    const purchased = purchaseMarketInventory(afterWardFabrication, emfSensors!.id, 1)
    const event = purchased.events.at(-1)

    expect(purchased.inventory.emf_sensors).toBe(
      (afterWardFabrication.inventory.emf_sensors ?? 0) + emfSensors!.bundleQuantity
    )
    expect(event).toMatchObject({
      type: 'market.transaction_recorded',
      payload: {
        listingId: emfSensors!.id,
        allocations: expect.arrayContaining([
          expect.objectContaining({
            resourceClass: 'reagent_stock',
            source: 'gray_market_broker',
            sourceLabel: 'Synthetic reagent substitute',
            displacedAlternativeUse: 'Ward Seal Batch',
            substitutionStatus: 'degraded_substitute',
            delayWeeks: 1,
          }),
        ]),
      },
    })
  })

  it('makes controlled procurement unavailable when licensed handling is committed elsewhere', () => {
    const state = createDiscountedMarketState()
    const combatStims = getProcurementListings(state).find(
      (candidate) => candidate.itemId === 'combat_stims'
    )

    expect(combatStims).toBeDefined()

    const afterCombatStims = purchaseMarketInventory(state, combatStims!.id, 1)
    const hazmatSuit = getProcurementListings(afterCombatStims).find(
      (candidate) => candidate.itemId === 'hazmat_suit'
    )

    expect(hazmatSuit).toBeDefined()

    const handlingStatus = hazmatSuit!.resourceStatuses.find(
      (status) => status.resourceClass === 'licensed_handling_capacity'
    )

    expect(handlingStatus).toMatchObject({
      source: 'licensed_handling_desk',
      sourceLabel: 'Licensed handling desk',
      state: 'committed_elsewhere',
      purchaseAvailable: false,
      displacedAlternativeUse: combatStims!.itemName,
    })

    const blocked = purchaseMarketInventory(afterCombatStims, hazmatSuit!.id, 1)

    expect(blocked).toBe(afterCombatStims)
  })

  it('blocks controlled procurement when licensed handling doctrine attestation is stale', () => {
    const base = createDiscountedMarketState()
    const staleDoctrineState = {
      ...base,
      week: 5,
      market: {
        ...base.market,
        licensedHandlingAttestationWeek: 1,
      },
    }
    const combatStims = getProcurementListings(staleDoctrineState).find(
      (candidate) => candidate.itemId === 'combat_stims'
    )

    expect(combatStims).toBeDefined()

    const handlingStatus = combatStims!.resourceStatuses.find(
      (status) => status.resourceClass === 'licensed_handling_capacity'
    )

    expect(handlingStatus).toMatchObject({
      state: 'attestation_stale',
      purchaseAvailable: false,
    })
    expect(purchaseMarketInventory(staleDoctrineState, combatStims!.id, 1)).toBe(staleDoctrineState)
  })

  it('restores controlled procurement after doctrine acknowledgement clears stale attestation', () => {
    const base = createDiscountedMarketState()
    const staleDoctrineState = {
      ...base,
      week: 5,
      market: {
        ...base.market,
        licensedHandlingAttestationWeek: 1,
      },
    }
    const renewed = acknowledgeLicensedHandlingDoctrine(staleDoctrineState)

    expect(renewed.market.licensedHandlingAttestationWeek).toBe(5)

    const combatStims = getProcurementListings(renewed).find(
      (candidate) => candidate.itemId === 'combat_stims'
    )

    expect(combatStims).toBeDefined()

    const handlingStatus = combatStims!.resourceStatuses.find(
      (status) => status.resourceClass === 'licensed_handling_capacity'
    )

    expect(handlingStatus?.purchaseAvailable).toBe(true)
    expect(handlingStatus?.state).toBe('available')

    const afterBuy = purchaseMarketInventory(renewed, combatStims!.id, 1)

    expect(afterBuy).not.toBe(renewed)
  })

  it('preserves licensed handling attestation week across weekly market shifts', () => {
    const base = createStartingState()
    const state = {
      ...base,
      market: { ...base.market, licensedHandlingAttestationWeek: 12 },
    }
    const advanced = advanceWeek({
      ...state,
      cases: {},
    })

    expect(advanced.market.licensedHandlingAttestationWeek).toBe(12)
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
