import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  assessCallableObligationProcurement,
  getProcurementListings,
} from '../domain/market'
import {
  callCallableObligationProcurement,
  purchaseMarketInventory,
} from '../domain/sim/market'
import { FUNDING_CALIBRATION } from '../domain/sim/calibration'

const TARGET_LISTING_ID = FUNDING_CALIBRATION.procurementCallableObligation.listingId
const FAVOR_EXCHANGE_LISTING_ID = 'gear:containment_staff'

function getTargetListing(game: ReturnType<typeof createStartingState>) {
  return getProcurementListings(game).find((entry) => entry.id === TARGET_LISTING_ID)
}

function withBudgetBlocked(game: ReturnType<typeof createStartingState>) {
  const listing = getTargetListing(game)
  expect(listing).toBeDefined()

  return {
    ...game,
    funding: Math.max(0, listing!.buyPrice - 1),
    agency: {
      ...game.agency!,
      funding: Math.max(0, listing!.buyPrice - 1),
    },
  }
}

describe('callable obligation procurement (SPE-2323)', () => {
  it('surfaces open institutions boon on occult reagents at read time', () => {
    const game = createStartingState()
    const listing = getTargetListing(game)

    expect(listing).toBeDefined()
    expect(listing!.cashPurchaseAllowed).toBe(true)
    expect(listing!.favorExchange).toBeUndefined()
    expect(assessCallableObligationProcurement(game, TARGET_LISTING_ID).eligible).toBe(true)
    expect(listing!.callableObligationDetail?.active).toBe(true)
    expect(listing!.callableObligationDetail?.favorId).toBe('institutions-lab-access-boon')
  })

  it('blocks cash purchase when funding is insufficient', () => {
    const game = withBudgetBlocked(createStartingState())
    const listing = getTargetListing(game)!

    expect(game.funding).toBeLessThan(listing.buyPrice)

    const result = purchaseMarketInventory(game, listing.id, 1)
    expect(result.funding).toBe(game.funding)
    expect(result.inventory.occult_reagents ?? 0).toBe(game.inventory.occult_reagents ?? 0)
  })

  it('calls open obligation without spending funding when budget-blocked', () => {
    const game = withBudgetBlocked(createStartingState())
    const listing = getTargetListing(game)!

    expect(assessCallableObligationProcurement(game, TARGET_LISTING_ID).eligible).toBe(true)

    const called = callCallableObligationProcurement(game, listing.id, 1)

    expect(called.funding).toBe(game.funding)
    expect(called.inventory.occult_reagents).toBe(
      (game.inventory.occult_reagents ?? 0) + listing.bundleQuantity
    )
    expect(called.factions?.institutions?.availableFavors ?? []).toHaveLength(0)

    const event = called.events.find((entry) => entry.type === 'market.transaction_recorded')
    expect(event?.payload.action).toBe('callable_obligation')
    expect(event?.payload.totalPrice).toBe(0)
    expect(event?.payload.callableObligationFavorId).toBe('institutions-lab-access-boon')
  })

  it('rejects obligation call when funding is sufficient', () => {
    const game = createStartingState()
    const listing = getTargetListing(game)!

    expect(game.funding).toBeGreaterThanOrEqual(listing.buyPrice)

    const called = callCallableObligationProcurement(game, listing.id, 1)
    expect(called.funding).toBe(game.funding)
    expect(called.inventory.occult_reagents ?? 0).toBe(game.inventory.occult_reagents ?? 0)
  })

  it('leaves non-target listings unchanged', () => {
    const game = withBudgetBlocked(createStartingState())
    const otherMaterial = getProcurementListings(game).find(
      (entry) => entry.source === 'material' && entry.id !== TARGET_LISTING_ID
    )

    expect(otherMaterial).toBeDefined()
    expect(otherMaterial!.callableObligationDetail).toBeUndefined()
    expect(assessCallableObligationProcurement(game, otherMaterial!.id).reasonCode).toBe(
      'not-callable-obligation-listing'
    )
  })

  it('stays orthogonal to favor-exchange listing path', () => {
    const game = createStartingState()
    const favorListing = getProcurementListings(game).find(
      (entry) => entry.id === FAVOR_EXCHANGE_LISTING_ID
    )

    expect(favorListing).toBeDefined()
    expect(favorListing!.callableObligation).toBeUndefined()
    expect(favorListing!.favorExchange).toBeDefined()
  })

  it('derives listings deterministically for the same state', () => {
    const game = withBudgetBlocked(createStartingState())

    expect(getProcurementListings(game)).toEqual(getProcurementListings(game))
  })
})
