import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  CP_CONTRACT_SUITES,
  contractArgs,
  evaluateContractReport,
  runCpContracts,
} from './cp-contracts.mjs'
import {
  detectMissingRequiredValidation,
  probeValidatorAvailability,
  readPackageScripts,
  readRequirementRegistry,
  resolveInvocation,
  resolveValidationRequirements,
} from './requirement-model.mjs'

const EXPECTED = [
  'src/test/events.validation.test.ts',
  'src/test/events.coverage.test.ts',
  'src/test/events.producerValidation.test.ts',
  'src/test/events.recoveredValidation.test.ts',
  'src/domain/events/eventMigration.test.ts',
  'src/app/store/saveSystem.test.ts',
  'src/app/store/runTransfer.test.ts',
  'src/app/store/gameStore.test.ts',
]
const report = () => ({
  success: true,
  numTotalTestSuites: 8,
  testResults: EXPECTED.map((name) => ({
    name,
    status: 'passed',
    assertionResults: [{ status: 'passed' }],
  })),
})

test('both commands select exactly the approved eight suites and shared options', () => {
  assert.deepEqual(CP_CONTRACT_SUITES, EXPECTED)
  const scripts = readPackageScripts()
  assert.equal(scripts['verify:cp-contracts'], 'node scripts/validation/cp-contracts.mjs')
  assert.equal(scripts['verify:cp-contracts:ci'], 'node scripts/validation/cp-contracts.mjs --ci')
  for (const ci of [false, true]) {
    assert.deepEqual(contractArgs(ci, '/report.json'), [
      'run',
      ...EXPECTED,
      '--config',
      'app.vite.config.ts',
      '--configLoader',
      'native',
      '--environment',
      'jsdom',
      '--globals',
      '--pool',
      ci ? 'forks' : 'vmThreads',
      '--reporter=default',
      '--reporter=json',
      '--outputFile.json=/report.json',
    ])
  }
})

test('contract gate is unconditional, required, correctly owned and uses the mode-specific command', () => {
  const registry = readRequirementRegistry()
  for (const files of [[], ['docs/example.md'], ['src/app/store/gameStore.ts']]) {
    const resolution = resolveValidationRequirements(files, registry)
    const gate = resolution.selected.find((v) => v.id === 'cp-contracts')
    assert.equal(gate.ownerIssue, 'SPE-3762')
    assert.equal(gate.enforcement, 'required')
    assert.equal(gate.whenUnavailable, 'fail')
    assert.equal(probeValidatorAvailability(gate, {}), 'unavailable')
    assert.deepEqual(resolveInvocation(gate), { kind: 'npm', value: 'verify:cp-contracts' })
    assert.deepEqual(resolveInvocation(gate, { ci: true }), {
      kind: 'npm',
      value: 'verify:cp-contracts:ci',
    })
    const results = resolution.requiredIds.map((id) => ({
      id,
      status: id === 'cp-contracts' ? 'unavailable' : 'passed',
      enforcement: 'required',
      whenUnavailable: 'fail',
    }))
    assert.deepEqual(detectMissingRequiredValidation(resolution, results), [
      { id: 'cp-contracts', reason: 'required-validator-unavailable' },
    ])
    const previous = {
      ...registry,
      validators: registry.validators.filter((v) => v.id !== 'cp-contracts'),
    }
    assert.deepEqual(
      resolution.selected.filter((v) => v.id !== 'cp-contracts'),
      resolveValidationRequirements(files, previous).selected
    )
  }
})

test('execution attestation accepts passing relative and absolute suite identities', () => {
  assert.equal(evaluateContractReport(report(), process.cwd()).ok, true)
  const absolute = report()
  absolute.testResults.forEach((suite) => {
    suite.name = path.join(process.cwd(), suite.name)
  })
  assert.equal(evaluateContractReport(absolute, process.cwd()).ok, true)
})

