import assert from 'node:assert/strict'
import test from 'node:test'
import {
  FAILURE_CODES,
  completenessExitCode,
  discoveryDrift,
  evaluateCompleteness,
  normalizeRepoPath,
  toRepoRelative,
  validateInventory,
} from './evaluate.mjs'

const ROOT = '/repo'
const DISCOVERY = {
  include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
  exclude: ['docs/**'],
}

function inventory(files) {
  return { schemaVersion: 1, owner: 'SPE-3427', discovery: DISCOVERY, files }
}

function report(entries, overrides = {}) {
  return {
    numTotalTestSuites: entries.length,
    numTotalTests: entries.length,
    success: overrides.success ?? true,
    testResults: entries.map(([identity, status = 'passed', message = '']) => ({
      name: `${ROOT}/${identity}`,
      status,
      message,
      assertionResults: message ? [{ status, failureMessages: [message] }] : [],
    })),
  }
}

const evaluate = (inv, rep, extra = {}) =>
  evaluateCompleteness({ inventory: inv, report: rep, discovery: DISCOVERY, root: ROOT, ...extra })

test('passes when expected and observed identities match exactly', () => {
  const result = evaluate(inventory(['src/test/a.test.ts']), report([['src/test/a.test.ts']]))
  assert.equal(result.ok, true)
  assert.deepEqual(result.counts, {
    expected: 1,
    observed: 1,
    matched: 1,
    missing: 0,
    unreviewed: 0,
    failed: 0,
  })
})

test('fails a missing expected file', () => {
  const result = evaluate(
    inventory(['src/test/a.test.ts', 'src/test/b.test.ts']),
    report([['src/test/a.test.ts']])
  )
  assert.equal(result.ok, false)
  assert.deepEqual(result.failures, [
    { code: FAILURE_CODES.MISSING_EXPECTED, path: 'src/test/b.test.ts' },
  ])
})

test('fails an unreviewed new test file', () => {
  const result = evaluate(
    inventory(['src/test/a.test.ts']),
    report([['src/test/a.test.ts'], ['src/test/new.test.ts']])
  )
  assert.equal(result.failures[0].code, FAILURE_CODES.UNREVIEWED)
  assert.equal(result.failures[0].path, 'src/test/new.test.ts')
})

test('fails an empty execution even when the reporter says success', () => {
  const result = evaluate(inventory(['src/test/a.test.ts']), {
    numTotalTestSuites: 0,
    numTotalTests: 0,
    success: true,
    testResults: [],
  })
  assert.equal(result.ok, false)
  assert.equal(result.failures[0].code, FAILURE_CODES.EMPTY_EXECUTION)
})

test('fails a malformed report', () => {
  const result = evaluate(inventory(['src/test/a.test.ts']), { success: true })
  assert.equal(result.failures[0].code, FAILURE_CODES.REPORT_MALFORMED)
})

test('fails an inconsistent report that claims zero suites', () => {
  const partial = report([['src/test/a.test.ts']])
  partial.numTotalTestSuites = 0
  const result = evaluate(inventory(['src/test/a.test.ts']), partial)
  assert.equal(result.failures[0].code, FAILURE_CODES.REPORT_MALFORMED)
})

test('accepts the real reporter shape where suites outnumber test files', () => {
  const real = report([['src/test/a.test.ts']])
  real.numTotalTestSuites = 2577
  const result = evaluate(inventory(['src/test/a.test.ts']), real)
  assert.equal(result.ok, true)
  assert.equal(result.counts.observed, 1)
})

test('reports a failed suite with its collection message', () => {
  const result = evaluate(
    inventory(['src/test/a.test.ts']),
    report([['src/test/a.test.ts', 'failed', "Cannot find module './x.js'"]])
  )
  assert.equal(result.failures[0].code, FAILURE_CODES.SUITE_FAILED)
  assert.match(result.failures[0].message, /Cannot find module/)
})

