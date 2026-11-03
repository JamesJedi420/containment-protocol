import { describe, expect, it } from 'vitest'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { getCanonicalFundingState } from '../domain/funding'
import { triageMission } from '../domain/missionIntakeRouting'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  applyWeeklyMvpLoopInstitutionalPressure,
  applyWeeklyMvpLoopIntakeAndTriage,
  applyWeeklyMvpLoopPrepFlags,
  createWeeklyMvpLoopProofFixture,
  MVP_LOOP_PROOF_CASE_ID,
  readWeeklyMvpLoopCovertMissionResult,
  tuneWeeklyMvpLoopCovertForPartialBand,
} from './helpers/weeklyMvpLoopProof'

// SPE-2251's calibrated partial-band and pressure contracts are the source of
// these inputs. This is a mid-campaign scenario, not a fresh-entry fixture.
function runPressureCampaign() {
  const fixture = createWeeklyMvpLoopProofFixture()
  let state = applyWeeklyMvpLoopIntakeAndTriage(fixture.state)
  state = applyWeeklyMvpLoopInstitutionalPressure(state, fixture.teamId)
  state = tuneWeeklyMvpLoopCovertForPartialBand(state, fixture.teamId)
  const recoveringId = Object.keys(state.agents).find(
    (id) => state.agents[id]?.assignment?.state === 'recovery'
  )!
  const first = advanceWeek(applyWeeklyMvpLoopPrepFlags(state))
  const loaded = loadGameSave(serializeGameSave(first))
  const second = advanceWeek(applyWeeklyMvpLoopPrepFlags(loaded))
  const summarize = (current: typeof state) => ({
    week: current.week,
    gameOver: current.gameOver,
    outcome: readWeeklyMvpLoopCovertMissionResult(current)?.outcome,
    caseStatus: current.cases[MVP_LOOP_PROOF_CASE_ID]?.status,
    supportShortfall: current.cases[MVP_LOOP_PROOF_CASE_ID]?.supportShortfall,
    pressure: getCanonicalFundingState(current).budgetPressure,
    recovery: current.agents[recoveringId]?.status,
    triageReasons: triageMission(current, current.cases[MVP_LOOP_PROOF_CASE_ID]!).reasonCodes,
    reportWeeks: current.reports.map((report) => report.week),
  })
  return {
    initial: summarize(state),
    first: summarize(first),
    loaded: summarize(loaded),
    second: summarize(second),
  }
}

describe('golden pressure campaign', () => {
  it('replays partial consequences and institutional carryover through reload', () => {
    const result = runPressureCampaign()
    expect(result.initial.triageReasons).toContain('budget-pressure-high')
    expect(result.initial.recovery).toBe('recovering')
    expect(result.first.outcome).toBe('partial')
    expect(result.first.caseStatus).toBe('open')
    expect(result.first.supportShortfall).toBe(true)
    expect(result.first.gameOver).toBe(false)
    expect(result.first.pressure).toBeGreaterThanOrEqual(2)
    // The SPE-2251 calibration can exceed the save schema's stat cap, and
    // hydration deliberately clears supportShortfall. Compare only the
    // carryover fields this fixture's existing contract asserts across load.
    expect(result.loaded.outcome).toBe(result.first.outcome)
    expect(result.loaded.pressure).toBe(result.first.pressure)
    expect(result.first.recovery).toBe('recovering')
    expect(result.loaded.recovery).toBe(result.first.recovery)
    expect(result.loaded.reportWeeks).toEqual(result.first.reportWeeks)
    expect(result.second.week).toBe(result.first.week + 1)
    expect(result.second.gameOver).toBe(false)
    expect(result.second.pressure).toBeGreaterThanOrEqual(2)
    expect(result.second.triageReasons).toContain('budget-pressure-high')
    expect(result.second.reportWeeks.length).toBeGreaterThan(result.first.reportWeeks.length)
    expect(runPressureCampaign()).toEqual(result)
  })
})
