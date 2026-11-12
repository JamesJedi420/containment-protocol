import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  CANAL_BRIDGE_MINOR_ITEM_FIXTURE,
  DISPOSITION_CHAIN_ITEM_FIXTURE,
  FALSE_POSITIVE_ITEM_FIXTURE,
  type MinorAnomalyRecord,
} from '../domain/minorAnomalyItemRegistry'
import {
  FORMAL_ALERT_PARTIAL_FIXTURE,
  IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
} from '../domain/informationIntakeReport'
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

function intakeRecord(overrides: Partial<MinorAnomalyRecord> = {}): MinorAnomalyRecord {
  return {
    id: 'item:advance-week-intake',
    label: 'Advance week intake item',
    disposition: 'recovered',
    latentRiskScore: 11,
    staffNoteProvenance: [{ noteRef: 'note:advance-week-intake', week: 4 }],
    ...overrides,
  }
}

describe('advanceWeek minor anomaly item disposition integration (SPE-2104 slice 3)', () => {
  it('is a no-op for an empty minor anomaly item map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.minorAnomalyItemRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.minorAnomalyItemRecords).toEqual({})
  })

  it('retains recovered disposition before the custody review due week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 2
    const record = intakeRecord()
    state.minorAnomalyItemRecords = { [record.id]: record }

    const nextState = advanceWeek(state)
    const item = nextState.minorAnomalyItemRecords?.[record.id]

    expect(nextState.week).toBe(3)
    expect(item?.disposition).toBe('recovered')
    expect(item?.statusHistory).toBeUndefined()
  })

  it('advances recovered to pending_review when advanceWeek reaches the due week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 3
    const record = intakeRecord()
    state.minorAnomalyItemRecords = { [record.id]: record }

    const nextState = advanceWeek(state)
    const item = nextState.minorAnomalyItemRecords?.[record.id]

    expect(nextState.week).toBe(4)
    expect(item?.disposition).toBe('pending_review')
    expect(item?.statusHistory?.[0]).toEqual(
      expect.objectContaining({
        fromDisposition: 'recovered',
        toDisposition: 'pending_review',
        week: 4,
      })
    )
  })

  it('advances pending_review to stored on a later advanceWeek after intake review', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    const record = intakeRecord({ disposition: 'pending_review' })
    state.minorAnomalyItemRecords = { [record.id]: record }

    const nextState = advanceWeek(state)
    const item = nextState.minorAnomalyItemRecords?.[record.id]

    expect(nextState.week).toBe(5)
    expect(item?.disposition).toBe('stored')
  })

  it('preserves terminal fixture fields byte-stable through advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 20
    state.minorAnomalyItemRecords = {
      [DISPOSITION_CHAIN_ITEM_FIXTURE.id]: DISPOSITION_CHAIN_ITEM_FIXTURE,
      [FALSE_POSITIVE_ITEM_FIXTURE.id]: FALSE_POSITIVE_ITEM_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(nextState.minorAnomalyItemRecords?.[DISPOSITION_CHAIN_ITEM_FIXTURE.id]).toEqual(
      DISPOSITION_CHAIN_ITEM_FIXTURE
    )
    expect(nextState.minorAnomalyItemRecords?.[FALSE_POSITIVE_ITEM_FIXTURE.id]).toEqual(
      FALSE_POSITIVE_ITEM_FIXTURE
    )
  })
})

describe('advanceWeek minor anomaly intake cross-link surfacing (slice 1)', () => {
  it('surfaces intake minor anomaly cross-link notes when linked fixtures coexist', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.informationIntakeReports = {
      [IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id]: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
      [PUBLIC_RUMOR_CONFLICT_FIXTURE.id]: PUBLIC_RUMOR_CONFLICT_FIXTURE,
      [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
    }
    state.minorAnomalyItemRecords = {
      [CANAL_BRIDGE_MINOR_ITEM_FIXTURE.id]: CANAL_BRIDGE_MINOR_ITEM_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const weeklyReport = nextState.reports[nextState.reports.length - 1]
    const crossLinkNotes =
      weeklyReport?.notes?.filter(
        (note) => note.type === 'information_intake.minor_anomaly_cross_link'
      ) ?? []

    expect(crossLinkNotes.length).toBeGreaterThan(0)
    expect(crossLinkNotes[0]?.content).toContain('Intake cross-link')
    expect(crossLinkNotes[0]?.content).toContain('topic:canal-bridge-incident')
  })
})
