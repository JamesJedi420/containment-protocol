/**
 * SPE-3348 — repository validation requirement model.
 *
 * Resolves which registered validators are required/advisory for a fixed change
 * set. Does not redefine what each validator checks.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DEFAULT_REGISTRY_PATH = path.join(__dirname, 'validators.v1.json')

const WHEN_UNAVAILABLE = new Set(['fail', 'report-unavailable', 'skip'])
const ENFORCEMENT = new Set(['required', 'advisory'])

/**
 * Minimal deterministic glob matcher (**, *, ?, and trailing path segments).
 * Paths and patterns use forward slashes. Matching is case-sensitive.
 */
export function matchGlob(filePath, pattern) {
  const file = normalizeRepoPath(filePath)
  const pat = normalizeRepoPath(pattern)
  if (pat === '**') return true
  const regex = globToRegExp(pat)
  return regex.test(file)
}

function normalizeRepoPath(p) {
  return String(p).replace(/\\/g, '/').replace(/^\.\//, '')
}

function globToRegExp(pattern) {
  let out = '^'
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') {
          out += '(?:.+/)?'
          i += 2
        } else {
          out += '.*'
          i += 1
        }
      } else {
        out += '[^/]*'
      }
    } else if (c === '?') {
      out += '[^/]'
    } else if ('+.^${}()|[]\\'.includes(c)) {
      out += `\\${c}`
    } else {
      out += c
    }
  }
  out += '$'
  return new RegExp(out)
}

export function anyGlobMatch(filePath, globs) {
  return (globs ?? []).some((g) => matchGlob(filePath, g))
}

export function readRequirementRegistry(registryPath = DEFAULT_REGISTRY_PATH) {
  const raw = JSON.parse(fs.readFileSync(registryPath, 'utf8'))
  validateRequirementRegistry(raw)
  return raw
}

export function validateRequirementRegistry(registry) {
  if (!registry || typeof registry !== 'object') {
    throw new Error('validation-requirements: registry must be an object')
  }
  if (registry.schemaVersion !== 1) {
    throw new Error(`validation-requirements: unsupported schemaVersion ${registry.schemaVersion}`)
  }
  if (!registry.policyOwner || typeof registry.policyOwner !== 'string') {
    throw new Error('validation-requirements: policyOwner is required')
  }
  if (!registry.changeClasses || typeof registry.changeClasses !== 'object') {
    throw new Error('validation-requirements: changeClasses is required')
  }
  if (!Array.isArray(registry.validators) || registry.validators.length === 0) {
    throw new Error('validation-requirements: validators must be a non-empty array')
  }

  const ids = new Set()
  for (const v of registry.validators) {
    if (!v?.id || typeof v.id !== 'string') {
      throw new Error('validation-requirements: each validator needs a string id')
    }
    if (ids.has(v.id)) {
      throw new Error(`validation-requirements: duplicate validator id ${v.id}`)
    }
    ids.add(v.id)
    if (!v.ownerIssue || typeof v.ownerIssue !== 'string') {
      throw new Error(`validation-requirements: ${v.id} needs ownerIssue`)
    }
    if (!ENFORCEMENT.has(v.enforcement)) {
      throw new Error(`validation-requirements: ${v.id} invalid enforcement`)
    }
    if (!WHEN_UNAVAILABLE.has(v.whenUnavailable)) {
      throw new Error(`validation-requirements: ${v.id} invalid whenUnavailable`)
    }
    if (!v.npmScript && !v.command) {
      throw new Error(`validation-requirements: ${v.id} needs npmScript or command`)
    }
    if (!v.activation || typeof v.activation !== 'object') {
      throw new Error(`validation-requirements: ${v.id} needs activation`)
    }
    const classes = v.activation.changeClasses ?? []
    for (const c of classes) {
      if (!registry.changeClasses[c]) {
        throw new Error(`validation-requirements: ${v.id} unknown changeClass ${c}`)
      }
    }
  }
  return true
}

export function classifyChangedFiles(files, registry) {
  const sortedFiles = [...new Set(files.map(normalizeRepoPath))].sort((a, b) =>
    a.localeCompare(b, 'en'),
  )
  const byClass = Object.create(null)
  for (const name of Object.keys(registry.changeClasses).sort((a, b) => a.localeCompare(b, 'en'))) {
    byClass[name] = []
  }
  const fileClasses = Object.create(null)

  for (const file of sortedFiles) {
    const classes = []
    for (const [name, def] of Object.entries(registry.changeClasses)) {
      if (anyGlobMatch(file, def.pathGlobs ?? [])) {
        classes.push(name)
        byClass[name].push(file)
      }
    }
    classes.sort((a, b) => a.localeCompare(b, 'en'))
    fileClasses[file] = classes
  }

  const activeClasses = Object.keys(byClass)
    .filter((name) => byClass[name].length > 0)
    .sort((a, b) => a.localeCompare(b, 'en'))

  return { files: sortedFiles, byClass, fileClasses, activeClasses }
}

