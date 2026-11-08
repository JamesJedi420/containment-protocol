/**
 * SPE-3427 — test-execution completeness evaluator.
 *
 * Pure functions only: no filesystem, no child processes, no dependencies.
 * Compares a reviewed expected test-file inventory against the per-file results
 * of the existing full Vitest run (JSON reporter) and classifies every way the
 * observation can be untrustworthy.
 */

export const INVENTORY_SCHEMA_VERSION = 1

export const FAILURE_CODES = Object.freeze({
  INVENTORY_INVALID: 'inventory-invalid',
  DISCOVERY_DRIFT: 'discovery-contract-drift',
  EMPTY_EXECUTION: 'empty-execution',
  MISSING_EXPECTED: 'missing-expected-file',
  UNREVIEWED: 'unreviewed-test-file',
  REPORT_MALFORMED: 'report-malformed',
  SUITE_FAILED: 'suite-failed',
  NARROWED_RUN: 'narrowed-run',
})

/**
 * Canonical inventory/report identity: POSIX separators, no leading `./`,
 * repository-relative, no absolute paths, drive letters or `..` segments.
 * Returns null when the value cannot be a repository-relative test identity.
 */
export function normalizeRepoPath(value) {
  if (typeof value !== 'string' || value.length === 0) return null
  let candidate = value.replaceAll('\\', '/')
  if (candidate.startsWith('./')) candidate = candidate.slice(2)
  if (candidate.length === 0) return null
  if (candidate.startsWith('/')) return null
  if (/^[A-Za-z]:/.test(candidate)) return null
  const segments = candidate.split('/')
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return null
  return candidate
}

/**
 * Relativize a runner-reported path (absolute in Vitest 5) against the config
 * root, tolerating either separator so Windows reports normalise identically.
 */
export function toRepoRelative(filePath, root) {
  const normalizedFile = String(filePath ?? '').replaceAll('\\', '/')
  const normalizedRoot = String(root ?? '')
    .replaceAll('\\', '/')
    .replace(/\/+$/, '')
  if (normalizedRoot.length > 0 && normalizedFile.startsWith(`${normalizedRoot}/`)) {
    return normalizedFile.slice(normalizedRoot.length + 1)
  }
  return normalizedFile
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Strict inventory validation. Unknown keys are rejected (fail closed) so a
 * typo or a competing schema cannot silently weaken the contract.
 */
export function validateInventory(inventory) {
  const errors = []
  if (!isPlainObject(inventory)) {
    return { ok: false, errors: ['inventory must be a JSON object'], files: [] }
  }
  const allowedKeys = new Set(['schemaVersion', 'owner', 'discovery', 'files'])
  for (const key of Object.keys(inventory)) {
    if (!allowedKeys.has(key)) errors.push(`unknown inventory key: ${key}`)
  }
  if (inventory.schemaVersion !== INVENTORY_SCHEMA_VERSION) {
    errors.push(
      `unsupported schemaVersion ${String(inventory.schemaVersion)} (expected ${INVENTORY_SCHEMA_VERSION})`
    )
  }
  if (typeof inventory.owner !== 'string' || inventory.owner.length === 0) {
    errors.push('owner must be a non-empty string')
  }
  if (!isPlainObject(inventory.discovery)) {
    errors.push('discovery must be an object with include/exclude arrays')
  } else {
    for (const key of ['include', 'exclude']) {
      const value = inventory.discovery[key]
      if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
        errors.push(`discovery.${key} must be an array of strings`)
      }
    }
  }
  if (!Array.isArray(inventory.files)) {
    errors.push('files must be an array')
    return { ok: false, errors, files: [] }
  }
  if (inventory.files.length === 0) errors.push('files must not be empty')

  const seen = new Set()
  let previous = null
  for (const raw of inventory.files) {
    const normalized = normalizeRepoPath(raw)
    if (!normalized) {
      errors.push(`invalid test identity: ${JSON.stringify(raw)}`)
      continue
    }
    if (normalized !== raw) {
      errors.push(`non-normalized test identity: ${JSON.stringify(raw)} -> ${normalized}`)
    }
    if (seen.has(normalized)) errors.push(`duplicate test identity: ${normalized}`)
    seen.add(normalized)
    if (previous !== null && normalized <= previous) {
      errors.push(`files must be sorted ascending: ${normalized} follows ${previous}`)
    }
    previous = normalized
  }

  return { ok: errors.length === 0, errors, files: [...seen].sort() }
}

/** Compare the recorded discovery contract with the live configuration. */
export function discoveryDrift(inventory, actualDiscovery) {
  if (!isPlainObject(inventory?.discovery) || !isPlainObject(actualDiscovery)) return null
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  const includeSame = same(inventory.discovery.include, actualDiscovery.include)
  const excludeSame = same(inventory.discovery.exclude, actualDiscovery.exclude)
  if (includeSame && excludeSame) return null
  return {
    expected: {
      include: inventory.discovery.include,
      exclude: inventory.discovery.exclude,
    },
    actual: {
      include: actualDiscovery.include,
      exclude: actualDiscovery.exclude,
    },
  }
}

