import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
  BORDERLINE_SCHEMA_DATA_PACK_FIXTURE,
  CANONICAL_MODIFIABLE_DATA_PACK_FIXTURE,
  CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
  INVALID_MODIFIABLE_DATA_PACK_FIXTURE,
  PARTIAL_MODIFIABLE_DATA_PACK_FIXTURE,
  composeModifiableDataPackRecord,
  importModifiableDataPackPayload,
  sanitizeModifiableDataPackRecords,
} from '../domain/modifiableDataPackValidation'

describe('modifiableDataPack runtime import (SPE-2486 slice 1)', () => {
  it('defaults starting state to an empty modifiable data-pack map', () => {
    expect(createStartingState().modifiableDataPackRecords).toEqual({})
  })

  it('composes a valid record read-only from the canonical validation fixture', () => {
    const composed = composeModifiableDataPackRecord(CANONICAL_MODIFIABLE_DATA_PACK_FIXTURE)

    expect(composed).toEqual(CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE)
    expect(importModifiableDataPackPayload(CANONICAL_MODIFIABLE_DATA_PACK_FIXTURE)).toEqual(
      composed
    )
  })

  it('composes a needs_revision record from the borderline schema fixture', () => {
    const composed = composeModifiableDataPackRecord(BORDERLINE_SCHEMA_DATA_PACK_FIXTURE)

    expect(composed).toEqual(BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE)
    expect(composed?.importStatus).toBe('needs_revision')
    expect(composed?.reasonCodes).toEqual(['schema_version_borderline'])
  })

  it('returns null for rejected validation payloads without throwing', () => {
    expect(composeModifiableDataPackRecord(INVALID_MODIFIABLE_DATA_PACK_FIXTURE)).toBeNull()
    expect(composeModifiableDataPackRecord(PARTIAL_MODIFIABLE_DATA_PACK_FIXTURE)).toBeNull()
    expect(composeModifiableDataPackRecord(undefined)).toBeNull()
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizeModifiableDataPackRecords(
      {
        valid: CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
        duplicate: {
          ...CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
          authorRef: 'contributor:duplicate-should-lose',
        },
        'wrong-key': {
          ...CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
          packId: CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId,
          authorRef: 'contributor:wrong-map-key-should-lose',
        },
        rejected: INVALID_MODIFIABLE_DATA_PACK_FIXTURE,
        partial: PARTIAL_MODIFIABLE_DATA_PACK_FIXTURE,
        staleStatus: {
          ...CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
          importStatus: 'rejected',
        },
        driftedReasonCodes: {
          ...CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
          reasonCodes: ['invalid_payload'],
        },
      },
      fallback
    )

    expect(sanitized[CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]).toEqual(
      CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE
    )
    expect(sanitized.duplicate).toBeUndefined()
    expect(sanitized['wrong-key']).toBeUndefined()
    expect(sanitized.rejected).toBeUndefined()
    expect(sanitized.partial).toBeUndefined()
    expect(sanitized.staleStatus).toBeUndefined()
    expect(sanitized.driftedReasonCodes).toBeUndefined()
    expect(Object.keys(sanitized)).toEqual([CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId])
  })

  it('round-trips fixture records byte-stable through save/load', () => {
    const state = createStartingState()
    state.modifiableDataPackRecords = {
      [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
        CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
      [BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
        BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.modifiableDataPackRecords).toEqual(state.modifiableDataPackRecords)
  })

  it('hydrates persisted modifiable data-pack records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        modifiableDataPackRecords: {
          [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
            CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
          invalid: INVALID_MODIFIABLE_DATA_PACK_FIXTURE,
          partial: PARTIAL_MODIFIABLE_DATA_PACK_FIXTURE,
        },
      },
      fallback
    )

    expect(hydrated.modifiableDataPackRecords).toEqual({
      [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
        CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
    })
  })
})