test('execution attestation rejects missing, duplicate, extra, failed, skipped and unexecuted suites', () => {
  const mutations = [
    (r) => r.testResults.pop(),
    (r) => {
      r.testResults[0] = r.testResults[1]
    },
    (r) => {
      r.testResults[0].name = 'src/test/unapproved.test.ts'
    },
    (r) => {
      r.testResults[0].status = 'failed'
    },
    (r) => {
      r.testResults[0].status = 'pending'
    },
    (r) => {
      r.testResults[0].assertionResults = []
    },
    (r) => {
      r.testResults[0].assertionResults = [null]
    },
    (r) => {
      r.testResults[0].assertionResults[0].status = 'pending'
    },
    (r) => {
      r.success = false
    },
  ]
  for (const mutate of mutations) {
    const changed = report()
    mutate(changed)
    assert.equal(evaluateContractReport(changed, process.cwd()).ok, false)
  }
  for (const malformed of [null, {}, { testResults: {} }, { success: true, testResults: [] }]) {
    assert.equal(evaluateContractReport(malformed, process.cwd()).ok, false)
  }
})

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-contract-fixture-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  for (const suite of EXPECTED) {
    const target = path.join(root, suite)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, '')
  }
  return root
}

test('runner checks real suite files and forbids filters before spawning', (t) => {
  const root = fixture(t)
  const spawn = () => assert.fail('must not execute Vitest')
  for (const argv of [['--ci', '--ci'], ['--changed'], ['--pool=forks'], [EXPECTED[0]]]) {
    assert.equal(runCpContracts({ root, argv, spawn, log: () => {} }), 1)
  }
  fs.unlinkSync(path.join(root, EXPECTED[0]))
  assert.equal(runCpContracts({ root, spawn, log: () => {} }), 1)
})

test('runner fails on tool errors, failed tests, missing/malformed reports or partial execution', (t) => {
  const root = fixture(t)
  const outcomes = [
    { status: 1 },
    { status: null, error: new Error('unavailable') },
    { status: null, signal: 'SIGTERM' },
    { status: null },
  ]
  for (const outcome of outcomes) {
    const spawn = (_command, args) => {
      const output = args
        .find((arg) => arg.startsWith('--outputFile.json='))
        .slice('--outputFile.json='.length)
      // A valid report must never mask a failed or interrupted process.
      fs.writeFileSync(output, JSON.stringify(report()))
      return outcome
    }
    assert.equal(runCpContracts({ root, spawn, log: () => {} }), 1)
  }
  assert.equal(runCpContracts({ root, spawn: () => ({ status: 0 }), log: () => {} }), 1)
  for (const contents of [
    '{',
    JSON.stringify({ success: true, testResults: report().testResults.slice(1) }),
  ]) {
    const spawn = (_command, args) => {
      const output = args
        .find((arg) => arg.startsWith('--outputFile.json='))
        .split('=')
        .slice(1)
        .join('=')
      fs.writeFileSync(output, contents)
      return { status: 0 }
    }
    assert.equal(runCpContracts({ root, spawn, log: () => {} }), 1)
  }
})

test('runner preserves Node/config/pool/strict-console environment and uses a fresh report per run', (t) => {
  const root = fixture(t)
  const outputs = []
  for (const ci of [false, true]) {
    const spawn = (command, args, options) => {
      assert.equal(command, process.execPath)
      assert.equal(args[0], path.join(root, 'node_modules/vitest/vitest.mjs'))
      const output = args
        .find((arg) => arg.startsWith('--outputFile.json='))
        .slice('--outputFile.json='.length)
      assert.equal(fs.existsSync(output), false)
      assert.deepEqual(args.slice(1), contractArgs(ci, output))
      assert.equal(options.cwd, root)
      assert.equal(options.env, process.env)
      outputs.push(output)
      fs.writeFileSync(output, JSON.stringify(report()))
      return { status: 0 }
    }
    assert.equal(runCpContracts({ root, argv: ci ? ['--ci'] : [], spawn, log: () => {} }), 0)
  }
  assert.notEqual(outputs[0], outputs[1])
  outputs.forEach((output) => assert.equal(fs.existsSync(path.dirname(output)), false))
})
