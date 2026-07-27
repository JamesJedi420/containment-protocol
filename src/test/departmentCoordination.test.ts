import { describe, expect, it } from 'vitest'

import {
  evaluateDepartmentCoordination,
  type DepartmentWorkloadSnapshot,
} from '../domain/departmentCoordination'
import type {
  DepartmentCapabilityRegistry,
  DepartmentDefinition,
  DepartmentResolutionResult,
} from '../domain/departmentCapabilities'

function department(
  id: string,
  overrides: Partial<DepartmentDefinition> = {}
): DepartmentDefinition {
  return {
    id,
    label: id,
    capabilities: ['research', 'records'],
    taskTypes: ['research_case', 'records_review'],
    reviewAuthorities: ['research_release', 'records_release'],
    reputation: 70,
    fundingTier: 3,
    hqSiteId: `site:${id}`,
    doctrineBias: 'evidence_first',
    doctrineTags: ['analysis'],
    limits: { capabilityLimits: [] },
    failureModes: ['review_bottleneck'],
    ...overrides,
  }
}

function registry(...departments: DepartmentDefinition[]): DepartmentCapabilityRegistry {
  return {
    departments: [
      ...departments,
      department('department:fallback', {
        capabilities: [],
        taskTypes: [],
        reviewAuthorities: [],
        reputation: 50,
        doctrineBias: 'balanced',
        doctrineTags: ['general_intake'],
        failureModes: ['capability_gap'],
      }),
    ],
    fallbackDepartmentRefs: ['department:fallback'],
  }
}

function assignment(
  primaryDepartmentId = 'department:alpha',
  supportingDepartmentIds: readonly string[] = ['department:beta']
): DepartmentResolutionResult {
  return {
    caseId: 'case:test',
    routeKind: 'matched',
    requirements: {
      primaryCapability: 'research',
      primaryTaskType: 'research_case',
      supportingCapabilities: ['records'],
    },
    primaryDepartment: {
      departmentId: primaryDepartmentId,
      matchedCapabilities: ['research'],
      doctrineMatches: [],
    },
    supportingDepartments: supportingDepartmentIds.map((departmentId) => ({
      departmentId,
      matchedCapabilities: ['records'],
      doctrineMatches: [],
    })),
    misfitRoute: null,
    blockerCodes: [],
  }
}

function snapshot(
  departmentId: string,
  queuedCaseIds: readonly string[] = [],
  weeklyCapacity = 1
): DepartmentWorkloadSnapshot {
  return { departmentId, queuedCaseIds, weeklyCapacity }
}

