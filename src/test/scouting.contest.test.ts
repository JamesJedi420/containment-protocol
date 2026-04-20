import { resolveScouting } from '../../src/domain/scoutingResolution';

describe('Scouting vs Concealment Contest', () => {
  it('favors recon-specialist in scouting', () => {
    const result = resolveScouting({
      teamCapability: 2,
      anomalyConcealment: 1,
      teamTags: ['recon-specialist'],
      anomalyTags: [],
      teamConditions: [],
      anomalyConditions: [],
      gearTags: []
    });
    expect(result.outcome).toBe('strong');
    expect(result.explanation).toContain('recon-specialist');
  });

  it('penalizes fatigued teams', () => {
    const result = resolveScouting({
      teamCapability: 2,
      anomalyConcealment: 1,
      teamTags: ['scout'],
      anomalyTags: [],
      teamConditions: ['fatigued'],
      anomalyConditions: [],
      gearTags: []
    });
    expect(result.outcome).not.toBe('strong');
    expect(result.explanation).toContain('fatigued');
  });
});
