import { describe, expect, it } from 'vitest'
import {
  evaluateAffiliationSiteClearance,
  evaluateAffiliationSiteClearanceSet,
  type AffiliationSiteClearanceInput,
} from '../domain/affiliationSiteClearance'
import { evaluateAffiliationOnboardingReadiness } from '../domain/affiliationOnboardingReadiness'
import { evaluateEntityWelfareStatusPermission } from '../domain/entityWelfareStatusPermissions'
import type { EntityWelfareReclassificationRecord } from '../domain/entityWelfareReclassificationRegistry'
import type { Candidate } from '../domain/recruitment'

function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: 'cand-site-clearance',
    name: 'Candidate Site Clearance',
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

function makeRecord(
  overrides: Partial<EntityWelfareReclassificationRecord> = {}
): EntityWelfareReclassificationRecord {
  return {
    id: 'reclass:site-clearance',
    label: 'Site clearance record',
    priorThreatLabel: 'provisional-threat',
    proposedDisposition: 'cooperative',
    reclassificationState: 'approved',
    reviewGate: 'ethics',
    reviewArtifactRef: 'review:site-clearance',
    evidenceBundleRefs: ['evidence:site-clearance'],
    containmentRevisionRefs: ['revision:site-clearance'],
    ...overrides,
  }
}

function clearedOnboarding(candidateId = 'cand-site-clearance') {
  return evaluateAffiliationOnboardingReadiness(makeCandidate({ id: candidateId }), {
    trainingCompletedCandidateIds: [candidateId],
    oathContractCandidateIds: [candidateId],
  })
}

function baseInput(overrides: Partial<AffiliationSiteClearanceInput> = {}) {
  return {
    subjectId: 'agent-7',
    subjectLabel: 'Agent Seven',
    surface: 'file',
    onboardingDecision: clearedOnboarding(),
    context: {
      boundary: 'facility',
      siteId: 'site-alpha',
      siteLabel: 'Site Alpha',
      facilityId: 'facility-archive',
      facilityLabel: 'Archive Wing',
      siteLayer: 'transition',
      grantedSiteIds: ['site-alpha'],
    },
    ...overrides,
  } satisfies AffiliationSiteClearanceInput
}

