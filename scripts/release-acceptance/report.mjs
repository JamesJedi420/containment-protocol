import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  resolveValidationRequirements,
  validateRequirementRegistry,
} from '../validation/requirement-model.mjs'

// Stable v1 mapping to SPE-3352's twelve acceptance criteria, plus the owner
// dimensions explicitly required by AC06. Missing assessments retain their rows.
export const CRITERIA = Object.freeze(
  [
    ['ac-01', 'Named golden fixtures and stable assertions', 'SPE-3352'],
    ['ac-02', 'Canonical outcome repeatability', 'SPE-3352'],
    ['ac-03', 'Fresh entry, multiple weeks and reload', 'SPE-3352'],
    ['ac-04', 'Degraded operation and recoverable consequences', 'SPE-3352'],
    ['ac-05', 'Consume the existing weekly-loop baseline', 'SPE-3352'],
    ['ac-06', 'Aggregate authoritative owner evidence', 'SPE-3352'],
    ['ac-07', 'Classify every criterion with rationale and evidence', 'SPE-3352'],
    ['ac-08', 'Identify remediation owners', 'SPE-3352'],
    ['ac-09', 'Explicit fixture runtime and state-growth thresholds', 'SPE-3352'],
    ['ac-10', 'Explicit, reviewable exceptions', 'SPE-3352'],
    ['ac-11', 'CP-core scope and supported lifecycle only', 'SPE-3352'],
    ['ac-12', 'Reproducible acceptance summary', 'SPE-3352'],
    ['owner-persistence', 'Persistence and migration evidence', 'SPE-2607'],
    ['owner-accessibility', 'Accessibility and explainability evidence', 'SPE-1080'],
    ['owner-ux', 'Observed-player and UX evidence', 'SPE-1245'],
    ['owner-telemetry', 'Telemetry and diagnostic evidence', 'SPE-1119'],
    ['owner-replay', 'Canonical stochastic identity and replay evidence', 'SPE-3162'],
    ['owner-continuity', 'Continuity-validation evidence', 'SPE-1464'],
    ['owner-calibration', 'Calibration evidence', 'SPE-25'],
    ['owner-simulation', 'Simulation-validation evidence', 'SPE-26'],
    ['full-build', 'Full production build (separate from bundle gate)', 'SPE-3375'],
  ].map(([id, title, owner]) => Object.freeze({ id, title, owner }))
)

const RESULTS = new Set([
  'pass',
  'fail',
  'warning',
  'accepted-exception',
  'unavailable',
  'not-applicable',
])
const VALIDATOR_RESULTS = new Set(['passed', 'failed', 'unavailable', 'skipped', 'selected'])
const SHA = /^[a-f0-9]{40}$/
const ISSUE = /^SPE-\d+$/
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

function requireValue(condition, message) {
  if (!condition) throw new Error(`release-acceptance: ${message}`)
}

