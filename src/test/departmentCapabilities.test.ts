import { describe, expect, it } from 'vitest'

import type { AuthorityGraph } from '../domain/authorityGraph'
import {
  DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  deriveDepartmentCaseRequirements,
  resolveDepartmentDefinitionReference,
  resolveDepartments,
  validateDepartmentCapabilityRegistry,
} from '../domain/departmentCapabilities'
import type {
  DepartmentCapabilityRegistry,
  DepartmentDefinition,
} from '../domain/departmentCapabilities'

function department(
  id: string,
  overrides: Partial<DepartmentDefinition> = {}
): DepartmentDefinition {
  return {
    id,
    label: id,
    capabilities: ['research'],
    taskTypes: ['research_case'],
    reviewAuthorities: ['research_release'],
    reputation: 50,
    fundingTier: 3,
    hqSiteId: `site:${id}`,
    doctrineBias: 'balanced',
    doctrineTags: [],
    limits: { capabilityLimits: [] },
    failureModes: ['capability_gap'],
    ...overrides,
  }
}

function registry(
  departments: readonly DepartmentDefinition[],
  fallbackDepartmentRefs: readonly string[] = ['department:fallback']
): DepartmentCapabilityRegistry {
  return {
    departments: [
      ...departments,
      department('department:fallback', {
        capabilities: [],
        taskTypes: [],
        reviewAuthorities: [],
      }),
    ],
    fallbackDepartmentRefs,
  }
}

function packet(overrides: Partial<Parameters<typeof resolveDepartments>[0]> = {}) {
  return {
    caseId: 'case:test',
    missionCategory: 'investigation_lead' as const,
    caseTags: ['analysis'],
    ...overrides,
  }
}

function authorityGraph(overrides: Partial<AuthorityGraph> = {}): AuthorityGraph {
  return {
    nodes: [
      {
        id: 'department:records',
        nodeType: 'department',
        label: 'Records Department',
        aliases: [
          {
            aliasId: 'records-desk',
            label: 'Records Desk',
            confidence: 'verified',
          },
        ],
        linkedDepartmentIds: ['dept:records'],
      },
    ],
    edges: [],
    ...overrides,
  }
}

