/**
 * SPE-3105: Bounded personnel management intervention resolver (slice 1).
 * Deterministic eligibility and outcome projection for one-to-one staff management actions.
 * Routes effects to authoritative owners; does not own relationship, morale, or commitment state.
 */

export type ManagementAction =
  | 'check_in'
  | 'reassure'
  | 'recognize'
  | 'mediate'
  | 'confront'
  | 'discipline'
  | 'support'
  | 'dismiss'
  | 'offer_commitment';

export type UnavailabilityReason =
  | 'insufficient_authority'
  | 'on_duty_unavailable'
  | 'secrecy_constraint'
  | 'cooldown_active'
  | 'capacity_exhausted'
  | 'invalid_context';

export interface InterventionContext {
  targetId: string;
  relationshipStrainVisible: boolean; // player-permitted signal only
  stressVisible: 'low' | 'medium' | 'high';
  hasUnresolvedCommitment: boolean;
  authoritySufficient: boolean;
  onDuty: boolean;
  remainingCapacity: number;
  cooldownActive: boolean;
}

export interface AvailableAction {
  action: ManagementAction;
  available: boolean;
  reason?: UnavailabilityReason;
}

export interface InterventionResolution {
  targetId: string;
  availableActions: AvailableAction[];
  remainingCapacity: number;
  needsAttentionHint: boolean; // derived from visible signals only
}

const BASE_ACTIONS: ManagementAction[] = [
  'check_in',
  'reassure',
  'recognize',
  'support',
];

const HIGH_STRAIN_ACTIONS: ManagementAction[] = [
  'mediate',
  'confront',
];

export function resolvePersonnelIntervention(
  context: InterventionContext,
): InterventionResolution {
  const availableActions: AvailableAction[] = [];

  for (const action of [...BASE_ACTIONS, ...HIGH_STRAIN_ACTIONS]) {
    let available = true;
    let reason: UnavailabilityReason | undefined;

    if (!context.authoritySufficient) {
      available = false;
      reason = 'insufficient_authority';
    } else if (context.onDuty && (action === 'confront' || action === 'discipline')) {
      available = false;
      reason = 'on_duty_unavailable';
    } else if (context.cooldownActive || context.remainingCapacity <= 0) {
      available = false;
      reason = context.remainingCapacity <= 0 ? 'capacity_exhausted' : 'cooldown_active';
    } else if (
      (action === 'mediate' || action === 'confront') &&
      !context.relationshipStrainVisible
    ) {
      available = false;
      reason = 'invalid_context';
    }

    availableActions.push({ action, available, reason });
  }

  const needsAttentionHint =
    context.stressVisible === 'high' ||
    context.relationshipStrainVisible ||
    context.hasUnresolvedCommitment;

  return {
    targetId: context.targetId,
    availableActions,
    remainingCapacity: context.remainingCapacity,
    needsAttentionHint,
  };
}
