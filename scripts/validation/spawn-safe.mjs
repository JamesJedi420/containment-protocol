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
