import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  createInformationIntakeReport,
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

    const expectedRumorContradictionEventId = buildWeeklyIntakeSyntheticEventId(
      PUBLIC_RUMOR_CONFLICT_FIXTURE.id,
      week,
      'contradiction'
    )
    const expectedRumorCorroborationEventId = buildWeeklyIntakeSyntheticEventId(
      PUBLIC_RUMOR_CONFLICT_FIXTURE.id,
      week,
      'corroboration'
    )
    const hasRumorContradiction =
      rumorReport?.contradictionHistory.some((event) => event.eventId === expectedRumorContradictionEventId) ??
      false

    if (hasRumorContradiction) {
      expect(rumorReport?.retainedDespiteContradiction).toBe(true)
      expect(rumorReport?.contradictionHistory).toHaveLength(1)
    } else {
      expect(rumorReport?.corroborationHistory.map((event) => event.eventId)).toContain(
        expectedRumorCorroborationEventId
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

  it('derives weekly corroboration source refs from linked case/topic state', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    const linkedCase = Object.values(state.cases)[0]
    const week = state.week

    const linkedReport = createInformationIntakeReport({
      id: 'intake:linked-case-topic-source',
      label: 'Linked-case corroboration source probe',
      topicRef: linkedCase.id,
      initialSourceClass: 'formal_alert',
      credibility: 'high',
      plausibility: 'plausible',
      rumorRisk: 'low',
    })

    state.informationIntakeReports = {
      [linkedReport.id]: linkedReport,
    }

    const nextState = advanceWeek(state)
    const nextLinkedReport = nextState.informationIntakeReports?.[linkedReport.id]

    expect(nextLinkedReport).toBeDefined()

    const corroborationEventId = buildWeeklyIntakeSyntheticEventId(linkedReport.id, week, 'corroboration')
    const corroborationEvent = nextLinkedReport?.corroborationHistory.find(
      (event) => event.eventId === corroborationEventId
    )
    if (corroborationEvent) {
      expect(corroborationEvent.sourceRef).toContain(linkedCase.id)
      expect(corroborationEvent.sourceRef).toContain('weekly-intake')
      expect(corroborationEvent.sourceRef).toContain(':trace-')
      expect(corroborationEvent.sourceRef).toContain(':channel-')
      return
    }

    const contradictionEventId = buildWeeklyIntakeSyntheticEventId(linkedReport.id, week, 'contradiction')
    const contradictionEvent = nextLinkedReport?.contradictionHistory.find(
      (event) => event.eventId === contradictionEventId
    )

    expect(contradictionEvent).toBeDefined()
    expect(contradictionEvent?.sourceRef).toContain(linkedCase.id)
    expect(contradictionEvent?.sourceRef).toContain('weekly-intake')
    expect(contradictionEvent?.sourceRef).toContain(':dispute-')
    expect(contradictionEvent?.sourceRef).toContain(':cue-')
  })

  it('treats null or undefined report maps as empty without throwing', () => {
    expect(applyWeeklyIntakeCorroborationTick(null, 3)).toEqual({})
    expect(applyWeeklyIntakeCorroborationTick(undefined, 3)).toEqual({})
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

  it('surfaces weekly intake verification narratives in the weekly report notes', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)

    state.informationIntakeReports = {
      [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const weeklyReport = nextState.reports[nextState.reports.length - 1]

    expect(weeklyReport).toBeDefined()
    const intakeNotes =
      weeklyReport?.notes.filter((note) => note.content.includes('Intake verification —')) ?? []

    expect(intakeNotes.length).toBeGreaterThan(0)

    const formalNote = intakeNotes.find((note) =>
      note.content.includes(FORMAL_ALERT_PARTIAL_FIXTURE.label)
    )
    expect(formalNote).toBeDefined()
    expect(formalNote?.type).toBe('information_intake.verification')
    expect(formalNote?.content).toMatch(/corroboration \(.+; .+\)\./)

    const nextLinkedReport = nextState.informationIntakeReports?.[FORMAL_ALERT_PARTIAL_FIXTURE.id]
    const corroborationEvent = nextLinkedReport?.corroborationHistory.find((event) =>
      event.eventId.startsWith('weekly-intake:')
    )
    expect(corroborationEvent).toBeDefined()
    if (corroborationEvent) {
      const traceMatch = corroborationEvent.sourceRef.match(/:trace-([^:]+)/)
      const channelMatch = corroborationEvent.sourceRef.match(/:channel-([^:]+)/)
      if (traceMatch?.[1]) {
        expect(formalNote?.content).toContain(traceMatch[1].replace(/-/g, ' '))
      }
      if (channelMatch?.[1]) {
        expect(formalNote?.content).toContain(channelMatch[1].replace(/-/g, ' '))
      }
    }
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
