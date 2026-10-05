import { parseFacilityMaintenanceState } from './facilityMaintenanceWeekClose'
import type { FacilityMaintenanceState } from './facilityMaintenanceWeekClose'
import { projectInstitutionalCollapsePathways } from './institutionalCollapsePathways'
import type { InstitutionalCollapseProjection } from './institutionalCollapsePathways'

/** Caller-owned abstract resources; not equipment capacity or named-part stock. */
export interface FacilityMaintenanceRecoveryResources {
  readonly maintenanceHours: number
  readonly partsReserve: number
}

interface ValidRecoveryResult {
  readonly state: FacilityMaintenanceState
  readonly resources: FacilityMaintenanceRecoveryResources
  readonly consumed: FacilityMaintenanceRecoveryResources
  readonly collapse: InstitutionalCollapseProjection
}

interface RequiredRecoveryResult extends ValidRecoveryResult {
  readonly required: FacilityMaintenanceRecoveryResources
}

export type FacilityMaintenanceRecoveryResult =
  | { readonly status: 'invalid' }
  | (ValidRecoveryResult & { readonly status: 'not_required' })
  | (RequiredRecoveryResult & { readonly status: 'insufficient_resources' })
  | (RequiredRecoveryResult & { readonly status: 'recovered' })

const ZERO_RESOURCES: FacilityMaintenanceRecoveryResources = Object.freeze({
  maintenanceHours: 0,
  partsReserve: 0,
})

function parseResources(value: unknown): FacilityMaintenanceRecoveryResources | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  if (
    !Object.hasOwn(record, 'maintenanceHours') ||
    !Object.hasOwn(record, 'partsReserve') ||
    typeof record.maintenanceHours !== 'number' ||
    !Number.isSafeInteger(record.maintenanceHours) ||
    record.maintenanceHours < 0 ||
    typeof record.partsReserve !== 'number' ||
    !Number.isSafeInteger(record.partsReserve) ||
    record.partsReserve < 0
  )
    return undefined
  return Object.freeze({
    maintenanceHours: record.maintenanceHours,
    partsReserve: record.partsReserve,
  })
}

/** SPE-3182: propose full active-debt recovery without debiting campaign resources. */
export function resolveFacilityMaintenanceRecovery(
  state: unknown,
  resources: unknown
): FacilityMaintenanceRecoveryResult {
  const prior = parseFacilityMaintenanceState(state)
  const available = parseResources(resources)
  if (prior === undefined || available === undefined) return Object.freeze({ status: 'invalid' })

  // The shared parser guarantees finite nonnegative debt, which the projector accepts.
  const collapse = projectInstitutionalCollapsePathways({ maintenanceDebt: prior.maintenanceDebt })!
  const maintenance = collapse.activePathways.find(
    (pathway) => pathway.pathwayId === 'maintenance_debt_overrun' && pathway.chainedFrom === null
  )
  if (maintenance === undefined) {
    return Object.freeze({
      status: 'not_required',
      state: prior,
      resources: available,
      consumed: ZERO_RESOURCES,
      collapse,
    })
  }

  // Resolve the origin only; the chained logistics stall has no additional repair charge.
  const required = Object.freeze({
    maintenanceHours: maintenance.recoveryRequirements.maintenanceHours,
    partsReserve: maintenance.recoveryRequirements.partsReserve,
  })
  if (
    available.maintenanceHours < required.maintenanceHours ||
    available.partsReserve < required.partsReserve
  ) {
    return Object.freeze({
      status: 'insufficient_resources',
      state: prior,
      resources: available,
      consumed: ZERO_RESOURCES,
      required,
      collapse,
    })
  }

  // Zero is a valid maintenance trigger; its projection is defined with no active pathways.
  return Object.freeze({
    status: 'recovered',
    state: Object.freeze({ maintenanceDebt: 0, lastProcessedWeek: prior.lastProcessedWeek }),
    resources: Object.freeze({
      maintenanceHours: available.maintenanceHours - required.maintenanceHours,
      partsReserve: available.partsReserve - required.partsReserve,
    }),
    consumed: required,
    required,
    collapse: projectInstitutionalCollapsePathways({ maintenanceDebt: 0 })!,
  })
}
