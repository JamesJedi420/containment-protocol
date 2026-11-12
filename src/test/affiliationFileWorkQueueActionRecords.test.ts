import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import {
  buildAffiliationFileWorkQueueActionRecord,
  buildAffiliationFileWorkQueueActionRecordId,
  sanitizeAffiliationFileWorkQueueActionRecords,
} from '../domain/affiliationFileWorkQueueActionRecords'

describe('affiliationFileWorkQueueActionRecords persistence (SPE-2529 slice 1)', () => {
  it('builds deterministic ids and sorts source reason codes', () => {
    const record = buildAffiliationFileWorkQueueActionRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      actionKind: 'route_restricted_review',
      actionLabel: 'Route restricted review',
      sourceBucket: 'restricted',
      sourceReasonCodes: ['site_restricted', ' file_restricted ', 'site_restricted'],
      recordedWeek: 7,
    })

    expect(record).toEqual({
      id: 'affiliation-file-action:person-status:alpha:route_restricted_review',
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      actionKind: 'route_restricted_review',
      actionLabel: 'Route restricted review',
      sourceBucket: 'restricted',
      sourceReasonCodes: ['file_restricted', 'site_restricted'],
      recordedWeek: 7,
    })
    expect(
      buildAffiliationFileWorkQueueActionRecordId({
        workQueueEntryId: 'person-status:alpha',
        actionKind: 'route_restricted_review',
      })
    ).toBe(record.id)
  })

  it('drops invalid records and mismatched keys during hydration sanitization', () => {
    const valid = buildAffiliationFileWorkQueueActionRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      actionKind: 'hold_blocked_access',
      actionLabel: 'Hold access',
      sourceBucket: 'blocked',
      sourceReasonCodes: ['blocked_site'],
      recordedWeek: 3,
    })

    expect(
      sanitizeAffiliationFileWorkQueueActionRecords({
        [valid.id]: valid,
        'wrong-key': valid,
        'bad-kind': {
          ...valid,
          id: 'affiliation-file-action:person-status:beta:not_real',
          workQueueEntryId: 'person-status:beta',
          actionKind: 'not_real',
        },
        'bad-week': {
          ...valid,
          id: 'affiliation-file-action:person-status:gamma:hold_blocked_access',
          workQueueEntryId: 'person-status:gamma',
          recordedWeek: 1.5,
        },
      })
    ).toEqual({
      [valid.id]: valid,
    })
  })

  it('hydrates and exports action records through GameState without mutating person-status records', () => {
    const state = createStartingState()
    const valid = buildAffiliationFileWorkQueueActionRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      actionKind: 'monitor_allowed_access',
      actionLabel: 'Monitor allowed access',
      sourceBucket: 'allowed',
      sourceReasonCodes: ['allowed_file'],
      recordedWeek: 5,
    })

    state.affiliationFileWorkQueueActionRecords = {
      [valid.id]: valid,
    }

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)), createStartingState())

    expect(hydrated.affiliationFileWorkQueueActionRecords).toEqual({
      [valid.id]: valid,
    })
    expect(hydrated.affiliationPersonStatusRecords).toEqual({})
  })
})
