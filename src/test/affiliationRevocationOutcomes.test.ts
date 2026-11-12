import { describe, expect, it } from 'vitest'
import type { AffiliationDualLoyaltyDecision } from '../domain/affiliationDualLoyaltyRisk'
import type { AffiliationOnboardingDecision } from '../domain/affiliationOnboardingReadiness'
import type { AffiliationProtectedActionDecision } from '../domain/affiliationProtectedStatusActions'
import {
  evaluateAffiliationRevocationOutcome,
  evaluateAffiliationRevocationOutcomeSet,
  type AffiliationRevocationOutcomeInput,
} from '../domain/affiliationRevocationOutcomes'
import type { AffiliationSiteClearanceDecision } from '../domain/affiliationSiteClearance'
import type {
  EntityWelfarePermissionDecision,
  EntityWelfarePermissionSurface,
} from '../domain/entityWelfareStatusPermissions'

function onboarding(
  stage: AffiliationOnboardingDecision['stage'],
  fullAccessEligible: boolean
): AffiliationOnboardingDecision {
  return {
    candidateId: `candidate-${stage}`,
    candidateName: `Candidate ${stage}`,
    stage,
    stageLabel: stage,
    fullAccessEligible,
    checkpointDecisions: [],
    reasonCodes: [],
  }
}

function permission(
  surface: EntityWelfarePermissionSurface,
  outcome: EntityWelfarePermissionDecision['outcome']
): EntityWelfarePermissionDecision {
  return {
    recordId: `record-${surface}`,
    recordLabel: `Record ${surface}`,
    surface,
    surfaceLabel: surface,
    outcome,
    outcomeLabel: outcome,
    dispositionLabel: 'Cooperative',
    stateLabel: 'Approved',
    reasonCodes: [],
  }
}

function siteClearance(
  surface: EntityWelfarePermissionSurface,
  outcome: AffiliationSiteClearanceDecision['outcome']
): AffiliationSiteClearanceDecision {
  return {
    subjectId: 'subject-site',
    subjectLabel: 'Subject Site',
    surface,
    surfaceLabel: surface,
    outcome,
    outcomeLabel: outcome,
    decisionLabel: `${surface}: ${outcome}`,
    boundary: 'site',
    boundaryLabel: 'Site',
    siteId: 'site-alpha',
    siteLabel: 'Site Alpha',
    facilityId: 'facility:unknown',
    facilityLabel: 'facility:unknown',
    siteLayer: 'transition',
    siteLayerLabel: 'Transition',
    siteSpecific: true,
    reasonCodes: [],
  }
}

function dualLoyalty(
  riskLevel: AffiliationDualLoyaltyDecision['riskLevel']
): AffiliationDualLoyaltyDecision {
  return {
    subjectId: 'subject-dual',
    subjectLabel: 'Subject Dual',
    primaryAnchor: 'agency',
    primaryAnchorLabel: 'Agency',
    secondaryAnchors: ['criminal'],
    secondaryAnchorLabels: ['Criminal'],
    riskLevel,
    riskLevelLabel: riskLevel,
    decisionLabel: `Subject Dual: ${riskLevel}`,
    restrictedSurfaces:
      riskLevel === 'blocked' ? ['room', 'file', 'gear', 'housing', 'mission'] : ['file'],
    restrictedSurfaceLabels:
      riskLevel === 'blocked' ? ['Room', 'File', 'Gear', 'Housing', 'Mission'] : ['File'],
    evidenceTags: [],
    affiliationRefs: [],
    reasonCodes: [],
  }
}

function protectedAction(
  outcome: AffiliationProtectedActionDecision['outcome']
): AffiliationProtectedActionDecision {
  return {
    subjectId: 'subject-protected',
    subjectLabel: 'Subject Protected',
    protectedStatus: 'patient',
    protectedStatusLabel: 'Patient',
    action: 'assign_mission',
    actionLabel: 'Assign Mission',
    outcome,
    outcomeLabel: outcome,
    decisionLabel: `Assign Mission: ${outcome}`,
    restrictedSurfaces: ['mission'],
    restrictedSurfaceLabels: ['Mission'],
    requiredReviewGates: ['care_duty_review'],
    reviewEvidenceRefs: [],
    reasonCodes: [],
  }
}

