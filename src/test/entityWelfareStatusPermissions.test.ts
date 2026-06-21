import { describe, expect, it } from 'vitest'
import {
  ENTITY_WELFARE_PERMISSION_SURFACES,
  evaluateEntityWelfareStatusPermission,
  evaluateEntityWelfareStatusPermissionSet,
} from '../domain/entityWelfareStatusPermissions'
import type { EntityWelfareReclassificationRecord } from '../domain/entityWelfareReclassificationRegistry'

function baseRecord(
  overrides: Partial<EntityWelfareReclassificationRecord> = {}
): EntityWelfareReclassificationRecord {
  return {
    id: 'reclass:permission-test',
    label: 'Permission test record',
    priorThreatLabel: 'provisional-threat',
    proposedDisposition: 'cooperative',
    reclassificationState: 'approved',
    reviewGate: 'ethics',
    reviewArtifactRef: 'review:ethics-permission-test',
    evidenceBundleRefs: ['evidence:permission-test'],
    containmentRevisionRefs: ['revision:permission-test'],
    ...overrides,
  }
}

function outcomes(record: EntityWelfareReclassificationRecord) {
  return evaluateEntityWelfareStatusPermissionSet(record).map((decision) => [
    decision.surface,
    decision.outcome,
  ])
}

describe('entityWelfareStatusPermissions (SPE-1046 slice 1)', () => {
  it('allows only housing for approved cooperative status and blocks unrestricted room access', () => {
    const record = baseRecord({ proposedDisposition: 'cooperative' })
    const decisions = evaluateEntityWelfareStatusPermissionSet(record)

    expect(outcomes(record)).toEqual([
      ['room', 'blocked'],
      ['file', 'restricted'],
      ['gear', 'restricted'],
      ['housing', 'allowed'],
      ['mission', 'restricted'],
    ])
    expect(decisions[0]?.reasonCodes).toContain('approved_cooperative_unrestricted_room_blocked')
    expect(decisions[3]?.reasonCodes).toContain('approved_cooperative_housing_allowed')
    expect(decisions[3]).toEqual(
      expect.objectContaining({
        recordId: 'reclass:permission-test',
        recordLabel: 'Permission test record',
        surfaceLabel: 'Housing',
        outcomeLabel: 'Allowed',
        dispositionLabel: 'Cooperative',
        stateLabel: 'Approved',
      })
    )
  })

  it('limits approved medical status to housing with restricted rooms and files', () => {
    expect(outcomes(baseRecord({ proposedDisposition: 'medical' }))).toEqual([
      ['room', 'restricted'],
      ['file', 'restricted'],
      ['gear', 'blocked'],
      ['housing', 'allowed'],
      ['mission', 'blocked'],
    ])
  })

  it('keeps approved sapient remains protected and blocks gear or mission use', () => {
    const decisions = evaluateEntityWelfareStatusPermissionSet(
      baseRecord({ proposedDisposition: 'sapient_remains' })
    )

    expect(decisions.map((decision) => [decision.surface, decision.outcome])).toEqual([
      ['room', 'restricted'],
      ['file', 'restricted'],
      ['gear', 'blocked'],
      ['housing', 'restricted'],
      ['mission', 'blocked'],
    ])
    expect(decisions[0]?.reasonCodes).toContain(
      'approved_sapient_remains_room_protected_restricted'
    )
    expect(decisions[2]?.reasonCodes).toContain('approved_sapient_remains_gear_blocked')
  })

  it('restricts pending records across all surfaces and carries review-gate reason codes', () => {
    const decisions = evaluateEntityWelfareStatusPermissionSet(
      baseRecord({
        reclassificationState: 'pending',
        reviewArtifactRef: undefined,
        evidenceBundleRefs: undefined,
        containmentRevisionRefs: undefined,
        reviewGate: 'psych',
      })
    )

    expect(decisions.map((decision) => decision.outcome)).toEqual([
      'restricted',
      'restricted',
      'restricted',
      'restricted',
      'restricted',
    ])
    expect(decisions[0]?.reviewGateLabel).toBe('Psych')
    expect(decisions[0]?.reasonCodes).toEqual([
      'pending_reclassification_review',
      'review_gate_psych',
    ])
  })

  it('blocks denied and reverted records across all surfaces', () => {
    expect(
      evaluateEntityWelfareStatusPermissionSet(
        baseRecord({
          reclassificationState: 'denied',
          reviewGate: 'executive',
          reviewArtifactRef: 'review:executive-denial',
          containmentRevisionRefs: undefined,
        })
      ).map((decision) => decision.outcome)
    ).toEqual(['blocked', 'blocked', 'blocked', 'blocked', 'blocked'])

    expect(
      evaluateEntityWelfareStatusPermissionSet(
        baseRecord({
          reclassificationState: 'reverted',
          reviewGate: 'executive',
          reviewArtifactRef: 'review:executive-revert',
          containmentRevisionRefs: undefined,
        })
      ).map((decision) => decision.reasonCodes)
    ).toEqual([
      ['reverted_reclassification_blocked'],
      ['reverted_reclassification_blocked'],
      ['reverted_reclassification_blocked'],
      ['reverted_reclassification_blocked'],
      ['reverted_reclassification_blocked'],
    ])
  })

  it('falls back deterministically for invalid union values without throwing', () => {
    const record = baseRecord({
      proposedDisposition: 'outsider' as EntityWelfareReclassificationRecord['proposedDisposition'],
      reclassificationState: 'approved',
    })

    const decision = evaluateEntityWelfareStatusPermission(record, 'mission')

    expect(decision).toEqual(
      expect.objectContaining({
        outcome: 'restricted',
        dispositionLabel: 'Invalid Disposition',
        stateLabel: 'Approved',
      })
    )
    expect(decision.reasonCodes).toEqual([
      'invalid_proposed_disposition',
      'validation_invalid_proposed_disposition',
    ])

    expect(() =>
      evaluateEntityWelfareStatusPermission(
        baseRecord({
          reclassificationState:
            'unreviewed' as EntityWelfareReclassificationRecord['reclassificationState'],
        }),
        'file'
      )
    ).not.toThrow()
  })

  it('returns all permission surfaces in stable order with byte-stable decisions', () => {
    const record = baseRecord({ proposedDisposition: 'medical' })
    const first = evaluateEntityWelfareStatusPermissionSet(record)
    const second = evaluateEntityWelfareStatusPermissionSet(record)

    expect(first.map((decision) => decision.surface)).toEqual(ENTITY_WELFARE_PERMISSION_SURFACES)
    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
