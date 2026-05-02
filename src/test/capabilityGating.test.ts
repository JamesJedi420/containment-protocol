// SPE-1339: Learned-vs-operationally-ready separation seam
// Focused deterministic tests for capability gating
import { describe, it, expect } from 'vitest';
import {
  CapabilityRecord,
  getCapabilityGating,
  CapabilityPreparationState,
  CapabilityAcquisitionEdge,
} from '../domain/capabilityGating';

describe('SPE-1339 capability gating', () => {
  const base: Omit<CapabilityRecord, 'preparationState' | 'acquisitionEdge'> = {
    id: 'test',
    nonTransferable: false,
  };

  const edges: CapabilityAcquisitionEdge[] = [
    'canonical',
    'anomaly_granted',
    'contact_received',
    'forced_acquisition',
  ];

  it('blocks known but not staged', () => {
    for (const edge of edges) {
      const rec: CapabilityRecord = { ...base, preparationState: 'known', acquisitionEdge: edge };
      expect(getCapabilityGating(rec)).toEqual({ exercisable: false, reason: 'not_staged' });
    }
  });

  it('blocks staged but not ready', () => {
    for (const edge of edges) {
      const rec: CapabilityRecord = { ...base, preparationState: 'staged', acquisitionEdge: edge };
      expect(getCapabilityGating(rec)).toEqual({ exercisable: false, reason: 'not_ready' });
    }
  });

  it('ready is exercisable', () => {
    for (const edge of edges) {
      const rec: CapabilityRecord = { ...base, preparationState: 'ready', acquisitionEdge: edge };
      expect(getCapabilityGating(rec)).toEqual({ exercisable: true });
    }
  });

  it('non-standard acquisition edges reach known but remain blocked', () => {
    const nonStandard: CapabilityAcquisitionEdge[] = [
      'anomaly_granted',
      'contact_received',
      'forced_acquisition',
    ];
    for (const edge of nonStandard) {
      const rec: CapabilityRecord = { ...base, preparationState: 'known', acquisitionEdge: edge };
      expect(getCapabilityGating(rec)).toEqual({ exercisable: false, reason: 'not_staged' });
    }
  });

  it('does not mutate input', () => {
    const rec: CapabilityRecord = { ...base, preparationState: 'staged', acquisitionEdge: 'canonical' };
    const frozen = Object.freeze({ ...rec });
    expect(() => getCapabilityGating(frozen as CapabilityRecord)).not.toThrow();
    expect(frozen.preparationState).toBe('staged');
  });
});
