import { describe, expect, it } from 'vitest'
import { formatConcealmentActivationSummary } from '../domain/concealmentActivationFeed'

describe('formatConcealmentActivationSummary', () => {
  it('formats authored trigger reasons', () => {
    expect(
      formatConcealmentActivationSummary('hidden', 'authored-trigger:trigger:ops-003-vault-approach')
    ).toBe('Hidden presence activated (trigger:ops-003-vault-approach).')
    expect(
      formatConcealmentActivationSummary('displaced', 'authored-trigger:trigger:cover-shift')
    ).toBe('Displaced cover activated (trigger:cover-shift).')
  })

  it('formats global flag and bridge reasons', () => {
    expect(formatConcealmentActivationSummary('hidden', 'global-flag:conceal.case.case-001')).toBe(
      'Hidden presence activated from weekly covert posture flag.'
    )
    expect(
      formatConcealmentActivationSummary('displaced', 'global-flag:conceal.displace.case-003')
    ).toBe('Displaced cover activated from weekly displacement flag.')
    expect(formatConcealmentActivationSummary('hidden', 'global-flag-prefix:conceal.')).toBe(
      'Hidden presence activated from shared conceal directive.'
    )
    expect(formatConcealmentActivationSummary('hidden', 'case-tag')).toBe(
      'Hidden presence activated from concealment-tagged operation.'
    )
    expect(formatConcealmentActivationSummary('hidden', 'recon-hidden-modifiers')).toBe(
      'Hidden presence activated from recon modifier threshold.'
    )
  })
})
