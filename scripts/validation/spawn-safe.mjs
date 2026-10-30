/**
 * SPE-3348 — spawn helpers with a fixed PATH (Sonar javascript:S4036).
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const PATH_SEP = process.platform === 'win32' ? ';' : ':'

function fixedPathDirs() {
  if (process.platform === 'win32') {
    const root = process.env.SystemRoot || 'C:\\Windows'
    return [
      path.join(root, 'System32'),
      path.join(root, 'System32', 'Wbem'),
      path.join(root, 'System32', 'WindowsPowerShell', 'v1.0'),
      process.env.ProgramFiles
        ? path.join(process.env.ProgramFiles, 'Git', 'cmd')
        : null,
      process.env.ProgramFiles
        ? path.join(process.env.ProgramFiles, 'nodejs')
        : null,
      process.env.LOCALAPPDATA
        ? path.join(process.env.LOCALAPPDATA, 'Programs', 'Git', 'cmd')
        : null,
      process.env.APPDATA ? path.join(process.env.APPDATA, 'npm') : null,
    ].filter(Boolean)
  }
  return ['/usr/bin', '/bin', '/usr/local/bin']
}

function sanitizedEnv(extra = {}) {
  return {
    ...process.env,
    ...extra,
    PATH: fixedPathDirs().join(PATH_SEP),
  }
}

const resolvedBins = new Map()

export function resolveBin(name) {
  if (resolvedBins.has(name)) return resolvedBins.get(name)
  const candidates =
    process.platform === 'win32'
      ? fixedPathDirs().flatMap((dir) => [
          path.join(dir, `${name}.exe`),
          path.join(dir, `${name}.cmd`),
          path.join(dir, name),
        ])
      : fixedPathDirs().map((dir) => path.join(dir, name))
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        resolvedBins.set(name, candidate)
        return candidate
      }
    } catch {
      // ignore unreadable candidate
    }
  }
  resolvedBins.set(name, name)
  return name
}

const NPM_CLI_RELATIVE = ['node_modules', 'npm', 'bin', 'npm-cli.js']
const NODE_SCRIPT_RE = /\.(?:c|m)?js$/i

/**
 * Resolve an npm launch that is safe to spawn with `shell: false`.
 *
 * On win32 npm is a `.cmd` shim, which CreateProcess cannot execute; Node
 * returns EINVAL before npm runs. Run npm's JS entrypoint through the current
 * node binary instead. Platform, paths, and fs are injected so the Windows
 * branch is testable on Linux CI, where it never executes naturally.
 */
export function resolveNpmLaunch({
  platform,
  npmExecPath,
  nodeExecPath,
  fallbackCommand = 'npm',
  fileExists = fs.existsSync,
} = {}) {
  if (platform !== 'win32') {
    return { ok: true, command: fallbackCommand, args: [] }
  }
  if (!nodeExecPath) {
    return { ok: false, reason: 'node executable path unavailable' }
  }
  const candidates = []
  if (npmExecPath && NODE_SCRIPT_RE.test(npmExecPath)) {
    candidates.push(npmExecPath)
  }
  candidates.push(
    path.win32.join(path.win32.dirname(nodeExecPath), ...NPM_CLI_RELATIVE),
  )
  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      return { ok: true, command: nodeExecPath, args: [candidate] }
    }
  }
  return {
    ok: false,
    reason:
      'npm CLI entrypoint not found on win32 (set npm_execpath or install npm beside node)',
  }
}

/**
 * Describe a spawnSync failure so it is never reported as a validator exit code.
 */
export function describeSpawnError(error) {
  if (!error) return null
  const code = error.code ?? error.errno
  if (code !== undefined && code !== null && code !== '') return `spawn ${code}`
  return `spawn failed: ${error.message ?? 'unknown error'}`
}

/**
 * Spawn with absolute (or resolved) executable and a fixed PATH.
 */
export function spawnSafe(command, args, options = {}) {
  const absolute =
    path.isAbsolute(command) || command.includes('/') || command.includes('\\')
      ? command
      : resolveBin(command)
  return spawnSync(absolute, args, {
    ...options,
    env: sanitizedEnv(options.env),
    shell: false,
  })
}
