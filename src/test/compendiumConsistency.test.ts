import { describe, expect, it } from 'vitest';
import { validateCompendiumRecord, hasBlockingIssues } from '../domain/compendiumConsistency';

describe('compendiumConsistency', () => {
  it('rejects records missing required fields', () => {
    const issues = validateCompendiumRecord({});
    expect(issues.some(i => i.code === 'missing-field')).toBe(true);
    expect(hasBlockingIssues(issues)).toBe(true);
  });

  it('rejects invalid scale', () => {
    const issues = validateCompendiumRecord({
      id: 'a1',
      family: 'test',
      scale: 'invalid' as any,
      statusTerm: 'blocked',
      confidenceTerm: 'low',
      actionTerm: 'contain',
    });
    expect(issues.some(i => i.code === 'invalid-scale')).toBe(true);
  });

  it('flags terminology drift', () => {
    const issues = validateCompendiumRecord({
      id: 'a1',
      family: 'test',
      scale: 'medium',
      statusTerm: 'broken',
      confidenceTerm: 'maybe',
      actionTerm: 'do-something',
    });
    expect(issues.filter(i => i.code === 'terminology-drift').length).toBeGreaterThan(0);
  });

  it('flags jargon leaks and non-actionable blockers', () => {
    const issues = validateCompendiumRecord({
      id: 'a1',
      family: 'test',
      scale: 'high',
      statusTerm: 'blocked',
      confidenceTerm: 'high',
      actionTerm: 'contain',
      blockerMessage: 'GameState hydrate failed',
    });
    expect(issues.some(i => i.code === 'jargon-leak')).toBe(true);
    expect(issues.some(i => i.code === 'non-actionable-blocker')).toBe(true);
  });

  it('accepts a clean actionable record', () => {
    const issues = validateCompendiumRecord({
      id: 'a1',
      family: 'test',
      scale: 'medium',
      statusTerm: 'blocked',
      confidenceTerm: 'high',
      actionTerm: 'contain',
      blockerMessage: 'Access blocked. Contact operations to escalate and recover.',
    });
    expect(issues).toHaveLength(0);
    expect(hasBlockingIssues(issues)).toBe(false);
  });
});
