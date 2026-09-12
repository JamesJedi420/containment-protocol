import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { purchaseMarketInventory } from '../../domain/sim/market'
import { queueFabrication } from '../../domain/sim/production'
import {
  assessFundingPressure,
  createInitialFundingState,
  normalizeFundingState,
} from '../../domain/funding'
import { getProcurementListings } from '../../domain/market'
import {
  getCurrentWeekMarketTransactions,
  getFilteredMarketListings,
  getMarketListings,
  getProcurementScreenView,
  readMarketFilters,
  type MarketFilters,
} from './marketView'

describe('marketView', () => {
  function createDiscountedMarketState() {
    const game = createStartingState()

    return {
      ...game,
      market: {
        ...game.market,
        pressure: 'discounted' as const,
      },
    }
  }

  it('builds deterministic procurement listings with weekly availability and pricing', () => {
    const game = createStartingState()
    const listings = getMarketListings(game)

    expect(listings.length).toBeGreaterThan(0)
    expect(listings.some((listing) => listing.category === 'material')).toBe(true)
    expect(listings.some((listing) => listing.featured)).toBe(true)
    expect(listings.every((listing) => listing.buyPrice >= listing.sellPrice)).toBe(true)
    expect(listings.every((listing) => listing.availableBundles >= 0)).toBe(true)
  })

  it('does not expose fabricated-lot-reserved equipment as sellable stock', () => {
    const game = createStartingState()
    game.inventory.signal_jammers = 1
    game.fabricatedEquipmentLots = {
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

    const listing = getMarketListings(game).find(
      (candidate) => candidate.itemId === 'signal_jammers'
    )

    expect(listing).toBeDefined()
    expect(listing!.inventoryStock).toBe(1)
    expect(listing!.canSellOne).toBe(false)
    expect(listing!.sellBlockedReason).toMatch(/no matching stock/i)
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
    const listing = getMarketListings(game).find(
      (candidate) => candidate.accessAvailable && candidate.availableBundles > 0
    )

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

    const listing = getMarketListings(game).find(
      (candidate) => candidate.accessAvailable && candidate.buyPrice > 0
    )

    expect(listing).toBeDefined()
    expect(listing!.canBuyOne).toBe(false)
    expect(listing!.buyBlockedReason).toMatch(/need \+\$\d+/i)
  })

  it('surfaces access blockers when budget can cover a restricted listing', () => {
    const game = createStartingState()
    const listing = getMarketListings(game).find(
      (candidate) => candidate.itemId === 'advanced_recon_suite'
    )

    expect(listing).toBeDefined()
    expect(listing!.canAffordOne).toBe(true)
    expect(listing!.accessAvailable).toBe(false)
    expect(listing!.canBuyOne).toBe(false)
    expect(listing!.budgetBlockedReason).toBeUndefined()
    expect(listing!.buyBlockedReason).toMatch(/directorate special channel locked/i)
  })

  it('surfaces market packet boundary data on listings', () => {
    const game = createStartingState()
    const listing = getMarketListings(game).find((candidate) => candidate.itemId === 'combat_stims')

    expect(listing).toBeDefined()
    expect(listing!.marketPacket).toMatchObject({
      id: 'gray_market_broker',
      marketBoundary: 'settlement-gray-market',
      legalityAccessMode: 'covert',
      participantChannelType: 'broker',
      liquidityProfile: 'thin',
    })
    expect(listing!.marketPacket.knownDistortions).toContain('Thin covert inventory.')
  })

  it('surfaces supplier attention substitution after a competing use commits the slot', () => {
    const game = createStartingState()
    const emfSensors = getMarketListings(game).find(
      (candidate) => candidate.itemId === 'emf_sensors'
    )

    expect(emfSensors).toBeDefined()

    const afterFieldPlate = purchaseMarketInventory(game, emfSensors!.id, 1)
    const hazmatSuit = getMarketListings(afterFieldPlate).find(
      (candidate) => candidate.itemId === 'hazmat_suit'
    )
    const wardSeals = getMarketListings(afterFieldPlate).find(
      (candidate) => candidate.id === 'ward-seals'
    )

    expect(hazmatSuit).toBeDefined()
    expect(hazmatSuit!.allocationStatus.state).toBe('substituted')
    expect(hazmatSuit!.allocationStatus.substitution?.summary).toMatch(/gray-market broker/i)
    expect(hazmatSuit!.canBuyOne).toBe(true)
    expect(hazmatSuit!.canBuyThree).toBe(false)

    expect(wardSeals).toBeDefined()
    expect(wardSeals!.allocationStatus.state).toBe('committed_elsewhere')
    expect(wardSeals!.canBuyOne).toBe(false)
    expect(wardSeals!.buyBlockedReason).toMatch(/attention committed/i)
  })

  it('surfaces reagent stock blocking and substitution from fabrication commitments', () => {
    const game = createStartingState()
    const afterWardFabrication = queueFabrication(game, 'ward-seals')
    const ritualComponents = getMarketListings(afterWardFabrication).find(
      (candidate) => candidate.id === 'ritual-components'
    )
    const emfSensors = getMarketListings(afterWardFabrication).find(
      (candidate) => candidate.id === 'emf-sensors'
    )

    expect(ritualComponents).toBeDefined()
    expect(ritualComponents!.resourceStatuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceClass: 'reagent_stock',
          state: 'committed_elsewhere',
          displacedAlternativeUse: 'Ward Seal Batch',
        }),
      ])
    )
    expect(ritualComponents!.canBuyOne).toBe(false)
    expect(ritualComponents!.buyBlockedReason).toMatch(/Occult Reagents stock committed/i)

    expect(emfSensors).toBeDefined()
    expect(emfSensors!.resourceStatuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceClass: 'reagent_stock',
          state: 'substituted',
          displacedAlternativeUse: 'Ward Seal Batch',
        }),
      ])
    )
    expect(emfSensors!.canBuyOne).toBe(true)
    expect(emfSensors!.canBuyThree).toBe(false)
  })

  it('surfaces licensed handling blocking after a controlled purchase commits capacity', () => {
    const game = createDiscountedMarketState()
    const combatStims = getMarketListings(game).find(
      (candidate) => candidate.itemId === 'combat_stims'
    )

    expect(combatStims).toBeDefined()

    const afterCombatStims = purchaseMarketInventory(game, combatStims!.id, 1)
    const hazmatSuit = getMarketListings(afterCombatStims).find(
      (candidate) => candidate.itemId === 'hazmat_suit'
    )

    expect(hazmatSuit).toBeDefined()
    expect(hazmatSuit!.resourceStatuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceClass: 'licensed_handling_capacity',
          state: 'committed_elsewhere',
          displacedAlternativeUse: combatStims!.itemName,
        }),
      ])
    )
    expect(hazmatSuit!.canBuyOne).toBe(false)
    expect(hazmatSuit!.buyBlockedReason).toMatch(/Licensed handling desk capacity committed/i)
  })

  it('surfaces stale licensed handling doctrine attestation before capacity checks', () => {
    const base = createDiscountedMarketState()
    const game = {
      ...base,
      week: 6,
      market: {
        ...base.market,
        licensedHandlingAttestationWeek: 1,
      },
    }
    const combatStims = getMarketListings(game).find(
      (candidate) => candidate.itemId === 'combat_stims'
    )

    expect(combatStims).toBeDefined()
    expect(combatStims!.resourceStatuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceClass: 'licensed_handling_capacity',
          state: 'attestation_stale',
          purchaseAvailable: false,
        }),
      ])
    )
    expect(combatStims!.canBuyOne).toBe(false)
    expect(combatStims!.buyBlockedReason).toMatch(/doctrine attestation is stale/i)
  })

  it('surfaces vendor shortage pressure in procurement budget summary and listing blockers', () => {
    const game = {
      ...createStartingState(),
      inventory: {
        ...createStartingState().inventory,
        medkits: 25,
      },
    }
    const listing = getProcurementListings(game).find(
      (entry) => entry.id === 'material:medical_supplies'
    )

    expect(listing).toBeDefined()
    expect(assessFundingPressure(game).reasonCodes).toContain('vendor-shortage-pressure')

    const view = getProcurementScreenView(
      game,
      {
        q: '',
        category: 'all',
        sort: 'recommended',
      },
      listing!.id
    )

    expect(view.budgetSummary.details.join(' ')).toMatch(/Vendor shortage pressure/i)

    const listingView = getMarketListings(game).find((entry) => entry.id === listing!.id)
    expect(listingView?.canAffordOne).toBe(true)
    expect(listingView?.canBuyOne).toBe(false)
    expect(view.selectedDetail?.canBuyOne).toBe(false)
    expect(view.selectedDetail?.blockerDetails.join(' ')).toMatch(/Vendor shortage pressure/i)
  })

  it('surfaces compromised-authority procurement diversion in budget summary and listing blockers', () => {
    const game = {
      ...createStartingState(),
      compromisedAuthority: {
        officialRole: 'watchCommander' as const,
        benefittingFactionId: 'corporate_supply',
        distortedCategories: ['evidence' as const],
        corruptionDepth: 'embedded_control' as const,
        patrolAnomalyCount: 0,
      },
    }
    const listing = getProcurementListings(game).find(
      (entry) => entry.id === 'material:electronic_parts'
    )

    expect(listing).toBeDefined()
    expect(assessFundingPressure(game).reasonCodes).toContain(
      'compromised-authority-procurement-diversion'
    )

    const view = getProcurementScreenView(
      game,
      {
        q: '',
        category: 'all',
        sort: 'recommended',
      },
      listing!.id
    )

    expect(view.budgetSummary.details.join(' ')).toMatch(/Compromised authority is diverting/i)

    const listingView = getMarketListings(game).find((entry) => entry.id === listing!.id)
    expect(listingView?.canAffordOne).toBe(true)
    expect(listingView?.canBuyOne).toBe(false)
    expect(view.selectedDetail?.canBuyOne).toBe(false)
    expect(view.selectedDetail?.blockerDetails.join(' ')).toMatch(/Compromised authority diverted/i)
  })

  it('surfaces inventory holding cost in procurement budget summary when stock tightens headroom', () => {
    const game = createStartingState()
    const fundingState = normalizeFundingState(
      12,
      game.config,
      {
        ...createInitialFundingState(
          game.config.fundingBasePerWeek,
          game.config.fundingPerResolution,
          game.config.fundingPenaltyPerFail,
          game.config.fundingPenaltyPerUnresolved,
          12
        ),
        fundingHistory: [
          {
            week: game.week,
            delta: -30,
            reason: 'inventory_holding_cost',
            sourceId: 'weekly-inventory-holding-cost',
          },
        ],
      },
      game.week
    )
    const pressuredGame = {
      ...game,
      funding: 12,
      agency: {
        ...game.agency!,
        fundingState,
      },
    }

    expect(assessFundingPressure(pressuredGame).reasonCodes).toContain(
      'weekly-inventory-holding-cost'
    )

    const view = getProcurementScreenView(pressuredGame, {
      q: '',
      category: 'all',
      sort: 'recommended',
    })

    expect(view.budgetSummary.details.join(' ')).toMatch(/Inventory carrying costs/i)
  })

  it('surfaces callable obligation leverage in budget summary and listing blockers when funding is tight', () => {
    const baseline = createStartingState()
    const listing = getProcurementListings(baseline).find(
      (entry) => entry.id === 'material:occult_reagents'
    )

    expect(listing).toBeDefined()
    const game = {
      ...baseline,
      funding: Math.max(0, listing!.buyPrice - 1),
      agency: {
        ...baseline.agency!,
        funding: Math.max(0, listing!.buyPrice - 1),
      },
    }

    expect(assessFundingPressure(game).reasonCodes).toContain(
      'callable-obligation-procurement-leverage'
    )

    const view = getProcurementScreenView(
      game,
      {
        q: '',
        category: 'all',
        sort: 'recommended',
      },
      listing!.id
    )

    expect(view.budgetSummary.details.join(' ')).toMatch(/research lab boon/i)

    const listingView = getMarketListings(game).find((entry) => entry.id === listing!.id)
    expect(listingView?.canAffordOne).toBe(false)
    expect(listingView?.canBuyOne).toBe(false)
    expect(listingView?.canCallObligationOne).toBe(true)
    expect(listingView?.buyBlockedReason).toMatch(/call obligation instead of cash purchase/i)
    expect(view.selectedDetail?.acquisitionDetails.join(' ')).toMatch(/Callable obligation/i)
  })

  it('allows 3-bundle obligation call when one bundle is affordable but three are not', () => {
    const baseline = createStartingState()
    const listing = getProcurementListings(baseline).find(
      (entry) => entry.id === 'material:occult_reagents'
    )

    expect(listing).toBeDefined()
    const game = {
      ...baseline,
      funding: listing!.buyPrice * 2,
      agency: {
        ...baseline.agency!,
        funding: listing!.buyPrice * 2,
      },
    }

    const listingView = getMarketListings(game).find((entry) => entry.id === listing!.id)
    expect(listingView?.canAffordOne).toBe(true)
    expect(listingView?.canAffordThree).toBe(false)
    expect(listingView?.canCallObligationOne).toBe(false)
    expect(listingView?.canCallObligationThree).toBe(true)
  })

  it('normalizes invalid market query params to defaults', () => {
    const params = new URLSearchParams('q=%20%20%20&category=invalid&sort=broken')
    const filters = readMarketFilters(params)

    expect(filters.q).toBe('')
    expect(filters.category).toBe('all')
    expect(filters.sort).toBe('recommended')
  })
})
