import { describe, expect, it } from 'vitest'
import {
  DUPLICATE_STACK_FACILITY_TYPE,
  DUPLICATE_STACK_HARD_CAP,
  computeBoundedStackBenefitUnits,
  projectDisabledDuplicateStackEffect,
  projectDuplicateFacilityBurden,
  projectDuplicateFacilityStack,
} from '../domain/duplicateFacilityStacking'

describe('SPE-3361 duplicate facility stacking', () => {
  it('produces a bounded stacking benefit for duplicate facilities', () => {
    const stack = projectDuplicateFacilityStack({
      facilityType: DUPLICATE_STACK_FACILITY_TYPE,
      totalCount: 2,
      compatible: true,
    })
    expect(stack?.boundedBenefit).toBe(true)
    expect(stack?.stackBenefitUnits).toBe(150)
    expect(stack?.stackBenefitUnits).toBeLessThan(2 * 100)
  })

  it('increases staffing/upkeep/spatial/maintenance/vulnerability burden with duplicates', () => {
    const single = projectDuplicateFacilityBurden({
      facilityType: DUPLICATE_STACK_FACILITY_TYPE,
      totalCount: 1,
      compatible: true,
    })
    expect(single?.burdenIncreased).toBe(false)

    const multi = projectDuplicateFacilityBurden({
      facilityType: DUPLICATE_STACK_FACILITY_TYPE,
      totalCount: 3,
      compatible: true,
    })
    expect(multi?.burdenIncreased).toBe(true)
    expect(multi?.burdenByKind.staffing).toBe('severe')
    expect(multi?.burdenByKind.upkeep).toBe('severe')
    expect(multi?.burdenByKind.vulnerability).toBe('severe')
  })

  it('applies diminishing returns and a hard cap rather than unlimited linear growth', () => {
    const three = projectDuplicateFacilityStack({
      facilityType: DUPLICATE_STACK_FACILITY_TYPE,
      totalCount: 3,
      compatible: true,
    })
    expect(three?.diminishingReturnsApplied).toBe(true)
    expect(three?.stackBenefitUnits).toBe(175)

    const overCap = projectDuplicateFacilityStack({
      facilityType: DUPLICATE_STACK_FACILITY_TYPE,
      totalCount: DUPLICATE_STACK_HARD_CAP + 2,
      compatible: true,
    })
    expect(overCap?.hardCapApplied).toBe(true)
    expect(overCap?.contributingCount).toBe(DUPLICATE_STACK_HARD_CAP)
    expect(overCap?.stackBenefitUnits).toBe(
      computeBoundedStackBenefitUnits(DUPLICATE_STACK_HARD_CAP)
    )
  })

  it('changes effective output when a duplicate is damaged or disabled', () => {
    const effect = projectDisabledDuplicateStackEffect({
      facilityType: DUPLICATE_STACK_FACILITY_TYPE,
      compatible: true,
      units: [
        { unitId: 'unit:a', state: 'operational' },
        { unitId: 'unit:b', state: 'disabled' },
        { unitId: 'unit:c', state: 'operational' },
      ],
    })
    expect(effect?.disabledOrDamagedCount).toBe(1)
    expect(effect?.contributingOperationalCount).toBe(2)
    expect(effect?.effectiveStackBenefitUnits).toBe(150)
    expect(effect?.outputChangedByDisablement).toBe(true)
  })

  it('fails closed on malformed packets', () => {
    expect(projectDuplicateFacilityStack(null)).toBeUndefined()
    expect(projectDuplicateFacilityBurden({ facilityType: '', totalCount: 2, compatible: true })).toBeUndefined()
    expect(
      projectDisabledDuplicateStackEffect({
        facilityType: DUPLICATE_STACK_FACILITY_TYPE,
        compatible: true,
        units: [],
      })
    ).toBeUndefined()
  })
})
