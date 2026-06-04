import { describe, expect, it } from 'vitest'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { getReportNoteCategory } from '../features/report/reportNoteView'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  applyWeeklyMvpLoopInstitutionalPressure,
  applyWeeklyMvpLoopIntakeAndTriage,
  applyWeeklyMvpLoopPrepFlags,
  collectWeeklyMvpLoopReportNotesByType,
  compareWeeklyMvpLoopInstitutionalPosture,
  createWeeklyMvpLoopProofFixture,
  MVP_LOOP_PROOF_CASE_ID,
  readWeeklyMvpLoopInstitutionalPosture,
  readWeeklyMvpLoopReportSurfacingBundle,
  tuneWeeklyMvpLoopCovertForPartialBand,
} from './helpers/weeklyMvpLoopProof'

function buildPartialWeekState(options?: { extendWeeksRemaining?: boolean }) {
  const { state: week0, teamId } = createWeeklyMvpLoopProofFixture()
  let state = applyWeeklyMvpLoopIntakeAndTriage(week0)
  state = applyWeeklyMvpLoopInstitutionalPressure(state, teamId)
  state = tuneWeeklyMvpLoopCovertForPartialBand(state, teamId)
  if (options?.extendWeeksRemaining) {
    state.cases[MVP_LOOP_PROOF_CASE_ID] = {
      ...state.cases[MVP_LOOP_PROOF_CASE_ID]!,
      weeksRemaining: 5,
      status: 'in_progress',
    }
  }
  return { state, teamId }
}

describe('MVP weekly loop proof (slice 5)', () => {
  it('categorizes partial fallout and intake notes for report surfacing (Claim 5)', () => {
    const { state } = buildPartialWeekState()
    const week1 = advanceWeek(applyWeeklyMvpLoopPrepFlags(state))
    expect(week1.gameOver).toBe(false)

    const surfacing = readWeeklyMvpLoopReportSurfacingBundle(week1.reports)

    expect(surfacing.report).toBeDefined()
    expect(surfacing.report?.partialCases).toContain(MVP_LOOP_PROOF_CASE_ID)
    expect(surfacing.reportWeeksForCase).toContain(surfacing.report!.week)

    const shortfallNotes = collectWeeklyMvpLoopReportNotesByType(week1.reports, 'support.shortfall')
    const intakeNotes = collectWeeklyMvpLoopReportNotesByType(
      week1.reports,
      'information_intake.verification'
    )

    expect(shortfallNotes.length).toBeGreaterThan(0)
    expect(shortfallNotes.some((note) => note.content.match(/support shortfall/i))).toBe(true)
    expect(
      week1.events.some(
        (event) =>
          event.type === 'case.partially_resolved' &&
          (event.payload as { caseId?: string }).caseId === MVP_LOOP_PROOF_CASE_ID
      )
    ).toBe(true)

    expect(surfacing.categories).toEqual(
      expect.arrayContaining(['incident_response', 'system'])
    )
    expect(surfacing.incidentNotes.length).toBeGreaterThan(0)
    expect(surfacing.systemNotes.length).toBeGreaterThan(0)

    for (const note of surfacing.notes) {
      if (note.type === undefined) {
        continue
      }
      expect(getReportNoteCategory(note)).not.toBe('uncategorized')
    }

    if (intakeNotes.length > 0) {
      expect(surfacing.categories).toContain('information_intake')
      expect(surfacing.intakeNotes.length).toBeGreaterThan(0)
    }

    expect(surfacing.caseSnapshot?.missionResult?.outcome).toBe('partial')
    expect(surfacing.caseSnapshot?.missionResult?.explanationNotes?.length).toBeGreaterThan(0)
    expect(week1.cases[MVP_LOOP_PROOF_CASE_ID]?.supportShortfall).toBe(true)
  })

  it('shows institutional and triage delta into the next week after save/load (Claim 6)', () => {
    const { state } = buildPartialWeekState({ extendWeeksRemaining: true })
    const posture0 = readWeeklyMvpLoopInstitutionalPosture(state)

    const week1 = advanceWeek(applyWeeklyMvpLoopPrepFlags(state))
    const posture1 = readWeeklyMvpLoopInstitutionalPosture(week1)
    const surfacingWeek1 = readWeeklyMvpLoopReportSurfacingBundle(week1.reports)
    const reportWeek1 = surfacingWeek1.report!.week

    const deltaAfterPartial = compareWeeklyMvpLoopInstitutionalPosture(posture0, posture1)
    expect(deltaAfterPartial.weekAdvanced).toBe(true)
    expect(deltaAfterPartial.supportChanged || deltaAfterPartial.shortfallIntroduced).toBe(true)
    expect(posture1.covertSupportShortfall).toBe(true)
    expect(posture1.triageReasonCodes).toContain('budget-pressure-high')

    const reloaded = loadGameSave(serializeGameSave(week1))
    const week2 = advanceWeek(applyWeeklyMvpLoopPrepFlags(reloaded))
    expect(week2.gameOver).toBe(false)

    const posture2 = readWeeklyMvpLoopInstitutionalPosture(week2)
    const deltaIntoWeek2 = compareWeeklyMvpLoopInstitutionalPosture(posture1, posture2)

    expect(deltaIntoWeek2.weekAdvanced).toBe(true)
    expect(deltaIntoWeek2.budgetPressureChanged || deltaIntoWeek2.triageScoreChanged).toBe(true)
    expect(posture2.budgetPressure).toBeGreaterThanOrEqual(posture1.budgetPressure)
    expect(posture2.triageReasonCodes).toContain('budget-pressure-high')

    const surfacingWeek2 = readWeeklyMvpLoopReportSurfacingBundle(week2.reports)
    const reportWeek2 = week2.reports[week2.reports.length - 1]!.week

    expect(reportWeek2).toBeGreaterThan(reportWeek1)
    expect(surfacingWeek2.reportWeeksForCase.length).toBeGreaterThanOrEqual(
      surfacingWeek1.reportWeeksForCase.length
    )
    expect(week2.reports.length).toBeGreaterThan(week1.reports.length)
    expect(posture2.week).toBeGreaterThan(posture0.week)
    expect(
      posture2.covertSupportShortfall ||
        posture2.supportAvailable !== posture0.supportAvailable ||
        posture2.budgetPressure > posture0.budgetPressure
    ).toBe(true)
  })
})
