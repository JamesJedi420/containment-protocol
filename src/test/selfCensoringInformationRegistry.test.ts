import { describe, expect, it } from 'vitest'
import {
  ABSENCE_SIGNAL_KINDS,
  INFORMATION_FAILURE_MODES,
  PROPAGATION_RESISTANCE_TAGS,
  REDISCOVERY_LOOP_RECORD_FIXTURE,
  STUDY_BLOCKED_ARCHIVE_FIXTURE,
  projectAntimemeticCaseView,
  validateSelfCensoringInformationRecord,
  type SelfCensoringInformationRecord,
} from '../domain/selfCensoringInformationRegistry'

function baseRecord(
  overrides: Partial<SelfCensoringInformationRecord> = {}
): SelfCensoringInformationRecord {
  return {
    id: 'info:test-base',
    label: 'Test base record',
    ...overrides,
  }
}

describe('selfCensoringInformationRegistry (SPE-2108 slice 1)', () => {
  it('validates fixture with negativeFacts, retentionDecayTimer, and rediscovery loopCount 2', () => {
    const result = validateSelfCensoringInformationRecord(REDISCOVERY_LOOP_RECORD_FIXTURE)

    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
    expect(REDISCOVERY_LOOP_RECORD_FIXTURE.negativeFacts).toHaveLength(2)
    expect(REDISCOVERY_LOOP_RECORD_FIXTURE.retentionDecayTimer).toBe(8)
    expect(REDISCOVERY_LOOP_RECORD_FIXTURE.rediscoveryLoop?.loopCount).toBe(2)
  })

  it('validates record_ok_cognition_fail with mediumIntegrityNotes', () => {
    const result = validateSelfCensoringInformationRecord(STUDY_BLOCKED_ARCHIVE_FIXTURE)

    expect(result.valid).toBe(true)
    expect(STUDY_BLOCKED_ARCHIVE_FIXTURE.informationFailureMode).toBe('record_ok_cognition_fail')
    expect(STUDY_BLOCKED_ARCHIVE_FIXTURE.mediumIntegrityNotes).toBeTruthy()
  })

  it('round-trips absenceSignals without implying confirmed entity in projection', () => {
    const result = validateSelfCensoringInformationRecord(REDISCOVERY_LOOP_RECORD_FIXTURE)
    const projection = projectAntimemeticCaseView(REDISCOVERY_LOOP_RECORD_FIXTURE)

    expect(result.valid).toBe(true)
    expect(projection.absenceSignals).toEqual(REDISCOVERY_LOOP_RECORD_FIXTURE.absenceSignals)
    expect(projection.contradictionSignals.some((signal) => signal.includes('Observed gap'))).toBe(
      true
    )
    expect(projection.contradictionSignals.some((signal) => signal.includes('confirmed entity'))).toBe(
      false
    )
    expect(projection.label).not.toMatch(/antimemetic|scp|foundation/i)
  })

  it('errors when rediscovery loopCount is 0 with alarm ref', () => {
    const result = validateSelfCensoringInformationRecord(
      baseRecord({
        rediscoveryLoop: {
          loopCount: 0,
          lastAlarmWeek: 12,
          forgottenWarningRefs: ['warning:gap-resurface'],
        },
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'rediscovery_loop_zero_with_alarm_ref',
        severity: 'error',
      }),
    ])
  })

  it('errors when rediscoveryLoop is present without loopCount', () => {
    const result = validateSelfCensoringInformationRecord(
      baseRecord({
        rediscoveryLoop: {
          lastAlarmWeek: 12,
        } as SelfCensoringInformationRecord['rediscoveryLoop'],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'rediscovery_loop_missing_loop_count')).toBe(
      true
    )
  })

  it('warns when negativeFacts are declared without parentCaseRef', () => {
    const result = validateSelfCensoringInformationRecord(
      baseRecord({
        negativeFacts: [{ predicate: 'assigned_staff_present', scope: 'lab-4' }],
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'negative_facts_without_parent_case_ref',
        severity: 'warning',
      }),
    ])
  })

  it('warns when study_blocked archive lacks mediumIntegrityNotes', () => {
    const result = validateSelfCensoringInformationRecord(
      baseRecord({
        usableArchiveState: 'study_blocked',
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'study_blocked_without_medium_integrity_notes',
        severity: 'warning',
      }),
    ])
  })

  it('errors on franchise label token in record fields', () => {
    const result = validateSelfCensoringInformationRecord(
      baseRecord({
        label: 'SCP division briefing gap',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_label')).toBe(true)
  })

  it('errors on franchise token in projection source summary via validation scan', () => {
    const result = validateSelfCensoringInformationRecord(
      baseRecord({
        summary: 'Mobile Task Force roster inconsistency',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_field')).toBe(true)
  })

  it('round-trips propagationResistance and informationFailureMode unions on validation', () => {
    const record = baseRecord({
      propagationResistance: [...PROPAGATION_RESISTANCE_TAGS],
      informationFailureMode: 'interpretation_fail',
      absenceSignals: ABSENCE_SIGNAL_KINDS.map((kind) => ({
        kind,
        descriptor: `${kind}-descriptor`,
      })),
    })

    const result = validateSelfCensoringInformationRecord(record)

    expect(result.valid).toBe(true)
    expect(record.propagationResistance).toEqual([...PROPAGATION_RESISTANCE_TAGS])
    expect(INFORMATION_FAILURE_MODES).toContain(record.informationFailureMode)
    expect(record.absenceSignals).toHaveLength(ABSENCE_SIGNAL_KINDS.length)
  })

  it('projects contradiction-first dossier view with policy redaction', () => {
    const record = baseRecord({
      summary: 'Routine audit notes',
      confidence: 0.35,
      redactedFields: ['summary', 'confidence'],
      unknownFields: ['confidence'],
      negativeFacts: [{ predicate: 'named_custodian_assigned', scope: 'vault-7' }],
      parentCaseRef: 'case:vault-audit-3',
      absenceSignals: [{ kind: 'empty_budget_line', descriptor: 'Line item present with zero allocation' }],
      usableArchiveState: 'unusable',
    })

    const projection = projectAntimemeticCaseView(record, {
      minimumConfidence: 0.5,
      redactUnknown: true,
      suppressRedactedSummary: true,
    })

    expect(projection.summary).toBeNull()
    expect(projection.confidence).toBeNull()
    expect(projection.redacted).toBe(true)
    expect(projection.archiveUsabilityHint).toBe('unusable')
    expect(projection.contradictionSignals.length).toBeGreaterThan(0)
    expect(projection.contradictionSignals.some((signal) => signal.startsWith('Unverified absence:'))).toBe(
      true
    )
  })

  it('validates untrusted payloads without throwing when fields are missing or nullish', () => {
    const result = validateSelfCensoringInformationRecord({} as SelfCensoringInformationRecord)

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code).sort()).toEqual(['missing_id', 'missing_label'].sort())
  })

  it('produces byte-stable validation output on repeated runs', () => {
    const record = baseRecord({
      negativeFacts: [{ predicate: 'named_lead_present' }],
      retentionDecayTimer: 6,
      rediscoveryLoop: { loopCount: 1, forgottenWarningRefs: ['warning:lead-gap'] },
      usableArchiveState: 'study_blocked',
    })

    const first = JSON.stringify(validateSelfCensoringInformationRecord(record))
    const second = JSON.stringify(validateSelfCensoringInformationRecord(record))

    expect(first).toBe(second)
  })
})
