import { describe, expect, it } from 'vitest'

import { formatDepartmentWorkshopQualityReasonLabel } from '../domain/departmentWorkshopSurfacing'

describe('department workshop quality surfacing', () => {
  it('labels degraded dependency completion quality explicitly', () => {
    expect(formatDepartmentWorkshopQualityReasonLabel('poor_dependency_condition')).toBe(
      'Poor dependency condition'
    )
  })
})
