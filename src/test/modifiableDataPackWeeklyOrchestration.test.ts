import { describe, expect, it } from 'vitest'

import {
  BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
  CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
} from '../domain/modifiableDataPackValidation'
import {
  applyWeeklyModifiableDataPackGovernanceTick,
  advanceModifiableDataPackRecordForWeek,
} from '../domain/modifiableDataPackWeeklyOrchestration'

describe('modifiableDataPackWeeklyOrchestration (SPE-2493 slice 2)', () => {
  it('is a no-op for an empty records map without throwing', () => {
    const tick = applyWeeklyModifiableDataPackGovernanceTick({}, 3)

    expect(tick.records).toEqual({})
    expect(tick.receipts).toEqual([])
  })

  it('skips applied records with import_status_stable receipts', () => {
    const advanced = advanceModifiableDataPackRecordForWeek(
      CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
      2
    )

    expect(advanced.record).toBe(CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE)
    expect(advanced.receipt).toMatchObject({
      packId: CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId,
      outcome: 'skipped',
      executionWeek: 2,
      importStatus: 'applied',
      skipCode: 'import_status_stable',
    })
  })

  it('observes needs_revision records without mutating them', () => {
    const advanced = advanceModifiableDataPackRecordForWeek(
      BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
      4
    )

    expect(advanced.record).toBe(BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE)
    expect(advanced.receipt).toMatchObject({
      packId: BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId,
      outcome: 'observed',
      executionWeek: 4,
      importStatus: 'needs_revision',
      reasonCodes: ['schema_version_borderline'],
    })
  })

  it('removes invalid records during batch tick without re-importing rejected payloads', () => {
    const driftedRecord = {
      ...CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
      reasonCodes: ['invalid_payload'] as const,
    }

    const tick = applyWeeklyModifiableDataPackGovernanceTick(
      {
        [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
          CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
        [BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
          BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
        drifted: driftedRecord,
      },
      5
    )

    expect(tick.records).toEqual({
      [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
        CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
      [BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
        BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
    })
    expect(tick.receipts.map((receipt) => receipt.outcome)).toEqual([
      'observed',
      'skipped',
      'removed',
    ])
  })

  it('processes pack ids in deterministic sorted order', () => {
    const tick = applyWeeklyModifiableDataPackGovernanceTick(
      {
        [BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
          BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
        [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
          CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
      },
      1
    )

    expect(tick.receipts.map((receipt) => receipt.packId)).toEqual([
      BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId,
      CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId,
    ])
  })
})
