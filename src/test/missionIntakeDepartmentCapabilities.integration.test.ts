import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import type { AuthorityGraph } from '../domain/authorityGraph'
import {
  DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  type DepartmentCapabilityRegistry,
} from '../domain/departmentCapabilities'
import {
  evaluateMissionIntakeDepartmentCoordination,
  resolveMissionIntakeDepartments,
  shortlistMissionCandidateTeams,
} from '../domain/missionIntakeRouting'

describe('SPE-2083/SPE-2084 mission-intake department read seams', () => {
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

  it('forwards authority aliases while revalidating a custom fallback route', () => {
    const state = createStartingState()
    const currentCase = state.cases['case-001']
    const registry: DepartmentCapabilityRegistry = {
      departments: DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY.departments,
      fallbackDepartmentRefs: ['general-intake-desk'],
    }
    const authorityGraph: AuthorityGraph = {
      nodes: [
        {
          id: 'department:general-intake',
          nodeType: 'department',
          label: 'General Intake Department',
          aliases: [
            {
              aliasId: 'general-intake-desk',
              label: 'General Intake Desk',
              confidence: 'verified',
            },
          ],
        },
      ],
      edges: [],
    }
    const assignment = resolveMissionIntakeDepartments(currentCase, registry, authorityGraph)
    const departmentIds = [
      assignment.primaryDepartment?.departmentId,
      assignment.misfitRoute?.departmentId,
      ...assignment.supportingDepartments.map((entry) => entry.departmentId),
    ].filter((departmentId): departmentId is string => Boolean(departmentId))

    const result = evaluateMissionIntakeDepartmentCoordination(
      currentCase,
      departmentIds.map((departmentId) => ({
        departmentId,
        queuedCaseIds: [],
        weeklyCapacity: 1,
      })),
      registry,
      authorityGraph
    )

    expect(result.state).not.toBe('blocked')
    expect(result.reasons.map((reason) => reason.code)).not.toContain('invalid-department-registry')
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
