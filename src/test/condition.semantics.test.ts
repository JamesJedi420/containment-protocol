import { getCondition, isConditionAllowedFor, CONDITIONS } from '../../src/domain/conditions';

describe('Condition Semantics', () => {
  it('gets condition by key', () => {
    const cond = getCondition('fatigued');
    expect(cond).toBeDefined();
    expect(cond?.key).toBe('fatigued');
  });

  it('validates allowed carriers', () => {
    expect(isConditionAllowedFor('fatigued', 'agent')).toBe(true);
    expect(isConditionAllowedFor('fatigued', 'anomaly')).toBe(false);
  });

  it('lists all conditions as bounded', () => {
    expect(Array.isArray(CONDITIONS)).toBe(true);
    expect(CONDITIONS.length).toBeGreaterThan(0);
    for (const cond of CONDITIONS) {
      expect(typeof cond.key).toBe('string');
      expect(Array.isArray(cond.allowedCarriers)).toBe(true);
    }
  });
});