function baseInput(
  overrides: Partial<AffiliationRevocationOutcomeInput> = {}
): AffiliationRevocationOutcomeInput {
  return {
    subjectId: 'subject-revocation',
    subjectLabel: 'Subject Revocation',
    kind: 'probation',
    cause: 'policy_violation',
    priorTrustBand: 'trusted',
    onboardingDecision: onboarding('cleared', true),
    ...overrides,
  }
}

describe('affiliationRevocationOutcomes', () => {
  it('restricts probation and suspends access for suspension outcomes', () => {
    const probation = evaluateAffiliationRevocationOutcome(baseInput())
    const suspension = evaluateAffiliationRevocationOutcome(
      baseInput({
        kind: 'suspension',
        affectedSurfaces: ['file', 'gear', 'housing'],
      })
    )

    expect(probation.outcome).toBe('restricted')
    expect(probation.trustOutcome).toBe('probation')
    expect(probation.blockedSurfaces).toEqual([])
    expect(probation.reasonCodes).toEqual([
      'policy_violation_review_required',
      'probation_access_restricted',
    ])

    expect(suspension.outcome).toBe('suspended')
    expect(suspension.trustOutcome).toBe('suspended')
    expect(suspension.affectedSurfaces).toEqual(['file', 'gear', 'housing'])
    expect(suspension.blockedSurfaces).toEqual(['file', 'gear'])
    expect(suspension.reasonCodes).toEqual([
      'policy_violation_review_required',
      'suspension_access_suspended',
    ])
  })

  it('downgrades sensitive access while preserving housing', () => {
    const decision = evaluateAffiliationRevocationOutcome(
      baseInput({
        kind: 'downgrade',
        cause: 'exposure_risk',
        affectedSurfaces: ['housing', 'mission', 'file', 'gear'],
      })
    )

    expect(decision.outcome).toBe('downgraded')
    expect(decision.trustOutcome).toBe('restricted')
    expect(decision.affectedSurfaces).toEqual(['file', 'gear', 'housing', 'mission'])
    expect(decision.blockedSurfaces).toEqual(['file', 'gear'])
    expect(decision.reasonCodes).toEqual([
      'downgrade_sensitive_access_reduced',
      'exposure_risk_revocation_restricted',
    ])
  })

  it('blocks sensitive access for revocation and expulsion', () => {
    const revocation = evaluateAffiliationRevocationOutcome(
      baseInput({ kind: 'revocation', cause: 'site_breach' })
    )
    const expulsion = evaluateAffiliationRevocationOutcome(
      baseInput({ kind: 'expulsion', cause: 'patron_influence' })
    )

    expect(revocation.outcome).toBe('revoked')
    expect(revocation.trustOutcome).toBe('revoked')
    expect(revocation.blockedSurfaces).toEqual(['file', 'gear', 'mission'])
    expect(revocation.reasonCodes).toEqual([
      'revocation_sensitive_access_revoked',
      'site_breach_revocation_restricted',
    ])

    expect(expulsion.outcome).toBe('revoked')
    expect(expulsion.blockedSurfaces).toEqual(['file', 'gear', 'mission'])
    expect(expulsion.reasonCodes).toEqual([
      'expulsion_sensitive_access_revoked',
      'patron_influence_revocation_restricted',
    ])
  })

  it('quarantines mission movement while preserving care-duty room and housing handling', () => {
    const decision = evaluateAffiliationRevocationOutcome(
      baseInput({
        kind: 'quarantine',
        cause: 'medical_hold',
      })
    )

    expect(decision.outcome).toBe('suspended')
    expect(decision.affectedSurfaces).toEqual(['room', 'housing', 'mission'])
    expect(decision.blockedSurfaces).toEqual(['mission'])
    expect(decision.reasonCodes).toEqual([
      'medical_hold_care_outcome_restricted',
      'quarantine_mission_site_movement_blocked',
    ])
  })

  it('escalates betrayal, corruption, and blocked upstream decisions to blocked', () => {
    const decision = evaluateAffiliationRevocationOutcome(
      baseInput({
        kind: 'downgrade',
        cause: 'betrayal',
        permissionDecision: permission('file', 'blocked'),
        siteClearanceDecision: siteClearance('mission', 'blocked'),
        dualLoyaltyDecision: dualLoyalty('blocked'),
      })
    )

    expect(decision.outcome).toBe('blocked')
    expect(decision.trustOutcome).toBe('blocked')
    expect(decision.blockedSurfaces).toEqual(['room', 'file', 'gear', 'housing', 'mission'])
    expect(decision.reasonCodes).toEqual([
      'betrayal_revocation_blocked',
      'downgrade_sensitive_access_reduced',
      'upstream_dual_loyalty_blocked',
      'upstream_permission_blocked',
      'upstream_site_clearance_blocked',
    ])

    const corruption = evaluateAffiliationRevocationOutcome(
      baseInput({ kind: 'clearance_review', cause: 'corruption' })
    )
    expect(corruption.outcome).toBe('blocked')
    expect(corruption.reasonCodes).toEqual([
      'clearance_review_access_restricted',
      'corruption_revocation_blocked',
    ])
  })

  it('keeps medical and protected-status causes restricted and care-aware', () => {
    const protectedCause = evaluateAffiliationRevocationOutcome(
      baseInput({
        kind: 'clearance_review',
        cause: 'protected_status',
        affectedSurfaces: ['room', 'housing', 'mission'],
        protectedActionDecision: protectedAction('restricted'),
      })
    )

    expect(protectedCause.outcome).toBe('restricted')
    expect(protectedCause.trustOutcome).toBe('restricted')
    expect(protectedCause.blockedSurfaces).toEqual(['mission'])
    expect(protectedCause.reasonCodes).toEqual([
      'clearance_review_access_restricted',
      'protected_status_care_outcome_restricted',
      'upstream_protected_action_restricted',
    ])
  })

  it('falls back deterministically for sparse invalid inputs without throwing', () => {
    const invalid = {
      subjectId: '',
      kind: 'bad-kind',
      cause: 'bad-cause',
      affectedSurfaces: ['file', 'bad-surface', 'mission'],
      reviewEvidenceRefs: [' ref:z ', 'ref:a', ''],
    } as unknown as AffiliationRevocationOutcomeInput

    expect(() => evaluateAffiliationRevocationOutcome(invalid)).not.toThrow()

    const decision = evaluateAffiliationRevocationOutcome(invalid)

    expect(decision).toMatchObject({
      subjectId: 'subject:unknown',
      subjectLabel: 'subject:unknown',
      kind: 'unknown',
      cause: 'unknown',
      outcome: 'restricted',
      trustOutcome: 'watch',
    })
    expect(decision.affectedSurfaces).toEqual(['file', 'mission'])
    expect(decision.reviewEvidenceRefs).toEqual(['ref:a', 'ref:z'])
    expect(decision.reasonCodes).toEqual([
      'invalid_affected_surface',
      'invalid_revocation_cause',
      'invalid_revocation_kind',
      'missing_subject_id',
      'unknown_revocation_cause_restricted',
      'unknown_revocation_kind_restricted',
    ])
  })

  it('sorts outcome sets and remains byte-stable across repeated evaluation', () => {
    const inputs = [
      baseInput({ subjectId: 'subject-z', kind: 'quarantine', cause: 'medical_hold' }),
      baseInput({ subjectId: 'subject-a', kind: 'downgrade', cause: 'exposure_risk' }),
      baseInput({ subjectId: 'subject-a', kind: 'suspension', cause: 'policy_violation' }),
      baseInput({ subjectId: 'subject-a', kind: 'downgrade', cause: 'betrayal' }),
    ]

    const first = evaluateAffiliationRevocationOutcomeSet(inputs)
    const second = evaluateAffiliationRevocationOutcomeSet(inputs)

    expect(first.map((decision) => [decision.subjectId, decision.kind, decision.cause])).toEqual([
      ['subject-a', 'suspension', 'policy_violation'],
      ['subject-a', 'downgrade', 'betrayal'],
      ['subject-a', 'downgrade', 'exposure_risk'],
      ['subject-z', 'quarantine', 'medical_hold'],
    ])
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
