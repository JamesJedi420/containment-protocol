import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  buildAffiliationFileWorkQueueReleaseOutcomeRecord,
  buildAffiliationFileWorkQueueReleaseOutcomeRecordId,
  getAffiliationFileWorkQueueReleaseOutcomeForAction,
  sanitizeAffiliationFileWorkQueueReleaseOutcomeRecords,
} from '../domain/affiliationFileWorkQueueReleaseOutcomeRecords'

describe('affiliationFileWorkQueueReleaseOutcomeRecords persistence', () => {
  it('maps release action kinds to deterministic outcome kinds', () => {
    expect(getAffiliationFileWorkQueueReleaseOutcomeForAction('file_release_authorized')).toEqual({
      outcomeKind: 'file_released',
      outcomeLabel: 'File released',
    })
    expect(
      getAffiliationFileWorkQueueReleaseOutcomeForAction('restricted_release_review_routed')
    ).toEqual({
      outcomeKind: 'restricted_review_pending',
      outcomeLabel: 'Restricted review pending',
    })
  })

  it('builds deterministic ids from work queue entry and source release action kind', () => {
    const record = buildAffiliationFileWorkQueueReleaseOutcomeRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceActionKind: 'file_release_authorized',
      sourceBucket: 'allowed',
      sourceReasonCodes: ['site_clearance_allowed', 'file_permission_allowed'],
      outcomeKind: 'file_released',
      outcomeLabel: 'File released',
      recordedWeek: 8,
    })

    expect(record).toEqual({
      id: 'affiliation-file-release-outcome:person-status:alpha:file_release_authorized',
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceActionKind: 'file_release_authorized',
      sourceBucket: 'allowed',
      sourceReasonCodes: ['file_permission_allowed', 'site_clearance_allowed'],
      outcomeKind: 'file_released',
      outcomeLabel: 'File released',
      recordedWeek: 8,
    })
    expect(
      buildAffiliationFileWorkQueueReleaseOutcomeRecordId({
        workQueueEntryId: 'person-status:alpha',
        sourceActionKind: 'file_release_authorized',
      })
    ).toBe(record.id)
  })

  it('drops invalid records and mismatched keys during hydration sanitization', () => {
    const valid = buildAffiliationFileWorkQueueReleaseOutcomeRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceActionKind: 'restricted_release_review_routed',
      sourceBucket: 'restricted',
      sourceReasonCodes: ['file_permission_restricted'],
      outcomeKind: 'restricted_review_pending',
      outcomeLabel: 'Restricted review pending',
      recordedWeek: 4,
    })

    expect(
      sanitizeAffiliationFileWorkQueueReleaseOutcomeRecords({
        [valid.id]: valid,
        'wrong-key': valid,
        'bad-pair': {
          ...valid,
          id: 'affiliation-file-release-outcome:person-status:beta:file_release_authorized',
          workQueueEntryId: 'person-status:beta',
          sourceActionKind: 'file_release_authorized',
          outcomeKind: 'restricted_review_pending',
        },
        'bad-bucket': {
          ...valid,
          id: 'affiliation-file-release-outcome:person-status:gamma:restricted_release_review_routed',
          workQueueEntryId: 'person-status:gamma',
          sourceBucket: 'allowed',
        },
        'bad-week': {
          ...valid,
          id: 'affiliation-file-release-outcome:person-status:delta:restricted_release_review_routed',
          workQueueEntryId: 'person-status:delta',
          recordedWeek: 1.5,
        },
      })
    ).toEqual({
      [valid.id]: valid,
    })
  })

  it('hydrates and exports release-outcome records through GameState without mutating person-status records', () => {
    const state = createStartingState()
    const valid = buildAffiliationFileWorkQueueReleaseOutcomeRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceActionKind: 'restricted_release_review_routed',
      sourceBucket: 'restricted',
      sourceReasonCodes: ['file_permission_restricted'],
      outcomeKind: 'restricted_review_pending',
      outcomeLabel: 'Restricted review pending',
      recordedWeek: 5,
    })

    state.affiliationFileWorkQueueReleaseOutcomeRecords = {
      [valid.id]: valid,
    }

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)), createStartingState())

    expect(hydrated.affiliationFileWorkQueueReleaseOutcomeRecords).toEqual({
      [valid.id]: valid,
    })
    expect(hydrated.affiliationPersonStatusRecords).toEqual({})
  })
})
