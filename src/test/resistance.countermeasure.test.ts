import { getResistanceProfile } from '../../src/domain/rules/resistances';
import {
  hasEffectiveCountermeasure,
  explainCountermeasures,
  type CountermeasureCheck,
} from '../../src/domain/rules/countermeasures';

describe('Resistance and Countermeasure Interaction', () => {
  it('returns correct resistance profile', () => {
    const profile = getResistanceProfile('deception');
    expect(profile).toBeDefined();
    expect(profile?.family).toBe('deception');
  });

  it('detects effective countermeasures', () => {
    const check: CountermeasureCheck = { family: 'deception', presentTags: ['thermal-vision', 'scout'] };
    expect(hasEffectiveCountermeasure(check)).toBe(true);
    expect(explainCountermeasures(check)).toContain('thermal-vision');
  });

  it('returns false for missing countermeasures', () => {
    const check: CountermeasureCheck = { family: 'containment', presentTags: ['scout'] };
    expect(hasEffectiveCountermeasure(check)).toBe(false);
    expect(explainCountermeasures(check)).toContain('No effective');
  });
});
