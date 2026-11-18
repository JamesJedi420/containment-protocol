/**
 * SPE-3517 — incident event-time binding snapshot and historical-reference contract (pure, slice 1).
 *
 * Captures minimal immutable references at an authored incident/event boundary for later
 * deterministic resolution against frozen event-time context. Does not deep-copy GameState,
 * own chronology, or mutate current-world state.
 */

export type BindingReferenceKind = 'actor' | 'object' | 'location' | 'topology';

export interface EventTimeReference {
  readonly kind: BindingReferenceKind;
  readonly id: string;
  readonly eventTimeLabel?: string;
}

export interface EventTimeBinding {
  readonly bindingId: string;
  readonly incidentId: string;
  readonly capturedAtTick: number;
  readonly references: readonly EventTimeReference[];
  readonly frozenContext: Readonly<Record<string, unknown>>;
}

export interface BindingResolutionResult {
  readonly bindingId: string;
  readonly resolved: boolean;
  readonly reason?: string;
  readonly usedFrozenContext: boolean;
}

export function createEventTimeBinding(
  bindingId: string,
  incidentId: string,
  capturedAtTick: number,
  references: EventTimeReference[],
  frozenContext: Record<string, unknown> = {},
): EventTimeBinding | { error: string } {
  if (!bindingId || !incidentId || capturedAtTick < 0) {
    return { error: 'malformed_binding_identity' };
  }
  if (!Array.isArray(references) || references.length === 0) {
    return { error: 'missing_required_references' };
  }
  for (const ref of references) {
    if (!ref.kind || !ref.id) {
      return { error: 'malformed_reference' };
    }
  }
  return Object.freeze({
    bindingId,
    incidentId,
    capturedAtTick,
    references: Object.freeze(references.map((r) => Object.freeze({ ...r }))),
    frozenContext: Object.freeze({ ...frozenContext }),
  });
}

export function resolveAgainstBinding(
  binding: EventTimeBinding,
  currentWorld: Record<string, unknown> = {},
): BindingResolutionResult {
  // Pure: never mutates currentWorld or binding. Always prefers frozenContext.
  const usedFrozen = true;
  const missing = binding.references.filter((ref) => !(ref.id in (binding.frozenContext as object)));
  if (missing.length > 0) {
    return {
      bindingId: binding.bindingId,
      resolved: false,
      reason: 'unresolved_required_reference',
      usedFrozenContext: usedFrozen,
    };
  }
  return {
    bindingId: binding.bindingId,
    resolved: true,
    usedFrozenContext: usedFrozen,
  };
}
