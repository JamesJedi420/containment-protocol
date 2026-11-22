/**
 * SPE-3719 slice 2: deterministic live projection of staff role signature capabilities.
 *
 * Derives capability identity from canonical live staff role/package state via SPE-2222 registry.
 * Distinguishes identity from exercisability using supplied authoritative gate inputs.
 * No persistence of shadow state; fully derived. No second registry or readiness authority.
 */

import {
  type StaffRoleSignatureCapability,
  lookupStaffRoleSignatureByRolePackage,
  STAFF_ROLE_SIGNATURE_FIXTURE_CAPABILITIES,
} from './staffRoleSignatureCapability'

export type CapabilityAvailability =
  | { readonly status: 'available' }
  | { readonly status: 'blocked'; readonly reason: string }
  | { readonly status: 'unknown' }

export interface LiveStaffCapabilityProjection {
  readonly staffId: string
  readonly rolePackageRef: string
  readonly capability: StaffRoleSignatureCapability | null
  readonly availability: CapabilityAvailability
}

export interface StaffRolePackageState {
  readonly staffId: string
  readonly rolePackageRef: string
  /** Authoritative readiness/gating inputs supplied by existing owners. */
  readonly readinessGateSatisfied?: boolean
  readonly clearanceSatisfied?: boolean
  /** Optional infrastructure dependency from SPE-792 if declared. */
  readonly infrastructureAvailable?: boolean
}

const BLOCK_REASONS = {
  readiness: 'readiness_gate_unsatisfied',
  clearance: 'clearance_unsatisfied',
  infrastructure: 'infrastructure_unavailable',
} as const

/**
 * Project signature capability for one live staff record.
 * Capability identity comes only from SPE-2222 lookup.
 * Availability is derived from supplied gates; identity is never mutated.
 */
export function projectLiveStaffSignatureCapability(
  staff: StaffRolePackageState,
  capabilities: readonly StaffRoleSignatureCapability[] = STAFF_ROLE_SIGNATURE_FIXTURE_CAPABILITIES
): LiveStaffCapabilityProjection {
  const lookup = lookupStaffRoleSignatureByRolePackage(capabilities, staff.rolePackageRef)
  if (lookup.status !== 'found') {
    return Object.freeze({
      staffId: staff.staffId,
      rolePackageRef: staff.rolePackageRef,
      capability: null,
      availability: Object.freeze({ status: 'unknown' as const }),
    })
  }

  const capability = lookup.capability
  let blockedReason: string | null = null

  if (staff.readinessGateSatisfied === false) {
    blockedReason = BLOCK_REASONS.readiness
  } else if (staff.clearanceSatisfied === false) {
    blockedReason = BLOCK_REASONS.clearance
  } else if (staff.infrastructureAvailable === false) {
    blockedReason = BLOCK_REASONS.infrastructure
  }

  const availability: CapabilityAvailability = blockedReason
    ? Object.freeze({ status: 'blocked', reason: blockedReason })
    : Object.freeze({ status: 'available' })

  return Object.freeze({
    staffId: staff.staffId,
    rolePackageRef: staff.rolePackageRef,
    capability,
    availability,
  })
}

/**
 * Project for multiple staff. Order-independent; identical inputs yield stable output.
 */
export function projectLiveStaffSignatureCapabilities(
  staffRecords: readonly StaffRolePackageState[],
  capabilities: readonly StaffRoleSignatureCapability[] = STAFF_ROLE_SIGNATURE_FIXTURE_CAPABILITIES
): readonly LiveStaffCapabilityProjection[] {
  const projections = staffRecords.map((staff) =>
    projectLiveStaffSignatureCapability(staff, capabilities)
  )
  return Object.freeze(projections)
}
