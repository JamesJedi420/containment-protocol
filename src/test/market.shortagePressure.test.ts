import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { createInitialFundingState, normalizeFundingState } from '../domain/funding'
import {
  assessProcurementShortagePressure,
  getProcurementListings,
} from '../domain/market'
import { purchaseMarketInventory } from '../domain/sim/market'
import { FUNDING_CALIBRATION } from '../domain/sim/calibration'

const TARGET_LISTING_ID = FUNDING_CALIBRATION.procurementShortagePressure.listingId

function getTargetListing(game: ReturnType<typeof createStartingState>) {
  return getProcurementListings(game).find((entry) => entry.id === TARGET_LISTING_ID)
}

function withHighAgencyStock(game: ReturnType<typeof createStartingState>) {
  return {
    ...game,
    inventory: {
      ...game.inventory,
      medkits: 25,
    },
  }
}

function withFundingStrain(game: ReturnType<typeof createStartingState>) {
  const pendingBacklog = Array.from({ length: 8 }, (_, index) => ({
    requestId: `shortage-test-${index}`,
    status: 'pending' as const,
    requestedWeek: game.week,
    itemId: 'medkits',
    quantity: 1,
    cost: 10,
  }))
  const fundingState = normalizeFundingState(
    -1,
    game.config,
    {
      ...createInitialFundingState(
        game.config.fundingBasePerWeek,
        game.config.fundingPerResolution,
        game.config.fundingPenaltyPerFail,
        game.config.fundingPenaltyPerUnresolved,
        -1
      ),
      procurementBacklog: pendingBacklog,
    },
    game.week
  )

  return {
    ...game,
    funding: -1,
    agency: {
      ...game.agency!,
      funding: -1,
      fundingState,
    },
  }
}

describe('procurement shortage pressure (SPE-2321)', () => {
  it('leaves starting-state listings unchanged when shortage signals are inactive', () => {
    const game = createStartingState()
    const listing = getTargetListing(game)

    expect(listing).toBeDefined()
    expect(assessProcurementShortagePressure(game).active).toBe(false)
    expect(listing!.shortagePressureDetail).toBeUndefined()
    expect(listing!.availableBundles).toBeGreaterThan(0)
  })

  it('reduces medical supplies bundles on high agency stock without changing price', () => {
    const baseline = createStartingState()
    const pressured = withHighAgencyStock(baseline)
    const baselineListing = getTargetListing(baseline)!
    const pressuredListing = getTargetListing(pressured)!

    expect(assessProcurementShortagePressure(pressured).reasons).toContain('high-agency-stock')
    expect(pressuredListing.availableBundles).toBeLessThan(baselineListing.availableBundles)
    expect(pressuredListing.buyPrice).toBe(baselineListing.buyPrice)
  })

  it('blocks purchase when funding is sufficient but vendor bundles are exhausted', () => {
    const game = withHighAgencyStock(createStartingState())
    const listing = getTargetListing(game)!

    expect(game.funding).toBeGreaterThanOrEqual(listing.buyPrice)
    expect(listing.availableBundles).toBe(0)

    const result = purchaseMarketInventory(game, listing.id, 1)
    expect(result).toBe(game)
  })

  it('tightens only the calibrated listing when funding is strained', () => {
    const game = withFundingStrain(createStartingState())
    const target = getTargetListing(game)!
    const otherMaterial = getProcurementListings(game).find(
      (entry) => entry.source === 'material' && entry.id !== TARGET_LISTING_ID
    )

    expect(assessProcurementShortagePressure(game).reasons).toContain('funding-strain')
    expect(target.availableBundles).toBe(0)
    expect(otherMaterial).toBeDefined()
    expect(otherMaterial!.availableBundles).toBeGreaterThan(0)
  })

  it('stacks with neutral market pressure while still zeroing target bundles', () => {
    const game = {
      ...withHighAgencyStock(createStartingState()),
      market: {
        ...createStartingState().market,
        pressure: 'stable' as const,
      },
    }
    const listing = getTargetListing(game)!

    expect(listing!.availableBundles).toBe(0)
  })

  it('derives listings deterministically for the same state', () => {
    const game = withHighAgencyStock(createStartingState())

    expect(getProcurementListings(game)).toEqual(getProcurementListings(game))
  })
})
