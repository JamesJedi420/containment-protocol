// SPE-1071 slice 1: campaign-calendar pure derivation tests.
import { describe, expect, it } from 'vitest'
import {
  addWeeks,
  compareCampaignDates,
  formatCampaignDate,
  getCampaignDate,
  resolveCalendarConfig,
  selectCaseDeadlineDate,
  selectCurrentCampaignDate,
  selectTrainingCompletionDate,
} from '../domain/campaignCalendar'
import { createStartingState } from '../data/startingState'
import type { CalendarConfig, CaseInstance, GameState, TrainingQueueEntry } from '../domain/models'

const DEFAULT_CFG: CalendarConfig = {
  weeksPerYear: 52,
  weeksPerSeason: 13,
  epochYear: 1,
  epochWeekOfYear: 1,
}

describe('resolveCalendarConfig', () => {
  it('returns slice-1 defaults when no source is provided', () => {
    expect(resolveCalendarConfig()).toEqual(DEFAULT_CFG)
  })

  it('reuses GameConfig.weeksPerYear and derives 4-season partition', () => {
    expect(resolveCalendarConfig({ weeksPerYear: 52 })).toEqual(DEFAULT_CFG)
    expect(resolveCalendarConfig({ weeksPerYear: 48 })).toEqual({
      weeksPerYear: 48,
      weeksPerSeason: 12,
      epochYear: 1,
      epochWeekOfYear: 1,
    })
  })

  it('clamps invalid inputs deterministically', () => {
    expect(resolveCalendarConfig({ weeksPerYear: -7 })).toEqual({
      ...DEFAULT_CFG,
      weeksPerYear: 1,
      weeksPerSeason: 1,
    })
    expect(resolveCalendarConfig({ weeksPerYear: Number.NaN })).toEqual(DEFAULT_CFG)
  })

  it('honors explicit overrides for season length and epoch', () => {
    const cfg = resolveCalendarConfig({
      weeksPerYear: 52,
      weeksPerSeason: 26,
      epochYear: 2050,
      epochWeekOfYear: 10,
    })
    expect(cfg).toEqual({
      weeksPerYear: 52,
      weeksPerSeason: 26,
      epochYear: 2050,
      epochWeekOfYear: 10,
    })
  })
})

describe('getCampaignDate', () => {
  it('places absolute week 0 at Y1 W1 spring', () => {
    expect(getCampaignDate(0, DEFAULT_CFG)).toEqual({
      absoluteWeek: 0,
      year: 1,
      weekOfYear: 1,
      season: 'spring',
    })
  })

  it('rolls into the next season at the configured boundary', () => {
    expect(getCampaignDate(12, DEFAULT_CFG).season).toBe('spring')
    expect(getCampaignDate(13, DEFAULT_CFG).season).toBe('summer')
    expect(getCampaignDate(26, DEFAULT_CFG).season).toBe('autumn')
    expect(getCampaignDate(39, DEFAULT_CFG).season).toBe('winter')
  })

  it('rolls into the next year when weeksPerYear is exceeded', () => {
    expect(getCampaignDate(51, DEFAULT_CFG)).toEqual({
      absoluteWeek: 51,
      year: 1,
      weekOfYear: 52,
      season: 'winter',
    })
    expect(getCampaignDate(52, DEFAULT_CFG)).toEqual({
      absoluteWeek: 52,
      year: 2,
      weekOfYear: 1,
      season: 'spring',
    })
  })

  it('absorbs leftover weeks into the final season when weeksPerYear is not divisible by season count', () => {
    const cfg = resolveCalendarConfig({ weeksPerYear: 50 })
    expect(cfg.weeksPerSeason).toBe(12)
    // weekOfYear 49 -> floor((49-1)/12) = 4 -> clamps to last season (winter)
    expect(getCampaignDate(48, cfg).season).toBe('winter')
    expect(getCampaignDate(49, cfg).season).toBe('winter')
  })

  it('clamps negative or non-integer absolute weeks safely', () => {
    expect(getCampaignDate(-5, DEFAULT_CFG).absoluteWeek).toBe(0)
    expect(getCampaignDate(7.9, DEFAULT_CFG).absoluteWeek).toBe(7)
  })
})

