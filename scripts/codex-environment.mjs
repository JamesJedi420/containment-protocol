import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))

export const ENVIRONMENT_ACTIONS = Object.freeze({
  setup: Object.freeze(['ci', '--ignore-scripts']),
  dev: Object.freeze(['run', 'dev']),
  test: Object.freeze(['run', 'test:run:ci']),
  validate: Object.freeze(['run', 'verify:requirements', '--', '--base', 'origin/main']),
  preflight: Object.freeze(['run', 'session:preflight', '--', '--collect-local']),
})

export function findRuntimeNpm(
  nodeExecutable,
  platform = process.platform,
  fileExists = existsSync
) {
  const paths = platform === 'win32' ? path.win32 : path.posix
  const bin = paths.dirname(nodeExecutable)
  const candidates = [paths.join(bin, 'node_modules', 'npm', 'bin', 'npm-cli.js')]
  if (platform !== 'win32') {
    candidates.push(
      paths.resolve(bin, '../lib/node_modules/npm/bin/npm-cli.js'),
      paths.resolve(bin, '../share/nodejs/npm/bin/npm-cli.js')
    )
  }
  return candidates.find((candidate) => fileExists(candidate)) ?? null
}

export function runEnvironmentAction(
  argv,
  {
    nodeVersion = process.versions.node,
    nodeExecutable = process.execPath,
    platform = process.platform,
    env = process.env,
    cwd = repositoryRoot,
    fileExists = existsSync,
    spawn = spawnSync,
    writeError = (message) => console.error(message),
  } = {}
) {
  if (argv.length !== 1 || !Object.hasOwn(ENVIRONMENT_ACTIONS, argv[0])) {
    writeError('Usage: node scripts/codex-environment.mjs <setup|dev|test|validate|preflight>')
    return 2
  }
  if (!/^22\./.test(nodeVersion)) {
    writeError('Codex environment actions require Node.js 22. Select Node 22 in your shell first.')
    return 1
  }
  const npmCli = findRuntimeNpm(nodeExecutable, platform, fileExists)
  if (!npmCli) {
    writeError(
      'npm was not found alongside this Node runtime. Use a Node 22 installation with npm.'
    )
    return 1
  }
  const paths = platform === 'win32' ? path.win32 : path.posix
  const pathKeys = Object.keys(env).filter((key) => key.toUpperCase() === 'PATH')
  const pathKey =
    platform === 'win32'
      ? (pathKeys.find((key) => key === 'PATH') ?? pathKeys[0] ?? 'PATH')
      : 'PATH'
  const childEnv = { ...env }
  if (platform === 'win32') {
    for (const key of pathKeys) delete childEnv[key]
  }
  childEnv[pathKey] = [paths.dirname(nodeExecutable), env[pathKey]]
    .filter(Boolean)
    .join(paths.delimiter)
  const result = spawn(nodeExecutable, [npmCli, ...ENVIRONMENT_ACTIONS[argv[0]]], {
    cwd,
    env: childEnv,
    shell: false,
    stdio: 'inherit',
  })
  if (result.error || result.signal || !Number.isInteger(result.status)) {
    writeError(
      `Codex environment action failed: ${result.error?.code ?? result.signal ?? 'no exit status'}`
    )
    return 1
  }
  return result.status
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = runEnvironmentAction(process.argv.slice(2))
}
