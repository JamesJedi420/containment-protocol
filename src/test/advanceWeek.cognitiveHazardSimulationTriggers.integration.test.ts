import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import {
  COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
  COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
  COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
} from '../domain/cognitiveHazardEngine'
import { buildWeeklyCognitiveHazardSimulationTriggerReportNotes } from '../domain/cognitiveHazardSimulationTriggerWeeklyReportNotes'
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

describe('advanceWeek cognitive hazard simulation triggers integration (SPE-1309 slice 5)', () => {
  it('is a no-op for an empty exposure map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.cognitiveHazardExposureRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.cognitiveHazardExposureRecords).toEqual({})
    const lastReport = nextState.reports[nextState.reports.length - 1]
    expect(
      lastReport?.notes?.filter((note) => note.type === 'cognitive_hazard.simulation_trigger') ?? []
    ).toEqual([])
  })

  it('surfaces simulation trigger notes for memetic escalation fixture on first week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.cognitiveHazardExposureRecords = {
      [COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.id]:
        COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const triggerNotes =
      nextState.reports[nextState.reports.length - 1]?.notes?.filter(
        (note) => note.type === 'cognitive_hazard.simulation_trigger'
      ) ?? []

    expect(triggerNotes.length).toBeGreaterThan(0)
    expect(triggerNotes[0]?.content).toContain(COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.subjectRef)
    expect(triggerNotes[0]?.content).toContain('Knowledge integrity degraded')
  })

  it('does not re-trigger terminal erased failed countermeasure fixture on subsequent weeks', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.cognitiveHazardExposureRecords = {
      [COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE.id]:
        COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
    }

    const firstWeek = advanceWeek(state)
    const secondWeek = advanceWeek(firstWeek)
    const triggerNotes =
      secondWeek.reports[secondWeek.reports.length - 1]?.notes?.filter(
        (note) => note.type === 'cognitive_hazard.simulation_trigger'
      ) ?? []

    expect(triggerNotes).toEqual([])
  })

  it('does not surface trigger notes for stable subject fixture', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.cognitiveHazardExposureRecords = {
      [COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE.id]: COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const triggerNotes =
      nextState.reports[nextState.reports.length - 1]?.notes?.filter(
        (note) => note.type === 'cognitive_hazard.simulation_trigger'
      ) ?? []

    expect(triggerNotes).toEqual([])
  })

  it('matches direct trigger note builder output inside advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.cognitiveHazardExposureRecords = {
      [COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.id]:
        COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const lastReport = nextState.reports[nextState.reports.length - 1]
    const directNotes = buildWeeklyCognitiveHazardSimulationTriggerReportNotes({
      nextRecords: nextState.cognitiveHazardExposureRecords,
      priorRecords: state.cognitiveHazardExposureRecords,
      week: nextState.week,
      sequenceStart: 1,
    })
    const triggerNotes =
      lastReport?.notes?.filter((note) => note.type === 'cognitive_hazard.simulation_trigger') ??
      []

    expect(triggerNotes.map((note) => note.content)).toEqual(
      directNotes.map((note) => note.content)
    )
  })
})