test('recovers the message for assertion failures whose file message is empty', () => {
  const assertionOnly = {
    numTotalTestSuites: 1,
    numTotalTests: 1,
    success: false,
    testResults: [
      {
        name: `${ROOT}/src/test/a.test.ts`,
        status: 'failed',
        message: '',
        assertionResults: [
          { status: 'failed', failureMessages: ['AssertionError: expected 1 to be 2'] },
        ],
      },
    ],
  }
  const result = evaluate(inventory(['src/test/a.test.ts']), assertionOnly)
  assert.equal(result.failures[0].code, FAILURE_CODES.SUITE_FAILED)
  assert.match(result.failures[0].message, /AssertionError/)
})

test('rejects success:false with no failed suite as untrustworthy', () => {
  const result = evaluate(
    inventory(['src/test/a.test.ts']),
    report([['src/test/a.test.ts']], { success: false })
  )
  assert.equal(result.failures[0].code, FAILURE_CODES.REPORT_MALFORMED)
})

test('rejects duplicate inventory entries', () => {
  const result = validateInventory(inventory(['src/test/a.test.ts', 'src/test/a.test.ts']))
  assert.equal(result.ok, false)
  assert.match(result.errors.join(';'), /duplicate test identity/)
})

test('rejects unsorted inventory entries', () => {
  const result = validateInventory(inventory(['src/test/b.test.ts', 'src/test/a.test.ts']))
  assert.equal(result.ok, false)
  assert.match(result.errors.join(';'), /sorted/)
})

test('rejects non-normalized inventory entries', () => {
  const result = validateInventory(inventory(['src\\test\\a.test.ts']))
  assert.equal(result.ok, false)
  assert.match(result.errors.join(';'), /non-normalized/)
})

test('rejects unknown inventory keys', () => {
  const result = validateInventory({ ...inventory(['src/test/a.test.ts']), extra: true })
  assert.equal(result.ok, false)
  assert.match(result.errors.join(';'), /unknown inventory key/)
})

test('rejects an empty inventory', () => {
  const result = validateInventory(inventory([]))
  assert.equal(result.ok, false)
  assert.match(result.errors.join(';'), /must not be empty/)
})

test('fails when discovery patterns were narrowed', () => {
  const drifted = {
    ...inventory(['src/test/a.test.ts']),
    discovery: { ...DISCOVERY, include: ['src/test/**'] },
  }
  const result = evaluate(drifted, report([['src/test/a.test.ts']]))
  assert.equal(result.failures[0].code, FAILURE_CODES.DISCOVERY_DRIFT)
})

test('discoveryDrift is null for identical contracts', () => {
  assert.equal(discoveryDrift(inventory(['src/test/a.test.ts']), DISCOVERY), null)
})

test('relativizes absolute POSIX report names', () => {
  assert.equal(toRepoRelative(`${ROOT}/src/test/a.test.ts`, ROOT), 'src/test/a.test.ts')
})

test('normalizes Windows separators in report names', () => {
  const windows = {
    numTotalTestSuites: 1,
    numTotalTests: 1,
    success: true,
    testResults: [{ name: 'C:\\repo\\src\\test\\a.test.ts', status: 'passed', message: '' }],
  }
  const result = evaluateCompleteness({
    inventory: inventory(['src/test/a.test.ts']),
    report: windows,
    discovery: DISCOVERY,
    root: 'C:\\repo',
  })
  assert.equal(result.ok, true)
})

test('preserves a genuine runner failure exit code', () => {
  assert.equal(completenessExitCode(3), 3)
  assert.equal(completenessExitCode(1), 1)
})

test('fails closed when the runner status is zero or missing', () => {
  assert.equal(completenessExitCode(0), 1)
  assert.equal(completenessExitCode(null), 1)
  assert.equal(completenessExitCode(undefined), 1)
})

test('normalizeRepoPath rejects absolute, parent and drive-letter identities', () => {
  assert.equal(normalizeRepoPath('/abs/a.test.ts'), null)
  assert.equal(normalizeRepoPath('../a.test.ts'), null)
  assert.equal(normalizeRepoPath('C:/repo/a.test.ts'), null)
  assert.equal(normalizeRepoPath('./src/test/a.test.ts'), 'src/test/a.test.ts')
})
