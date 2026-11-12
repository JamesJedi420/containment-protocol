import { describe, expect, it } from 'vitest'
import {
  DISCLOSURE_PROGRESSION_FIXTURE,
  NORMALIZATION_INPUT_FIXTURE,
  type PublicDisclosureRecord,
} from '../domain/publicDisclosureStateRegistry'
import {
  advancePublicDisclosureRecordForWeek,
  applyWeeklyPublicDisclosureProgressionTick,
  resolvePublicDisclosureScheduledTransitionDueWeek,
} from '../domain/publicDisclosureWeeklyProgression'

function scheduledRecord(
  overrides: Partial<PublicDisclosureRecord> = {}
): PublicDisclosureRecord {
  return {
    id: 'disclosure:scheduled-transition-test',
    label: 'Scheduled transition test record',
    awarenessLevel: 'credible_leak',
    falloutPhase: 'leak',
    transitionHistory: [
      {
        fromAwarenessLevel: 'secrecy_intact',
        toAwarenessLevel: 'credible_leak',
        week: 18,
        falloutPhase: 'leak',
      },
      {
        fromAwarenessLevel: 'credible_leak',
        toAwarenessLevel: 'public_scandal',
        week: 25,
        falloutPhase: 'disclosure',
        note: 'Regional press publishes witness corroboration.',
      },
    ],
    ...overrides,
  }
}

describe('publicDisclosureWeeklyProgression (SPE-2109 slice 3)', () => {
  it('is a no-op for an empty map without throwing', () => {
    expect(applyWeeklyPublicDisclosureProgressionTick({}, 12)).toEqual({})
    expect(applyWeeklyPublicDisclosureProgressionTick(undefined, 12)).toEqual({})
  })

  it('resolves scheduled transition due week from pending history entry', () => {
    expect(resolvePublicDisclosureScheduledTransitionDueWeek(scheduledRecord())).toBe(25)
    expect(resolvePublicDisclosureScheduledTransitionDueWeek(DISCLOSURE_PROGRESSION_FIXTURE)).toBeUndefined()
  })

  it('leaves awareness unchanged while week is before the due week', () => {
    const record = scheduledRecord()
    const advanced = advancePublicDisclosureRecordForWeek(record, 24)

    expect(advanced).toBe(record)
    expect(advanced.awarenessLevel).toBe('credible_leak')
    expect(advanced.falloutPhase).toBe('leak')
  })

  it('applies scheduled awareness and fallout when week reaches the due week', () => {
    const record = scheduledRecord()
    const advanced = advancePublicDisclosureRecordForWeek(record, 25)

    expect(advanced).not.toBe(record)
    expect(advanced.awarenessLevel).toBe('public_scandal')
    expect(advanced.falloutPhase).toBe('disclosure')
    expect(advanced.transitionHistory).toEqual(record.transitionHistory)
    expect(advanced.trustByRegion).toEqual(record.trustByRegion)
  })

  it('is idempotent when re-applied after scheduled transition for the same week', () => {
    const record = scheduledRecord()
    const once = advancePublicDisclosureRecordForWeek(record, 25)
    const twice = advancePublicDisclosureRecordForWeek(once, 25)

    expect(twice).toBe(once)
    expect(twice.awarenessLevel).toBe('public_scandal')
  })

  it('preserves synced progression fixture without mutation', () => {
    const advanced = advancePublicDisclosureRecordForWeek(DISCLOSURE_PROGRESSION_FIXTURE, 30)

    expect(advanced).toBe(DISCLOSURE_PROGRESSION_FIXTURE)
  })

  it('preserves normalization fixture without mutation', () => {
    const advanced = advancePublicDisclosureRecordForWeek(NORMALIZATION_INPUT_FIXTURE, 12)

    expect(advanced).toBe(NORMALIZATION_INPUT_FIXTURE)
  })

  it('does not mutate invalid post-tick records', () => {
    const record = scheduledRecord({
      transitionHistory: [
        {
          fromAwarenessLevel: 'credible_leak',
          toAwarenessLevel: 'not_a_level' as PublicDisclosureRecord['awarenessLevel'],
          week: 10,
        },
      ],
    })

    const advanced = advancePublicDisclosureRecordForWeek(record, 12)

    expect(advanced).toBe(record)
  })

  it('does not mutate records when last history awareness mismatches current state', () => {
    const record = scheduledRecord({
      awarenessLevel: 'local_rumor',
    })

    const advanced = advancePublicDisclosureRecordForWeek(record, 30)

    expect(advanced).toBe(record)
  })

  it('applies tick in stable id order without mutating unrelated records', () => {
    const scheduled = scheduledRecord()
    const normalization = NORMALIZATION_INPUT_FIXTURE
    const map = {
      [normalization.id]: normalization,
      [scheduled.id]: scheduled,
    }

    const next = applyWeeklyPublicDisclosureProgressionTick(map, 25)

    expect(next[normalization.id]).toBe(normalization)
    expect(next[scheduled.id]?.awarenessLevel).toBe('public_scandal')
  })
})
