// Dated SPE-3745 assessment, not a CI policy or a general compatibility guarantee.
// Prepare the inspected 10.2.6 reference in node_modules/.spe3745/minimatch10.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSafe } from './validation/spawn-safe.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const referenceEntry = path.join(root, 'node_modules/.spe3745/minimatch10/dist/commonjs/index.js')
const referenceManifest = JSON.parse(
  readFileSync(path.resolve(path.dirname(referenceEntry), '../../package.json'), 'utf8')
)
assert.equal(referenceManifest.name, 'minimatch')
assert.equal(referenceManifest.version, '10.2.6')
const reference = require(referenceEntry)
const current = require('minimatch')
const esm = await import('minimatch')
assert.equal(require('minimatch/package.json').version, '11.0.5')

// Each inspected consumer must actually resolve to the overridden package.
const consumers = [
  'eslint/lib/eslint/eslint-helpers.js',
  '@eslint/config-array/dist/esm/index.js',
  '@typescript-eslint/typescript-estree/dist/useProgramFromProjectService.js',
]
for (const consumer of consumers) {
  const consumerRequire = createRequire(path.join(root, 'node_modules', consumer))
  assert.equal(consumerRequire.resolve('minimatch'), require.resolve('minimatch'), consumer)
}

const trackedFilesResult = spawnSafe('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
assert.equal(trackedFilesResult.status, 0, 'git ls-files failed')
const trackedPaths = trackedFilesResult.stdout.split('\0').filter(Boolean)
const directories = new Set([''])
for (const file of trackedPaths) {
  const segments = file.split('/')
  while (segments.length > 1) {
    segments.pop()
    directories.add(segments.join('/'))
  }
}
const paths = [
  ...new Set([
    ...trackedPaths,
    ...directories,
    '.hidden.ts',
    'src/.hidden/a.ts',
    'src/domain/a.ts',
    'src/features/A.tsx',
    'src/features/a.js',
    'src/a/../b.ts',
    'src/a.test.ts',
    'coverage/a.ts',
    'dist/assets/a.js',
    'docs/archived/a.ts',
    '.trigger/a.ts',
    'node_modules/example/a.js',
    'src/space name/é.ts',
    'C:/repo/src/a.ts',
    'C:\\repo\\src\\a.ts',
    '//server/share/src/a.ts',
  ]),
]
const config = (await import('../eslint.config.js')).default
const strings = (value) =>
  typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(strings) : []
const configPatterns = [
  ...new Set(config.flatMap((c) => [...strings(c.files), ...strings(c.ignores)])),
]
assert.ok(configPatterns.includes('**/*.{ts,tsx}'), 'Expected repository lint scope')
const patterns = [
  ...new Set([
    ...configPatterns,
    // ESLint defaults/CLI traversal, TypeScript-ESLint's dot:true matcher and edge cases.
    '**/*.js',
    '**/*.mjs',
    '**/*.cjs',
    '**/node_modules/',
    '.git/',
    '**',
    '**/.*',
    '!**/*.test.ts',
    '**/!(*.test).ts',
    'src/**/../*.ts',
    'src/{domain,features}/**/*.{ts,tsx}',
    'src/**/*.ts',
    'src\\**\\*.ts',
  ]),
]
const actualPatterns = new Set([
  ...configPatterns,
  '**/*.js',
  '**/*.mjs',
  '**/*.cjs',
  '**/node_modules/',
  '.git/',
  '**',
])
const actualPaths = new Set([...trackedPaths, ...directories])
const optionSets = [
  { dot: true },
  { dot: true, flipNegate: true },
  { dot: true, nocase: true },
  { dot: true, platform: 'posix' },
  { dot: true, platform: 'win32', windowsPathsNoEscape: true },
]
let comparisons = 0
let actualComparisons = 0
let actualDifferenceCount = 0
let probeDifferenceCount = 0
const probeDifferences = []
function compare(actual, expected, context) {
  comparisons++
  if (actualPaths.has(context.file) && actualPatterns.has(context.pattern)) {
    actualComparisons++
    if (actual !== expected) actualDifferenceCount++
    assert.equal(actual, expected, 'Actual repository pattern/path comparison differs')
  } else if (actual !== expected) {
    probeDifferenceCount++
    if (probeDifferences.length < 20)
      probeDifferences.push({
        fileIndex: paths.indexOf(context.file),
        patternIndex: patterns.indexOf(context.pattern),
        partial: context.partial ?? false,
        dotDotProbe: context.file === 'src/a/../b.ts' && context.pattern === 'src/**/../*.ts',
        before: expected,
        after: actual,
      })
  }
}
for (const options of optionSets) {
  for (const pattern of patterns) {
    const oldMatcher = new reference.Minimatch(pattern, options)
    const matchers = [new current.Minimatch(pattern, options), new esm.Minimatch(pattern, options)]
    for (const file of paths) {
      for (const partial of [false, true]) {
        const expected = oldMatcher.match(file, partial)
        for (const matcher of matchers) {
          compare(matcher.match(file, partial), expected, { file, pattern, options, partial })
        }
      }
      compare(
        current.minimatch(file, pattern, options),
        reference.minimatch(file, pattern, options),
        { file, pattern, options, api: 'minimatch' }
      )
    }
  }
}

// Probe the shipped CJS bundle and inspect the second, inlined ESM loader copy.
const bundlePath = require.resolve('playwright-core/lib/utilsBundle')
const bundleSource = readFileSync(bundlePath, 'utf8')
assert.match(readFileSync(bundlePath + '.LICENSE', 'utf8'), /minimatch@10\.2\.5\b/)
assert.match(readFileSync(bundlePath + '.LICENSE', 'utf8'), /zod@4\.6\.7\b/)
assert.equal(require('playwright/package.json').version, '1.65.1')
const esmLoaderPath = path.join(root, 'node_modules/playwright/lib/transform/esmLoader.js')
const loaderSource = readFileSync(esmLoaderPath, 'utf8')
assert.match(readFileSync(esmLoaderPath + '.LICENSE', 'utf8'), /minimatch@10\.2\.5\b/)
assert.match(
  readFileSync(path.join(root, 'node_modules/prettier/THIRD-PARTY-NOTICES.md'), 'utf8'),
  /minimatch@v11\.0\.6\b/
)
for (const file of ['lib/util.js', 'lib/common/index.js', 'lib/transform/esmLoader.js']) {
  assert.match(
    readFileSync(path.join(root, 'node_modules/playwright', file), 'utf8'),
    /minimatch\(filePath, pattern, \{ nocase: true, dot: true \}\)/,
    `Reinspect Playwright matching options: ${file}`
  )
}
const preprocess = (source) => {
  const match = source.match(/  preprocess\(globParts\) \{[\s\S]*?    return globParts;\r?\n  \}/)
  assert.ok(match, 'Expected inspected minimatch preprocess implementation')
  assert.match(match[0], /optimizationLevel = 1/)
  assert.match(match[0], /if \(optimizationLevel >= 2\)/)
  return match[0].replace(/\s/g, '')
}
const bundledPreprocessCopiesIdentical = preprocess(bundleSource) === preprocess(loaderSource)
assert.ok(bundledPreprocessCopiesIdentical, 'Bundled preprocessing copies differ')
const bundled = require(bundlePath).minimatch
const { createFileMatcher } = require(path.join(root, 'node_modules/playwright/lib/util.js'))
const prototype = bundled.Minimatch.prototype
const original = prototype.firstPhasePreProcess
const originalPreprocess = prototype.preprocess
assert.equal(typeof original, 'function')
let vulnerableBranchCalls = 0
let bundledDefaultAffectedBranchCalls
let bundledPositiveControlObserved
const defaultLevels = []
prototype.preprocess = function (...args) {
  defaultLevels.push(this.options.optimizationLevel ?? 1)
  return originalPreprocess.apply(this, args)
}
prototype.firstPhasePreProcess = function (...args) {
  vulnerableBranchCalls++
  return original.apply(this, args)
}
try {
  // Benign bounded patterns only. Never execute an amplification/DoS payload.
  for (const [pattern, file] of [
    ['**/*.@(spec|test).?(c|m)[jt]s?(x)', 'e2e/example.spec.ts'],
    ['**/pages-smoke.spec.ts', 'e2e/pages-smoke.spec.ts'],
    ['**/error-tracking.spec.ts', 'e2e/error-tracking.spec.ts'],
  ]) {
    assert.equal(createFileMatcher(pattern)(file), true)
  }
  assert.equal(defaultLevels.length, 3, 'Real matcher did not compile the expected patterns')
  assert.deepEqual(defaultLevels, [1, 1, 1])
  bundledDefaultAffectedBranchCalls = vulnerableBranchCalls
  assert.equal(
    bundledDefaultAffectedBranchCalls,
    0,
    'Default Playwright options entered the affected branch'
  )
  new bundled.Minimatch('a/**/../b', { optimizationLevel: 2 })
  bundledPositiveControlObserved = vulnerableBranchCalls > bundledDefaultAffectedBranchCalls
  assert.ok(bundledPositiveControlObserved, 'Positive control did not observe the affected branch')
} finally {
  prototype.firstPhasePreProcess = original
  prototype.preprocess = originalPreprocess
}
console.log(
  JSON.stringify(
    {
      reference: referenceManifest.version,
      overridden: require('minimatch/package.json').version,
      consumerCount: consumers.length,
      trackedPaths: trackedPaths.length,
      directories: directories.size,
      testedPaths: paths.length,
      configPatternCount: configPatterns.length,
      totalPatterns: patterns.length,
      optionSets,
      comparisons,
      actualComparisons,
      actualDifferences: actualDifferenceCount,
      probeDifferenceCount,
      probeDifferences,
      bundledVersion: '10.2.5',
      otherNoticeIdentities: ['playwright-core: zod@4.6.7', 'prettier: minimatch@11.0.6'],
      bundledDefaultAffectedBranchCalls,
      bundledRealMatcherLevels: defaultLevels.slice(0, 3),
      bundledPositiveControlObserved,
      bundledPreprocessCopiesIdentical,
      limitation:
        'Finite corpus and inspected consumers only; bundled vendor code remains affected at optimizationLevel >= 2.',
    },
    null,
    2
  )
)
