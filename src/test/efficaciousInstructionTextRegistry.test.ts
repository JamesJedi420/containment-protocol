import { describe, expect, it } from 'vitest'
import {
  EfficaciousInstructionTextRegistry,
  validateEfficaciousInstructionText,
  type EfficaciousInstructionTextRecord,
} from '../domain/efficaciousInstructionTextRegistry'

describe('efficaciousInstructionTextRegistry', () => {
  const valid: EfficaciousInstructionTextRecord = {
    id: 'instr-1',
    label: 'Field Manual Alpha',
    efficacyBand: 'moderate',
    benefitRiskReviewState: 'balanced',
    subjectOutcomeRefs: ['outcome-a'],
  }

  it('accepts a valid record', () => {
    expect(validateEfficaciousInstructionText(valid)).toEqual([])
  })

  it('rejects missing id', () => {
    const issues = validateEfficaciousInstructionText({ ...valid, id: '' })
    expect(issues.some((i) => i.code === 'missing_id')).toBe(true)
  })

  it('rejects invalid efficacy band', () => {
    const issues = validateEfficaciousInstructionText({
      ...valid,
      efficacyBand: 'extreme' as any,
    })
    expect(issues.some((i) => i.code === 'invalid_efficacy_band')).toBe(true)
  })

  it('rejects empty subject outcome ref', () => {
    const issues = validateEfficaciousInstructionText({
      ...valid,
      subjectOutcomeRefs: [''],
    })
    expect(issues.some((i) => i.code === 'empty_subject_outcome_ref')).toBe(true)
  })

  it('registers and retrieves a record', () => {
    const registry = new EfficaciousInstructionTextRegistry()
    registry.register(valid)
    expect(registry.get('instr-1')).toEqual(valid)
    expect(registry.has('instr-1')).toBe(true)
    expect(registry.list()).toHaveLength(1)
  })

  it('rejects duplicate id', () => {
    const registry = new EfficaciousInstructionTextRegistry()
    registry.register(valid)
    expect(() => registry.register(valid)).toThrow(/Duplicate/)
  })
})
