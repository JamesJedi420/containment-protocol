import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  FORMAL_ALERT_PARTIAL_FIXTURE,
  IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
  sanitizeInformationIntakeReports,
} from '../domain/informationIntakeReport'

describe('informationIntakeReport persistence (SPE-854 slice 2)', () => {
  it('defaults starting state to an empty intake report map', () => {
    expect(createStartingState().informationIntakeReports).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizeInformationIntakeReports(
      {
        valid: FORMAL_ALERT_PARTIAL_FIXTURE,
        'wrong-key': {
          ...PUBLIC_RUMOR_CONFLICT_FIXTURE,
          id: 'intake:public-rumor-early',
        },
        duplicate: {
          ...PUBLIC_RUMOR_CONFLICT_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          topicRef: 'topic:x',
          initialSourceClass: 'formal_alert',
          credibility: 'medium',
          plausibility: 'plausible',
          rumorRisk: 'none',
          verificationStatus: 'unverified',
          confidenceScore: 0.5,
          corroborationHistory: [],
          contradictionHistory: [],
          retainedDespiteContradiction: true,
        },
        franchise: {
          ...IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
          id: 'intake:scp-bad',
          label: 'SCP breach rumor',
        },
      },
      fallback
    )

    expect(sanitized['intake:formal-sensor-trace']).toEqual(FORMAL_ALERT_PARTIAL_FIXTURE)
    expect(sanitized['intake:public-rumor-early']).toEqual(PUBLIC_RUMOR_CONFLICT_FIXTURE)
    expect(sanitized['intake:scp-bad']).toBeUndefined()
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(Object.keys(sanitized)).toHaveLength(2)
  })

  it('round-trips fixture reports with corroboration history byte-stable through save/load', () => {
    const state = createStartingState()
    state.informationIntakeReports = {
      [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
      [IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id]: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.informationIntakeReports).toEqual(state.informationIntakeReports)
    expect(loaded.informationIntakeReports?.[FORMAL_ALERT_PARTIAL_FIXTURE.id]?.corroborationHistory).toEqual(
      FORMAL_ALERT_PARTIAL_FIXTURE.corroborationHistory
    )
  })

  it('hydrates persisted intake reports through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        templates: undefined,
        informationIntakeReports: {
          [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
          corrupt: {
            id: 'intake:bad',
            verificationStatus: 'explosive',
          },
        },
      },
      fallback
    )

    expect(hydrated.informationIntakeReports).toEqual({
      [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
    })
  })
})
