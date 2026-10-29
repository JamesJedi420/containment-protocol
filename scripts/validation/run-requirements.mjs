#!/usr/bin/env node
/**
 * SPE-3348 — local/CI entrypoint for validation requirement orchestration.
 *
 * Usage:
 *   node scripts/validation/run-requirements.mjs [--base <ref>] [--files a,b] [--ci]
 *   node scripts/validation/run-requirements.mjs --resolve-only [--json]
 *   node scripts/validation/run-requirements.mjs --dry-run
 *   node scripts/validation/run-requirements.mjs --include id --exclude id
 */
import fs from 'node:fs'
import {
  detectMissingRequiredValidation,
  probeValidatorAvailability,
  readPackageScripts,
  readRequirementRegistry,
  resolveInvocation,
  resolveValidationRequirements,
  summarizeRequirementReport,
} from './requirement-model.mjs'
import { resolveBin, spawnSafe } from './spawn-safe.mjs'

function takeValue(argv, i, flag, inline) {
  if (inline !== undefined) return { value: inline, next: i }
  const value = argv[i + 1]
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`)
  }
  return { value, next: i + 1 }
}

function applyValuedFlag(opts, flag, value) {
  if (flag === '--base') {
    opts.base = value
    return
  }
  if (flag === '--files') {
    opts.files = value.split(',').map((s) => s.trim()).filter(Boolean)
    return
  }
  if (flag === '--include') {
    opts.include.push(value)
    return
  }
  if (flag === '--exclude') {
    opts.exclude.push(value)
    return
  }
  if (flag === '--exception') {
    const sep = value.indexOf('=')
    if (sep === -1) throw new Error(`--exception expects id=reason, got ${value}`)
    opts.exceptions.push({ validatorId: value.slice(0, sep), reason: value.slice(sep + 1) })
    return
  }
  throw new Error(`Unknown argument: ${flag}`)
}

function parseArgs(argv) {
  const opts = {
    base: null,
    files: null,
    ci: false,
    resolveOnly: false,
    dryRun: false,
    json: false,
    include: [],
    exclude: [],
    exceptions: [],
    all: false,
  }
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    const eq = a.indexOf('=')
    const flag = eq === -1 ? a : a.slice(0, eq)
    const inline = eq === -1 ? undefined : a.slice(eq + 1)

    if (flag === '--ci' && inline === undefined) {
      opts.ci = true
      i += 1
      continue
    }
    if (flag === '--resolve-only' && inline === undefined) {
      opts.resolveOnly = true
      i += 1
      continue
    }
    if (flag === '--dry-run' && inline === undefined) {
      opts.dryRun = true
      i += 1
      continue
    }
    if (flag === '--json' && inline === undefined) {
      opts.json = true
      i += 1
      continue
    }
    if (flag === '--all' && inline === undefined) {
      opts.all = true
      i += 1
      continue
    }
    if (flag === '--help' || flag === '-h') {
      opts.help = true
      i += 1
      continue
    }
    if (
      flag === '--base' ||
      flag === '--files' ||
      flag === '--include' ||
      flag === '--exclude' ||
      flag === '--exception'
    ) {
      const taken = takeValue(argv, i, flag, inline)
      applyValuedFlag(opts, flag, taken.value)
      i = taken.next + 1
      continue
    }
    throw new Error(`Unknown argument: ${a}`)
  }
  return opts
}

function parseNameOnly(stdout) {
  return stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

/** Include deletions (D) so delete-only PRs still activate validators. */
const DIFF_NAME_ONLY = ['diff', '--name-only', '--diff-filter=ACDMR']

function workingTreeChanges() {
  const tracked = spawnSafe('git', ['diff', '--name-only', '--diff-filter=ACDMR', 'HEAD'], {
    encoding: 'utf8',
  })
  const staged = spawnSafe('git', ['diff', '--name-only', '--diff-filter=ACDMR', '--cached'], {
    encoding: 'utf8',
  })
  const untracked = spawnSafe('git', ['ls-files', '--others', '--exclude-standard'], {
    encoding: 'utf8',
  })
  return [
    ...parseNameOnly(tracked.status === 0 ? tracked.stdout : ''),
    ...parseNameOnly(staged.status === 0 ? staged.stdout : ''),
    ...parseNameOnly(untracked.status === 0 ? untracked.stdout : ''),
  ]
}

function gitChangedFiles(base, { includeWorkingTree = true } = {}) {
  const ref = base ?? defaultBaseRef()
  const attempts = [
    [...DIFF_NAME_ONLY, `${ref}...HEAD`],
    [...DIFF_NAME_ONLY, `${ref}..HEAD`],
    [...DIFF_NAME_ONLY, ref],
  ]
  let committed = null
  for (const args of attempts) {
    const result = spawnSafe('git', args, { encoding: 'utf8' })
    if (result.status === 0) {
      committed = parseNameOnly(result.stdout)
      break
    }
  }
  if (committed === null) {
    throw new Error(`Unable to resolve changed files against base ${ref}`)
  }
  if (!includeWorkingTree) return committed
  return [...new Set([...committed, ...workingTreeChanges()])].sort((a, b) =>
    a.localeCompare(b, 'en'),
  )
}

function defaultBaseRef() {
  if (process.env.VALIDATION_BASE) return process.env.VALIDATION_BASE
  if (process.env.GITHUB_BASE_REF) return `origin/${process.env.GITHUB_BASE_REF}`
  if (process.env.GITHUB_EVENT_PATH && fs.existsSync(process.env.GITHUB_EVENT_PATH)) {
    try {
      const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
      const sha = event.pull_request?.base?.sha
      if (sha) return sha
    } catch {
      // fall through
    }
  }
  return 'origin/main'
}

function filterSelected(selected, { include, exclude }) {
  let out = selected
  if (include.length > 0) {
    const set = new Set(include)
    out = out.filter((s) => set.has(s.id))
  }
  if (exclude.length > 0) {
    const set = new Set(exclude)
    out = out.filter((s) => !set.has(s.id))
  }
  return out
}

function unavailableStatus(whenUnavailable) {
  if (whenUnavailable === 'skip') return 'skipped'
  return 'unavailable'
}

function npmCommand() {
  return process.platform === 'win32' ? resolveBin('npm.cmd') : resolveBin('npm')
}

function resolveRunCommand(invocation) {
  if (invocation.kind === 'npm') {
    return { finalCommand: npmCommand(), finalArgs: ['run', invocation.value] }
  }
  const parts = invocation.value.split(/\s+/)
  if (parts[0] === 'node') {
    return { finalCommand: process.execPath, finalArgs: parts.slice(1) }
  }
  return { finalCommand: parts[0], finalArgs: parts.slice(1) }
}

function runOne(selected, { ci, dryRun }) {
  if (selected.enforcement === 'skipped-exception') {
    return {
      id: selected.id,
      status: 'skipped',
      enforcement: selected.enforcement,
      whenUnavailable: selected.whenUnavailable,
      detail: selected.exceptionReason ?? 'exception',
    }
  }

  const scripts = readPackageScripts()
  const availability = probeValidatorAvailability(selected, scripts)
  if (availability === 'unavailable') {
    return {
      id: selected.id,
      status: unavailableStatus(selected.whenUnavailable),
      enforcement: selected.enforcement,
      whenUnavailable: selected.whenUnavailable,
      detail: `validator invocation unavailable (missing npm script ${selected.npmScript ?? 'n/a'} or command)`,
    }
  }

  const invocation = resolveInvocation(selected, { ci })
  if (dryRun) {
    return {
      id: selected.id,
      status: 'selected',
      enforcement: selected.enforcement,
      whenUnavailable: selected.whenUnavailable,
      detail: `dry-run ${invocation.kind}:${invocation.value}`,
    }
  }

  const { finalCommand, finalArgs } = resolveRunCommand(invocation)
  const isolateStdout = Boolean(process.env.VALIDATION_JSON_ISOLATE)
  const result = spawnSafe(finalCommand, finalArgs, {
    encoding: 'utf8',
    stdio: isolateStdout ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    maxBuffer: isolateStdout ? 64 * 1024 * 1024 : undefined,
  })
  if (isolateStdout) {
    if (result.stdout) process.stderr.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)
  }

  if (result.status === 0) {
    return {
      id: selected.id,
      status: 'passed',
      enforcement: selected.enforcement,
      whenUnavailable: selected.whenUnavailable,
      detail: `${invocation.kind}:${invocation.value}`,
    }
  }

  return {
    id: selected.id,
    status: 'failed',
    enforcement: selected.enforcement,
    whenUnavailable: selected.whenUnavailable,
    detail: `${invocation.kind}:${invocation.value} exit ${result.status ?? 'signal'}`,
    exitCode: result.status,
  }
}

function printHuman(report) {
  console.log(`SPE-3348 validation requirements (owner ${report.policyOwner})`)
  console.log(`files (${report.files.length}): ${report.files.join(', ') || '(none)'}`)
  console.log(`change classes: ${report.activeClasses.join(', ') || '(none)'}`)
  console.log(`required: ${report.requiredIds.join(', ') || '(none)'}`)
  console.log(`advisory: ${report.advisoryIds.join(', ') || '(none)'}`)
  if (report.skippedExceptionIds.length) {
    console.log(`exceptions: ${report.skippedExceptionIds.join(', ')}`)
  }
  for (const r of report.results) {
    console.log(`  [${r.status}] ${r.id} (${r.enforcement}) ${r.detail ?? ''}`)
  }
  if (report.missingRequired.length) {
    console.error('Missing required validation:')
    for (const m of report.missingRequired) {
      console.error(`  - ${m.id}: ${m.reason}`)
    }
  }
}

function printHelpAndExit() {
  console.log(`Usage: node scripts/validation/run-requirements.mjs [options]
  --base <ref>         Git base for changed-file detection (default: origin/main / PR base)
  --files a,b          Explicit changed-file list (skips git)
  --all                Select every registered validator
  --ci                 Use CI npm script variants when declared
  --resolve-only       Resolve selection only (no execution)
  --dry-run            Resolve and show invocations without running
  --json               Emit JSON report
  --include <id>       Restrict to validator id (repeatable)
  --exclude <id>       Omit validator id (repeatable)
  --exception id=why   Treat validator as skipped-exception for this run`)
  process.exit(0)
}

function buildResolution(registry, effectiveFiles, opts) {
  const resolved = resolveValidationRequirements(effectiveFiles, registry, {
    exceptions: opts.exceptions,
  })
  const selected = filterSelected(resolved.selected, opts)
  return {
    ...resolved,
    selected,
    requiredIds: selected.filter((s) => s.enforcement === 'required').map((s) => s.id),
    advisoryIds: selected.filter((s) => s.enforcement === 'advisory').map((s) => s.id),
    skippedExceptionIds: selected
      .filter((s) => s.enforcement === 'skipped-exception')
      .map((s) => s.id),
  }
}

function emitReport(report, opts, advisoryFailed) {
  if (opts.json) {
    console.log(JSON.stringify(report, null, 2))
    return
  }
  printHuman(report)
  if (advisoryFailed.length) {
    console.warn(
      `Advisory validator failure(s) (non-blocking): ${advisoryFailed.map((r) => r.id).join(', ')}`,
    )
  }
}

function main() {
  let opts
  try {
    opts = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exit(2)
  }

  if (opts.help) printHelpAndExit()
  if (opts.json) process.env.VALIDATION_JSON_ISOLATE = '1'

  const registry = readRequirementRegistry()
  const files = opts.all
    ? ['**']
    : (opts.files ??
      gitChangedFiles(opts.base, {
        includeWorkingTree: !opts.ci,
      }))
  const effectiveFiles = opts.all ? collectAllActivationFiles(registry) : files
  const resolution = buildResolution(registry, effectiveFiles, opts)

  if (opts.resolveOnly || opts.dryRun) {
    const results = resolution.selected.map((s) => runOne(s, { ci: opts.ci, dryRun: true }))
    const report = summarizeRequirementReport(resolution, results, [])
    emitReport(report, opts, [])
    if (opts.resolveOnly && opts.include.length === 1) {
      const selected = resolution.selected.some((s) => s.id === opts.include[0])
      if (!selected) process.exit(3)
    }
    process.exit(0)
  }

  const results = resolution.selected.map((s) => runOne(s, { ci: opts.ci, dryRun: false }))
  const missing = detectMissingRequiredValidation(resolution, results)
  const report = summarizeRequirementReport(resolution, results, missing)
  const requiredFailed = results.some(
    (r) => r.enforcement === 'required' && (r.status === 'failed' || r.status === 'unavailable'),
  )
  const advisoryFailed = results.filter(
    (r) => r.enforcement === 'advisory' && r.status === 'failed',
  )
  report.ok = missing.length === 0 && !requiredFailed
  report.advisoryFailures = advisoryFailed.map((r) => r.id)
  emitReport(report, opts, advisoryFailed)
  process.exit(report.ok ? 0 : 1)
}

function collapseGlobExample(glob) {
  return glob.includes('*')
    ? glob.replaceAll('**', 'all').replaceAll('*', 'x')
    : glob
}

/** Expand `--all` into one representative path per change class / glob so every validator activates. */
function collectAllActivationFiles(registry) {
  const files = new Set()
  for (const def of Object.values(registry.changeClasses)) {
    for (const g of def.pathGlobs ?? []) files.add(collapseGlobExample(g))
  }
  for (const v of registry.validators) {
    for (const g of v.activation?.pathGlobs ?? []) files.add(collapseGlobExample(g))
  }
  files.add('src/domain/example.ts')
  files.add('e2e/example.spec.ts')
  files.add('playwright.config.ts')
  files.add('docs/governance/authority-contract.v1.json')
  files.add('scripts/governance/authority-contract.mjs')
  files.add('planning/backlog.md')
  files.add('docs/design-audits-index.md')
  files.add('architecture/external-design-theme-contracts.md')
  files.add('academy/content/example.json')
  files.add('package.json')
  return [...files]
}

main()
