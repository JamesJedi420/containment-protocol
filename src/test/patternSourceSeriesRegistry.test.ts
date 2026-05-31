import { describe, expect, it } from 'vitest'
import {
  BLURB_DOMAIN_HINTS,
  EXPRESSION_RISK_PROVISIONAL_FIXTURE,
  HIGH_READINESS_QUEUE_FIXTURE,
  LOW_READINESS_RECENT_QUEUE_FIXTURE,
  SERIES_HUB_OPEN_ENTRY_FIXTURE,
  SOURCE_FAMILIES,
  classifyBlurbDomains,
  projectSeriesProcessingQueue,
  validatePatternSourceSeriesRecord,
  type PatternSourceSeriesRecord,
} from '../domain/patternSourceSeriesRegistry'

function baseRecord(
  overrides: Partial<PatternSourceSeriesRecord> = {}
): PatternSourceSeriesRecord {
  return {
    id: 'pattern-series:test-base',
    slug: 'test-base',
    title: 'Test base record',
    sourceFamily: 'single_article',
    publicationOrder: '2020-01-01',
    processingStatus: 'unqueued',
    readinessScore: 0.5,
    ...overrides,
  }
}

describe('patternSourceSeriesRegistry (SPE-2110 slice 1)', () => {
  it('validates series_hub fixture with open_entry and completed editorial flags coexisting', () => {
    const result = validatePatternSourceSeriesRecord(SERIES_HUB_OPEN_ENTRY_FIXTURE)

    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
    expect(SERIES_HUB_OPEN_ENTRY_FIXTURE.editorialStatus).toEqual(
      expect.arrayContaining(['open_entry', 'completed'])
    )
    expect(SERIES_HUB_OPEN_ENTRY_FIXTURE.sourceFamily).toBe('series_hub')
  })

  it('preserves crossClusterReinforcementRef as hook only on series hub fixture', () => {
    expect(SERIES_HUB_OPEN_ENTRY_FIXTURE.crossClusterReinforcementRef).toMatch(/^reinforcement:/)
    expect(SERIES_HUB_OPEN_ENTRY_FIXTURE.linkedClusterIds).toHaveLength(2)

    const result = validatePatternSourceSeriesRecord(SERIES_HUB_OPEN_ENTRY_FIXTURE)
    expect(result.valid).toBe(true)
  })

  it('ranks high readinessScore above newer publicationOrder in queue projection', () => {
    const projection = projectSeriesProcessingQueue([
      LOW_READINESS_RECENT_QUEUE_FIXTURE,
      HIGH_READINESS_QUEUE_FIXTURE,
    ])

    expect(projection.entries).toHaveLength(2)
    expect(projection.entries[0]?.recordId).toBe(HIGH_READINESS_QUEUE_FIXTURE.id)
    expect(projection.entries[0]?.readinessScore).toBeGreaterThan(
      projection.entries[1]?.readinessScore ?? 0
    )
    expect(projection.entries[1]?.publicationOrder).toBe('2026-01-15')
  })

  it('errors on imported organization name in title field', () => {
    const result = validatePatternSourceSeriesRecord(
      baseRecord({
        title: 'Field guide — Global Occult Coalition liaison patterns',
      })
    )

    expect(result.valid).toBe(false)
    expect(
      result.issues.some((issue) => issue.code === 'imported_organization_name_in_cp_field')
    ).toBe(true)
  })

  it('errors on source-specific character identity in CP-neutral descriptionStub', () => {
    const result = validatePatternSourceSeriesRecord(
      baseRecord({
        descriptionStub: 'Follow Agent Marcus Hale through the breach response sequence.',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'imported_character_identity_in_cp_field',
        severity: 'error',
      }),
    ])
  })

  it('warns when expression-risk flags lack normalizationNote and stays provisional', () => {
    const result = validatePatternSourceSeriesRecord(EXPRESSION_RISK_PROVISIONAL_FIXTURE)

    expect(result.valid).toBe(true)
    expect(EXPRESSION_RISK_PROVISIONAL_FIXTURE.adaptation?.normalizationState).toBe('provisional')
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'expression_risk_without_normalization_note',
        severity: 'warning',
      }),
    ])
  })

  it('errors when implementation_ready is set with unresolved expression risks', () => {
    const result = validatePatternSourceSeriesRecord(
      baseRecord({
        adaptation: {
          normalizationState: 'implementation_ready',
          expressionRiskFlags: ['character_identity'],
        },
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code).sort()).toEqual(
      [
        'expression_risk_without_normalization_note',
        'implementation_ready_with_unresolved_expression_risk',
      ].sort()
    )
  })

  it('classifies blurb domains as routing hints only', () => {
    const hints = classifyBlurbDomains({
      title: 'Facility disaster response and personnel ethics review',
      descriptionStub: 'Occult ritual exposure during containment breach media cycle.',
      dedicatedTag: 'faction-disclosure',
    })

    expect(hints).toEqual(
      expect.arrayContaining(['facility', 'disaster', 'personnel', 'ethics', 'occult', 'media'])
    )
    expect(hints.length).toBeLessThanOrEqual(BLURB_DOMAIN_HINTS.length)
    expect([...hints].sort()).toEqual([...hints])
  })

  it('returns empty blurb domain hints for empty stub', () => {
    expect(classifyBlurbDomains({})).toEqual([])
  })

  it('warns on canon_hub source family for series archive intake', () => {
    const result = validatePatternSourceSeriesRecord(
      baseRecord({
        sourceFamily: 'canon_hub',
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'canon_hub_on_series_archive_intake',
        severity: 'warning',
      }),
    ])
  })

  it('warns when deep_pass lacks prior blurb_triaged in history', () => {
    const result = validatePatternSourceSeriesRecord(
      baseRecord({
        processingStatus: 'deep_pass',
        processingHistory: ['unqueued'],
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'deep_pass_without_blurb_triaged',
        severity: 'warning',
      }),
    ])
  })

  it('warns when publication date is marked as implementation priority', () => {
    const result = validatePatternSourceSeriesRecord(
      baseRecord({
        implementationPriorityByPublicationOrder: true,
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'publication_order_priority_misuse',
        severity: 'warning',
      }),
    ])
  })

  it('errors on branded or franchise label token in title', () => {
    const result = validatePatternSourceSeriesRecord(
      baseRecord({
        title: 'Review notes for SCP-173 containment pattern',
      })
    )

    expect(result.valid).toBe(false)
    expect(
      result.issues.some(
        (issue) =>
          issue.code === 'branded_label_token_in_cp_field' ||
          issue.code === 'franchise_token_in_title' ||
          issue.code === 'franchise_token_in_field'
      )
    ).toBe(true)
  })

  it('excludes rejected processing statuses from queue projection when configured', () => {
    const projection = projectSeriesProcessingQueue(
      [
        HIGH_READINESS_QUEUE_FIXTURE,
        baseRecord({
          id: 'pattern-series:rejected-packet',
          slug: 'rejected-packet',
          processingStatus: 'rejected',
          readinessScore: 0.99,
        }),
      ],
      { excludeProcessingStatuses: ['rejected'] }
    )

    expect(projection.entries).toHaveLength(1)
    expect(projection.entries[0]?.recordId).toBe(HIGH_READINESS_QUEUE_FIXTURE.id)
  })

  it('round-trips sourceFamily union on validation', () => {
    const record = baseRecord({ sourceFamily: 'meta_hub' })
    const result = validatePatternSourceSeriesRecord(record)

    expect(result.valid).toBe(true)
    expect(SOURCE_FAMILIES).toContain(record.sourceFamily)
  })

  it('validates untrusted payloads without throwing when fields are missing', () => {
    const result = validatePatternSourceSeriesRecord({} as PatternSourceSeriesRecord)

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code).sort()).toEqual(
      [
        'invalid_publication_order',
        'invalid_processing_status',
        'invalid_readiness_score',
        'invalid_source_family',
        'missing_id',
        'missing_slug',
        'missing_title',
      ].sort()
    )
  })

  it('produces byte-stable validation output on repeated runs', () => {
    const record = baseRecord({
      processingStatus: 'deep_pass',
      processingHistory: ['unqueued'],
      implementationPriorityByPublicationOrder: true,
    })

    const first = JSON.stringify(validatePatternSourceSeriesRecord(record))
    const second = JSON.stringify(validatePatternSourceSeriesRecord(record))

    expect(first).toBe(second)
  })

  it('produces byte-stable queue projection on repeated runs', () => {
    const records = [
      LOW_READINESS_RECENT_QUEUE_FIXTURE,
      HIGH_READINESS_QUEUE_FIXTURE,
      SERIES_HUB_OPEN_ENTRY_FIXTURE,
    ]

    const first = JSON.stringify(projectSeriesProcessingQueue(records))
    const second = JSON.stringify(projectSeriesProcessingQueue(records))

    expect(first).toBe(second)
  })
})
