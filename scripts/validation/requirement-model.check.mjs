/**
 * SPE-3348 — deterministic selection / unavailable / exception / missing-required tests.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyChangedFiles,
  detectMissingRequiredValidation,
  matchGlob,
  probeValidatorAvailability,
  readRequirementRegistry,
  resolveValidationRequirements,
  validateRequirementRegistry,
} from './requirement-model.mjs'

const registry = readRequirementRegistry()

test('canonical registry validates', () => {
  assert.equal(validateRequirementRegistry(registry), true)
  assert.equal(registry.policyOwner, 'SPE-3348')
  assert.ok(registry.validators.some((v) => v.id === 'playwright-e2e'))
  assert.ok(registry.validators.some((v) => v.id === 'academy-authored-content'))
  assert.ok(registry.validators.some((v) => v.id === 'governance-contract'))
})

test('glob matcher is deterministic for ** and *', () => {
  assert.equal(matchGlob('src/domain/foo.ts', 'src/**'), true)
  assert.equal(matchGlob('docs/governance/x.json', 'docs/governance/**'), true)
  assert.equal(matchGlob('docs/readme.md', 'docs/governance/**'), false)
  assert.equal(matchGlob('e2e/cp-smoke.spec.ts', 'e2e/**'), true)
  assert.equal(matchGlob('playwright.config.ts', 'playwright.config.ts'), true)
  assert.equal(matchGlob('docs/foo-audit-bar.md', 'docs/*audit*.md'), true)
})

test('docs-only change selects audits-index and format-check; not unit-tests', () => {
  const resolution = resolveValidationRequirements(
    ['docs/design-audits-index.md', 'docs/some-feature-audit.md'],
    registry,
  )
  assert.ok(resolution.classification.activeClasses.includes('docs'))
  assert.ok(resolution.requiredIds.includes('audits-index'))
  assert.ok(resolution.requiredIds.includes('theme-contracts'))
  assert.ok(resolution.advisoryIds.includes('format-check'))
  assert.ok(!resolution.requiredIds.includes('unit-tests'))
  assert.ok(!resolution.requiredIds.includes('lint'))
})

test('generic docs prose does not force audits-index', () => {
  const resolution = resolveValidationRequirements(['docs/agent-session-handoff.md'], registry)
  assert.ok(!resolution.requiredIds.includes('audits-index'))
  assert.ok(!resolution.requiredIds.includes('theme-contracts'))
  assert.ok(resolution.advisoryIds.includes('format-check'))
})

test('planning-only change requires backlog-handoff', () => {
  const resolution = resolveValidationRequirements(['planning/backlog.md'], registry)
  assert.deepEqual(
    resolution.requiredIds.filter((id) => id === 'backlog-handoff'),
    ['backlog-handoff'],
  )
  assert.ok(!resolution.requiredIds.includes('unit-tests'))
  assert.ok(!resolution.requiredIds.includes('governance-contract'))
})

test('governance-only change requires governance-contract without absorbing SPE-3271', () => {
  const resolution = resolveValidationRequirements(
    ['docs/governance/authority-contract.v1.json', 'scripts/governance/authority-contract.mjs'],
    registry,
  )
  assert.ok(resolution.requiredIds.includes('governance-contract'))
  const gov = resolution.selected.find((s) => s.id === 'governance-contract')
  assert.equal(gov.ownerIssue, 'SPE-3269')
  assert.ok(!registry.validators.some((v) => v.id === 'governance-conformance-projection'))
})

test('application change requires lint + unit-tests; playwright advisory', () => {
  const resolution = resolveValidationRequirements(
    ['src/features/agents/AgentsPage.tsx', 'src/app/AppShell.tsx'],
    registry,
  )
  assert.ok(resolution.requiredIds.includes('lint'))
  assert.ok(resolution.requiredIds.includes('unit-tests'))
  assert.ok(resolution.advisoryIds.includes('playwright-e2e'))
  assert.ok(!resolution.requiredIds.includes('playwright-e2e'))
})

test('e2e harness change promotes playwright-e2e to required', () => {
  const resolution = resolveValidationRequirements(
    ['e2e/cp-smoke.spec.ts', 'playwright.config.ts'],
    registry,
  )
  assert.ok(resolution.requiredIds.includes('playwright-e2e'))
  assert.ok(resolution.requiredIds.includes('lint'))
})

test('academy content change selects SPE-3304 owner without copying its rules', () => {
  const resolution = resolveValidationRequirements(
    ['academy/content/courses.json', 'src/domain/academy/catalog.ts'],
    registry,
  )
  assert.ok(resolution.requiredIds.includes('academy-authored-content'))
  const academy = resolution.selected.find((s) => s.id === 'academy-authored-content')
  assert.equal(academy.ownerIssue, 'SPE-3304')
  assert.equal(academy.npmScript, 'verify:academy-authored-content')
})

test('mixed workstream change unions validators deterministically', () => {
  const files = [
    'src/domain/foo.ts',
    'planning/backlog.md',
    'docs/governance/authority-contract.v1.json',
    'e2e/cp-smoke.spec.ts',
  ]
  const a = resolveValidationRequirements(files, registry)
  const b = resolveValidationRequirements([...files].reverse(), registry)
  assert.deepEqual(a.requiredIds, b.requiredIds)
  assert.deepEqual(
    a.selected.map((s) => `${s.id}:${s.enforcement}`),
    b.selected.map((s) => `${s.id}:${s.enforcement}`),
  )
  assert.ok(a.requiredIds.includes('unit-tests'))
  assert.ok(a.requiredIds.includes('backlog-handoff'))
  assert.ok(a.requiredIds.includes('governance-contract'))
  assert.ok(a.requiredIds.includes('playwright-e2e'))
})

test('explicit exception skips a selected validator', () => {
  const resolution = resolveValidationRequirements(['src/domain/foo.ts'], registry, {
    exceptions: [{ validatorId: 'lint', reason: 'test-exception' }],
  })
  assert.ok(resolution.skippedExceptionIds.includes('lint'))
  assert.ok(!resolution.requiredIds.includes('lint'))
})

test('unavailable required academy validator is detected as missing required validation', () => {
  const resolution = resolveValidationRequirements(['academy/content/x.json'], registry)
  assert.ok(resolution.requiredIds.includes('academy-authored-content'))
  const selected = resolution.selected.find((s) => s.id === 'academy-authored-content')
  const availability = probeValidatorAvailability(selected, {
    lint: 'eslint .',
    // deliberately omit verify:academy-authored-content
  })
  assert.equal(availability, 'unavailable')
  const results = resolution.requiredIds.map((id) =>
    id === 'academy-authored-content'
      ? {
          id,
          status: 'unavailable',
          whenUnavailable: 'fail',
          enforcement: 'required',
        }
      : {
          id,
          status: 'passed',
          whenUnavailable: 'fail',
          enforcement: 'required',
        },
  )
  const missing = detectMissingRequiredValidation(resolution, results)
  assert.equal(missing.length, 1)
  assert.equal(missing[0].id, 'academy-authored-content')
  assert.equal(missing[0].reason, 'required-validator-unavailable')
})

test('missing required detection when required validator never executed', () => {
  const resolution = resolveValidationRequirements(['src/domain/foo.ts'], registry)
  assert.ok(resolution.requiredIds.includes('lint'))
  const missing = detectMissingRequiredValidation(resolution, [
    { id: 'unit-tests', status: 'passed', whenUnavailable: 'fail', enforcement: 'required' },
  ])
  assert.ok(missing.some((m) => m.id === 'lint' && m.reason === 'required-validator-not-executed'))
})

test('classifyChangedFiles sorts files and classes stably', () => {
  const classification = classifyChangedFiles(
    ['planning/a.md', 'src/z.ts', 'docs/governance/c.json'],
    registry,
  )
  assert.deepEqual(classification.files, ['docs/governance/c.json', 'planning/a.md', 'src/z.ts'])
  assert.ok(classification.activeClasses.includes('application'))
  assert.ok(classification.activeClasses.includes('governance'))
  assert.ok(classification.activeClasses.includes('planning'))
})

test('CLI accepts --exclude=id equals form used by npm/CI', async () => {
  const { spawnSync } = await import('node:child_process')
  const result = spawnSync(
    process.execPath,
    [
      'scripts/validation/run-requirements.mjs',
      '--resolve-only',
      '--files=e2e/cp-smoke.spec.ts',
      '--exclude=playwright-e2e',
    ],
    { encoding: 'utf8', cwd: process.cwd() },
  )
  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.match(result.stdout, /required:/)
  assert.doesNotMatch(result.stdout, /playwright-e2e/)
})

test('deleted application path still requires lint and unit-tests', () => {
  const resolution = resolveValidationRequirements(['src/domain/removedModule.ts'], registry)
  assert.ok(resolution.requiredIds.includes('lint'))
  assert.ok(resolution.requiredIds.includes('unit-tests'))
})

test('SPE mirror doc activates theme-contracts', () => {
  const resolution = resolveValidationRequirements(
    ['docs/linear-external-documentation-follow-ups.md'],
    registry,
  )
  assert.ok(resolution.requiredIds.includes('theme-contracts'))
})
