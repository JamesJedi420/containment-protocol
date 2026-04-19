/**
 * Shared, bounded timing/check helper for escalation, pressure, and extra-check triggers.
 * Centralizes cadence, extra-check, and boundedness logic for all relevant triggers.
 *
 * Usage: Call from advanceWeek or any sim pipeline to determine if a check should run,
 * and to record/check cadence, extra, and bounded passes.
 */

export type TimingCheckType =
  | 'OnLongCaseDurationCheck'
  | 'OnResolutionCheck'
  | 'OnDeadlineEscalation'
  | 'OnPressureCheck'
  | 'OnSupportShortfallCheck'
  | 'OnExtraCheck';

export interface TimingCheckState {
  // Map: check type -> last week run
  lastRunWeek: Record<TimingCheckType, number>;
  // Map: check type -> count of times run this week
  runCountThisWeek: Record<TimingCheckType, number>;
  // Map: check type -> max allowed per week (boundedness)
  maxPerWeek: Record<TimingCheckType, number>;
}

export function createTimingCheckState(overrides?: Partial<TimingCheckState>): TimingCheckState {
  return {
    lastRunWeek: {
      OnLongCaseDurationCheck: -1,
      OnResolutionCheck: -1,
      OnDeadlineEscalation: -1,
      OnPressureCheck: -1,
      OnSupportShortfallCheck: -1,
      OnExtraCheck: -1,
      ...(overrides?.lastRunWeek || {}),
    },
    runCountThisWeek: {
      OnLongCaseDurationCheck: 0,
      OnResolutionCheck: 0,
      OnDeadlineEscalation: 0,
      OnPressureCheck: 0,
      OnSupportShortfallCheck: 0,
      OnExtraCheck: 0,
      ...(overrides?.runCountThisWeek || {}),
    },
    maxPerWeek: {
      OnLongCaseDurationCheck: 99, // Allow all cases to process in a week by default
      OnResolutionCheck: 99, // Allow all cases to process in a week by default
      OnDeadlineEscalation: 1,
      OnPressureCheck: 1,
      OnSupportShortfallCheck: 1,
      OnExtraCheck: 2, // Allow up to 2 extra checks per week by default
      ...(overrides?.maxPerWeek || {}),
    },
    ...(overrides || {}),
  };
}

/**
 * Determines if a timing/check trigger should run this week, respecting boundedness.
 * Updates state to record the run if allowed.
 * Returns true if the check should run, false if bounded out.
 */
export function shouldRunTimingCheck(
  state: TimingCheckState,
  checkType: TimingCheckType,
  currentWeek: number
): boolean {
  // Reset run count if new week
  if (state.lastRunWeek[checkType] !== currentWeek) {
    state.runCountThisWeek[checkType] = 0;
    state.lastRunWeek[checkType] = currentWeek;
  }
  if (state.runCountThisWeek[checkType] < state.maxPerWeek[checkType]) {
    state.runCountThisWeek[checkType]++;
    return true;
  }
  return false;
}

/**
 * For test/debug: get current run count for a check type this week.
 */
export function getRunCountThisWeek(
  state: TimingCheckState,
  checkType: TimingCheckType,
  currentWeek: number
): number {
  if (state.lastRunWeek[checkType] !== currentWeek) return 0;
  return state.runCountThisWeek[checkType] || 0;
}
