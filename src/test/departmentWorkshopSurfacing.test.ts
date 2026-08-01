import { describe, expect, it } from 'vitest'

import { formatDepartmentWorkshopQualityReasonLabel } from '../domain/departmentWorkshopSurfacing'

describe('department workshop quality surfacing', () => {
  it('labels degraded dependency completion quality explicitly', () => {
    expect(formatDepartmentWorkshopQualityReasonLabel('poor_dependency_condition')).toBe(
      'Poor dependency condition'
    )
  })

  it('labels degraded equipment completion quality explicitly', () => {
    expect(formatDepartmentWorkshopQualityReasonLabel('poor_equipment_condition')).toBe(
      'Poor equipment condition'
    )
  })

  it('labels degraded reagent completion quality explicitly', () => {
    expect(formatDepartmentWorkshopQualityReasonLabel('poor_reagent_grade')).toBe(
      'Poor reagent grade'
    )
  })
})
