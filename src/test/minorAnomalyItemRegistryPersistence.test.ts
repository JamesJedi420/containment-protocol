import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  DISPOSITION_CHAIN_ITEM_FIXTURE,
  FALSE_POSITIVE_ITEM_FIXTURE,
  sanitizeMinorAnomalyItemRecords,
} from '../domain/minorAnomalyItemRegistry'

describe('minorAnomalyItemRegistry persistence (SPE-2104 slice 2)', () => {
  it('defaults starting state to an empty minor anomaly item map', () => {
    expect(createStartingState().minorAnomalyItemRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizeMinorAnomalyItemRecords(
      {
        valid: DISPOSITION_CHAIN_ITEM_FIXTURE,
        falsePositive: FALSE_POSITIVE_ITEM_FIXTURE,
        'wrong-key': {
          ...FALSE_POSITIVE_ITEM_FIXTURE,
          id: 'item:ceramic-whistle-fragment',
        },
        duplicate: {
          ...DISPOSITION_CHAIN_ITEM_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          disposition: 'recovered',
          latentRiskScore: 5,
        },
        missingHistory: {
          id: 'item:no-history',
          label: 'No history',
          disposition: 'staff_use',
          latentRiskScore: 8,
        },
        falsePositiveMissingInvestigation: {
          id: 'item:missing-investigation',
          label: 'Missing investigation',
          disposition: 'false_positive_returned',
          latentRiskScore: 2,
          statusHistory: [
            {
              fromDisposition: 'under_investigation',
              toDisposition: 'false_positive_returned',
              week: 4,
            },
          ],
        },
        invalidRisk: {
          id: 'item:bad-risk',
          label: 'Bad risk',
          disposition: 'recovered',
          latentRiskScore: 200,
        },
        invalidDisposition: {
          id: 'item:bad-disposition',
          label: 'Bad disposition',
          disposition: 'not-a-disposition',
          latentRiskScore: 5,
        },
        destroyedMissingHistory: {
          id: 'item:destroyed-no-history',
          label: 'Destroyed without history',
          disposition: 'destroyed',
          latentRiskScore: 20,
          destructionAuthorizationRef: 'auth:destruction-order-9',
        },
        invalidHistoryDisposition: {
          id: 'item:bad-history',
          label: 'Bad history',
          disposition: 'stored',
          latentRiskScore: 6,
          statusHistory: [
            { fromDisposition: 'recovered', toDisposition: 'not-valid', week: 3 },
            { fromDisposition: 'recovered', toDisposition: 'stored', week: 4 },
          ],
        },
      },
      fallback
    )

    expect(sanitized['item:ceramic-whistle-fragment']).toEqual(DISPOSITION_CHAIN_ITEM_FIXTURE)
    expect(sanitized['item:brass-key-blank']).toEqual(FALSE_POSITIVE_ITEM_FIXTURE)
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.missingHistory).toBeUndefined()
    expect(sanitized.falsePositiveMissingInvestigation).toBeUndefined()
    expect(sanitized.invalidRisk).toBeUndefined()
    expect(sanitized.invalidDisposition).toBeUndefined()
    expect(sanitized.destroyedMissingHistory).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(sanitized['item:bad-history']).toEqual({
      id: 'item:bad-history',
      label: 'Bad history',
      disposition: 'stored',
      latentRiskScore: 6,
      statusHistory: [{ fromDisposition: 'recovered', toDisposition: 'stored', week: 4 }],
    })
    expect(Object.keys(sanitized)).toHaveLength(3)
  })

  it('round-trips fixture items with statusHistory and investigationRef byte-stable through save/load', () => {
    const state = createStartingState()
    state.minorAnomalyItemRecords = {
      [DISPOSITION_CHAIN_ITEM_FIXTURE.id]: DISPOSITION_CHAIN_ITEM_FIXTURE,
      [FALSE_POSITIVE_ITEM_FIXTURE.id]: FALSE_POSITIVE_ITEM_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.minorAnomalyItemRecords).toEqual(state.minorAnomalyItemRecords)
    expect(
      loaded.minorAnomalyItemRecords?.[DISPOSITION_CHAIN_ITEM_FIXTURE.id]?.statusHistory
    ).toEqual(DISPOSITION_CHAIN_ITEM_FIXTURE.statusHistory)
    expect(
      loaded.minorAnomalyItemRecords?.[FALSE_POSITIVE_ITEM_FIXTURE.id]?.investigationRef
    ).toEqual(FALSE_POSITIVE_ITEM_FIXTURE.investigationRef)
  })

  it('hydrates persisted minor anomaly items through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        minorAnomalyItemRecords: {
          [DISPOSITION_CHAIN_ITEM_FIXTURE.id]: DISPOSITION_CHAIN_ITEM_FIXTURE,
          invalid: {
            id: 'item:invalid',
            label: 'Invalid',
            disposition: 'staff_use',
            latentRiskScore: 4,
          },
        },
      },
      fallback
    )

    expect(hydrated.minorAnomalyItemRecords).toEqual({
      [DISPOSITION_CHAIN_ITEM_FIXTURE.id]: DISPOSITION_CHAIN_ITEM_FIXTURE,
    })
  })
})
