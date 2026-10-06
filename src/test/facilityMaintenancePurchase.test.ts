import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { purchaseFacilityMaintenancePackage } from '../domain/facilityMaintenancePurchase'
import { applyFacilityMaintenanceRecovery } from '../domain/facilityMaintenanceRecovery'
import { getCanonicalFundingState, recomputeBudgetPressure } from '../domain/funding'
import { parseRunExport, serializeRunExport } from '../app/store/runTransfer'
import { resolveFacilityMaintenanceWeekClose } from '../domain/facilityMaintenanceWeekClose'
import { FACILITY_ROOM_IDS, parseFacilityLayoutSnapshot } from '../domain/facilityLayoutStrategy'

function campaign(funding = 100) {
  return {
    ...createStartingState(),
    funding,
    week: 5,
    facilityMaintenanceState: { maintenanceDebt: 18, lastProcessedWeek: 5 },
    facilityMaintenanceRecoveryResources: { maintenanceHours: 0, partsReserve: 0 },
  }
}

describe('paid facility maintenance package', () => {
  it('atomically purchases with exact funding, preserving unrelated state and input', () => {
    const game = campaign()
    const before = structuredClone(game)
    Object.freeze(game.facilityMaintenanceRecoveryResources)
    Object.freeze(game.agency)
    Object.freeze(game)
    const result = purchaseFacilityMaintenancePackage(game)
    expect(result.status).toBe('purchased')
    const fundingState = recomputeBudgetPressure(
      {
        ...getCanonicalFundingState(game),
        funding: 0,
        fundingHistory: [
          ...getCanonicalFundingState(game).fundingHistory,
          {
            week: 5,
            delta: -100,
            reason: 'facility_maintenance_package',
            sourceId: 'facility-maintenance-package',
          },
        ],
      },
      5
    )
    expect(result.game).toEqual({
      ...before,
      funding: 0,
      agency: { ...before.agency, funding: 0, fundingState },
      facilityMaintenanceRecoveryResources: { maintenanceHours: 10, partsReserve: 6 },
    })
    expect(result.game.facilityMaintenanceState).toBe(game.facilityMaintenanceState)
    expect(result.game.inventory).toBe(game.inventory)
    expect(result.game.reports).toBe(game.reports)
    expect(game).toEqual(before)
    expect(purchaseFacilityMaintenancePackage(game)).toEqual(result)
    expect(Object.isFrozen(result.game.facilityMaintenanceRecoveryResources)).toBe(true)
  })

  it.each([0, 99])('blocks insufficient funding %i with identity and no allocation', (funding) => {
    const game = campaign(funding)
    delete (game as Partial<typeof game>).facilityMaintenanceRecoveryResources
    expect(purchaseFacilityMaintenancePackage(game)).toEqual({
      status: 'insufficient_funding',
      game,
      availableFunding: funding,
    })
    expect(purchaseFacilityMaintenancePackage(game).game).toBe(game)
    expect(game.facilityMaintenanceRecoveryResources).toBeUndefined()
  })

  it.each([NaN, Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid funding %s before normalization',
    (funding) => {
      const game = campaign(funding)
      expect(purchaseFacilityMaintenancePackage(game)).toEqual({ status: 'invalid', game })
      expect(purchaseFacilityMaintenancePackage(game).game).toBe(game)
    }
  )

  it.each([
    null,
    {},
    { maintenanceHours: -1, partsReserve: 0 },
    { maintenanceHours: 0, partsReserve: NaN },
    { maintenanceHours: Number.MAX_SAFE_INTEGER, partsReserve: 0 },
    { maintenanceHours: 0, partsReserve: Number.MAX_SAFE_INTEGER },
  ])('blocks malformed or overflowing resources %j', (resources) => {
    const game = Object.assign(campaign(), { facilityMaintenanceRecoveryResources: resources })
    const result = purchaseFacilityMaintenancePackage(game)
    expect(result.status).toBe('invalid')
    expect(result.game).toBe(game)
  })

  it('establishes absent legacy budgets only after payment', () => {
    const game = campaign()
    delete (game as Partial<typeof game>).facilityMaintenanceRecoveryResources
    const result = purchaseFacilityMaintenancePackage(game)
    expect(result.status).toBe('purchased')
    expect(result.game.facilityMaintenanceRecoveryResources).toEqual({
      maintenanceHours: 10,
      partsReserve: 6,
    })
    expect(game.facilityMaintenanceRecoveryResources).toBeUndefined()
  })

  it('uses canonical funding rather than stale mirrors and appends one expense per purchase', () => {
    const game = campaign(300)
    game.agency!.funding = 0
    game.agency!.fundingState = { ...getCanonicalFundingState(game), funding: 0 }
    const priorHistory = game.agency!.fundingState.fundingHistory
    const first = purchaseFacilityMaintenancePackage(game).game
    const second = purchaseFacilityMaintenancePackage(first).game
    expect(first.funding).toBe(200)
    expect(second.funding).toBe(100)
    expect(second.agency!.funding).toBe(100)
    expect(second.agency!.fundingState!.funding).toBe(100)
    expect(second.facilityMaintenanceRecoveryResources).toEqual({
      maintenanceHours: 20,
      partsReserve: 12,
    })
    expect(second.agency!.fundingState!.fundingHistory).toEqual([
      ...priorHistory,
      ...Array.from({ length: 2 }, () => ({
        week: 5,
        delta: -100,
        reason: 'facility_maintenance_package',
        sourceId: 'facility-maintenance-package',
      })),
    ])
    const third = purchaseFacilityMaintenancePackage(second).game
    expect(third.agency!.fundingState!.fundingHistory).toHaveLength(priorHistory.length + 3)
    expect(third.funding).toBe(0)
  })

  it('preserves repeat purchase history while keeping unrelated funding deduplication', () => {
    const game = campaign(300)
    const base = getCanonicalFundingState(game)
    const unrelated = { week: 5, delta: 8, reason: 'weekly_income', sourceId: 'weekly-income' }
    game.agency!.fundingState = { ...base, fundingHistory: [unrelated, unrelated] }
    const first = purchaseFacilityMaintenancePackage(game).game
    const second = purchaseFacilityMaintenancePackage(first).game
    const loaded = parseRunExport(serializeRunExport(second))
    expect(
      loaded.agency!.fundingState!.fundingHistory.filter(
        (entry) => entry.reason === 'weekly_income'
      )
    ).toHaveLength(1)
    expect(
      loaded.agency!.fundingState!.fundingHistory.filter(
        (entry) => entry.reason === 'facility_maintenance_package'
      )
    ).toHaveLength(2)
  })

  it('round-trips purchases, then recovers separately without altering replay ownership', () => {
    const game = campaign(200)
    const purchased = purchaseFacilityMaintenancePackage(
      purchaseFacilityMaintenancePackage(game).game
    ).game
    const loaded = parseRunExport(serializeRunExport(purchased))
    expect(loaded.funding).toBe(0)
    expect(loaded.agency!.fundingState!.fundingHistory).toEqual(
      purchased.agency!.fundingState!.fundingHistory
    )
    expect(loaded.facilityMaintenanceRecoveryResources).toEqual({
      maintenanceHours: 20,
      partsReserve: 12,
    })
    expect(loaded.facilityMaintenanceState).toEqual(game.facilityMaintenanceState)
    const result = applyFacilityMaintenanceRecovery(loaded)
    expect(result.status).toBe('recovered')
    expect(result.game.facilityMaintenanceRecoveryResources).toEqual({
      maintenanceHours: 10,
      partsReserve: 6,
    })
    expect(result.game.funding).toBe(0)
    const layout = parseFacilityLayoutSnapshot({
      archetype: 'compact_headquarters',
      rooms: FACILITY_ROOM_IDS.slice(0, 4).map((roomId) => ({ roomId, adjacentToCritical: true })),
    })
    expect(
      resolveFacilityMaintenanceWeekClose(layout, result.game.facilityMaintenanceState, 5)
        .accruedDebt
    ).toBe(0)
    expect(
      resolveFacilityMaintenanceWeekClose(layout, result.game.facilityMaintenanceState, 6)
        .accruedDebt
    ).toBe(8)
  })
})
