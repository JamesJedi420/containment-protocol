import { describe, expect, it } from 'vitest';
import {
  getContainerRisk,
  getInteractionOutcome,
  isPortableActive,
  lookupReservoir,
} from './reservoirInteraction';

describe('reservoir interaction grammar (SPE-100)', () => {
  it('returns distinct touch, ingest, and item-contact outcomes', () => {
    const def = lookupReservoir('anomalous-pool-alpha');
    expect(def).toBeDefined();
    expect(getInteractionOutcome('anomalous-pool-alpha', 'touch')).toBe('localized skin irritation');
    expect(getInteractionOutcome('anomalous-pool-alpha', 'ingest')).toBe('temporary cognitive fog');
    expect(getInteractionOutcome('anomalous-pool-alpha', 'item-contact')).toBe('surface etching');
  });

  it('marks portability as decay off-site', () => {
    expect(isPortableActive('anomalous-pool-alpha')).toBe(false);
    expect(lookupReservoir('anomalous-pool-alpha')?.portability).toBe('decay-off-site');
  });

  it('reports sample container damage risk', () => {
    expect(getContainerRisk('anomalous-pool-alpha')).toBe('damage');
  });

  it('supports inspect/identify/sample distinction', () => {
    expect(getInteractionOutcome('anomalous-pool-alpha', 'inspect')).toBe('visual anomaly noted');
    expect(getInteractionOutcome('anomalous-pool-alpha', 'identify')).toBe('partial spectral signature');
    expect(getInteractionOutcome('anomalous-pool-alpha', 'sample')).toBe('collected with risk');
  });

  it('returns undefined for unknown reservoir', () => {
    expect(lookupReservoir('unknown')).toBeUndefined();
    expect(getInteractionOutcome('unknown', 'touch')).toBeUndefined();
  });
});
