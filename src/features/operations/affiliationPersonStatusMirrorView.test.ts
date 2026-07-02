import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
  RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE,
} from '../../domain/affiliationPersonStatusRecords'
import { buildAffiliationFileWorkQueueActionRecord } from '../../domain/affiliationFileWorkQueueActionRecords'
import { buildAffiliationFileWorkQueueEvidenceResolutionRecord } from '../../domain/affiliationFileWorkQueueEvidenceResolutionRecords'
import { buildAffiliationFileWorkQueueRepairActionRecord } from '../../domain/affiliationFileWorkQueueRepairActionRecords'
import {
  HOSTILE_TO_COOPERATIVE_FIXTURE,
  PENDING_TO_APPROVED_FIXTURE,
} from '../../domain/entityWelfareReclassificationRegistry'
import type { Candidate } from '../../domain/recruitment'
import {
  getAffiliationPersonStatusMirrorView,
  getFileAccessWorkQueueRecommendedAction,
} from './affiliationPersonStatusMirrorView'

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

function makeStatusGame() {
  const game = createStartingState()
  game.candidates = [makeCandidate()]
  game.recruitmentPool = [makeCandidate()]
  game.entityWelfareReclassificationRecords = {
    [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    [HOSTILE_TO_COOPERATIVE_FIXTURE.id]: HOSTILE_TO_COOPERATIVE_FIXTURE,
  }
  game.affiliationPersonStatusRecords = {
    [RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE.id]:
      RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE,
    [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
  }

  return game
}

describe('affiliationPersonStatusMirrorView (SPE-2519 slice 1)', () => {
  it('returns an empty mirror when affiliation person-status records are absent', () => {
    const view = getAffiliationPersonStatusMirrorView(createStartingState())

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.records).toEqual([])
  })

  it('projects durable records through existing SPE-1046 snapshot labels in stable id order', () => {
    const game = makeStatusGame()
    const view = getAffiliationPersonStatusMirrorView(game)

    expect(view.isEmpty).toBe(false)
    expect(view.summary.totalRecords).toBe(2)
    expect(view.summary.candidateLinkedCount).toBe(1)
    expect(view.summary.welfareLinkedCount).toBe(2)
    expect(view.summary.restrictedOrBlockedCount).toBe(2)
    expect(view.summary.fileAccessWorkQueueCount).toBe(2)
    expect(view.summary.fileAccessBlockedCount).toBe(0)
    expect(view.summary.fileAccessRestrictedCount).toBe(2)
    expect(view.summary.fileAccessMissingReviewCount).toBe(0)
    expect(view.fileAccessWorkQueue.map((entry) => [entry.id, entry.bucketLabel])).toEqual([
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id, 'Restricted'],
      [RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE.id, 'Restricted'],
    ])
    expect(view.fileAccessWorkQueue[0]).toMatchObject({
      recommendedActionKind: 'route_restricted_review',
      recommendedActionLabel: 'Route restricted review',
      recommendedActionDetail:
        'Supervisor or review-gate handling is required before any file release.',
    })
    expect(view.records.map((record) => record.id)).toEqual([
      COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE.id,
    ])

    const cooperative = view.records[0]
    const restricted = view.records[1]

    expect(cooperative?.subjectLabel).toBe('Cooperative Contractor')
    expect(cooperative?.onboardingLabels).toContain('Stage: Cleared')
    expect(cooperative?.roomAccessLabels).toEqual([
      'Room access: Blocked',
      'Reasons: approved_cooperative_unrestricted_room_blocked',
    ])
    expect(cooperative?.fileAccessLabels).toEqual([
      'File access: Restricted',
      'Reasons: approved_cooperative_file_restricted',
    ])
    expect(cooperative?.facilityFileAccessLabels).toContain('Facility file access: Restricted')
    expect(cooperative?.facilityFileAccessLabels).toContain('Site: Annex 7')
    expect(cooperative?.facilityFileAccessLabels).toContain('Facility: Briefing Room')
    expect(cooperative?.housingAccessLabels).toEqual([
      'Housing access: Allowed',
      'Reasons: approved_cooperative_housing_allowed',
    ])
    expect(cooperative?.siteClearanceLabels).toContain('Mission: Allowed')
    expect(cooperative?.permissionDecisionLabels).toContain('Mission: Restricted')
    expect(restricted?.dualLoyaltyLabels).toContain('Risk: Restricted')
    expect(restricted?.revocationLabels.some((label) => label.startsWith('Trust: '))).toBe(true)

    const first = JSON.stringify(getAffiliationPersonStatusMirrorView(game))
    const second = JSON.stringify(getAffiliationPersonStatusMirrorView(game))

    expect(first).toBe(second)
  })

  it('surfaces missing refs as reason-code labels without fabricating access', () => {
    const game = createStartingState()
    game.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        candidateRef: 'candidate:missing',
        entityWelfareReclassificationRef: 'reclass:missing',
      },
    }

    const view = getAffiliationPersonStatusMirrorView(game)
    const record = view.records[0]

    expect(view.summary.missingReferenceCount).toBe(1)
    expect(record?.reasonCodeLabels).toContain('missing_candidate_ref')
    expect(record?.reasonCodeLabels).toContain('missing_entity_welfare_reclassification_ref')
    expect(record?.permissionDecisionLabels).toEqual(['-'])
    expect(record?.roomAccessLabels).toEqual(['Room access: -'])
    expect(record?.fileAccessLabels).toEqual(['File access: -'])
    expect(record?.facilityFileAccessLabels).toEqual(['Facility file access: -'])
    expect(record?.housingAccessLabels).toEqual(['Housing access: -'])
    expect(record?.onboardingLabels).toEqual(['Candidate: -', 'Access: -'])
    expect(view.summary.fileAccessMissingReviewCount).toBe(1)
    expect(view.fileAccessWorkQueue[0]).toMatchObject({
      id: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      bucket: 'missing_review',
      bucketLabel: 'Missing review',
      fileAccessLabel: 'File access: -',
      facilityFileAccessLabel: 'Facility file access: -',
      siteLabel: 'Site: -',
      facilityLabel: 'Facility: -',
      recommendedActionKind: 'resolve_missing_review',
      recommendedActionLabel: 'Resolve missing review',
      recommendedActionDetail:
        'Attach missing candidate, welfare, onboarding, file, or site evidence before evaluating access.',
    })
    expect(view.fileAccessWorkQueue[0]?.reasonCodeLabels).toEqual([
      'missing_candidate_ref',
      'missing_entity_welfare_reclassification_ref',
      'missing_onboarding_clearance',
    ])
  })

  it('surfaces blocked file access from linked SPE-1046 welfare decisions', () => {
    const game = createStartingState()
    const blockedWelfareRecord = {
      ...HOSTILE_TO_COOPERATIVE_FIXTURE,
      id: 'reclass:file-blocked',
      label: 'Blocked file custody',
      proposedDisposition: 'hostile',
      reclassificationState: 'denied',
    } as const
    game.entityWelfareReclassificationRecords = {
      [blockedWelfareRecord.id]: blockedWelfareRecord,
    }
    game.affiliationPersonStatusRecords = {
      'person-status:file-blocked': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:file-blocked',
        subjectId: 'subject:file-blocked',
        subjectLabel: 'File Blocked Subject',
        candidateRef: undefined,
        entityWelfareReclassificationRef: blockedWelfareRecord.id,
        permissionSurface: 'file',
      },
    }

    const view = getAffiliationPersonStatusMirrorView(game)
    const record = view.records[0]

    expect(view.summary.restrictedOrBlockedCount).toBe(1)
    expect(view.summary.fileAccessBlockedCount).toBe(1)
    expect(view.fileAccessWorkQueue[0]?.bucketLabel).toBe('Blocked')
    expect(view.fileAccessWorkQueue[0]).toMatchObject({
      recommendedActionKind: 'hold_blocked_access',
      recommendedActionLabel: 'Hold access',
      recommendedActionDetail:
        'Resolve blocked file, site, or facility reason before moving this file workflow forward.',
    })
    expect(record?.fileAccessLabels).toEqual([
      'File access: Blocked',
      'Reasons: denied_reclassification_blocked',
    ])
    expect(record?.facilityFileAccessLabels).toContain('Facility file access: Blocked')
    expect(record?.permissionDecisionLabels).toContain('File: Blocked')
  })

  it('surfaces restricted room and housing access from linked SPE-1046 welfare decisions', () => {
    const game = createStartingState()
    const restrictedWelfareRecord = {
      ...HOSTILE_TO_COOPERATIVE_FIXTURE,
      id: 'reclass:room-housing-restricted',
      label: 'Protected housing review',
      proposedDisposition: 'sapient_remains',
      reclassificationState: 'approved',
    } as const
    game.entityWelfareReclassificationRecords = {
      [restrictedWelfareRecord.id]: restrictedWelfareRecord,
    }
    game.affiliationPersonStatusRecords = {
      'person-status:room-housing-restricted': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:room-housing-restricted',
        subjectId: 'subject:room-housing-restricted',
        subjectLabel: 'Room Housing Restricted Subject',
        candidateRef: undefined,
        entityWelfareReclassificationRef: restrictedWelfareRecord.id,
        permissionSurface: 'room',
      },
    }

    const view = getAffiliationPersonStatusMirrorView(game)
    const record = view.records[0]

    expect(view.summary.restrictedOrBlockedCount).toBe(1)
    expect(record?.roomAccessLabels).toEqual([
      'Room access: Restricted',
      'Reasons: approved_sapient_remains_room_protected_restricted',
    ])
    expect(record?.housingAccessLabels).toEqual([
      'Housing access: Restricted',
      'Reasons: approved_sapient_remains_housing_protected_restricted',
    ])
    expect(record?.permissionDecisionLabels).toContain('Room: Restricted')
    expect(record?.permissionDecisionLabels).toContain('Housing: Restricted')
  })

  it('maps every file-access queue bucket to stable recommended action guidance', () => {
    expect(getFileAccessWorkQueueRecommendedAction('missing_review')).toEqual({
      recommendedActionKind: 'resolve_missing_review',
      recommendedActionLabel: 'Resolve missing review',
      recommendedActionDetail:
        'Attach missing candidate, welfare, onboarding, file, or site evidence before evaluating access.',
    })
    expect(getFileAccessWorkQueueRecommendedAction('blocked')).toEqual({
      recommendedActionKind: 'hold_blocked_access',
      recommendedActionLabel: 'Hold access',
      recommendedActionDetail:
        'Resolve blocked file, site, or facility reason before moving this file workflow forward.',
    })
    expect(getFileAccessWorkQueueRecommendedAction('restricted')).toEqual({
      recommendedActionKind: 'route_restricted_review',
      recommendedActionLabel: 'Route restricted review',
      recommendedActionDetail:
        'Supervisor or review-gate handling is required before any file release.',
    })
    expect(getFileAccessWorkQueueRecommendedAction('allowed')).toEqual({
      recommendedActionKind: 'monitor_allowed_access',
      recommendedActionLabel: 'Monitor allowed access',
      recommendedActionDetail: 'Audit visibility only; no intervention is required.',
    })
  })

  it('joins recorded operator actions onto queue rows without changing ordering', () => {
    const game = makeStatusGame()
    const recorded = buildAffiliationFileWorkQueueActionRecord({
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      subjectId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectId,
      subjectLabel: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectLabel,
      actionKind: 'route_restricted_review',
      actionLabel: 'Route restricted review',
      sourceBucket: 'restricted',
      sourceReasonCodes: ['site_clearance_allowed', 'file_permission_restricted'],
      recordedWeek: 6,
    })
    game.affiliationFileWorkQueueActionRecords = {
      [recorded.id]: recorded,
    }

    const view = getAffiliationPersonStatusMirrorView(game)

    expect(view.fileAccessWorkQueue.map((entry) => entry.id)).toEqual([
      COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE.id,
    ])
    expect(view.fileAccessWorkQueue[0]).toMatchObject({
      isRecommendedActionRecorded: true,
      recordedActionLabel: 'Recorded W6',
    })
    expect(view.fileAccessWorkQueue[1]).toMatchObject({
      isRecommendedActionRecorded: false,
    })
  })

  it('joins evidence-resolution records onto missing-review queue rows without changing ordering', () => {
    const game = makeStatusGame()
    game.affiliationPersonStatusRecords = {
      'person-status:missing-review': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:missing-review',
        subjectId: 'subject:missing-review',
        subjectLabel: 'Missing Review Subject',
        candidateRef: 'candidate:missing',
        entityWelfareReclassificationRef: 'reclass:missing',
      },
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]:
        COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
    }
    const recorded = buildAffiliationFileWorkQueueEvidenceResolutionRecord({
      workQueueEntryId: 'person-status:missing-review',
      subjectId: 'subject:missing-review',
      subjectLabel: 'Missing Review Subject',
      sourceBucket: 'missing_review',
      missingReasonCodes: [
        'missing_candidate_ref',
        'missing_entity_welfare_reclassification_ref',
        'missing_onboarding_clearance',
      ],
      recordedWeek: 8,
    })
    game.affiliationFileWorkQueueEvidenceResolutionRecords = {
      [recorded.id]: recorded,
    }
    const repairAction = buildAffiliationFileWorkQueueRepairActionRecord({
      workQueueEntryId: 'person-status:missing-review',
      subjectId: 'subject:missing-review',
      subjectLabel: 'Missing Review Subject',
      reasonCode: 'missing_candidate_ref',
      repairLabel: 'Candidate link repair: attach or restore recruitment candidate evidence.',
      recordedWeek: 9,
    })
    game.affiliationFileWorkQueueRepairActionRecords = {
      [repairAction.id]: repairAction,
    }

    const view = getAffiliationPersonStatusMirrorView(game)

    expect(view.fileAccessWorkQueue.map((entry) => entry.id)).toEqual([
      COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      'person-status:missing-review',
    ])
    expect(view.fileAccessWorkQueue[1]).toMatchObject({
      bucket: 'missing_review',
      canRecordEvidenceResolution: false,
      isEvidenceResolutionRecorded: true,
      evidenceResolutionLabel: 'Evidence resolution recorded W8',
      evidenceRepairCandidates: [
        {
          reasonCode: 'missing_candidate_ref',
          repairLabel: 'Candidate link repair: attach or restore recruitment candidate evidence.',
          isRepairActionRecorded: true,
          repairActionLabel: 'Repair recorded W9',
        },
        {
          reasonCode: 'missing_entity_welfare_reclassification_ref',
          repairLabel:
            'Welfare link repair: attach or restore entity welfare reclassification evidence.',
          isRepairActionRecorded: false,
        },
        {
          reasonCode: 'missing_onboarding_clearance',
          repairLabel: 'Onboarding repair: attach or restore clearance readiness evidence.',
          isRepairActionRecorded: false,
        },
      ],
    })
  })

  it('moves repaired candidate evidence out of missing-review through existing derivations', () => {
    const game = createStartingState()
    game.recruitmentPool = [makeCandidate({ id: 'candidate:repaired', name: 'Repaired Subject' })]
    game.candidates = [makeCandidate({ id: 'candidate:repaired', name: 'Repaired Subject' })]
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    }
    game.affiliationPersonStatusRecords = {
      'person-status:repaired-candidate': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:repaired-candidate',
        subjectId: 'subject:repaired-candidate',
        subjectLabel: 'Repaired Subject',
        candidateRef: 'candidate:repaired',
        entityWelfareReclassificationRef: PENDING_TO_APPROVED_FIXTURE.id,
      },
    }

    const view = getAffiliationPersonStatusMirrorView(game)

    expect(view.summary.missingReferenceCount).toBe(0)
    expect(view.summary.fileAccessMissingReviewCount).toBe(0)
    expect(view.fileAccessWorkQueue[0]).toMatchObject({
      id: 'person-status:repaired-candidate',
      bucket: 'restricted',
      fileAccessLabel: 'File access: Restricted',
      facilityFileAccessLabel: 'Facility file access: Restricted',
    })
    expect(view.records[0]?.reasonCodeLabels).not.toContain('missing_candidate_ref')
  })

  it('moves repaired welfare evidence out of missing-review through existing derivations', () => {
    const game = createStartingState()
    game.recruitmentPool = [makeCandidate({ id: 'candidate:present', name: 'Welfare Subject' })]
    game.candidates = [makeCandidate({ id: 'candidate:present', name: 'Welfare Subject' })]
    game.entityWelfareReclassificationRecords = {
      'reclass:welfare-repaired': {
        id: 'reclass:welfare-repaired',
        label: 'Welfare Subject welfare link repair',
        summary: 'Minimal restored welfare reclassification evidence from file work queue repair.',
        priorThreatLabel: 'unreviewed affiliation custody',
        proposedDisposition: 'unknown',
        reclassificationState: 'pending',
        evidenceBundleRefs: ['affiliation-file-work-queue-repair:reclass:welfare-repaired:week-12'],
        confidence: 0.5,
      },
    }
    game.affiliationPersonStatusRecords = {
      'person-status:repaired-welfare': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:repaired-welfare',
        subjectId: 'subject:repaired-welfare',
        subjectLabel: 'Welfare Subject',
        candidateRef: 'candidate:present',
        entityWelfareReclassificationRef: 'reclass:welfare-repaired',
      },
    }

    const view = getAffiliationPersonStatusMirrorView(game)

    expect(view.records[0]?.reasonCodeLabels).not.toContain(
      'missing_entity_welfare_reclassification_ref'
    )
    expect(view.fileAccessWorkQueue[0]).toMatchObject({
      id: 'person-status:repaired-welfare',
      bucket: 'restricted',
      fileAccessLabel: 'File access: Restricted',
      facilityFileAccessLabel: 'Facility file access: Restricted',
    })
  })

  it('moves repaired onboarding evidence out of missing-review through existing derivations', () => {
    const game = createStartingState()
    game.recruitmentPool = [
      makeCandidate({
        id: 'candidate:subject:onboarding-repaired:onboarding-repair',
        name: 'Onboarding Subject',
      }),
    ]
    game.candidates = [...game.recruitmentPool]
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    }
    game.affiliationPersonStatusRecords = {
      'person-status:repaired-onboarding': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:repaired-onboarding',
        subjectId: 'subject:onboarding-repaired',
        subjectLabel: 'Onboarding Subject',
        candidateRef: 'candidate:subject:onboarding-repaired:onboarding-repair',
        entityWelfareReclassificationRef: PENDING_TO_APPROVED_FIXTURE.id,
        backgroundCleared: true,
        trainingCompleted: true,
        oathContractSigned: true,
      },
    }

    const view = getAffiliationPersonStatusMirrorView(game)

    expect(view.records[0]?.reasonCodeLabels).not.toContain('missing_onboarding_clearance')
    expect(view.fileAccessWorkQueue[0]).toMatchObject({
      id: 'person-status:repaired-onboarding',
      bucket: 'restricted',
      fileAccessLabel: 'File access: Restricted',
      facilityFileAccessLabel: 'Facility file access: Restricted',
    })
  })
})
