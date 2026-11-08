/**
 * SPE-3427 — expected test-file inventory I/O.
 *
 * The inventory is a reviewed, committed declaration of which Vitest test files
 * the repository expects to be discovered and reported. It records identities,
 * not outcomes: seeding it does not attest that any test passed.
 */
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { INVENTORY_SCHEMA_VERSION, validateInventory } from './evaluate.mjs'

export const INVENTORY_PATH = fileURLToPath(
  new URL('./test-file-inventory.v1.json', import.meta.url)
)

/** Deterministic, sorted, de-duplicated inventory from observed identities. */
export function buildInventory(files, discovery) {
  const unique = [...new Set(files)].sort()
  return {
    schemaVersion: INVENTORY_SCHEMA_VERSION,
    owner: 'SPE-3427',
    discovery: {
      include: [...discovery.include],
      exclude: [...discovery.exclude],
    },
    files: unique,
  }
}

export function readInventory(inventoryPath = INVENTORY_PATH) {
  const raw = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'))
  return { inventory: raw, validation: validateInventory(raw) }
}

/**
 * Deterministic JSON that matches the repository's Prettier output (2-space
 * indent, arrays inlined when they fit in 80 columns, one identity per line,
 * trailing newline) so a refreshed inventory never fails `format:check`.
 */
function serializeInventory(inventory) {
  const quote = (value) => JSON.stringify(value)
  const array = (values, prefix) => {
    const inline = `[${values.map(quote).join(', ')}]`
    if (prefix.length + inline.length <= 80) return inline
    return `[\n${values.map((value) => `    ${quote(value)}`).join(',\n')}\n  ]`
  }
  return [
    '{',
    `  "schemaVersion": ${inventory.schemaVersion},`,
    `  "owner": ${quote(inventory.owner)},`,
    '  "discovery": {',
    `    "include": ${array(inventory.discovery.include, '    "include": ')},`,
    `    "exclude": ${array(inventory.discovery.exclude, '    "exclude": ')}`,
    '  },',
    '  "files": [',
    inventory.files.map((file) => `    ${quote(file)}`).join(',\n'),
    '  ]',
    '}',
    '',
  ].join('\n')
}

/** Refuses to persist anything that would not validate on read. */
export function writeInventory(inventory, inventoryPath = INVENTORY_PATH) {
  const validation = validateInventory(inventory)
  if (!validation.ok) {
    throw new Error(`refusing to write invalid inventory: ${validation.errors.join('; ')}`)
  }
  fs.writeFileSync(inventoryPath, serializeInventory(inventory), 'utf8')
  return inventoryPath
}
