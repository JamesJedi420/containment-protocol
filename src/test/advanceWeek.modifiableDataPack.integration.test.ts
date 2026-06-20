import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
  CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
} from '../domain/modifiableDataPackValidation'
import { modifiableDataPackPublishQueueRecordId } from '../domain/modifiableDataPackPublishQueueEnqueue'

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

  it('enqueues publish-queue records and executes them in the same advanceWeek tick', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.modifiableDataPackRecords = {
      [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
        CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const queueRecordId = modifiableDataPackPublishQueueRecordId(
      CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId
    )

    expect(nextState.publishQueueRecords?.[queueRecordId]?.status).toBe('published')

    const lastReport = nextState.reports[nextState.reports.length - 1]
    const enqueueNote = lastReport?.notes?.find(
      (note) => note.type === 'contribution_release.modifiable_data_pack_publish_enqueue'
    )
    const executionNote = lastReport?.notes?.find(
      (note) => note.type === 'contribution_release.publish_queue_execution'
    )

    expect(enqueueNote).toBeDefined()
    expect(executionNote).toBeDefined()
    expect(executionNote?.metadata).toMatchObject({
      recordId: queueRecordId,
      outcome: 'completed',
    })
  })

  it('does not duplicate publish-queue records across subsequent weeks', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.modifiableDataPackRecords = {
      [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
        CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
    }

    const afterFirstWeek = advanceWeek(state)
    const queueRecordId = modifiableDataPackPublishQueueRecordId(
      CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId
    )

    expect(Object.keys(afterFirstWeek.publishQueueRecords ?? {})).toEqual([queueRecordId])

    const afterSecondWeek = advanceWeek(afterFirstWeek)

    expect(Object.keys(afterSecondWeek.publishQueueRecords ?? {})).toEqual([queueRecordId])
    expect(afterSecondWeek.publishQueueRecords?.[queueRecordId]?.status).toBe('published')

    const lastReport = afterSecondWeek.reports[afterSecondWeek.reports.length - 1]
    const enqueueNotes =
      lastReport?.notes?.filter(
        (note) => note.type === 'contribution_release.modifiable_data_pack_publish_enqueue'
      ) ?? []

    expect(enqueueNotes).toHaveLength(0)
  })
})
