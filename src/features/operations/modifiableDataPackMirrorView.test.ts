import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
  CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
} from '../../domain/modifiableDataPackValidation'
import {
  formatModifiableDataPackImportStatusLabel,
  formatModifiableDataPackKindLabel,
} from '../../domain/modifiableDataPackSurfacing'
import { getModifiableDataPackMirrorView } from './modifiableDataPackMirrorView'

describe('modifiableDataPackMirrorView (SPE-2492 slice 1)', () => {
  it('returns empty mirror when modifiableDataPackRecords map is empty', () => {
    const game = createStartingState()

    expect(game.modifiableDataPackRecords).toEqual({})

    const view = getModifiableDataPackMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.summary.appliedCount).toBe(0)
    expect(view.summary.needsRevisionCount).toBe(0)
    expect(view.records).toEqual([])
  })

  it('discriminates applied vs needs_revision import status labels', () => {
    const game = createStartingState()
    game.modifiableDataPackRecords = {
      [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
        CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
      [BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
        BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
    }

    const view = getModifiableDataPackMirrorView(game)

    expect(view.isEmpty).toBe(false)
    expect(view.summary.appliedCount).toBe(1)
    expect(view.summary.needsRevisionCount).toBe(1)

    const appliedRecord = view.records.find(
      (record) => record.packId === CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId
    )
    const borderlineRecord = view.records.find(
      (record) => record.packId === BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId
    )

    expect(appliedRecord?.importStatusLabel).toBe('Applied')
    expect(borderlineRecord?.importStatusLabel).toBe('Needs Revision')
    expect(appliedRecord?.packKindLabel).toBe('Tuning Table')
    expect(appliedRecord?.schemaVersion).toBe(
      CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.schemaVersion
    )
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatModifiableDataPackKindLabel('doctrine_note')).toBe('Doctrine Note')
    expect(formatModifiableDataPackImportStatusLabel('needs_revision')).toBe('Needs Revision')
  })

  it('is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.modifiableDataPackRecords = {
      [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
        CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
    }

    const first = JSON.stringify(getModifiableDataPackMirrorView(game))
    const second = JSON.stringify(getModifiableDataPackMirrorView(game))

    expect(first).toBe(second)
  })
})
