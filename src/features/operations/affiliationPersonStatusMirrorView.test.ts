import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
  RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE,
} from '../../domain/affiliationPersonStatusRecords'
import {
  HOSTILE_TO_COOPERATIVE_FIXTURE,
  PENDING_TO_APPROVED_FIXTURE,
} from '../../domain/entityWelfareReclassificationRegistry'
import type { Candidate } from '../../domain/recruitment'
import { getAffiliationPersonStatusMirrorView } from './affiliationPersonStatusMirrorView'

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
    expect(view.records.map((record) => record.id)).toEqual([
      COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE.id,
    ])

    const cooperative = view.records[0]
    const restricted = view.records[1]

    expect(cooperative?.subjectLabel).toBe('Cooperative Contractor')
    expect(cooperative?.onboardingLabels).toContain('Stage: Cleared')
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
    expect(record?.onboardingLabels).toEqual(['Candidate: -', 'Access: -'])
  })
})
