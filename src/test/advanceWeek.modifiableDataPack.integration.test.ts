import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
  CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
} from '../domain/modifiableDataPackValidation'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

describe('advanceWeek modifiable data-pack integration (SPE-2493 slice 2)', () => {
  it('is a no-op for an empty modifiable data-pack map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.modifiableDataPackRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.modifiableDataPackRecords).toEqual({})
  })

  it('observes needs_revision records and appends governance report notes', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.modifiableDataPackRecords = {
      [BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
        BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(nextState.modifiableDataPackRecords).toEqual(state.modifiableDataPackRecords)

    const lastReport = nextState.reports[nextState.reports.length - 1]
    const governanceNote = lastReport?.notes?.find(
      (note) => note.type === 'contribution_release.modifiable_data_pack_governance'
    )

    expect(governanceNote).toBeDefined()
    expect(governanceNote?.content).toContain(BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId)
    expect(governanceNote?.content).toContain('Needs Revision')
    expect(governanceNote?.content).toContain('schema_version_borderline')
    expect(governanceNote?.metadata).toMatchObject({
      importStatus: 'needs_revision',
      outcome: 'observed',
    })
  })

  it('does not append governance notes for stable applied records', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.modifiableDataPackRecords = {
      [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
        CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
    }

    const nextState = advanceWeek(state)

    const lastReport = nextState.reports[nextState.reports.length - 1]
    const governanceNote = lastReport?.notes?.find(
      (note) => note.type === 'contribution_release.modifiable_data_pack_governance'
    )

    expect(governanceNote).toBeUndefined()
  })
})
