import { describe, expect, it } from 'vitest'
import {
  ANOMALY_DEPENDENCY_FIXTURES,
  lookupAnomalyDependencyRecord,
  normalizeAnomalyDependencyRecords,
  validateAnomalyDependencyRecords,
} from '../domain/anomalyDependencyRegistry'
import type { AnomalyDependencyRecord } from '../domain/anomalyDependencyRegistry'

const fixtures = ANOMALY_DEPENDENCY_FIXTURES

describe('anomalyDependencyRegistry (SPE-1416 slice 1)', () => {
  it('accepts fixture records with legal refs, kinds, and benefit types', () => {
    expect(validateAnomalyDependencyRecords(fixtures)).toEqual({ valid: true, issues: [] })
    const social = fixtures[0]!
    expect(social.notes).toBeDefined()
    expect(lookupAnomalyDependencyRecord(fixtures, social.id)).toEqual({
      status: 'found',
      record: social,
    })
  })

  it('rejects records with invalid refs or unknown kinds/types', () => {
    const badRef: AnomalyDependencyRecord = {
      id: 'dep-rec:bad',
      anomalyRef: 'not-an-anomaly',
      dependentRef: 'dependent:ok',
      dependenceKind: 'biological',
      benefitType: 'direct',
    }
    const invalid = validateAnomalyDependencyRecords([badRef])
    expect(invalid.valid).toBe(false)
    expect(invalid.issues.some((issue) => issue.code === 'invalid_anomaly_ref')).toBe(true)

    const unknownKind = validateAnomalyDependencyRecords([
      {
        id: 'dep-rec:unknown-kind',
        anomalyRef: 'anomaly:ok',
        dependentRef: 'dependent:ok',
        dependenceKind: 'unknown',
        benefitType: 'direct',
      },
    ])
    expect(unknownKind.valid).toBe(false)
    expect(unknownKind.issues.some((issue) => issue.code === 'unknown_dependence_kind')).toBe(true)
  })

  it('looks up records deterministically without mutation or live simulation', () => {
    const reversed = [...fixtures].reverse()
    const snapshot = JSON.stringify(reversed)
    const forward = normalizeAnomalyDependencyRecords(fixtures)
    const backward = normalizeAnomalyDependencyRecords(reversed)
    expect(forward).toEqual(backward)
    expect(forward?.map((record) => record.id)).toEqual([
      'dep-rec:field-powered-gate',
      'dep-rec:healing-grove-residents',
      'dep-rec:recovery-path-patient',
    ])
    expect(lookupAnomalyDependencyRecord(reversed, 'dep-rec:healing-grove-residents').status).toBe(
      'found'
    )
    expect(JSON.stringify(reversed)).toBe(snapshot)
    expect(normalizeAnomalyDependencyRecords([])).toEqual([])
    expect(lookupAnomalyDependencyRecord(fixtures, 'dep-rec:missing').status).toBe(
      'unknown_record_id'
    )
    expect(lookupAnomalyDependencyRecord(fixtures, 'not-a-record').status).toBe(
      'invalid_record_id'
    )
  })

  it('normalizes tokens and preserves optional notes', () => {
    const record: AnomalyDependencyRecord = {
      id: ' dep-rec:trimmed ',
      anomalyRef: ' anomaly:trim-me ',
      dependentRef: ' dependent:trim-me ',
      dependenceKind: 'procedural',
      benefitType: 'direct',
      notes: '  Trimmed note  ',
    }
    expect(validateAnomalyDependencyRecords([record]).valid).toBe(true)
    const normalized = normalizeAnomalyDependencyRecords([record])!
    expect(normalized[0]!.id).toBe('dep-rec:trimmed')
    expect(normalized[0]!.anomalyRef).toBe('anomaly:trim-me')
    expect(normalized[0]!.notes).toBe('Trimmed note')
    expect(Object.isFrozen(normalized[0])).toBe(true)
  })

  it('rejects blank notes and duplicate ids', () => {
    const blankNotes = { ...fixtures[0]!, notes: '   ' }
    expect(validateAnomalyDependencyRecords([blankNotes]).valid).toBe(false)

    const duplicate = { ...fixtures[0]!, id: ` ${fixtures[0]!.id} ` }
    expect(
      validateAnomalyDependencyRecords([...fixtures, duplicate]).issues.map((i) => i.code)
    ).toContain('duplicate_record_id')
    expect(normalizeAnomalyDependencyRecords([...fixtures, duplicate])).toBeNull()
  })

  it('rejects invalid matched data on direct lookup', () => {
    const bad = { ...fixtures[0]!, anomalyRef: 'bad' } as AnomalyDependencyRecord
    expect(lookupAnomalyDependencyRecord([bad], bad.id).status).toBe('invalid_record')
  })
})
