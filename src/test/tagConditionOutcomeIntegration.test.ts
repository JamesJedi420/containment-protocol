import { resolveScouting } from '../domain/scoutingResolution';
import { getVulnerabilityEffect } from '../domain/vulnerability';
import { propagateDistortion, interpretDistortion } from '../domain/distortion';
import type { ConditionKey } from '../domain/shared/tags';
import { describe, it, expect } from 'vitest';

describe('Protocol material prep/recognition integration', () => {
  it('should allow tags and conditions to drive recognition', () => {
    // Example: protocol material with 'containment-protocol' tag and 'fragmented' distortion
    const protocol = { tags: ['containment-protocol'], distortion: ['fragmented'] as const };
    expect(protocol.tags).toContain('containment-protocol');
    expect(protocol.distortion).toContain('fragmented');
    expect(interpretDistortion(protocol)).toContain('fragmented');
  });
});

describe('Incident/hazard escalation integration', () => {
  it('should escalate incident with conditions and distortion', () => {
    const incident: { conditions: ConditionKey[]; distortion: readonly ['misleading'] } = {
      conditions: ['escalating'],
      distortion: ['misleading'],
    }
    expect(incident.conditions).toContain('escalating')
    expect(incident.distortion).toContain('misleading')
    const intel = propagateDistortion(incident, {})
    expect(intel.distortion).toContain('misleading')
  })
})

describe('Scouting/investigation contested resolution integration', () => {
  it('should resolve contested scouting with vulnerability/countermeasure', () => {
    const result = resolveScouting({
      teamCapability: 1,
      anomalyConcealment: 2,
      teamTags: ['scout'],
      anomalyTags: ['biohazard'],
      gearTags: ['biohazard-suit']
    });
    // Vulnerability/countermeasure should mitigate negative effect
    const effects = getVulnerabilityEffect(['biohazard'], ['biohazard-suit']);
    expect(effects.length).toBeGreaterThan(0);
    expect(result.explanation).toContain('Scouting result:');
  });
});
