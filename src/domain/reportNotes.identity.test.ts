import { describe, expect, it } from 'vitest'
import { createDeterministicReportNote } from './reportNotes'

describe('SPE-3350 report-note identity', () => {
  it('different producers with the same sequence do not collide', () => {
    const a = createDeterministicReportNote('note A', 5, 1, undefined, 'system.alpha')
    const b = createDeterministicReportNote('note B', 5, 1, undefined, 'system.beta')
    expect(a.id).not.toBe(b.id)
    expect(a.id).toContain('system_alpha')
    expect(b.id).toContain('system_beta')
  })

  it('repeated construction of the same producer+sequence is idempotent', () => {
    const first = createDeterministicReportNote('same', 3, 42, undefined, 'case.resolved')
    const second = createDeterministicReportNote('same', 3, 42, undefined, 'case.resolved')
    expect(first.id).toBe(second.id)
    expect(first.timestamp).toBe(second.timestamp)
  })

  it('legacy-style notes without explicit producer remain distinct from typed producers', () => {
    const legacy = createDeterministicReportNote('legacy', 1, 0)
    const typed = createDeterministicReportNote('typed', 1, 0, undefined, 'system.other')
    expect(legacy.id).not.toBe(typed.id)
    expect(legacy.id.startsWith('note-legacy-')).toBe(true)
  })

  it('explicit producerKey overrides type for identity', () => {
    const note = createDeterministicReportNote(
      'content',
      10,
      7,
      undefined,
      'system.shared',
      undefined,
      'producer.special'
    )
    expect(note.id).toContain('producer_special')
  })
})