function text(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function evidenceList(value, label) {
  requireValue(Array.isArray(value), `${label} evidence must be an array`)
  for (const entry of value) {
    requireValue(
      entry && text(entry.source) && text(entry.scope) && SHA.test(entry.revision),
      `${label} evidence needs source, scope and full revision`
    )
  }
  return value
    .map(({ source, scope, revision }) => ({ source, scope, revision }))
    .sort((a, b) => compare(JSON.stringify(a), JSON.stringify(b)))
}

function assessCriterion(criterion, assessment, revision) {
  const base = {
    ...criterion,
    status: 'unavailable-evidence',
    rationale: 'No assessment supplied.',
    evidence: [],
  }
  if (!assessment) return base
  requireValue(
    RESULTS.has(assessment.result) && text(assessment.rationale),
    `${criterion.id} needs a known result and rationale`
  )
  const evidence = evidenceList(assessment.evidence, criterion.id)
  requireValue(
    assessment.result === 'unavailable' || evidence.length > 0,
    `${criterion.id} needs source evidence`
  )
  if (assessment.result === 'fail') {
    requireValue(
      ISSUE.test(assessment.remediationOwner),
      `${criterion.id} failure needs remediationOwner`
    )
  }
  if (assessment.result === 'accepted-exception') {
    requireValue(
      text(assessment.approval?.reference) && text(assessment.approval?.reason),
      `${criterion.id} exception needs approval reference and reason`
    )
  }
  const historical = evidence.some((entry) => entry.revision !== revision)
  const statuses = {
    pass: 'pass',
    fail: criterion.id === 'full-build' ? 'warning' : 'release-blocking-failure',
    warning: 'warning',
    unavailable: 'unavailable-evidence',
    'accepted-exception': 'accepted-exception',
    'not-applicable': 'not-applicable',
  }
  return {
    ...base,
    status: historical ? 'unavailable-evidence' : statuses[assessment.result],
    observedResult: assessment.result,
    rationale:
      assessment.rationale +
      (historical
        ? ' Evidence includes another revision; current applicability is unverified.'
        : ''),
    evidence,
    ...(assessment.result === 'fail' ? { remediationOwner: assessment.remediationOwner } : {}),
    ...(assessment.result === 'accepted-exception'
      ? {
          approval: {
            reference: assessment.approval.reference,
            reason: assessment.approval.reason,
          },
        }
      : {}),
  }
}

function assessValidators(validation, registry, revision) {
  if (validation === undefined || validation === null) {
    return [
      {
        id: 'repository-validation',
        title: 'Repository validation evidence',
        owner: 'SPE-3348',
        status: 'unavailable-evidence',
        rationale: 'No SPE-3348 execution report supplied.',
        evidence: [],
      },
    ]
  }
  requireValue(
    SHA.test(validation.revision) && text(validation.source),
    'validation needs revision and source'
  )
  const report = validation.report
  requireValue(
    report?.policyOwner === 'SPE-3348' &&
      Array.isArray(report.files) &&
      report.files.length > 0 &&
      report.files.every(text) &&
      Array.isArray(report.results),
    'validation needs a SPE-3348 report with a nonempty change set and results'
  )
  // Resolve from the target revision's actual registry. Do not trust report.ok,
  // requiredIds, missingRequired, or enforcement possibly changed by --exclude.
  const resolution = resolveValidationRequirements(report.files, registry)
  const results = new Map()
  for (const result of report.results) {
    requireValue(
      result && text(result.id) && VALIDATOR_RESULTS.has(result.status),
      'invalid validator result'
    )
    requireValue(!results.has(result.id), `duplicate validator ${result.id}`)
    requireValue(
      resolution.selected.some((entry) => entry.id === result.id),
      `unselected validator ${result.id}`
    )
    results.set(result.id, result)
  }
  requireValue(resolution.selected.length > 0, 'change set selects no validators')
  return resolution.selected.map((selected) => {
    const result = results.get(selected.id)
    const historical = validation.revision !== revision
    const status =
      historical || !result || ['unavailable', 'skipped', 'selected'].includes(result.status)
        ? 'unavailable-evidence'
        : result.status === 'passed'
          ? 'pass'
          : selected.enforcement === 'required'
            ? 'release-blocking-failure'
            : 'warning'
    return {
      id: `validator-${selected.id}`,
      title: selected.id,
      owner: selected.ownerIssue,
      enforcement: selected.enforcement,
      status,
      observedResult: result?.status ?? 'not-executed',
      rationale: historical
        ? 'Execution report belongs to another revision.'
        : result?.detail ||
          `${selected.id}: ${result?.status ?? 'required or advisory validator not executed'}.`,
      evidence: [
        {
          source: validation.source,
          revision: validation.revision,
          scope: `SPE-3348 execution for declared files: ${resolution.classification.files.join(', ')}`,
        },
      ],
      ...(result?.status === 'failed' ? { remediationOwner: selected.ownerIssue } : {}),
    }
  })
}

export function buildAcceptanceReport(manifest, registry) {
  requireValue(
    manifest?.schemaVersion === 1 &&
      manifest.owner === 'SPE-3352' &&
      SHA.test(manifest.subjectRevision),
    'expected v1 SPE-3352 manifest with full subjectRevision'
  )
  requireValue(Array.isArray(manifest.assessments), 'assessments must be an array')
  validateRequirementRegistry(registry)
  requireValue(registry.policyOwner === 'SPE-3348', 'registry must be owned by SPE-3348')
  const assessments = new Map()
  for (const assessment of manifest.assessments) {
    requireValue(
      assessment && CRITERIA.some((entry) => entry.id === assessment.id),
      `unknown criterion ${assessment?.id}`
    )
    requireValue(!assessments.has(assessment.id), `duplicate criterion ${assessment.id}`)
    assessments.set(assessment.id, assessment)
  }
  const rows = [
    ...CRITERIA.map((criterion) =>
      assessCriterion(criterion, assessments.get(criterion.id), manifest.subjectRevision)
    ),
    ...assessValidators(manifest.validation, registry, manifest.subjectRevision),
  ]
    .map((row) => ({
      ...row,
      ownerSource: `https://linear.app/spectranoir/issue/${row.owner}`,
      ...(row.remediationOwner
        ? { remediationSource: `https://linear.app/spectranoir/issue/${row.remediationOwner}` }
        : {}),
    }))
    .sort((a, b) => compare(a.id, b.id))
  const blockers = rows
    .filter((row) => row.status === 'release-blocking-failure')
    .map((row) => row.id)
  const unavailable = rows
    .filter((row) => row.status === 'unavailable-evidence')
    .map((row) => row.id)
  return {
    schemaVersion: 1,
    owner: 'SPE-3352',
    subjectRevision: manifest.subjectRevision,
    registrySource: `git:${manifest.subjectRevision}:scripts/validation/validators.v1.json`,
    assessment: blockers.length
      ? 'blocked'
      : unavailable.length
        ? 'incomplete'
        : 'satisfied-for-declared-scope',
    limitation:
      'Reviewed evidence snapshot only; does not execute fixtures, verify external sources, approve exceptions, close Linear issues or establish whole-release readiness.',
    blockers,
    unavailable,
    warnings: rows.filter((row) => row.status === 'warning').map((row) => row.id),
    exceptions: rows.filter((row) => row.status === 'accepted-exception').map((row) => row.id),
    rows,
  }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort(compare)
        .map((key) => [key, canonical(value[key])])
    )
  return value
}

