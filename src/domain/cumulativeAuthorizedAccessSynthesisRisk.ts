/**
 * SPE-3728 — Cumulative authorized-access synthesis risk (slice 1, pure).
 *
 * Evaluates explicitly authored composition conditions against caller-owned
 * access/retrieval events. Produces a derived assessment only. Does not mutate
 * authorization, sensitivity, or any other canonical state.
 */

export type SynthesisResultState = 'no_signal' | 'review';

export interface AccessEventRef {
  id: string;
  sourceClass?: string;
  sourceRelationship?: string;
  retrievalScope?: string;
  provenanceRef?: string;
  valid: boolean;
}

export interface CompositionCondition {
  id: string;
  requiredSourceClasses?: string[];
  requiredRelationships?: string[];
  minMatchingEvents?: number;
}

export interface SynthesisAssessment {
  id: string;
  conditionId: string;
  result: SynthesisResultState;
  contributingEventIds: string[];
  reason: string;
  provenance: string;
}

export function evaluateCumulativeSynthesisRisk(
  events: readonly AccessEventRef[],
  conditions: readonly CompositionCondition[],
): SynthesisAssessment[] {
  const assessments: SynthesisAssessment[] = [];
  const seenEventIds = new Set<string>();

  for (const condition of conditions) {
    const matching = events.filter((e) => {
      if (!e.valid || seenEventIds.has(e.id)) return false;
      if (condition.requiredSourceClasses && e.sourceClass && !condition.requiredSourceClasses.includes(e.sourceClass)) return false;
      if (condition.requiredRelationships && e.sourceRelationship && !condition.requiredRelationships.includes(e.sourceRelationship)) return false;
      // Fail closed on missing required metadata
      if (condition.requiredSourceClasses && !e.sourceClass) return false;
      if (condition.requiredRelationships && !e.sourceRelationship) return false;
      return true;
    });

    const min = condition.minMatchingEvents ?? 2;
    if (matching.length >= min) {
      const contributing = matching.map((e) => e.id);
      contributing.forEach((id) => seenEventIds.add(id));
      assessments.push({
        id: `synth-${condition.id}-${contributing.slice().sort().join('-')}`,
        conditionId: condition.id,
        result: 'review',
        contributingEventIds: contributing,
        reason: 'composition_condition_matched',
        provenance: 'caller-owned-events',
      });
    }
  }

  return assessments;
}
