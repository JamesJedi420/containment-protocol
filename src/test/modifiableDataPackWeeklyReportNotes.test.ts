import { describe, expect, it } from 'vitest'

import {
  BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
  CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
} from '../domain/modifiableDataPackValidation'
import type { ModifiableDataPackWeeklyTickReceipt } from '../domain/modifiableDataPackWeeklyOrchestration'
import { buildWeeklyModifiableDataPackGovernanceReportNotes } from '../domain/modifiableDataPackWeeklyReportNotes'

describe('modifiableDataPackWeeklyReportNotes (SPE-2493 slice 2)', () => {
  const observedReceipt: ModifiableDataPackWeeklyTickReceipt = {
    packId: BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId,
    outcome: 'observed',
    executionWeek: 2,
    importStatus: 'needs_revision',
    reasonCodes: ['schema_version_borderline'],
  }

  it('returns no notes when receipts are empty or only stable applied skips', () => {
    expect(
      buildWeeklyModifiableDataPackGovernanceReportNotes({
        receipts: [],
        records: {},
        week: 2,
        sequenceStart: 1,
      })
    ).toEqual([])

    expect(
      buildWeeklyModifiableDataPackGovernanceReportNotes({
        receipts: [
          {
            packId: CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId,
            outcome: 'skipped',
            executionWeek: 2,
            importStatus: 'applied',
            skipCode: 'import_status_stable',
            reasonCodes: [],
          },
        ],
        records: {
          [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
            CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
        },
        week: 2,
        sequenceStart: 1,
      })
    ).toEqual([])
  })

  it('emits deterministic contribution_release notes for needs_revision observations', () => {
    const notes = buildWeeklyModifiableDataPackGovernanceReportNotes({
      receipts: [observedReceipt],
      records: {
        [BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
          BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
      },
      week: 2,
      sequenceStart: 3,
      baseTimestamp: 1_700_000_000_000,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('contribution_release.modifiable_data_pack_governance')
    expect(notes[0]?.content).toContain('Modifiable data pack')
    expect(notes[0]?.content).toContain(BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId)
    expect(notes[0]?.content).toContain('Needs Revision')
    expect(notes[0]?.content).toContain('schema_version_borderline')
    expect(notes[0]?.metadata).toMatchObject({
      packId: BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId,
      outcome: 'observed',
      executionWeek: 2,
      importStatus: 'needs_revision',
      week: 2,
    })
  })

  it('discriminates needs_revision observations from applied stable skips in batch output', () => {
    const notes = buildWeeklyModifiableDataPackGovernanceReportNotes({
      receipts: [
        {
          packId: CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId,
          outcome: 'skipped',
          executionWeek: 2,
          importStatus: 'applied',
          skipCode: 'import_status_stable',
          reasonCodes: [],
        },
        observedReceipt,
      ],
      records: {
        [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
          CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
        [BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
          BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
      },
      week: 2,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.metadata?.importStatus).toBe('needs_revision')
  it('emits notes for removed validation-failure receipts', () => {
    const notes = buildWeeklyModifiableDataPackGovernanceReportNotes({
      receipts: [
        {
          packId: CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId,
          outcome: 'removed',
          executionWeek: 2,
          importStatus: 'applied',
          reasonCodes: [],
        },
      ],
      records: {},
      week: 2,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.content).toContain('removed from runtime map')
    expect(notes[0]?.metadata?.outcome).toBe('removed')
  })
})
