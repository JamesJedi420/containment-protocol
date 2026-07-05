import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  buildAffiliationFileWorkQueueReleasePackageRecord,
  buildAffiliationFileWorkQueueReleasePackageRecordId,
  getAffiliationFileWorkQueueReleasePackageForFulfillment,
  sanitizeAffiliationFileWorkQueueReleasePackageRecords,
} from '../domain/affiliationFileWorkQueueReleasePackageRecords'

describe('affiliationFileWorkQueueReleasePackageRecords persistence', () => {
  it('maps fulfilled file releases to safe handoff packages', () => {
    expect(
      getAffiliationFileWorkQueueReleasePackageForFulfillment('file_release_fulfilled')
    ).toEqual({
      packageKind: 'safe_file_handoff_package',
      packageLabel: 'Safe file handoff package',
    })
  })

  it('builds deterministic ids and package refs from work queue entry and fulfillment kind', () => {
    const record = buildAffiliationFileWorkQueueReleasePackageRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceOutcomeKind: 'file_released',
      sourceFulfillmentKind: 'file_release_fulfilled',
      sourceReasonCodes: ['site_clearance_allowed', 'file_permission_allowed'],
      packageKind: 'safe_file_handoff_package',
      packageLabel: 'Safe file handoff package',
      recordedWeek: 9,
    })

    expect(record).toEqual({
      id: 'affiliation-file-release-package:person-status:alpha:file_release_fulfilled',
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceOutcomeKind: 'file_released',
      sourceFulfillmentKind: 'file_release_fulfilled',
      sourceReasonCodes: ['file_permission_allowed', 'site_clearance_allowed'],
      packageKind: 'safe_file_handoff_package',
      packageLabel: 'Safe file handoff package',
      packageRef: 'release-package:person-status:alpha:file_release_fulfilled',
      recordedWeek: 9,
    })
    expect(
      buildAffiliationFileWorkQueueReleasePackageRecordId({
        workQueueEntryId: 'person-status:alpha',
        sourceFulfillmentKind: 'file_release_fulfilled',
      })
    ).toBe(record.id)
  })

  it('drops invalid records and mismatched keys during hydration sanitization', () => {
    const valid = buildAffiliationFileWorkQueueReleasePackageRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceOutcomeKind: 'file_released',
      sourceFulfillmentKind: 'file_release_fulfilled',
      sourceReasonCodes: ['file_permission_allowed'],
      packageKind: 'safe_file_handoff_package',
      packageLabel: 'Safe file handoff package',
      recordedWeek: 6,
    })

    expect(
      sanitizeAffiliationFileWorkQueueReleasePackageRecords({
        [valid.id]: valid,
        'wrong-key': valid,
        'bad-outcome': {
          ...valid,
          id: 'affiliation-file-release-package:person-status:beta:file_release_fulfilled',
          workQueueEntryId: 'person-status:beta',
          sourceOutcomeKind: 'restricted_review_pending',
          packageRef: 'release-package:person-status:beta:file_release_fulfilled',
        },
        'bad-package': {
          ...valid,
          id: 'affiliation-file-release-package:person-status:gamma:file_release_fulfilled',
          workQueueEntryId: 'person-status:gamma',
          packageKind: 'unknown',
          packageRef: 'release-package:person-status:gamma:file_release_fulfilled',
        },
        'bad-ref': {
          ...valid,
          id: 'affiliation-file-release-package:person-status:delta:file_release_fulfilled',
          workQueueEntryId: 'person-status:delta',
          packageRef: 'release-package:wrong:file_release_fulfilled',
        },
      })
    ).toEqual({
      [valid.id]: valid,
    })
  })

  it('hydrates package records without mutating source ledgers', () => {
    const state = createStartingState()
    const valid = buildAffiliationFileWorkQueueReleasePackageRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceOutcomeKind: 'file_released',
      sourceFulfillmentKind: 'file_release_fulfilled',
      sourceReasonCodes: ['file_permission_allowed'],
      packageKind: 'safe_file_handoff_package',
      packageLabel: 'Safe file handoff package',
      recordedWeek: 5,
    })

    state.affiliationFileWorkQueueReleasePackageRecords = {
      [valid.id]: valid,
    }

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)), createStartingState())

    expect(hydrated.affiliationFileWorkQueueReleasePackageRecords).toEqual({
      [valid.id]: valid,
    })
    expect(hydrated.affiliationPersonStatusRecords).toEqual({})
    expect(hydrated.affiliationFileWorkQueueReleaseActionRecords).toEqual({})
    expect(hydrated.affiliationFileWorkQueueReleaseOutcomeRecords).toEqual({})
    expect(hydrated.affiliationFileWorkQueueReleaseFulfillmentRecords).toEqual({})
  })
})
