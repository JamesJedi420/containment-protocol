import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  LABEL_DRIVEN_ROOM_FUNCTION_FIXTURE_RECORDS,
  OVERRIDE_STRENGTHS,
  normalizeLabelDrivenRoomFunctionRecords,
  validateLabelDrivenRoomFunctionRecords,
  type LabelDrivenRoomFunctionRecord,
} from '../domain/labelDrivenRoomFunctionRegistry'

function baseRecord(
  overrides: Partial<LabelDrivenRoomFunctionRecord> = {}
): LabelDrivenRoomFunctionRecord {
  return {
    id: 'room-function-override:test-record',
    signRef: 'sign:test-sign',
    intendedFunction: 'function:intended',
    actualFunction: 'function:actual',
    overrideStrength: 'moderate',
    ...overrides,
  }
}

describe('labelDrivenRoomFunctionRegistry (SPE-2138 slice 1)', () => {
  it('validates authored fixtures', () => {
    const result = validateLabelDrivenRoomFunctionRecords(LABEL_DRIVEN_ROOM_FUNCTION_FIXTURE_RECORDS)
    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([])
  })

  it('normalizes and freezes valid records in id order', () => {
    const records = [
      baseRecord({ id: 'room-function-override:z-last' }),
      baseRecord({ id: 'room-function-override:a-first' }),
    ]
    const normalized = normalizeLabelDrivenRoomFunctionRecords(records)
    expect(normalized).not.toBeNull()
    expect(normalized!.map((r) => r.id)).toEqual([
      'room-function-override:a-first',
      'room-function-override:z-last',
    ])
    expect(Object.isFrozen(normalized)).toBe(true)
    expect(Object.isFrozen(normalized![0])).toBe(true)
  })

  it('rejects invalid record ids and duplicate ids', () => {
    const invalid = validateLabelDrivenRoomFunctionRecords([
      baseRecord({ id: 'bad-id' }),
      baseRecord({ id: 'room-function-override:dup' }),
      baseRecord({ id: 'room-function-override:dup' }),
    ])
    const codes = invalid.issues.map((i) => i.code)
    expect(codes).toContain('invalid_record_id')
    expect(codes).toContain('duplicate_record_id')
    expect(invalid.valid).toBe(false)
  })

  it('rejects invalid sign and function refs', () => {
    const result = validateLabelDrivenRoomFunctionRecords([
      baseRecord({
        signRef: 'not-a-sign',
        intendedFunction: 'not-a-function',
        actualFunction: 'also-not',
      }),
    ])
    const codes = result.issues.map((i) => i.code)
    expect(codes).toEqual(
      expect.arrayContaining([
        'invalid_sign_ref',
        'invalid_intended_function',
        'invalid_actual_function',
      ])
    )
  })

  it('requires intended and actual functions to remain distinct', () => {
    const result = validateLabelDrivenRoomFunctionRecords([
      baseRecord({
        intendedFunction: 'function:same',
        actualFunction: 'function:same',
      }),
    ])
    expect(result.issues.map((i) => i.code)).toContain('functions_not_distinct')
  })

  it('rejects unknown override strength', () => {
    const result = validateLabelDrivenRoomFunctionRecords([
      baseRecord({ overrideStrength: 'extreme' as LabelDrivenRoomFunctionRecord['overrideStrength'] }),
    ])
    expect(result.issues.map((i) => i.code)).toContain('unknown_override_strength')
  })

  it('rejects non-array registry input', () => {
    const result = validateLabelDrivenRoomFunctionRecords(null)
    expect(result.issues.map((i) => i.code)).toEqual(['invalid_registry'])
  })

  it('exposes the documented strength vocabulary', () => {
    expect(OVERRIDE_STRENGTHS).toEqual(['weak', 'moderate', 'strong', 'absolute'])
  })

  it('stays a pure domain registry without runtime or UI imports', () => {
    const source = readFileSync(
      path.join(__dirname, '../domain/labelDrivenRoomFunctionRegistry.ts'),
      'utf8'
    )
    expect(source).not.toMatch(/from ['"].*app\//)
    expect(source).not.toMatch(/from ['"].*components\//)
    expect(source).not.toMatch(/from ['"].*features/)
    expect(source).not.toMatch(/from ['"]react/)
    expect(source).not.toContain('GameState')
    expect(source).not.toContain('Math.random')
    expect(source).not.toContain('Date.now')
  })
})
