#!/usr/bin/env node
/** SPE-3761 — native lockfile advisory audit; no fixes or scanner substitutions. */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describeSpawnError, resolveBin, resolveNpmLaunch, spawnSafe } from './spawn-safe.mjs'

export const AUDIT_ARGS = [
  'audit',
  '--package-lock-only',
  '--include=prod',
  '--include=dev',
  '--include=optional',
  '--include=peer',
  '--audit-level=moderate',
  '--offline=false',
  '--prefer-offline=false',
  '--prefer-online=true',
  '--ignore-scripts',
  '--json',
]
const LEVELS = ['info', 'low', 'moderate', 'high', 'critical']

export function evaluateAuditResult(result) {
  if (result.error || result.signal || !Number.isInteger(result.status)) {
    return {
      ok: false,
      message:
        describeSpawnError(result.error) ??
        `audit terminated: ${result.signal ?? 'no exit status'}`,
    }
  }
  if (result.status !== 0) return { ok: false, message: `npm audit exited ${result.status}` }
  let report
  try {
    report = JSON.parse(result.stdout)
  } catch {
    return { ok: false, message: 'npm audit did not return usable JSON' }
  }
  const counts = report?.metadata?.vulnerabilities
  if (
    report?.error ||
    report?.auditReportVersion !== 2 ||
    !report.vulnerabilities ||
    typeof report.vulnerabilities !== 'object' ||
    Array.isArray(report.vulnerabilities) ||
    !counts ||
    ![...LEVELS, 'total'].every((key) => Number.isSafeInteger(counts[key]) && counts[key] >= 0) ||
    counts.total !== LEVELS.reduce((sum, key) => sum + counts[key], 0)
  ) {
    return { ok: false, message: 'npm audit returned an error or malformed vulnerability counts' }
  }
  if (counts.moderate + counts.high + counts.critical > 0) {
    return { ok: false, message: 'npm audit reported moderate-or-higher vulnerabilities' }
  }
  return {
    ok: true,
    message: `Dependency audit passed: ${counts.total} findings, none moderate or higher.`,
  }
}

export function runDependencyAudit({ cwd = process.cwd(), spawn = spawnSafe, launch } = {}) {
  const npm =
    launch ??
    resolveNpmLaunch({
      platform: process.platform,
      npmExecPath: process.env.npm_execpath,
      nodeExecPath: process.execPath,
      fallbackCommand: resolveBin('npm'),
    })
  if (!npm.ok) return { ok: false, message: npm.reason }
  const child = spawn(npm.command, [...npm.args, ...AUDIT_ARGS], {
    cwd,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 16 * 1024 * 1024,
  })
  const result = evaluateAuditResult(child)
  return { ...result, output: result.ok ? null : child.stdout || child.stderr }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = runDependencyAudit()
    if (!result.ok) {
      if (result.output) console.error(result.output)
      throw new Error(result.message)
    }
    console.log(result.message)
  } catch (error) {
    console.error(`dependency-audit: ${error.message}`)
    process.exitCode = 1
  }
}
