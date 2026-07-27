import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import {
  evaluateMissionIntakeDepartmentCoordination,
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

  it('recognizes the canonical containment-breach compound tag', () => {
    const state = createStartingState()
    const currentCase = {
      ...state.cases['case-001'],
      kind: 'case' as const,
      status: 'open' as const,
      assignedTeamIds: [],
      tags: ['containment-breach'],
      requiredTags: [],
      preferredTags: [],
      stage: 1,
    }

    const result = resolveMissionIntakeDepartments(currentCase)

    expect(result.routeKind).toBe('matched')
    expect(result.requirements.primaryCapability).toBe('containment')
    expect(result.primaryDepartment?.departmentId).toBe('department:field-containment')
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

  it('composes caller workload snapshots without changing team ranking or mission state', () => {
    const state = createStartingState()
    const missionId = 'case-001'
    const currentCase = state.cases[missionId]
    const departmentAssignment = resolveMissionIntakeDepartments(currentCase)
    const departmentIds = [
      departmentAssignment.primaryDepartment?.departmentId,
      ...departmentAssignment.supportingDepartments.map((entry) => entry.departmentId),
    ].filter((departmentId): departmentId is string => Boolean(departmentId))
    const workloads = departmentIds.map((departmentId) => ({
      departmentId,
      queuedCaseIds: [],
      weeklyCapacity: 1,
    }))
    const stateBefore = JSON.stringify(state)
    const candidatesBefore = shortlistMissionCandidateTeams(state, missionId)

    const first = evaluateMissionIntakeDepartmentCoordination(currentCase, workloads)
    const replay = evaluateMissionIntakeDepartmentCoordination(
      currentCase,
      [...workloads].reverse()
    )

    expect(replay).toEqual(first)
    expect(first.departmentIds).toEqual([...departmentIds].sort())
    expect(shortlistMissionCandidateTeams(state, missionId)).toEqual(candidatesBefore)
    expect(JSON.stringify(state)).toBe(stateBefore)
  })
})
