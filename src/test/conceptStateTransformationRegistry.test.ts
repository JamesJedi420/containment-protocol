import { describe, expect, it } from 'vitest'
import {
  CATEGORY_BIND_SCOPE_FIXTURE,
  CONCEPT_RELOCATE_COLLATERAL_FIXTURE,
  CONCEPT_STATE_OPERATORS,
  CONCEPT_STATE_TARGET_KINDS,
  projectConceptCollateral,
  validateConceptStateOperatorRecord,
  type ConceptStateOperatorRecord,
} from '../domain/conceptStateTransformationRegistry'

function baseRecord(
  overrides: Partial<ConceptStateOperatorRecord> = {}
): ConceptStateOperatorRecord {
  return {
    id: 'concept-operator:test-base',
    label: 'Test concept-state operator',
    targetKind: 'concept',
    operator: 'invert',
    fromState: 'member',
    toState: 'non_member',
    ...overrides,
  }
}

describe('conceptStateTransformationRegistry (SPE-2118 slice 1)', () => {
  it('validates concept relocate fixture with collateralConceptRefs', () => {
    const result = validateConceptStateOperatorRecord(CONCEPT_RELOCATE_COLLATERAL_FIXTURE)

    expect(result.valid).toBe(true)
    expect(CONCEPT_RELOCATE_COLLATERAL_FIXTURE.operator).toBe('relocate')
    expect(CONCEPT_RELOCATE_COLLATERAL_FIXTURE.collateralConceptRefs).toHaveLength(2)
  })

  it('validates category bind fixture with scopeRules', () => {
    const result = validateConceptStateOperatorRecord(CATEGORY_BIND_SCOPE_FIXTURE)

    expect(result.valid).toBe(true)
    expect(CATEGORY_BIND_SCOPE_FIXTURE.operator).toBe('bind')
    expect(CATEGORY_BIND_SCOPE_FIXTURE.scopeRules).toHaveLength(2)
  })

  it('projects symptom-first collateral entries for concept relocate', () => {
    const projection = projectConceptCollateral(CONCEPT_RELOCATE_COLLATERAL_FIXTURE)

    expect(projection.affectedEntries).toHaveLength(2)
    expect(projection.affectedEntries[0]?.symptomDescriptor).toContain('Boundary drift reported for')
    expect(projection.affectedEntries[0]?.symptomDescriptor).toContain('inside_perimeter -> outside_perimeter')
    expect(projection.redacted).toBe(false)
  })

  it('warns when bind operator lacks scopeRules', () => {
    const result = validateConceptStateOperatorRecord(
      baseRecord({
        operator: 'bind',
        targetKind: 'category',
        fromState: 'open_set',
        toState: 'closed_set',
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'bind_without_scope_rules',
        severity: 'warning',
      }),
    ])
  })

  it('errors on franchise token in operator id', () => {
    const result = validateConceptStateOperatorRecord(
      baseRecord({
        id: 'concept-operator:foundation-category-bind',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_id')).toBe(true)
  })

  it('errors on branded object number in record label', () => {
    const result = validateConceptStateOperatorRecord(
      baseRecord({
        label: 'SCP-055 concept invert operator',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'branded_object_number_in_label')).toBe(true)
  })

  it('redacts collateral when policy requests unknown redaction', () => {
    const projection = projectConceptCollateral(
      {
        ...CONCEPT_RELOCATE_COLLATERAL_FIXTURE,
        unknownFields: ['collateralConceptRefs'],
      },
      {
        redactUnknown: true,
      }
    )

    expect(projection.affectedEntries).toHaveLength(0)
    expect(projection.redacted).toBe(true)
  })

  it('suppresses role hints when hidden conflict labels are suppressed', () => {
    const projection = projectConceptCollateral(CONCEPT_RELOCATE_COLLATERAL_FIXTURE, {
      suppressHiddenConflictLabels: true,
    })

    expect(projection.affectedEntries.every((entry) => entry.roleHint === null)).toBe(true)
  })

  it('returns byte-stable validation results on repeated calls', () => {
    const first = validateConceptStateOperatorRecord(CATEGORY_BIND_SCOPE_FIXTURE)
    const second = validateConceptStateOperatorRecord(CATEGORY_BIND_SCOPE_FIXTURE)

    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it('exports stable union catalogs', () => {
    expect(CONCEPT_STATE_TARGET_KINDS).toEqual(['object', 'concept', 'relation', 'category'])
    expect(CONCEPT_STATE_OPERATORS).toEqual(['relocate', 'invert', 'collapse', 'bind'])
  })
})
