/** Structural template check only; does not verify approvals, URLs, or live state. */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const requiredFields = {
  'Session metadata': ['Session mode', 'Session type', 'Workstream'],
  'Issues inspected': [],
  'Evidence and uncertainty': [],
  'Candidate status': [],
  'Governance / authorization state': [],
  'Phase progression map': [],
  'Next-phase pre-condition check': [
    'Current phase / phase work',
    'Phase X authorized approval',
    'Unresolved blockers',
    'Phase 3 contradiction review',
    'Next phase',
    'Next phase allowed',
    'Phase 4 state, if applicable',
  ],
  'Next authorized action': ['Owner', 'Action', 'Prerequisites / blockers', 'Stop conditions'],
}

export function validateHandoffTemplate(markdown) {
  const errors = []
  const templates = [...markdown.matchAll(/^```markdown\r?\n([\s\S]*?)^```[ \t]*\r?$/gm)]
    .map((match) => match[1])
    .filter((block) => /^## Read-only session handoff\r?$/m.test(block))
  if (templates.length !== 1) return ['Expected exactly one fenced read-only handoff template']
  const sections = new Map()
  let current
  for (const line of templates[0].split(/\r?\n/)) {
    const heading = /^(#{1,3}) (.+)$/.exec(line)
    if (heading) {
      current = heading[1] === '###' ? heading[2].replace(/ \(.*\)$/, '') : undefined
      if (current) {
        if (sections.has(current)) errors.push(`Duplicate section: ${current}`)
        sections.set(current, [])
      }
    } else if (current) sections.get(current).push(line)
  }
  for (const [name, fields] of Object.entries(requiredFields)) {
    const lines = sections.get(name)
    if (!lines) {
      errors.push(`Missing section: ${name}`)
      continue
    }
    const values = new Map()
    for (const line of lines) {
      const match = /^- \*\*(.+?)\*\*:[ \t]*(.*)$/.exec(line)
      if (match) {
        if (values.has(match[1])) errors.push(`Duplicate field in ${name}: ${match[1]}`)
        values.set(match[1], match[2].trim())
      }
    }
    for (const field of fields) {
      if (!values.get(field)) errors.push(`Missing or empty field in ${name}: ${field}`)
    }
    if (name === 'Session metadata') {
      if (values.get('Session mode') !== 'read-only') errors.push('Session mode must be read-only')
      if (values.get('Session type') !== 'review | docs | harvest-triage') {
        errors.push('Session type must retain all three template choices')
      }
      if (values.get('Workstream') !== 'CP-core | Academy | shared-system | cross-project') {
        errors.push('Workstream must retain all four template choices')
      }
      for (const field of ['Linear writes', 'Repository / external writes']) {
        const declarations = lines.filter((line) => line.startsWith(`- ${field}:`))
        if (declarations.length !== 1 || declarations[0] !== `- ${field}: none`) {
          errors.push(`${field} must have exactly one declaration: none`)
        }
      }
    }
    if (name === 'Phase progression map') {
      const table = lines.join('\n').trim().split('\n')
      const cells = (row) =>
        (row ?? '')
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim())
      if (
        table.length !== 6 ||
        cells(table[0]).join('|') !== 'Phase|Status|Evidence|Blocker|Next actor' ||
        cells(table[1]).length !== 5 ||
        !cells(table[1]).every((cell) => /^:?-{3,}:?$/.test(cell))
      ) {
        errors.push('Phase table needs its five-column header, separator and four contiguous rows')
      }
      for (let phase = 1; phase <= 4; phase++) {
        const rows = lines.filter((line) =>
          new RegExp(`^\\|\\s*Phase ${phase}(?:\\s|\\|)`).test(line)
        )
        if (rows.length !== 1) errors.push(`Expected one Phase ${phase} table row`)
        else if (
          rows[0].split('|').slice(1, -1).length !== 5 ||
          rows[0]
            .split('|')
            .slice(1, -1)
            .some((cell) => !cell.trim())
        ) {
          errors.push(`Phase ${phase} needs five nonempty cells`)
        }
      }
    }
  }
  return errors
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2)
    if (args.length > 1 || (args.length === 1 && args[0] !== '--stdin')) {
      throw new Error(
        'Usage: verify-read-only-handoff [--stdin]; file-path arguments are not accepted'
      )
    }
    const content =
      args[0] === '--stdin'
        ? readFileSync(0, 'utf8')
        : readFileSync(new URL('../docs/read-only-session-handoff.md', import.meta.url), 'utf8')
    const errors = validateHandoffTemplate(content)
    if (errors.length) {
      console.error(errors.join('\n'))
      process.exitCode = 1
    } else {
      console.log(
        'Read-only handoff template structure passed. Approval, evidence and live state require human/agent verification.'
      )
    }
  } catch (error) {
    console.error(`Handoff template check failed: ${error.message}`)
    process.exitCode = 1
  }
}
