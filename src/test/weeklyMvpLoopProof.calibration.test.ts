import { describe, expect, it } from 'vitest'
import {
  AWARENESS_COMPLICATION_THRESHOLD,
  VIOLENT_ESCALATION_THRESHOLD,
} from '../domain/infiltrationProbe'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { applyInfiltrationWeeklyProbeActionOverride } from '../domain/infiltrationProbeOverride'
import {
  applyWeeklyMvpLoopPrepFlags,
  createWeeklyMvpLoopProofFixture,
  MVP_LOOP_PROOF_CASE_ID,
} from './helpers/weeklyMvpLoopProof'

/** SPE-25 calibration anchor: MVP fixture track bands vs tuning/infiltration-probe-and-concealment.md */
describe('MVP weekly loop proof — infiltration calibration (SPE-25)', () => {
  it('keeps covert tracks below violent escalation over four prep-aware weeks', () => {
    const { state: fixtureState, teamId } = createWeeklyMvpLoopProofFixture()
    const covertCase = fixtureState.cases[MVP_LOOP_PROOF_CASE_ID]!
    covertCase.weeksRemaining = 5

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

    const awarenessByWeek: number[] = []

    for (let index = 0; index < 4; index += 1) {
      state = applyWeeklyMvpLoopPrepFlags(state)
      if (index === 1) {
        state = applyInfiltrationWeeklyProbeActionOverride(state, {
          caseId: MVP_LOOP_PROOF_CASE_ID,
          action: 'cleanup',
        }).state
      }

      state = advanceWeek(state)
      const caseAfter = state.cases[MVP_LOOP_PROOF_CASE_ID]!
      const awareness = caseAfter.infiltrationAwareness ?? 0

      awarenessByWeek.push(awareness)
      expect(awareness, `week index ${index} awareness`).toBeLessThan(
        VIOLENT_ESCALATION_THRESHOLD
      )
      expect(caseAfter.infiltrationStage).not.toBe('violent')
    }

    expect(awarenessByWeek[1]).toBeLessThan(awarenessByWeek[0]!)
    expect(Math.max(...awarenessByWeek)).toBeLessThan(AWARENESS_COMPLICATION_THRESHOLD + 0.2)
  })
})