describe('department capability registry and resolver (SPE-2083)', () => {
  it('validates the authored default registry', () => {
    expect(validateDepartmentCapabilityRegistry(DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY)).toEqual({
      valid: true,
      issues: [],
    })
  })

  it('routes a hazard-tagged case to a specialist primary with ordered support', () => {
    const result = resolveDepartments(
      packet({
        missionCategory: 'containment_breach',
        caseTags: ['biohazard', 'records-review'],
      }),
      DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY
    )

    expect(result.routeKind).toBe('matched')
    expect(result.primaryDepartment).toMatchObject({
      departmentId: 'department:biohazard-response',
      matchedCapabilities: ['containment'],
      doctrineMatches: ['biohazard'],
    })
    expect(result.supportingDepartments.map((entry) => entry.departmentId)).toEqual([
      'department:records-analysis',
      'department:emergency-response',
      'department:field-containment',
      'department:concept-embodiment-research',
      'department:ethics-review',
      'department:procurement-logistics',
    ])
  })

  it('prioritizes a specialist match over accumulated generic doctrine tags', () => {
    const result = resolveDepartments(
      packet({
        missionCategory: 'investigation_lead',
        caseTags: ['biohazard', 'analysis', 'evidence'],
      }),
      DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY
    )

    expect(result.primaryDepartment).toMatchObject({
      departmentId: 'department:biohazard-response',
      matchedCapabilities: ['research'],
      doctrineMatches: ['biohazard'],
    })
  })

  it('routes concept-embodiment research through the authored specialist profile', () => {
    const result = resolveDepartments(
      packet({
        missionCategory: 'strategic_opportunity',
        caseTags: ['concept-embodiment', 'cognitive-hazard'],
      }),
      DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY
    )

    expect(result.primaryDepartment).toMatchObject({
      departmentId: 'department:concept-embodiment-research',
      matchedCapabilities: ['research'],
      doctrineMatches: ['cognitive_hazard', 'concept_embodiment'],
    })
  })

  it('denies primary ownership without capability even when the task type matches', () => {
    const noResearchCapability = department('department:no-capability', {
      capabilities: ['records'],
      taskTypes: ['research_case', 'records_review'],
      reputation: 100,
      fundingTier: 5,
    })
    const result = resolveDepartments(packet(), registry([noResearchCapability]))

    expect(result.routeKind).toBe('fallback')
    expect(result.primaryDepartment).toBeNull()
    expect(result.misfitRoute).toEqual({
      departmentId: 'department:fallback',
      reasonCode: 'no-primary-capability-match',
      lowPriority: true,
      stigmaTag: 'capability-misfit',
    })
  })

  it('honors support-only and denied capability limits', () => {
    const supportOnly = department('department:support-only', {
      reputation: 100,
      limits: {
        capabilityLimits: [{ capability: 'research', mode: 'support_only' }],
      },
    })
    const deniedRecords = department('department:denied-records', {
      capabilities: ['research', 'records'],
      taskTypes: ['research_case', 'records_review'],
      limits: {
        capabilityLimits: [{ capability: 'records', mode: 'denied' }],
      },
    })
    const owner = department('department:owner', { reputation: 60 })
    const result = resolveDepartments(packet(), registry([supportOnly, deniedRecords, owner]))

    expect(result.primaryDepartment?.departmentId).toBe('department:owner')
    expect(result.supportingDepartments.map((entry) => entry.departmentId)).not.toContain(
      'department:denied-records'
    )
    expect(result.supportingDepartments.map((entry) => entry.departmentId)).not.toContain(
      'department:support-only'
    )
  })

  it('breaks equal primary and support ranks by code-unit department ID', () => {
    const alpha = department('department:alpha', {
      capabilities: ['research', 'records'],
      taskTypes: ['research_case', 'records_review'],
    })
    const beta = department('department:beta', {
      capabilities: ['research', 'records'],
      taskTypes: ['research_case', 'records_review'],
    })
    const supportAlpha = department('department:support-alpha', {
      capabilities: ['records'],
      taskTypes: ['records_review'],
    })
    const supportBeta = department('department:support-beta', {
      capabilities: ['records'],
      taskTypes: ['records_review'],
    })

    const left = resolveDepartments(packet(), registry([beta, supportBeta, alpha, supportAlpha]))
    const right = resolveDepartments(packet(), registry([supportAlpha, alpha, supportBeta, beta]))

    expect(left.primaryDepartment?.departmentId).toBe('department:alpha')
    expect(left.supportingDepartments.map((entry) => entry.departmentId)).toEqual([
      'department:beta',
      'department:support-alpha',
      'department:support-beta',
    ])
    expect(right).toEqual(left)
  })

  it('selects fallback departments in code-unit order independent of authoring order', () => {
    const fallbackAlpha = department('department:fallback-alpha', {
      capabilities: [],
      taskTypes: [],
      reviewAuthorities: [],
    })
    const fallbackBeta = department('department:fallback-beta', {
      capabilities: [],
      taskTypes: [],
      reviewAuthorities: [],
    })
    const capabilityGapRegistry: DepartmentCapabilityRegistry = {
      departments: [fallbackBeta, fallbackAlpha],
      fallbackDepartmentRefs: ['department:fallback-beta', 'department:fallback-alpha'],
    }

    expect(resolveDepartments(packet(), capabilityGapRegistry).misfitRoute?.departmentId).toBe(
      'department:fallback-alpha'
    )
  })

  it('rejects duplicate IDs and malformed capability authoring, then fails closed', () => {
    const malformed = department('department:malformed', {
      capabilities: ['unknown' as DepartmentDefinition['capabilities'][number]],
      fundingTier: 2.5,
      limits: {
        capabilityLimits: [{ capability: 'research', mode: 'support_only' }],
      },
    })
    const invalidRegistry: DepartmentCapabilityRegistry = {
      departments: [malformed, { ...malformed }],
      fallbackDepartmentRefs: ['department:missing'],
    }
    const validation = validateDepartmentCapabilityRegistry(invalidRegistry)

    expect(validation.valid).toBe(false)
    expect(validation.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'duplicate_department_id',
        'invalid_capability',
        'invalid_funding_tier',
        'limit_without_capability',
        'unknown_fallback_department',
      ])
    )
    expect(resolveDepartments(packet(), invalidRegistry)).toMatchObject({
      routeKind: 'blocked',
      primaryDepartment: null,
      supportingDepartments: [],
      misfitRoute: null,
      blockerCodes: ['invalid-department-registry'],
    })
  })

  it('fails closed for malformed legacy registry shapes without throwing', () => {
    const malformed = {
      departments: [null],
      fallbackDepartmentRefs: [],
    } as unknown as DepartmentCapabilityRegistry

    expect(validateDepartmentCapabilityRegistry(malformed, authorityGraph())).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: 'invalid_department_definition' }),
        expect.objectContaining({ code: 'missing_fallback_route' }),
      ]),
    })
    expect(resolveDepartments(packet(), malformed, authorityGraph()).routeKind).toBe('blocked')
  })

  it('fails closed for an unrecognized runtime mission category', () => {
    const malformedPacket = packet({
      missionCategory: 'legacy_unknown' as Parameters<
        typeof resolveDepartments
      >[0]['missionCategory'],
    })

    expect(
      resolveDepartments(malformedPacket, DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY)
    ).toMatchObject({
      routeKind: 'blocked',
      primaryDepartment: null,
      misfitRoute: null,
      blockerCodes: ['invalid-case-packet'],
    })
  })

  it('resolves department node IDs, aliases, and linked IDs to one definition', () => {
    const records = department('dept:records', {
      capabilities: ['records'],
      taskTypes: ['records_review'],
      reviewAuthorities: ['records_release'],
    })
    const aliasRegistry: DepartmentCapabilityRegistry = {
      departments: [records],
      fallbackDepartmentRefs: ['records-desk'],
    }
    const graph = authorityGraph()

    expect(
      resolveDepartmentDefinitionReference(aliasRegistry, 'department:records', graph)?.id
    ).toBe('dept:records')
    expect(resolveDepartmentDefinitionReference(aliasRegistry, 'records-desk', graph)?.id).toBe(
      'dept:records'
    )
    expect(resolveDepartmentDefinitionReference(aliasRegistry, 'dept:records', graph)?.id).toBe(
      'dept:records'
    )

    const result = resolveDepartments(
      packet({
        missionCategory: 'strategic_opportunity',
        caseTags: ['records'],
      }),
      aliasRegistry,
      graph
    )
    expect(result.primaryDepartment).toMatchObject({
      departmentId: 'dept:records',
      authorityNodeId: 'department:records',
    })
  })

  it('rejects conflicting authority aliases instead of selecting by input order', () => {
    const conflictGraph = authorityGraph({
      nodes: [
        ...authorityGraph().nodes,
        {
          id: 'department:duplicate-records',
          nodeType: 'department',
          label: 'Duplicate Records Department',
          aliases: [
            {
              aliasId: 'records-desk',
              label: 'Duplicate Records Desk',
              confidence: 'probable',
            },
          ],
          linkedDepartmentIds: ['dept:duplicate-records'],
        },
      ],
    })
    const conflictRegistry: DepartmentCapabilityRegistry = {
      departments: [
        department('dept:records'),
        department('dept:duplicate-records'),
        department('department:fallback', {
          capabilities: [],
          taskTypes: [],
          reviewAuthorities: [],
        }),
      ],
      fallbackDepartmentRefs: ['department:fallback'],
    }
    const validation = validateDepartmentCapabilityRegistry(conflictRegistry, conflictGraph)

    expect(validation.valid).toBe(false)
    expect(validation.issues.map((issue) => issue.code)).toContain('authority_alias_conflict')
    expect(resolveDepartments(packet(), conflictRegistry, conflictGraph).routeKind).toBe('blocked')
  })

  it('derives stable requirements for empty-tag legacy cases and replays byte-stably', () => {
    const legacyPacket = packet({ caseTags: [] })
    const requirements = deriveDepartmentCaseRequirements(legacyPacket)
    const first = resolveDepartments(legacyPacket, DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY)
    const replay = resolveDepartments(
      JSON.parse(JSON.stringify(legacyPacket)),
      JSON.parse(JSON.stringify(DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY))
    )

    expect(requirements).toEqual({
      primaryCapability: 'research',
      primaryTaskType: 'research_case',
      supportingCapabilities: ['records'],
    })
    expect(replay).toEqual(first)
    expect(JSON.stringify(replay)).toBe(JSON.stringify(first))
  })
})
