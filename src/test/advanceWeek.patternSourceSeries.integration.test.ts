import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  EXPRESSION_RISK_PROVISIONAL_FIXTURE,
  SERIES_HUB_OPEN_ENTRY_FIXTURE,
  type PatternSourceSeriesRecord,
} from '../domain/patternSourceSeriesRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

function unqueuedRecord(): PatternSourceSeriesRecord {
  return {
    id: 'pattern-series:advance-week-unqueued',
    slug: 'advance-week-unqueued',
    title: 'Advance week unqueued intake record',
    sourceFamily: 'meta_hub',
    publicationOrder: '2025-06-01',
    processingStatus: 'unqueued',
    readinessScore: 0.45,
  }
}

describe('advanceWeek pattern source series integration (SPE-2110 slice 3 / SPE-2497 slice 5)', () => {
  it('is a no-op for an empty pattern source series map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.patternSourceSeriesRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.patternSourceSeriesRecords).toEqual({})
  })

  it('advances readiness-gated pipeline step after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    const record = unqueuedRecord()
    state.patternSourceSeriesRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const nextRecord = nextState.patternSourceSeriesRecords?.[record.id]

    expect(nextRecord?.processingStatus).toBe('blurb_triaged')
    expect(nextRecord?.readinessScore).toBeCloseTo(0.15, 5)
    expect(nextRecord?.processingHistory).toEqual(['blurb_triaged'])
  })

  it('leaves record unchanged when readiness is below gate after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    const record = { ...unqueuedRecord(), readinessScore: 0.05 }
    state.patternSourceSeriesRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const nextRecord = nextState.patternSourceSeriesRecords?.[record.id]

    expect(nextRecord?.processingStatus).toBe('unqueued')
    expect(nextRecord?.readinessScore).toBe(0.05)
  })

  it('preserves terminal reconciled fixture byte-stable through advanceWeek tick', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.patternSourceSeriesRecords = {
      [SERIES_HUB_OPEN_ENTRY_FIXTURE.id]: SERIES_HUB_OPEN_ENTRY_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const record = nextState.patternSourceSeriesRecords?.[SERIES_HUB_OPEN_ENTRY_FIXTURE.id]

    expect(record).toEqual(SERIES_HUB_OPEN_ENTRY_FIXTURE)
  })

  it('preserves expression-risk provisional fixture when readiness is below the next gate', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    const record = {
      ...EXPRESSION_RISK_PROVISIONAL_FIXTURE,
      readinessScore: 0.2,
    }
    state.patternSourceSeriesRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const nextRecord = nextState.patternSourceSeriesRecords?.[record.id]

    expect(nextRecord).toEqual(record)
  })

  it('surfaces weekly transition notes when pipeline advances after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    const record = unqueuedRecord()
    state.patternSourceSeriesRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const transitionNotes =
      nextState.reports[nextState.reports.length - 1]?.notes?.filter(
        (note) => note.type === 'pattern_source_series.weekly_transition'
      ) ?? []

    expect(transitionNotes.length).toBeGreaterThan(0)
    expect(transitionNotes[0]?.content).toContain(record.title)
    expect(transitionNotes[0]?.content).toContain('Blurb Triaged')
  })

  it('does not surface weekly transition notes when registry map is empty', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.patternSourceSeriesRecords = {}

    const nextState = advanceWeek(state)
    const transitionNotes =
      nextState.reports[nextState.reports.length - 1]?.notes?.filter(
        (note) => note.type === 'pattern_source_series.weekly_transition'
      ) ?? []

    expect(transitionNotes).toEqual([])
  })

  it('does not surface weekly transition notes when readiness is below gate', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    const record = { ...unqueuedRecord(), readinessScore: 0.05 }
    state.patternSourceSeriesRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const transitionNotes =
      nextState.reports[nextState.reports.length - 1]?.notes?.filter(
        (note) => note.type === 'pattern_source_series.weekly_transition'
      ) ?? []

    expect(transitionNotes).toEqual([])
  })

  it('does not surface weekly transition notes for terminal reconciled fixture', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.patternSourceSeriesRecords = {
      [SERIES_HUB_OPEN_ENTRY_FIXTURE.id]: SERIES_HUB_OPEN_ENTRY_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const transitionNotes =
      nextState.reports[nextState.reports.length - 1]?.notes?.filter(
        (note) => note.type === 'pattern_source_series.weekly_transition'
      ) ?? []

    expect(transitionNotes).toEqual([])
  })

  it('does not re-emit transition notes when records are unchanged on re-tick', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    const record = unqueuedRecord()
    state.patternSourceSeriesRecords = {
      [record.id]: record,
    }

    const firstWeek = advanceWeek(state)
    const secondWeek = advanceWeek(firstWeek)
    const transitionNotes =
      secondWeek.reports[secondWeek.reports.length - 1]?.notes?.filter(
        (note) => note.type === 'pattern_source_series.weekly_transition'
      ) ?? []

    expect(transitionNotes).toEqual([])
  })
})