describe('addWeeks', () => {
  it('is consistent with getCampaignDate(absoluteWeek + n)', () => {
    const base = getCampaignDate(10, DEFAULT_CFG)
    expect(addWeeks(base, 5, DEFAULT_CFG)).toEqual(getCampaignDate(15, DEFAULT_CFG))
    expect(addWeeks(base, 100, DEFAULT_CFG)).toEqual(getCampaignDate(110, DEFAULT_CFG))
  })

  it('supports negative deltas without going below zero', () => {
    const base = getCampaignDate(3, DEFAULT_CFG)
    expect(addWeeks(base, -10, DEFAULT_CFG)).toEqual(getCampaignDate(0, DEFAULT_CFG))
  })
})

describe('compareCampaignDates', () => {
  it('total-orders by absolute week', () => {
    const a = getCampaignDate(0, DEFAULT_CFG)
    const b = getCampaignDate(5, DEFAULT_CFG)
    const c = getCampaignDate(5, DEFAULT_CFG)
    expect(compareCampaignDates(a, b)).toBe(-1)
    expect(compareCampaignDates(b, a)).toBe(1)
    expect(compareCampaignDates(b, c)).toBe(0)
  })
})

describe('formatCampaignDate', () => {
  it('produces compact debug output', () => {
    expect(formatCampaignDate(getCampaignDate(0, DEFAULT_CFG))).toBe('Y1 W1 (spring)')
    expect(formatCampaignDate(getCampaignDate(53, DEFAULT_CFG))).toBe('Y2 W2 (spring)')
  })
})

describe('selectors', () => {
  function makeBaseState(week: number): GameState {
    const state = createStartingState()
    return { ...state, week }
  }

  it('selectCurrentCampaignDate derives from state.week and state.config', () => {
    const state = makeBaseState(14)
    const date = selectCurrentCampaignDate(state)
    expect(date.absoluteWeek).toBe(14)
    expect(date.year).toBe(1)
    expect(date.weekOfYear).toBe(15)
    expect(date.season).toBe('summer')
  })

  it('selectCaseDeadlineDate returns state.week + deadlineRemaining', () => {
    const state = makeBaseState(10)
    const fakeCase: Partial<CaseInstance> = {
      id: 'case-1',
      deadlineRemaining: 7,
    }
    state.cases = { 'case-1': fakeCase as CaseInstance }
    const date = selectCaseDeadlineDate(state, 'case-1')
    expect(date).not.toBeNull()
    expect(date!.absoluteWeek).toBe(17)
  })

  it('selectCaseDeadlineDate returns null for missing or invalid cases', () => {
    const state = makeBaseState(10)
    expect(selectCaseDeadlineDate(state, 'missing')).toBeNull()
    state.cases = {
      'case-bad': { id: 'case-bad' } as CaseInstance,
    }
    expect(selectCaseDeadlineDate(state, 'case-bad')).toBeNull()
  })

  it('selectTrainingCompletionDate returns state.week + remainingWeeks', () => {
    const state = makeBaseState(20)
    const entry: Partial<TrainingQueueEntry> = {
      id: 'tq-1',
      remainingWeeks: 4,
    }
    state.trainingQueue = [entry as TrainingQueueEntry]
    const date = selectTrainingCompletionDate(state, 'tq-1')
    expect(date).not.toBeNull()
    expect(date!.absoluteWeek).toBe(24)
  })

  it('selectTrainingCompletionDate returns null when entry is missing', () => {
    const state = makeBaseState(20)
    state.trainingQueue = []
    expect(selectTrainingCompletionDate(state, 'tq-missing')).toBeNull()
  })
})
