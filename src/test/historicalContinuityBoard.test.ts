import { describe, expect, it } from 'vitest'
import {
  HISTORICAL_CONTINUITY_BOARD_SCHEMA_VERSION,
  listReadableHistoricalRecords,
  projectHistoricalRecordForPlayer,
  validateHistoricalChronology,
  type HistoricalRecord,
} from '../domain/historicalContinuityBoard'

function record(overrides: Partial<HistoricalRecord> & Pick<HistoricalRecord, 'recordId' | 'eventId' | 'truthLayer'>): HistoricalRecord {
  return {
    schemaVersion: HISTORICAL_CONTINUITY_BOARD_SCHEMA_VERSION,
    provenance: 'seed:test',
    isSeed: true,
    confidence: 0.5,
    ...overrides,
  }
}

describe('SPE-2099 historical continuity board', () => {
  it('allows two incompatible records for the same event with distinct truth layers', () => {
    const publicLayer = record({
      recordId: 'hist:pub-1',
      eventId: 'event:pier',
      truthLayer: 'public_history',
      approximateDate: '1912',
      publicExplanation: 'Industrial accident.',
      contradictionNotes: ['Conflicts with operational account'],
    })
    const operational = record({
      recordId: 'hist:ops-1',
      eventId: 'event:pier',
      truthLayer: 'operational_truth',
      approximateDate: '1912',
      operationalExplanation: 'Anomalous discharge.',
      contradictionNotes: ['Conflicts with public account'],
    })
    const result = validateHistoricalChronology([publicLayer, operational])
    expect(result.ok).toBe(true)
    expect(listReadableHistoricalRecords([publicLayer, operational])).toHaveLength(2)
  })

  it('flags conflicting dates for the same eventId', () => {
    const result = validateHistoricalChronology([
      record({
        recordId: 'hist:a',
        eventId: 'event:same',
        truthLayer: 'public_history',
        approximateDate: '1901',
        contradictionNotes: ['date conflict'],
      }),
      record({
        recordId: 'hist:b',
        eventId: 'event:same',
        truthLayer: 'operational_truth',
        approximateDate: '1910',
        contradictionNotes: ['date conflict'],
      }),
    ])
    expect(result.ok).toBe(false)
    expect(result.diagnostics.some((d) => d.code === 'conflicting_dates')).toBe(true)
  })

  it('preserves prior records under supersession', () => {
    const prior = record({
      recordId: 'hist:prior',
      eventId: 'event:revise',
      truthLayer: 'institutional_record',
      approximateDate: '1920',
      publicExplanation: 'First account',
    })
    const next = record({
      recordId: 'hist:next',
      eventId: 'event:revise',
      truthLayer: 'later_correction',
      approximateDate: '1920',
      supersedesRecordId: 'hist:prior',
      revisionId: 'rev:2',
      publicExplanation: 'Corrected account',
    })
    const result = validateHistoricalChronology([prior, next])
    expect(result.diagnostics.some((d) => d.code === 'stale_record')).toBe(true)
    const readable = listReadableHistoricalRecords([prior, next])
    expect(readable.map((r) => r.recordId)).toEqual(['hist:next', 'hist:prior'])
  })

  it('allows date correction via supersession without conflicting_dates', () => {
    const prior = record({
      recordId: 'hist:wrong-date',
      eventId: 'event:correct',
      truthLayer: 'institutional_record',
      approximateDate: '1910',
    })
    const next = record({
      recordId: 'hist:fixed-date',
      eventId: 'event:correct',
      truthLayer: 'later_correction',
      approximateDate: '1912',
      supersedesRecordId: 'hist:wrong-date',
    })
    const result = validateHistoricalChronology([prior, next])
    expect(result.ok).toBe(true)
    expect(result.diagnostics.some((d) => d.code === 'conflicting_dates')).toBe(false)
    expect(result.diagnostics.some((d) => d.code === 'stale_record')).toBe(true)
  })

  it('does not flag year vs year-month-day at shared year precision', () => {
    const result = validateHistoricalChronology([
      record({
        recordId: 'hist:era',
        eventId: 'event:precision',
        truthLayer: 'public_history',
        approximateDate: '1912',
        contradictionNotes: ['precision'],
      }),
      record({
        recordId: 'hist:day',
        eventId: 'event:precision',
        truthLayer: 'operational_truth',
        approximateDate: '1912-04-15',
        contradictionNotes: ['precision'],
      }),
    ])
    expect(result.ok).toBe(true)
    expect(result.diagnostics.some((d) => d.code === 'conflicting_dates')).toBe(false)
  })

  it('errors on duplicate recordIds', () => {
    const result = validateHistoricalChronology([
      record({
        recordId: 'hist:dup',
        eventId: 'event:a',
        truthLayer: 'public_history',
      }),
      record({
        recordId: 'hist:dup',
        eventId: 'event:b',
        truthLayer: 'operational_truth',
      }),
    ])
    expect(result.ok).toBe(false)
    expect(
      result.diagnostics.some(
        (d) => d.code === 'malformed_record' && d.message.includes('Duplicate'),
      ),
    ).toBe(true)
  })

  it('errors when a record supersedes itself', () => {
    const result = validateHistoricalChronology([
      record({
        recordId: 'hist:self',
        eventId: 'event:self',
        truthLayer: 'later_correction',
        supersedesRecordId: 'hist:self',
      }),
    ])
    expect(result.ok).toBe(false)
    expect(
      result.diagnostics.some(
        (d) =>
          d.code === 'malformed_record' && d.message.includes('cannot supersede itself'),
      ),
    ).toBe(true)
  })

  it('errors when discoveryDate precedes approximateDate', () => {
    const result = validateHistoricalChronology([
      record({
        recordId: 'hist:order',
        eventId: 'event:order',
        truthLayer: 'institutional_record',
        approximateDate: '1920-06-01',
        discoveryDate: '1919-01-01',
      }),
    ])
    expect(result.ok).toBe(false)
    expect(result.diagnostics.some((d) => d.code === 'impossible_order')).toBe(true)
  })

  it('projects for players without operational truth by default', () => {
    const source = record({
      recordId: 'hist:ops-only',
      eventId: 'event:sealed',
      truthLayer: 'operational_truth',
      publicExplanation: 'Public stub',
      operationalExplanation: 'SECRET ops detail',
      contradictionNotes: ['internal note'],
    })
    const projection = projectHistoricalRecordForPlayer(source)
    expect(projection.publicExplanation).toBe('Public stub')
    expect(projection.operationalExplanation).toBeNull()
    expect(projection.contradictionNotes).toEqual([])
  })

  it('errors on auto-resolving contradictions', () => {
    const result = validateHistoricalChronology([
      record({
        recordId: 'hist:auto',
        eventId: 'event:x',
        truthLayer: 'public_history',
        autoResolveContradiction: true,
      }),
    ])
    expect(result.ok).toBe(false)
    expect(result.diagnostics.some((d) => d.code === 'auto_resolve_forbidden')).toBe(
      true,
    )
  })

  it('warns on truth_layer_collapse via historyText without failing ok', () => {
    const result = validateHistoricalChronology([
      record({
        recordId: 'hist:collapse',
        eventId: 'event:y',
        truthLayer: 'public_history',
        historyText: 'One blob replacing layers',
      }),
    ])
    expect(result.ok).toBe(true)
    expect(result.diagnostics.some((d) => d.code === 'truth_layer_collapse')).toBe(
      true,
    )
  })

  it('redacts hostile_dossier projections by default', () => {
    const source = record({
      recordId: 'hist:hostile',
      eventId: 'event:hostile',
      truthLayer: 'hostile_dossier',
      publicExplanation: 'Enemy framing',
      operationalExplanation: 'Should stay hidden',
      contradictionNotes: ['hostile note'],
    })
    const projection = projectHistoricalRecordForPlayer(source)
    expect(projection.redacted).toBe(true)
    expect(projection.publicExplanation).toBeNull()
    expect(projection.operationalExplanation).toBeNull()
    expect(projection.contradictionNotes).toEqual([])
  })

  it('errors when a non-seed record lacks provenance', () => {
    const result = validateHistoricalChronology([
      record({
        recordId: 'hist:custom',
        eventId: 'event:z',
        truthLayer: 'field_hypothesis',
        isSeed: false,
        provenance: '',
      }),
    ])
    expect(result.ok).toBe(false)
    expect(result.diagnostics.some((d) => d.code === 'missing_provenance')).toBe(true)
  })

  it('is byte-stable for repeated validation', () => {
    const batch = [
      record({
        recordId: 'hist:1',
        eventId: 'event:stable',
        truthLayer: 'public_history',
        approximateDate: '1933',
        contradictionNotes: ['note'],
      }),
      record({
        recordId: 'hist:2',
        eventId: 'event:stable',
        truthLayer: 'oral_history',
        approximateDate: '1933',
        contradictionNotes: ['note'],
      }),
    ]
    const a = validateHistoricalChronology(batch)
    const b = validateHistoricalChronology(batch)
    expect(a).toEqual(b)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
