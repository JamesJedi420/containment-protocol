import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  HOSTILE_TO_COOPERATIVE_FIXTURE,
  PENDING_TO_APPROVED_FIXTURE,
  type EntityWelfareReclassificationRecord,
} from '../domain/entityWelfareReclassificationRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

function scheduledRecord(): EntityWelfareReclassificationRecord {
  return {
    id: 'reclass:advance-week-scheduled',
    label: 'Advance week scheduled reclassification record',
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

describe('advanceWeek entity welfare reclassification integration (SPE-2114 slice 3 / SPE-2490 slice 5)', () => {
  it('is a no-op for an empty entity welfare reclassification map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.entityWelfareReclassificationRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.entityWelfareReclassificationRecords).toEqual({})
  })

  it('applies scheduled transition after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 15
    const record = scheduledRecord()
    state.entityWelfareReclassificationRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const nextRecord = nextState.entityWelfareReclassificationRecords?.[record.id]

    expect(nextState.week).toBe(16)
    expect(nextRecord?.reclassificationState).toBe('approved')
    expect(nextRecord?.reviewArtifactRef).toBe('review:psych-panel-summary-19')
    expect(nextRecord?.transitionHistory).toEqual(record.transitionHistory)
    expect(nextRecord?.evidenceBundleRefs).toEqual(record.evidenceBundleRefs)
  })

  it('leaves scheduled transition unchanged before the due week after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 14
    const record = scheduledRecord()
    state.entityWelfareReclassificationRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const nextRecord = nextState.entityWelfareReclassificationRecords?.[record.id]

    expect(nextState.week).toBe(15)
    expect(nextRecord?.reclassificationState).toBe('pending')
  })

  it('preserves terminal fixtures without mutation after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 20
    state.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
      [HOSTILE_TO_COOPERATIVE_FIXTURE.id]: HOSTILE_TO_COOPERATIVE_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(nextState.entityWelfareReclassificationRecords?.[PENDING_TO_APPROVED_FIXTURE.id]).toBe(
      PENDING_TO_APPROVED_FIXTURE
    )
    expect(nextState.entityWelfareReclassificationRecords?.[HOSTILE_TO_COOPERATIVE_FIXTURE.id]).toBe(
      HOSTILE_TO_COOPERATIVE_FIXTURE
    )
  })

  it('is idempotent when advanceWeek state is re-ticked at the same week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 15
    const record = scheduledRecord()
    state.entityWelfareReclassificationRecords = {
      [record.id]: record,
    }

    const once = advanceWeek(state)
    const twice = {
      ...once,
      entityWelfareReclassificationRecords: once.entityWelfareReclassificationRecords,
    }
    twice.week = 16
    const reticked = advanceWeek(twice)

    expect(reticked.entityWelfareReclassificationRecords?.[record.id]).toEqual(
      once.entityWelfareReclassificationRecords?.[record.id]
    )
  })

  it('surfaces weekly transition notes when reclassification state advances after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 15
    const record = scheduledRecord()
    state.entityWelfareReclassificationRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const transitionNotes =
      nextState.reports[nextState.reports.length - 1]?.notes?.filter(
        (note) => note.type === 'entity_welfare_reclassification.weekly_transition'
      ) ?? []

    expect(transitionNotes.length).toBeGreaterThan(0)
    expect(transitionNotes[0]?.content).toContain(record.label)
    expect(transitionNotes[0]?.content).toContain('Approved')
  })

  it('does not surface weekly transition notes when registry map is empty', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.entityWelfareReclassificationRecords = {}

    const nextState = advanceWeek(state)
    const transitionNotes =
      nextState.reports[nextState.reports.length - 1]?.notes?.filter(
        (note) => note.type === 'entity_welfare_reclassification.weekly_transition'
      ) ?? []

    expect(transitionNotes).toEqual([])
  })

  it('does not re-emit transition notes when records are unchanged on re-tick', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 15
    const record = scheduledRecord()
    state.entityWelfareReclassificationRecords = {
      [record.id]: record,
    }

    const firstWeek = advanceWeek(state)
    const secondWeek = advanceWeek(firstWeek)
    const transitionNotes =
      secondWeek.reports[secondWeek.reports.length - 1]?.notes?.filter(
        (note) => note.type === 'entity_welfare_reclassification.weekly_transition'
      ) ?? []

    expect(transitionNotes).toEqual([])
  })
})
