import type { GameState } from '../../domain/models'
import {
  applyFacilityMaintenanceRecovery,
  parseFacilityMaintenanceRecoveryResources,
} from '../../domain/facilityMaintenanceRecovery'
import { parseFacilityMaintenanceState } from '../../domain/facilityMaintenanceWeekClose'
import { projectInstitutionalCollapsePathways } from '../../domain/institutionalCollapsePathways'

/** Read the same recovery decision that the store revalidates when an order is issued. */
export function projectFacilityMaintenanceView(game: GameState) {
  const state = parseFacilityMaintenanceState(game.facilityMaintenanceState, game.week)
  const resources = parseFacilityMaintenanceRecoveryResources(
    game.facilityMaintenanceRecoveryResources
  )
  const { recovery } = applyFacilityMaintenanceRecovery(game)
  const pathway = state
    ? projectInstitutionalCollapsePathways({
        maintenanceDebt: state.maintenanceDebt,
      })?.activePathways.find((pathway) => pathway.pathwayId === 'maintenance_debt_overrun')
    : undefined
  const pressure = state ? (pathway?.band ?? 'none') : 'unavailable'
  const explanation =
    recovery.status === 'invalid'
      ? 'Recovery unavailable: maintenance state or recovery budget is missing or invalid.'
      : recovery.status === 'not_required'
        ? 'No facility recovery is required.'
        : recovery.status === 'insufficient_resources'
          ? 'Insufficient maintenance hours or parts for facility recovery.'
          : 'Order recovery to clear active maintenance debt using the displayed budget.'
  return {
    debt: state?.maintenanceDebt,
    pressure,
    resources,
    required:
      'required' in recovery
        ? recovery.required
        : pathway
          ? {
              maintenanceHours: pathway.recoveryRequirements.maintenanceHours,
              partsReserve: pathway.recoveryRequirements.partsReserve,
            }
          : undefined,
    canOrder: recovery.status === 'recovered',
    explanation,
  }
}
