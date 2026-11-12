import type { GameState } from './models'
import { applyFundingExpense, getCanonicalFundingState, recomputeBudgetPressure } from './funding'
import { parseFacilityMaintenanceRecoveryResources } from './facilityMaintenanceRecovery'

export const FACILITY_MAINTENANCE_PACKAGE = Object.freeze({
  price: 100,
  maintenanceHours: 10,
  partsReserve: 6,
})

export interface FacilityMaintenancePurchaseResult {
  readonly status: 'purchased' | 'insufficient_funding' | 'invalid'
  readonly game: GameState
  readonly availableFunding?: number
}

/** One explicit paid allocation; never repairs debt or converts other resource owners. */
export function purchaseFacilityMaintenancePackage(
  game: GameState
): FacilityMaintenancePurchaseResult {
  // Validate before the canonical reader can sanitize malformed balances.
  if (
    !Number.isSafeInteger(game.funding) ||
    game.funding < 0 ||
    !Number.isSafeInteger(game.week) ||
    game.week < 0
  )
    return Object.freeze({ status: 'invalid', game })

  const funding = getCanonicalFundingState(game)
  const prior =
    game.facilityMaintenanceRecoveryResources === undefined
      ? { maintenanceHours: 0, partsReserve: 0 }
      : parseFacilityMaintenanceRecoveryResources(game.facilityMaintenanceRecoveryResources)
  if (!prior) return Object.freeze({ status: 'invalid', game, availableFunding: funding.funding })

  const resources = parseFacilityMaintenanceRecoveryResources({
    maintenanceHours: prior.maintenanceHours + FACILITY_MAINTENANCE_PACKAGE.maintenanceHours,
    partsReserve: prior.partsReserve + FACILITY_MAINTENANCE_PACKAGE.partsReserve,
  })
  if (!resources)
    return Object.freeze({ status: 'invalid', game, availableFunding: funding.funding })
  if (funding.funding < FACILITY_MAINTENANCE_PACKAGE.price)
    return Object.freeze({
      status: 'insufficient_funding',
      game,
      availableFunding: funding.funding,
    })

  const fundingState = recomputeBudgetPressure(
    applyFundingExpense(
      funding,
      FACILITY_MAINTENANCE_PACKAGE.price,
      'facility_maintenance_package',
      game.week,
      'facility-maintenance-package'
    ),
    game.week
  )
  return Object.freeze({
    status: 'purchased',
    availableFunding: funding.funding,
    game: {
      ...game,
      funding: fundingState.funding,
      agency: {
        ...(game.agency ?? {
          containmentRating: 0,
          clearanceLevel: 1,
          supportAvailable: 0,
        }),
        funding: fundingState.funding,
        fundingState,
      },
      facilityMaintenanceRecoveryResources: resources,
    },
  })
}
