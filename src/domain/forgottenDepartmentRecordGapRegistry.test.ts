import { describe, expect, it } from 'vitest'
import {
  validateForgottenDepartmentRecordGapRecord,
  projectForgottenDepartmentRecordGap,
  type ForgottenDepartmentRecordGapRecord,
} from './forgottenDepartmentRecordGapRegistry'

describe('SPE-2137 forgotten department record gap registry', () => {
  const validRecord: ForgottenDepartmentRecordGapRecord = {
    id: 'gap-dept-alpha',
    departmentLabelRef: 'dept:historical-research',
    recordGapKind: 'missing_record',
    absenceSignals: ['no_budget_line', 'empty_room_roster'],
    rediscoveryRisk: 'moderate',
  }

  it('accepts a well-formed record', () => {
    const result = validateForgottenDepartmentRecordGapRecord(validRecord)
    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('rejects missing id', () => {
    const result = validateForgottenDepartmentRecordGapRecord({ ...validRecord, id: '' })
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'missing_id')).toBe(true)
  })

  it('rejects empty absence signals', () => {
    const result = validateForgottenDepartmentRecordGapRecord({
      ...validRecord,
      absenceSignals: [],
    })
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'empty_absence_signals')).toBe(true)
  })

  it('rejects invalid record gap kind', () => {
    const result = validateForgottenDepartmentRecordGapRecord({
      ...validRecord,
      recordGapKind: 'invalid' as any,
    })
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'invalid_record_gap_kind')).toBe(true)
  })

  it('projects deterministically with sorted unique signals', () => {
    const projected = projectForgottenDepartmentRecordGap({
      ...validRecord,
      absenceSignals: ['empty_room_roster', 'no_budget_line', 'no_budget_line'],
    })
    expect(projected.absenceSignals).toEqual(['empty_room_roster', 'no_budget_line'])
    expect(projected.departmentLabelRef).toBe('dept:historical-research')
  })

  it('represents institutional absence without verified explanation', () => {
    const result = validateForgottenDepartmentRecordGapRecord(validRecord)
    expect(result.valid).toBe(true)
    // Absence signals are present; no explanation field asserted
    expect(validRecord.absenceSignals.length).toBeGreaterThan(0)
  })
})
