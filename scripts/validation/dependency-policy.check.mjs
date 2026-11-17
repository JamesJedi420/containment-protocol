import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  checkDependencyPolicy,
  isExactVersion,
  verifyDependencyPolicy,
} from './dependency-policy.mjs'

function fixture(section = 'dependencies', version = '1.2.3') {
  return {
    manifest: { [section]: { '@scope/package': version } },
    lock: {
      packages: {
        '': { [section]: { '@scope/package': version } },
        'node_modules/@scope/package': { version },
      },
    },
  }
}

test('accepts exact SemVer, prerelease and build identifiers in every direct section', () => {
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    for (const version of ['0.0.0', '1.2.3', '10.20.30-rc.1', '1.2.3-0.a-b.01x+001.build-1']) {
      const { manifest, lock } = fixture(section, version)
      assert.deepEqual(checkDependencyPolicy(manifest, lock), [], `${section}: ${version}`)
    }
  }
})

test('rejects ranges, tags, non-version specs and invalid SemVer', () => {
  for (const version of [
    '^1.2.3',
    '~1.2.3',
    '>=1.2.3',
    '1.2',
    '1',
    '*',
    '1.2.x',
    '1.2.3 || 2.0.0',
    'latest',
    'next',
    'v1.2.3',
    '=1.2.3',
    'workspace:1.2.3',
    'npm:other@1.2.3',
    'file:../dep',
    'git+https://example.test/dep',
    'https://example.test/dep.tgz',
    '01.2.3',
    '1.02.3',
    '1.2.03',
    '1.2.3-01',
    '1.2.3-',
    '1.2.3+',
    '1.2.3-a..b',
    '1.2.3+a..b',
    '1.2.3+a+b',
    '1.2.3_foo',
    '1.2.3\n',
    ' 1.2.3',
    '',
    null,
    123,
    {},
    [],
  ]) {
    assert.equal(isExactVersion(version), false, JSON.stringify(version))
    const { manifest, lock } = fixture('dependencies', version)
    assert.ok(checkDependencyPolicy(manifest, lock).length, JSON.stringify(version))
  }
})

test('rejects malformed manifest, lock root and section shapes', () => {
  const { manifest, lock } = fixture()
  for (const value of [null, [], 'bad', 3]) {
    assert.ok(checkDependencyPolicy(value, lock).length)
    assert.ok(checkDependencyPolicy(manifest, value).length)
    assert.ok(checkDependencyPolicy(manifest, { packages: value }).length)
    assert.ok(checkDependencyPolicy(manifest, { packages: { '': value } }).length)
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      assert.ok(checkDependencyPolicy({ [section]: value }, lock).length)
      assert.ok(checkDependencyPolicy(manifest, { packages: { '': { [section]: value } } }).length)
    }
  }
  assert.deepEqual(checkDependencyPolicy({}, { packages: { '': {} } }), [])
})

test('missing direct/root records, added lock-only entries and mismatched versions fail', () => {
  const mutations = [
    ({ lock }) => {
      delete lock.packages['']
    },
    ({ lock }) => {
      delete lock.packages[''].dependencies
    },
    ({ lock }) => {
      delete lock.packages['node_modules/@scope/package']
    },
    ({ lock }) => {
      lock.packages['node_modules/@scope/package'] = {}
    },
    ({ lock }) => {
      lock.packages[''].dependencies['@scope/package'] = '^1.2.3'
    },
    ({ lock }) => {
      lock.packages['node_modules/@scope/package'].version = '1.2.4'
    },
    ({ manifest }) => {
      manifest.dependencies['@scope/package'] = '1.2.4'
    },
    ({ manifest }) => {
      delete manifest.dependencies['@scope/package']
    },
    ({ lock }) => {
      lock.packages[''].optionalDependencies = { extra: '1.0.0' }
    },
  ]
  for (const mutate of mutations) {
    const data = fixture()
    mutate(data)
    assert.ok(checkDependencyPolicy(data.manifest, data.lock).length, mutate.toString())
  }
})

test('CLI fails for malformed JSON and missing files; reads the working directory', (t) => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-dependency-policy-'))
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }))
  const { manifest, lock } = fixture()
  fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify(manifest))
  fs.writeFileSync(path.join(cwd, 'package-lock.json'), JSON.stringify(lock))
  const script = fileURLToPath(new URL('./dependency-policy.mjs', import.meta.url))
  const run = () => spawnSync(process.execPath, [script], { cwd, encoding: 'utf8' })
  assert.equal(run().status, 0)
  fs.writeFileSync(path.join(cwd, 'package.json'), '{')
  assert.throws(() => verifyDependencyPolicy(cwd), /package.json/)
  assert.equal(run().status, 1)
  fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify(manifest))
  fs.writeFileSync(path.join(cwd, 'package-lock.json'), '{')
  assert.match(run().stderr, /package-lock.json/)
  assert.equal(run().status, 1)
  fs.unlinkSync(path.join(cwd, 'package-lock.json'))
  assert.equal(run().status, 1)
})
