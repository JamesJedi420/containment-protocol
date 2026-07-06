import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  buildAffiliationFileWorkQueueFileReleaseDeliveryRecord,
  buildAffiliationFileWorkQueueFileReleaseDeliveryRecordId,
  getAffiliationFileWorkQueueFileReleaseDeliveryForPackage,
  sanitizeAffiliationFileWorkQueueFileReleaseDeliveryRecords,
} from '../domain/affiliationFileWorkQueueFileReleaseDeliveryRecords'

describe('affiliationFileWorkQueueFileReleaseDeliveryRecords persistence', () => {
  it('maps safe handoff packages to metadata-only file-release delivery receipts', () => {
    expect(
      getAffiliationFileWorkQueueFileReleaseDeliveryForPackage('safe_file_handoff_package')
    ).toEqual({
      deliveryKind: 'metadata_only_file_release_delivered',
      deliveryLabel: 'Metadata-only file release delivered',
    })
  })

  it('builds deterministic ids and delivery refs from work queue entry and source package kind', () => {
    const record = buildAffiliationFileWorkQueueFileReleaseDeliveryRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourcePackageKind: 'safe_file_handoff_package',
      sourcePackageRef: 'release-package:person-status:alpha:file_release_fulfilled',
      sourceReasonCodes: ['site_clearance_allowed', 'file_permission_allowed'],
      deliveryKind: 'metadata_only_file_release_delivered',
      deliveryLabel: 'Metadata-only file release delivered',
      recordedWeek: 14,
    })

    expect(record).toEqual({
      id: 'affiliation-file-release-delivery:person-status:alpha:safe_file_handoff_package',
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourcePackageKind: 'safe_file_handoff_package',
      sourcePackageRef: 'release-package:person-status:alpha:file_release_fulfilled',
      sourceReasonCodes: ['file_permission_allowed', 'site_clearance_allowed'],
      deliveryKind: 'metadata_only_file_release_delivered',
      deliveryLabel: 'Metadata-only file release delivered',
      deliveryRef: 'file-release-delivery:person-status:alpha:safe_file_handoff_package',
      recordedWeek: 14,
    })
    expect(
      buildAffiliationFileWorkQueueFileReleaseDeliveryRecordId({
        workQueueEntryId: 'person-status:alpha',
        sourcePackageKind: 'safe_file_handoff_package',
      })
    ).toBe(record.id)
  })

  it('drops invalid, mismatched, duplicate, and malformed week entries during hydration sanitization', () => {
    const valid = buildAffiliationFileWorkQueueFileReleaseDeliveryRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourcePackageKind: 'safe_file_handoff_package',
      sourcePackageRef: 'release-package:person-status:alpha:file_release_fulfilled',
      sourceReasonCodes: ['file_permission_allowed'],
      deliveryKind: 'metadata_only_file_release_delivered',
      deliveryLabel: 'Metadata-only file release delivered',
      recordedWeek: 6,
    })

    expect(
      sanitizeAffiliationFileWorkQueueFileReleaseDeliveryRecords({
        [valid.id]: valid,
        'wrong-key': valid,
        'bad-pair': {
          ...valid,
          id: 'affiliation-file-release-delivery:person-status:beta:safe_file_handoff_package',
          workQueueEntryId: 'person-status:beta',
          deliveryKind: 'wrong',
          deliveryRef: 'file-release-delivery:person-status:beta:safe_file_handoff_package',
          sourcePackageRef: 'release-package:person-status:beta:file_release_fulfilled',
        },
        'bad-source-ref': {
          ...valid,
          id: 'affiliation-file-release-delivery:person-status:gamma:safe_file_handoff_package',
          workQueueEntryId: 'person-status:gamma',
          sourcePackageRef: 'release-package:wrong:file_release_fulfilled',
          deliveryRef: 'file-release-delivery:person-status:gamma:safe_file_handoff_package',
        },
        'bad-delivery-ref': {
          ...valid,
          id: 'affiliation-file-release-delivery:person-status:delta:safe_file_handoff_package',
          workQueueEntryId: 'person-status:delta',
          sourcePackageRef: 'release-package:person-status:delta:file_release_fulfilled',
          deliveryRef: 'file-release-delivery:wrong:safe_file_handoff_package',
        },
        'bad-week': {
          ...valid,
          id: 'affiliation-file-release-delivery:person-status:week:safe_file_handoff_package',
          workQueueEntryId: 'person-status:week',
          sourcePackageRef: 'release-package:person-status:week:file_release_fulfilled',
          deliveryRef: 'file-release-delivery:person-status:week:safe_file_handoff_package',
          recordedWeek: 5.5,
        },
        duplicate: {
          ...valid,
        },
      })
    ).toEqual({
      [valid.id]: valid,
    })
  })

  it('hydrates file-release delivery records without mutating package and fulfillment ledgers', () => {
    const state = createStartingState()
    const delivery = buildAffiliationFileWorkQueueFileReleaseDeliveryRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourcePackageKind: 'safe_file_handoff_package',
      sourcePackageRef: 'release-package:person-status:alpha:file_release_fulfilled',
      sourceReasonCodes: ['file_permission_allowed'],
      deliveryKind: 'metadata_only_file_release_delivered',
      deliveryLabel: 'Metadata-only file release delivered',
      recordedWeek: 7,
    })

    state.affiliationFileWorkQueueReleaseFulfillmentRecords = {
      'affiliation-file-release-fulfillment:person-status:alpha:file_released': {
        id: 'affiliation-file-release-fulfillment:person-status:alpha:file_released',
        workQueueEntryId: 'person-status:alpha',
        subjectId: 'subject:alpha',
        subjectLabel: 'Alpha Subject',
        sourceOutcomeKind: 'file_released',
        sourceBucket: 'allowed',
        sourceReasonCodes: ['file_permission_allowed'],
        fulfillmentKind: 'file_release_fulfilled',
        fulfillmentLabel: 'File release fulfilled',
        recordedWeek: 6,
      },
    }
    state.affiliationFileWorkQueueReleasePackageRecords = {
      'affiliation-file-release-package:person-status:alpha:file_release_fulfilled': {
        id: 'affiliation-file-release-package:person-status:alpha:file_release_fulfilled',
        workQueueEntryId: 'person-status:alpha',
        subjectId: 'subject:alpha',
        subjectLabel: 'Alpha Subject',
        sourceOutcomeKind: 'file_released',
        sourceFulfillmentKind: 'file_release_fulfilled',
        sourceReasonCodes: ['file_permission_allowed'],
        packageKind: 'safe_file_handoff_package',
        packageLabel: 'Safe file handoff package',
        packageRef: 'release-package:person-status:alpha:file_release_fulfilled',
        recordedWeek: 6,
      },
    }
    state.affiliationFileWorkQueueFileReleaseDeliveryRecords = {
      [delivery.id]: delivery,
    }

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)), createStartingState())

    expect(hydrated.affiliationFileWorkQueueFileReleaseDeliveryRecords).toEqual({
      [delivery.id]: delivery,
    })
    expect(
      hydrated.affiliationFileWorkQueueReleaseFulfillmentRecords?.[
        'affiliation-file-release-fulfillment:person-status:alpha:file_released'
      ]
    ).toMatchObject({
      fulfillmentKind: 'file_release_fulfilled',
    })
    expect(
      hydrated.affiliationFileWorkQueueReleasePackageRecords?.[
        'affiliation-file-release-package:person-status:alpha:file_release_fulfilled'
      ]
    ).toMatchObject({
      packageKind: 'safe_file_handoff_package',
    })
  })
})