describe('cross-department coordination evaluator (SPE-2084)', () => {
  it('returns aligned for compatible departments with available capacity', () => {
    const alpha = department('department:alpha')
    const beta = department('department:beta')

    expect(
      evaluateDepartmentCoordination(
        assignment(),
        [snapshot(beta.id), snapshot(alpha.id)],
        registry(beta, alpha)
      )
    ).toEqual({
      caseId: 'case:test',
      state: 'aligned',
      delayWeeks: 0,
      departmentIds: ['department:alpha', 'department:beta'],
      bottleneckDepartmentIds: [],
      assignmentBlockerCodes: [],
      reasons: [
        {
          code: 'doctrine-aligned',
          departmentIds: ['department:alpha', 'department:beta'],
          delayWeeks: 0,
        },
      ],
    })
  })

  it('returns disputed with a deterministic doctrine delay for a conflicting pair', () => {
    const evidence = department('department:evidence', { doctrineBias: 'evidence_first' })
    const containment = department('department:containment', {
      doctrineBias: 'containment_first',
    })

    const result = evaluateDepartmentCoordination(
      assignment(evidence.id, [containment.id]),
      [snapshot(containment.id), snapshot(evidence.id)],
      registry(containment, evidence)
    )

    expect(result.state).toBe('disputed')
    expect(result.delayWeeks).toBe(1)
    expect(result.reasons).toContainEqual({
      code: 'doctrine-conflict',
      departmentIds: ['department:containment', 'department:evidence'],
      delayWeeks: 1,
    })
  })

  it('keeps doctrine state precedence while adding the slowest queue delay', () => {
    const evidence = department('department:evidence', { doctrineBias: 'evidence_first' })
    const containment = department('department:containment', {
      doctrineBias: 'containment_first',
    })

    const result = evaluateDepartmentCoordination(
      assignment(evidence.id, [containment.id]),
      [snapshot(containment.id), snapshot(evidence.id, ['case:queued-1', 'case:queued-2'], 1)],
      registry(evidence, containment)
    )

    expect(result.state).toBe('disputed')
    expect(result.delayWeeks).toBe(3)
    expect(result.bottleneckDepartmentIds).toEqual(['department:evidence'])
    expect(result.reasons.map((reason) => reason.code)).toEqual([
      'queue-capacity-delay',
      'doctrine-conflict',
    ])
  })

  it('uses the slowest parallel queue and preserves all equal-load bottlenecks', () => {
    const alpha = department('department:alpha')
    const beta = department('department:beta')
    const workloads = [
      snapshot(beta.id, ['case:b-1', 'case:b-2'], 1),
      snapshot(alpha.id, ['case:a-1', 'case:a-2', 'case:a-3', 'case:a-4'], 2),
    ]

    const first = evaluateDepartmentCoordination(assignment(), workloads, registry(beta, alpha))
    const replay = evaluateDepartmentCoordination(
      assignment(),
      [...workloads].reverse(),
      registry(alpha, beta)
    )

    expect(first.state).toBe('delayed')
    expect(first.delayWeeks).toBe(2)
    expect(first.bottleneckDepartmentIds).toEqual(['department:alpha', 'department:beta'])
    expect(first.reasons).toEqual([
      {
        code: 'queue-capacity-delay',
        departmentIds: ['department:alpha'],
        delayWeeks: 2,
      },
      {
        code: 'queue-capacity-delay',
        departmentIds: ['department:beta'],
        delayWeeks: 2,
      },
    ])
    expect(replay).toEqual(first)
  })

  it('uses an already-queued case position instead of appending it twice', () => {
    const alpha = department('department:alpha')
    const beta = department('department:beta')

    const result = evaluateDepartmentCoordination(
      assignment(),
      [snapshot(alpha.id, ['case:test', 'case:later'], 1), snapshot(beta.id, [], 1)],
      registry(alpha, beta)
    )

    expect(result.state).toBe('aligned')
    expect(result.delayWeeks).toBe(0)
  })

  it('adds a cooperation delay for a low-reputation department', () => {
    const alpha = department('department:alpha')
    const beta = department('department:beta', { reputation: 49 })

    const result = evaluateDepartmentCoordination(
      assignment(),
      [snapshot(alpha.id), snapshot(beta.id)],
      registry(alpha, beta)
    )

    expect(result.state).toBe('delayed')
    expect(result.delayWeeks).toBe(1)
    expect(result.reasons).toContainEqual({
      code: 'low-reputation-cooperation',
      departmentIds: ['department:beta'],
      delayWeeks: 1,
    })
  })

  it('keeps an explicit SPE-2083 fallback route deterministic and delayed', () => {
    const fallbackAssignment: DepartmentResolutionResult = {
      ...assignment(),
      routeKind: 'fallback',
      primaryDepartment: null,
      supportingDepartments: [],
      misfitRoute: {
        departmentId: 'department:fallback',
        reasonCode: 'no-primary-capability-match',
        lowPriority: true,
        stigmaTag: 'capability-misfit',
      },
    }

    const result = evaluateDepartmentCoordination(
      fallbackAssignment,
      [snapshot('department:fallback')],
      registry()
    )

    expect(result).toMatchObject({
      state: 'delayed',
      delayWeeks: 1,
      departmentIds: ['department:fallback'],
      reasons: [
        {
          code: 'fallback-route',
          departmentIds: ['department:fallback'],
          delayWeeks: 1,
        },
      ],
    })
  })

  it.each([
    {
      label: 'missing workload',
      workloads: [snapshot('department:alpha')],
      code: 'missing-workload-snapshot',
      departmentIds: ['department:beta'],
    },
    {
      label: 'zero capacity',
      workloads: [snapshot('department:alpha'), snapshot('department:beta', [], 0)],
      code: 'zero-department-capacity',
      departmentIds: ['department:beta'],
    },
    {
      label: 'negative capacity',
      workloads: [snapshot('department:alpha'), snapshot('department:beta', [], -1)],
      code: 'invalid-workload-snapshot',
      departmentIds: ['department:beta'],
    },
    {
      label: 'duplicate queue entries',
      workloads: [
        snapshot('department:alpha'),
        snapshot('department:beta', ['case:duplicate', 'case:duplicate']),
      ],
      code: 'invalid-workload-snapshot',
      departmentIds: ['department:beta'],
    },
    {
      label: 'sparse queue entries',
      workloads: [snapshot('department:alpha'), snapshot('department:beta', new Array<string>(1))],
      code: 'invalid-workload-snapshot',
      departmentIds: ['department:beta'],
    },
  ])('blocks malformed snapshots: $label', ({ workloads, code, departmentIds }) => {
    const alpha = department('department:alpha')
    const beta = department('department:beta')

    const result = evaluateDepartmentCoordination(assignment(), workloads, registry(alpha, beta))

    expect(result.state).toBe('blocked')
    expect(result.delayWeeks).toBe(0)
    expect(result.reasons).toEqual([{ code, departmentIds, delayWeeks: 0 }])
  })

  it('blocks duplicate assigned departments and duplicate relevant snapshots', () => {
    const alpha = department('department:alpha')
    const beta = department('department:beta')

    expect(
      evaluateDepartmentCoordination(
        assignment(alpha.id, [alpha.id]),
        [snapshot(alpha.id)],
        registry(alpha)
      ).reasons[0].code
    ).toBe('duplicate-department-assignment')

    expect(
      evaluateDepartmentCoordination(
        assignment(),
        [snapshot(alpha.id), snapshot(beta.id), snapshot(beta.id)],
        registry(alpha, beta)
      ).reasons[0].code
    ).toBe('duplicate-workload-snapshot')
  })

  it('fails closed for malformed assignments, registries, and missing definitions', () => {
    const alpha = department('department:alpha')
    const beta = department('department:beta')
    const noResearchAlpha = department('department:alpha', {
      capabilities: ['records'],
      taskTypes: ['records_review'],
      reviewAuthorities: ['records_release'],
    })
    const paddedAssignment = assignment(' department:alpha', [beta.id])
    const duplicateRegistry: DepartmentCapabilityRegistry = {
      departments: [alpha, alpha, beta],
      fallbackDepartmentRefs: [alpha.id],
    }
    const malformedPrimaryAssignment = assignment()
    if (!malformedPrimaryAssignment.primaryDepartment) {
      throw new Error('Expected matched assignment fixture to include a primary department.')
    }

    expect(
      evaluateDepartmentCoordination(
        paddedAssignment,
        [snapshot(alpha.id), snapshot(beta.id)],
        registry(alpha, beta)
      ).reasons[0].code
    ).toBe('invalid-department-assignment')

    expect(
      evaluateDepartmentCoordination(
        {
          ...assignment(),
          requirements: undefined,
        } as unknown as DepartmentResolutionResult,
        [snapshot(alpha.id), snapshot(beta.id)],
        registry(alpha, beta)
      ).reasons[0].code
    ).toBe('invalid-department-assignment')

    expect(
      evaluateDepartmentCoordination(
        assignment(),
        [snapshot(alpha.id), snapshot(beta.id)],
        registry(noResearchAlpha, beta)
      ).reasons[0].code
    ).toBe('invalid-department-assignment')

    expect(
      evaluateDepartmentCoordination(
        {
          ...malformedPrimaryAssignment,
          primaryDepartment: {
            ...malformedPrimaryAssignment.primaryDepartment,
            matchedCapabilities: [],
          },
        },
        [snapshot(alpha.id), snapshot(beta.id)],
        registry(alpha, beta)
      ).reasons[0].code
    ).toBe('invalid-department-assignment')

    expect(
      evaluateDepartmentCoordination(
        assignment(),
        [snapshot(alpha.id), snapshot(beta.id)],
        duplicateRegistry
      ).reasons[0].code
    ).toBe('invalid-department-registry')

    expect(
      evaluateDepartmentCoordination(
        assignment(),
        [snapshot(alpha.id), snapshot(beta.id)],
        null as unknown as DepartmentCapabilityRegistry
      ).reasons[0].code
    ).toBe('invalid-department-registry')

    expect(
      evaluateDepartmentCoordination(
        assignment(alpha.id, ['department:missing']),
        [snapshot(alpha.id), snapshot('department:missing')],
        registry(alpha)
      ).reasons[0].code
    ).toBe('missing-department-definition')
  })

  it('preserves SPE-2083 blocker codes without evaluating workloads', () => {
    const blockedAssignment: DepartmentResolutionResult = {
      ...assignment(),
      routeKind: 'blocked',
      primaryDepartment: null,
      supportingDepartments: [],
      blockerCodes: ['invalid-case-packet'],
    }

    expect(evaluateDepartmentCoordination(blockedAssignment, [], registry())).toEqual({
      caseId: 'case:test',
      state: 'blocked',
      delayWeeks: 0,
      departmentIds: [],
      bottleneckDepartmentIds: [],
      assignmentBlockerCodes: ['invalid-case-packet'],
      reasons: [
        {
          code: 'assignment-blocked',
          departmentIds: [],
          delayWeeks: 0,
        },
      ],
    })

    expect(
      evaluateDepartmentCoordination(
        {
          ...blockedAssignment,
          blockerCodes: {} as unknown as DepartmentResolutionResult['blockerCodes'],
        },
        [],
        registry()
      )
    ).toEqual({
      caseId: 'case:test',
      state: 'blocked',
      delayWeeks: 0,
      departmentIds: [],
      bottleneckDepartmentIds: [],
      assignmentBlockerCodes: [],
      reasons: [
        {
          code: 'assignment-blocked',
          departmentIds: [],
          delayWeeks: 0,
        },
      ],
    })
  })

  it('does not mutate assignments, registry definitions, or workload snapshots', () => {
    const alpha = department('department:alpha')
    const beta = department('department:beta')
    const inputAssignment = assignment()
    const inputRegistry = registry(alpha, beta)
    const workloads = [snapshot(alpha.id, ['case:a'], 1), snapshot(beta.id, ['case:b'], 1)]
    const before = JSON.stringify({ inputAssignment, inputRegistry, workloads })

    const result = evaluateDepartmentCoordination(inputAssignment, workloads, inputRegistry)

    expect(result.state).toBe('delayed')
    expect(JSON.stringify({ inputAssignment, inputRegistry, workloads })).toBe(before)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.departmentIds)).toBe(true)
    expect(Object.isFrozen(result.reasons)).toBe(true)
    expect(result.reasons.every((reason) => Object.isFrozen(reason))).toBe(true)
  })
})
