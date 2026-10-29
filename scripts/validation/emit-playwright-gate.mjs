#!/usr/bin/env node
/**
 * SPE-3348 — emit GitHub Actions outputs for Playwright selection.
 * stdout lines: selected=true|false, enforcement=required|advisory|none
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import {
  readRequirementRegistry,
  resolveValidationRequirements,
} from './requirement-model.mjs'

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
  base = base || (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'origin/main')
  const result = spawnSync('git', ['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`], {
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    const fallback = spawnSync('git', ['diff', '--name-only', '--diff-filter=ACMR', 'HEAD~1'], {
      encoding: 'utf8',
    })
    return (fallback.stdout || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
  }
  return result.stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
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
