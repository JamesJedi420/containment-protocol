import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { ENVIRONMENT_ACTIONS, findRuntimeNpm, runEnvironmentAction } from './codex-environment.mjs'

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

function harness(overrides = {}) {
  const calls = []
  const errors = []
  return {
    calls,
    errors,
    options: {
      nodeVersion: '22.23.4',
      nodeExecutable: '/opt/node22/bin/node',
      platform: 'linux',
      env: { PATH: '/usr/bin', EXAMPLE: 'retained' },
      fileExists: (file) => file === '/opt/node22/lib/node_modules/npm/bin/npm-cli.js',
      spawn: (...args) => {
        calls.push(args)
        return { status: 0 }
      },
      writeError: (message) => errors.push(message),
      ...overrides,
    },
  }
}

test('every non-setup action delegates to an existing project script', () => {
  for (const [name, args] of Object.entries(ENVIRONMENT_ACTIONS)) {
    if (name === 'setup') continue
    assert.equal(args[0], 'run')
    assert.ok(Object.hasOwn(manifest.scripts, args[1]), `${name} references a missing npm script`)
  }
  assert.deepEqual(ENVIRONMENT_ACTIONS.setup, ['ci', '--ignore-scripts'])
  assert.deepEqual(ENVIRONMENT_ACTIONS.preflight, [
    'run',
    'session:preflight',
    '--',
    '--collect-local',
  ])
})

test('setup runs the lockfile install through the current Node runtime without a shell', () => {
  const h = harness()
  assert.equal(runEnvironmentAction(['setup'], h.options), 0)
  assert.equal(h.calls.length, 1)
  const [command, args, options] = h.calls[0]
  assert.equal(command, '/opt/node22/bin/node')
  assert.deepEqual(args, [
    '/opt/node22/lib/node_modules/npm/bin/npm-cli.js',
    'ci',
    '--ignore-scripts',
  ])
  assert.equal(options.shell, false)
  assert.equal(options.stdio, 'inherit')
  assert.equal(options.env.PATH, '/opt/node22/bin:/usr/bin')
  assert.equal(options.env.EXAMPLE, 'retained')
  assert.equal(
    path.resolve(options.cwd),
    path.resolve(fileURLToPath(new URL('..', import.meta.url)))
  )
})

test('Windows uses npm beside Node and preserves one case-insensitive PATH entry', () => {
  const h = harness({
    platform: 'win32',
    nodeExecutable: 'C:\\Node22\\node.exe',
    env: { Path: 'C:\\Windows\\System32' },
    fileExists: (file) => file === 'C:\\Node22\\node_modules\\npm\\bin\\npm-cli.js',
  })
  assert.equal(runEnvironmentAction(['test'], h.options), 0)
  assert.equal(h.calls[0][0], 'C:\\Node22\\node.exe')
  assert.equal(h.calls[0][2].env.Path, 'C:\\Node22;C:\\Windows\\System32')
  assert.equal(Object.hasOwn(h.calls[0][2].env, 'PATH'), false)
  assert.equal(h.calls[0][2].shell, false)
})

test('Linux distro npm layout is supported without searching arbitrary PATH entries', () => {
  const checked = []
  assert.equal(
    findRuntimeNpm('/usr/bin/node', 'linux', (file) => {
      checked.push(file)
      return file === '/usr/share/nodejs/npm/bin/npm-cli.js'
    }),
    '/usr/share/nodejs/npm/bin/npm-cli.js'
  )
  assert.ok(checked.every((file) => !file.includes('/untrusted')))
})

test('Windows duplicate PATH casing cannot select a different runtime', () => {
  const h = harness({
    platform: 'win32',
    nodeExecutable: 'C:\\Node22\\node.exe',
    env: { Path: 'C:\\OldNode', PATH: 'C:\\Windows\\System32' },
    fileExists: () => true,
  })
  assert.equal(runEnvironmentAction(['test'], h.options), 0)
  const childEnv = h.calls[0][2].env
  assert.deepEqual(
    Object.keys(childEnv).filter((key) => key.toUpperCase() === 'PATH'),
    ['PATH']
  )
  assert.equal(childEnv.PATH, 'C:\\Node22;C:\\Windows\\System32')
})

test('POSIX preserves unrelated mixed-case variables while pinning the real PATH', () => {
  const h = harness({ env: { Path: '/unrelated', PATH: '/usr/bin' } })
  assert.equal(runEnvironmentAction(['test'], h.options), 0)
  assert.equal(h.calls[0][2].env.Path, '/unrelated')
  assert.equal(h.calls[0][2].env.PATH, '/opt/node22/bin:/usr/bin')
})

test('unsupported runtime and missing npm fail before any install or action runs', () => {
  for (const nodeVersion of ['20.19.0', '24.18.0', 'unknown']) {
    const h = harness({ nodeVersion })
    assert.equal(runEnvironmentAction(['setup'], h.options), 1)
    assert.equal(h.calls.length, 0)
    assert.match(h.errors[0], /Node.js 22/)
  }
  const h = harness({ fileExists: () => false })
  assert.equal(runEnvironmentAction(['setup'], h.options), 1)
  assert.equal(h.calls.length, 0)
  assert.match(h.errors[0], /npm was not found/)
})

test('unknown actions, inherited property names and extra command arguments never run', () => {
  for (const args of [[], ['__proto__'], ['constructor'], ['publish'], ['test', '--update']]) {
    const h = harness()
    assert.equal(runEnvironmentAction(args, h.options), 2)
    assert.equal(h.calls.length, 0)
  }
})

test('nonzero npm exits are preserved; spawn errors and signals cannot become success', () => {
  for (const [result, expected] of [
    [{ status: 17 }, 17],
    [{ error: { code: 'ENOENT' }, status: null }, 1],
    [{ signal: 'SIGTERM', status: null }, 1],
    [{ status: null }, 1],
  ]) {
    const h = harness({ spawn: () => result })
    assert.equal(runEnvironmentAction(['validate'], h.options), expected)
  }
})

test('invoking preflight retains standard input and delegates readiness to the existing CLI', () => {
  const h = harness()
  assert.equal(runEnvironmentAction(['preflight'], h.options), 0)
  assert.deepEqual(h.calls[0][1].slice(1), ['run', 'session:preflight', '--', '--collect-local'])
  assert.equal(h.calls[0][2].stdio, 'inherit')
})
