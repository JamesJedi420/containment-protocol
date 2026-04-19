import { getOutcomeBand, OUTCOME_THRESHOLDS, explainOutcome } from '../../src/domain/outcomes';

describe('Outcome Thresholds', () => {
  it('maps values to correct bands', () => {
    expect(getOutcomeBand(-4)).toBe('catastrophic');
    expect(getOutcomeBand(-2)).toBe('fail');
    expect(getOutcomeBand(0)).toBe('partial');
    expect(getOutcomeBand(2)).toBe('success');
    expect(getOutcomeBand(3)).toBe('strong');
  });

  it('explains outcome bands', () => {
    expect(explainOutcome('catastrophic')).toContain('Disaster');
    expect(explainOutcome('success')).toContain('objective achieved');
  });

  it('uses centralized thresholds', () => {
    expect(typeof OUTCOME_THRESHOLDS.success).toBe('number');
  });
});
