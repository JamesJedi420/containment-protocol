import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  buildAffiliationFileWorkQueueEvidenceResolutionReasonFingerprint,
  buildAffiliationFileWorkQueueEvidenceResolutionRecord,
  buildAffiliationFileWorkQueueEvidenceResolutionRecordId,
  normalizeAffiliationFileWorkQueueMissingReasonCodes,
  sanitizeAffiliationFileWorkQueueEvidenceResolutionRecords,
} from '../domain/affiliationFileWorkQueueEvidenceResolutionRecords'

describe('affiliationFileWorkQueueEvidenceResolutionRecords persistence', () => {
  it('builds deterministic ids from normalized missing-reason fingerprints', () => {
    const record = buildAffiliationFileWorkQueueEvidenceResolutionRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceBucket: 'missing_review',
      missingReasonCodes: [
        ' missing_welfare_record ',
        'missing_candidate_record',
        'missing_welfare_record',
        'file_restricted',
      ],
      recordedWeek: 7,
    })

    expect(record).toEqual({
      id: 'affiliation-file-evidence-resolution:person-status:alpha:missing_candidate_record+missing_welfare_record',
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceBucket: 'missing_review',
      missingReasonCodes: ['missing_candidate_record', 'missing_welfare_record'],
      recordedWeek: 7,
    })
    expect(normalizeAffiliationFileWorkQueueMissingReasonCodes(record.missingReasonCodes)).toEqual([
      'missing_candidate_record',
      'missing_welfare_record',
    ])
    expect(
      buildAffiliationFileWorkQueueEvidenceResolutionReasonFingerprint(record.missingReasonCodes)
    ).toBe('missing_candidate_record+missing_welfare_record')
    expect(
      buildAffiliationFileWorkQueueEvidenceResolutionRecordId({
        workQueueEntryId: 'person-status:alpha',
        missingReasonCodes: ['missing_welfare_record', 'missing_candidate_record'],
      })
    ).toBe(record.id)
  })

  it('drops invalid records and mismatched keys during hydration sanitization', () => {
    const valid = buildAffiliationFileWorkQueueEvidenceResolutionRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceBucket: 'missing_review',
      missingReasonCodes: ['missing_candidate_record'],
      recordedWeek: 3,
    })

    expect(
      sanitizeAffiliationFileWorkQueueEvidenceResolutionRecords({
        [valid.id]: valid,
        'wrong-key': valid,
        'bad-bucket': {
          ...valid,
          id: 'affiliation-file-evidence-resolution:person-status:beta:missing_candidate_record',
          workQueueEntryId: 'person-status:beta',
          sourceBucket: 'restricted',
        },
        'bad-week': {
          ...valid,
          id: 'affiliation-file-evidence-resolution:person-status:gamma:missing_candidate_record',
          workQueueEntryId: 'person-status:gamma',
          recordedWeek: -1,
        },
        'bad-reasons': {
          ...valid,
          id: 'affiliation-file-evidence-resolution:person-status:delta:',
          workQueueEntryId: 'person-status:delta',
          missingReasonCodes: ['file_restricted'],
        },
      })
    ).toEqual({
      [valid.id]: valid,
    })
  })

  it('hydrates and exports evidence-resolution records through GameState without mutating person-status records', () => {
    const state = createStartingState()
    const valid = buildAffiliationFileWorkQueueEvidenceResolutionRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceBucket: 'missing_review',
      missingReasonCodes: ['missing_facility_file_access_decision'],
      recordedWeek: 5,
    })

    state.affiliationFileWorkQueueEvidenceResolutionRecords = {
      [valid.id]: valid,
    }

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)), createStartingState())

    expect(hydrated.affiliationFileWorkQueueEvidenceResolutionRecords).toEqual({
      [valid.id]: valid,
    })
    expect(hydrated.affiliationPersonStatusRecords).toEqual({})
  })
})
