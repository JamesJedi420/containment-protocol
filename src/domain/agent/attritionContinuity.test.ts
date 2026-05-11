import { describe, expect, it } from 'vitest'

import { createStartingState } from '../../data/startingState'
import { loadGameSave, serializeGameSave } from '../../app/store/saveSystem'
import { recomputeMissionRouting } from '../missionIntakeRouting'
import {
  countAttritionContinuity,
  crossSessionAttritionPersistenceEnabled,
  formatAttritionContinuitySummary,
} from './attritionContinuity'
import { applyChapterBreakAttritionReset } from './attritionReset'

describe('attrition continuity (SPE-281)', () => {
  it('gates cross-session recap on challenge + attrition duration (hydration parity)', () => {
    expect(
      crossSessionAttritionPersistenceEnabled({
        durationModel: 'capacity',
        challengeModeEnabled: false,
      })
    ).toBe(false)
    expect(
      crossSessionAttritionPersistenceEnabled({
        durationModel: 'attrition',
        challengeModeEnabled: false,
      })
    ).toBe(false)
    expect(
      crossSessionAttritionPersistenceEnabled({
        durationModel: 'attrition',
        challengeModeEnabled: true,
      })
    ).toBe(true)
  })

  it('round-trips operative attritionState through the canonical save envelope', () => {
    const state = createStartingState()
    state.config = {
      ...state.config,
      challengeModeEnabled: true,
      durationModel: 'attrition',
    }
    state.agents['a_kellan'] = {
      ...state.agents['a_kellan']!,
      attritionState: {
        attritionStatus: 'lost',
        attritionCategory: 'burnout',
        attritionSinceWeek: 2,
        lossReasonCodes: ['save-test'],
        replacementPriority: 1,
        retentionPressure: 0,
      },
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.agents['a_kellan']!.attritionState?.attritionStatus).toBe('lost')
    expect(loaded.agents['a_kellan']!.attritionState?.lossReasonCodes).toContain('save-test')
    expect(loaded.config.durationModel).toBe('attrition')
  })

  it('clears attrition carryover on chapter-break reset without a full new run', () => {
    const state = createStartingState()
    state.agents['a_kellan'] = {
      ...state.agents['a_kellan']!,
      attritionState: {
        attritionStatus: 'temporarily_unavailable',
        attritionSinceWeek: 1,
        returnEligibleWeek: 5,
        lossReasonCodes: [],
        replacementPriority: 0,
        retentionPressure: 0,
      },
    }

    const reset = applyChapterBreakAttritionReset(state)

    expect(reset.agents['a_kellan']!.attritionState).toBeUndefined()
    const c = countAttritionContinuity(reset)
    expect(c.lost).toBe(0)
    expect(c.temporarilyUnavailable).toBe(0)
    expect(c.atRisk).toBe(0)
  })

  it('formats a deterministic continuity recap line from canonical agent attrition', () => {
    const state = createStartingState()
    state.agents['a_kellan'] = {
      ...state.agents['a_kellan']!,
      attritionState: {
        attritionStatus: 'lost',
        lossReasonCodes: [],
        replacementPriority: 1,
        retentionPressure: 0,
      },
    }
    state.agents['a_sato'] = {
      ...state.agents['a_sato']!,
      attritionState: {
        attritionStatus: 'at_risk',
        attritionSinceWeek: 1,
        lossReasonCodes: [],
        replacementPriority: 0,
        retentionPressure: 1,
      },
    }

    const line = formatAttritionContinuitySummary(state)
    expect(line).toContain('1 lost')
    expect(line).toContain('1 at risk')
    expect(line).toMatch(/roster replacement pressure \d+/)
  })

  it('does not fold funding penalties into continuity recap pressure', () => {
    const state = createStartingState()
    state.funding = 0
    state.agency = { ...state.agency!, funding: 0 }

    const c = countAttritionContinuity(state)
    expect(c.replacementPressure).toBe(0)
    expect(c.staffingGap).toBe(0)

    const line = formatAttritionContinuitySummary(state)
    expect(line).toContain('roster replacement pressure 0')
  })

  it('leaves mission routing canonical after chapter-break reset', () => {
    let state = createStartingState()
    state.agents['a_kellan'] = {
      ...state.agents['a_kellan']!,
      attritionState: {
        attritionStatus: 'lost',
        lossReasonCodes: [],
        replacementPriority: 1,
        retentionPressure: 0,
      },
    }
    state = { ...state, missionRouting: recomputeMissionRouting(state) }

    const reset = applyChapterBreakAttritionReset(state)

    expect(reset.missionRouting).toEqual(recomputeMissionRouting(reset))
  })
})
