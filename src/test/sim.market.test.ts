import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  getProcurementAllocations,
  getProcurementListing,
  getProcurementListings,
  getProcurementMarketPackets,
  sanitizeFeaturedRecipeId,
  sanitizePersistedMarketState,
} from '../domain/market'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  acknowledgeLicensedHandlingDoctrine,
  fulfillPendingProcurementBacklogAtWeekClose,
  placeDelayedMarketOrder,
  purchaseMarketInventory,
  redeemFactionFavorProcurement,
  sellMarketInventory,
} from '../domain/sim/market'
import { getCanonicalFundingState } from '../domain/funding'
import { FUNDING_CALIBRATION } from '../domain/sim/calibration'
import { getProcurementScreenView, getMarketListings } from '../features/market/marketView'
import { assessFactionFavorExchangeProcurement } from '../domain/market'
import { queueFabrication } from '../domain/sim/production'
import type { EntityWelfareReclassificationRecord } from '../domain/entityWelfareReclassificationRegistry'

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

  function createClearedMarketState() {
    const state = createStartingState()

    return {
      ...state,
      clearanceLevel: 2,
      agency: state.agency ? { ...state.agency, clearanceLevel: 2 } : state.agency,
    }
  }

  function createGearPermissionRecord(
    overrides: Partial<EntityWelfareReclassificationRecord> = {}
  ): EntityWelfareReclassificationRecord {
    return {
      id: 'reclass:procurement-gear-permission',
      label: 'Procurement gear permission',
      priorThreatLabel: 'procurement-review',
      proposedDisposition: 'cooperative',
      reclassificationState: 'approved',
      reviewGate: 'ethics',
      reviewArtifactRef: 'review:procurement-gear-permission',
      evidenceBundleRefs: ['evidence:procurement-gear-permission'],
      containmentRevisionRefs: ['revision:procurement-gear-permission'],
      ...overrides,
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
        candidate.itemId === 'medkits' &&
        candidate.allocationStatus.purchaseAvailable &&
        candidate.availableBundles > 0 &&
        !candidate.delayedFulfillmentWeeks &&
        candidate.resourceStatuses.length === 1
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

  it('does not sell fabricated-lot-reserved equipment as anonymous catalog stock', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1
    state.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
        trackedInstanceUnits: 0,
      },
    }
    const listing = getProcurementListings(state).find(
      (candidate) => candidate.itemId === 'signal_jammers'
    )

    expect(listing).toBeDefined()

    const result = sellMarketInventory(state, listing!.id, 1)

    expect(result.funding).toBe(state.funding)
    expect(result.inventory.signal_jammers).toBe(1)
    expect(result.events.filter((event) => event.type === 'market.transaction_recorded')).toEqual(
      []
    )
  })

  it('sells equipment when unreserved catalog stock remains alongside fabricated lots', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 2
    state.fabricatedEquipmentLots = {
      batch: {
        queueId: 'batch',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
        trackedInstanceUnits: 0,
      },
    }
    const listing = getProcurementListings(state).find(
      (candidate) => candidate.itemId === 'signal_jammers'
    )

    expect(listing).toBeDefined()

    const result = sellMarketInventory(state, listing!.id, 1)

    expect(result.funding).toBe(state.funding + listing!.sellPrice)
    expect(result.inventory.signal_jammers).toBe(1)
    expect(result.fabricatedEquipmentLots?.batch).toMatchObject({
      quantity: 1,
      trackedInstanceUnits: 0,
    })
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

  it('keeps restricted procurement blocked before SPE-1046 gear permission can matter when clearance is missing', () => {
    const state = {
      ...createStartingState(),
      entityWelfareReclassificationRecords: {},
    }
    const restrictedListing = getProcurementListings(state).find(
      (candidate) => candidate.itemId === 'advanced_recon_suite'
    )

    expect(restrictedListing).toBeDefined()
    expect(restrictedListing!.acquisitionClass).toBe('restricted')
    expect(restrictedListing!.accessAvailable).toBe(false)
    expect(restrictedListing!.accessBlockedReason).toMatch(/requires clearance 2/i)
    expect(restrictedListing!.accessDetails).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/SPE-1046 gear permission has no restrictive record/i),
      ])
    )
  })

  it('allows a restricted acquisition class after clearance unlocks its channel', () => {
    const clearedState = createClearedMarketState()
    const restrictedListing = getProcurementListings(clearedState).find(
      (candidate) => candidate.itemId === 'advanced_recon_suite'
    )

    expect(restrictedListing).toBeDefined()
    expect(restrictedListing!.accessAvailable).toBe(true)
    expect(restrictedListing!.accessDetails).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/SPE-1046 gear permission has no restrictive record/i),
      ])
    )

    const result = purchaseMarketInventory(clearedState, restrictedListing!.id, 1)

    expect(result.funding).toBe(clearedState.funding - restrictedListing!.buyPrice)
    expect(result.inventory.advanced_recon_suite).toBe(
      (clearedState.inventory.advanced_recon_suite ?? 0) + restrictedListing!.bundleQuantity
    )
  })

  it.each([
    ['restricted', createGearPermissionRecord()],
    [
      'blocked',
      createGearPermissionRecord({
        proposedDisposition: 'medical',
        id: 'reclass:medical-gear-block',
        label: 'Medical gear block',
      }),
    ],
  ] as const)(
    'keeps restricted procurement unavailable when SPE-1046 gear permission is %s',
    (_outcome, record) => {
      const clearedState = {
        ...createClearedMarketState(),
        entityWelfareReclassificationRecords: {
          [record.id]: record,
        },
      }
      const restrictedListing = getProcurementListings(clearedState).find(
        (candidate) => candidate.itemId === 'advanced_recon_suite'
      )

      expect(restrictedListing).toBeDefined()
      expect(clearedState.funding).toBeGreaterThanOrEqual(restrictedListing!.buyPrice)
      expect(restrictedListing!.accessAvailable).toBe(false)
      expect(restrictedListing!.accessBlockedReason).toMatch(/SPE-1046 gear access blocked/i)
      expect(restrictedListing!.accessDetails).toEqual(
        expect.arrayContaining([expect.stringMatching(/gear permission/i)])
      )
      expect(purchaseMarketInventory(clearedState, restrictedListing!.id, 1)).toBe(clearedState)
    }
  )

  it('surfaces SPE-1046 gear blockers in procurement view details while keeping budget separate', () => {
    const record = createGearPermissionRecord({
      id: 'reclass:procurement-gear-restricted',
      label: 'Procurement gear restricted',
    })
    const clearedState = {
      ...createClearedMarketState(),
      funding: 9999,
      agency: {
        ...createClearedMarketState().agency!,
        clearanceLevel: 2,
        funding: 9999,
      },
      entityWelfareReclassificationRecords: {
        [record.id]: record,
      },
    }
    const screen = getProcurementScreenView(
      clearedState,
      { q: 'advanced recon', category: 'all', sort: 'recommended' },
      'gear:advanced_recon_suite'
    )

    expect(screen.selectedDetail).toBeDefined()
    expect(screen.selectedDetail!.blockerDetails).toEqual(
      expect.arrayContaining([expect.stringMatching(/SPE-1046 gear access blocked/i)])
    )
    expect(screen.selectedDetail!.acquisitionDetails).toEqual(
      expect.arrayContaining([expect.stringMatching(/Procurement gear restricted/i)])
    )
    expect(screen.selectedDetail!.budgetPreviews[0]).toMatchObject({
      affordable: false,
      fundingAfterLabel: '$9999',
      blockedReason: expect.stringMatching(/SPE-1046 gear access blocked/i),
    })

    const standardListing = getMarketListings({
      ...clearedState,
      funding: 0,
      agency: {
        ...clearedState.agency!,
        funding: 0,
      },
      entityWelfareReclassificationRecords: {},
    }).find((candidate) => candidate.id === 'med-kits')

    expect(standardListing).toBeDefined()
    expect(standardListing!.accessAvailable).toBe(true)
    expect(standardListing!.budgetBlockedReason).toMatch(/Need \+\$/i)
    expect(standardListing!.buyBlockedReason).toBe(standardListing!.budgetBlockedReason)
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
    const emfSensors = getProcurementListings(state).find(
      (candidate) => candidate.itemId === 'emf_sensors'
    )

    expect(emfSensors).toBeDefined()

    const afterEmfSensors = purchaseMarketInventory(state, emfSensors!.id, 1)
    const wardSealBatch = getProcurementListings(afterEmfSensors).find(
      (candidate) => candidate.id === 'ward-seals'
    )

    expect(wardSealBatch).toBeDefined()
    expect(wardSealBatch!.allocationStatus.state).toBe('committed_elsewhere')
    expect(wardSealBatch!.allocationStatus.purchaseAvailable).toBe(false)
    expect(wardSealBatch!.allocationStatus.displacedAlternativeUse).toBe(emfSensors!.itemName)

    const blocked = purchaseMarketInventory(afterEmfSensors, wardSealBatch!.id, 1)

    expect(blocked).toBe(afterEmfSensors)
  })

  it('uses a degraded substitute when agency supplier attention is displaced', () => {
    const state = createStartingState()
    const emfSensors = getProcurementListings(state).find(
      (candidate) => candidate.itemId === 'emf_sensors'
    )

    expect(emfSensors).toBeDefined()

    const afterEmfSensors = purchaseMarketInventory(state, emfSensors!.id, 1)
    const substitutedHazmat = getProcurementListings(afterEmfSensors).find(
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

    const afterSubstitution = purchaseMarketInventory(afterEmfSensors, substitutedHazmat!.id, 1)
    const substitutionEvent = afterSubstitution.events.at(-1)

    expect(afterSubstitution.inventory.hazmat_suit).toBe(
      (afterEmfSensors.inventory.hazmat_suit ?? 0) + substitutedHazmat!.bundleQuantity
    )
    expect(substitutionEvent).toMatchObject({
      type: 'market.transaction_recorded',
      payload: {
        listingId: substitutedHazmat!.id,
        totalPrice: substitutedHazmat!.buyPrice,
        allocation: {
          source: 'gray_market_broker',
          displacedAlternativeUse: emfSensors!.itemName,
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
        week: 5,
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
        week: 5,
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

describe('delayed supplier fulfillment (SPE-2319)', () => {
  const listingId = 'gear:field_plate'

  it('places pending backlog entry, deducts funding, and does not grant inventory immediately', () => {
    const state = createStartingState()
    const listing = getProcurementListings(state).find((candidate) => candidate.id === listingId)

    expect(listing).toBeDefined()
    expect(listing!.delayedFulfillmentWeeks).toBe(
      FUNDING_CALIBRATION.procurementDelayedFulfillmentWeeks
    )

    const ordered = placeDelayedMarketOrder(state, listingId, 1)
    const fundingState = getCanonicalFundingState(ordered)

    expect(ordered.funding).toBe(state.funding - listing!.buyPrice)
    expect(ordered.inventory.field_plate ?? 0).toBe(state.inventory.field_plate ?? 0)
    expect(fundingState.procurementBacklog).toHaveLength(1)
    expect(fundingState.procurementBacklog[0]).toMatchObject({
      status: 'pending',
      itemId: 'field_plate',
      listingId,
      quantity: listing!.bundleQuantity,
      requestedWeek: state.week,
      delayWeeks: FUNDING_CALIBRATION.procurementDelayedFulfillmentWeeks,
    })
    expect(ordered.events.at(-1)).toMatchObject({
      type: 'market.transaction_recorded',
      payload: {
        action: 'order',
        listingId,
        totalPrice: listing!.buyPrice,
      },
    })
  })

  it('blocks instant purchase for delayed listings', () => {
    const state = createStartingState()
    const blocked = purchaseMarketInventory(state, listingId, 1)

    expect(blocked).toBe(state)
    expect(blocked.inventory.field_plate ?? 0).toBe(state.inventory.field_plate ?? 0)
  })

  it('fulfills pending backlog directly when closed week reaches ETA', () => {
    const state = createStartingState()
    const ordered = placeDelayedMarketOrder(state, listingId, 1)

    const fulfilled = fulfillPendingProcurementBacklogAtWeekClose(ordered, 2)

    expect(getCanonicalFundingState(fulfilled).procurementBacklog[0]?.status).toBe('fulfilled')
    expect(fulfilled.inventory.field_plate).toBe(1)
  })

  it('fulfills backlog inventory after procurement delay on week-close without double-spend', () => {
    const state = createStartingState()
    const listing = getProcurementListings(state).find((candidate) => candidate.id === listingId)!

    const ordered = placeDelayedMarketOrder(state, listingId, 1)
    const fundingAfterOrder = ordered.funding

    const afterFirstClose = advanceWeek(ordered)
    expect(afterFirstClose.inventory.field_plate ?? 0).toBe(0)
    expect(getCanonicalFundingState(afterFirstClose).procurementBacklog[0]?.status).toBe('pending')

    const afterSecondClose = advanceWeek(afterFirstClose)
    const fulfilledEntry = getCanonicalFundingState(afterSecondClose).procurementBacklog.find(
      (entry) => entry.itemId === 'field_plate'
    )

    expect(fulfilledEntry?.status).toBe('fulfilled')
    expect(afterSecondClose.inventory.field_plate).toBe(
      (state.inventory.field_plate ?? 0) + listing.bundleQuantity
    )
    expect(ordered.funding).toBe(fundingAfterOrder)
    const orderExpenseEntries = getCanonicalFundingState(afterSecondClose).fundingHistory.filter(
      (entry) => entry.reason === 'market_transaction' && entry.delta < 0
    )
    expect(orderExpenseEntries).toHaveLength(1)
    expect(orderExpenseEntries[0]?.delta).toBe(-listing.buyPrice)
    expect(
      afterSecondClose.events.some(
        (event) =>
          event.type === 'market.transaction_recorded' && event.payload.action === 'fulfill'
      )
    ).toBe(true)
  })
})

describe('market view delayed procurement (SPE-2319)', () => {
  it('shows order CTA and backlog ETA for delayed field plate listing', () => {
    const state = createStartingState()
    const listing = getMarketListings(state).find(
      (candidate) => candidate.id === 'gear:field_plate'
    )

    expect(listing).toBeDefined()
    expect(listing!.canBuyOne).toBe(false)
    expect(listing!.canOrderOne).toBe(true)
    expect(listing!.canAffordOne).toBe(true)
    expect(listing!.buyBlockedReason).toMatch(/instant exchange unavailable/i)

    const ordered = placeDelayedMarketOrder(state, 'gear:field_plate', 1)
    const screen = getProcurementScreenView(ordered, {
      q: '',
      category: 'all',
      sort: 'recommended',
    })

    expect(screen.backlogRows).toHaveLength(1)
    expect(screen.backlogRows[0]?.detail).toMatch(/ETA week/)
    expect(screen.backlogRows[0]?.statusLabel).toBe('Pending delivery')
  })
})

describe('faction favor exchange (SPE-28)', () => {
  const listingId = 'gear:containment_staff'

  it('blocks cash purchase for rare containment staff even with surplus funding', () => {
    const state = {
      ...createStartingState(),
      funding: 9999,
      agency: {
        ...createStartingState().agency!,
        funding: 9999,
      },
    }
    const listing = getProcurementListings(state).find((candidate) => candidate.id === listingId)

    expect(listing).toBeDefined()
    expect(listing!.cashPurchaseAllowed).toBe(false)
    expect(listing!.acquisitionClass).toBe('rare')
    expect(listing!.accessChannel).toBe('faction_favor_exchange')
    expect(state.funding).toBeGreaterThanOrEqual(listing!.buyPrice)

    const cashAttempt = purchaseMarketInventory(state, listingId, 1)

    expect(cashAttempt.funding).toBe(state.funding)
    expect(cashAttempt.inventory.containment_staff ?? 0).toBe(
      state.inventory.containment_staff ?? 0
    )
  })

  it('redeems open corporate_supply salvage favor without spending funding', () => {
    const state = createStartingState()
    const listing = getProcurementListings(state).find((candidate) => candidate.id === listingId)

    expect(listing).toBeDefined()
    expect(assessFactionFavorExchangeProcurement(state, listingId).eligible).toBe(true)

    const redeemed = redeemFactionFavorProcurement(state, listingId, 1)

    expect(redeemed.funding).toBe(state.funding)
    expect(redeemed.inventory.containment_staff).toBe(
      (state.inventory.containment_staff ?? 0) + listing!.bundleQuantity
    )
    expect(redeemed.factions?.corporate_supply?.availableFavors ?? []).toHaveLength(0)

    const event = redeemed.events.find((entry) => entry.type === 'market.transaction_recorded')
    expect(event?.payload.action).toBe('favor_exchange')
    expect(event?.payload.totalPrice).toBe(0)
    expect(event?.payload.favorExchangeFavorId).toBe('corporate-supply-salvage-credit')
  })

  it('keeps access-blocker separate from budget-blocker on standard listings', () => {
    const state = createStartingState()
    const standardListing = getProcurementListings(state).find(
      (candidate) => candidate.id === 'med-kits'
    )

    expect(standardListing).toBeDefined()
    expect(standardListing!.cashPurchaseAllowed).toBe(true)
    expect(standardListing!.accessAvailable).toBe(true)
    expect(state.funding).toBeGreaterThanOrEqual(standardListing!.buyPrice)
  })
})

describe('persisted market hydration (SPE-446–448)', () => {
  it('falls back unknown featuredRecipeId and clamps attestation week', () => {
    const fallback = createStartingState().market

    const sanitized = sanitizePersistedMarketState(
      {
        ...fallback,
        featuredRecipeId: 'phantom-recipe',
        licensedHandlingAttestationWeek: 0,
        listings: [{ id: 'legacy' }],
      },
      fallback,
      4
    )

    expect(sanitizeFeaturedRecipeId('phantom-recipe', fallback.featuredRecipeId)).toBe(
      fallback.featuredRecipeId
    )
    expect(sanitized.featuredRecipeId).toBe(fallback.featuredRecipeId)
    expect(sanitized.licensedHandlingAttestationWeek).toBe(1)
    expect(sanitized.week).toBe(4)
    expect(sanitized).not.toHaveProperty('listings')
  })
})
