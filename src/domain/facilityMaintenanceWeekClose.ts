import { parseFacilityLayoutSnapshot } from './facilityLayoutStrategy'
import { projectFacilityExpansionBurden } from './facilityExpansionBurden'
import { projectInstitutionalCollapsePathways } from './institutionalCollapsePathways'
import { DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY } from './departmentCapabilities'
import {
  resolveDepartmentWorkshopDependencyQuality,
  type DepartmentWorkshopDependencyAvailabilityByDepartment,
  type DepartmentWorkshopQualityConditions,
} from './departmentWorkshopQueue'

/** SPE-3119: accumulated facility debt, not a cache of collapse projections. */
export interface FacilityMaintenanceState {
  readonly maintenanceDebt: number
  readonly lastProcessedWeek: number
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

export function parseFacilityMaintenanceState(
  value: unknown,
  campaignWeek?: number
): FacilityMaintenanceState | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  if (
    !Object.hasOwn(record, 'maintenanceDebt') ||
    !Object.hasOwn(record, 'lastProcessedWeek') ||
    !isNonNegativeSafeInteger(record.maintenanceDebt) ||
    !isNonNegativeSafeInteger(record.lastProcessedWeek) ||
    (campaignWeek !== undefined &&
      (!isNonNegativeSafeInteger(campaignWeek) || record.lastProcessedWeek > campaignWeek))
  )
    return undefined
  return Object.freeze({
    maintenanceDebt: record.maintenanceDebt,
    lastProcessedWeek: record.lastProcessedWeek,
  })
}

/** One accrual per closed week; no catch-up, repair, or duplicate threshold authority. */
export function resolveFacilityMaintenanceWeekClose(
  layout: unknown,
  priorState: unknown,
  closingWeek: number
) {
  const prior = parseFacilityMaintenanceState(priorState)
  const snapshot = parseFacilityLayoutSnapshot(layout)
  const burden = snapshot
    ? projectFacilityExpansionBurden({ roomCount: snapshot.rooms.length })
    : undefined
  const canAdvance =
    isNonNegativeSafeInteger(closingWeek) &&
    (prior === undefined || closingWeek > prior.lastProcessedWeek)
  const requestedAccrual = canAdvance ? (burden?.maintenanceDebtAccrual ?? 0) : 0
  const debt = Math.min(Number.MAX_SAFE_INTEGER, (prior?.maintenanceDebt ?? 0) + requestedAccrual)
  const accruedDebt = debt - (prior?.maintenanceDebt ?? 0)
  const state =
    canAdvance && (prior !== undefined || accruedDebt > 0)
      ? Object.freeze({ maintenanceDebt: debt, lastProcessedWeek: closingWeek })
      : prior
  // Debt is always a finite nonnegative integer, so the projector accepts this input.
  const collapse = projectInstitutionalCollapsePathways({ maintenanceDebt: debt })!
  const dependencyAvailability = collapse.activePathways.some(
    (pathway) =>
      pathway.pathwayId === 'logistics_stall' && pathway.chainedFrom === 'maintenance_debt_overrun'
  )
    ? ('unavailable' as const)
    : collapse.activePathways.some((pathway) => pathway.pathwayId === 'maintenance_debt_overrun')
      ? ('degraded' as const)
      : undefined
  const dependencies: DepartmentWorkshopDependencyAvailabilityByDepartment | undefined =
    dependencyAvailability === undefined
      ? undefined
      : Object.freeze(
          Object.fromEntries(
            DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY.departments.map((department) => [
              department.id,
              dependencyAvailability,
            ])
          )
        )
  return Object.freeze({
    state,
    roomCount: burden?.roomCount,
    burden,
    accruedDebt,
    collapse,
    dependencyAvailability,
    dependencies,
  })
}

/** Compose dependency quality without replacing the specialist or live facility axes. */
export function composeFacilityMaintenanceWorkshopQuality(
  completedIds: readonly string[],
  dependencyAvailability: 'degraded' | 'unavailable' | undefined,
  specialistConditions: Readonly<Record<string, DepartmentWorkshopQualityConditions | undefined>>
): Readonly<Record<string, DepartmentWorkshopQualityConditions | undefined>> {
  if (dependencyAvailability !== 'degraded') return specialistConditions
  const { dependencyCondition } = resolveDepartmentWorkshopDependencyQuality(dependencyAvailability)
  return Object.freeze(
    Object.fromEntries(
      completedIds.map((id) => [
        id,
        Object.freeze({
          inputQuality: 'good' as const,
          specialistCondition: 'good' as const,
          roomContamination: 'good' as const,
          ...specialistConditions[id],
          dependencyCondition,
        }),
      ])
    )
  )
}
