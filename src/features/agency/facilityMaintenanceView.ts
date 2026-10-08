import type { GameState } from '../../domain/models'
import { queryStaffTimeAllocation } from '../../domain/staffTimeAllocation'
import {
  FACILITY_MAINTENANCE_CONVERSION,
  previewFacilityMaintenanceConversion,
} from '../../domain/facilityMaintenanceConversion'
import type { MaintenanceConversionReason } from '../../domain/facilityMaintenanceConversion'

export const MAINTENANCE_CONVERSION_EXPLANATIONS: Record<MaintenanceConversionReason, string> = {
  converted:
    'Maintenance resources prepared. Staff capacity is released; this person can convert again next week.',
  no_op: 'This conversion was already completed. No additional resources were granted.',
  invalid_request: 'Select a canonical staff member and refresh the conversion preview.',
  malformed_source: 'Conversion unavailable: staff allocations or weekly receipts are invalid.',
  stale_request: 'The conversion preview changed. Review the current requirements and try again.',
  insufficient_capacity:
    'This staff member has no eligible operational capacity. Assign a compatible operational post first.',
  conflict:
    'Staff capacity is reserved for another use. Release that reservation before converting.',
  weekly_exhausted:
    'This staff member has already converted this week. They remain available for other eligible work.',
  stock_unavailable:
    'A pressure-seal gasket is required. Funding, inventory and maintenance parts cannot substitute.',
  invalid_stock: 'Conversion unavailable: named facility stock is invalid.',
  invalid_resources: 'Conversion unavailable: the maintenance budget is invalid or would overflow.',
}
import {
  applyFacilityMaintenanceRecovery,
  parseFacilityMaintenanceRecoveryResources,
} from '../../domain/facilityMaintenanceRecovery'
import { parseFacilityMaintenanceState } from '../../domain/facilityMaintenanceWeekClose'
import { projectInstitutionalCollapsePathways } from '../../domain/institutionalCollapsePathways'
import {
  FACILITY_MAINTENANCE_PACKAGE,
  purchaseFacilityMaintenancePackage,
} from '../../domain/facilityMaintenancePurchase'

/** Read the same recovery decision that the store revalidates when an order is issued. */
export function projectFacilityMaintenanceView(game: GameState) {
  const allocation = queryStaffTimeAllocation(game)
  const conversion = {
    recipe: FACILITY_MAINTENANCE_CONVERSION,
    stockQuantity: previewFacilityMaintenanceConversion(game, '').stockQuantity,
    staff: Object.keys(allocation.capacity.byStaffId)
      .sort()
      .map((staffId) => {
        const preview = previewFacilityMaintenanceConversion(game, staffId)
        const staff = game.staff[staffId]
        return {
          staffId,
          name:
            staff !== null &&
            typeof staff === 'object' &&
            'name' in staff &&
            typeof staff.name === 'string'
              ? staff.name
              : staffId,
          ...preview,
          explanation: preview.canConvert
            ? 'Prepare maintenance resources, then immediately release staff capacity. This uses this person’s weekly conversion eligibility.'
            : MAINTENANCE_CONVERSION_EXPLANATIONS[preview.reason],
        }
      }),
  }
  const state = parseFacilityMaintenanceState(game.facilityMaintenanceState, game.week)
  const resources = parseFacilityMaintenanceRecoveryResources(
    game.facilityMaintenanceRecoveryResources
  )
  const { recovery } = applyFacilityMaintenanceRecovery(game)
  const purchase = purchaseFacilityMaintenancePackage(game)
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
    conversion,
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
    purchase: {
      package: FACILITY_MAINTENANCE_PACKAGE,
      availableFunding: purchase.availableFunding,
      canPurchase: purchase.status === 'purchased',
      explanation:
        purchase.status === 'invalid'
          ? 'Purchase unavailable: funding or maintenance budget is invalid, or the budget would overflow.'
          : purchase.status === 'insufficient_funding'
            ? 'Insufficient funding for a maintenance package.'
            : 'Buy one maintenance package. Recovery requires a separate order.',
    },
  }
}
