#!/usr/bin/env node
/**
 * SPE-3348 — emit GitHub Actions outputs for Playwright selection.
 * stdout lines: selected=true|false, enforcement=required|advisory|none
 *
 * Fail-closed: if the change set cannot be resolved from git, exit non-zero
 * so CI does not treat a broken resolve as "Playwright not selected".
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import {
  readRequirementRegistry,
  resolveValidationRequirements,
} from './requirement-model.mjs'

function parseNameOnly(stdout) {
  return stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

function changedFiles() {
  if (process.env.VALIDATION_FILES) {
    return process.env.VALIDATION_FILES.split(',').map((s) => s.trim()).filter(Boolean)
  }
  let base = process.env.VALIDATION_BASE
  if (!base && process.env.GITHUB_EVENT_PATH && fs.existsSync(process.env.GITHUB_EVENT_PATH)) {
    try {
      const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
      base = event.pull_request?.base?.sha
    } catch {
      // ignore
    }
  }
  if (base === '0000000000000000000000000000000000000000') {
    base = undefined
  }
  base = base || (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'origin/main')

  const attempts = [
    ['diff', '--name-only', '--diff-filter=ACDMR', `${base}...HEAD`],
    ['diff', '--name-only', '--diff-filter=ACDMR', `${base}..HEAD`],
    ['diff', '--name-only', '--diff-filter=ACDMR', 'HEAD~1'],
  ]
  for (const args of attempts) {
    const result = spawnSync('git', args, { encoding: 'utf8' })
    if (result.status === 0) {
      return parseNameOnly(result.stdout)
    }
  }
  console.error(
    `emit-playwright-gate: unable to resolve changed files against base ${base}`,
  )
  process.exit(1)
}

const registry = readRequirementRegistry()
const resolution = resolveValidationRequirements(changedFiles(), registry)
const selected = resolution.selected.find((s) => s.id === 'playwright-e2e')
if (!selected) {
  console.log('selected=false')
  console.log('enforcement=none')
  process.exit(0)
}
console.log('selected=true')
console.log(`enforcement=${selected.enforcement}`)