describe('affiliationSiteClearance', () => {
  it('allows explicitly granted site access when onboarding is cleared', () => {
    const decision = evaluateAffiliationSiteClearance(baseInput())

    expect(decision).toEqual(
      expect.objectContaining({
        subjectId: 'agent-7',
        subjectLabel: 'Agent Seven',
        surface: 'file',
        surfaceLabel: 'File',
        outcome: 'allowed',
        outcomeLabel: 'Allowed',
        decisionLabel: 'File: Allowed',
        boundary: 'facility',
        boundaryLabel: 'Facility',
        siteId: 'site-alpha',
        siteLabel: 'Site Alpha',
        facilityId: 'facility-archive',
        facilityLabel: 'Archive Wing',
        siteSpecific: true,
      })
    )
    expect(decision.reasonCodes).toEqual(['site_clearance_granted', 'subject_clearance_resolved'])
  })

  it('lets facility blocks override site grants', () => {
    const decision = evaluateAffiliationSiteClearance(
      baseInput({
        context: {
          siteId: 'site-alpha',
          facilityId: 'facility-archive',
          grantedSiteIds: ['site-alpha'],
          blockedFacilityIds: ['facility-archive'],
        },
      })
    )

    expect(decision.outcome).toBe('blocked')
    expect(decision.reasonCodes).toEqual(['facility_clearance_blocked'])
  })

  it('keeps blocked base permissions blocked even when site clearance is granted', () => {
    const blockedPermission = evaluateEntityWelfareStatusPermission(
      makeRecord({ proposedDisposition: 'hostile' }),
      'mission'
    )

    const decision = evaluateAffiliationSiteClearance(
      baseInput({
        surface: 'mission',
        basePermissionDecision: blockedPermission,
        context: {
          siteId: 'site-alpha',
          facilityId: 'facility-archive',
          grantedSiteIds: ['site-alpha'],
          grantedFacilityIds: ['facility-archive'],
        },
      })
    )

    expect(blockedPermission.outcome).toBe('blocked')
    expect(decision.outcome).toBe('blocked')
    expect(decision.reasonCodes).toEqual(['base_permission_blocked'])
  })

  it('restricts missing site or facility scope without throwing', () => {
    const decision = evaluateAffiliationSiteClearance(
      baseInput({
        context: {},
      })
    )

    expect(decision).toEqual(
      expect.objectContaining({
        outcome: 'restricted',
        siteId: 'site:unknown',
        facilityId: 'facility:unknown',
        siteSpecific: false,
      })
    )
    expect(decision.reasonCodes).toEqual(['missing_site_or_facility_scope'])
  })

  it('requires explicit clearance for interior site layers', () => {
    const decision = evaluateAffiliationSiteClearance(
      baseInput({
        context: {
          siteId: 'site-alpha',
          facilityId: 'facility-interior',
          siteLayer: 'interior',
        },
      })
    )

    expect(decision.outcome).toBe('restricted')
    expect(decision.reasonCodes).toEqual(['interior_site_clearance_required'])
  })

  it('distinguishes non-cleared onboarding restrictions from lost onboarding blocks', () => {
    const provisional = evaluateAffiliationOnboardingReadiness(makeCandidate())
    const lost = evaluateAffiliationOnboardingReadiness(makeCandidate({ funnelStage: 'lost' }))

    const provisionalDecision = evaluateAffiliationSiteClearance(
      baseInput({
        onboardingDecision: provisional,
      })
    )
    const lostDecision = evaluateAffiliationSiteClearance(
      baseInput({
        onboardingDecision: lost,
      })
    )

    expect(provisional.stage).toBe('provisional')
    expect(provisionalDecision.outcome).toBe('restricted')
    expect(provisionalDecision.reasonCodes).toEqual(['onboarding_cleared_clearance_required'])
    expect(lost.stage).toBe('lost')
    expect(lostDecision.outcome).toBe('blocked')
    expect(lostDecision.reasonCodes).toEqual(['onboarding_lost_clearance_blocked'])
  })

  it('falls back deterministically for invalid sparse inputs without throwing', () => {
    const invalid = {
      subjectId: '',
      surface: 'vault_access',
      context: {
        boundary: 'unknown_boundary',
        siteLayer: 'sublevel',
      },
    } as unknown as AffiliationSiteClearanceInput

    expect(() => evaluateAffiliationSiteClearance(invalid)).not.toThrow()

    const decision = evaluateAffiliationSiteClearance(invalid)

    expect(decision).toMatchObject({
      subjectId: 'subject:unknown',
      subjectLabel: 'subject:unknown',
      surface: 'mission',
      boundary: 'site',
      siteLayer: 'transition',
      outcome: 'restricted',
    })
    expect(decision.reasonCodes).toEqual([
      'invalid_permission_surface',
      'invalid_site_clearance_boundary',
      'invalid_site_layer',
      'missing_site_or_facility_scope',
      'missing_subject_id',
    ])
  })

  it('sorts clearance sets and remains byte-stable across repeated evaluation', () => {
    const inputs = [
      baseInput({
        subjectId: 'subject-z',
        surface: 'mission',
        context: { siteId: 'site-z', grantedSiteIds: ['site-z'] },
      }),
      baseInput({
        subjectId: 'subject-a',
        surface: 'gear',
        context: { siteId: 'site-a', grantedSiteIds: ['site-a'] },
      }),
      baseInput({
        subjectId: 'subject-a',
        surface: 'room',
        context: { siteId: 'site-a', grantedSiteIds: ['site-a'] },
      }),
    ]

    const first = evaluateAffiliationSiteClearanceSet(inputs)
    const second = evaluateAffiliationSiteClearanceSet(inputs)

    expect(
      first.map((decision) => [decision.subjectId, decision.siteId, decision.surface])
    ).toEqual([
      ['subject-a', 'site-a', 'room'],
      ['subject-a', 'site-a', 'gear'],
      ['subject-z', 'site-z', 'mission'],
    ])
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
