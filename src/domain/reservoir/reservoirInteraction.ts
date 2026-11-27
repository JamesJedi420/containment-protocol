/**
 * Bounded reservoir interaction grammar for SPE-100.
 * Pure deterministic lookup; no chemistry simulation.
 */

export type ReservoirInteractionKind = 'touch' | 'ingest' | 'immersion' | 'item-contact' | 'inspect' | 'identify' | 'sample';

export type PortabilityRule = 'active-off-site' | 'decay-off-site' | 'deactivate-off-site';

export interface ReservoirDefinition {
  id: string;
  name: string;
  interactions: Partial<Record<ReservoirInteractionKind, string>>;
  portability: PortabilityRule;
  sampleContainerRisk?: 'none' | 'damage' | 'invalidate';
  revisit?: 'depletion' | 'reset-timing' | 'intermittent' | 'room-bound';
}

const REGISTRY: Record<string, ReservoirDefinition> = {
  'anomalous-pool-alpha': {
    id: 'anomalous-pool-alpha',
    name: 'Anomalous Pool Alpha',
    interactions: {
      touch: 'localized skin irritation',
      ingest: 'temporary cognitive fog',
      immersion: 'full sensory distortion',
      'item-contact': 'surface etching',
      inspect: 'visual anomaly noted',
      identify: 'partial spectral signature',
      sample: 'collected with risk',
    },
    portability: 'decay-off-site',
    sampleContainerRisk: 'damage',
    revisit: 'depletion',
  },
};

export function lookupReservoir(id: string): ReservoirDefinition | undefined {
  return REGISTRY[id];
}

export function getInteractionOutcome(id: string, kind: ReservoirInteractionKind): string | undefined {
  return REGISTRY[id]?.interactions[kind];
}

export function isPortableActive(id: string): boolean {
  return REGISTRY[id]?.portability === 'active-off-site';
}

export function getContainerRisk(id: string): string | undefined {
  return REGISTRY[id]?.sampleContainerRisk;
}
