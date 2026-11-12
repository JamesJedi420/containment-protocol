import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FIELD_ACTION_ECONOMY_REGISTRY,
  FIELD_ACTION_CATEGORIES,
  IMPAIRED_MOBILITY_REDUCED_CAPACITY_FIXTURE,
  MANEUVER_FIELD_ACTION_FIXTURE,
  MOVEMENT_FIELD_ACTION_FIXTURE,
  PRIMARY_FIELD_ACTION_FIXTURE,
  PRIMARY_SUBSTITUTES_MOVEMENT_CONVERSION_FIXTURE,
  isFieldActionCategory,
  projectConversionPermission,
  projectReducedCapacityLimits,
  validateFieldActionConversionRecord,
  validateFieldActionEconomyRegistry,
  validateFieldActionRecord,
  validateFieldActionReducedCapacityRecord,
  type FieldActionConversionRecord,
  type FieldActionRecord,
  type FieldActionReducedCapacityRecord,
} from '../domain/fieldActionEconomyRegistry'

function baseAction(overrides: Partial<FieldActionRecord> = {}): FieldActionRecord {
  return {
    id: 'field-action:test-primary',
    label: 'Test primary',
    category: 'primary',
    slotCost: 1,
    ...overrides,
  }
}

function baseConversion(
  overrides: Partial<FieldActionConversionRecord> = {}
): FieldActionConversionRecord {
  return {
    id: 'field-action-conversion:test-substitute',
    label: 'Test substitute',
    sourceCategory: 'primary',
    targetCategory: 'movement',
    mode: 'substitute',
    sourceSlots: 1,
    targetSlots: 1,
    ...overrides,
  }
}

function baseReducedCapacity(
  overrides: Partial<FieldActionReducedCapacityRecord> = {}
): FieldActionReducedCapacityRecord {
  return {
    id: 'field-action-capacity:test-impaired',
    label: 'Test impaired',
    permittedCategories: ['primary', 'maneuver'],
    categorySlotLimits: {
      primary: 1,
      maneuver: 1,
    },
    maxTotalSlots: 2,
    ...overrides,
  }
}

