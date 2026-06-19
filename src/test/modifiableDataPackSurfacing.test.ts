import { describe, expect, it } from 'vitest'
import {
  BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
  CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
} from '../domain/modifiableDataPackValidation'
import {
  formatModifiableDataPackSectionSummary,
  summarizeModifiableDataPackRecords,
} from '../domain/modifiableDataPackSurfacing'

describe('modifiableDataPackSurfacing (SPE-2492 slice 1)', () => {
  it('summarizes applied and needs_revision counts from hydrated records', () => {
    const summary = summarizeModifiableDataPackRecords({
      [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
        CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
      [BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
        BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
    })

    expect(summary.totalRecords).toBe(2)
    expect(summary.appliedCount).toBe(1)
    expect(summary.needsRevisionCount).toBe(1)
    expect(summary.totalSectionCount).toBe(
      CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.modifiableSections.length +
        BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.modifiableSections.length
    )
  })

  it('treats nullish maps as empty without throwing', () => {
    expect(summarizeModifiableDataPackRecords(undefined)).toEqual({
      totalRecords: 0,
      appliedCount: 0,
      needsRevisionCount: 0,
      totalSectionCount: 0,
    })
  })

  it('formats section summary labels deterministically', () => {
    expect(
      formatModifiableDataPackSectionSummary(CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE)
    ).toContain('section')
  })
})
