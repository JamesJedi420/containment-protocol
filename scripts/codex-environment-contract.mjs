// This repository profile uses single-line scalar fields and one inline tools list.
// Reject unsupported forms rather than treating this as a general YAML parser.
export function readCopilotProfile(source) {
  const lines = source.replaceAll('\r\n', '\n').split('\n')
  if (lines[0] !== '---')
    throw new Error('Copilot frontmatter must begin with exactly three hyphens')
  const end = lines.indexOf('---', 1)
  if (end < 0) throw new Error('Copilot frontmatter must close with exactly three hyphens')
  const fields = new Map()
  for (const line of lines.slice(1, end)) {
    if (!line.trim()) continue
    const field = /^([a-z][a-z-]*):\s*(.+)$/.exec(line)
    if (!field || fields.has(field[1])) throw new Error('Malformed or duplicate Copilot field')
    fields.set(field[1], field[2].trim())
  }
  function scalar(name) {
    const value = fields.get(name)
    if (!value) throw new Error(`Missing Copilot ${name}`)
    if (value.startsWith("'") || value.startsWith('"')) {
      if (value.at(-1) !== value[0]) throw new Error(`Malformed Copilot ${name}`)
      return value.slice(1, -1)
    }
    return value
  }
  if (scalar('target') !== 'github-copilot')
    throw new Error('Copilot target must be github-copilot')
  if (scalar('name') !== 'CP Sim Engine')
    throw new Error('Copilot display name must be CP Sim Engine')
  scalar('description')
  if (fields.get('tools') !== '[read, edit, search, execute]') {
    throw new Error('Preserve the bounded Copilot tool list')
  }
  return { target: scalar('target'), name: scalar('name'), body: lines.slice(end + 1).join('\n') }
}
// A contract for this repository's app-generated, single-line TOML subset,
// not a general TOML parser. Unsupported edits require explicit contract review.
export function readLocalEnvironment(source) {
  const lines = source
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
  const actions = [
    ['Development', 'dev'],
    ['Tests', 'test'],
    ['Required validation', 'validate'],
    ['Named-task preflight', 'preflight'],
  ].map(([name, operation]) => ({
    name,
    command: `node scripts/codex-environment.mjs ${operation}`,
    platform: 'win32',
  }))
  const setup = 'node scripts/codex-environment.mjs setup'
  const expected = [
    'version = 1',
    'name = "containment-protocol"',
    '[setup]',
    `script = ${JSON.stringify(setup)}`,
  ]
  for (const action of actions)
    expected.push(
      '[[actions]]',
      `name = ${JSON.stringify(action.name)}`,
      'icon = "tool"',
      `command = ${JSON.stringify(action.command)}`,
      'platform = "win32"'
    )
  if (lines.join('\n') !== expected.join('\n')) {
    throw new Error('Local environment must retain the reviewed setup and Windows action contract')
  }
  return { setup, actions }
}
