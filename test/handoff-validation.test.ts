import { readFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const script = path.resolve('scripts/verify-read-only-handoff.mjs')
const template = readFileSync('docs/read-only-session-handoff.md', 'utf8')

function run(content: string) {
  return spawnSync(process.execPath, [script, '--stdin'], { encoding: 'utf8', input: content })
}

describe('read-only handoff template CLI', () => {
  it('checks the fixed repository template by default', () => {
    expect(spawnSync(process.execPath, [script], { encoding: 'utf8' }).status).toBe(0)
  })

  it.each([
    'Issues inspected',
    'Evidence and uncertainty',
    'Candidate status',
    'Governance / authorization state',
  ])('requires section %s', (section) => {
    expect(run(template.replace('### ' + section, '### Removed section')).status).toBe(1)
  })

  it('requires a table header and separator', () => {
    expect(run(template.replace(/^\| Phase +\|[^\n]*\n/m, '')).status).toBe(1)
    expect(run(template.replace(/^\| -+[^\n]*\n/m, '')).status).toBe(1)
  })

  it('rejects contradictory write declarations', () => {
    expect(
      run(
        template.replace('- Linear writes: none', '- Linear writes: none\n- Linear writes: updated')
      ).status
    ).toBe(1)
  })

  it('checks the real template and states its verification limits', () => {
    const result = run(template)
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Approval, evidence and live state require')
  })

  it.each([
    ['missing heading', (s: string) => s.replace('### Session metadata', '### Other metadata')],
    ['empty field', (s: string) => s.replace(/^- \*\*Action\*\*:.*$/m, '- **Action**:')],
    [
      'wrong mode',
      (s: string) => s.replace('**Session mode**: read-only', '**Session mode**: review'),
    ],
    [
      'lost choices',
      (s: string) =>
        s.replace('**Session type**: review | docs | harvest-triage', '**Session type**: review'),
    ],
    ['writes', (s: string) => s.replace('- Linear writes: none', '- Linear writes: issue updated')],
    ['missing phase', (s: string) => s.replace(/^\| Phase 3[^\n]*\n/m, '')],
    ['empty phase cell', (s: string) => s.replace(/^(\| Phase 1[^|]*\|)[^|]*/m, '$1 ')],
    [
      'duplicate field',
      (s: string) =>
        s.replace('### Next authorized action', '### Next authorized action\n\n- **Owner**: other'),
    ],
    ['duplicate template', (s: string) => s + '\n' + s],
  ])('rejects %s', (_, change) => {
    const result = run(change(template))
    expect(result.status).toBe(1)
    expect(result.stderr).not.toBe('')
  })

  it('does not borrow required fields from the following section', () => {
    const result = run(
      template
        .replace(/^- \*\*Next phase allowed\*\*:.*$/m, '')
        .replace(
          '### Next authorized action',
          '### Next authorized action\n\n- **Next phase allowed**: no'
        )
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'Missing or empty field in Next-phase pre-condition check: Next phase allowed'
    )
  })

  it('does not borrow a missing template section from prose outside its fence', () => {
    const result = run(
      template.replace('### Session metadata', '### Other metadata') + '\n### Session metadata\n'
    )
    expect(result.status).toBe(1)
  })

  it('accepts both newline conventions', () => {
    expect(run(template.replace(/\r?\n/g, '\n')).status).toBe(0)
    expect(run(template.replace(/\r?\n/g, '\r\n')).status).toBe(0)
  })

  it('rejects arbitrary file-path arguments', () => {
    const result = spawnSync(process.execPath, [script, 'missing-handoff-fixture.md'], {
      encoding: 'utf8',
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('file-path arguments are not accepted')
  })
})
