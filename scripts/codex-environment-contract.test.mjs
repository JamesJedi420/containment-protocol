import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { readCopilotProfile } from './codex-environment-contract.mjs'

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
