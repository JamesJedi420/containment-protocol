import { describe, expect, it } from 'vitest'
import {
  handbackDelegation,
  isDelegationAuthorizing,
  issueTemporaryDelegation,
  terminateDelegation,
  type TemporaryDelegation,
} from '../domain/temporaryCommandDelegation'

describe('temporaryCommandDelegation', () => {
  const baseInput = {
    id: 'del-1',
    grantorId: 'g1',
    delegateId: 'd1',
    roleBasis: 'site-director',
    permittedScope: ['containment-lockdown', 'staff-reassign'],
    effectiveFrom: 100,
    effectiveUntil: 200,
    now: 150,
    grantorAuthorityValid: true,
    delegateEligible: true,
    existingActiveConflict: false,
    provenance: 'test',
  }

  it('issues a valid temporary delegation', () => {
    const result = issueTemporaryDelegation(baseInput)
    expect(result.ok).toBe(true)
    expect(result.delegation?.status).toBe('active')
    expect(result.delegation?.permittedScope).toEqual(['containment-lockdown', 'staff-reassign'])
  })

  it('rejects invalid grantor', () => {
    const result = issueTemporaryDelegation({ ...baseInput, grantorAuthorityValid: false })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('invalid_grantor')
  })

  it('rejects ineligible delegate', () => {
    const result = issueTemporaryDelegation({ ...baseInput, delegateEligible: false })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('ineligible_delegate')
  })

  it('rejects scope conflict', () => {
    const result = issueTemporaryDelegation({ ...baseInput, existingActiveConflict: true })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('scope_conflict')
  })

  it('authorizes in-scope command while active', () => {
    const { delegation } = issueTemporaryDelegation(baseInput)
    expect(isDelegationAuthorizing(delegation!, 'containment-lockdown', 160)).toBe(true)
    expect(isDelegationAuthorizing(delegation!, 'out-of-scope', 160)).toBe(false)
  })

  it('does not authorize after expiry', () => {
    const { delegation } = issueTemporaryDelegation(baseInput)
    const expired = terminateDelegation(delegation!, 'expired', 200)
    expect(isDelegationAuthorizing(expired, 'containment-lockdown', 210)).toBe(false)
  })

  it('handback terminates cleanly when route valid', () => {
    const { delegation } = issueTemporaryDelegation(baseInput)
    const handed = handbackDelegation(delegation!, 180, true)
    expect(handed.status).toBe('handed_back')
    expect(handed.terminationReason).toBe('handed_back')
    expect(isDelegationAuthorizing(handed, 'containment-lockdown', 185)).toBe(false)
  })

  it('handback contests when route invalid', () => {
    const { delegation } = issueTemporaryDelegation(baseInput)
    const contested = handbackDelegation(delegation!, 180, false)
    expect(contested.status).toBe('superseded')
    expect(contested.terminationReason).toBe('contested')
  })

  it('idempotent termination', () => {
    const { delegation } = issueTemporaryDelegation(baseInput)
    const once = terminateDelegation(delegation!, 'withdrawn', 170)
    const twice = terminateDelegation(once, 'expired', 180)
    expect(twice.status).toBe('withdrawn')
    expect(twice.terminatedAt).toBe(170)
  })
})