describe('fieldActionEconomyRegistry (SPE-2217 slice 1)', () => {
  it('validates primary, movement, and maneuver fixtures', () => {
    expect(validateFieldActionRecord(PRIMARY_FIELD_ACTION_FIXTURE).valid).toBe(true)
    expect(PRIMARY_FIELD_ACTION_FIXTURE.category).toBe('primary')

    expect(validateFieldActionRecord(MOVEMENT_FIELD_ACTION_FIXTURE).valid).toBe(true)
    expect(MOVEMENT_FIELD_ACTION_FIXTURE.category).toBe('movement')

    expect(validateFieldActionRecord(MANEUVER_FIELD_ACTION_FIXTURE).valid).toBe(true)
    expect(MANEUVER_FIELD_ACTION_FIXTURE.category).toBe('maneuver')

    expect(FIELD_ACTION_CATEGORIES).toEqual(['primary', 'movement', 'maneuver'])
    expect(isFieldActionCategory('primary')).toBe(true)
    expect(isFieldActionCategory('strike')).toBe(false)
  })

  it('validates the conversion-permission fixture', () => {
    const result = validateFieldActionConversionRecord(
      PRIMARY_SUBSTITUTES_MOVEMENT_CONVERSION_FIXTURE
    )

    expect(result.valid).toBe(true)
    expect(PRIMARY_SUBSTITUTES_MOVEMENT_CONVERSION_FIXTURE.mode).toBe('substitute')
    expect(PRIMARY_SUBSTITUTES_MOVEMENT_CONVERSION_FIXTURE.sourceCategory).toBe('primary')
    expect(PRIMARY_SUBSTITUTES_MOVEMENT_CONVERSION_FIXTURE.targetCategory).toBe('movement')

    const projection = projectConversionPermission(PRIMARY_SUBSTITUTES_MOVEMENT_CONVERSION_FIXTURE)
    expect(projection.legal).toBe(true)
    expect(projection).toEqual({
      recordId: PRIMARY_SUBSTITUTES_MOVEMENT_CONVERSION_FIXTURE.id,
      sourceCategory: 'primary',
      targetCategory: 'movement',
      mode: 'substitute',
      legal: true,
    })
  })

  it('rejects unknown action categories', () => {
    const result = validateFieldActionRecord(
      baseAction({
        category: 'strike' as FieldActionRecord['category'],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'invalid_action_category',
        severity: 'error',
      }),
    ])
  })

  it('rejects invalid conversion targets', () => {
    const unknownTargetRecord = baseConversion({
      targetCategory: 'reaction' as FieldActionConversionRecord['targetCategory'],
    })
    const unknownTarget = validateFieldActionConversionRecord(unknownTargetRecord)

    expect(unknownTarget.valid).toBe(false)
    expect(unknownTarget.issues.some((issue) => issue.code === 'invalid_conversion_target')).toBe(
      true
    )
    expect(projectConversionPermission(unknownTargetRecord).legal).toBe(false)

    const sameCategory = validateFieldActionConversionRecord(
      baseConversion({
        sourceCategory: 'movement',
        targetCategory: 'movement',
      })
    )

    expect(sameCategory.valid).toBe(false)
    expect(sameCategory.issues.some((issue) => issue.code === 'conversion_same_category')).toBe(
      true
    )
  })

  it('rejects consume conversions that create surplus slots', () => {
    const result = validateFieldActionConversionRecord(
      baseConversion({
        mode: 'consume',
        sourceSlots: 1,
        targetSlots: 2,
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'conversion_consume_creates_surplus')).toBe(
      true
    )
  })

  it('projects reduced-capacity limits that constrain categories deterministically', () => {
    const validation = validateFieldActionReducedCapacityRecord(
      IMPAIRED_MOBILITY_REDUCED_CAPACITY_FIXTURE
    )
    const projection = projectReducedCapacityLimits(IMPAIRED_MOBILITY_REDUCED_CAPACITY_FIXTURE)

    expect(validation.valid).toBe(true)
    expect(projection.constrainsUnrestrictedSet).toBe(true)
    expect(projection.permittedCategories).toEqual(['maneuver', 'primary'])
    expect(projection.categorySlotLimits).toEqual({
      primary: 1,
      movement: 0,
      maneuver: 1,
    })
    expect(projection.maxTotalSlots).toBe(2)
    expect(projection.permittedCategories).not.toContain('movement')
  })

  it('rejects reduced-capacity records that still permit the unrestricted set', () => {
    const result = validateFieldActionReducedCapacityRecord(
      baseReducedCapacity({
        permittedCategories: ['primary', 'movement', 'maneuver'],
        categorySlotLimits: {
          primary: 1,
          movement: 1,
          maneuver: 1,
        },
        maxTotalSlots: 3,
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'reduced_capacity_unconstrained')).toBe(
      true
    )

    const projection = projectReducedCapacityLimits(
      baseReducedCapacity({
        permittedCategories: ['primary', 'movement', 'maneuver'],
        categorySlotLimits: {
          primary: 1,
          movement: 1,
          maneuver: 1,
        },
        maxTotalSlots: 3,
      })
    )
    expect(projection.constrainsUnrestrictedSet).toBe(false)
    expect(projection.categorySlotLimits).toEqual({
      primary: 0,
      movement: 0,
      maneuver: 0,
    })
  })

  it('rejects reduced-capacity records with unknown categories or surplus limits', () => {
    const unknownCategory = validateFieldActionReducedCapacityRecord(
      baseReducedCapacity({
        permittedCategories: [
          'reaction' as FieldActionReducedCapacityRecord['permittedCategories'][number],
        ],
        categorySlotLimits: {},
        maxTotalSlots: 0,
      })
    )

    expect(unknownCategory.valid).toBe(false)
    expect(
      unknownCategory.issues.some((issue) => issue.code === 'reduced_capacity_unknown_category')
    ).toBe(true)

    const surplusLimit = validateFieldActionReducedCapacityRecord(
      baseReducedCapacity({
        categorySlotLimits: {
          primary: 2,
          maneuver: 1,
        },
      })
    )

    expect(surplusLimit.valid).toBe(false)
    expect(
      surplusLimit.issues.some(
        (issue) => issue.code === 'reduced_capacity_slot_exceeds_unrestricted'
      )
    ).toBe(true)
  })

  it('rejects tabletop action-economy tokens in player-facing fields', () => {
    const result = validateFieldActionRecord(
      baseAction({
        label: 'Strike as a standard action',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'tabletop_action_token_in_label')).toBe(
      true
    )
  })

  it('validates the default registry and stays byte-stable', () => {
    const first = validateFieldActionEconomyRegistry(DEFAULT_FIELD_ACTION_ECONOMY_REGISTRY)
    const second = validateFieldActionEconomyRegistry(DEFAULT_FIELD_ACTION_ECONOMY_REGISTRY)

    expect(first.valid).toBe(true)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(DEFAULT_FIELD_ACTION_ECONOMY_REGISTRY.actions).toHaveLength(3)
    expect(DEFAULT_FIELD_ACTION_ECONOMY_REGISTRY.conversions).toHaveLength(1)
    expect(DEFAULT_FIELD_ACTION_ECONOMY_REGISTRY.reducedCapacity).toHaveLength(1)
  })

  it('rejects duplicate ids across registry collections', () => {
    const result = validateFieldActionEconomyRegistry({
      actions: [PRIMARY_FIELD_ACTION_FIXTURE],
      conversions: [
        {
          ...PRIMARY_SUBSTITUTES_MOVEMENT_CONVERSION_FIXTURE,
          id: PRIMARY_FIELD_ACTION_FIXTURE.id,
        },
      ],
      reducedCapacity: [IMPAIRED_MOBILITY_REDUCED_CAPACITY_FIXTURE],
    })

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'duplicate_id')).toBe(true)
  })

  it('validates untrusted payloads without throwing when fields are missing', () => {
    const actionResult = validateFieldActionRecord({} as FieldActionRecord)
    const conversionResult = validateFieldActionConversionRecord(
      null as unknown as FieldActionConversionRecord
    )
    const reducedResult = validateFieldActionReducedCapacityRecord(
      null as unknown as FieldActionReducedCapacityRecord
    )

    expect(actionResult.valid).toBe(false)
    expect(conversionResult.valid).toBe(false)
    expect(reducedResult.valid).toBe(false)
    expect(actionResult.issues.map((issue) => issue.code).sort()).toEqual(
      ['invalid_action_category', 'invalid_slot_cost', 'missing_id', 'missing_label'].sort()
    )
  })

  it('produces byte-stable reduced-capacity projection on repeated runs', () => {
    const first = JSON.stringify(
      projectReducedCapacityLimits(IMPAIRED_MOBILITY_REDUCED_CAPACITY_FIXTURE)
    )
    const second = JSON.stringify(
      projectReducedCapacityLimits(IMPAIRED_MOBILITY_REDUCED_CAPACITY_FIXTURE)
    )

    expect(first).toBe(second)
  })
})
