import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  HOSTILE_TO_COOPERATIVE_FIXTURE,
  PENDING_TO_APPROVED_FIXTURE,
  sanitizeEntityWelfareReclassificationRecords,
  validateEntityWelfareReclassificationRecord,
} from '../domain/entityWelfareReclassificationRegistry'

describe('entityWelfareReclassificationRegistry persistence (SPE-2114 slice 2)', () => {
  it('defaults starting state to an empty entity welfare reclassification map', () => {
    expect(createStartingState().entityWelfareReclassificationRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizeEntityWelfareReclassificationRecords(
      {
        valid: PENDING_TO_APPROVED_FIXTURE,
        hostile: HOSTILE_TO_COOPERATIVE_FIXTURE,
        'wrong-key': {
          ...PENDING_TO_APPROVED_FIXTURE,
          id: 'reclass:apex-threat-behavior-reassessment',
        },
        duplicate: {
          ...PENDING_TO_APPROVED_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          priorThreatLabel: 'provisional-threat',
          proposedDisposition: 'unknown',
          reclassificationState: 'pending',
        },
        franchiseLabel: {
          id: 'reclass:franchise',
          label: 'SCP division custody review',
          priorThreatLabel: 'provisional-threat',
          proposedDisposition: 'unknown',
          reclassificationState: 'pending',
        },
        brandedObjectId: {
          id: 'reclass:scp-049-custody-shift',
          label: 'Archive custody shift',
          priorThreatLabel: 'provisional-threat',
          proposedDisposition: 'unknown',
          reclassificationState: 'pending',
        },
        approvedWithoutEvidence: {
          id: 'reclass:approved-no-evidence',
          label: 'Approved without evidence',
          priorThreatLabel: 'provisional-threat',
          proposedDisposition: 'cooperative',
          reclassificationState: 'approved',
          reviewGate: 'ethics',
          reviewArtifactRef: 'review:ethics-packet-1',
          containmentRevisionRefs: ['revision:soft-custody'],
        },
        invalidDisposition: {
          id: 'reclass:invalid-disposition',
          label: 'Invalid disposition',
          priorThreatLabel: 'provisional-threat',
          proposedDisposition: 'not_a_disposition',
          reclassificationState: 'pending',
        },
      },
      fallback
    )

    expect(sanitized['reclass:field-observation-custody-shift']).toEqual(
      PENDING_TO_APPROVED_FIXTURE
    )
    expect(sanitized['reclass:apex-threat-behavior-reassessment']).toEqual(
      HOSTILE_TO_COOPERATIVE_FIXTURE
    )
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.franchiseLabel).toBeUndefined()
    expect(sanitized.brandedObjectId).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(sanitized['wrong-key']).toBeUndefined()
    expect(sanitized.approvedWithoutEvidence).toBeUndefined()
    expect(sanitized.invalidDisposition).toBeUndefined()
    expect(Object.keys(sanitized).sort()).toEqual([
      'reclass:apex-threat-behavior-reassessment',
      'reclass:field-observation-custody-shift',
    ])
  })

  it('persists warning-only records that remain valid on hydrate', () => {
    const warningOnly = {
      id: 'reclass:warning-only-hostile-softening',
      label: 'Warning-only hostile softening',
      priorThreatLabel: 'hostile-predator',
      proposedDisposition: 'cooperative' as const,
      reclassificationState: 'approved' as const,
      reviewGate: 'ethics' as const,
      reviewArtifactRef: 'review:ethics-packet-warning',
      evidenceBundleRefs: ['evidence:behavior-week-4'],
    }

    expect(validateEntityWelfareReclassificationRecord(warningOnly).valid).toBe(true)

    const sanitized = sanitizeEntityWelfareReclassificationRecords(
      { [warningOnly.id]: warningOnly },
      {}
    )

    expect(sanitized[warningOnly.id]).toEqual(warningOnly)
  })

  it('round-trips fixture records with nested arrays byte-stable through save/load', () => {
    const state = createStartingState()
    state.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
      [HOSTILE_TO_COOPERATIVE_FIXTURE.id]: HOSTILE_TO_COOPERATIVE_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.entityWelfareReclassificationRecords).toEqual(
      state.entityWelfareReclassificationRecords
    )
    expect(
      loaded.entityWelfareReclassificationRecords?.[PENDING_TO_APPROVED_FIXTURE.id]
        ?.evidenceBundleRefs
    ).toEqual(PENDING_TO_APPROVED_FIXTURE.evidenceBundleRefs)
    expect(
      loaded.entityWelfareReclassificationRecords?.[PENDING_TO_APPROVED_FIXTURE.id]
        ?.transitionHistory
    ).toEqual(PENDING_TO_APPROVED_FIXTURE.transitionHistory)
    expect(
      loaded.entityWelfareReclassificationRecords?.[HOSTILE_TO_COOPERATIVE_FIXTURE.id]
        ?.containmentRevisionRefs
    ).toEqual(HOSTILE_TO_COOPERATIVE_FIXTURE.containmentRevisionRefs)
  })

  it('hydrates persisted entity welfare reclassification records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        entityWelfareReclassificationRecords: {
          [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
          invalid: {
            id: 'reclass:invalid',
            label: 'SCP division custody review',
            priorThreatLabel: 'provisional-threat',
            proposedDisposition: 'unknown',
            reclassificationState: 'pending',
          },
        },
      },
      fallback
    )

    expect(hydrated.entityWelfareReclassificationRecords).toEqual({
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    })
  })
})
