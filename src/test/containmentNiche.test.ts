  it('applies hybrid penalty for recon+containment', () => {
    const agents = [makeAgent(['containment-specialist', 'recon-specialist'])];
    const caze = makeCase();
    const result = computeTeamScore(agents, caze, {});
    expect(result.reasons.join(' ')).toMatch(/hybrid.*-2/i);
  });
import { describe, it, expect } from 'vitest';
import { computeTeamScore } from '../domain/sim/scoring';

const makeAgent = (tags: string[] = []) => ({
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
    stability: { resistance: 1, tolerance: 1 },
    technical: { equipment: 1, anomaly: 1 },
  },
  fatigue: 0,
  relationships: {},
  status: 'active',
  assignment: { state: 'idle' },
});

const makeCase = () => ({
  id: 'c',
  kind: 'standard',
  mode: 'threshold',
  tags: [],
  requiredTags: [],
  preferredTags: [],
  weights: { combat: 0, investigation: 0, utility: 0, social: 0 },
  difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
});

describe('Containment specialist niche effects', () => {
  it('gives +2 bonus for containment-specialist', () => {
    const agents = [makeAgent(['containment-specialist'])];
    const caze = makeCase();
    const result = computeTeamScore(agents, caze, {});
    expect(result.reasons.join(' ')).toMatch(/containment specialist.*\+2/i);
  });
  it('gives -1 penalty for recon-specialist', () => {
    const agents = [makeAgent(['recon-specialist'])];
    const caze = makeCase();
    const result = computeTeamScore(agents, caze, {});
    expect(result.reasons.join(' ')).toMatch(/recon specialist.*-1/i);
  });
  it('gives -2 penalty for recovery-support', () => {
    const agents = [makeAgent(['recovery-support'])];
    const caze = makeCase();
    const result = computeTeamScore(agents, caze, {});
    expect(result.reasons.join(' ')).toMatch(/recovery specialist.*-2/i);
  });
  it('notes missing specialist', () => {
    const agents = [makeAgent([])];
    const caze = makeCase();
    const result = computeTeamScore(agents, caze, {});
    expect(result.reasons.join(' ')).toMatch(/no specialist/i);
  });
});
