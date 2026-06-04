import { describe, expect, it } from 'vitest'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { triageMission } from '../domain/missionIntakeRouting'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  applyWeeklyMvpLoopInstitutionalPressure,
  applyWeeklyMvpLoopIntakeAndTriage,
  applyWeeklyMvpLoopPrepFlags,
  collectWeeklyMvpLoopReportNotesByType,
  createWeeklyMvpLoopProofFixture,
  MVP_LOOP_PROOF_CASE_ID,
  readWeeklyMvpLoopCovertMissionResult,
  tuneWeeklyMvpLoopCovertForPartialBand,
} from './helpers/weeklyMvpLoopProof'

describe('MVP weekly loop proof (slice 4)', () => {
  it('resolves the covert case in the partial band with support shortfall fallout', () => {
    const { state: week0, teamId } = createWeeklyMvpLoopProofFixture()

    let state = applyWeeklyMvpLoopIntakeAndTriage(week0)
    state = applyWeeklyMvpLoopInstitutionalPressure(state, teamId)
    state = tuneWeeklyMvpLoopCovertForPartialBand(state, teamId)
    const campaignWeek = state.week

    const week1 = advanceWeek(applyWeeklyMvpLoopPrepFlags(state))
    expect(week1.gameOver).toBe(false)
    expect(week1.week).toBe(campaignWeek + 1)

    const latestReport = week1.reports[week1.reports.length - 1]!
    expect(latestReport.partialCases).toContain(MVP_LOOP_PROOF_CASE_ID)
    expect(latestReport.failedCases).not.toContain(MVP_LOOP_PROOF_CASE_ID)
    expect(latestReport.resolvedCases).not.toContain(MVP_LOOP_PROOF_CASE_ID)

    const missionResult = readWeeklyMvpLoopCovertMissionResult(week1)
    expect(missionResult?.outcome).toBe('partial')
    expect(missionResult?.explanationNotes?.length).toBeGreaterThan(0)

    const covertAfter = week1.cases[MVP_LOOP_PROOF_CASE_ID]
    expect(covertAfter?.status).toBe('open')
    expect(covertAfter?.supportShortfall).toBe(true)
    expect(week1.agency?.supportAvailable).toBe(0)

    const shortfallNotes = collectWeeklyMvpLoopReportNotesByType(week1.reports, 'support.shortfall')
    expect(shortfallNotes.length).toBeGreaterThan(0)
    expect(shortfallNotes.some((note) => note.content.match(/support shortfall/i))).toBe(true)

    const leadAgentId = week0.teams[teamId]!.agentIds[0]!
    const leadAgent = week1.agents[leadAgentId]
    expect(leadAgent?.history?.counters.casesPartiallyResolved).toBeGreaterThanOrEqual(1)
    expect(leadAgent?.history?.counters.casesFailed).toBe(0)
  })

  it('carries funding pressure and recovery posture through save/load into a second week', () => {
    const { state: week0, teamId } = createWeeklyMvpLoopProofFixture()
    let state = applyWeeklyMvpLoopIntakeAndTriage(week0)
    state = applyWeeklyMvpLoopInstitutionalPressure(state, teamId)
    state = tuneWeeklyMvpLoopCovertForPartialBand(state, teamId)
    state.cases[MVP_LOOP_PROOF_CASE_ID] = {
      ...state.cases[MVP_LOOP_PROOF_CASE_ID]!,
      weeksRemaining: 5,
      status: 'in_progress',
    }

    const week1 = advanceWeek(applyWeeklyMvpLoopPrepFlags(state))
    expect(week1.gameOver).toBe(false)

    const pressureAfterWeek1 = week1.agency?.fundingState?.budgetPressure ?? 0
    expect(pressureAfterWeek1).toBeGreaterThanOrEqual(2)

    const recoveringAgentId = Object.entries(week1.agents).find(
      ([, agent]) => agent.assignment?.state === 'recovery'
    )?.[0]
    expect(recoveringAgentId).toBeDefined()

    const reloaded = loadGameSave(serializeGameSave(week1))
    expect(reloaded.agency?.fundingState?.budgetPressure).toBe(pressureAfterWeek1)
    expect(reloaded.agents[recoveringAgentId!]?.status).toBe('recovering')
    expect(reloaded.agents[recoveringAgentId!]?.assignment?.state).toBe('recovery')

    const triageAfterReload = triageMission(reloaded, reloaded.cases[MVP_LOOP_PROOF_CASE_ID]!)
    expect(triageAfterReload.reasonCodes).toContain('budget-pressure-high')

    const week2 = advanceWeek(applyWeeklyMvpLoopPrepFlags(reloaded))
    expect(week2.gameOver).toBe(false)
    expect(week2.week).toBe(week1.week + 1)
    expect(week2.agency?.fundingState?.budgetPressure).toBeGreaterThanOrEqual(pressureAfterWeek1)
    expect(week2.agents[recoveringAgentId!]?.status).toMatch(/recovering|active/)
    expect(week2.reports.length).toBeGreaterThan(week1.reports.length)

    const shortfallNotes = collectWeeklyMvpLoopReportNotesByType(week2.reports, 'support.shortfall')
    expect(shortfallNotes.length).toBeGreaterThanOrEqual(1)
  })
})
