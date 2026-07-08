import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  buildAffiliationFileWorkQueueNonMissionEnforcementRecord,
  buildAffiliationFileWorkQueueNonMissionEnforcementRecordId,
  getAffiliationFileWorkQueueNonMissionEnforcementForBucket,
  sanitizeAffiliationFileWorkQueueNonMissionEnforcementRecords,
} from '../domain/affiliationFileWorkQueueNonMissionEnforcementRecords'

describe('affiliationFileWorkQueueNonMissionEnforcementRecords persistence', () => {
  it('maps eligible buckets to deterministic non-mission enforcement outcomes', () => {
    expect(getAffiliationFileWorkQueueNonMissionEnforcementForBucket('blocked')).toEqual({
      enforcementKind: 'blocked_non_mission_access_enforced',
      enforcementLabel: 'Blocked non-mission access enforced',
    })
    expect(getAffiliationFileWorkQueueNonMissionEnforcementForBucket('restricted')).toEqual({
      enforcementKind: 'restricted_non_mission_access_enforced',
      enforcementLabel: 'Restricted non-mission access enforced',
    })
    expect(getAffiliationFileWorkQueueNonMissionEnforcementForBucket('allowed')).toEqual({
      enforcementKind: 'allowed_non_mission_access_verified',
      enforcementLabel: 'Allowed non-mission access verified',
    })
    expect(getAffiliationFileWorkQueueNonMissionEnforcementForBucket('missing_review')).toBeNull()
  })

  it('builds deterministic ids and sorts source reason codes', () => {
    const record = buildAffiliationFileWorkQueueNonMissionEnforcementRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceBucket: 'blocked',
      sourceReasonCodes: [' blocked_site ', 'file_blocked', 'blocked_site'],
      enforcementKind: 'blocked_non_mission_access_enforced',
      enforcementLabel: 'Blocked non-mission access enforced',
      recordedWeek: 11,
    })

    expect(record).toEqual({
      id: 'affiliation-file-non-mission-enforcement:person-status:alpha:blocked',
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceBucket: 'blocked',
      sourceReasonCodes: ['blocked_site', 'file_blocked'],
      enforcementKind: 'blocked_non_mission_access_enforced',
      enforcementLabel: 'Blocked non-mission access enforced',
      recordedWeek: 11,
    })
    expect(
      buildAffiliationFileWorkQueueNonMissionEnforcementRecordId({
        workQueueEntryId: 'person-status:alpha',
        sourceBucket: 'blocked',
      })
    ).toBe(record.id)
  })

  it('drops invalid records and mismatched keys during hydration sanitization', () => {
    const valid = buildAffiliationFileWorkQueueNonMissionEnforcementRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceBucket: 'restricted',
      sourceReasonCodes: ['file_restricted'],
      enforcementKind: 'restricted_non_mission_access_enforced',
      enforcementLabel: 'Restricted non-mission access enforced',
      recordedWeek: 9,
    })

    expect(
      sanitizeAffiliationFileWorkQueueNonMissionEnforcementRecords({
        [valid.id]: valid,
        'wrong-key': valid,
        'bad-pair': {
          ...valid,
          id: 'affiliation-file-non-mission-enforcement:person-status:beta:restricted',
          workQueueEntryId: 'person-status:beta',
          sourceBucket: 'restricted',
          enforcementKind: 'blocked_non_mission_access_enforced',
        },
        'bad-week': {
          ...valid,
          id: 'affiliation-file-non-mission-enforcement:person-status:gamma:restricted',
          workQueueEntryId: 'person-status:gamma',
          recordedWeek: 7.25,
        },
      })
    ).toEqual({
      [valid.id]: valid,
    })
  })

  it('hydrates and exports non-mission enforcement records through GameState', () => {
    const state = createStartingState()
    const valid = buildAffiliationFileWorkQueueNonMissionEnforcementRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      sourceBucket: 'allowed',
      sourceReasonCodes: ['file_permission_allowed'],
      enforcementKind: 'allowed_non_mission_access_verified',
      enforcementLabel: 'Allowed non-mission access verified',
      recordedWeek: 10,
    })

    state.affiliationFileWorkQueueNonMissionEnforcementRecords = {
      [valid.id]: valid,
    }

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)), createStartingState())

    expect(hydrated.affiliationFileWorkQueueNonMissionEnforcementRecords).toEqual({
      [valid.id]: valid,
    })
    expect(hydrated.affiliationPersonStatusRecords).toEqual({})
  })
})
