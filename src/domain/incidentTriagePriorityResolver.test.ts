import { describe, expect, it } from 'vitest';
import {
  resolveIncidentTriagePriority,
  type IncidentTriageInput,
} from './incidentTriagePriorityResolver';

describe('incidentTriagePriorityResolver (SPE-3067)', () => {
  const base = (overrides: Partial<IncidentTriageInput>): IncidentTriageInput => ({
    id: 'case-a',
    urgency: 50,
    threatSeverity: 50,
    escalationPressure: 30,
    strategicValue: 40,
    deferralConsequence: 30,
    confidence: 1,
    blockers: [],
    ...overrides,
  });

  it('ranks two cases differently by urgency and deferral', () => {
    const results = resolveIncidentTriagePriority([
      base({ id: 'low', urgency: 20, deferralConsequence: 10 }),
      base({ id: 'high', urgency: 80, deferralConsequence: 70 }),
    ]);
    expect(results[0].id).toBe('high');
    expect(results[1].id).toBe('low');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('keeps high-threat case blocked when mandatory gate unsatisfied', () => {
    const results = resolveIncidentTriagePriority([
      base({
        id: 'blocked-high',
        threatSeverity: 95,
        urgency: 90,
        blockers: ['jurisdiction-missing'],
      }),
    ]);
    expect(results[0].recommendation).toBe('blocked');
    expect(results[0].reasonCodes).toContain('routing-blocker');
    expect(results[0].blockers).toEqual(['jurisdiction-missing']);
  });

  it('lets lower-severity case outrank another via higher deferral consequence', () => {
    const results = resolveIncidentTriagePriority([
      base({ id: 'high-threat-low-deferral', threatSeverity: 90, deferralConsequence: 10 }),
      base({ id: 'low-threat-high-deferral', threatSeverity: 40, deferralConsequence: 90 }),
    ]);
    expect(results[0].id).toBe('low-threat-high-deferral');
  });

  it('capacity pressure changes recommendation without mutating threat', () => {
    const input = base({
      id: 'sensitive',
      threatSeverity: 60,
      resourcePressureSensitivity: 80,
      urgency: 55,
    });
    const lowPressure = resolveIncidentTriagePriority([input], { capacityPressure: 10 });
    const highPressure = resolveIncidentTriagePriority([input], { capacityPressure: 90 });
    expect(highPressure[0].score).toBeLessThan(lowPressure[0].score);
    expect(highPressure[0].reasonCodes).toContain('capacity-pressure');
    // Original input threat unchanged
    expect(input.threatSeverity).toBe(60);
  });

  it('incomplete intelligence lowers confidence contribution', () => {
    const full = resolveIncidentTriagePriority([base({ id: 'full', confidence: 1, urgency: 70 })]);
    const partial = resolveIncidentTriagePriority([base({ id: 'partial', confidence: 0.3, urgency: 70 })]);
    expect(partial[0].score).toBeLessThan(full[0].score);
    expect(partial[0].reasonCodes).toContain('low-confidence');
    expect(partial[0].confidence).toBe(0.3);
  });

  it('equal inputs resolve via stable id tie-break', () => {
    const a = base({ id: 'z-case' });
    const b = base({ id: 'a-case' });
    const results = resolveIncidentTriagePriority([a, b]);
    expect(results.map((r) => r.id)).toEqual(['a-case', 'z-case']);
    expect(results[0].score).toBe(results[1].score);
  });

  it('exposes contributors and reason codes for explanation parity', () => {
    const results = resolveIncidentTriagePriority([base({ id: 'explain', urgency: 80 })]);
    expect(results[0].contributors.some((c) => c.factor === 'urgency')).toBe(true);
    expect(results[0].reasonCodes.length).toBeGreaterThan(0);
  });
});
