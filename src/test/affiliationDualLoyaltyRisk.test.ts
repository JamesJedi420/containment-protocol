import { describe, expect, it } from 'vitest'
import {
  evaluateAffiliationDualLoyaltyRisk,
  evaluateAffiliationDualLoyaltyRiskSet,
  type AffiliationDualLoyaltyRiskInput,
} from '../domain/affiliationDualLoyaltyRisk'
import { evaluateAffiliationOnboardingReadiness } from '../domain/affiliationOnboardingReadiness'
import { evaluateAffiliationSiteClearance } from '../domain/affiliationSiteClearance'
import type { Candidate } from '../domain/recruitment'

function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: 'cand-dual-loyalty',
    name: 'Candidate Dual Loyalty',
    age: 31,
    category: 'agent',
    hireStatus: 'available',
    weeklyCost: 20,
    weeklyWage: 20,
    revealLevel: 2,
    expiryWeek: 8,
    origin: 'open-call',
    roleInclination: 'field',
    skills: ['recon-sweep', 'pathing'],
    liabilities: ['deadline-pressure'],
    funnelStage: 'hired',
    createdWeek: 1,
    lastUpdatedWeek: 1,
    evaluation: {
      overallVisible: true,
      overall: 70,
      overallValue: 70,
      potentialVisible: true,
      potentialTier: 'mid',
      rumorTags: [],
    },
    agentData: {
      role: 'field',
      specialization: 'recon',
      stats: {
        combat: 60,
        investigation: 55,
        utility: 50,
        social: 40,
      },
      traits: ['steady-aim'],
    },
    ...overrides,
  } as Candidate
}

function clearedOnboarding(candidateId = 'cand-dual-loyalty') {
  return evaluateAffiliationOnboardingReadiness(makeCandidate({ id: candidateId }), {
    trainingCompletedCandidateIds: [candidateId],
    oathContractCandidateIds: [candidateId],
  })
}

function baseInput(overrides: Partial<AffiliationDualLoyaltyRiskInput> = {}) {
  return {
    subjectId: 'subject-dual',
    subjectLabel: 'Subject Dual',
    primaryAnchor: 'agency',
    secondaryAnchors: [],
    onboardingDecision: clearedOnboarding(),
    ...overrides,
  } satisfies AffiliationDualLoyaltyRiskInput
}

