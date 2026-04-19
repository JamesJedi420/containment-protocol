import { resolveScouting, type ScoutingInput } from '../domain/scoutingResolution';

describe('SPE-57: Layered Site Space & Visibility Model', () => {
  it('distinguishes exterior, transition, and interior spatial states', () => {
    const base: ScoutingInput = {
      teamCapability: 3,
      anomalyConcealment: 2,
      teamTags: ['recon-specialist'],
    };
    // Exterior
    const ext = resolveScouting({ ...base, siteLayer: 'exterior' });
    // Transition
    const trans = resolveScouting({ ...base, siteLayer: 'transition' });
    // Interior
    const int = resolveScouting({ ...base, siteLayer: 'interior' });
    expect(ext.value).toBeGreaterThan(trans.value);
    expect(int.value).toBeGreaterThan(trans.value);
    expect(ext.explanation).toMatch(/exterior/i);
    expect(trans.explanation).toMatch(/transition/i);
    expect(int.explanation).toMatch(/interior/i);
  });

  it('applies deterministic choke/threshold/visibility constraints', () => {
    const base: ScoutingInput = {
      teamCapability: 3,
      anomalyConcealment: 2,
      teamTags: ['recon-specialist'],
    };
    // Chokepoint
    const choke = resolveScouting({ ...base, transitionType: 'chokepoint' });
    // Threshold
    const thresh = resolveScouting({ ...base, transitionType: 'threshold' });
    // No transition
    const none = resolveScouting(base);
    expect(choke.value).toBeLessThan(none.value);
    expect(thresh.value).toBeLessThan(none.value);
    expect(choke.explanation).toMatch(/chokepoint/i);
    expect(thresh.explanation).toMatch(/threshold/i);
  });

  it('applies visibility constraints that change outcome', () => {
    const base: ScoutingInput = {
      teamCapability: 3,
      anomalyConcealment: 2,
      teamTags: ['recon-specialist'],
    };
    // Obstructed
    const obs = resolveScouting({ ...base, visibilityState: 'obstructed' });
    // Exposed
    const exp = resolveScouting({ ...base, visibilityState: 'exposed' });
    // Clear
    const clr = resolveScouting({ ...base, visibilityState: 'clear' });
    expect(obs.value).toBeLessThan(clr.value);
    expect(exp.value).toBeGreaterThanOrEqual(clr.value);
    expect(obs.explanation).toMatch(/obstructed/i);
    expect(exp.explanation).toMatch(/exposed/i);
  });

  it('produces deterministic explanation output for spatial state', () => {
    const result = resolveScouting({
      teamCapability: 3,
      anomalyConcealment: 2,
      teamTags: ['recon-specialist'],
      siteLayer: 'transition',
      visibilityState: 'obstructed',
      transitionType: 'chokepoint',
    });
    expect(result.explanation).toMatch(/transition/i);
    expect(result.explanation).toMatch(/obstructed/i);
    expect(result.explanation).toMatch(/chokepoint/i);
  });

  it('changes operational outcome when blocked at choke', () => {
    // Team with low capability faces a chokepoint
    const blocked = resolveScouting({
      teamCapability: 1,
      anomalyConcealment: 2,
      transitionType: 'chokepoint',
    });
    // Team with high capability, no choke
    const clear = resolveScouting({
      teamCapability: 4,
      anomalyConcealment: 2,
    });
    expect(['fail', 'partial']).toContain(blocked.outcome);
    expect(['success', 'strong']).toContain(clear.outcome);
  });
});
