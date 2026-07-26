import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import {
  resolveMissionIntakeDepartments,
  shortlistMissionCandidateTeams,
} from '../domain/missionIntakeRouting'

describe('SPE-2083 mission-intake department resolution seam', () => {
  it('routes from canonical case category and tags without caller-authored requirements', () => {
    const state = createStartingState()
    const currentCase = {
      ...state.cases['case-001'],
      status: 'open' as const,
      assignedTeamIds: [],
      tags: ['biohazard', 'containment'],
      requiredTags: [],
      preferredTags: ['records-review'],
      stage: 1,
    }

    const result = resolveMissionIntakeDepartments(currentCase)

    expect(result.routeKind).toBe('matched')
    expect(result.requirements).toEqual({
      primaryCapability: 'containment',
      primaryTaskType: 'containment_response',
      supportingCapabilities: ['emergency_response', 'records'],
    })
    expect(result.primaryDepartment?.departmentId).toBe('department:biohazard-response')
  })

  it('is read-only and leaves canonical team candidate ranking unchanged', () => {
    const state = createStartingState()
    const missionId = 'case-001'
    const stateBefore = JSON.stringify(state)
    const candidatesBefore = shortlistMissionCandidateTeams(state, missionId)

    const first = resolveMissionIntakeDepartments(state.cases[missionId])
    const second = resolveMissionIntakeDepartments(state.cases[missionId])
    const candidatesAfter = shortlistMissionCandidateTeams(state, missionId)

    expect(second).toEqual(first)
    expect(candidatesAfter).toEqual(candidatesBefore)
    expect(JSON.stringify(state)).toBe(stateBefore)
  })
})
