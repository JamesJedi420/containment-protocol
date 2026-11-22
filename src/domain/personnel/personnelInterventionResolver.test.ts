import { describe, expect, it } from 'vitest';
import {
  resolvePersonnelIntervention,
  type InterventionContext,
} from './personnelInterventionResolver';

describe('personnelInterventionResolver', () => {
  const baseContext: InterventionContext = {
    targetId: 'staff-1',
    relationshipStrainVisible: false,
    stressVisible: 'low',
    hasUnresolvedCommitment: false,
    authoritySufficient: true,
    onDuty: false,
    remainingCapacity: 2,
    cooldownActive: false,
  };

  it('exposes base actions when no strain and capacity available', () => {
    const result = resolvePersonnelIntervention(baseContext);
    const checkIn = result.availableActions.find((a) => a.action === 'check_in');
    const confront = result.availableActions.find((a) => a.action === 'confront');
    expect(checkIn?.available).toBe(true);
    expect(confront?.available).toBe(false);
    expect(confront?.reason).toBe('invalid_context');
    expect(result.needsAttentionHint).toBe(false);
  });

  it('exposes strain actions and needs-attention hint when visible strain present', () => {
    const strained: InterventionContext = {
      ...baseContext,
      targetId: 'staff-2',
      relationshipStrainVisible: true,
      stressVisible: 'high',
    };
    const result = resolvePersonnelIntervention(strained);
    const confront = result.availableActions.find((a) => a.action === 'confront');
    expect(confront?.available).toBe(true);
    expect(result.needsAttentionHint).toBe(true);
  });

  it('blocks actions when capacity exhausted', () => {
    const exhausted: InterventionContext = {
      ...baseContext,
      remainingCapacity: 0,
    };
    const result = resolvePersonnelIntervention(exhausted);
    expect(result.availableActions.every((a) => !a.available)).toBe(true);
    expect(result.availableActions[0]?.reason).toBe('capacity_exhausted');
  });
});
