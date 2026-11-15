import assert from 'node:assert/strict'
import test from 'node:test'
import { readRequirementRegistry, resolveValidationRequirements } from './requirement-model.mjs'

test('summary implementation, canonical queue dependency and operator contract select required verification', () => {
  const registry = readRequirementRegistry()
  const validator = registry.validators.find((value) => value.id === 'engineering-summary')
  assert.equal(validator.ownerIssue, 'SPE-3512')
  assert.equal(validator.enforcement, 'required')
  assert.equal(validator.whenUnavailable, 'fail')
  for (const file of [
    'scripts/engineering-summary.mjs',
    'scripts/engineering-summary.test.mjs',
    'scripts/engineering-summary-github.mjs',
    'scripts/engineering-summary-github.test.mjs',
    'scripts/engineering-summary-checks.mjs',
    'scripts/engineering-summary-checks.test.mjs',
    'scripts/engineering-summary-validation.mjs',
    'scripts/engineering-summary-validation.test.mjs',
    'scripts/engineering-summary-collector.mjs',
    'scripts/engineering-summary-collector.test.mjs',
    'scripts/engineering-summary-capture.mjs',
    'scripts/project-approved-work.mjs',
    'scripts/validation/engineering-summary-selection.check.mjs',
    'docs/engineering-activity-summary.md',
  ]) {
    assert.ok(
      resolveValidationRequirements([file], registry).requiredIds.includes('engineering-summary'),
      file
    )
  }
  assert.ok(
    !resolveValidationRequirements(['src/domain/math.ts'], registry).requiredIds.includes(
      'engineering-summary'
    )
  )
})
