import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import type { AffiliationPersonStatusRecord } from '../domain/affiliationPersonStatusRecords'
import { evaluateDeploymentEligibility } from '../domain/deploymentReadiness'
import { advanceWeek } from '../domain/sim/advanceWeek'
import type { Candidate } from '../domain/recruitment'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

function makeClearedCandidate(id: string, name: string): Candidate {
  return {
    id,
    name,
    age: 31,
    category: 'agent',
    hireStatus: 'available',
    weeklyCost: 20,
    weeklyWage: 20,
    funnelStage: 'hired',
    revealLevel: 2,
    expiryWeek: 52,
    origin: 'open-call',
    roleInclination: 'field',
    skills: ['recon-sweep'],
    liabilities: [],
    createdWeek: 1,
    lastUpdatedWeek: 1,
    evaluation: {
      overallVisible: true,
      overall: 65,
      overallValue: 65,
      potentialVisible: true,
      potentialTier: 'mid',
      rumorTags: [],
    },
    agentData: {
      role: 'field',
      specialization: 'recon',
      stats: {
        combat: 45,
        investigation: 55,
        utility: 50,
        social: 40,
      },
      traits: [],
    },
  } as Candidate
}

function weeklyRecord(
  overrides: Partial<AffiliationPersonStatusRecord> = {}
): AffiliationPersonStatusRecord {
  return {
    id: 'person-status:advance-week-weekly',
    subjectId: overrides.subjectId ?? 'subject:advance-week-weekly',
    subjectLabel: overrides.subjectLabel ?? 'Advance Week Contractor',
    candidateRef: overrides.candidateRef ?? 'candidate:advance-week-weekly',
    backgroundCleared: false,
    trainingCompleted: false,
    oathContractSigned: false,
    weeklyProgression: [
      {
        id: 'progression:advance-week-6',
        week: 6,
        backgroundCleared: true,
        trainingCompleted: true,
        oathContractSigned: true,
        grantedSiteIds: ['annex-7'],
        grantedFacilityIds: ['facility:archive'],
        protectedReviewEvidenceRefs: ['review:protected-week-6'],
      },
    ],
    ...overrides,
  }
}

describe('advanceWeek affiliation person-status weekly progression integration (SPE-2520)', () => {
  it('progresses seeded durable person-status records and surfaces weekly notes', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 5
    const record = weeklyRecord()
    state.affiliationPersonStatusRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const nextRecord = nextState.affiliationPersonStatusRecords?.[record.id]
    const latestReport = nextState.reports[nextState.reports.length - 1]
    const progressionNotes =
      latestReport?.notes?.filter(
        (note) => note.type === 'affiliation_person_status.weekly_progression'
      ) ?? []

    expect(nextState.week).toBe(6)
    expect(nextRecord?.backgroundCleared).toBe(true)
    expect(nextRecord?.trainingCompleted).toBe(true)
    expect(nextRecord?.oathContractSigned).toBe(true)
    expect(nextRecord?.grantedSiteIds).toEqual(['annex-7'])
    expect(nextRecord?.grantedFacilityIds).toEqual(['facility:archive'])
    expect(nextRecord?.protectedReviewEvidenceRefs).toEqual(['review:protected-week-6'])
    expect(nextRecord?.weeklyProgression).toEqual(record.weeklyProgression)
    expect(progressionNotes).toHaveLength(1)
    expect(progressionNotes[0]?.content).toContain('Advance Week Contractor')
    expect(progressionNotes[0]?.metadata?.recordId).toBe(record.id)
  })

  it('lets weekly durable person-status progression satisfy explicit mission clearance after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 5
    const missionId = Object.keys(state.cases)[0]
    const teamId = Object.keys(state.teams)[0]
    if (!missionId || !teamId) {
      throw new Error('Starting state requires at least one mission and team for routing coverage.')
    }

    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredTags: ['site-clearance:annex-7'],
      requiredRoles: [],
    }
    const memberId = state.teams[teamId]!.memberIds?.[0] ?? state.teams[teamId]!.agentIds[0]!
    const candidateId = `candidate:${memberId}`
    state.candidates = [makeClearedCandidate(candidateId, state.agents[memberId]!.name)]
    state.recruitmentPool = state.candidates
    const record = weeklyRecord({
      id: `person-status:${memberId}`,
      subjectId: memberId,
      subjectLabel: state.agents[memberId]!.name,
      candidateRef: candidateId,
    })
    state.affiliationPersonStatusRecords = {
      [record.id]: record,
    }

    const beforeEligibility = evaluateDeploymentEligibility(state, missionId, teamId)
    const nextState = advanceWeek(state)
    const afterEligibility = evaluateDeploymentEligibility(nextState, missionId, teamId)

    expect(beforeEligibility.hardBlockers).toContain('site-clearance-required')
    expect(afterEligibility.hardBlockers).not.toContain('site-clearance-required')
  })
})
