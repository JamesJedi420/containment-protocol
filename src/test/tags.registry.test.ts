import { getTagsByFamily, isValidTagKey, attachTags, TAGS } from '../../src/domain/tags';

describe('Tag Registry', () => {
  it('returns tags by family', () => {
    const roleTags = getTagsByFamily('role');
    expect(roleTags.length).toBeGreaterThan(0);
    expect(roleTags.every(t => t.family === 'role')).toBe(true);
  });

  it('validates tag keys', () => {
    expect(isValidTagKey('recon-specialist')).toBe(true);
    expect(isValidTagKey('not-a-tag')).toBe(false);
  });

  it('attaches tags to an entity', () => {
    const entity: { tags?: string[] } = {};
    attachTags(entity, ['recon-specialist', 'biohazard-suit']);
    expect(entity.tags).toContain('recon-specialist');
    expect(entity.tags).toContain('biohazard-suit');
  });
});
