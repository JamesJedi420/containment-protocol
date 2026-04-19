// Targeted test for doctrine/playbook deterministic unlock/application (SPE-48)
import { describe, it, expect } from 'vitest'
import { doctrinePlaybookTemplates } from '../doctrinePlaybookTemplates'
import { applyDoctrine } from '../doctrinePlaybookRuntime'

describe('DoctrinePlaybookTemplate deterministic application', () => {
  const template = doctrinePlaybookTemplates[0]
  it('unlocks and provides guidance if context and reliability match', () => {
    const result = applyDoctrine(template, { context: 'artifact', reliability: 0.9 })
    expect(result.unlocked).toContain('stabilizer-prep')
    expect(result.guidance).toContain('isolate sample')
  })
  it('does not unlock if context does not match', () => {
    const result = applyDoctrine(template, { context: 'environmental', reliability: 0.9 })
    expect(result.unlocked).toHaveLength(0)
  })
  it('does not unlock if reliability is too low', () => {
    const result = applyDoctrine(template, { context: 'artifact', reliability: 0.99 })
    expect(result.unlocked).toHaveLength(0)
  })
})
