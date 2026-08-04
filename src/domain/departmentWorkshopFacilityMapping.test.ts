import { describe, it, expect } from 'vitest'
import {
  deriveDepartmentWorkshopSafetyFromFacilities,
  deriveAllDepartmentWorkshopSafetyFromFacilities,
  DEFAULT_DEPARTMENT_WORKSHOP_FACILITY_MAPPINGS,
  type DepartmentWorkshopFacilityMapping,
} from './departmentWorkshopFacilityMapping'
import type { GameState } from './models'

function makeSource(facilities: Record<string, { status: string }> = {}): GameState {
  return {
    facilityState: { facilities: facilities as never },
  } as never
}

const BINDINGS: readonly DepartmentWorkshopFacilityMapping[] = [
  {
    departmentId: 'department:bio',
    axisBindings: [
      { facilityId: 'facility:bio-containment', axis: 'isolation' },
      { facilityId: 'facility:bio-vent', axis: 'ventilation' },
    ],
  },
  {
    departmentId: 'department:chem',
    axisBindings: [
      { facilityId: 'facility:chem-lab', axis: 'ppe' },
      { facilityId: 'facility:chem-lab', axis: 'dualAuth' },
    ],
  },
]

describe('deriveDepartmentWorkshopSafetyFromFacilities', () => {
  it('returns all good when no mappings are provided (empty default)', () => {
    const source = makeSource()
    const result = deriveDepartmentWorkshopSafetyFromFacilities(
      source,
      'department:bio',
      DEFAULT_DEPARTMENT_WORKSHOP_FACILITY_MAPPINGS
    )
    expect(result).toEqual({
      isolation: 'good',
      ventilation: 'good',
      ppe: 'good',
      dualAuth: 'good',
    })
  })

  it('returns all good when no mapping entry exists for the department', () => {
    const source = makeSource()
    const result = deriveDepartmentWorkshopSafetyFromFacilities(
      source,
      'department:unknown',
      BINDINGS
    )
    expect(result).toEqual({
      isolation: 'good',
      ventilation: 'good',
      ppe: 'good',
      dualAuth: 'good',
    })
  })

  it('returns good axis when bound facility is active', () => {
    const source = makeSource({
      'facility:bio-containment': { status: 'active' },
      'facility:bio-vent': { status: 'active' },
    })
    const result = deriveDepartmentWorkshopSafetyFromFacilities(source, 'department:bio', BINDINGS)
    expect(result.isolation).toBe('good')
    expect(result.ventilation).toBe('good')
  })

  it('returns poor axis when bound facility is inactive', () => {
    const source = makeSource({
      'facility:bio-containment': { status: 'inactive' },
      'facility:bio-vent': { status: 'active' },
    })
    const result = deriveDepartmentWorkshopSafetyFromFacilities(source, 'department:bio', BINDINGS)
    expect(result.isolation).toBe('poor')
    expect(result.ventilation).toBe('good')
    expect(result.ppe).toBe('good')
    expect(result.dualAuth).toBe('good')
  })

  it('returns poor axis when bound facility is upgrading', () => {
    const source = makeSource({ 'facility:bio-vent': { status: 'upgrading' } })
    const result = deriveDepartmentWorkshopSafetyFromFacilities(source, 'department:bio', BINDINGS)
    expect(result.ventilation).toBe('poor')
  })

  it('returns poor axis when bound facility is absent from facilityState', () => {
    const source = makeSource({})
    const result = deriveDepartmentWorkshopSafetyFromFacilities(source, 'department:bio', BINDINGS)
    expect(result.isolation).toBe('poor')
    expect(result.ventilation).toBe('poor')
  })

  it('applies the same facility to multiple axes', () => {
    const source = makeSource({ 'facility:chem-lab': { status: 'inactive' } })
    const result = deriveDepartmentWorkshopSafetyFromFacilities(source, 'department:chem', BINDINGS)
    expect(result.ppe).toBe('poor')
    expect(result.dualAuth).toBe('poor')
  })

  it('does not affect unbound axes when a facility is inactive', () => {
    const source = makeSource({ 'facility:bio-containment': { status: 'inactive' } })
    const result = deriveDepartmentWorkshopSafetyFromFacilities(source, 'department:bio', BINDINGS)
    expect(result.ppe).toBe('good')
    expect(result.dualAuth).toBe('good')
  })

  it('handles missing facilityState gracefully', () => {
    const source = {} as never
    const result = deriveDepartmentWorkshopSafetyFromFacilities(source, 'department:bio', BINDINGS)
    expect(result.isolation).toBe('poor')
    expect(result.ventilation).toBe('poor')
  })
})

describe('deriveAllDepartmentWorkshopSafetyFromFacilities', () => {
  it('returns empty record for empty department list', () => {
    const result = deriveAllDepartmentWorkshopSafetyFromFacilities(makeSource(), [])
    expect(result).toEqual({})
  })

  it('covers multiple departments', () => {
    const source = makeSource({
      'facility:bio-containment': { status: 'inactive' },
      'facility:bio-vent': { status: 'active' },
      'facility:chem-lab': { status: 'active' },
    })
    const result = deriveAllDepartmentWorkshopSafetyFromFacilities(
      source,
      ['department:bio', 'department:chem'],
      BINDINGS
    )
    expect(result['department:bio']?.isolation).toBe('poor')
    expect(result['department:bio']?.ventilation).toBe('good')
    expect(result['department:chem']?.ppe).toBe('good')
  })

  it('returns departments in stable code-unit order', () => {
    const source = makeSource()
    const result = deriveAllDepartmentWorkshopSafetyFromFacilities(
      source,
      ['department:z', 'department:a', 'department:m'],
      BINDINGS
    )
    const keys = Object.keys(result)
    const sorted = [...keys].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    expect(keys).toEqual(sorted)
  })

  it('uses empty default mappings when no mappings argument is provided', () => {
    const source = makeSource({ 'facility:any': { status: 'inactive' } })
    const result = deriveAllDepartmentWorkshopSafetyFromFacilities(source, ['department:bio'])
    expect(result['department:bio']).toEqual({
      isolation: 'good',
      ventilation: 'good',
      ppe: 'good',
      dualAuth: 'good',
    })
  })
})
