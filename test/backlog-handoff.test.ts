import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const script = path.resolve('scripts/verify-backlog-handoff.mjs')

function verify(mutate: (root: string) => void = () => {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'backlog-'))
  try {
    fs.mkdirSync(path.join(root, 'planning'))
    const write = (name: string, body: string) =>
      fs.writeFileSync(path.join(root, 'planning', name), body)
    write(
      'backlog.md',
      '# Queue\n\n## Active queue\n\n- SPE-1 — Continue work.\n\n## Recommended next step (agent handoff)\n\n**Current handoff (primary):** SPE-1\n**In progress:** SPE-1\n'
    )
    write(
      'history.md',
      '## Recommended next step (agent handoff)\n\n**Recently shipped:** SPE-2\n\n## Plans\n\n| `example-slice.md` | **Done** |\n'
    )
    write('example-slice.md', '| **Status** | **Done** |\n')
    write(
      'backlog-handoff-manifest.json',
      JSON.stringify({
        primary: 'SPE-1',
        inProgress: ['SPE-1'],
        recentlyShipped: ['SPE-2'],
        historyFile: 'planning/history.md',
        sliceDocStatus: { 'planning/example-slice.md': 'Done' },
      })
    )
    mutate(root)
    return spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' })
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

function appendQueue(root: string, content: string) {
  const file = path.join(root, 'planning/backlog.md')
  fs.writeFileSync(
    file,
    fs.readFileSync(file, 'utf8').replace('## Recommended', `${content}\n## Recommended`)
  )
}

describe('compact backlog handoff', () => {
  it('checks shipped evidence and slice statuses in separate history', () => {
    expect(verify().status).toBe(0)
  })

  it('identifies the archive when its handoff section is missing', () => {
    const result = verify((root) =>
      fs.writeFileSync(path.join(root, 'planning/history.md'), '# History\n')
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('planning/history.md: missing')
  })

  it('accepts Windows line endings in the active queue', () => {
    expect(
      verify((root) => {
        const file = path.join(root, 'planning/backlog.md')
        fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\n/g, '\r\n'))
      }).status
    ).toBe(0)
  })

  it('allows current slice status updates without rewriting the archive', () => {
    expect(
      verify((root) => {
        const file = path.join(root, 'planning/backlog-handoff-manifest.json')
        const manifest = JSON.parse(fs.readFileSync(file, 'utf8'))
        manifest.sliceDocStatus['planning/example-slice.md'] = 'In Progress'
        fs.writeFileSync(file, JSON.stringify(manifest))
        fs.writeFileSync(
          path.join(root, 'planning/example-slice.md'),
          '| **Status** | **In Progress** |\n'
        )
      }).status
    ).toBe(0)
  })

  it('rejects a missing active handoff owner', () => {
    const result = verify((root) => {
      const file = path.join(root, 'planning/backlog.md')
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('- SPE-1', '- SPE-3'))
    })
    expect(result.stderr).toContain('missing from active queue')
    expect(result.status).toBe(1)
  })

  it.each([
    ['duplicate', '- SPE-1 — Duplicate.\n', 'distinct owning issue'],
    ['long entry', `- SPE-3 — ${'x'.repeat(350)}\n`, 'concise'],
    [
      'too many entries',
      Array.from({ length: 12 }, (_, i) => `- SPE-${i + 3} — Work.\n`).join(''),
      '1–12',
    ],
    ['shipped records', '**Recently shipped:** SPE-3\n', 'shipped records belong'],
  ])('rejects %s', (_, content, message) => {
    const result = verify((root) => appendQueue(root, content))
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(message)
  })

  it('still rejects historical slice status drift', () => {
    const result = verify((root) =>
      fs.writeFileSync(
        path.join(root, 'planning/example-slice.md'),
        '| **Status** | **In Progress** |\n'
      )
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('manifest')
  })
})
