import { describe, expect, it } from 'vitest'
import { APP_ROUTES } from '../app/routes'
import { buildEventFeedView, refineEventFeedDrillDownHref } from '../features/dashboard/eventFeedView'
import { getCaseWeeklyReportWeeks } from '../features/operations/operationsRouteDrillDown'
import { buildReportWeekNavigation } from '../features/report/reportWeekNavigation'
import { readPersistentFlag } from '../domain/flagSystem'
import {
  buildInvestigationAskedFlagId,
  buildInvestigationLeverageFlagId,
} from '../domain/investigationEconomy'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { applyInfiltrationWeeklyProbeActionOverride } from '../domain/infiltrationProbeOverride'
import { applyStealthLeaveBehindSelection } from '../domain/stealthLeaveBehindSelection'
import {
  createWeeklyMvpLoopProofFixture,
  MVP_LOOP_FORENSIC_QUESTION_ID,
  MVP_LOOP_PROOF_CASE_ID,
} from './helpers/weeklyMvpLoopProof'

function isCovertReportNoteType(type: string | undefined) {
  return type === 'concealment.activated' || (type?.startsWith('infiltration.') ?? false)
}

function isCovertOperationEventType(type: string) {
  return type === 'concealment.activated' || type.startsWith('infiltration.')
}

describe('MVP weekly loop proof', () => {
  it('carries weekly prep through advanceWeek into covert posture and reports', () => {
    const { state: week0 } = createWeeklyMvpLoopProofFixture()

    expect(
      readPersistentFlag(
        week0,
        buildInvestigationAskedFlagId(MVP_LOOP_PROOF_CASE_ID, MVP_LOOP_FORENSIC_QUESTION_ID)
      )
    ).toBe(true)
    expect(week0.globalFlags[`conceal.case.${MVP_LOOP_PROOF_CASE_ID}`]).toBe(true)

    const week1 = advanceWeek(week0)
    expect(week1.week).toBe(week0.week + 1)
    expect(week1.reports).toHaveLength(1)

    const caseAfterWeek1 = week1.cases[MVP_LOOP_PROOF_CASE_ID]
    expect(caseAfterWeek1.hiddenState).toBe('hidden')

    const report1 = week1.reports[0]!
    const reportNoteTypes = report1.notes.map((note) => note.type)
    const hasCovertReportNote = reportNoteTypes.some((type) => isCovertReportNoteType(type))
    const hasCovertEvent = week1.events.some((event) => isCovertOperationEventType(event.type))

    expect(hasCovertReportNote || hasCovertEvent).toBe(true)
    expect(
      readPersistentFlag(
        week1,
        buildInvestigationAskedFlagId(MVP_LOOP_PROOF_CASE_ID, MVP_LOOP_FORENSIC_QUESTION_ID)
      )
    ).toBe(true)
    expect(
      readPersistentFlag(
        week1,
        buildInvestigationLeverageFlagId(MVP_LOOP_PROOF_CASE_ID, 'secure-evidence-chain')
      )
    ).toBe(true)

    expect(caseAfterWeek1.status).toBe('in_progress')

    const override = applyInfiltrationWeeklyProbeActionOverride(week1, {
      caseId: MVP_LOOP_PROOF_CASE_ID,
      action: 'probe_route',
    })
    expect(override.applied).toBe(true)

    const leaveBehind = applyStealthLeaveBehindSelection(override.state, {
      caseId: MVP_LOOP_PROOF_CASE_ID,
      leaveBehindId: 'leave-behind:expose-witness',
    })
    expect(leaveBehind.applied).toBe(true)
    expect(leaveBehind.state.cases[MVP_LOOP_PROOF_CASE_ID]?.stealthLeaveBehindId).toBe(
      'leave-behind:expose-witness'
    )

    const week2 = advanceWeek(leaveBehind.state)
    expect(week2.week).toBe(week1.week + 1)
    expect(week2.reports.length).toBeGreaterThanOrEqual(2)

    const latestReport = week2.reports[week2.reports.length - 1]!
    const priorReport = week2.reports[week2.reports.length - 2]!

    expect(buildReportWeekNavigation(week2.reports, latestReport.week)).toEqual({
      previousWeek: priorReport.week,
    })
    expect(getCaseWeeklyReportWeeks(week2.reports, MVP_LOOP_PROOF_CASE_ID).length).toBeGreaterThan(0)
  })

  it('keeps event feed drill-down hrefs coherent with generated reports', () => {
    const { state: week0 } = createWeeklyMvpLoopProofFixture()
    const week1 = advanceWeek(week0)
    const reportWeek = week1.reports[0]?.week

    expect(reportWeek).toBeDefined()

    const covertEvent = week1.events.find(
      (event) =>
        isCovertOperationEventType(event.type) &&
        (event.payload as { caseId?: string }).caseId === MVP_LOOP_PROOF_CASE_ID
    )

    expect(covertEvent).toBeDefined()

    const feedView = refineEventFeedDrillDownHref(buildEventFeedView(covertEvent!), week1.reports)

    expect(feedView.href).toBe(APP_ROUTES.reportDetail(reportWeek!))

    const missingReportView = refineEventFeedDrillDownHref(buildEventFeedView(covertEvent!), [])
    expect(missingReportView.href).toBe(APP_ROUTES.caseDetail(MVP_LOOP_PROOF_CASE_ID))
  })
})
