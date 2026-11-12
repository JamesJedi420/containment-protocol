import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  buildAffiliationFileWorkQueueReleaseFulfillmentRecord,
  buildAffiliationFileWorkQueueReleaseFulfillmentRecordId,
  getAffiliationFileWorkQueueReleaseFulfillmentForOutcome,
  sanitizeAffiliationFileWorkQueueReleaseFulfillmentRecords,
} from '../domain/affiliationFileWorkQueueReleaseFulfillmentRecords'

describe('affiliationFileWorkQueueReleaseFulfillmentRecords persistence', () => {
  it('maps only file-released outcomes to fulfillment receipts', () => {
    expect(getAffiliationFileWorkQueueReleaseFulfillmentForOutcome('file_released')).toEqual({
      fulfillmentKind: 'file_release_fulfilled',
      fulfillmentLabel: 'File release fulfilled',
    })
    expect(
      getAffiliationFileWorkQueueReleaseFulfillmentForOutcome('restricted_review_pending')
    ).toBeNull()
  })

  it('builds deterministic ids from work queue entry and source outcome kind', () => {
    const record = buildAffiliationFileWorkQueueReleaseFulfillmentRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceOutcomeKind: 'file_released',
      sourceBucket: 'allowed',
      sourceReasonCodes: ['site_clearance_allowed', 'file_permission_allowed'],
      fulfillmentKind: 'file_release_fulfilled',
      fulfillmentLabel: 'File release fulfilled',
      recordedWeek: 9,
    })

    expect(record).toEqual({
      id: 'affiliation-file-release-fulfillment:person-status:alpha:file_released',
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceOutcomeKind: 'file_released',
      sourceBucket: 'allowed',
      sourceReasonCodes: ['file_permission_allowed', 'site_clearance_allowed'],
      fulfillmentKind: 'file_release_fulfilled',
      fulfillmentLabel: 'File release fulfilled',
      recordedWeek: 9,
    })
    expect(
      buildAffiliationFileWorkQueueReleaseFulfillmentRecordId({
        workQueueEntryId: 'person-status:alpha',
        sourceOutcomeKind: 'file_released',
      })
    ).toBe(record.id)
  })

  it('drops invalid records and mismatched keys during hydration sanitization', () => {
    const valid = buildAffiliationFileWorkQueueReleaseFulfillmentRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceOutcomeKind: 'file_released',
      sourceBucket: 'allowed',
      sourceReasonCodes: ['file_permission_allowed'],
      fulfillmentKind: 'file_release_fulfilled',
      fulfillmentLabel: 'File release fulfilled',
      recordedWeek: 6,
    })

    expect(
      sanitizeAffiliationFileWorkQueueReleaseFulfillmentRecords({
        [valid.id]: valid,
        'wrong-key': valid,
        'bad-pair': {
          ...valid,
          id: 'affiliation-file-release-fulfillment:person-status:beta:restricted_review_pending',
          workQueueEntryId: 'person-status:beta',
          sourceOutcomeKind: 'restricted_review_pending',
        },
        'bad-bucket': {
          ...valid,
          id: 'affiliation-file-release-fulfillment:person-status:gamma:file_released',
          workQueueEntryId: 'person-status:gamma',
          sourceBucket: 'restricted',
        },
        'bad-week': {
          ...valid,
          id: 'affiliation-file-release-fulfillment:person-status:delta:file_released',
          workQueueEntryId: 'person-status:delta',
          recordedWeek: 1.5,
        },
      })
    ).toEqual({
      [valid.id]: valid,
    })
  })

  it('hydrates and exports fulfillment records without mutating source ledgers', () => {
    const state = createStartingState()
    const valid = buildAffiliationFileWorkQueueReleaseFulfillmentRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceOutcomeKind: 'file_released',
      sourceBucket: 'allowed',
      sourceReasonCodes: ['file_permission_allowed'],
      fulfillmentKind: 'file_release_fulfilled',
      fulfillmentLabel: 'File release fulfilled',
      recordedWeek: 5,
    })

    state.affiliationFileWorkQueueReleaseFulfillmentRecords = {
      [valid.id]: valid,
    }

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)), createStartingState())

    expect(hydrated.affiliationFileWorkQueueReleaseFulfillmentRecords).toEqual({
      [valid.id]: valid,
    })
    expect(hydrated.affiliationPersonStatusRecords).toEqual({})
    expect(hydrated.affiliationFileWorkQueueReleaseActionRecords).toEqual({})
    expect(hydrated.affiliationFileWorkQueueReleaseOutcomeRecords).toEqual({})
  })
})