describe('affiliationDualLoyaltyRisk', () => {
  it('keeps agency-only subjects at no risk', () => {
    const decision = evaluateAffiliationDualLoyaltyRisk(baseInput())

    expect(decision).toEqual(
      expect.objectContaining({
        subjectId: 'subject-dual',
        subjectLabel: 'Subject Dual',
        primaryAnchor: 'agency',
        primaryAnchorLabel: 'Agency',
        riskLevel: 'none',
        riskLevelLabel: 'None',
        decisionLabel: 'Subject Dual: None',
      })
    )
    expect(decision.secondaryAnchors).toEqual([])
    expect(decision.restrictedSurfaces).toEqual([])
    expect(decision.reasonCodes).toEqual(['no_dual_loyalty_risk', 'single_loyalty_anchor'])
  })

  it('watches benign civic, medical, and academic overlaps without restricting surfaces', () => {
    const decision = evaluateAffiliationDualLoyaltyRisk(
      baseInput({
        secondaryAnchors: ['medical', 'civic', 'academic'],
      })
    )

    expect(decision.riskLevel).toBe('watch')
    expect(decision.secondaryAnchors).toEqual(['academic', 'civic', 'medical'])
    expect(decision.restrictedSurfaces).toEqual([])
    expect(decision.reasonCodes).toEqual([
      'benign_academic_overlap_watch',
      'benign_civic_overlap_watch',
      'benign_medical_overlap_watch',
    ])
  })

  it('restricts criminal, occult, rival-containment, and patron overlaps', () => {
    const decision = evaluateAffiliationDualLoyaltyRisk(
      baseInput({
        secondaryAnchors: ['patron', 'criminal', 'occult', 'rival_containment'],
      })
    )

    expect(decision.riskLevel).toBe('restricted')
    expect(decision.restrictedSurfaces).toEqual(['file', 'gear', 'mission'])
    expect(decision.restrictedSurfaceLabels).toEqual(['File', 'Gear', 'Mission'])
    expect(decision.reasonCodes).toEqual([
      'restricted_criminal_overlap',
      'restricted_occult_overlap',
      'restricted_patron_overlap',
      'restricted_rival_containment_overlap',
    ])
  })

  it('blocks hostile evidence and blocked site clearance', () => {
    const blockedClearance = evaluateAffiliationSiteClearance({
      subjectId: 'subject-dual',
      subjectLabel: 'Subject Dual',
      surface: 'mission',
      onboardingDecision: clearedOnboarding(),
      context: {
        siteId: 'site-alpha',
        blockedSiteIds: ['site-alpha'],
      },
    })

    const decision = evaluateAffiliationDualLoyaltyRisk(
      baseInput({
        secondaryAnchors: ['civic'],
        evidenceTags: ['hostile'],
        siteClearanceDecision: blockedClearance,
      })
    )

    expect(blockedClearance.outcome).toBe('blocked')
    expect(decision.riskLevel).toBe('blocked')
    expect(decision.restrictedSurfaces).toEqual(['room', 'file', 'gear', 'housing', 'mission'])
    expect(decision.reasonCodes).toEqual([
      'benign_civic_overlap_watch',
      'blocked_site_clearance',
      'hostile_evidence_blocked',
    ])
  })

  it('raises provisional onboarding to watch and lost onboarding to blocked', () => {
    const provisional = evaluateAffiliationOnboardingReadiness(makeCandidate())
    const lost = evaluateAffiliationOnboardingReadiness(makeCandidate({ funnelStage: 'lost' }))

    const provisionalDecision = evaluateAffiliationDualLoyaltyRisk(
      baseInput({
        onboardingDecision: provisional,
      })
    )
    const lostDecision = evaluateAffiliationDualLoyaltyRisk(
      baseInput({
        onboardingDecision: lost,
      })
    )

    expect(provisional.stage).toBe('provisional')
    expect(provisionalDecision.riskLevel).toBe('watch')
    expect(provisionalDecision.reasonCodes).toEqual([
      'onboarding_provisional_watch',
      'single_loyalty_anchor',
    ])
    expect(lost.stage).toBe('lost')
    expect(lostDecision.riskLevel).toBe('blocked')
    expect(lostDecision.reasonCodes).toEqual(['lost_onboarding_blocked', 'single_loyalty_anchor'])
  })

  it('falls back deterministically for sparse invalid inputs without throwing', () => {
    const invalid = {
      subjectId: '',
      primaryAnchor: 'unmapped',
      secondaryAnchors: ['criminal', 'mystery'],
      evidenceTags: [' conflict:civic_authority ', ''],
      affiliationRefs: [' ref:z ', 'ref:a', ''],
    } as unknown as AffiliationDualLoyaltyRiskInput

    expect(() => evaluateAffiliationDualLoyaltyRisk(invalid)).not.toThrow()

    const decision = evaluateAffiliationDualLoyaltyRisk(invalid)

    expect(decision).toMatchObject({
      subjectId: 'subject:unknown',
      subjectLabel: 'subject:unknown',
      primaryAnchor: 'unknown',
      riskLevel: 'restricted',
    })
    expect(decision.secondaryAnchors).toEqual(['criminal', 'unknown'])
    expect(decision.evidenceTags).toEqual(['conflict:civic_authority'])
    expect(decision.affiliationRefs).toEqual(['ref:a', 'ref:z'])
    expect(decision.reasonCodes).toEqual([
      'conflict_evidence_restricted',
      'duplicate_unknown_anchor',
      'invalid_primary_anchor',
      'invalid_secondary_anchor',
      'missing_subject_id',
      'restricted_criminal_overlap',
      'unknown_primary_anchor_watch',
      'unknown_secondary_anchor',
    ])
  })

  it('sorts risk sets and remains byte-stable across repeated evaluation', () => {
    const inputs = [
      baseInput({ subjectId: 'subject-z', primaryAnchor: 'agency', secondaryAnchors: ['medical'] }),
      baseInput({ subjectId: 'subject-a', primaryAnchor: 'agency', secondaryAnchors: ['civic'] }),
      baseInput({ subjectId: 'subject-a', primaryAnchor: 'civic', secondaryAnchors: ['agency'] }),
    ]

    const first = evaluateAffiliationDualLoyaltyRiskSet(inputs)
    const second = evaluateAffiliationDualLoyaltyRiskSet(inputs)

    expect(
      first.map((decision) => [
        decision.subjectId,
        decision.primaryAnchor,
        decision.secondaryAnchors.join('|'),
      ])
    ).toEqual([
      ['subject-a', 'agency', 'civic'],
      ['subject-a', 'civic', 'agency'],
      ['subject-z', 'agency', 'medical'],
    ])
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