export function renderJson(report) {
  return JSON.stringify(canonical(report), null, 2) + '\n'
}

function cell(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('\\', '&#92;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('[', '&#91;')
    .replaceAll(']', '&#93;')
    .replaceAll('|', '&#124;')
    .replaceAll('\r', ' ')
    .replaceAll('\n', ' ')
}

export function renderMarkdown(report) {
  const lines = [
    '# CP-core release evidence',
    '',
    `Subject revision: ${report.subjectRevision}`,
    '',
    `Assessment: **${report.assessment}**`,
    '',
    report.limitation,
    '',
    `Blockers: ${report.blockers.join(', ') || 'none'}`,
    '',
    `Unavailable: ${report.unavailable.join(', ') || 'none'}`,
    '',
    `Warnings: ${report.warnings.join(', ') || 'none'}`,
    '',
    `Accepted exceptions: ${report.exceptions.join(', ') || 'none'}`,
    '',
    `Registry: ${report.registrySource}`,
    '',
    '| Criterion | Status | Owner / remediation | Rationale and evidence |',
    '| --- | --- | --- | --- |',
  ]
  for (const row of report.rows) {
    const evidence = row.evidence
      .map((entry) => `${entry.source} @ ${entry.revision}: ${entry.scope}`)
      .join('; ')
    const approval = row.approval
      ? ` Approval: ${row.approval.reference}: ${row.approval.reason}.`
      : ''
    const observed = row.observedResult ? ` Observed result: ${row.observedResult}.` : ''
    lines.push(
      `| ${cell(`${row.id}: ${row.title}`)} | ${row.status}${row.enforcement ? ` (${row.enforcement})` : ''} | ${cell(row.owner)} (${cell(row.ownerSource)})${row.remediationOwner ? ` / ${cell(row.remediationOwner)} (${cell(row.remediationSource)})` : ''} | ${cell(row.rationale + observed + approval + (evidence ? ' ' + evidence : ''))} |`
    )
  }
  return lines.join('\n') + '\n'
}

function main(argv) {
  if (argv.length === 1 && argv[0] === '--help') {
    process.stdout.write(
      'Usage: node scripts/release-acceptance/report.mjs --manifest <file> [--format json|markdown]\nExit 0: valid report (including blocked/incomplete). Exit 2: invalid input or unavailable registry.\n'
    )
    return
  }
  const options = { format: 'json' }
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i]
    requireValue(
      ['--manifest', '--format'].includes(flag) &&
        text(argv[i + 1]) &&
        !argv[i + 1].startsWith('--'),
      `unknown or incomplete option ${flag}`
    )
    requireValue(
      flag === '--format' ? !options.formatSeen : !options.manifest,
      `duplicate option ${flag}`
    )
    options[flag.slice(2)] = argv[i + 1]
    if (flag === '--format') options.formatSeen = true
  }
  requireValue(
    text(options.manifest) && ['json', 'markdown'].includes(options.format),
    '--manifest and a valid format are required'
  )
  const manifest = JSON.parse(readFileSync(options.manifest, 'utf8'))
  requireValue(SHA.test(manifest?.subjectRevision), 'subjectRevision must be a full commit SHA')
  const root = fileURLToPath(new URL('../../', import.meta.url))
  // No shell interpolation, network retrieval, or use of a possibly modified
  // working-tree registry: policy comes from the assessed commit itself.
  const registry = JSON.parse(
    execFileSync(
      'git',
      ['show', `${manifest.subjectRevision}:scripts/validation/validators.v1.json`],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    )
  )
  const report = buildAcceptanceReport(manifest, registry)
  process.stdout.write(options.format === 'json' ? renderJson(report) : renderMarkdown(report))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2))
  } catch (error) {
    process.stderr.write(`release-acceptance: ${error.message}\n`)
    process.exitCode = 2
  }
}
