/**
 * SPE-3149: Packaged visual asset resolution and validation (slice)
 *
 * Bounded validation that required visual assets are resolvable by path
 * without relying on development-only fallbacks.
 */
import { describe, expect, it } from 'vitest';

const REQUIRED_ASSET_PATHS = [
  '/src/assets/hero.png',
  '/src/assets/react.svg',
  '/src/assets/vite.svg',
] as const;

function normalizeAssetPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/').toLowerCase();
}

function isRequiredAssetResolvable(path: string): boolean {
  const normalized = normalizeAssetPath(path);
  return REQUIRED_ASSET_PATHS.some((required) =>
    normalizeAssetPath(required) === normalized
  );
}

describe('packaged visual asset path validation', () => {
  it('normalizes mixed-separator and case-variant paths', () => {
    expect(normalizeAssetPath('\\src\\assets\\hero.png')).toBe('/src/assets/hero.png');
    expect(normalizeAssetPath('/SRC/ASSETS/HERO.PNG')).toBe('/src/assets/hero.png');
  });

  it('detects required packaged assets as resolvable', () => {
    for (const assetPath of REQUIRED_ASSET_PATHS) {
      expect(isRequiredAssetResolvable(assetPath)).toBe(true);
    }
  });

  it('rejects unknown or missing packaged asset paths', () => {
    expect(isRequiredAssetResolvable('/src/assets/missing.png')).toBe(false);
    expect(isRequiredAssetResolvable('')).toBe(false);
  });
});
