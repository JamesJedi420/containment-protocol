// SPE-1339: Learned-vs-operationally-ready separation seam
// Pure domain, deterministic, no mutation, no UI/store

export type CapabilityPreparationState = 'known' | 'staged' | 'ready';

export type CapabilityAcquisitionEdge =
  | 'canonical'
  | 'anomaly_granted'
  | 'contact_received'
  | 'forced_acquisition';

export interface CapabilityRecord {
  id: string;
  preparationState: CapabilityPreparationState;
  nonTransferable: boolean;
  acquisitionEdge: CapabilityAcquisitionEdge;
}

export type CapabilityGatingResult =
  | { exercisable: true }
  | { exercisable: false; reason: 'not_staged' | 'not_ready' };

/**
 * Determines if a capability is currently exercisable, and if not, the exact blocking step.
 * Pure, deterministic, no mutation.
 */
export function getCapabilityGating(
  record: CapabilityRecord
): CapabilityGatingResult {
  switch (record.preparationState) {
    case 'ready':
      return { exercisable: true };
    case 'staged':
      return { exercisable: false, reason: 'not_ready' };
    case 'known':
    default:
      return { exercisable: false, reason: 'not_staged' };
  }
}
