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
    expect(stack).toMatchObject({
      boundedBenefit: true,
      stackBenefitUnits: 150,
      diminishingReturnsApplied: true,
      contributingCount: 2,
    })
  })

  it('increases burden with physical facility count even when incompatible for stacking', () => {
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

    const incompatible = projectDuplicateFacilityBurden({
      facilityType: DUPLICATE_STACK_FACILITY_TYPE,
      totalCount: 3,
      compatible: false,
    })
    expect(incompatible?.burdenIncreased).toBe(true)
    expect(incompatible?.burdenByKind.upkeep).toBe('severe')
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
    expect(overCap?.diminishingReturnsApplied).toBe(true)
    expect(overCap?.contributingCount).toBe(DUPLICATE_STACK_HARD_CAP)
    expect(overCap?.stackBenefitUnits).toBe(
      computeBoundedStackBenefitUnits(DUPLICATE_STACK_HARD_CAP)
    )
  })

  it('changes effective output when duplicates are damaged, disabled, or seized', () => {
    const disabled = projectDisabledDuplicateStackEffect({
      facilityType: DUPLICATE_STACK_FACILITY_TYPE,
      compatible: true,
      units: [
        { unitId: 'unit:a', state: 'operational' },
        { unitId: 'unit:b', state: 'disabled' },
        { unitId: 'unit:c', state: 'operational' },
      ],
    })
    expect(disabled).toMatchObject({
      disabledCount: 1,
      damagedCount: 0,
      seizedCount: 0,
      contributingOperationalCount: 2,
      effectiveStackBenefitUnits: 150,
      outputChangedByDisablement: true,
    })

    const damagedAndSeized = projectDisabledDuplicateStackEffect({
      facilityType: DUPLICATE_STACK_FACILITY_TYPE,
      compatible: true,
      units: [
        { unitId: 'unit:a', state: 'operational' },
        { unitId: 'unit:b', state: 'damaged' },
        { unitId: 'unit:c', state: 'seized' },
      ],
    })
    expect(damagedAndSeized).toMatchObject({
      damagedCount: 1,
      seizedCount: 1,
      contributingOperationalCount: 1,
      effectiveStackBenefitUnits: 100,
      outputChangedByDisablement: true,
    })
  })

  it('fails closed on malformed packets, duplicate unit ids, and supports zero count', () => {
    expect(projectDuplicateFacilityStack(null)).toBeUndefined()
    expect(
      projectDuplicateFacilityStack({
        facilityType: DUPLICATE_STACK_FACILITY_TYPE,
        totalCount: 0,
        compatible: true,
      })
    ).toMatchObject({ stackBenefitUnits: 0, contributingCount: 0 })
    expect(
      projectDuplicateFacilityBurden({ facilityType: '', totalCount: 2, compatible: true })
    ).toBeUndefined()
    expect(
      projectDisabledDuplicateStackEffect({
        facilityType: DUPLICATE_STACK_FACILITY_TYPE,
        compatible: true,
        units: [
          { unitId: 'unit:dup', state: 'operational' },
          { unitId: 'unit:dup', state: 'disabled' },
        ],
      })
    ).toBeUndefined()
  })
})
