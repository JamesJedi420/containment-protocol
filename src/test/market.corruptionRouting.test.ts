import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  assessProcurementCorruptionRouting,
  getProcurementListings,
} from '../domain/market'
import { purchaseMarketInventory } from '../domain/sim/market'
import { FUNDING_CALIBRATION } from '../domain/sim/calibration'

const TARGET_LISTING_ID = FUNDING_CALIBRATION.procurementCorruptionRouting.listingId
const SHORTAGE_LISTING_ID = FUNDING_CALIBRATION.procurementShortagePressure.listingId

function getTargetListing(game: ReturnType<typeof createStartingState>) {
  return getProcurementListings(game).find((entry) => entry.id === TARGET_LISTING_ID)
}

function withOfficeMediatedDiversion(game: ReturnType<typeof createStartingState>) {
  return {
    ...game,
    compromisedAuthority: {
      officialRole: 'magistrate' as const,
      benefittingFactionId: 'corporate_supply',
      distortedCategories: ['evidence' as const],
      corruptionDepth: 'embedded_control' as const,
      patrolAnomalyCount: 0,
    },
  }
}

describe('procurement corruption routing (SPE-2322)', () => {
  it('leaves starting-state listings unchanged when diversion signals are inactive', () => {
    const game = createStartingState()
    const listing = getTargetListing(game)

    expect(listing).toBeDefined()
    expect(assessProcurementCorruptionRouting(game).active).toBe(false)
    expect(listing!.corruptionRoutingDetail).toBeUndefined()
    expect(listing!.availableBundles).toBeGreaterThan(0)
  })

  it('reduces electronic parts bundles under office-mediated diversion without changing price', () => {
    const baseline = createStartingState()
    const diverted = withOfficeMediatedDiversion(baseline)
    const baselineListing = getTargetListing(baseline)!
    const divertedListing = getTargetListing(diverted)!

    expect(assessProcurementCorruptionRouting(diverted).reasons).toContain(
      'office-mediated-diversion'
    )
    expect(divertedListing.availableBundles).toBeLessThan(baselineListing.availableBundles)
    expect(divertedListing.buyPrice).toBe(baselineListing.buyPrice)
  })

  it('blocks purchase when funding is sufficient but roster bundles are diverted', () => {
    const game = withOfficeMediatedDiversion(createStartingState())
    const listing = getTargetListing(game)!

    expect(game.funding).toBeGreaterThanOrEqual(listing.buyPrice)
    expect(listing.availableBundles).toBe(0)

    const result = purchaseMarketInventory(game, listing.id, 1)
    expect(result).toBe(game)
  })

  it('tightens only the calibrated listing when diversion is active', () => {
    const game = withOfficeMediatedDiversion(createStartingState())
    const target = getTargetListing(game)!
    const otherMaterial = getProcurementListings(game).find(
      (entry) => entry.source === 'material' && entry.id !== TARGET_LISTING_ID
    )

    expect(target.availableBundles).toBe(0)
    expect(otherMaterial).toBeDefined()
    expect(otherMaterial!.availableBundles).toBeGreaterThan(0)
  })

  it('stays orthogonal to vendor shortage pressure on a different listing', () => {
    const game = {
      ...withOfficeMediatedDiversion(createStartingState()),
      inventory: {
        ...createStartingState().inventory,
        medkits: 25,
      },
    }
    const corruptionTarget = getTargetListing(game)!
    const shortageTarget = getProcurementListings(game).find(
      (entry) => entry.id === SHORTAGE_LISTING_ID
    )!

    expect(corruptionTarget.corruptionRoutingDetail?.active).toBe(true)
    expect(corruptionTarget.shortagePressureDetail).toBeUndefined()
    expect(shortageTarget?.shortagePressureDetail?.active).toBe(true)
    expect(shortageTarget?.corruptionRoutingDetail).toBeUndefined()
  })

  it('ignores compromised authority without evidence distortion', () => {
    const game = {
      ...createStartingState(),
      compromisedAuthority: {
        officialRole: 'magistrate' as const,
        benefittingFactionId: 'corporate_supply',
        distortedCategories: ['patrol' as const],
        corruptionDepth: 'shallow_cover' as const,
        patrolAnomalyCount: 0,
      },
    }

    expect(assessProcurementCorruptionRouting(game).active).toBe(false)
    expect(getTargetListing(game)!.corruptionRoutingDetail).toBeUndefined()
  })

  it('derives listings deterministically for the same state', () => {
    const game = withOfficeMediatedDiversion(createStartingState())

    expect(getProcurementListings(game)).toEqual(getProcurementListings(game))
  })
})
