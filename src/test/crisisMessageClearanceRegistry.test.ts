import { describe, expect, it } from 'vitest'
import {
  evaluateClearance,
  requiresMultipleRoles,
  type CrisisMessageClearanceRequest,
} from '../domain/crisisMessageClearanceRegistry'

describe('crisisMessageClearanceRegistry (SPE-855 slice 1)', () => {
  const multiRoleRequest: CrisisMessageClearanceRequest = {
    messageId: 'msg-1',
    requiredGates: [
      { role: 'communications', required: true, baseDelayWeeks: 1 },
      { role: 'policy', required: true, baseDelayWeeks: 2 },
      { role: 'legal', required: false, baseDelayWeeks: 1 },
    ],
    mode: 'serial',
    ownershipState: 'agreed',
    priority: 'need_to_know',
  }

  it('requires more than one role for clearance', () => {
    expect(requiresMultipleRoles(multiRoleRequest)).toBe(true)
  })

  it('serial mode sums delays; simultaneous uses max', () => {
    const serial = evaluateClearance(multiRoleRequest)
    expect(serial.totalDelayWeeks).toBe(1 + 2)

    const simultaneous = evaluateClearance({ ...multiRoleRequest, mode: 'simultaneous' })
    expect(simultaneous.totalDelayWeeks).toBe(2)
    expect(simultaneous.totalDelayWeeks).toBeLessThan(serial.totalDelayWeeks)
  })

  it('ownership conflict increases delay', () => {
    const agreed = evaluateClearance(multiRoleRequest)
    const contested = evaluateClearance({ ...multiRoleRequest, ownershipState: 'contested' })
    expect(contested.totalDelayWeeks).toBe(agreed.totalDelayWeeks + 1)

    const failed = evaluateClearance({ ...multiRoleRequest, ownershipState: 'failed' })
    expect(failed.totalDelayWeeks).toBe(agreed.totalDelayWeeks + 3)
  })

  it('returns deterministic active reviewers and reason codes', () => {
    const outcome = evaluateClearance(multiRoleRequest)
    expect(outcome.cleared).toBe(true)
    expect(outcome.activeReviewers).toEqual(['communications', 'policy'])
    expect(outcome.reasonCodes).toContain('serial_sum_delay')
    expect(outcome.reasonCodes).toContain('ownership_agreed')
  })
})
