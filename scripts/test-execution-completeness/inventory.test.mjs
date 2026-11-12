import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { buildInventory, readInventory, writeInventory } from './inventory.mjs'
import { readDiscoveryFromConfig } from './discovery.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))

const DISCOVERY = {
  include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
  exclude: ['docs/**', '**/docs/**'],
}

test('buildInventory sorts and de-duplicates identities', () => {
  const inventory = buildInventory(
    ['src/test/b.test.ts', 'src/test/a.test.ts', 'src/test/b.test.ts'],
    DISCOVERY
  )
  assert.deepEqual(inventory.files, ['src/test/a.test.ts', 'src/test/b.test.ts'])
  assert.equal(inventory.schemaVersion, 1)
  assert.equal(inventory.owner, 'SPE-3427')
  assert.deepEqual(inventory.discovery, DISCOVERY)
})

test('writeInventory round-trips and refuses invalid shapes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-inventory-test-'))
  const file = path.join(dir, 'inventory.json')
  const inventory = buildInventory(['src/test/a.test.ts'], DISCOVERY)
  writeInventory(inventory, file)
  const { inventory: reloaded, validation } = readInventory(file)
  assert.equal(validation.ok, true)
  assert.deepEqual(reloaded, inventory)

  assert.throws(
    () => writeInventory({ ...inventory, files: [] }, file),
    /refusing to write invalid inventory/
  )
})

test('readDiscoveryFromConfig reads the live app.vite.config.ts contract', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app.vite.config.ts'), 'utf8')
  assert.deepEqual(readDiscoveryFromConfig(source), DISCOVERY)
})

test('readDiscoveryFromConfig ignores include arrays outside the test block', () => {
  const source = `export default {
    plugins: [{ include: ['wrong/**'] }],
    test: { include: ['src/**/*.test.ts'], exclude: [] },
  }`
  assert.deepEqual(readDiscoveryFromConfig(source), {
    include: ['src/**/*.test.ts'],
    exclude: [],
  })
})

test('readDiscoveryFromConfig fails closed on spread or variable include entries', () => {
  const source = `test: { include: ['src/**/*.test.ts', ...sharedInclude], exclude: [] }`
  assert.throws(() => readDiscoveryFromConfig(source), /test.include/)
})

test('readDiscoveryFromConfig fails closed on spread exclude entries', () => {
  const source = `test: { include: ['src/**/*.test.ts'], exclude: ['docs/**', ...sharedExclude] }`
  assert.throws(() => readDiscoveryFromConfig(source), /test.exclude/)
})

test('readDiscoveryFromConfig ignores a nested coverage exclude', () => {
  const source = `test: {
    include: ['src/**/*.test.ts'],
    coverage: { exclude: ['docs/**'] },
  }`
  assert.throws(() => readDiscoveryFromConfig(source), /test.exclude/)
})

test('readDiscoveryFromConfig fails closed on a missing exclude array', () => {
  assert.throws(
    () => readDiscoveryFromConfig("test: { include: ['src/**/*.test.ts'] }"),
    /test.exclude/
  )
})
