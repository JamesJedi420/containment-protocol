import { describe, expect, it } from 'vitest'
import {
  ANTI_NARRATIVE_COLLAPSE_MODES,
  ANTI_NARRATIVE_COUNTERMEASURE_STATES,
  CAUSALITY_GAP_QUARANTINE_FIXTURE,
  COHERENCE_DECAY_LAG_FIXTURE,
  projectRecordIntegrityLoss,
  validateAntiNarrativeCollapseRecord,
  type AntiNarrativeCollapseRecord,
} from '../domain/antiNarrativeRecordCollapseRegistry'

function baseRecord(
  overrides: Partial<AntiNarrativeCollapseRecord> = {}
): AntiNarrativeCollapseRecord {
  return {
    id: 'anti-narrative:test-base',
    label: 'Test anti-narrative collapse',
    collapseMode: 'report_unwrite',
    affectedMediaRefs: ['media:test-briefing'],
    coherenceScore: 0.6,
    detectionLagWeeks: 1,
    countermeasureState: 'none',
    ...overrides,
  }
}

describe('antiNarrativeRecordCollapseRegistry (SPE-2119 slice 1)', () => {
  it('validates causality_gap fixture with quarantine_corpus countermeasure', () => {
    const result = validateAntiNarrativeCollapseRecord(CAUSALITY_GAP_QUARANTINE_FIXTURE)

    expect(result.valid).toBe(true)
    expect(CAUSALITY_GAP_QUARANTINE_FIXTURE.collapseMode).toBe('causality_gap')
    expect(CAUSALITY_GAP_QUARANTINE_FIXTURE.countermeasureState).toBe('quarantine_corpus')
  })

  it('projects symptom-first media entries for quarantined causality gap', () => {
    const projection = projectRecordIntegrityLoss(CAUSALITY_GAP_QUARANTINE_FIXTURE, {
      currentWeek: 6,
    })

    expect(projection.mediaSymptoms).toHaveLength(2)
    expect(projection.mediaSymptoms[0]?.symptomDescriptor).toContain(
      'Causality cross-reference drift reported for'
    )
    expect(projection.projectedCoherenceScore).toBeGreaterThan(0.5)
    expect(projection.redacted).toBe(false)
  })

  it('decays coherenceScore only after detectionLagWeeks elapse', () => {
    const atLag = projectRecordIntegrityLoss(COHERENCE_DECAY_LAG_FIXTURE, { currentWeek: 4 })
    const afterLag = projectRecordIntegrityLoss(COHERENCE_DECAY_LAG_FIXTURE, { currentWeek: 8 })

    expect(atLag.projectedCoherenceScore).toBe(0.85)
    expect(afterLag.projectedCoherenceScore).toBeLessThan(0.85)
    expect(afterLag.degradationBand).toBe('eroding')
  })

  it('warns when failed countermeasure lacks documented attempt refs', () => {
    const result = validateAntiNarrativeCollapseRecord(
      baseRecord({
        countermeasureState: 'failed',
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'failed_countermeasure_without_documented_attempt',
        severity: 'warning',
      }),
    ])
  })

  it('errors on coherenceScore out of range', () => {
    const result = validateAntiNarrativeCollapseRecord(
      baseRecord({
        coherenceScore: 1.4,
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'invalid_coherence_score')).toBe(true)
  })

  it('errors on franchise token in record id', () => {
    const result = validateAntiNarrativeCollapseRecord(
      baseRecord({
        id: 'anti-narrative:foundation-report-collapse',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_id')).toBe(true)
  })

  it('errors on branded object number in affectedMediaRefs', () => {
    const result = validateAntiNarrativeCollapseRecord(
      baseRecord({
        affectedMediaRefs: ['media:SCP-173 briefing excerpt'],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'branded_object_number_in_field')).toBe(
      true
    )
  })

  it('redacts media symptoms when policy requests unknown redaction', () => {
    const projection = projectRecordIntegrityLoss(
      {
        ...CAUSALITY_GAP_QUARANTINE_FIXTURE,
        unknownFields: ['affectedMediaRefs'],
      },
      {
        redactUnknown: true,
      }
    )

    expect(projection.mediaSymptoms).toHaveLength(0)
    expect(projection.redacted).toBe(true)
  })

  it('suppresses surface hints when hidden conflict labels are suppressed', () => {
    const projection = projectRecordIntegrityLoss(CAUSALITY_GAP_QUARANTINE_FIXTURE, {
      suppressHiddenConflictLabels: true,
    })

    expect(projection.mediaSymptoms.every((entry) => entry.surfaceHint === null)).toBe(true)
  })

  it('returns byte-stable validation results on repeated calls', () => {
    const first = validateAntiNarrativeCollapseRecord(CAUSALITY_GAP_QUARANTINE_FIXTURE)
    const second = validateAntiNarrativeCollapseRecord(CAUSALITY_GAP_QUARANTINE_FIXTURE)

    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it('sets projection redacted when coherenceScore is redacted', () => {
    const projection = projectRecordIntegrityLoss({
      ...COHERENCE_DECAY_LAG_FIXTURE,
      redactedFields: ['coherenceScore'],
    })

    expect(projection.projectedCoherenceScore).toBeNull()
    expect(projection.redacted).toBe(true)
  })

  it('exports stable union catalogs', () => {
    expect(ANTI_NARRATIVE_COLLAPSE_MODES).toEqual([
      'causality_gap',
      'character_erasure',
      'plot_hole',
      'report_unwrite',
    ])
    expect(ANTI_NARRATIVE_COUNTERMEASURE_STATES).toEqual([
      'none',
      'patch_narrative',
      'quarantine_corpus',
      'failed',
    ])
  })
})
