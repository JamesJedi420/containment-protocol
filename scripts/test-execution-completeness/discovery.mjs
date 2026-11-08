/**
 * SPE-3427 — discovery contract reader.
 *
 * Extracts the literal `test.include` / `test.exclude` arrays from
 * app.vite.config.ts so a narrowed discovery pattern fails the guard instead of
 * silently reducing the expected set. This mirrors the existing idiom in
 * src/test/archivedPrototypeHygiene.test.ts (read the config source, assert the
 * literal patterns) rather than loading or evaluating the TypeScript config.
 */

function extractStringArray(source, key) {
  const match = new RegExp(`\\b${key}\\s*:\\s*\\[([^\\]]*)\\]`).exec(source)
  if (!match) return null
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((entry) => entry[1])
}

/**
 * @param {string} configSource Contents of app.vite.config.ts
 * @returns {{include: string[], exclude: string[]}}
 */
export function readDiscoveryFromConfig(configSource) {
  const include = extractStringArray(configSource, 'include')
  const exclude = extractStringArray(configSource, 'exclude')
  if (!include || include.length === 0) {
    throw new Error(
      'discovery: could not read a non-empty test.include array from app.vite.config.ts'
    )
  }
  if (!exclude) {
    throw new Error('discovery: could not read a test.exclude array from app.vite.config.ts')
  }
  return { include, exclude }
}
