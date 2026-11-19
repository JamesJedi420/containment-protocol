import { describe, expect, it } from 'vitest';
import {
  evaluateCumulativeSynthesisRisk,
  type AccessEventRef,
  type CompositionCondition,
} from '../domain/cumulativeAuthorizedAccessSynthesisRisk';

describe('SPE-3728 cumulative authorized-access synthesis risk', () => {
  const events: AccessEventRef[] = [
    { id: 'e1', sourceClass: 'archive', sourceRelationship: 'cross_dept', valid: true },
    { id: 'e2', sourceClass: 'archive', sourceRelationship: 'cross_dept', valid: true },
    { id: 'e3', sourceClass: 'public', sourceRelationship: 'same_dept', valid: true },
  ];

  const condition: CompositionCondition = {
    id: 'c96',
    requiredSourceClasses: ['archive'],
    requiredRelationships: ['cross_dept'],
    minMatchingEvents: 2,
  };

  it('produces review assessment on matching composition', () => {
    const result = evaluateCumulativeSynthesisRisk(events, [condition]);
    expect(result).toHaveLength(1);
    expect(result[0].result).toBe('review');
    expect(result[0].conditionId).toBe('c96');
    expect(result[0].contributingEventIds).toEqual(expect.arrayContaining(['e1', 'e2']));
    expect(result[0].reason).toBe('composition_condition_matched');
  });

  it('produces no positive signal on non-matching legitimate research', () => {
    const nonMatch: CompositionCondition = {
      id: 'none',
      requiredSourceClasses: ['restricted'],
      minMatchingEvents: 1,
    };
    const result = evaluateCumulativeSynthesisRisk(events, [nonMatch]);
    expect(result).toHaveLength(0);
  });

  it('is idempotent on duplicate events', () => {
    const withDup = [...events, events[0]];
    const result = evaluateCumulativeSynthesisRisk(withDup, [condition]);
    expect(result).toHaveLength(1);
    expect(result[0].contributingEventIds).toHaveLength(2);
  });

  it('fails closed on missing metadata', () => {
    const incomplete: AccessEventRef[] = [
      { id: 'i1', valid: true },
      { id: 'i2', valid: true },
    ];
    const result = evaluateCumulativeSynthesisRisk(incomplete, [condition]);
    expect(result).toHaveLength(0);
  });
});
