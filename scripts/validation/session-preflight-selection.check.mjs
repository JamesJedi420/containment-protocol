import assert from 'node:assert/strict'
import test from 'node:test'
import {
  readRequirementRegistry,
  resolveValidationRequirements,
} from './requirement-model.mjs'

const registry = readRequirementRegistry()

test('SPE-3337 session-preflight validator is registered as required', () => {
  const entry = registry.validators.find((validator) => validator.id === 'session-preflight')
  assert.ok(entry, 'session-preflight validator must be registered')
  assert.equal(entry.ownerIssue, 'SPE-3337')
  assert.equal(entry.enforcement, 'required')
  assert.equal(entry.whenUnavailable, 'fail')
  assert.equal(entry.npmScript, 'verify:session-preflight')
})

test('preflight implementation and canonical handoff docs select the focused validator', () => {
  for (const file of [
    'scripts/session-preflight-core.mjs',
    'scripts/session-preflight.mjs',
    'scripts/session-preflight.test.mjs',
    'docs/session-preflight.md',
    'docs/agent-session-handoff.md',
  ]) {
    const resolution = resolveValidationRequirements([file], registry)
    assert.ok(
      resolution.requiredIds.includes('session-preflight'),
      `expected session-preflight required for ${file}`
    )
  }
})

test('unrelated application code does not select the session preflight validator', () => {
  const resolution = resolveValidationRequirements(['src/domain/math.ts'], registry)
  assert.ok(!resolution.selected.some((validator) => validator.id === 'session-preflight'))
})
