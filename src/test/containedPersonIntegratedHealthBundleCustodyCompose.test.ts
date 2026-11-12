import { describe, expect, it } from 'vitest'
import {
  HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
  TRANSFER_PENDING_REVIEW_FIXTURE,
  sanitizeCustodyStatusRecords,
} from '../domain/containedPersonCustodyStatusRegistry'
import { composeCustodyStatusIntoIntegratedHealthBundles } from '../domain/containedPersonIntegratedHealthBundleCompose'
import type { ContainedPersonIntegratedHealthBundle } from '../domain/containedPersonIntegratedHealthBundleRegistry'
import {
  CUSTODY_STATUS_WIRED_REF_PREFIX,
  deriveCustodyStatusBundleFragmentsFromRecords,
} from '../domain/containedPersonCustodyStatusHealthBundleLinks'

describe('containedPersonIntegratedHealthBundleCompose custody (SPE-1889 slice 9)', () => {
  it('is a no-op for an empty bundle map and empty fragments without throw', () => {
    expect(composeCustodyStatusIntoIntegratedHealthBundles({}, [])).toEqual({})
    expect(composeCustodyStatusIntoIntegratedHealthBundles(null, [])).toEqual({})
  })

  it('merges derived custody status links onto bundles keyed by subjectRef', () => {
    const fragments = deriveCustodyStatusBundleFragmentsFromRecords({
      [HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.id]: HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
      [TRANSFER_PENDING_REVIEW_FIXTURE.id]: TRANSFER_PENDING_REVIEW_FIXTURE,
    })

    const composed = composeCustodyStatusIntoIntegratedHealthBundles({}, fragments)

    expect(Object.keys(composed)).toEqual([
      HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.subjectRef,
      TRANSFER_PENDING_REVIEW_FIXTURE.subjectRef,
    ])

    const hostileBundle = composed[HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.subjectRef]
    const transferBundle = composed[TRANSFER_PENDING_REVIEW_FIXTURE.subjectRef]

    expect(hostileBundle?.custodyStatusLinks).toHaveLength(1)
    expect(hostileBundle?.custodyStatusLinks?.[0]?.custodyStage).toBe('contained_person')
    expect(hostileBundle?.custodyStatusLinks?.[0]?.rightsReviewPending).toBe(true)
    expect(transferBundle?.custodyStatusLinks?.[0]?.custodyStage).toBe('transfer_pending')
  })

  it('preserves authored bundle fields while replacing prior wired links by ref prefix', () => {
    const subjectRef = HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.subjectRef
    const seeded: ContainedPersonIntegratedHealthBundle = {
      id: subjectRef,
      label: 'Authored bundle label',
      subjectRef,
      confidence: 0.82,
      custodyStatusLinks: [
        {
          custodyRef: 'custody-status:authored-manual-link',
          wiredRef: 'manual:custody-status:authored-manual-link',
          custodyStage: 'temporary_holding',
          formerRoleCategory: 'civilian_witness',
          restrictionLevel: 'standard',
          rightsReviewPending: false,
        },
        {
          custodyRef: 'custody-status:stale-wired',
          wiredRef: `${CUSTODY_STATUS_WIRED_REF_PREFIX}custody-status:stale-wired`,
          custodyStage: 'medical_hold',
          formerRoleCategory: 'hostile_actor',
          restrictionLevel: 'elevated',
          rightsReviewPending: true,
        },
      ],
    }

    const fragments = deriveCustodyStatusBundleFragmentsFromRecords({
      [HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.id]: HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
    })

    const composed = composeCustodyStatusIntoIntegratedHealthBundles(
      { [subjectRef]: seeded },
      fragments
    )
    const bundle = composed[subjectRef]

    expect(bundle?.label).toBe('Authored bundle label')
    expect(bundle?.confidence).toBe(0.82)
    expect(bundle?.custodyStatusLinks).toHaveLength(2)
    expect(
      bundle?.custodyStatusLinks?.some(
        (link) => link.wiredRef === 'manual:custody-status:authored-manual-link'
      )
    ).toBe(true)
    expect(
      bundle?.custodyStatusLinks?.some(
        (link) => link.custodyRef === HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.id
      )
    ).toBe(true)
    expect(
      bundle?.custodyStatusLinks?.some((link) => link.custodyRef === 'custody-status:stale-wired')
    ).toBe(false)
  })

  it('strips wired custody links without removing bundles that still have medication regimen links', () => {
    const subjectRef = HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.subjectRef
    const fragments = deriveCustodyStatusBundleFragmentsFromRecords({
      [HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.id]: HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
    })
    const seeded = composeCustodyStatusIntoIntegratedHealthBundles({}, fragments)
    const withMedication: ContainedPersonIntegratedHealthBundle = {
      ...seeded[subjectRef]!,
      medicationRegimenLinks: [
        {
          regimenRef: 'medication-regimen:retained',
          wiredRef: 'medication-regimen:medication-regimen:retained',
          consentStatus: 'voluntary',
          deliveryVector: 'oral',
          interactionRiskScore: 0.1,
          adverseReactionFlag: false,
        },
      ],
    }

    const stripped = composeCustodyStatusIntoIntegratedHealthBundles(
      { [subjectRef]: withMedication },
      []
    )

    expect(stripped[subjectRef]?.custodyStatusLinks).toBeUndefined()
    expect(stripped[subjectRef]?.medicationRegimenLinks).toHaveLength(1)
  })

  it('is idempotent when re-applied with the same fragments', () => {
    const fragments = deriveCustodyStatusBundleFragmentsFromRecords({
      [HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.id]: HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
    })

    const first = composeCustodyStatusIntoIntegratedHealthBundles({}, fragments)
    const second = composeCustodyStatusIntoIntegratedHealthBundles(first, fragments)

    expect(second).toBe(first)
  })
})

describe('containedPersonCustodyStatusRegistry persistence (SPE-1892 slice 1)', () => {
  it('defaults starting state to an empty custody status map', async () => {
    const { createStartingState } = await import('../data/startingState')
    expect(createStartingState().containedPersonCustodyStatusRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizeCustodyStatusRecords(
      {
        valid: HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
        transfer: TRANSFER_PENDING_REVIEW_FIXTURE,
        duplicate: {
          ...HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          subjectRef: 'subject:test',
          custodyStage: 'contained_person',
          formerRoleCategory: 'hostile_actor',
          restrictionLevel: 'elevated',
          rightsReviewPending: true,
        },
      },
      fallback
    )

    expect(sanitized['custody-status:former-hostile-hold']).toEqual(
      HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE
    )
    expect(sanitized['custody-status:transfer-pending-review']).toEqual(
      TRANSFER_PENDING_REVIEW_FIXTURE
    )
    expect(sanitized.invalid).toBeUndefined()
    expect(Object.keys(sanitized)).toHaveLength(2)
  })
})
