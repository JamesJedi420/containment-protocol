/**
 * SPE-3427 — discovery contract reader.
 *
 * Extracts the literal `test.include` / `test.exclude` arrays from
 * app.vite.config.ts so a narrowed discovery pattern fails the guard instead of
 * silently reducing the expected set. This mirrors the existing idiom in
 * src/test/archivedPrototypeHygiene.test.ts (read the config source, assert the
 * literal patterns) rather than loading or evaluating the TypeScript config.
 *
 * The arrays are read only from the top level of the `test: { ... }` block:
 * string-aware brace matching keeps glob braces such as `*.test.{ts,tsx}` from
 * confusing the block boundary, and nested keys such as `coverage.exclude` are
 * not mistaken for `test.exclude`.
 */

const TEST_BLOCK = /\btest\s*:\s*\{/

function findTestBlock(source) {
  const match = TEST_BLOCK.exec(source)
  if (!match) return null
  const openIndex = match.index + match[0].length - 1
  let depth = 0
  let quote = null
  let escaped = false
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index]
    if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = null
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char
      continue
    }
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return source.slice(openIndex + 1, index)
    }
  }
  return null
}

function readStringArray(source, start) {
  const values = []
  let depth = 0
  let quote = null
  let escaped = false
  let current = ''
  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    if (quote) {
      if (escaped) {
        current += char
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === quote) {
        if (depth === 1) values.push(current)
        quote = null
        current = ''
        continue
      }
      current += char
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char
      current = ''
      continue
    }
    if (char === '[') {
      depth += 1
      continue
    }
    if (char === ']') {
      depth -= 1
      if (depth === 0) return values
    }
  }
  return null
}

/** Read `key: [...]` only when the key sits at the test block's top level. */
function readTopLevelArray(block, key) {
  const pattern = new RegExp(`^${key}\\s*:\\s*\\[`)
  let depth = 0
  let quote = null
  let escaped = false
  for (let index = 0; index < block.length; index += 1) {
    const char = block[index]
    if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = null
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char
      continue
    }
    if (char === '{' || char === '[' || char === '(') {
      depth += 1
      continue
    }
    if (char === '}' || char === ']' || char === ')') {
      depth -= 1
      continue
    }
    if (depth !== 0) continue
    const match = pattern.exec(block.slice(index))
    if (match) return readStringArray(block, index + match[0].length - 1)
  }
  return null
}

/**
 * @param {string} configSource Contents of app.vite.config.ts
 * @returns {{include: string[], exclude: string[]}}
 */
export function readDiscoveryFromConfig(configSource) {
  const block = findTestBlock(configSource)
  if (!block) {
    throw new Error('discovery: could not read a test block from app.vite.config.ts')
  }
  const include = readTopLevelArray(block, 'include')
  const exclude = readTopLevelArray(block, 'exclude')
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
