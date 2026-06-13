import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
  PSYCHIATRIC_REVIEW_PANEL_MATRIX_FIXTURE,
  sanitizeFactionEthicsMatrixRecords,
} from '../domain/factionEthicsMatrixRegistry'
import {
  EXTERNAL_OVERSIGHT_ESCALATION_MATRIX_FIXTURE,
  INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE,
  sanitizeMoralLegalAccountabilityMatrixRecords,
} from '../domain/moralLegalAccountabilityMatrixRegistry'

describe('matrix records registry persistence (SPE-1888 slice 10)', () => {
  it('defaults starting state to empty faction ethics and accountability matrix maps', () => {
    const state = createStartingState()

    expect(state.factionEthicsRecords).toEqual({})
    expect(state.accountabilityMatrixRecords).toEqual({})
  })

  it('drops invalid and duplicate-id faction ethics entries during sanitize without throwing', () => {
    const sanitized = sanitizeFactionEthicsMatrixRecords({
      valid: ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
      panel: PSYCHIATRIC_REVIEW_PANEL_MATRIX_FIXTURE,
      duplicate: {
        ...ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
        label: 'duplicate label should lose',
      },
      invalid: {
        id: '',
        label: 'bad',
        factionId: 'oversight',
        reviewOwnerLabel: 'ethics review board',
        permissibilityVerdict: 'permitted',
        authorizationRequired: true,
      },
      franchiseLabel: {
        id: 'faction-ethics:franchise',
        label: 'Foundation ethics routing',
        factionId: 'oversight',
        reviewOwnerLabel: 'ethics review board',
        permissibilityVerdict: 'restricted',
        authorizationRequired: false,
      },
    })

    expect(sanitized[ETHICS_REVIEW_BOARD_MATRIX_FIXTURE.id]).toEqual(
      ETHICS_REVIEW_BOARD_MATRIX_FIXTURE
    )
    expect(sanitized[PSYCHIATRIC_REVIEW_PANEL_MATRIX_FIXTURE.id]).toEqual(
      PSYCHIATRIC_REVIEW_PANEL_MATRIX_FIXTURE
    )
    expect(sanitized.duplicate).toBeUndefined()
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized['faction-ethics:franchise']).toBeUndefined()
    expect(Object.keys(sanitized).sort()).toEqual([
      ETHICS_REVIEW_BOARD_MATRIX_FIXTURE.id,
      PSYCHIATRIC_REVIEW_PANEL_MATRIX_FIXTURE.id,
    ])
  })

  it('drops invalid and duplicate-id accountability matrix entries during sanitize without throwing', () => {
    const sanitized = sanitizeMoralLegalAccountabilityMatrixRecords({
      audit: INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE,
      escalation: EXTERNAL_OVERSIGHT_ESCALATION_MATRIX_FIXTURE,
      duplicate: {
        ...INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE,
        label: 'duplicate label should lose',
      },
      invalid: {
        id: '',
        label: 'bad',
        mitigationPathLabel: 'independent welfare audit',
        moralOutcome: 'blamed',
        legalOutcome: 'deferred',
        institutionalOutcome: 'blamed',
        publicOutcome: 'deferred',
        responsibilityClass: 'immoral',
      },
    })

    expect(sanitized[INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE.id]).toEqual(
      INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE
    )
    expect(sanitized[EXTERNAL_OVERSIGHT_ESCALATION_MATRIX_FIXTURE.id]).toEqual(
      EXTERNAL_OVERSIGHT_ESCALATION_MATRIX_FIXTURE
    )
    expect(sanitized.duplicate).toBeUndefined()
    expect(sanitized.invalid).toBeUndefined()
    expect(Object.keys(sanitized).sort()).toEqual([
      EXTERNAL_OVERSIGHT_ESCALATION_MATRIX_FIXTURE.id,
      INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE.id,
    ])
  })

  it('round-trips matrix fixture records byte-stable through save/load', () => {
    const state = createStartingState()
    state.factionEthicsRecords = {
      [ETHICS_REVIEW_BOARD_MATRIX_FIXTURE.id]: ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
    }
    state.accountabilityMatrixRecords = {
      [INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE.id]: INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.factionEthicsRecords).toEqual(state.factionEthicsRecords)
    expect(loaded.accountabilityMatrixRecords).toEqual(state.accountabilityMatrixRecords)
  })

  it('hydrates persisted matrix records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        factionEthicsRecords: {
          [ETHICS_REVIEW_BOARD_MATRIX_FIXTURE.id]: ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
          invalid: {
            id: 'faction-ethics:invalid',
            label: 'Invalid ethics record',
            factionId: '',
            reviewOwnerLabel: 'ethics review board',
            permissibilityVerdict: 'permitted',
            authorizationRequired: true,
          },
        },
        accountabilityMatrixRecords: {
          [INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE.id]: INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE,
        },
      },
      fallback
    )

    expect(hydrated.factionEthicsRecords).toEqual({
      [ETHICS_REVIEW_BOARD_MATRIX_FIXTURE.id]: ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
    })
    expect(hydrated.accountabilityMatrixRecords).toEqual({
      [INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE.id]: INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE,
    })
  })
})
