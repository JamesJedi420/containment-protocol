import { describe, expect, it } from 'vitest'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
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
  applyWeeklyMvpLoopPrepFlags,
  createWeeklyMvpLoopProofFixture,
  MVP_LOOP_FORENSIC_QUESTION_ID,
  MVP_LOOP_PROOF_CASE_ID,
} from './helpers/weeklyMvpLoopProof'

describe('MVP weekly loop proof (slice 2)', () => {
  it('preserves covert prep, flags, and report notes through save/load mid-campaign', () => {
    const { state: week0 } = createWeeklyMvpLoopProofFixture()
    const week1 = advanceWeek(week0)

    const withOverride = applyInfiltrationWeeklyProbeActionOverride(week1, {
      caseId: MVP_LOOP_PROOF_CASE_ID,
      action: 'probe_route',
    })
    const withLeaveBehind = applyStealthLeaveBehindSelection(withOverride.state, {
      caseId: MVP_LOOP_PROOF_CASE_ID,
      leaveBehindId: 'leave-behind:expose-witness',
    })

    const reloaded = loadGameSave(serializeGameSave(withLeaveBehind.state))

    expect(reloaded.week).toBe(week1.week)
    expect(reloaded.reports).toHaveLength(week1.reports.length)
    expect(reloaded.cases[MVP_LOOP_PROOF_CASE_ID]?.hiddenState).toBe('hidden')
    expect(reloaded.cases[MVP_LOOP_PROOF_CASE_ID]?.infiltrationWeeklyProbeActionOverride).toBe(
      'probe_route'
    )
    expect(reloaded.cases[MVP_LOOP_PROOF_CASE_ID]?.stealthLeaveBehindId).toBe(
      'leave-behind:expose-witness'
    )
    expect(
      readPersistentFlag(
        reloaded,
        buildInvestigationAskedFlagId(MVP_LOOP_PROOF_CASE_ID, MVP_LOOP_FORENSIC_QUESTION_ID)
      )
    ).toBe(true)

    const week2 = advanceWeek(applyWeeklyMvpLoopPrepFlags(reloaded))
    expect(week2.week).toBe(reloaded.week + 1)
    expect(week2.reports.length).toBeGreaterThan(reloaded.reports.length)

    const latestNotes = week2.reports[week2.reports.length - 1]?.notes ?? []
    expect(
      latestNotes.some(
        (note) =>
          note.type === 'infiltration.weekly_encounter' ||
          note.type === 'infiltration.cover_strain' ||
          note.type === 'infiltration.leave_behind_tradeoff' ||
          note.type === 'concealment.activated'
      )
    ).toBe(true)
  })

  it('runs four weeks with growing report history and coherent week navigation', () => {
    const { state: fixtureState, teamId } = createWeeklyMvpLoopProofFixture()
    const covertCase = fixtureState.cases[MVP_LOOP_PROOF_CASE_ID]!
    covertCase.weeksRemaining = 5

    const startWeek = fixtureState.week
    let state: typeof fixtureState = {
      ...fixtureState,
      cases: { [MVP_LOOP_PROOF_CASE_ID]: covertCase },
      teams: {
        [teamId]: {
          ...fixtureState.teams[teamId]!,
          assignedCaseId: MVP_LOOP_PROOF_CASE_ID,
        },
      },
      reports: [],
      events: [],
    }

    for (let index = 0; index < 4; index += 1) {
      state = applyWeeklyMvpLoopPrepFlags(state)
      if (index === 1) {
        const override = applyInfiltrationWeeklyProbeActionOverride(state, {
          caseId: MVP_LOOP_PROOF_CASE_ID,
          action: 'cleanup',
        })
        state = override.state
      }
      const next = advanceWeek(state)
      expect(next.gameOver, `advance ${index} should not end the run`).toBe(false)
      state = next
    }

    expect(state.week).toBe(startWeek + 4)
    expect(state.reports.length).toBe(4)

    const weeks = state.reports.map((report) => report.week)
    expect(new Set(weeks).size).toBe(4)

    const lastReport = state.reports[state.reports.length - 1]!
    const nav = buildReportWeekNavigation(state.reports, lastReport.week)
    expect(nav.previousWeek).toBe(state.reports[state.reports.length - 2]?.week)

    expect(
      readPersistentFlag(
        state,
        buildInvestigationLeverageFlagId(MVP_LOOP_PROOF_CASE_ID, 'secure-evidence-chain')
      )
    ).toBe(true)
  })
})
