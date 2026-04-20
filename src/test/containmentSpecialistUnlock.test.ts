import { describe, it, expect } from 'vitest';
import { checkAndUnlockContainmentSpecialist } from '../domain/academy';

const makeAgent = (resistance: number, tags: string[] = []) => ({
  id: 'a',
  name: 'Agent A',
  role: 'investigator',
  tags,
  baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
  stats: {
    physical: { strength: 1, endurance: 1 },
    tactical: { awareness: 1, reaction: 1 },
    cognitive: { analysis: 1, investigation: 1 },
    social: { negotiation: 1, influence: 1 },
    stability: { resistance, tolerance: 1 },
    technical: { equipment: 1, anomaly: 1 },
  },
  fatigue: 0,
  relationships: {},
  status: 'active',
  assignment: { state: 'idle' },
});

describe('Containment specialist unlock', () => {
  it('does not unlock if below threshold', () => {
    const [agent, note] = checkAndUnlockContainmentSpecialist(makeAgent(5));
    expect(agent.tags).not.toContain('containment-specialist');
    expect(note).toBeNull();
  });
  it('unlocks and reports when threshold met', () => {
    const [agent, note] = checkAndUnlockContainmentSpecialist(makeAgent(8));
    expect(agent.tags).toContain('containment-specialist');
    expect(note).toMatch(/unlocked/i);
  });
  it('does not duplicate tag or note if already unlocked', () => {
    const [agent, note] = checkAndUnlockContainmentSpecialist(makeAgent(10, ['containment-specialist']));
    expect(agent.tags.filter(t => t === 'containment-specialist').length).toBe(1);
    expect(note).toBeNull();
  });
});