function activationMatches(validator, classification) {
  const act = validator.activation
  const classHit = (act.changeClasses ?? []).some((c) =>
    classification.activeClasses.includes(c),
  )
  const pathHit = classification.files.some((f) => anyGlobMatch(f, act.pathGlobs ?? []))
  return classHit || pathHit
}

function requiredWhenMatches(validator, classification) {
  const rw = validator.requiredWhen
  if (!rw) return false
  const classHit = (rw.changeClasses ?? []).some((c) => classification.activeClasses.includes(c))
  const pathHit = classification.files.some((f) => anyGlobMatch(f, rw.pathGlobs ?? []))
  return classHit || pathHit
}

/**
 * Deterministically resolve selected validators for a fixed change set.
 *
 * @param {string[]} changedFiles
 * @param {object} registry
 * @param {{ exceptions?: Array<{ validatorId: string, reason: string }> }} [options]
 */
export function resolveValidationRequirements(changedFiles, registry, options = {}) {
  const classification = classifyChangedFiles(changedFiles, registry)
  const exceptionIds = new Set((options.exceptions ?? []).map((e) => e.validatorId))
  const exceptionReasons = Object.create(null)
  for (const e of options.exceptions ?? []) {
    exceptionReasons[e.validatorId] = e.reason
  }

  const selected = []
  for (const validator of registry.validators) {
    if (!activationMatches(validator, classification)) continue

    let enforcement = validator.enforcement
    if (requiredWhenMatches(validator, classification)) {
      enforcement = 'required'
    }

    const excepted = exceptionIds.has(validator.id)
    selected.push({
      id: validator.id,
      ownerIssue: validator.ownerIssue,
      enforcement: excepted ? 'skipped-exception' : enforcement,
      exceptionReason: excepted ? exceptionReasons[validator.id] : undefined,
      npmScript: validator.npmScript,
      ciNpmScript: validator.ciNpmScript,
      command: validator.command,
      whenUnavailable: validator.whenUnavailable,
      browserInstallHint: validator.browserInstallHint,
      ownerNote: validator.ownerNote,
    })
  }

  selected.sort((a, b) => a.id.localeCompare(b.id, 'en'))

  return {
    schemaVersion: registry.schemaVersion,
    policyOwner: registry.policyOwner,
    classification,
    selected,
    requiredIds: selected.filter((s) => s.enforcement === 'required').map((s) => s.id),
    advisoryIds: selected.filter((s) => s.enforcement === 'advisory').map((s) => s.id),
    skippedExceptionIds: selected
      .filter((s) => s.enforcement === 'skipped-exception')
      .map((s) => s.id),
  }
}

export function readPackageScripts(root = process.cwd()) {
  const pkgPath = path.join(root, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  return pkg.scripts ?? {}
}

/**
 * Probe whether a selected validator can be invoked.
 * @returns {'available'|'unavailable'}
 */
export function probeValidatorAvailability(selected, packageScripts) {
  if (selected.command) {
    const scriptPath = selected.command.replace(/^node\s+/, '').trim()
    if (scriptPath.endsWith('.mjs') || scriptPath.endsWith('.js')) {
      const abs = path.join(process.cwd(), scriptPath)
      return fs.existsSync(abs) ? 'available' : 'unavailable'
    }
    return 'available'
  }
  if (selected.npmScript) {
    return packageScripts[selected.npmScript] ? 'available' : 'unavailable'
  }
  return 'unavailable'
}

export function resolveInvocation(selected, { ci = false } = {}) {
  if (selected.command) {
    return { kind: 'command', value: selected.command }
  }
  const script =
    ci && selected.ciNpmScript && readPackageScripts()[selected.ciNpmScript]
      ? selected.ciNpmScript
      : selected.npmScript
  return { kind: 'npm', value: script }
}

/**
 * Detect missing required validation when a required validator was selected
 * but not executed (or is unavailable under fail policy).
 */
export function detectMissingRequiredValidation(resolution, results) {
  const missing = []
  for (const id of resolution.requiredIds) {
    const result = results.find((r) => r.id === id)
    if (!result) {
      missing.push({ id, reason: 'required-validator-not-executed' })
      continue
    }
    if (result.status === 'unavailable' && result.whenUnavailable === 'fail') {
      missing.push({ id, reason: 'required-validator-unavailable' })
    }
    if (result.status === 'skipped' && result.whenUnavailable === 'fail') {
      missing.push({ id, reason: 'required-validator-skipped' })
    }
  }
  return missing
}

export function summarizeRequirementReport(resolution, results, missing) {
  return {
    policyOwner: resolution.policyOwner,
    files: resolution.classification.files,
    activeClasses: resolution.classification.activeClasses,
    requiredIds: resolution.requiredIds,
    advisoryIds: resolution.advisoryIds,
    skippedExceptionIds: resolution.skippedExceptionIds,
    results,
    missingRequired: missing,
    ok: missing.length === 0 && results.every((r) => r.status !== 'failed'),
  }
}
