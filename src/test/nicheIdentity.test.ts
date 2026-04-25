import { resolveScouting } from '../domain/scoutingResolution';
import { previewTrainingImpact } from '../domain/academy';
import { describe, it, expect } from 'vitest';
import type { Agent, StatKey } from '../domain/models';

describe('Niche-specific scouting', () => {
  it('recon-specialist excels at scouting', () => {
    const result = resolveScouting({
      teamCapability: 1,
      anomalyConcealment: 1,
      teamTags: ['recon-specialist']
    });
    expect(result.value).toBe(2); // +2 bonus
  });
  it('containment-specialist is weaker at scouting', () => {
    const result = resolveScouting({
      teamCapability: 1,
      anomalyConcealment: 1,
      teamTags: ['containment-specialist']
    });
    expect(result.value).toBe(-1); // -1 penalty
  });
  it('recovery-support is weakest at scouting', () => {
    const result = resolveScouting({
      teamCapability: 1,
      anomalyConcealment: 1,
      teamTags: ['recovery-support']
    });
    expect(result.value).toBe(-2); // -2 penalty
  });
});

describe('Niche-specific training aptitude', () => {
  const blankStats = {
    physical: { strength: 1, endurance: 1 },
    tactical: { awareness: 1, reaction: 1 },
    cognitive: { analysis: 1, investigation: 1 },
    social: { negotiation: 1, influence: 1 },
    stability: { resistance: 1, tolerance: 1 },
    technical: { equipment: 1, anomaly: 1 },
  };
  const agentRecon: Agent = {
    id: 'recon',
    name: 'Recon',
    role: 'field_recon',
    tags: ['recon-specialist'],
    baseStats: { combat: 1, investigation: 0, utility: 0, social: 0 },
    stats: blankStats,
    fatigue: 0,
    relationships: {},
    status: 'active',
  };
  const agentContain: Agent = {
    id: 'contain',
    name: 'Contain',
    role: 'investigator',
    tags: ['containment-specialist'],
    baseStats: { combat: 0, investigation: 1, utility: 0, social: 0 },
    stats: blankStats,
    fatigue: 0,
    relationships: {},
    status: 'active',
  };
  const agentRecovery: Agent = {
    id: 'recovery',
    name: 'Recovery',
    role: 'medic',
    tags: ['recovery-support'],
    baseStats: { combat: 0, investigation: 0, utility: 1, social: 0 },
    stats: blankStats,
    fatigue: 0,
    relationships: {},
    status: 'active',
  };
  const programRecon = { trainingId: 'rec', name: 'Recon', targetStat: 'investigation' as StatKey, statDelta: 1, durationWeeks: 1, fundingCost: 1, fatigueDelta: 0, description: 'Recon training' };
  const programContainment = { trainingId: 'con', name: 'Containment', targetStat: 'investigation' as StatKey, statDelta: 1, durationWeeks: 1, fundingCost: 1, fatigueDelta: 0, description: 'Containment training' };
  const programSupport = { trainingId: 'sup', name: 'Support', targetStat: 'utility' as StatKey, statDelta: 1, durationWeeks: 1, fundingCost: 1, fatigueDelta: 0, description: 'Support training' };
  it('recon-specialist gets bonus on the canonical recon training surface', () => {
    const preview = previewTrainingImpact(agentRecon, programRecon);
    expect(preview.aptitudeBonus).toBe(2);
  });
  it('containment-specialist gets bonus on the canonical containment training surface', () => {
    const preview = previewTrainingImpact(agentContain, programContainment);
    expect(preview.aptitudeBonus).toBe(2);
  });
  it('recovery-support gets bonus on the canonical support training surface', () => {
    const preview = previewTrainingImpact(agentRecovery, programSupport);
    expect(preview.aptitudeBonus).toBe(2);
  });
});
