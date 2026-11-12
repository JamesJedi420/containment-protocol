import { describe, expect, it } from 'vitest'
import {
  HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
  TRANSFER_PENDING_REVIEW_FIXTURE,
  validateCustodyStatusRecord,
  projectCustodyDisposition,
} from '../domain/containedPersonCustodyStatusRegistry'

describe('containedPersonCustodyStatusRegistry (SPE-1892 slice 1)', () => {
  it('validates hostile-actor contained hold fixture without errors', () => {
    const result = validateCustodyStatusRecord(HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE)
    expect(result.valid).toBe(true)
    expect(result.issues.filter((issue) => issue.severity === 'error')).toHaveLength(0)
  })

  it('projects custody disposition fields from contained hold record', () => {
    const projection = projectCustodyDisposition(HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE)

    expect(projection.custodyStage).toBe('contained_person')
    expect(projection.formerRoleCategory).toBe('hostile_actor')
    expect(projection.restrictionLevel).toBe('elevated')
    expect(projection.rightsReviewPending).toBe(true)
  })

  it('returns warning-only validation for transfer pending without rights review flag', () => {
    const warningOnly = {
      ...TRANSFER_PENDING_REVIEW_FIXTURE,
      id: 'custody-status:warning-only-transfer',
      rightsReviewPending: false,
    }

    const result = validateCustodyStatusRecord(warningOnly)
    expect(result.valid).toBe(true)
    expect(
      result.issues.some((issue) => issue.code === 'transfer_pending_without_rights_review_flag')
    ).toBe(true)
  })

  it('rejects franchise tokens in record label', () => {
    const invalid = {
      ...HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
      id: 'custody-status:franchise-label',
      label: 'SCP division custody hold',
    }

    const result = validateCustodyStatusRecord(invalid)
    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_label')).toBe(true)
  })

  it('returns byte-stable validation on repeated calls', () => {
    const first = validateCustodyStatusRecord(HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE)
    const second = validateCustodyStatusRecord(HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE)

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
