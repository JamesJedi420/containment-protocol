import { describe, expect, it } from 'vitest'

import { createStartingState } from '../../data/startingState'
import { loadGameSave, serializeGameSave } from '../../app/store/saveSystem'
import {
  applyChapterBreakAttritionReset,
  countAttritionContinuity,
  crossSessionAttritionPersistenceEnabled,
  formatAttritionContinuitySummary,
} from './attritionContinuity'

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
    expect(line).toMatch(/replacement pressure \d+/)
  })
})
