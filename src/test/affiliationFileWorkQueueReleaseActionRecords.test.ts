import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  buildAffiliationFileWorkQueueReleaseActionRecord,
  buildAffiliationFileWorkQueueReleaseActionRecordId,
  getAffiliationFileWorkQueueReleaseActionForBucket,
  sanitizeAffiliationFileWorkQueueReleaseActionRecords,
} from '../domain/affiliationFileWorkQueueReleaseActionRecords'

describe('affiliationFileWorkQueueReleaseActionRecords persistence', () => {
  it('maps only restricted and allowed file queue buckets to release actions', () => {
    expect(getAffiliationFileWorkQueueReleaseActionForBucket('allowed')).toEqual({
      actionKind: 'file_release_authorized',
      actionLabel: 'File release authorized',
    })
    expect(getAffiliationFileWorkQueueReleaseActionForBucket('restricted')).toEqual({
      actionKind: 'restricted_release_review_routed',
      actionLabel: 'Restricted release review routed',
    })
    expect(getAffiliationFileWorkQueueReleaseActionForBucket('blocked')).toBeNull()
    expect(getAffiliationFileWorkQueueReleaseActionForBucket('missing_review')).toBeNull()
  })

  it('builds deterministic ids from work queue entry and release action kind', () => {
    const record = buildAffiliationFileWorkQueueReleaseActionRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      actionKind: 'file_release_authorized',
      actionLabel: 'File release authorized',
      sourceBucket: 'allowed',
      sourceReasonCodes: ['site_clearance_allowed', 'file_permission_allowed'],
      recordedWeek: 7,
    })

    expect(record).toEqual({
      id: 'affiliation-file-release-action:person-status:alpha:file_release_authorized',
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      actionKind: 'file_release_authorized',
      actionLabel: 'File release authorized',
      sourceBucket: 'allowed',
      sourceReasonCodes: ['file_permission_allowed', 'site_clearance_allowed'],
      recordedWeek: 7,
    })
    expect(
      buildAffiliationFileWorkQueueReleaseActionRecordId({
        workQueueEntryId: 'person-status:alpha',
        actionKind: 'file_release_authorized',
      })
    ).toBe(record.id)
  })

  it('drops invalid records and mismatched keys during hydration sanitization', () => {
    const valid = buildAffiliationFileWorkQueueReleaseActionRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      actionKind: 'restricted_release_review_routed',
      actionLabel: 'Restricted release review routed',
      sourceBucket: 'restricted',
      sourceReasonCodes: ['file_permission_restricted'],
      recordedWeek: 3,
    })

    expect(
      sanitizeAffiliationFileWorkQueueReleaseActionRecords({
        [valid.id]: valid,
        'wrong-key': valid,
        'blocked-bucket': {
          ...valid,
          id: 'affiliation-file-release-action:person-status:beta:restricted_release_review_routed',
          workQueueEntryId: 'person-status:beta',
          sourceBucket: 'blocked',
        },
        'mismatched-action': {
          ...valid,
          id: 'affiliation-file-release-action:person-status:gamma:file_release_authorized',
          workQueueEntryId: 'person-status:gamma',
          actionKind: 'file_release_authorized',
        },
        'bad-week': {
          ...valid,
          id: 'affiliation-file-release-action:person-status:delta:restricted_release_review_routed',
          workQueueEntryId: 'person-status:delta',
          recordedWeek: 1.5,
        },
      })
    ).toEqual({
      [valid.id]: valid,
    })
  })

  it('hydrates and exports release-action records through GameState without mutating person-status records', () => {
    const state = createStartingState()
    const valid = buildAffiliationFileWorkQueueReleaseActionRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      actionKind: 'restricted_release_review_routed',
      actionLabel: 'Restricted release review routed',
      sourceBucket: 'restricted',
      sourceReasonCodes: ['file_permission_restricted'],
      recordedWeek: 5,
    })

    state.affiliationFileWorkQueueReleaseActionRecords = {
      [valid.id]: valid,
    }

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)), createStartingState())

    expect(hydrated.affiliationFileWorkQueueReleaseActionRecords).toEqual({
      [valid.id]: valid,
    })
    expect(hydrated.affiliationPersonStatusRecords).toEqual({})
  })
})
