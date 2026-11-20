import { describe, expect, it } from 'vitest'
import { projectActionAcknowledgement } from './actionAcknowledgement'

describe('projectActionAcknowledgement', () => {
  it('maps maintenance no_op to no_effect without success language', () => {
    const record = projectActionAcknowledgement({
      kind: 'maintenance',
      id: 'conv-1',
      result: { status: 'no_op' } as any,
    })
    expect(record.summary).toBe('no_effect')
    expect(record.currentEffect).toBe('no effect')
    expect(record.lifecycle).toBe('resolved')
    expect(record.summary).not.toContain('success')
    expect(record.summary).not.toContain('applied')
  })

  it('projects superseded evidence as lifecycle superseded', () => {
    const record = projectActionAcknowledgement({
      kind: 'workshop',
      id: 'wo-1',
      superseded: true,
    })
    expect(record.lifecycle).toBe('superseded')
    expect(record.summary).toBe('superseded')
  })

  it('keeps applied as non-success terminal for specific effect', () => {
    const record = projectActionAcknowledgement({
      kind: 'maintenance',
      id: 'conv-2',
      result: { status: 'applied' } as any,
    })
    expect(record.summary).toBe('applied')
    expect(record.lifecycle).toBe('resolved')
  })
})
