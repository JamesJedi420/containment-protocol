import { describe, expect, it } from 'vitest'

import {
  COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
  RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE,
  projectAffiliationPersonStatusSnapshot,
  projectAffiliationPersonStatusSnapshots,
  sanitizeAffiliationPersonStatusRecords,
} from '../domain/affiliationPersonStatusRecords'
import {
  HOSTILE_TO_COOPERATIVE_FIXTURE,
  PENDING_TO_APPROVED_FIXTURE,
} from '../domain/entityWelfareReclassificationRegistry'
import type { Candidate } from '../domain/recruitment'

function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: 'candidate:cooperative-contractor',
    name: 'Cooperative Contractor',
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

const welfareRecords = {
  [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
  [HOSTILE_TO_COOPERATIVE_FIXTURE.id]: HOSTILE_TO_COOPERATIVE_FIXTURE,
}

describe('affiliationPersonStatusRecords', () => {
  it('drops non-object, missing required, duplicate, mismatched-key, and invalid optional evidence', () => {
    const sanitized = sanitizeAffiliationPersonStatusRecords(
      {
        [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
          ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
          secondaryLoyaltyAnchors: ['academic', 'bad-anchor', 'academic'],
          revocationAffectedSurfaces: ['mission', 'bad-surface', 'file'],
          grantedSiteIds: [' site:annex-7 ', '', 'site:annex-7'],
          permissionSurface: 'bad-surface',
        },
        duplicateValue: {
          ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        },
        'wrong-key': {
          ...RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE,
        },
        missingLabel: {
          id: 'person-status:missing-label',
          subjectId: 'subject:missing-label',
          subjectLabel: '',
        },
        primitive: 'invalid',
      },
      {}
    )

    expect(Object.keys(sanitized)).toEqual([COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id])
    expect(
      sanitized[COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]?.secondaryLoyaltyAnchors
    ).toEqual(['academic'])
    expect(
      sanitized[COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]?.revocationAffectedSurfaces
    ).toEqual(['file', 'mission'])
    expect(sanitized[COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]?.grantedSiteIds).toEqual([
      'site:annex-7',
    ])
    expect(
      sanitized[COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]?.permissionSurface
    ).toBeUndefined()
  })

  it('keeps valid weekly progression entries in canonical week/id order', () => {
    const sanitized = sanitizeAffiliationPersonStatusRecords({
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        weeklyProgression: [
          {
            id: 'progression:week-4-b',
            week: 4,
            summary: ' Training package reviewed. ',
            trainingCompleted: true,
          },
          {
            id: 'progression:week-3',
            week: 3,
            backgroundCleared: true,
          },
          {
            id: 'progression:week-4-a',
            week: 4,
            oathContractSigned: true,
          },
        ],
      },
    })

    expect(sanitized[COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]?.weeklyProgression).toEqual([
      {
        id: 'progression:week-3',
        week: 3,
        backgroundCleared: true,
      },
      {
        id: 'progression:week-4-a',
        week: 4,
        oathContractSigned: true,
      },
      {
        id: 'progression:week-4-b',
        week: 4,
        summary: 'Training package reviewed.',
        trainingCompleted: true,
      },
    ])
  })

  it('drops invalid weekly progression entries without dropping the parent record', () => {
    const sanitized = sanitizeAffiliationPersonStatusRecords({
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        weeklyProgression: [
          {
            id: '',
            week: 4,
            backgroundCleared: true,
          },
          {
            id: 'progression:fractional-week',
            week: 4.5,
            trainingCompleted: true,
          },
          {
            id: 'progression:valid',
            week: 5,
            oathContractSigned: true,
          },
        ],
      },
    })

    expect(sanitized[COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]?.weeklyProgression).toEqual([
      {
        id: 'progression:valid',
        week: 5,
        oathContractSigned: true,
      },
    ])
  })

  it('trims dedupes and sorts weekly progression evidence arrays', () => {
    const sanitized = sanitizeAffiliationPersonStatusRecords({
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        weeklyProgression: [
          {
            id: 'progression:arrays',
            week: 4,
            grantedSiteIds: [' site:annex ', 'site:annex', 'site:archive'],
            blockedFacilityIds: ['facility:vault', '', ' facility:archive '],
            protectedReviewEvidenceRefs: ['review:z', 'review:a', 'review:z'],
          },
        ],
      },
    })

    expect(
      sanitized[COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]?.weeklyProgression?.[0]
    ).toMatchObject({
      grantedSiteIds: ['site:annex', 'site:archive'],
      blockedFacilityIds: ['facility:archive', 'facility:vault'],
      protectedReviewEvidenceRefs: ['review:a', 'review:z'],
    })
  })

  it('projects a durable person record through the existing SPE-1046 evaluator chain', () => {
    const snapshot = projectAffiliationPersonStatusSnapshot({
      record: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
      candidates: [makeCandidate()],
      entityWelfareReclassificationRecords: welfareRecords,
    })

    expect(snapshot.recordId).toBe(COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id)
    expect(snapshot.permissionDecisions.map((decision) => decision.surface)).toEqual([
      'room',
      'file',
      'gear',
      'housing',
      'mission',
    ])
    expect(snapshot.onboardingDecision?.stage).toBe('cleared')
    expect(snapshot.onboardingDecision?.fullAccessEligible).toBe(true)
    expect(snapshot.siteClearanceDecision.outcome).toBe('allowed')
    expect(snapshot.facilityFileAccessDecision?.outcome).toBe('restricted')
    expect(snapshot.facilityFileAccessDecision?.siteId).toBe('site:annex-7')
    expect(snapshot.facilityFileAccessDecision?.facilityId).toBe('facility:briefing-room')
    expect(snapshot.dualLoyaltyDecision.riskLevel).toBe('watch')
    expect(snapshot.protectedActionDecision.action).toBe('assign_mission')
    expect(snapshot.revocationDecision.kind).toBe('probation')
    expect(snapshot.reasonCodes).toEqual([...snapshot.reasonCodes].sort())
  })

  it('surfaces missing refs without fabricating candidate or welfare access', () => {
    const snapshot = projectAffiliationPersonStatusSnapshot({
      record: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        candidateRef: 'candidate:missing',
        entityWelfareReclassificationRef: 'reclass:missing',
      },
      candidates: [makeCandidate()],
      entityWelfareReclassificationRecords: welfareRecords,
    })

    expect(snapshot.reasonCodes).toContain('missing_candidate_ref')
    expect(snapshot.reasonCodes).toContain('missing_entity_welfare_reclassification_ref')
    expect(snapshot.permissionDecisions).toEqual([])
    expect(snapshot.onboardingDecision).toBeUndefined()
    expect(snapshot.siteClearanceDecision.outcome).not.toBe('allowed')
    expect(snapshot.facilityFileAccessDecision).toBeUndefined()
  })

  it('projects record maps in stable record-id order', () => {
    const snapshots = projectAffiliationPersonStatusSnapshots({
      records: {
        [RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE.id]:
          RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE,
        [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]:
          COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
      },
      candidates: [makeCandidate()],
      entityWelfareReclassificationRecords: welfareRecords,
    })

    expect(snapshots.map((snapshot) => snapshot.recordId)).toEqual([
      COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE.id,
    ])
    expect(snapshots[1]?.dualLoyaltyDecision.riskLevel).toBe('restricted')
  })
})
