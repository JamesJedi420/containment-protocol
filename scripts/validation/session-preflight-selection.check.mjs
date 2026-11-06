import assert from 'node:assert/strict'
import test from 'node:test'
import {
  readRequirementRegistry,
  resolveValidationRequirements,
  probeValidatorAvailability,
  readPackageScripts,
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
    'scripts/session-preflight-linear-diagnostics.mjs',
    'scripts/session-preflight-linear-diagnostics.test.mjs',
    'scripts/session-preflight.mjs',
    'scripts/session-preflight.test.mjs',
    'scripts/validation/session-preflight-selection.check.mjs',
    'scripts/validation/validators.v1.json',
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

test('Codex environment and Copilot profile changes select tooling and both focused contracts', () => {
  for (const file of [
    '.codex/environments/environment.toml',
    '.github/agents/codex.agent.md',
    'scripts/codex-environment.mjs',
    'scripts/codex-environment-contract.mjs',
    'scripts/codex-environment.test.mjs',
  ]) {
    const resolution = resolveValidationRequirements([file], registry)
    assert.ok(resolution.classification.activeClasses.includes('tooling'))
    assert.ok(resolution.requiredIds.includes('lint'))
    assert.ok(resolution.requiredIds.includes('session-preflight'))
    assert.ok(resolution.requiredIds.includes('codex-environment'))
  }
  const entry = registry.validators.find((validator) => validator.id === 'codex-environment')
  assert.equal(entry.ownerIssue, 'SPE-3337')
  assert.equal(entry.whenUnavailable, 'fail')
  assert.equal(probeValidatorAvailability(entry, readPackageScripts()), 'available')
})
