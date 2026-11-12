import { describe, expect, it } from 'vitest'
import type { AffiliationDualLoyaltyDecision } from '../domain/affiliationDualLoyaltyRisk'
import type { AffiliationOnboardingDecision } from '../domain/affiliationOnboardingReadiness'
import {
  evaluateAffiliationProtectedStatusAction,
  evaluateAffiliationProtectedStatusActionSet,
  type AffiliationProtectedStatusActionInput,
} from '../domain/affiliationProtectedStatusActions'
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

function baseInput(
  overrides: Partial<AffiliationProtectedStatusActionInput> = {}
): AffiliationProtectedStatusActionInput {
  return {
    subjectId: 'subject-protected',
    subjectLabel: 'Subject Protected',
    protectedStatus: 'full_staff',
    action: 'grant_file_access',
    onboardingDecision: onboarding('cleared', true),
    ...overrides,
  }
}

describe('affiliationProtectedStatusActions', () => {
  it('blocks coercive or high-risk actions for minors, patients, and sapient remains', () => {
    const minor = evaluateAffiliationProtectedStatusAction(
      baseInput({ protectedStatus: 'minor', action: 'assign_mission' })
    )
    const patient = evaluateAffiliationProtectedStatusAction(
      baseInput({ protectedStatus: 'patient', action: 'sedate' })
    )
    const remains = evaluateAffiliationProtectedStatusAction(
      baseInput({ protectedStatus: 'sapient_remains', action: 'disclose_identity' })
    )

    expect(minor.outcome).toBe('blocked')
    expect(minor.reasonCodes).toContain('minor_assign_mission_blocked')
    expect(patient.outcome).toBe('blocked')
    expect(patient.reasonCodes).toContain('patient_sedate_blocked')
    expect(remains.outcome).toBe('blocked')
    expect(remains.reasonCodes).toContain('sapient_remains_disclose_identity_blocked')
  })

  it('restricts civilian, witness, informant, and contractor access actions', () => {
    const civilian = evaluateAffiliationProtectedStatusAction(
      baseInput({ protectedStatus: 'civilian', action: 'grant_gear_access' })
    )
    const informant = evaluateAffiliationProtectedStatusAction(
      baseInput({ protectedStatus: 'informant', action: 'assign_mission' })
    )
    const contractor = evaluateAffiliationProtectedStatusAction(
      baseInput({ protectedStatus: 'contractor', action: 'grant_room_access' })
    )
    const witness = evaluateAffiliationProtectedStatusAction(
      baseInput({ protectedStatus: 'witness', action: 'interrogate' })
    )

    expect(civilian.outcome).toBe('restricted')
    expect(civilian.restrictedSurfaces).toEqual(['gear'])
    expect(informant.outcome).toBe('restricted')
    expect(informant.restrictedSurfaces).toEqual(['mission'])
    expect(contractor.outcome).toBe('restricted')
    expect(contractor.restrictedSurfaces).toEqual(['room'])
    expect(witness.outcome).toBe('blocked')
    expect(witness.requiredReviewGates).toEqual(['civilian_protection_review'])
  })

  it('allows or restricts staff and allied personnel through onboarding and clearance overlays', () => {
    const fullStaff = evaluateAffiliationProtectedStatusAction(
      baseInput({
        permissionDecision: permission('file', 'allowed'),
        siteClearanceDecision: siteClearance('file', 'allowed'),
      })
    )
    const probationary = evaluateAffiliationProtectedStatusAction(
      baseInput({ protectedStatus: 'probationary_staff', action: 'grant_file_access' })
    )
    const alliedProvisional = evaluateAffiliationProtectedStatusAction(
      baseInput({
        protectedStatus: 'allied_personnel',
        action: 'assign_mission',
        onboardingDecision: onboarding('provisional', false),
      })
    )

    expect(fullStaff.outcome).toBe('allowed')
    expect(fullStaff.reasonCodes).toEqual(['full_staff_action_baseline_allowed'])
    expect(probationary.outcome).toBe('restricted')
    expect(probationary.restrictedSurfaces).toEqual(['file'])
    expect(probationary.reasonCodes).toEqual(['probationary_staff_access_restricted'])
    expect(alliedProvisional.outcome).toBe('restricted')
    expect(alliedProvisional.restrictedSurfaces).toEqual(['mission'])
    expect(alliedProvisional.reasonCodes).toEqual([
      'allied_personnel_action_baseline_allowed',
      'upstream_onboarding_provisional_restricted',
    ])
  })

  it('restricts detainee and compromised-person release, transfer, and access actions', () => {
    const detaineeRelease = evaluateAffiliationProtectedStatusAction(
      baseInput({ protectedStatus: 'detainee', action: 'release', dueProcessRequired: true })
    )
    const compromisedFile = evaluateAffiliationProtectedStatusAction(
      baseInput({ protectedStatus: 'compromised_person', action: 'grant_file_access' })
    )

    expect(detaineeRelease.outcome).toBe('restricted')
    expect(detaineeRelease.requiredReviewGates).toEqual(['due_process_review'])
    expect(detaineeRelease.reasonCodes).toEqual([
      'detainee_release_due_process_required',
      'due_process_evidence_required',
    ])
    expect(compromisedFile.outcome).toBe('blocked')
    expect(compromisedFile.restrictedSurfaces).toEqual(['file'])
    expect(compromisedFile.reasonCodes).toEqual(['compromised_person_file_access_restricted'])
  })

  it('lets blocked upstream permission, site-clearance, or dual-loyalty decisions force blocked', () => {
    const decision = evaluateAffiliationProtectedStatusAction(
      baseInput({
        action: 'grant_room_access',
        permissionDecision: permission('room', 'blocked'),
        siteClearanceDecision: siteClearance('room', 'blocked'),
        dualLoyaltyDecision: dualLoyalty('blocked'),
      })
    )

    expect(decision.outcome).toBe('blocked')
    expect(decision.restrictedSurfaces).toEqual(['room', 'file', 'gear', 'housing', 'mission'])
    expect(decision.reasonCodes).toEqual([
      'full_staff_action_baseline_allowed',
      'upstream_dual_loyalty_blocked',
      'upstream_permission_blocked',
      'upstream_site_clearance_blocked',
    ])
  })

  it('falls back deterministically for sparse invalid inputs without throwing', () => {
    const invalid = {
      subjectId: '',
      protectedStatus: 'unmapped',
      action: 'unknown_action',
      reviewEvidenceRefs: [' ref:z ', 'ref:a', ''],
    } as unknown as AffiliationProtectedStatusActionInput

    expect(() => evaluateAffiliationProtectedStatusAction(invalid)).not.toThrow()

    const decision = evaluateAffiliationProtectedStatusAction(invalid)

    expect(decision).toMatchObject({
      subjectId: 'subject:unknown',
      subjectLabel: 'subject:unknown',
      protectedStatus: 'unknown',
      protectedStatusLabel: 'Unknown',
      action: 'assign_mission',
      outcome: 'restricted',
    })
    expect(decision.reviewEvidenceRefs).toEqual(['ref:a', 'ref:z'])
    expect(decision.requiredReviewGates).toEqual(['protected_status_review'])
    expect(decision.reasonCodes).toEqual([
      'invalid_protected_action',
      'invalid_protected_status',
      'missing_subject_id',
      'unknown_protected_status_restricted',
    ])
  })

  it('sorts action sets and remains byte-stable across repeated evaluation', () => {
    const inputs = [
      baseInput({ subjectId: 'subject-z', protectedStatus: 'minor', action: 'quarantine' }),
      baseInput({
        subjectId: 'subject-a',
        protectedStatus: 'civilian',
        action: 'grant_file_access',
      }),
      baseInput({ subjectId: 'subject-a', protectedStatus: 'civilian', action: 'assign_mission' }),
      baseInput({ subjectId: 'subject-a', protectedStatus: 'patient', action: 'assign_housing' }),
    ]

    const first = evaluateAffiliationProtectedStatusActionSet(inputs)
    const second = evaluateAffiliationProtectedStatusActionSet(inputs)

    expect(
      first.map((decision) => [decision.subjectId, decision.protectedStatus, decision.action])
    ).toEqual([
      ['subject-a', 'civilian', 'assign_mission'],
      ['subject-a', 'civilian', 'grant_file_access'],
      ['subject-a', 'patient', 'assign_housing'],
      ['subject-z', 'minor', 'quarantine'],
    ])
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
