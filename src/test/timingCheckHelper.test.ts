import { describe, it, expect } from 'vitest';
import {
  createTimingCheckState,
  shouldRunTimingCheck,
  getRunCountThisWeek,
  TimingCheckType,
} from '../domain/sim/timingCheckHelper';

// Deterministic, edge-case, and boundedness tests for the shared timing/check helper

describe('timingCheckHelper', () => {
  it('should allow only bounded number of checks per week', () => {
    const state = createTimingCheckState();
    const week = 5;
    // Default: 1 per week for most, 2 for OnExtraCheck
    expect(shouldRunTimingCheck(state, 'OnLongCaseDurationCheck', week)).toBe(true);
    expect(shouldRunTimingCheck(state, 'OnLongCaseDurationCheck', week)).toBe(false);
    expect(getRunCountThisWeek(state, 'OnLongCaseDurationCheck', week)).toBe(1);
    // OnExtraCheck allows 2
    expect(shouldRunTimingCheck(state, 'OnExtraCheck', week)).toBe(true);
    expect(shouldRunTimingCheck(state, 'OnExtraCheck', week)).toBe(true);
    expect(shouldRunTimingCheck(state, 'OnExtraCheck', week)).toBe(false);
    expect(getRunCountThisWeek(state, 'OnExtraCheck', week)).toBe(2);
  });

  it('should reset run count on new week', () => {
    const state = createTimingCheckState();
    const week = 10;
    expect(shouldRunTimingCheck(state, 'OnResolutionCheck', week)).toBe(true);
    expect(shouldRunTimingCheck(state, 'OnResolutionCheck', week)).toBe(false);
    // New week
    expect(shouldRunTimingCheck(state, 'OnResolutionCheck', week + 1)).toBe(true);
    expect(getRunCountThisWeek(state, 'OnResolutionCheck', week + 1)).toBe(1);
  });

  it('should allow custom maxPerWeek overrides', () => {
    const state = createTimingCheckState({ maxPerWeek: { OnPressureCheck: 3 } });
    const week = 2;
    expect(shouldRunTimingCheck(state, 'OnPressureCheck', week)).toBe(true);
    expect(shouldRunTimingCheck(state, 'OnPressureCheck', week)).toBe(true);
    expect(shouldRunTimingCheck(state, 'OnPressureCheck', week)).toBe(true);
    expect(shouldRunTimingCheck(state, 'OnPressureCheck', week)).toBe(false);
    expect(getRunCountThisWeek(state, 'OnPressureCheck', week)).toBe(3);
  });
});
