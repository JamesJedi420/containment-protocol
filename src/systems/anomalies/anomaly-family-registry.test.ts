import { describe, expect, it } from 'vitest';
import {
  getFamily,
  getSubtype,
  getSubtypesForFamily,
  listFamilies,
} from './anomaly-family-registry';

describe('anomaly family registry (SPE-752 slice 1)', () => {
  it('lists the canonical haunt family', () => {
    const families = listFamilies();
    expect(families).toHaveLength(1);
    expect(families[0].id).toBe('haunt-family');
  });

  it('returns family overview with linked subtype ids', () => {
    const family = getFamily('haunt-family');
    expect(family).toBeDefined();
    expect(family?.subtypes).toEqual(['haunt-standard', 'haunt-elite-apex']);
  });

  it('resolves subtypes under the family including elite/apex', () => {
    const subtypes = getSubtypesForFamily('haunt-family');
    expect(subtypes).toHaveLength(2);
    const apex = subtypes.find((s) => s.kind === 'apex');
    expect(apex?.id).toBe('haunt-elite-apex');
  });

  it('looks up individual subtype by id', () => {
    const subtype = getSubtype('haunt-standard');
    expect(subtype?.kind).toBe('ordinary');
    expect(subtype?.familyId).toBe('haunt-family');
  });

  it('returns undefined for unknown ids', () => {
    expect(getFamily('missing')).toBeUndefined();
    expect(getSubtype('missing')).toBeUndefined();
    expect(getSubtypesForFamily('missing')).toHaveLength(0);
  });
});
