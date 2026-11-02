import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { spawnSafe } from './validation/spawn-safe.mjs'
import { compareCensuses, parseDiagnostics, sha256, summarize } from './typecheck-census.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
if (args.length !== 0 && (args.length !== 2 || args[0] !== '--output')) {
  throw new Error('Usage: node scripts/report-typecheck.mjs [--output directory]')
}
const output = path.resolve(root, args[1] ?? '.tmp/typecheck-census')
const git = (...gitArgs) => {
  const result = spawnSafe('git', gitArgs, { cwd: root, encoding: 'utf8' })
  if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr)
  return result.stdout.trim()
}
const revision = git('rev-parse', 'HEAD')
const status = git('status', '--porcelain', '--untracked-files=all')
const rootConfig = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile)
if (rootConfig.error)
  throw new Error(ts.flattenDiagnosticMessageText(rootConfig.error.messageText, '\n'))
const projects = new Map()
const inputFiles = new Set(['tsconfig.json', 'package-lock.json'])
for (const reference of rootConfig.config.references) {
  const configPath = path.resolve(root, reference.path)
  inputFiles.add(path.relative(root, configPath).replaceAll('\\', '/'))
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configPath,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
      },
    }
  )
  if (!parsed || parsed.errors.length) throw new Error(`Invalid configuration: ${reference.path}`)
  for (const file of parsed.fileNames) {
    const relative = path.relative(root, file).replaceAll('\\', '/')
    if (projects.has(relative)) throw new Error(`Ambiguous project ownership: ${relative}`)
    projects.set(relative, path.relative(root, configPath).replaceAll('\\', '/'))
    inputFiles.add(relative)
  }
}
const inputDigest = () =>
  sha256(
    JSON.stringify(
      [...inputFiles].sort().map((file) => [file, sha256(fs.readFileSync(path.join(root, file)))])
    )
  )
const compilerInputHash = inputDigest()
fs.mkdirSync(output, { recursive: true })
const command = ['node_modules/typescript/bin/tsc', '-b', '--pretty', 'false', '--force']
const runs = []
for (let i = 1; i <= 2; i++) {
  const result = spawnSafe(process.execPath, command, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    timeout: 600_000,
  })
  const raw = result.stdout ?? ''
  fs.writeFileSync(path.join(output, `run-${i}.txt`), raw + (result.stderr ?? ''))
  if (
    result.error ||
    result.signal ||
    result.stderr?.trim() ||
    ![0, 1, 2].includes(result.status)
  ) {
    throw new Error(
      `Compiler invocation failed: ${result.error?.message ?? result.stderr ?? result.signal}`
    )
  }
  const diagnostics = parseDiagnostics(raw, (file) => projects.get(file))
  if ((result.status === 0) !== (diagnostics.length === 0)) {
    throw new Error('Compiler status and diagnostic count disagree')
  }
  runs.push({ exitCode: result.status, rawHash: sha256(raw), diagnostics })
  console.log(`Run ${i}: ${diagnostics.length} diagnostic occurrences, exit ${result.status}`)
}
if (
  git('rev-parse', 'HEAD') !== revision ||
  git('status', '--porcelain', '--untracked-files=all') !== status ||
  inputDigest() !== compilerInputHash
) {
  throw new Error(
    'Checkout changed during capture; rerun on a stable checkout (use an ignored output directory)'
  )
}
const identical =
  runs[0].exitCode === runs[1].exitCode &&
  JSON.stringify(runs[0].diagnostics) === JSON.stringify(runs[1].diagnostics)
const report = {
  schemaVersion: 1,
  revision,
  compilerInputHash,
  workingTreeStatus: status,
  nodeVersion: process.version,
  typescriptVersion: ts.version,
  platform: process.platform,
  packageLockHash: sha256(fs.readFileSync(path.join(root, 'package-lock.json'))),
  command: ['node', ...command],
  runs: runs.map(({ exitCode, rawHash }) => ({ exitCode, rawHash })),
  reproducible: identical,
  identityDelta: compareCensuses(runs[0].diagnostics, runs[1].diagnostics),
  summary: summarize(runs[0].diagnostics),
  diagnostics: runs[0].diagnostics,
}
fs.writeFileSync(path.join(output, 'census.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report.summary, null, 2))
if (!identical) throw new Error('Forced compiler runs differ; census is not reproducible')
process.exitCode = runs[0].exitCode
