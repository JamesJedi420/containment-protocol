import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import type { AffiliationPersonStatusRecord } from '../domain/affiliationPersonStatusRecords'
import { evaluateDeploymentEligibility } from '../domain/deploymentReadiness'
import { advanceWeek } from '../domain/sim/advanceWeek'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

function weeklyRecord(): AffiliationPersonStatusRecord {
  return {
    id: 'person-status:advance-week-weekly',
    subjectId: 'subject:advance-week-weekly',
    subjectLabel: 'Advance Week Contractor',
    candidateRef: 'candidate:advance-week-weekly',
    backgroundCleared: false,
    trainingCompleted: false,
    oathContractSigned: false,
    weeklyProgression: [
      {
        id: 'progression:advance-week-6',
        week: 6,
        backgroundCleared: true,
        trainingCompleted: true,
        grantedSiteIds: ['site:annex-7'],
        grantedFacilityIds: ['facility:archive'],
        protectedReviewEvidenceRefs: ['review:protected-week-6'],
      },
    ],
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
    expect(nextRecord?.grantedSiteIds).toEqual(['site:annex-7'])
    expect(nextRecord?.grantedFacilityIds).toEqual(['facility:archive'])
    expect(nextRecord?.protectedReviewEvidenceRefs).toEqual(['review:protected-week-6'])
    expect(nextRecord?.weeklyProgression).toEqual(record.weeklyProgression)
    expect(progressionNotes).toHaveLength(1)
    expect(progressionNotes[0]?.content).toContain('Advance Week Contractor')
    expect(progressionNotes[0]?.metadata?.recordId).toBe(record.id)
  })

  it('leaves mission routing behavior unchanged by durable person-status records', () => {
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
    }
    const record = weeklyRecord()
    state.affiliationPersonStatusRecords = {
      [record.id]: record,
    }

    const beforeEligibility = evaluateDeploymentEligibility(state, missionId, teamId)
    const nextState = advanceWeek(state)
    const afterEligibility = evaluateDeploymentEligibility(nextState, missionId, teamId)

    expect(beforeEligibility.hardBlockers).toContain('site-clearance-required')
    expect(afterEligibility.hardBlockers).toContain('site-clearance-required')
  })
})
