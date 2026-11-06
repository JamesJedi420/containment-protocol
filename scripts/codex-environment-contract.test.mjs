import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { readCopilotProfile, readLocalEnvironment } from './codex-environment-contract.mjs'

const environment = readFileSync(
  new URL('../.codex/environments/environment.toml', import.meta.url),
  'utf8'
)

test('the physical app environment wires setup and four Windows actions to the adapter', () => {
  const result = readLocalEnvironment(environment)
  assert.equal(result.setup, 'node scripts/codex-environment.mjs setup')
  assert.deepEqual(
    result.actions.map((action) => action.command.split(' ').at(-1)),
    ['dev', 'test', 'validate', 'preflight']
  )
})

test('missing, duplicate, unsupported and altered environment commands fail closed', () => {
  for (const invalid of [
    '',
    environment.replace('version = 1', 'version = 2'),
    environment.replace('[setup]', '[setup]\nscript = ""'),
    environment.replace('codex-environment.mjs setup', 'codex-environment.mjs publish'),
    environment.replace('platform = "win32"', 'platform = "linux"'),
    environment.replace('[[actions]]', '[actions]'),
    environment.replace('codex-environment.mjs dev', 'codex-environment.mjs dev; echo success'),
    environment + '\n[cleanup]\nscript = "unexpected"',
    environment.replace('command = "node scripts/codex-environment.mjs test"', ''),
  ]) {
    assert.throws(() => readLocalEnvironment(invalid))
  }
})

const profile = readFileSync(new URL('../.github/agents/codex.agent.md', import.meta.url), 'utf8')

test('the physical Copilot profile has valid bounded frontmatter and an explicit target', () => {
  const result = readCopilotProfile(profile)
  assert.equal(result.target, 'github-copilot')
  assert.equal(result.name, 'CP Sim Engine')
})

test('historical four-hyphen delimiters and duplicate or conflicting targets fail closed', () => {
  for (const invalid of [
    profile.replace(/^---/, '----'),
    profile.replace(/\r?\n---\r?\n/, '\n----\n'),
    profile.replace('target: github-copilot', 'target: vscode'),
    profile.replace('target: github-copilot', 'target: github-copilot\ntarget: vscode'),
    profile.replace(/target: github-copilot\r?\n/, ''),
    profile.replace("name: 'CP Sim Engine'", "name: 'CP Sim Engine"),
    profile.replace('[read, edit, search, execute]', '[read, edit, search, execute, agent]'),
  ]) {
    assert.throws(() => readCopilotProfile(invalid))
  }
})
