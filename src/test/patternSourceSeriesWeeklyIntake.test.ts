import { describe, expect, it } from 'vitest'
import {
  EXPRESSION_RISK_PROVISIONAL_FIXTURE,
  HIGH_READINESS_QUEUE_FIXTURE,
  SERIES_HUB_OPEN_ENTRY_FIXTURE,
  type PatternSourceSeriesRecord,
} from '../domain/patternSourceSeriesRegistry'
import {
  advancePatternSourceSeriesRecordForWeek,
  applyWeeklyPatternSourceSeriesIntakeTick,
  resolvePatternSourceSeriesPipelineNextStatus,
  resolvePatternSourceSeriesReadinessGate,
} from '../domain/patternSourceSeriesWeeklyIntake'

function unqueuedRecord(
  overrides: Partial<PatternSourceSeriesRecord> = {}
): PatternSourceSeriesRecord {
  return {
    id: 'pattern-series:unqueued-intake-test',
    slug: 'unqueued-intake-test',
    title: 'Unqueued intake test cluster',
    sourceFamily: 'series_hub',
    publicationOrder: '2025-01-01',
    processingStatus: 'unqueued',
    readinessScore: 0.4,
    ...overrides,
  }
}

describe('patternSourceSeriesWeeklyIntake (SPE-2110 slice 3)', () => {
  it('is a no-op for an empty map without throwing', () => {
    expect(applyWeeklyPatternSourceSeriesIntakeTick({}, 12)).toEqual({})
    expect(applyWeeklyPatternSourceSeriesIntakeTick(undefined, 12)).toEqual({})
  })

  it('resolves pipeline next status and readiness gates', () => {
    expect(resolvePatternSourceSeriesPipelineNextStatus('unqueued')).toBe('blurb_triaged')
    expect(resolvePatternSourceSeriesPipelineNextStatus('reconciled')).toBeUndefined()
    expect(resolvePatternSourceSeriesReadinessGate('deep_pass')).toBe(0.5)
  })

  it('leaves record unchanged when readiness is below the gate', () => {
    const record = unqueuedRecord({ readinessScore: 0.05 })
    const advanced = advancePatternSourceSeriesRecordForWeek(record, 12)

    expect(advanced).toBe(record)
    expect(advanced.processingStatus).toBe('unqueued')
  })

  it('advances one pipeline step and decrements readiness when gate passes', () => {
    const record = unqueuedRecord({ readinessScore: 0.4 })
    const advanced = advancePatternSourceSeriesRecordForWeek(record, 12)

    expect(advanced).not.toBe(record)
    expect(advanced.processingStatus).toBe('blurb_triaged')
    expect(advanced.readinessScore).toBeCloseTo(0.1, 5)
    expect(advanced.processingHistory).toEqual(['blurb_triaged'])
  })

  it('is idempotent when re-applied after pipeline advance for the same week', () => {
    const record = unqueuedRecord({ readinessScore: 0.4 })
    const once = advancePatternSourceSeriesRecordForWeek(record, 12)
    const twice = advancePatternSourceSeriesRecordForWeek(once, 12)

    expect(twice).toBe(once)
    expect(twice.processingStatus).toBe('blurb_triaged')
  })

  it('preserves terminal reconciled fixture without mutation', () => {
    const advanced = advancePatternSourceSeriesRecordForWeek(SERIES_HUB_OPEN_ENTRY_FIXTURE, 30)

    expect(advanced).toBe(SERIES_HUB_OPEN_ENTRY_FIXTURE)
  })

  it('preserves expression-risk provisional fixture when readiness is below the next gate', () => {
    const record = {
      ...EXPRESSION_RISK_PROVISIONAL_FIXTURE,
      readinessScore: 0.2,
    }
    const advanced = advancePatternSourceSeriesRecordForWeek(record, 12)

    expect(advanced).toBe(record)
  })

  it('does not mutate invalid post-tick records', () => {
    const record = unqueuedRecord({
      readinessScore: 0.9,
      processingHistory: ['not_a_status' as PatternSourceSeriesRecord['processingStatus']],
    })

    const advanced = advancePatternSourceSeriesRecordForWeek(record, 12)

    expect(advanced).toBe(record)
  })

  it('does not mutate records when processingHistory mismatches current status', () => {
    const record = unqueuedRecord({
      processingHistory: ['blurb_triaged'],
    })

    const advanced = advancePatternSourceSeriesRecordForWeek(record, 12)

    expect(advanced).toBe(record)
  })

  it('advances deep_pass to reconciled when readiness gate passes', () => {
    const record = {
      ...HIGH_READINESS_QUEUE_FIXTURE,
      processingHistory: ['unqueued', 'blurb_triaged', 'deep_pass'],
      readinessScore: 0.91,
    }
    const advanced = advancePatternSourceSeriesRecordForWeek(record, 20)

    expect(advanced).not.toBe(record)
    expect(advanced.processingStatus).toBe('reconciled')
    expect(advanced.readinessScore).toBeCloseTo(0.61, 5)
  })

  it('applies tick in stable id order without mutating unrelated records', () => {
    const active = unqueuedRecord()
    const terminal = SERIES_HUB_OPEN_ENTRY_FIXTURE
    const map = {
      [terminal.id]: terminal,
      [active.id]: active,
    }

    const next = applyWeeklyPatternSourceSeriesIntakeTick(map, 12)

    expect(next[terminal.id]).toBe(terminal)
    expect(next[active.id]?.processingStatus).toBe('blurb_triaged')
  })
})
