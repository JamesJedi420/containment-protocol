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
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import {
  detectMissingRequiredValidation,
  probeValidatorAvailability,
  readPackageScripts,
  readRequirementRegistry,
  resolveInvocation,
  resolveValidationRequirements,
  summarizeRequirementReport,
} from './requirement-model.mjs'

function takeValue(argv, i, flag, inline) {
  if (inline !== undefined) return { value: inline, next: i }
  const value = argv[i + 1]
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`)
  }
  return { value, next: i + 1 }
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
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const eq = a.indexOf('=')
    const flag = eq === -1 ? a : a.slice(0, eq)
    const inline = eq === -1 ? undefined : a.slice(eq + 1)

    if (flag === '--ci' && inline === undefined) opts.ci = true
    else if (flag === '--resolve-only' && inline === undefined) opts.resolveOnly = true
    else if (flag === '--dry-run' && inline === undefined) opts.dryRun = true
    else if (flag === '--json' && inline === undefined) opts.json = true
    else if (flag === '--all' && inline === undefined) opts.all = true
    else if (flag === '--base') {
      const taken = takeValue(argv, i, '--base', inline)
      opts.base = taken.value
      i = taken.next
    } else if (flag === '--files') {
      const taken = takeValue(argv, i, '--files', inline)
      opts.files = taken.value.split(',').map((s) => s.trim()).filter(Boolean)
      i = taken.next
    } else if (flag === '--include') {
      const taken = takeValue(argv, i, '--include', inline)
      opts.include.push(taken.value)
      i = taken.next
    } else if (flag === '--exclude') {
      const taken = takeValue(argv, i, '--exclude', inline)
      opts.exclude.push(taken.value)
      i = taken.next
    } else if (flag === '--exception') {
      const taken = takeValue(argv, i, '--exception', inline)
      const raw = taken.value
      const sep = raw.indexOf('=')
      if (sep === -1) throw new Error(`--exception expects id=reason, got ${raw}`)
      opts.exceptions.push({ validatorId: raw.slice(0, sep), reason: raw.slice(sep + 1) })
      i = taken.next
    } else if (flag === '--help' || flag === '-h') {
      opts.help = true
    } else {
      throw new Error(`Unknown argument: ${a}`)
    }
  }
  return opts
}

function gitChangedFiles(base) {
  const ref = base ?? defaultBaseRef()
  const attempts = [
    ['diff', '--name-only', '--diff-filter=ACMR', `${ref}...HEAD`],
    ['diff', '--name-only', '--diff-filter=ACMR', `${ref}..HEAD`],
    ['diff', '--name-only', '--diff-filter=ACMR', ref],
  ]
  for (const args of attempts) {
    const result = spawnSync('git', args, { encoding: 'utf8' })
    if (result.status === 0) {
      return result.stdout
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
    }
  }
  throw new Error(`Unable to resolve changed files against base ${ref}`)
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
    const status =
      selected.whenUnavailable === 'skip'
        ? 'skipped'
        : selected.whenUnavailable === 'report-unavailable'
          ? 'unavailable'
          : 'unavailable'
    return {
      id: selected.id,
      status,
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

  const command =
    invocation.kind === 'npm'
      ? process.platform === 'win32'
        ? 'npm.cmd'
        : 'npm'
      : process.execPath
  const args =
    invocation.kind === 'npm'
      ? ['run', invocation.value]
      : [path.resolve(process.cwd(), invocation.value.replace(/^node\s+/, ''))]

  // For bare `node script.mjs` stored as command string:
  let finalCommand = command
  let finalArgs = args
  if (invocation.kind === 'command') {
    const parts = invocation.value.split(/\s+/)
    if (parts[0] === 'node') {
      finalCommand = process.execPath
      finalArgs = parts.slice(1)
    } else {
      finalCommand = parts[0]
      finalArgs = parts.slice(1)
    }
  }

  const result = spawnSync(finalCommand, finalArgs, {
    encoding: 'utf8',
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32' && invocation.kind === 'npm',
  })

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

function main() {
  let opts
  try {
    opts = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exit(2)
  }

  if (opts.help) {
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

  const registry = readRequirementRegistry()
  const files = opts.all
    ? ['**']
    : (opts.files ?? gitChangedFiles(opts.base))

  // `--all` uses a synthetic match-all path handled below
  const effectiveFiles = opts.all
    ? collectAllActivationFiles(registry)
    : files

  const resolved = resolveValidationRequirements(effectiveFiles, registry, {
    exceptions: opts.exceptions,
  })
  const selected = filterSelected(resolved.selected, opts)
  const resolution = {
    ...resolved,
    selected,
    requiredIds: selected.filter((s) => s.enforcement === 'required').map((s) => s.id),
    advisoryIds: selected.filter((s) => s.enforcement === 'advisory').map((s) => s.id),
    skippedExceptionIds: selected
      .filter((s) => s.enforcement === 'skipped-exception')
      .map((s) => s.id),
  }

  if (opts.resolveOnly || opts.dryRun) {
    const results = resolution.selected.map((s) =>
      runOne(s, { ci: opts.ci, dryRun: true }),
    )
    const missing = opts.resolveOnly
      ? []
      : detectMissingRequiredValidation(resolution, results)
    const report = summarizeRequirementReport(resolution, results, missing)
    if (opts.json) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      printHuman(report)
    }
    // resolve-only / dry-run: exit 0 unless JSON consumers need selection signal
    if (opts.resolveOnly && opts.include.length === 1) {
      const hit = resolution.selected.find((s) => s.id === opts.include[0])
      if (!hit) process.exit(3) // not selected
    }
    process.exit(0)
  }

  const results = []
  for (const selected of resolution.selected) {
    const result = runOne(selected, { ci: opts.ci, dryRun: false })
    results.push(result)
    // Advisory failures do not fail the process by themselves; required do.
  }

  const missing = detectMissingRequiredValidation(resolution, results)
  const report = summarizeRequirementReport(resolution, results, missing)

  // Soft-fail advisory: mark ok false only for required failures / missing
  const requiredFailed = results.some(
    (r) => r.enforcement === 'required' && (r.status === 'failed' || r.status === 'unavailable'),
  )
  const advisoryFailed = results.filter(
    (r) => r.enforcement === 'advisory' && r.status === 'failed',
  )
  report.ok = missing.length === 0 && !requiredFailed
  report.advisoryFailures = advisoryFailed.map((r) => r.id)

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printHuman(report)
    if (advisoryFailed.length) {
      console.warn(
        `Advisory validator failure(s) (non-blocking): ${advisoryFailed.map((r) => r.id).join(', ')}`,
      )
    }
  }

  process.exit(report.ok ? 0 : 1)
}

/** Expand `--all` into one representative path per change class / glob so every validator activates. */
function collectAllActivationFiles(registry) {
  const files = new Set()
  for (const def of Object.values(registry.changeClasses)) {
    for (const g of def.pathGlobs ?? []) {
      files.add(g.includes('*') ? g.replace(/\*\*/g, 'all').replace(/\*/g, 'x') : g)
    }
  }
  for (const v of registry.validators) {
    for (const g of v.activation?.pathGlobs ?? []) {
      files.add(g.includes('*') ? g.replace(/\*\*/g, 'all').replace(/\*/g, 'x') : g)
    }
  }
  // Ensure academy / e2e / governance representatives exist even if globs collapse oddly
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
