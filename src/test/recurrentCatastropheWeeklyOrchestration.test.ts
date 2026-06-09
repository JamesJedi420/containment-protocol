import { describe, expect, it } from 'vitest'
import {
  IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE,
  RECURRENCE_DAMAGE_LEDGER_FIXTURE,
  projectNextRecurrenceRisk,
  type RecurrentCatastropheRecord,
} from '../domain/recurrentCatastropheAmeliorationRegistry'
import {
  advanceRecurrentCatastropheRecordForWeek,
  applyWeeklyRecurrentCatastropheTick,
  resolveRecurrenceDueWeek,
} from '../domain/recurrentCatastropheWeeklyOrchestration'

function baseRecord(
  overrides: Partial<RecurrentCatastropheRecord> = {}
): RecurrentCatastropheRecord {
  return {
    id: 'recurrent-catastrophe:test-cadence',
    label: 'Test cadence recurrence record',
    recurrenceCadence: 'monthly',
    failureMode: 'manifestation',
    preventionCeiling: 'unknown',
    ameliorationTactics: [{ tactic: 'shielding', active: true }],
    recurrenceCount: 1,
    lastOccurrenceWeek: 8,
    ...overrides,
  }
}

describe('recurrentCatastropheWeeklyOrchestration (SPE-2117 slice 3)', () => {
  it('is a no-op for an empty map without throwing', () => {
    expect(applyWeeklyRecurrentCatastropheTick({}, 12)).toEqual({})
    expect(applyWeeklyRecurrentCatastropheTick(undefined, 12)).toEqual({})
  })

  it('resolves recurrence due week from last occurrence plus cadence interval', () => {
    expect(resolveRecurrenceDueWeek(RECURRENCE_DAMAGE_LEDGER_FIXTURE)).toBe(53)
    expect(resolveRecurrenceDueWeek(baseRecord())).toBe(12)
    expect(resolveRecurrenceDueWeek(baseRecord({ recurrenceCadence: 'irregular' }))).toBe(16)
    expect(resolveRecurrenceDueWeek(IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE)).toBeUndefined()
  })

  it('leaves records unchanged while week is before the due week', () => {
    const record = baseRecord()
    const advanced = advanceRecurrentCatastropheRecordForWeek(record, 11)

    expect(advanced).toBe(record)
    expect(advanced.recurrenceCount).toBe(1)
    expect(advanced.lastOccurrenceWeek).toBe(8)
  })

  it('advances recurrenceCount and lastOccurrenceWeek when week reaches the due week', () => {
    const record = baseRecord()
    const advanced = advanceRecurrentCatastropheRecordForWeek(record, 12)

    expect(advanced).not.toBe(record)
    expect(advanced.recurrenceCount).toBe(2)
    expect(advanced.lastOccurrenceWeek).toBe(12)
    expect(advanced.ameliorationTactics).toEqual(record.ameliorationTactics)
  })

  it('advances seasonal cadence fixture when due week is reached', () => {
    const record = RECURRENCE_DAMAGE_LEDGER_FIXTURE
    const advanced = advanceRecurrentCatastropheRecordForWeek(record, 53)

    expect(advanced).not.toBe(record)
    expect(advanced.recurrenceCount).toBe(4)
    expect(advanced.lastOccurrenceWeek).toBe(53)
    expect(advanced.damageLedgerRefs).toEqual(record.damageLedgerRefs)
  })

  it('is idempotent when re-applied after recurrence advance for the same week', () => {
    const record = baseRecord()
    const once = advanceRecurrentCatastropheRecordForWeek(record, 12)
    const twice = advanceRecurrentCatastropheRecordForWeek(once, 12)

    expect(twice).toBe(once)
  })

  it('leaves records without lastOccurrenceWeek unchanged', () => {
    const record = IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE
    const advanced = advanceRecurrentCatastropheRecordForWeek(record, 52)

    expect(advanced).toBe(record)
    expect(advanced.recurrenceCount).toBe(0)
    expect(advanced.lastOccurrenceWeek).toBeUndefined()
  })

  it('does not activate prevention tactics on impossible-ceiling records when due', () => {
    const record = {
      ...IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE,
      lastOccurrenceWeek: 10,
      recurrenceCadence: 'weekly' as const,
      recurrenceCount: 2,
    }
    const advanced = advanceRecurrentCatastropheRecordForWeek(record, 11)

    expect(advanced).not.toBe(record)
    expect(advanced.recurrenceCount).toBe(3)
    expect(advanced.lastOccurrenceWeek).toBe(11)
    expect(advanced.preventionTactics).toEqual(record.preventionTactics)
    expect(advanced.preventionTactics?.every((entry) => entry.active === false)).toBe(true)
  })

  it('still advances warnings-only records when cadence is due', () => {
    const record = baseRecord({
      id: 'recurrent-catastrophe:warning-only-recurrence',
      label: 'Recurrence without ledger warning',
      recurrenceCadence: 'weekly',
      recurrenceCount: 2,
      lastOccurrenceWeek: 5,
      damageLedgerRefs: undefined,
    })
    const advanced = advanceRecurrentCatastropheRecordForWeek(record, 6)

    expect(advanced).not.toBe(record)
    expect(advanced.recurrenceCount).toBe(3)
    expect(advanced.lastOccurrenceWeek).toBe(6)
  })

  it('feeds updated recurrence fields into projection-only reads after cadence advance', () => {
    const before = projectNextRecurrenceRisk(RECURRENCE_DAMAGE_LEDGER_FIXTURE, { currentWeek: 53 })
    const advanced = advanceRecurrentCatastropheRecordForWeek(RECURRENCE_DAMAGE_LEDGER_FIXTURE, 53)
    const after = projectNextRecurrenceRisk(advanced, { currentWeek: 53 })

    expect(before.recurrenceCount).toBe(3)
    expect(before.lastOccurrenceWeek).toBe(40)
    expect(after.recurrenceCount).toBe(4)
    expect(after.lastOccurrenceWeek).toBe(53)
    expect(after.recurrenceRiskScore).not.toBeNull()
  })

  it('applies map tick in stable id order without mutating unrelated records', () => {
    const dueRecord = baseRecord({ id: 'recurrent-catastrophe:z-due' })
    const notDueRecord = baseRecord({
      id: 'recurrent-catastrophe:a-not-due',
      lastOccurrenceWeek: 20,
    })
    const next = applyWeeklyRecurrentCatastropheTick(
      {
        [dueRecord.id]: dueRecord,
        [notDueRecord.id]: notDueRecord,
      },
      12
    )

    expect(next[dueRecord.id]?.recurrenceCount).toBe(2)
    expect(next[notDueRecord.id]).toBe(notDueRecord)
  })
})
