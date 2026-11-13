import { describe, expect, it } from 'vitest'
import {
  lookupStaffRoleSignatureByRolePackage,
  lookupStaffRoleSignatureCapability,
  normalizeStaffRoleSignatureCapabilities,
  recruitmentAssessmentFamiliesByRolePackage,
  STAFF_ROLE_SIGNATURE_FIXTURE_CAPABILITIES,
  validateStaffRoleSignatureCapabilities,
} from '../domain/staffRoleSignatureCapability'
import type { StaffRoleSignatureCapability } from '../domain/staffRoleSignatureCapability'

const fixture = STAFF_ROLE_SIGNATURE_FIXTURE_CAPABILITIES

describe('staffRoleSignatureCapability (SPE-2222 slice 1)', () => {
  it('links each fixture role package to one legal signature capability', () => {
    expect(validateStaffRoleSignatureCapabilities(fixture)).toEqual({ valid: true, issues: [] })
    for (const capability of fixture) {
      expect(lookupStaffRoleSignatureByRolePackage(fixture, capability.rolePackageRef)).toEqual({
        status: 'found',
        capability,
      })
      expect(lookupStaffRoleSignatureCapability(fixture, capability.id)).toEqual({
        status: 'found',
        capability,
      })
    }
  })

  it('exposes different recruitment-assessment families without a score or hidden truth', () => {
    const families = recruitmentAssessmentFamiliesByRolePackage(fixture)
    expect(families).toEqual([
      {
        rolePackageRef: 'role-package:background-review',
        family: 'candidate_background_assessment',
      },
      {
        rolePackageRef: 'role-package:candidate-screen',
        family: 'first_impression_assessment',
      },
    ])
    for (const capability of fixture) {
      expect(capability).not.toHaveProperty('score')
      expect(capability).not.toHaveProperty('truth')
      expect(capability).not.toHaveProperty('hiddenTruth')
    }
  })

  it('rejects a second signature capability for the same role package', () => {
    const duplicate: StaffRoleSignatureCapability = {
      id: 'role-signature:candidate-screen-extra',
      rolePackageRef: 'role-package:candidate-screen',
      niche: 'field_observation',
    }
    const result = validateStaffRoleSignatureCapabilities([...fixture, duplicate])
    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toContain('duplicate_role_signature')
    expect(
      lookupStaffRoleSignatureByRolePackage([...fixture, duplicate], duplicate.rolePackageRef)
        .status
    ).toBe('duplicate_role_signature')
  })

  it('rejects unknown capability ids and source-specific labels', () => {
    const unknown = validateStaffRoleSignatureCapabilities([
      { id: 'scout', rolePackageRef: 'role-package:candidate-screen', niche: 'public_interface' },
    ])
    expect(unknown.valid).toBe(false)
    expect(unknown.issues.some((issue) => issue.code === 'unknown_capability_id')).toBe(true)

    const sourceLabel = validateStaffRoleSignatureCapabilities([
      {
        id: 'role-signature:bartender-read',
        rolePackageRef: 'role-package:candidate-screen',
        niche: 'public_interface',
      },
    ])
    expect(sourceLabel.valid).toBe(false)
    expect(sourceLabel.issues.some((issue) => issue.code === 'unknown_capability_id')).toBe(true)
    expect(lookupStaffRoleSignatureCapability(fixture, 'role-signature:missing').status).toBe(
      'unknown_capability_id'
    )
    expect(lookupStaffRoleSignatureCapability(fixture, 'not-a-capability').status).toBe(
      'invalid_capability_id'
    )
  })

  it('looks up capabilities deterministically without live staff or input mutation', () => {
    const reversed = [...fixture].reverse()
    const snapshot = JSON.stringify(reversed)
    const forward = normalizeStaffRoleSignatureCapabilities(fixture)
    const backward = normalizeStaffRoleSignatureCapabilities(reversed)
    expect(forward).toEqual(backward)
    expect(forward?.map((capability) => capability.id)).toEqual([
      'role-signature:background-review',
      'role-signature:candidate-screen',
      'role-signature:containment-tech',
    ])
    expect(recruitmentAssessmentFamiliesByRolePackage(reversed)).toEqual(
      recruitmentAssessmentFamiliesByRolePackage(fixture)
    )
    expect(JSON.stringify(reversed)).toBe(snapshot)
    expect(normalizeStaffRoleSignatureCapabilities([])).toEqual([])
  })
})
