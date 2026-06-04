import { describe, expect, it } from 'vitest'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { FORMAL_ALERT_PARTIAL_FIXTURE } from '../domain/informationIntakeReport'
import { triageMission } from '../domain/missionIntakeRouting'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  applyWeeklyMvpLoopIntakeAndTriage,
  applyWeeklyMvpLoopPrepFlags,
  createWeeklyMvpLoopProofFixture,
  MVP_LOOP_PROOF_CASE_ID,
  readWeeklyMvpLoopTriageScores,
} from './helpers/weeklyMvpLoopProof'

describe('MVP weekly loop proof (slice 3)', () => {
  it('raises covert triage when intake is linked and refreshes routing after save/load', () => {
    const { state: week0 } = createWeeklyMvpLoopProofFixture()
    const startWeek = week0.week
    let state = applyWeeklyMvpLoopIntakeAndTriage(week0)

    const liveScores = readWeeklyMvpLoopTriageScores(state)
    expect(liveScores.withIntake.score).toBeGreaterThan(liveScores.withoutIntake.score)
    expect(liveScores.withIntake.reasonCodes).toContain('intake-linked-reports')
    expect(liveScores.withIntake.reasonCodes).toContain('intake-verification-conflict')

    const covertRouting = state.missionRouting?.missions[MVP_LOOP_PROOF_CASE_ID]
    expect(covertRouting?.triageScore).toBe(liveScores.withIntake.score)
    expect(covertRouting?.priorityReasonCodes).toContain('intake-verification-conflict')

    state = applyWeeklyMvpLoopPrepFlags(state)
    const week1 = advanceWeek(state)
    expect(week1.gameOver).toBe(false)
    expect(week1.week).toBe(startWeek + 1)

    const midSave = loadGameSave(serializeGameSave(week1))
    const reloadedCovertCase = midSave.cases[MVP_LOOP_PROOF_CASE_ID]
    expect(reloadedCovertCase).toBeDefined()
    const liveAfterReload = triageMission(midSave, reloadedCovertCase!)
    const reloadedCovert = midSave.missionRouting?.missions[MVP_LOOP_PROOF_CASE_ID]
    expect(reloadedCovert?.triageScore).toBe(liveAfterReload.score)
    expect(reloadedCovert?.priorityReasonCodes).toEqual(liveAfterReload.reasonCodes)
    expect(reloadedCovert?.priorityReasonCodes).toContain('intake-linked-reports')
    expect(reloadedCovert?.priorityReasonCodes).toContain('intake-verification-conflict')

    const week2 = advanceWeek(applyWeeklyMvpLoopPrepFlags(midSave))
    expect(week2.gameOver).toBe(false)
    expect(week2.week).toBe(week1.week + 1)
    expect(week2.week).toBeGreaterThan(startWeek)
    expect(week2.reports.length).toBeGreaterThan(week1.reports.length)
    expect(week2.informationIntakeReports?.[FORMAL_ALERT_PARTIAL_FIXTURE.id]).toBeDefined()
  })

  it('surfaces intake verification report notes through multi-week advance and persistence reload', () => {
    const { state: week0 } = createWeeklyMvpLoopProofFixture()
    const startWeek = week0.week
    const state = applyWeeklyMvpLoopIntakeAndTriage(week0)

    const week1 = advanceWeek(applyWeeklyMvpLoopPrepFlags(state))
    expect(week1.gameOver).toBe(false)
    const intakeNotesWeek1 =
      week1.reports[week1.reports.length - 1]?.notes.filter(
        (note) => note.type === 'information_intake.verification'
      ) ?? []
    expect(intakeNotesWeek1.length).toBeGreaterThan(0)
    expect(
      intakeNotesWeek1.some((note) => note.content.includes(FORMAL_ALERT_PARTIAL_FIXTURE.label))
    ).toBe(true)

    const reloaded = loadGameSave(serializeGameSave(week1))
    expect(reloaded.informationIntakeReports?.[FORMAL_ALERT_PARTIAL_FIXTURE.id]).toBeDefined()

    const week2 = advanceWeek(applyWeeklyMvpLoopPrepFlags(reloaded))
    expect(week2.gameOver).toBe(false)
    expect(week2.week).toBe(week1.week + 1)
    expect(week2.week).toBeGreaterThan(startWeek)

    const allIntakeNotes = week2.reports.flatMap((report) =>
      report.notes.filter((note) => note.type === 'information_intake.verification')
    )
    expect(allIntakeNotes.length).toBeGreaterThanOrEqual(intakeNotesWeek1.length)
    expect(week2.reports.length).toBeGreaterThan(week1.reports.length)

    const formalReport = week2.informationIntakeReports?.[FORMAL_ALERT_PARTIAL_FIXTURE.id]
    const corroborationEvents = formalReport?.corroborationHistory.length ?? 0
    const contradictionEvents = formalReport?.contradictionHistory.length ?? 0
    expect(corroborationEvents + contradictionEvents).toBeGreaterThan(0)
  })
})
