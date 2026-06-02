import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  FORMAL_ALERT_PARTIAL_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
} from '../domain/informationIntakeReport'
import {
  applyWeeklyIntakeCorroborationTick,
  buildWeeklyIntakeSyntheticEventId,
} from '../domain/informationIntakeWeeklyCorroboration'
import { evaluateTopicIntakeCoverage } from '../domain/publicSignalCoverage'
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

describe('advanceWeek information intake corroboration integration (SPE-854 slice 4)', () => {
  it('is a no-op for an empty intake report map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.informationIntakeReports = {}

    const nextState = advanceWeek(state)

    expect(nextState.informationIntakeReports).toEqual({})
  })

  it('accumulates deterministic weekly corroboration on persisted reports after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    const week = state.week

    state.informationIntakeReports = {
      [PUBLIC_RUMOR_CONFLICT_FIXTURE.id]: PUBLIC_RUMOR_CONFLICT_FIXTURE,
      [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const rumorReport = nextState.informationIntakeReports?.[PUBLIC_RUMOR_CONFLICT_FIXTURE.id]
    const formalReport = nextState.informationIntakeReports?.[FORMAL_ALERT_PARTIAL_FIXTURE.id]

    expect(rumorReport).toBeDefined()
    expect(formalReport).toBeDefined()

    const expectedRumorEventId = buildWeeklyIntakeSyntheticEventId(
      PUBLIC_RUMOR_CONFLICT_FIXTURE.id,
      week,
      week % 4 === 0 ? 'contradiction' : 'corroboration'
    )

    if (week % 4 === 0) {
      expect(rumorReport?.contradictionHistory.map((event) => event.eventId)).toContain(
        expectedRumorEventId
      )
      expect(rumorReport?.retainedDespiteContradiction).toBe(true)
      expect(rumorReport?.contradictionHistory).toHaveLength(1)
    } else {
      expect(rumorReport?.corroborationHistory.map((event) => event.eventId)).toContain(
        expectedRumorEventId
      )
      expect(rumorReport?.corroborationHistory).toHaveLength(1)
      expect(rumorReport?.verificationStatus).toBe('unverified')
    }

    const expectedFormalEventId = buildWeeklyIntakeSyntheticEventId(
      FORMAL_ALERT_PARTIAL_FIXTURE.id,
      week,
      'corroboration'
    )
    expect(formalReport?.corroborationHistory.map((event) => event.eventId)).toContain(
      expectedFormalEventId
    )
    expect(formalReport?.corroborationHistory).toHaveLength(
      FORMAL_ALERT_PARTIAL_FIXTURE.corroborationHistory.length + 1
    )
  })

  it('is idempotent when the same weekly synthetic event id is re-applied', () => {
    const week = 5
    const reports = {
      [PUBLIC_RUMOR_CONFLICT_FIXTURE.id]: PUBLIC_RUMOR_CONFLICT_FIXTURE,
    }

    const first = applyWeeklyIntakeCorroborationTick(reports, week)
    const second = applyWeeklyIntakeCorroborationTick(first, week)

    expect(second).toEqual(first)
  })

  it('shifts topic intake coverage band after weekly corroboration on formal alert', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)

    state.informationIntakeReports = {
      [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
    }

    const beforeCoverage = evaluateTopicIntakeCoverage({
      topicId: FORMAL_ALERT_PARTIAL_FIXTURE.topicRef,
      reports: state.informationIntakeReports,
    })

    const nextState = advanceWeek(state)
    const afterCoverage = evaluateTopicIntakeCoverage({
      topicId: FORMAL_ALERT_PARTIAL_FIXTURE.topicRef,
      reports: nextState.informationIntakeReports,
    })

    expect(beforeCoverage.intakeSummary.dominantVerificationStatus).toBe('partially_corroborated')
    expect(afterCoverage.intakeSummary.dominantVerificationStatus).toBe('verified')
    expect(afterCoverage.intakeSummary.hasIncompleteIntake).toBe(false)
  })
})
