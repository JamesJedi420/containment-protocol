import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import {
  readRequirementRegistry,
  resolveValidationRequirements,
} from '../validation/requirement-model.mjs'
import { buildAcceptanceReport, CRITERIA, renderJson, renderMarkdown } from './report.mjs'

const revision = 'a'.repeat(40)
const otherRevision = 'b'.repeat(40)
const registry = readRequirementRegistry()
const root = fileURLToPath(new URL('../../', import.meta.url))
const cli = fileURLToPath(new URL('./report.mjs', import.meta.url))
const seed = JSON.parse(
  readFileSync(new URL('../../planning/spe-3352-release-evidence.v1.json', import.meta.url), 'utf8')
)
const row = (report, id) => report.rows.find((entry) => entry.id === id)

function fixture(files = ['src/domain/funding.ts']) {
  const selected = resolveValidationRequirements(files, registry).selected
  return {
    schemaVersion: 1,
    owner: 'SPE-3352',
    subjectRevision: revision,
    assessments: CRITERIA.map(({ id }) => ({
      id,
      result: 'pass',
      rationale: 'Explicit test assessment.',
      evidence: [
        {
          source: 'https://example.test/evidence',
          revision,
          scope: 'Test-only declared contract.',
        },
      ],
    })),
    validation: {
      revision,
      source: 'https://example.test/validation',
      report: {
        policyOwner: 'SPE-3348',
        files,
        results: selected.map(({ id, enforcement }) => ({ id, status: 'passed', enforcement })),
      },
    },
  }
}

test('bootstrap retains all twelve criteria, owner dimensions, historical limits and open acceptance', () => {
  const report = buildAcceptanceReport(seed, registry)
  assert.equal(report.assessment, 'incomplete')
  assert.equal(report.rows.filter((entry) => entry.id.startsWith('ac-')).length, 12)
  assert.equal(row(report, 'ac-01').status, 'pass')
  assert.equal(row(report, 'ac-03').status, 'unavailable-evidence')
  assert.equal(row(report, 'ac-03').observedResult, 'pass')
  assert.equal(row(report, 'full-build').observedResult, 'fail')
  assert.equal(row(report, 'full-build').remediationOwner, 'SPE-3375')
  assert.equal(row(report, 'owner-ux').status, 'unavailable-evidence')
  assert.equal(row(report, 'repository-validation').status, 'unavailable-evidence')
  assert.deepEqual(report.exceptions, [])
  assert.ok(report.rows.every((entry) => entry.ownerSource.endsWith(entry.owner)))
  assert.match(renderMarkdown(report), /https:\/\/linear.app\/spectranoir\/issue\/SPE-1245/)
})

test('dropping assessments or the execution report cannot erase acceptance requirements', () => {
  const input = fixture()
  input.assessments = []
  delete input.validation
  const report = buildAcceptanceReport(input, registry)
  assert.equal(report.assessment, 'incomplete')
  assert.equal(report.unavailable.length, CRITERIA.length + 1)
})

test('all assessed rows satisfy only declared scope and retain the whole-release limitation', () => {
  const report = buildAcceptanceReport(fixture(), registry)
  assert.equal(report.assessment, 'satisfied-for-declared-scope')
  assert.match(report.limitation, /does not.*establish whole-release readiness/)
})

test('required failures block even if the report says ok and the result claims advisory', () => {
  const input = fixture()
  const lint = input.validation.report.results.find((entry) => entry.id === 'lint')
  Object.assign(lint, { status: 'failed', enforcement: 'advisory' })
  input.validation.report.ok = true
  input.validation.report.requiredIds = []
  const report = buildAcceptanceReport(input, registry)
  assert.equal(report.assessment, 'blocked')
  assert.ok(report.blockers.includes('validator-lint'))
  assert.equal(row(report, 'validator-lint').enforcement, 'required')
  assert.equal(row(report, 'validator-lint').remediationOwner, 'SPE-10')
})

test('advisory census failure is a warning while a passed bundle stays separate', () => {
  const input = fixture()
  input.validation.report.results.find((entry) => entry.id === 'typecheck').status = 'failed'
  input.validation.report.ok = false
  const report = buildAcceptanceReport(input, registry)
  assert.equal(row(report, 'validator-typecheck').status, 'warning')
  assert.equal(row(report, 'validator-vite-build').status, 'pass')
  assert.deepEqual(report.blockers, [])
  assert.ok(report.warnings.includes('validator-typecheck'))
})

