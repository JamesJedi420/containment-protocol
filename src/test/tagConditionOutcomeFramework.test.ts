import { isValidTagKey, attachTags } from '../domain/tags';
import { getCondition, attachCondition } from '../domain/conditions';
import { getOutcomeBand } from '../domain/outcomes';
import { aggregateModifiers, explainModifiers } from '../domain/modifiers';
import { resolveScouting } from '../domain/scoutingResolution';
import { getVulnerabilityEffect } from '../domain/vulnerability';
import { propagateDistortion, interpretDistortion } from '../domain/distortion';
import type { ConditionKey } from '../domain/shared/tags';
import { describe, it, expect } from 'vitest';

describe('Tag registry and attachment', () => {
  it('should only allow canonical tags', () => {
    expect(isValidTagKey('scout')).toBe(true);
    expect(isValidTagKey('not-a-tag')).toBe(false);
  });
  it('should attach tags in a controlled way', () => {
    const entity: { tags?: string[] } = {};
    attachTags(entity, ['scout', 'biohazard']);
    expect(entity.tags).toContain('scout');
    expect(entity.tags).toContain('biohazard');
  });
});

describe('Condition effects and allowed carriers', () => {
  it('should only allow valid conditions for carriers', () => {
    expect(getCondition('fatigued')).toBeDefined();
    const agent: { type: string; conditions?: ConditionKey[] } = { type: 'agent' };
    attachCondition(agent, 'fatigued', 'agent');
    expect(agent.conditions).toContain('fatigued');
    const intel: { type: string; conditions?: ConditionKey[] } = { type: 'intel' };
    attachCondition(intel, 'fatigued', 'intel');
    expect(intel.conditions).toBeUndefined();
  });
});

describe('Graded outcome threshold behavior', () => {
  it('should map values to correct outcome bands', () => {
    expect(getOutcomeBand(-4)).toBe('catastrophic');
    expect(getOutcomeBand(-2)).toBe('fail');
    expect(getOutcomeBand(0)).toBe('partial');
    expect(getOutcomeBand(2)).toBe('success');
    expect(getOutcomeBand(3)).toBe('strong');
  });
});

describe('Shared modifier aggregation/capping', () => {
  it('should aggregate and cap modifiers', () => {
    const result = aggregateModifiers([
      { source: 'gear', value: 2 },
      { source: 'condition:fatigued', value: -2 },
      { source: 'bonus', value: 5 }
    ]);
    expect(result.total).toBe(5);
    expect(result.capped).toBe(3);
    expect(explainModifiers(result)).toContain('Capped: 3');
  });
});

describe('Contested resolution behavior', () => {
  it('should resolve scouting with correct outcome and explanation', () => {
    const result = resolveScouting({
      teamCapability: 2,
      anomalyConcealment: 1,
      teamTags: ['scout'],
      anomalyTags: ['shapeshifter'],
      teamConditions: ['fatigued'],
      gearTags: ['thermal-vision']
    });
    expect(result.outcome).toBe('strong');
    expect(result.explanation).toContain('Scouting result:');
    expect(result.revealed).toBe(true);
  });
});

describe('Vulnerability/countermeasure interaction', () => {
  it('should apply countermeasure effects', () => {
    const effects = getVulnerabilityEffect(['biohazard'], ['biohazard-suit']);
    expect(effects).toContain('Mitigates -1 modifier from biohazard exposure.');
  });
});

describe('Distortion-state propagation', () => {
  it('should propagate and interpret distortion states', () => {
    const incident = { distortion: ['fragmented'] as const }
    const intel = propagateDistortion(incident, {})
    expect(intel.distortion).toContain('fragmented')
    expect(interpretDistortion(intel)).toContain('fragmented')
  })
})
