import { describe, expect, it } from 'vitest'
import {
  evaluateAffiliationSiteClearance,
  type AffiliationSiteClearanceInput,
} from '../domain/affiliationSiteClearance'
import { evaluateAffiliationOnboardingReadiness } from '../domain/affiliationOnboardingReadiness'
import { evaluateEntityWelfareStatusPermission } from '../domain/entityWelfareStatusPermissions'
import { evaluateAffiliationFacilityFileAccess } from '../domain/affiliationFacilityFileAccess'
import type { EntityWelfareReclassificationRecord } from '../domain/entityWelfareReclassificationRegistry'
import type { Candidate } from '../domain/recruitment'

function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: 'subject:file-access',
    name: 'File Access Subject',
    age: 31,
    category: 'agent',
    hireStatus: 'available',
    weeklyCost: 20,
    weeklyWage: 20,
    revealLevel: 2,
    expiryWeek: 8,
    origin: 'open-call',
    roleInclination: 'field',
    skills: ['archive-handling'],
    liabilities: [],
    funnelStage: 'hired',
    createdWeek: 1,
    lastUpdatedWeek: 1,
    ...overrides,
  } as Candidate
}

function clearedOnboardingDecision() {
  return evaluateAffiliationOnboardingReadiness(makeCandidate(), {
    backgroundClearedCandidateIds: ['subject:file-access'],
    trainingCompletedCandidateIds: ['subject:file-access'],
    oathContractCandidateIds: ['subject:file-access'],
  })
}

function makeWelfareRecord(
  overrides: Partial<EntityWelfareReclassificationRecord> = {}
): EntityWelfareReclassificationRecord {
  return {
    id: 'reclass:file-access',
    label: 'Facility file review',
    priorThreatLabel: 'provisional-threat',
    proposedDisposition: 'cooperative',
    reclassificationState: 'approved',
    reviewGate: 'ethics',
    reviewArtifactRef: 'review:file-access',
    evidenceBundleRefs: ['evidence:file-access'],
    containmentRevisionRefs: ['revision:file-access'],
    ...overrides,
  }
}

function siteClearanceInput(
  overrides: Partial<AffiliationSiteClearanceInput> = {}
): AffiliationSiteClearanceInput {
  return {
    subjectId: 'subject:file-access',
    subjectLabel: 'File Access Subject',
    surface: 'file',
    context: {
      boundary: 'facility',
      siteId: 'site:annex',
      siteLabel: 'Annex',
      facilityId: 'facility:archive',
      facilityLabel: 'Archive',
      siteLayer: 'transition',
      grantedFacilityIds: ['facility:archive'],
    },
    onboardingDecision: clearedOnboardingDecision(),
    ...overrides,
  }
}

describe('affiliationFacilityFileAccess', () => {
  it('lets facility blocks override restricted file permissions', () => {
    const permission = evaluateEntityWelfareStatusPermission(makeWelfareRecord(), 'file')
    const clearance = evaluateAffiliationSiteClearance(
      siteClearanceInput({
        context: {
          siteId: 'site:annex',
          facilityId: 'facility:archive',
          grantedFacilityIds: ['facility:archive'],
          blockedFacilityIds: ['facility:archive'],
        },
      })
    )

    const decision = evaluateAffiliationFacilityFileAccess({
      subjectId: 'subject:file-access',
      subjectLabel: 'File Access Subject',
      filePermissionDecision: permission,
      siteClearanceDecision: clearance,
    })

    expect(permission.outcome).toBe('restricted')
    expect(clearance.outcome).toBe('blocked')
    expect(decision.outcome).toBe('blocked')
    expect(decision.reasonCodes).toContain('facility_clearance_blocked')
    expect(decision.reasonCodes).toContain('file_permission_restricted')
    expect(decision.reasonCodes).toContain('site_clearance_blocked')
  })

  it('keeps blocked file permissions blocked even with facility grants', () => {
    const permission = evaluateEntityWelfareStatusPermission(
      makeWelfareRecord({ proposedDisposition: 'hostile' }),
      'file'
    )
    const clearance = evaluateAffiliationSiteClearance(siteClearanceInput())

    const decision = evaluateAffiliationFacilityFileAccess({
      filePermissionDecision: permission,
      siteClearanceDecision: clearance,
    })

    expect(permission.outcome).toBe('blocked')
    expect(clearance.outcome).toBe('allowed')
    expect(decision.outcome).toBe('blocked')
    expect(decision.reasonCodes).toContain('approved_hostile_status_blocked')
    expect(decision.reasonCodes).toContain('site_clearance_allowed')
  })

  it('keeps restricted file permission restricted with valid facility clearance', () => {
    const permission = evaluateEntityWelfareStatusPermission(makeWelfareRecord(), 'file')
    const clearance = evaluateAffiliationSiteClearance(siteClearanceInput())

    const decision = evaluateAffiliationFacilityFileAccess({
      filePermissionDecision: permission,
      siteClearanceDecision: clearance,
    })

    expect(permission.outcome).toBe('restricted')
    expect(clearance.outcome).toBe('allowed')
    expect(decision).toMatchObject({
      outcome: 'restricted',
      siteId: 'site:annex',
      facilityId: 'facility:archive',
      siteSpecific: true,
    })
  })

  it('restricts missing site or facility scope without fabricating access', () => {
    const permission = evaluateEntityWelfareStatusPermission(makeWelfareRecord(), 'file')
    const clearance = evaluateAffiliationSiteClearance(
      siteClearanceInput({
        context: {},
      })
    )

    const decision = evaluateAffiliationFacilityFileAccess({
      filePermissionDecision: permission,
      siteClearanceDecision: clearance,
    })

    expect(decision.outcome).toBe('restricted')
    expect(decision.siteSpecific).toBe(false)
    expect(decision.reasonCodes).toContain('missing_site_or_facility_scope')
  })

  it('returns stable sorted reason codes across repeated evaluation', () => {
    const permission = evaluateEntityWelfareStatusPermission(makeWelfareRecord(), 'file')
    const clearance = evaluateAffiliationSiteClearance(
      siteClearanceInput({
        context: {
          siteId: 'site:annex',
          facilityId: 'facility:archive',
          restrictedFacilityIds: ['facility:archive'],
        },
      })
    )

    const first = evaluateAffiliationFacilityFileAccess({
      filePermissionDecision: permission,
      siteClearanceDecision: clearance,
    })
    const second = evaluateAffiliationFacilityFileAccess({
      filePermissionDecision: permission,
      siteClearanceDecision: clearance,
    })

    expect(first.reasonCodes).toEqual([...first.reasonCodes].sort())
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