function firstAssertionFailure(testResult) {
  const assertions = Array.isArray(testResult?.assertionResults) ? testResult.assertionResults : []
  for (const assertion of assertions) {
    const messages = Array.isArray(assertion?.failureMessages) ? assertion.failureMessages : []
    const first = messages.find((message) => typeof message === 'string' && message.length > 0)
    if (first) return first
  }
  return ''
}

/**
 * Evaluate completeness.
 *
 * @param {object} input
 * @param {object} input.inventory        Parsed expected inventory.
 * @param {object} input.report           Parsed Vitest JSON report.
 * @param {object} [input.discovery]      Live discovery contract from app.vite.config.ts.
 * @param {string} [input.root]           Repository root used to relativize report paths.
 * @returns {{ok: boolean, failures: Array<object>, counts: object}}
 */
export function evaluateCompleteness({ inventory, report, discovery, root }) {
  const failures = []
  const push = (code, extra = {}) => failures.push({ code, ...extra })
  const emptyCounts = {
    expected: 0,
    observed: 0,
    matched: 0,
    missing: 0,
    unreviewed: 0,
    failed: 0,
  }

  const validation = validateInventory(inventory)
  if (!validation.ok) {
    for (const error of validation.errors) {
      push(FAILURE_CODES.INVENTORY_INVALID, { detail: error })
    }
    return { ok: false, failures, counts: emptyCounts }
  }

  if (discovery) {
    const drift = discoveryDrift(inventory, discovery)
    if (drift) {
      push(FAILURE_CODES.DISCOVERY_DRIFT, {
        detail: `expected include=${JSON.stringify(drift.expected.include)} exclude=${JSON.stringify(
          drift.expected.exclude
        )}; actual include=${JSON.stringify(drift.actual.include)} exclude=${JSON.stringify(
          drift.actual.exclude
        )}`,
      })
    }
  }

  if (!isPlainObject(report) || !Array.isArray(report.testResults)) {
    push(FAILURE_CODES.REPORT_MALFORMED, { detail: 'report is missing a testResults array' })
    return { ok: false, failures, counts: emptyCounts }
  }

  const suites = report.testResults
  if (suites.length === 0) {
    push(FAILURE_CODES.EMPTY_EXECUTION, {
      detail: `numTotalTestSuites=${String(report.numTotalTestSuites)}, testResults=0, success=${String(
        report.success
      )}`,
    })
  } else if (report.numTotalTestSuites === 0) {
    push(FAILURE_CODES.REPORT_MALFORMED, {
      detail: `numTotalTestSuites=0 but testResults=${suites.length}`,
    })
  } else if (
    typeof report.numTotalTestSuites === 'number' &&
    report.numTotalTestSuites < suites.length
  ) {
    // `numTotalTestSuites` counts describe blocks as well as files, so a valid
    // report normally has more suites than files; fewer means it is inconsistent.
    push(FAILURE_CODES.REPORT_MALFORMED, {
      detail: `numTotalTestSuites=${report.numTotalTestSuites} is smaller than testResults=${suites.length}`,
    })
  }

  const observed = new Map()
  for (const suite of suites) {
    const relative = toRepoRelative(suite?.name, root)
    const identity = normalizeRepoPath(relative)
    if (!identity) {
      push(FAILURE_CODES.REPORT_MALFORMED, {
        detail: `unusable suite path ${JSON.stringify(suite?.name)}`,
      })
      continue
    }
    if (observed.has(identity)) {
      push(FAILURE_CODES.REPORT_MALFORMED, { detail: `duplicate suite entry: ${identity}` })
      continue
    }
    observed.set(identity, suite)
  }

  const expected = new Set(validation.files)
  let matched = 0
  for (const identity of expected) {
    if (observed.has(identity)) {
      matched += 1
    } else {
      push(FAILURE_CODES.MISSING_EXPECTED, { path: identity })
    }
  }

  let unreviewed = 0
  for (const identity of observed.keys()) {
    if (!expected.has(identity)) {
      unreviewed += 1
      push(FAILURE_CODES.UNREVIEWED, { path: identity })
    }
  }

  let failed = 0
  for (const [identity, suite] of observed) {
    if (suite?.status !== 'failed') continue
    failed += 1
    const message =
      typeof suite.message === 'string' && suite.message.length > 0
        ? suite.message
        : firstAssertionFailure(suite)
    push(FAILURE_CODES.SUITE_FAILED, {
      path: identity,
      message: message.length > 0 ? message : '(runner reported failure with no message)',
    })
  }

  if (report.success === false && failed === 0) {
    push(FAILURE_CODES.REPORT_MALFORMED, {
      detail: 'report.success is false but no suite is marked failed',
    })
  }

  const counts = {
    expected: expected.size,
    observed: observed.size,
    matched,
    missing: expected.size - matched,
    unreviewed,
    failed,
  }

  return { ok: failures.length === 0, failures, counts }
}
