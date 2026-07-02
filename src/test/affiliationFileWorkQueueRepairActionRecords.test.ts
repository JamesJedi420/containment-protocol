import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  buildAffiliationFileWorkQueueRepairActionRecord,
  buildAffiliationFileWorkQueueRepairActionRecordId,
  sanitizeAffiliationFileWorkQueueRepairActionRecords,
} from '../domain/affiliationFileWorkQueueRepairActionRecords'

describe('affiliationFileWorkQueueRepairActionRecords persistence', () => {
  it('builds deterministic ids from work queue entry and missing reason code', () => {
    const record = buildAffiliationFileWorkQueueRepairActionRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      reasonCode: ' missing_candidate_ref ',
      repairLabel: 'Candidate link repair',
      recordedWeek: 7,
    })

    expect(record).toEqual({
      id: 'affiliation-file-repair-action:person-status:alpha:missing_candidate_ref',
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      reasonCode: 'missing_candidate_ref',
      repairLabel: 'Candidate link repair',
      recordedWeek: 7,
    })
    expect(
      buildAffiliationFileWorkQueueRepairActionRecordId({
        workQueueEntryId: 'person-status:alpha',
        reasonCode: 'missing_candidate_ref',
      })
    ).toBe(record.id)
  })

  it('drops invalid records and mismatched keys during hydration sanitization', () => {
    const valid = buildAffiliationFileWorkQueueRepairActionRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      reasonCode: 'missing_candidate_ref',
      repairLabel: 'Candidate link repair',
      recordedWeek: 3,
    })

    expect(
      sanitizeAffiliationFileWorkQueueRepairActionRecords({
        [valid.id]: valid,
        'wrong-key': valid,
        'bad-reason': {
          ...valid,
          id: 'affiliation-file-repair-action:person-status:beta:file_restricted',
          workQueueEntryId: 'person-status:beta',
          reasonCode: 'file_restricted',
        },
        'bad-week': {
          ...valid,
          id: 'affiliation-file-repair-action:person-status:gamma:missing_candidate_ref',
          workQueueEntryId: 'person-status:gamma',
          recordedWeek: 1.5,
        },
      })
    ).toEqual({
      [valid.id]: valid,
    })
  })

  it('hydrates and exports repair-action records through GameState without mutating person-status records', () => {
    const state = createStartingState()
    const valid = buildAffiliationFileWorkQueueRepairActionRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      reasonCode: 'missing_candidate_ref',
      repairLabel: 'Candidate link repair',
      recordedWeek: 5,
    })

    state.affiliationFileWorkQueueRepairActionRecords = {
      [valid.id]: valid,
    }

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)), createStartingState())

    expect(hydrated.affiliationFileWorkQueueRepairActionRecords).toEqual({
      [valid.id]: valid,
    })
    expect(hydrated.affiliationPersonStatusRecords).toEqual({})
  })
})