test('a newly required full production-build validator fails closed without changing this reporter', () => {
  const futureRegistry = structuredClone(registry)
  futureRegistry.validators.push({
    id: 'production-build',
    ownerIssue: 'SPE-3375',
    npmScript: 'build',
    enforcement: 'required',
    activation: { changeClasses: ['application'] },
    whenUnavailable: 'fail',
  })
  const input = fixture()
  input.validation.report.results.push({ id: 'production-build', status: 'failed' })
  const report = buildAcceptanceReport(input, futureRegistry)
  assert.equal(report.assessment, 'blocked')
  assert.equal(row(report, 'validator-production-build').remediationOwner, 'SPE-3375')
  assert.ok(report.blockers.includes('validator-production-build'))
})

for (const status of ['missing', 'unavailable', 'skipped', 'selected']) {
  test(`required validator ${status} is unavailable and cannot pass via report.ok`, () => {
    const input = fixture()
    if (status === 'missing')
      input.validation.report.results = input.validation.report.results.filter(
        (entry) => entry.id !== 'lint'
      )
    else input.validation.report.results.find((entry) => entry.id === 'lint').status = status
    input.validation.report.ok = true
    const report = buildAcceptanceReport(input, registry)
    assert.equal(report.assessment, 'incomplete')
    assert.equal(row(report, 'validator-lint').status, 'unavailable-evidence')
  })
}

test('historical criteria and validation are retained without asserting current applicability', () => {
  const input = fixture()
  input.assessments[0].evidence[0].revision = otherRevision
  input.validation.revision = otherRevision
  const report = buildAcceptanceReport(input, registry)
  assert.equal(report.assessment, 'incomplete')
  assert.equal(row(report, 'ac-01').status, 'unavailable-evidence')
  assert.equal(row(report, 'ac-01').evidence[0].revision, otherRevision)
  assert.equal(row(report, 'validator-lint').status, 'unavailable-evidence')
})

test('failures require remediation and known exceptions require approval provenance', () => {
  const input = fixture()
  const assessment = input.assessments[0]
  assessment.result = 'fail'
  assert.throws(() => buildAcceptanceReport(input, registry), /remediationOwner/)
  assessment.remediationOwner = 'SPE-3352'
  assert.equal(buildAcceptanceReport(input, registry).assessment, 'blocked')
  assessment.result = 'accepted-exception'
  assert.throws(() => buildAcceptanceReport(input, registry), /approval/)
  assessment.approval = {
    reference: 'https://example.test/explicit-approval',
    reason: 'Test-only reviewed waiver.',
  }
  const report = buildAcceptanceReport(input, registry)
  assert.deepEqual(report.exceptions, ['ac-01'])
  assert.match(renderMarkdown(report), /explicit-approval/)
  assert.match(renderMarkdown(report), /Test-only reviewed waiver/)
})

test('not-applicable and warning decisions retain rationale and evidence', () => {
  const input = fixture()
  input.assessments[0].result = 'not-applicable'
  input.assessments[1].result = 'warning'
  const report = buildAcceptanceReport(input, registry)
  assert.equal(row(report, 'ac-01').status, 'not-applicable')
  assert.ok(report.warnings.includes('ac-02'))
  input.assessments[0].evidence = []
  assert.throws(() => buildAcceptanceReport(input, registry), /source evidence/)
})

test('malformed, duplicate and unknown evidence is rejected', () => {
  const mutations = [
    (x) => {
      x.schemaVersion = 2
    },
    (x) => {
      x.subjectRevision = 'short'
    },
    (x) => {
      x.assessments = null
    },
    (x) => {
      x.assessments.push(x.assessments[0])
    },
    (x) => {
      x.assessments[0].id = 'unknown'
    },
    (x) => {
      x.assessments[0].result = 'probably-pass'
    },
    (x) => {
      x.assessments[0].rationale = ''
    },
    (x) => {
      x.assessments[0].evidence[0].scope = ''
    },
    (x) => {
      x.assessments[0].evidence[0].source = ''
    },
    (x) => {
      x.assessments[0].evidence[0].revision = 'main'
    },
    (x) => {
      x.validation.report.files = []
    },
    (x) => {
      x.validation.report.results.push(x.validation.report.results[0])
    },
    (x) => {
      x.validation.report.results[0].id = 'unselected'
    },
    (x) => {
      x.validation.report.results[0].status = 'success'
    },
  ]
  for (const mutate of mutations) {
    const input = fixture()
    mutate(input)
    assert.throws(() => buildAcceptanceReport(input, registry), /release-acceptance/)
  }
})

