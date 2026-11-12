import { describe, expect, it } from 'vitest'

import {
  COVERED_PURSUIT_RESOLUTION_FIXTURE,
  DISPOSAL_DEADLINE_SWEEP_FIXTURE,
  SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE,
} from '../domain/visualTriggerHazardRegistry'
import { advanceVisualTriggerHazardRecordForWeek } from '../domain/visualTriggerHazardWeeklyOrchestration'
import {
  buildWeeklyVisualTriggerHazardTransitionReportNotes,
} from '../domain/visualTriggerHazardWeeklyReportNotes'
import {
  composeVisualTriggerHazardWeeklyTransitionSummaries,
  formatVisualTriggerHazardWeeklyTransitionNoteContent,
} from '../domain/visualTriggerHazardSurfacing'

describe('visualTriggerHazardSurfacing (SPE-2489 slice 5)', () => {
  it('returns no summaries for empty maps', () => {
    expect(
      composeVisualTriggerHazardWeeklyTransitionSummaries({
        priorRecords: {},
        nextRecords: {},
      })
    ).toEqual([])
  })

  it('returns no summaries when records are unchanged', () => {
    const record = COVERED_PURSUIT_RESOLUTION_FIXTURE

    expect(
      composeVisualTriggerHazardWeeklyTransitionSummaries({
        priorRecords: { [record.id]: record },
        nextRecords: { [record.id]: record },
      })
    ).toEqual([])
  })

  it('surfaces pursuit resolution transition', () => {
    const priorRecord = COVERED_PURSUIT_RESOLUTION_FIXTURE
    const nextRecord = advanceVisualTriggerHazardRecordForWeek(priorRecord, 9)

    const summaries = composeVisualTriggerHazardWeeklyTransitionSummaries({
      priorRecords: { [priorRecord.id]: priorRecord },
      nextRecords: { [priorRecord.id]: nextRecord },
    })

    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.transitionKinds).toContain('pursuit_state_changed')
    expect(summaries[0]?.nextPursuitState).toBe('resolved')
    expect(formatVisualTriggerHazardWeeklyTransitionNoteContent(summaries[0]!)).toContain(
      priorRecord.label
    )
  })

  it('surfaces awareness-band and pursuit transitions together', () => {
    const priorRecord = SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE
    const nextRecord = advanceVisualTriggerHazardRecordForWeek(priorRecord, 5)

    const summaries = composeVisualTriggerHazardWeeklyTransitionSummaries({
      priorRecords: { [priorRecord.id]: priorRecord },
      nextRecords: { [priorRecord.id]: nextRecord },
    })

    expect(summaries[0]?.transitionKinds).toContain('awareness_band_advanced')
    expect(summaries[0]?.nextObserverAwarenessBand).toBe('heightened')
    expect(summaries[0]?.priorObserverAwarenessBand).toBe('conscious')
  })

  it('surfaces sweep status advancement', () => {
    const priorRecord = DISPOSAL_DEADLINE_SWEEP_FIXTURE
    const nextRecord = advanceVisualTriggerHazardRecordForWeek(priorRecord, 31)

    const summaries = composeVisualTriggerHazardWeeklyTransitionSummaries({
      priorRecords: { [priorRecord.id]: priorRecord },
      nextRecords: { [priorRecord.id]: nextRecord },
    })

    expect(summaries[0]?.transitionKinds).toContain('sweep_status_advanced')
    expect(summaries[0]?.advancedSweepMediaInstanceIds.length).toBeGreaterThan(0)
  })
})

describe('visualTriggerHazardWeeklyReportNotes (SPE-2489 slice 5)', () => {
  it('returns no notes when no transitions occur', () => {
    const record = COVERED_PURSUIT_RESOLUTION_FIXTURE

    expect(
      buildWeeklyVisualTriggerHazardTransitionReportNotes({
        priorRecords: { [record.id]: record },
        nextRecords: { [record.id]: record },
        week: 9,
        sequenceStart: 1,
      })
    ).toEqual([])
  })

  it('emits typed weekly transition notes for pursuit resolution', () => {
    const priorRecord = COVERED_PURSUIT_RESOLUTION_FIXTURE
    const nextRecord = advanceVisualTriggerHazardRecordForWeek(priorRecord, 9)

    const notes = buildWeeklyVisualTriggerHazardTransitionReportNotes({
      priorRecords: { [priorRecord.id]: priorRecord },
      nextRecords: { [priorRecord.id]: nextRecord },
      week: 10,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('visual_trigger_hazard.weekly_transition')
    expect(notes[0]?.metadata?.recordId).toBe(priorRecord.id)
    expect(notes[0]?.content).toContain('Resolved')
  })
})
