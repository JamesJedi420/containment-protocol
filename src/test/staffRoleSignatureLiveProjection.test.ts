import { describe, expect, it } from 'vitest'
import {
  projectLiveStaffSignatureCapability,
  projectLiveStaffSignatureCapabilities,
  type StaffRolePackageState,
} from '../domain/staffRoleSignatureLiveProjection'
import { STAFF_ROLE_SIGNATURE_FIXTURE_CAPABILITIES } from '../domain/staffRoleSignatureCapability'

describe('SPE-3719 live staff role signature capability projection', () => {
  const baseStaff: StaffRolePackageState = {
    staffId: 'staff-1',
    rolePackageRef: 'role-package:containment-tech',
    readinessGateSatisfied: true,
    clearanceSatisfied: true,
  }

  it('resolves capability identity from SPE-2222 registry for a live staff record', () => {
    const projection = projectLiveStaffSignatureCapability(baseStaff)
    expect(projection.capability).not.toBeNull()
    expect(projection.capability?.id).toBe('role-signature:containment-tech')
    expect(projection.availability.status).toBe('available')
  })

  it('resolves different capabilities for different role packages without a second registry', () => {
    const staffA = { ...baseStaff, staffId: 'staff-a', rolePackageRef: 'role-package:candidate-screen' }
    const staffB = { ...baseStaff, staffId: 'staff-b', rolePackageRef: 'role-package:background-review' }
    const projections = projectLiveStaffSignatureCapabilities([staffA, staffB])
    expect(projections[0].capability?.id).toBe('role-signature:candidate-screen')
    expect(projections[1].capability?.id).toBe('role-signature:background-review')
    expect(projections[0].capability?.id).not.toBe(projections[1].capability?.id)
  })

  it('blocks exercisability on readiness gate while preserving capability identity', () => {
    const blocked = { ...baseStaff, readinessGateSatisfied: false }
    const projection = projectLiveStaffSignatureCapability(blocked)
    expect(projection.capability?.id).toBe('role-signature:containment-tech')
    expect(projection.availability).toEqual({ status: 'blocked', reason: 'readiness_gate_unsatisfied' })
  })

  it('returns available when all gates are satisfied', () => {
    const projection = projectLiveStaffSignatureCapability(baseStaff)
    expect(projection.availability.status).toBe('available')
  })

  it('changes availability when gating input changes without mutating identity', () => {
    const available = projectLiveStaffSignatureCapability(baseStaff)
    const blocked = projectLiveStaffSignatureCapability({ ...baseStaff, clearanceSatisfied: false })
    expect(available.capability?.id).toBe(blocked.capability?.id)
    expect(available.availability.status).toBe('available')
    expect(blocked.availability).toEqual({ status: 'blocked', reason: 'clearance_unsatisfied' })
  })

  it('returns unknown for unregistered role package', () => {
    const unknown = { ...baseStaff, rolePackageRef: 'role-package:unknown' }
    const projection = projectLiveStaffSignatureCapability(unknown)
    expect(projection.capability).toBeNull()
    expect(projection.availability.status).toBe('unknown')
  })

  it('produces stable output for identical inputs', () => {
    const a = projectLiveStaffSignatureCapability(baseStaff)
    const b = projectLiveStaffSignatureCapability(baseStaff)
    expect(a).toEqual(b)
  })

  it('supports infrastructure gate when supplied', () => {
    const infraBlocked = {
      ...baseStaff,
      infrastructureAvailable: false,
    }
    const projection = projectLiveStaffSignatureCapability(infraBlocked)
    expect(projection.availability).toEqual({
      status: 'blocked',
      reason: 'infrastructure_unavailable',
    })
    expect(projection.capability?.id).toBe('role-signature:containment-tech')
  })
})