test('output ignores assessment/result/input-key ordering without mutating inputs', () => {
  const input = fixture(['src/domain/funding.ts', 'planning/backlog.md'])
  input.assessments[0].evidence.push({
    source: 'https://example.test/second',
    revision,
    scope: 'Second bounded assertion.',
  })
  const before = structuredClone(input)
  const original = buildAcceptanceReport(input, registry)
  assert.deepEqual(input, before)
  input.assessments.reverse()
  for (const assessment of input.assessments) assessment.evidence.reverse()
  input.validation.report.results.reverse()
  input.validation.report.files.reverse()
  const reorderKeys = (value) =>
    Array.isArray(value)
      ? value.map(reorderKeys)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.entries(value)
              .reverse()
              .map(([key, entry]) => [key, reorderKeys(entry)])
          )
        : value
  const reordered = buildAcceptanceReport(reorderKeys(input), registry)
  assert.equal(renderJson(original), renderJson(reordered))
  assert.equal(renderMarkdown(original), renderMarkdown(reordered))
})

test('Markdown preserves source, revision and observation while escaping table-breaking content', () => {
  const input = fixture()
  input.assessments[0].rationale = '<unsafe> | first\nsecond [image] \\'
  const markdown = renderMarkdown(buildAcceptanceReport(input, registry))
  assert.match(markdown, /&lt;unsafe&gt; &#124; first second/)
  assert.match(markdown, /&#91;image&#93; &#92;/)
  assert.match(markdown, /example.test\/evidence/)
  assert.match(markdown, new RegExp(revision))
})

test('real CLI uses pinned Git registry, emits both formats, and rejects invalid inputs without stdout', (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), 'spe3352-report-'))
  const manifestPath = path.join(directory, 'manifest.json')
  const fakeGit = path.join(directory, process.platform === 'win32' ? 'git.exe' : 'git')
  writeFileSync(fakeGit, 'This executable must never be selected from ambient PATH.\n')
  if (process.platform !== 'win32') chmodSync(fakeGit, 0o755)
  t.after(() => {
    unlinkSync(manifestPath)
    unlinkSync(fakeGit)
    rmdirSync(directory)
  })
  writeFileSync(manifestPath, JSON.stringify(seed))
  const run = (...args) =>
    spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' })
  const json = run('--manifest', manifestPath)
  assert.equal(json.status, 0, json.stderr)
  assert.equal(JSON.parse(json.stdout).assessment, 'incomplete')
  const poisonedPath = spawnSync(process.execPath, [cli, '--manifest', manifestPath], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PATH: directory },
  })
  assert.equal(poisonedPath.status, 0, poisonedPath.stderr)
  assert.equal(poisonedPath.stdout, json.stdout)
  const markdown = run('--manifest', manifestPath, '--format', 'markdown')
  assert.equal(markdown.status, 0, markdown.stderr)
  assert.match(markdown.stdout, /\*\*incomplete\*\*/)
  assert.equal(run('--help').status, 0)
  for (const args of [
    [],
    ['--wat'],
    ['--manifest'],
    ['--manifest', manifestPath, '--format', 'html'],
    ['--manifest', manifestPath, '--format', 'json', '--format', 'json'],
  ]) {
    const result = run(...args)
    assert.equal(result.status, 2)
    assert.equal(result.stdout, '')
  }
  writeFileSync(manifestPath, '{')
  assert.equal(run('--manifest', manifestPath).status, 2)
  writeFileSync(manifestPath, JSON.stringify({ ...seed, subjectRevision: '0'.repeat(40) }))
  const missingCommit = run('--manifest', manifestPath)
  assert.equal(missingCommit.status, 2)
  assert.equal(missingCommit.stdout, '')
})
