import { describe, expect, it } from 'vitest'
import {
  HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
  TRANSFER_PENDING_REVIEW_FIXTURE,
  type CustodyStatusRecord,
} from '../domain/containedPersonCustodyStatusRegistry'
import {
  CUSTODY_STATUS_WIRED_REF_PREFIX,
  deriveCustodyStatusBundleFragmentsFromRecords,
} from '../domain/containedPersonCustodyStatusHealthBundleLinks'

function baseRecord(overrides: Partial<CustodyStatusRecord> = {}): CustodyStatusRecord {
  return {
    id: 'custody-status:test-base',
    label: 'Test base custody hold',
    subjectRef: 'subject:test-base',
    custodyStage: 'temporary_holding',
    formerRoleCategory: 'civilian_witness',
    restrictionLevel: 'standard',
    rightsReviewPending: false,
    ...overrides,
  }
}

describe('containedPersonCustodyStatusHealthBundleLinks (SPE-1889 slice 9)', () => {
  it('returns an empty frozen array for an empty map without throw', () => {
    expect(deriveCustodyStatusBundleFragmentsFromRecords({})).toEqual([])
    expect(deriveCustodyStatusBundleFragmentsFromRecords(null)).toEqual([])
    expect(deriveCustodyStatusBundleFragmentsFromRecords(undefined)).toEqual([])
  })

  it('groups custody records by subjectRef in deterministic subject order', () => {
    const sharedSubject = 'subject:cooperative-field-asset-17'
    const secondRecord = baseRecord({
      id: 'custody-status:second-hold',
      label: 'Second custody hold',
      subjectRef: sharedSubject,
    })

    const fragments = deriveCustodyStatusBundleFragmentsFromRecords({
      [HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.id]: HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
      [secondRecord.id]: secondRecord,
      [TRANSFER_PENDING_REVIEW_FIXTURE.id]: TRANSFER_PENDING_REVIEW_FIXTURE,
    })

    expect(fragments).toHaveLength(2)
    expect(fragments.map((fragment) => fragment.subjectRef)).toEqual([
      sharedSubject,
      TRANSFER_PENDING_REVIEW_FIXTURE.subjectRef,
    ])
    expect(fragments[0]?.custodyStatusLinks).toHaveLength(2)
    expect(fragments[0]?.custodyStatusLinks.map((link) => link.custodyRef)).toEqual([
      HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.id,
      secondRecord.id,
    ])
  })

  it('uses custody-status wired ref prefix on derived links', () => {
    const [fragment] = deriveCustodyStatusBundleFragmentsFromRecords({
      [HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.id]: HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
    })

    expect(fragment?.custodyStatusLinks[0]?.wiredRef).toBe(
      `${CUSTODY_STATUS_WIRED_REF_PREFIX}${HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.id}`
    )
  })

  it('includes warning-only custody records in derived fragments', () => {
    const warningOnly = baseRecord({
      id: 'custody-status:warning-only-transfer',
      custodyStage: 'transfer_pending',
      rightsReviewPending: false,
    })

    const fragments = deriveCustodyStatusBundleFragmentsFromRecords({
      [warningOnly.id]: warningOnly,
    })

    expect(fragments).toHaveLength(1)
    expect(fragments[0]?.custodyStatusLinks).toHaveLength(1)
    expect(fragments[0]?.custodyStatusLinks[0]?.custodyStage).toBe('transfer_pending')
    expect(fragments[0]?.custodyStatusLinks[0]?.rightsReviewPending).toBe(false)
  })

  it('skips invalid records without re-surfacing dropped payloads', () => {
    const fragments = deriveCustodyStatusBundleFragmentsFromRecords({
      [HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.id]: HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
      invalid: {
        id: '',
        label: 'bad',
        subjectRef: 'subject:test',
        custodyStage: 'contained_person',
        formerRoleCategory: 'hostile_actor',
        restrictionLevel: 'elevated',
        rightsReviewPending: true,
      } as CustodyStatusRecord,
    })

    expect(fragments).toHaveLength(1)
    expect(fragments[0]?.custodyStatusLinks).toHaveLength(1)
  })

  it('is deterministic on repeated derive calls', () => {
    const records = {
      [HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.id]: HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
      [TRANSFER_PENDING_REVIEW_FIXTURE.id]: TRANSFER_PENDING_REVIEW_FIXTURE,
    }

    const first = deriveCustodyStatusBundleFragmentsFromRecords(records)
    const second = deriveCustodyStatusBundleFragmentsFromRecords(records)

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
