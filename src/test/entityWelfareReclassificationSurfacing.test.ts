import { describe, expect, it } from 'vitest'

import {
  advanceEntityWelfareReclassificationRecordForWeek,
} from '../domain/entityWelfareReclassificationWeeklyOrchestration'
import type { EntityWelfareReclassificationRecord } from '../domain/entityWelfareReclassificationRegistry'
import {
  buildWeeklyEntityWelfareReclassificationTransitionReportNotes,
} from '../domain/entityWelfareReclassificationWeeklyReportNotes'
import {
  composeEntityWelfareReclassificationWeeklyTransitionSummaries,
  formatEntityWelfareReclassificationWeeklyTransitionNoteContent,
} from '../domain/entityWelfareReclassificationSurfacing'

function scheduledRecord(): EntityWelfareReclassificationRecord {
  return {
    id: 'reclass:surfacing-scheduled',
    label: 'Surfacing scheduled reclassification record',
    priorThreatLabel: 'hostile-predator',
    proposedDisposition: 'cooperative',
    reclassificationState: 'pending',
    reviewGate: 'psych',
    evidenceBundleRefs: ['evidence:contact-log-week-14'],
    containmentRevisionRefs: ['revision:social-enrichment-pilot'],
    transitionHistory: [
      {
        fromState: 'pending',
        toState: 'approved',
        week: 16,
        reviewGate: 'psych',
        reviewArtifactRef: 'review:psych-panel-summary-19',
        note: 'Psych panel confirms cooperative disposition.',
      },
    ],
  }
}

describe('entityWelfareReclassificationSurfacing (SPE-2490 slice 5)', () => {
  it('returns no summaries for empty maps', () => {
    expect(
      composeEntityWelfareReclassificationWeeklyTransitionSummaries({
        priorRecords: {},
        nextRecords: {},
      })
    ).toEqual([])
  })

  it('returns no summaries when records are unchanged', () => {
    const record = scheduledRecord()

    expect(
      composeEntityWelfareReclassificationWeeklyTransitionSummaries({
        priorRecords: { [record.id]: record },
        nextRecords: { [record.id]: record },
      })
    ).toEqual([])
  })

  it('surfaces reclassification state transition', () => {
    const priorRecord = scheduledRecord()
    const nextRecord = advanceEntityWelfareReclassificationRecordForWeek(priorRecord, 16)

    const summaries = composeEntityWelfareReclassificationWeeklyTransitionSummaries({
      priorRecords: { [priorRecord.id]: priorRecord },
      nextRecords: { [priorRecord.id]: nextRecord },
    })

    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.transitionKinds).toContain('reclassification_state_changed')
    expect(summaries[0]?.nextReclassificationState).toBe('approved')
    expect(formatEntityWelfareReclassificationWeeklyTransitionNoteContent(summaries[0]!)).toContain(
      priorRecord.label
    )
    expect(formatEntityWelfareReclassificationWeeklyTransitionNoteContent(summaries[0]!)).toContain(
      'Approved'
    )
  })

  it('surfaces review gate transition when gate is set during tick', () => {
    const priorRecord: EntityWelfareReclassificationRecord = {
      ...scheduledRecord(),
      reviewGate: undefined,
    }
    const nextRecord = advanceEntityWelfareReclassificationRecordForWeek(priorRecord, 16)

    const summaries = composeEntityWelfareReclassificationWeeklyTransitionSummaries({
      priorRecords: { [priorRecord.id]: priorRecord },
      nextRecords: { [priorRecord.id]: nextRecord },
    })

    expect(summaries[0]?.transitionKinds).toContain('review_gate_changed')
    expect(summaries[0]?.nextReviewGate).toBe('psych')
    expect(summaries[0]?.priorReviewGate).toBeUndefined()
  })
})

describe('entityWelfareReclassificationWeeklyReportNotes (SPE-2490 slice 5)', () => {
  it('returns no notes when no transitions occur', () => {
    const record = scheduledRecord()

    expect(
      buildWeeklyEntityWelfareReclassificationTransitionReportNotes({
        priorRecords: { [record.id]: record },
        nextRecords: { [record.id]: record },
        week: 16,
        sequenceStart: 1,
      })
    ).toEqual([])
  })

  it('emits typed weekly transition notes for reclassification state change', () => {
    const priorRecord = scheduledRecord()
    const nextRecord = advanceEntityWelfareReclassificationRecordForWeek(priorRecord, 16)

    const notes = buildWeeklyEntityWelfareReclassificationTransitionReportNotes({
      priorRecords: { [priorRecord.id]: priorRecord },
      nextRecords: { [priorRecord.id]: nextRecord },
      week: 16,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('entity_welfare_reclassification.weekly_transition')
    expect(notes[0]?.metadata?.recordId).toBe(priorRecord.id)
    expect(notes[0]?.content).toContain('Approved')
  })
})
