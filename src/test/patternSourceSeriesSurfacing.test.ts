import { describe, expect, it } from 'vitest'

import type { PatternSourceSeriesRecord } from '../domain/patternSourceSeriesRegistry'
import { SERIES_HUB_OPEN_ENTRY_FIXTURE } from '../domain/patternSourceSeriesRegistry'
import { advancePatternSourceSeriesRecordForWeek } from '../domain/patternSourceSeriesWeeklyIntake'
import {
  composePatternSourceSeriesWeeklyTransitionSummaries,
  formatPatternSourceSeriesWeeklyTransitionNoteContent,
} from '../domain/patternSourceSeriesSurfacing'
import { buildWeeklyPatternSourceSeriesTransitionReportNotes } from '../domain/patternSourceSeriesWeeklyReportNotes'

function unqueuedRecord(): PatternSourceSeriesRecord {
  return {
    id: 'pattern-series:surfacing-unqueued',
    slug: 'surfacing-unqueued',
    title: 'Surfacing unqueued intake record',
    sourceFamily: 'meta_hub',
    publicationOrder: '2025-06-01',
    processingStatus: 'unqueued',
    readinessScore: 0.45,
  }
}

describe('patternSourceSeriesSurfacing (SPE-2497 slice 5)', () => {
  it('returns no summaries for empty maps', () => {
    expect(
      composePatternSourceSeriesWeeklyTransitionSummaries({
        priorRecords: {},
        nextRecords: {},
      })
    ).toEqual([])
  })

  it('returns no summaries when records are unchanged', () => {
    const record = unqueuedRecord()

    expect(
      composePatternSourceSeriesWeeklyTransitionSummaries({
        priorRecords: { [record.id]: record },
        nextRecords: { [record.id]: record },
      })
    ).toEqual([])
  })

  it('surfaces processing status and readiness transitions', () => {
    const priorRecord = unqueuedRecord()
    const nextRecord = advancePatternSourceSeriesRecordForWeek(priorRecord, 16)

    const summaries = composePatternSourceSeriesWeeklyTransitionSummaries({
      priorRecords: { [priorRecord.id]: priorRecord },
      nextRecords: { [priorRecord.id]: nextRecord },
    })

    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.transitionKinds).toContain('processing_status_advanced')
    expect(summaries[0]?.transitionKinds).toContain('readiness_score_changed')
    expect(summaries[0]?.nextProcessingStatus).toBe('blurb_triaged')
    expect(summaries[0]?.nextReadinessScore).toBeCloseTo(0.15, 5)
    expect(formatPatternSourceSeriesWeeklyTransitionNoteContent(summaries[0]!)).toContain(
      priorRecord.title
    )
    expect(formatPatternSourceSeriesWeeklyTransitionNoteContent(summaries[0]!)).toContain(
      'Blurb Triaged'
    )
  })

  it('returns no summaries for terminal reconciled fixture unchanged', () => {
    const record = SERIES_HUB_OPEN_ENTRY_FIXTURE

    expect(
      composePatternSourceSeriesWeeklyTransitionSummaries({
        priorRecords: { [record.id]: record },
        nextRecords: { [record.id]: record },
      })
    ).toEqual([])
  })
})

describe('patternSourceSeriesWeeklyReportNotes (SPE-2497 slice 5)', () => {
  it('returns no notes when no transitions occur', () => {
    const record = unqueuedRecord()

    expect(
      buildWeeklyPatternSourceSeriesTransitionReportNotes({
        priorRecords: { [record.id]: record },
        nextRecords: { [record.id]: record },
        week: 16,
        sequenceStart: 1,
      })
    ).toEqual([])
  })

  it('emits typed weekly transition notes for pipeline advance', () => {
    const priorRecord = unqueuedRecord()
    const nextRecord = advancePatternSourceSeriesRecordForWeek(priorRecord, 16)

    const notes = buildWeeklyPatternSourceSeriesTransitionReportNotes({
      priorRecords: { [priorRecord.id]: priorRecord },
      nextRecords: { [priorRecord.id]: nextRecord },
      week: 16,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('pattern_source_series.weekly_transition')
    expect(notes[0]?.metadata?.recordId).toBe(priorRecord.id)
    expect(notes[0]?.content).toContain('Blurb Triaged')
  })
})
