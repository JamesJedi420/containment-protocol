import { describe, expect, it } from 'vitest'
import {
  DISPOSITION_CHAIN_ITEM_FIXTURE,
  FALSE_POSITIVE_ITEM_FIXTURE,
  type MinorAnomalyRecord,
} from '../domain/minorAnomalyItemRegistry'
import {
  advanceMinorAnomalyItemRecordDispositionForWeek,
  applyWeeklyMinorAnomalyItemDispositionTick,
  resolveMinorAnomalyCustodyReviewDueWeek,
} from '../domain/minorAnomalyItemWeeklyDisposition'

function intakeRecord(overrides: Partial<MinorAnomalyRecord> = {}): MinorAnomalyRecord {
  return {
    id: 'item:intake-test',
    label: 'Intake test item',
    disposition: 'recovered',
    latentRiskScore: 8,
    staffNoteProvenance: [{ noteRef: 'note:intake-1', week: 10 }],
    ...overrides,
  }
}

describe('minorAnomalyItemWeeklyDisposition (SPE-2104 slice 3)', () => {
  it('is a no-op for an empty map without throwing', () => {
    expect(applyWeeklyMinorAnomalyItemDispositionTick({}, 12)).toEqual({})
    expect(applyWeeklyMinorAnomalyItemDispositionTick(undefined, 12)).toEqual({})
  })

  it('resolves custody review due week from staff note provenance', () => {
    const record = intakeRecord({
      staffNoteProvenance: [
        { noteRef: 'note:a', week: 4 },
        { noteRef: 'note:b', week: 9 },
      ],
    })

    expect(resolveMinorAnomalyCustodyReviewDueWeek(record)).toBe(9)
  })

  it('leaves disposition unchanged while week is before the due week', () => {
    const record = intakeRecord({ disposition: 'pending_review' })
    const advanced = advanceMinorAnomalyItemRecordDispositionForWeek(record, 9)

    expect(advanced).toBe(record)
    expect(advanced.disposition).toBe('pending_review')
  })

  it('advances recovered to pending_review when week reaches the due week', () => {
    const record = intakeRecord()
    const advanced = advanceMinorAnomalyItemRecordDispositionForWeek(record, 10)

    expect(advanced).not.toBe(record)
    expect(advanced.disposition).toBe('pending_review')
    expect(advanced.statusHistory).toEqual([
      {
        fromDisposition: 'recovered',
        toDisposition: 'pending_review',
        week: 10,
        note: 'Weekly custody review disposition advance.',
      },
    ])
  })

  it('advances pending_review to stored on a later week with one step per tick', () => {
    const record = intakeRecord({ disposition: 'pending_review' })
    const advanced = advanceMinorAnomalyItemRecordDispositionForWeek(record, 10)

    expect(advanced.disposition).toBe('stored')
    expect(advanced.statusHistory?.[0]?.toDisposition).toBe('stored')
  })

  it('applies legacy status as the scheduled target disposition', () => {
    const record = intakeRecord({
      disposition: 'pending_review',
      status: 'assigned',
      staffNoteProvenance: [{ noteRef: 'note:route-1', week: 8 }],
    })

    const advanced = advanceMinorAnomalyItemRecordDispositionForWeek(record, 8)

    expect(advanced.disposition).toBe('assigned')
    expect(advanced.status).toBeUndefined()
    expect(advanced.statusHistory).toEqual([
      {
        fromDisposition: 'pending_review',
        toDisposition: 'assigned',
        week: 8,
        note: 'Weekly custody review disposition advance.',
      },
    ])
  })

  it('does not advance destroyed without authorization when policy would fail', () => {
    const record = intakeRecord({
      disposition: 'pending_review',
      status: 'destroyed',
      staffNoteProvenance: [{ noteRef: 'note:destroy-route', week: 5 }],
    })

    const advanced = advanceMinorAnomalyItemRecordDispositionForWeek(record, 5)

    expect(advanced).toBe(record)
  })

  it('is idempotent when re-applied after disposition has advanced', () => {
    const record = intakeRecord()
    const once = advanceMinorAnomalyItemRecordDispositionForWeek(record, 11)
    const twice = advanceMinorAnomalyItemRecordDispositionForWeek(once, 11)

    expect(twice).toBe(once)
  })

  it('appends history without rewriting prior entries', () => {
    const record = intakeRecord({
      disposition: 'stored',
      statusHistory: [
        { fromDisposition: 'recovered', toDisposition: 'stored', week: 9, note: 'Logged in vault.' },
      ],
      staffNoteProvenance: [{ noteRef: 'note:follow-up', week: 12 }],
      status: 'assigned',
    })

    const advanced = advanceMinorAnomalyItemRecordDispositionForWeek(record, 12)

    expect(advanced.statusHistory).toEqual([
      { fromDisposition: 'recovered', toDisposition: 'stored', week: 9, note: 'Logged in vault.' },
      {
        fromDisposition: 'stored',
        toDisposition: 'assigned',
        week: 12,
        note: 'Weekly custody review disposition advance.',
      },
    ])
  })

  it('leaves terminal fixture records unchanged', () => {
    const chain = advanceMinorAnomalyItemRecordDispositionForWeek(DISPOSITION_CHAIN_ITEM_FIXTURE, 50)
    const falsePositive = advanceMinorAnomalyItemRecordDispositionForWeek(
      FALSE_POSITIVE_ITEM_FIXTURE,
      50
    )

    expect(chain).toBe(DISPOSITION_CHAIN_ITEM_FIXTURE)
    expect(falsePositive).toBe(FALSE_POSITIVE_ITEM_FIXTURE)
  })

  it('applies tick in stable id order without mutating unrelated records', () => {
    const dueRecord = intakeRecord({ id: 'item:due', disposition: 'pending_review' })
    const terminalRecord = DISPOSITION_CHAIN_ITEM_FIXTURE
    const map = {
      [terminalRecord.id]: terminalRecord,
      [dueRecord.id]: dueRecord,
    }

    const next = applyWeeklyMinorAnomalyItemDispositionTick(map, 10)

    expect(next[terminalRecord.id]).toBe(terminalRecord)
    expect(next[dueRecord.id]?.disposition).toBe('stored')
  })
})
