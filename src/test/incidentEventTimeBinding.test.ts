import { describe, expect, it } from 'vitest';
import {
  createEventTimeBinding,
  resolveAgainstBinding,
  type EventTimeBinding,
} from '../domain/incidentEventTimeBinding';

describe('SPE-3517 incident event-time binding', () => {
  const baseRefs = [
    { kind: 'object' as const, id: 'obj-1', eventTimeLabel: 'present' },
    { kind: 'location' as const, id: 'loc-a' },
  ];

  it('creates a frozen binding and resolves against frozen context after live change', () => {
    const binding = createEventTimeBinding(
      'bind-1',
      'inc-42',
      10,
      baseRefs,
      { 'obj-1': { pos: [0, 0] }, 'loc-a': { topo: 'open' } },
    ) as EventTimeBinding;
    expect(binding.bindingId).toBe('bind-1');
    const result = resolveAgainstBinding(binding, { 'obj-1': { pos: [99, 99] } }); // live moved
    expect(result.resolved).toBe(true);
    expect(result.usedFrozenContext).toBe(true);
  });

  it('fails closed on destroyed/missing historical reference', () => {
    const binding = createEventTimeBinding('bind-2', 'inc-42', 10, baseRefs, {
      'obj-1': null, // destroyed in historical
    }) as EventTimeBinding;
    const result = resolveAgainstBinding(binding);
    expect(result.resolved).toBe(false);
    expect(result.reason).toBe('unresolved_required_reference');
  });

  it('rejects malformed inputs', () => {
    expect(createEventTimeBinding('', 'inc', 0, baseRefs)).toEqual({
      error: 'malformed_binding_identity',
    });
    expect(createEventTimeBinding('b', 'i', 0, [])).toEqual({
      error: 'missing_required_references',
    });
  });

  it('is idempotent for identical inputs', () => {
    const b1 = createEventTimeBinding('b', 'i', 5, baseRefs, { x: 1 });
    const b2 = createEventTimeBinding('b', 'i', 5, baseRefs, { x: 1 });
    expect(b1).toEqual(b2);
  });
});
