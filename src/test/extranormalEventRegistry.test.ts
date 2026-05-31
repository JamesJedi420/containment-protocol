import { describe, expect, it } from 'vitest'
import {
  AFFECTED_AREA_GEOMETRIES,
  BRIEF_COVER_UP_EVENT_FIXTURE,
  BRIEF_COVER_UP_EVENT_WITH_CLUSTER,
  CLUSTER_SIBLING_EVENT_FIXTURE,
  EFFECT_DOMAIN_TAGS,
  POPULATION_SELECTOR_KINDS,
  projectExtranormalEventForMap,
  validateExtranormalEventRecord,
  type ExtranormalEventRecord,
} from '../domain/extranormalEventRegistry'

function baseRecord(
  overrides: Partial<ExtranormalEventRecord> = {}
): ExtranormalEventRecord {
  return {
    id: 'event:test-base',
    label: 'Test base event',
    occurrenceWindow: { startWeek: 1 },
    effectDomainTags: ['spatial'],
    affectedAreaGeometry: 'room',
    populationSelectors: [{ kind: 'location', value: 'test-room' }],
    ...overrides,
  }
}

describe('extranormalEventRegistry (SPE-2105 slice 1)', () => {
  it('validates brief event fixture with cover story, 6-month monitoring, and sourceless_closed', () => {
    const result = validateExtranormalEventRecord(BRIEF_COVER_UP_EVENT_FIXTURE)

    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
    expect(BRIEF_COVER_UP_EVENT_FIXTURE.coverStoryCode).toBe('maintenance-lamp-test')
    expect(BRIEF_COVER_UP_EVENT_FIXTURE.monitoringUntilWeek).toBe(38)
    expect(BRIEF_COVER_UP_EVENT_FIXTURE.closureState).toBe('sourceless_closed')
    expect(BRIEF_COVER_UP_EVENT_FIXTURE.monitoringUntilWeek! - BRIEF_COVER_UP_EVENT_FIXTURE.occurrenceWindow.startWeek!).toBe(26)
  })

  it('links similarity cluster across two events without shared_source_id', () => {
    const primary = validateExtranormalEventRecord(BRIEF_COVER_UP_EVENT_WITH_CLUSTER)
    const sibling = validateExtranormalEventRecord(CLUSTER_SIBLING_EVENT_FIXTURE)

    expect(primary.valid).toBe(true)
    expect(sibling.valid).toBe(true)

    expect(BRIEF_COVER_UP_EVENT_WITH_CLUSTER.similarEventCluster).toEqual([
      { eventId: 'event:brief-canal-shimmer', confidence: 0.39 },
    ])
    expect(CLUSTER_SIBLING_EVENT_FIXTURE.similarEventCluster).toEqual([
      { eventId: 'event:brief-reservoir-glow', confidence: 0.41 },
    ])

    const primaryIds = BRIEF_COVER_UP_EVENT_WITH_CLUSTER.similarEventCluster!.map((ref) => ref.eventId)
    const siblingIds = CLUSTER_SIBLING_EVENT_FIXTURE.similarEventCluster!.map((ref) => ref.eventId)
    expect(primaryIds).not.toContain('shared_source_id')
    expect(siblingIds).not.toContain('shared_source_id')
  })

  it('round-trips effectDomainTags and populationSelectors on validation', () => {
    const record = baseRecord({
      effectDomainTags: [...EFFECT_DOMAIN_TAGS],
      populationSelectors: POPULATION_SELECTOR_KINDS.map((kind) => ({
        kind,
        value: `${kind}-value`,
      })),
    })

    const result = validateExtranormalEventRecord(record)

    expect(result.valid).toBe(true)
    expect(record.effectDomainTags).toEqual([...EFFECT_DOMAIN_TAGS])
    expect(record.populationSelectors).toHaveLength(POPULATION_SELECTOR_KINDS.length)
  })

  it('warns on closure_collapse when resolved without cover story or monitoring', () => {
    const result = validateExtranormalEventRecord(
      baseRecord({
        resolved: true,
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'closure_collapse',
        severity: 'warning',
      }),
    ])
  })

  it('errors when escalated_to_case lacks target case ref', () => {
    const result = validateExtranormalEventRecord(
      baseRecord({
        closureState: 'escalated_to_case',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'escalated_to_case_missing_target',
        severity: 'error',
      }),
    ])
  })

  it('accepts escalated_to_case when escalatedCaseRef is present', () => {
    const result = validateExtranormalEventRecord(
      baseRecord({
        closureState: 'escalated_to_case',
        escalatedCaseRef: 'case:perimeter-breach-7',
      })
    )

    expect(result.valid).toBe(true)
  })

  it('round-trips optional observer-class and theme/danger metadata', () => {
    const record = baseRecord({
      observerClassTags: ['field-analyst', 'civilian-witness'],
      themeRef: 'theme:transient-glow',
      dangerProfileRef: 'danger:low-transient',
      procedurePatternRefs: ['procedure:monitoring-window'],
      confidence: 0.55,
    })

    const result = validateExtranormalEventRecord(record)

    expect(result.valid).toBe(true)
    expect(record.observerClassTags).toEqual(['field-analyst', 'civilian-witness'])
    expect(record.themeRef).toBe('theme:transient-glow')
    expect(record.dangerProfileRef).toBe('danger:low-transient')
  })

  it('warns when coverStoryCode is declared without witnessPlan', () => {
    const result = validateExtranormalEventRecord(
      baseRecord({
        coverStoryCode: 'routine-maintenance',
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues.some((issue) => issue.code === 'cover_story_without_witness_plan')).toBe(
      true
    )
  })

  it('errors when monitoringUntilWeek is set without closureState', () => {
    const result = validateExtranormalEventRecord(
      baseRecord({
        monitoringUntilWeek: 20,
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'monitoring_without_closure_state')).toBe(
      true
    )
  })

  it('warns when similarEventCluster is present without record confidence', () => {
    const result = validateExtranormalEventRecord(
      baseRecord({
        similarEventCluster: [{ eventId: 'event:other', confidence: 0.3 }],
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues.some((issue) => issue.code === 'similarity_cluster_without_confidence')).toBe(
      true
    )
  })

  it('rejects invalid effectDomainTags and affectedAreaGeometry', () => {
    const result = validateExtranormalEventRecord(
      baseRecord({
        effectDomainTags: ['spatial', 'invalid-tag' as ExtranormalEventRecord['effectDomainTags'][number]],
        affectedAreaGeometry: 'invalid-geometry' as ExtranormalEventRecord['affectedAreaGeometry'],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code).sort()).toEqual(
      ['invalid_affected_area_geometry', 'invalid_effect_domain_tag'].sort()
    )
  })

  it('exposes canonical geometry values', () => {
    expect(AFFECTED_AREA_GEOMETRIES).toContain('broadcast_reach')
    expect(AFFECTED_AREA_GEOMETRIES).toContain('worldwide')
  })

  it('projects record-derived location and confidence for map surfaces', () => {
    const projection = projectExtranormalEventForMap(BRIEF_COVER_UP_EVENT_FIXTURE)

    expect(projection).toEqual({
      eventId: 'event:brief-reservoir-glow',
      locationTag: 'site:north-reservoir',
      affectedAreaGeometry: 'radius',
      confidence: 0.62,
      redacted: false,
      unknownFields: [],
    })
  })

  it('respects map projection policy minimum confidence and redaction', () => {
    const redactedRecord = baseRecord({
      locationTag: 'site:restricted',
      confidence: 0.4,
      redactedFields: ['locationTag'],
      unknownFields: ['confidence'],
    })

    const projection = projectExtranormalEventForMap(redactedRecord, {
      minimumConfidence: 0.5,
      redactUnknown: true,
      suppressRedactedLocation: true,
    })

    expect(projection.locationTag).toBeNull()
    expect(projection.confidence).toBeNull()
    expect(projection.redacted).toBe(true)
    expect(projection.unknownFields).toEqual(['confidence'])
  })

  it('suppresses confidence when redactedFields includes confidence', () => {
    const projection = projectExtranormalEventForMap(
      baseRecord({
        confidence: 0.82,
        redactedFields: ['confidence'],
      })
    )

    expect(projection.confidence).toBeNull()
    expect(projection.redacted).toBe(true)
  })

  it('validates untrusted payloads without throwing when fields are missing or nullish', () => {
    const result = validateExtranormalEventRecord({} as ExtranormalEventRecord)

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code).sort()).toEqual(
      [
        'invalid_affected_area_geometry',
        'invalid_occurrence_window',
        'missing_id',
        'missing_label',
      ].sort()
    )
  })

  it('produces byte-stable validation output on repeated runs', () => {
    const record = baseRecord({
      resolved: true,
      coverStoryCode: 'maintenance-cover',
      monitoringUntilWeek: 30,
      closureState: 'monitor_only',
      similarEventCluster: [{ eventId: 'event:peer' }],
    })

    const first = JSON.stringify(validateExtranormalEventRecord(record))
    const second = JSON.stringify(validateExtranormalEventRecord(record))

    expect(first).toBe(second)
  })
})
