import { describe, expect, it } from 'vitest'

import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import type { AuthorityGraphState } from '../domain/authorityGraphPersistence'
import {
  authorizeDepartmentUnitHandoff,
  shortlistMissionCandidateTeams,
} from '../domain/missionIntakeRouting'
import type { DepartmentAuthorizationHandoffRequest } from '../domain/missionIntakeRouting'
import type { GameState } from '../domain/models'
import type {
  IncidentMissionFitPacket,
  SpecialistUnitRegistry,
  UnitProfile,
} from '../domain/specialistUnits'
import { advanceWeek } from '../domain/sim/advanceWeek'

function unitProfile(overrides: Partial<UnitProfile> = {}): UnitProfile {
  return {
    id: 'unit:records-research',
    designationCode: 'RR-1',
    displayLabel: 'Records Research Cell',
    unitTypes: ['research', 'mobile'],
    authorityTier: 'department',
    branchId: 'branch:records',
    lifecycleState: 'active',
    recordConfidence: 'verified',
    doctrine: ['investigation_first'],
    mobility: 'regional',
    jurisdiction: ['district:north'],
    permanence: 'standing',
    equipment: ['sensor_kit'],
    suitabilityTags: ['research_forward', 'records_review'],
    hazardProfileTags: ['digital'],
    environmentClasses: ['closed_environment'],
    deploymentDelayWeeks: 0,
    fatigueReadiness: 80,
    fatigueCeiling: 95,
    ...overrides,
  }
}

function missionFit(
  overrides: Partial<Omit<IncidentMissionFitPacket, 'incidentId' | 'week'>> = {}
): Omit<IncidentMissionFitPacket, 'incidentId' | 'week'> {
  return {
    missionPosture: 'research_forward',
    requiredSuitabilityTags: ['records_review'],
    requiredHazardProfiles: ['digital'],
    requiredEnvironmentClasses: ['closed_environment'],
    jurisdictionId: 'district:north',
    commandMode: 'departmental',
    minimumAuthorityTier: 'department',
    handoffRequired: true,
    ...overrides,
  }
}

function authorityState(
  edgeOverrides: Partial<AuthorityGraphState['graph']['edges'][number]> = {}
): AuthorityGraphState {
  return {
    graph: {
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
        {
          id: 'authority-unit:records-research',
          nodeType: 'institution',
          label: 'Records Research Cell Registry Node',
          aliases: [
            {
              aliasId: 'field-records-cell',
              label: 'Field Records Cell',
              confidence: 'verified',
            },
          ],
          linkedUnitIds: ['unit:records-research'],
        },
      ],
      edges: [
        {
          id: 'permission:records-to-research',
          kind: 'subordination',
          fromNodeId: 'authority-unit:records-research',
          toNodeId: 'department:records',
          status: 'current',
          sourceConfidence: 'verified',
          provenance: {
            sourceTag: 'spe-2088-test',
            recorderId: 'approver:records-director',
          },
          strength: 70,
          pressureChannels: ['permission'],
          ...edgeOverrides,
        },
      ],
    },
    mutationHistory: [],
  }
}

function request(
  state: Pick<GameState, 'week'>,
  overrides: Partial<DepartmentAuthorizationHandoffRequest> = {}
): DepartmentAuthorizationHandoffRequest {
  return {
    missionId: 'case-001',
    authorizingDepartmentRef: 'records-desk',
    targetUnitRef: 'field-records-cell',
    missionScope: ['records-review', 'field-investigation'],
    clearanceLevel: 3,
    validFromWeek: state.week,
    expiresAfterWeek: state.week + 2,
    missionFit: missionFit(),
    ...overrides,
  }
}

function stateWithAuthorization(
  edgeOverrides: Partial<AuthorityGraphState['graph']['edges'][number]> = {}
): GameState {
  const state = createStartingState()
  state.cases['case-001'] = {
    ...state.cases['case-001'],
    status: 'open',
    assignedTeamIds: [],
    requiredRoles: [],
    requiredTags: ['records_review'],
    tags: [...state.cases['case-001'].tags, 'analysis', 'digital', 'closed_environment'],
    regionTag: 'district:north',
  }
  state.authorityGraphState = authorityState(edgeOverrides)
  return state
}

describe('SPE-2088 department authorization to deployable unit handoff', () => {
  it('approves one sanitized permission grant and records the bounded audit packet', () => {
    const state = stateWithAuthorization()
    const registry: SpecialistUnitRegistry = { units: [unitProfile()] }

    const result = authorizeDepartmentUnitHandoff(state, registry, request(state))

    expect(result.approved).toBe(true)
    expect(result.blockerCodes).toEqual([])
    expect(result.record).toEqual({
      id: 'department-unit-handoff:case-001:department:records:unit:records-research:permission:records-to-research',
      missionId: 'case-001',
      authorizingDepartmentId: 'department:records',
      targetUnitId: 'unit:records-research',
      approverId: 'approver:records-director',
      permissionEdgeId: 'permission:records-to-research',
      permissionReasonCode: 'subordination_permission',
      authorizedWeek: state.week,
      validFromWeek: state.week,
      expiresAfterWeek: state.week + 2,
      clearanceLevel: 3,
      missionScope: ['field-investigation', 'records-review'],
    })
    expect(result.unitFit).toMatchObject({
      unitId: 'unit:records-research',
      hardBlocked: false,
    })
  })

  it('denies an explicit permission denial and fails closed for an empty legacy graph', () => {
    const deniedState = stateWithAuthorization({
      kind: 'dependency',
      strength: 30,
    })
    const registry: SpecialistUnitRegistry = { units: [unitProfile()] }

    expect(authorizeDepartmentUnitHandoff(deniedState, registry, request(deniedState))).toEqual({
      approved: false,
      blockerCodes: ['permission-denied'],
    })

    const emptyState = {
      ...deniedState,
      authorityGraphState: { graph: 'legacy-malformed' } as unknown as AuthorityGraphState,
    }
    expect(authorizeDepartmentUnitHandoff(emptyState, registry, request(emptyState))).toEqual({
      approved: false,
      blockerCodes: ['missing-department-reference'],
    })
  })

  it('resolves graph aliases and linked department/unit registry identifiers', () => {
    const state = stateWithAuthorization()
    const registry: SpecialistUnitRegistry = { units: [unitProfile()] }

    const aliasResult = authorizeDepartmentUnitHandoff(state, registry, request(state))
    const linkedIdResult = authorizeDepartmentUnitHandoff(
      state,
      registry,
      request(state, {
        authorizingDepartmentRef: 'dept:records',
        targetUnitRef: 'unit:records-research',
      })
    )

    expect(aliasResult).toEqual(linkedIdResult)
  })

  it('preserves an explicitly requested unit when one authority node links multiple units', () => {
    const state = stateWithAuthorization()
    state.authorityGraphState = {
      ...state.authorityGraphState!,
      graph: {
        ...state.authorityGraphState!.graph,
        nodes: state.authorityGraphState!.graph.nodes.map((node) =>
          node.id === 'authority-unit:records-research'
            ? { ...node, linkedUnitIds: ['unit:a-first', 'unit:records-research'] }
            : node
        ),
      },
    }
    const registry: SpecialistUnitRegistry = {
      units: [unitProfile({ id: 'unit:a-first', designationCode: 'AA-1' }), unitProfile()],
    }

    const result = authorizeDepartmentUnitHandoff(
      state,
      registry,
      request(state, { targetUnitRef: 'unit:records-research' })
    )

    expect(result.approved).toBe(true)
    expect(result.record?.targetUnitId).toBe('unit:records-research')
  })

  it('orders the audit mission scope by code unit rather than host locale', () => {
    const state = stateWithAuthorization()
    const registry: SpecialistUnitRegistry = { units: [unitProfile()] }

    const result = authorizeDepartmentUnitHandoff(
      state,
      registry,
      request(state, { missionScope: ['ä-scope', 'z-scope', 'ä-scope'] })
    )

    expect(result.record?.missionScope).toEqual(['z-scope', 'ä-scope'])
  })

  it('denies missing department and unit references independently', () => {
    const state = stateWithAuthorization()
    const registry: SpecialistUnitRegistry = { units: [unitProfile()] }

    expect(
      authorizeDepartmentUnitHandoff(
        state,
        registry,
        request(state, { authorizingDepartmentRef: 'department:missing' })
      ).blockerCodes
    ).toEqual(['missing-department-reference'])
    expect(
      authorizeDepartmentUnitHandoff(
        state,
        registry,
        request(state, { targetUnitRef: 'unit:missing' })
      ).blockerCodes
    ).toEqual(['missing-unit-reference'])
    expect(
      authorizeDepartmentUnitHandoff(state, { units: [] }, request(state)).blockerCodes
    ).toEqual(['missing-unit-reference'])
  })

  it('fails closed before resolving duplicate specialist-unit registry IDs', () => {
    const state = stateWithAuthorization()
    const invalidRegistry: SpecialistUnitRegistry = {
      units: [
        unitProfile(),
        unitProfile({
          displayLabel: 'Conflicting Duplicate Unit',
          lifecycleState: 'deployed',
        }),
      ],
    }

    expect(
      authorizeDepartmentUnitHandoff(state, invalidRegistry, request(state)).blockerCodes
    ).toEqual(['invalid-unit-registry'])
  })

  it('fails closed for hidden, contradicted, unapproved, or unavailable permission paths', () => {
    const registry: SpecialistUnitRegistry = { units: [unitProfile()] }
    const hidden = stateWithAuthorization({ status: 'hidden', hiddenUntilWeek: 99 })
    const contradicted = stateWithAuthorization({ status: 'contradicted' })
    const missingApprover = stateWithAuthorization({
      provenance: { sourceTag: 'spe-2088-test' },
    })
    const unavailableRegistry: SpecialistUnitRegistry = {
      units: [unitProfile({ lifecycleState: 'deployed' })],
    }

    expect(authorizeDepartmentUnitHandoff(hidden, registry, request(hidden)).blockerCodes).toEqual([
      'permission-not-active',
    ])
    expect(
      authorizeDepartmentUnitHandoff(contradicted, registry, request(contradicted)).blockerCodes
    ).toEqual(['missing-permission-edge'])
    expect(
      authorizeDepartmentUnitHandoff(missingApprover, registry, request(missingApprover))
        .blockerCodes
    ).toEqual(['missing-approver'])
    const available = stateWithAuthorization()
    expect(
      authorizeDepartmentUnitHandoff(available, unavailableRegistry, request(available))
        .blockerCodes
    ).toEqual(['unit-unavailable'])
  })

  it('rejects malformed and inactive authorization windows', () => {
    const state = stateWithAuthorization()
    const registry: SpecialistUnitRegistry = { units: [unitProfile()] }

    expect(
      authorizeDepartmentUnitHandoff(
        state,
        registry,
        request(state, { validFromWeek: state.week + 2, expiresAfterWeek: state.week + 1 })
      ).blockerCodes
    ).toEqual(['invalid-authorization-window'])
    expect(
      authorizeDepartmentUnitHandoff(
        state,
        registry,
        request(state, { validFromWeek: state.week + 0.5 })
      ).blockerCodes
    ).toEqual(['invalid-authorization-window'])
    expect(
      authorizeDepartmentUnitHandoff(
        state,
        registry,
        request(state, {
          validFromWeek: state.week + 1,
          expiresAfterWeek: state.week + 2,
        })
      ).blockerCodes
    ).toEqual(['authorization-not-yet-active'])
    const expiredState = {
      ...state,
      week: state.week + 3,
    }
    expect(
      authorizeDepartmentUnitHandoff(
        expiredState,
        registry,
        request(expiredState, {
          validFromWeek: state.week,
          expiresAfterWeek: state.week + 2,
        })
      ).blockerCodes
    ).toEqual(['authorization-expired'])
  })

  it('rejects incomplete handoff packets and council-direct bypass requests', () => {
    const state = stateWithAuthorization()
    const registry: SpecialistUnitRegistry = { units: [unitProfile()] }

    expect(
      authorizeDepartmentUnitHandoff(state, registry, request(state, { missionScope: [' ', ''] }))
        .blockerCodes
    ).toEqual(['empty-mission-scope'])
    expect(
      authorizeDepartmentUnitHandoff(
        state,
        registry,
        request(state, { clearanceLevel: Number.NaN })
      ).blockerCodes
    ).toEqual(['invalid-clearance'])
    expect(
      authorizeDepartmentUnitHandoff(
        state,
        registry,
        request(state, { missionFit: missionFit({ commandMode: 'council_direct' }) })
      ).blockerCodes
    ).toEqual(['council-direct-out-of-scope'])
    expect(
      authorizeDepartmentUnitHandoff(
        state,
        registry,
        request(state, { missionFit: missionFit({ requiredHazardProfiles: [] }) })
      ).blockerCodes
    ).toEqual(['mission-fit-mismatch'])

    const resolved = structuredClone(state)
    resolved.cases['case-001'].status = 'resolved'
    expect(
      authorizeDepartmentUnitHandoff(resolved, registry, request(resolved)).blockerCodes
    ).toEqual(['mission-not-handoff-eligible'])
  })

  it('hydrates linked unit references and replays the same authorization without mutation', () => {
    const state = stateWithAuthorization()
    const registry: SpecialistUnitRegistry = { units: [unitProfile()] }
    const hydrated = loadGameSave(serializeGameSave(state))
    const before = structuredClone(hydrated)
    const handoffRequest = request(hydrated)

    const first = authorizeDepartmentUnitHandoff(hydrated, registry, handoffRequest)
    const second = authorizeDepartmentUnitHandoff(hydrated, registry, handoffRequest)

    expect(
      hydrated.authorityGraphState?.graph.nodes.find(
        (node) => node.id === 'authority-unit:records-research'
      )?.linkedUnitIds
    ).toEqual(['unit:records-research'])
    expect(first).toEqual(second)
    expect(hydrated).toEqual(before)
  })

  it('activates only after week-close and leaves canonical team candidate ranking unchanged', () => {
    const state = stateWithAuthorization()
    const registry: SpecialistUnitRegistry = { units: [unitProfile()] }
    const nextWeekRequest = request(state, {
      validFromWeek: state.week + 1,
      expiresAfterWeek: state.week + 2,
    })
    const candidatesBefore = shortlistMissionCandidateTeams(state, 'case-001')
    const routingBefore = structuredClone(state.missionRouting)

    expect(authorizeDepartmentUnitHandoff(state, registry, nextWeekRequest).blockerCodes).toEqual([
      'authorization-not-yet-active',
    ])
    expect(state.missionRouting).toEqual(routingBefore)
    expect(shortlistMissionCandidateTeams(state, 'case-001')).toEqual(candidatesBefore)

    const next = advanceWeek(structuredClone(state), 1_900_000_000_000)
    const replay = advanceWeek(structuredClone(state), 1_900_000_000_000)
    const nextCandidatesBefore = shortlistMissionCandidateTeams(next, 'case-001')
    const nextResult = authorizeDepartmentUnitHandoff(next, registry, nextWeekRequest)

    expect(next.week).toBe(state.week + 1)
    expect(nextResult.approved).toBe(true)
    expect(nextResult).toEqual(authorizeDepartmentUnitHandoff(replay, registry, nextWeekRequest))
    expect(shortlistMissionCandidateTeams(next, 'case-001')).toEqual(nextCandidatesBefore)
  })

  it('ignores a contradicted historical edge when a current grant remains usable', () => {
    const state = stateWithAuthorization()
    state.authorityGraphState = {
      ...state.authorityGraphState!,
      graph: {
        ...state.authorityGraphState!.graph,
        edges: [
          {
            ...state.authorityGraphState!.graph.edges[0]!,
            id: 'a-contradicted-history',
            status: 'contradicted',
          },
          state.authorityGraphState!.graph.edges[0]!,
        ],
      },
    }
    const registry: SpecialistUnitRegistry = { units: [unitProfile()] }

    expect(authorizeDepartmentUnitHandoff(state, registry, request(state)).approved).toBe(true)
  })

  it('clears the satisfied handoff prerequisite and preserves designation collision context', () => {
    const state = stateWithAuthorization()
    const registry: SpecialistUnitRegistry = {
      units: [
        unitProfile(),
        unitProfile({
          id: 'unit:records-research-south',
          branchId: 'branch:south',
          eraBand: 'modern',
        }),
      ],
    }

    const result = authorizeDepartmentUnitHandoff(state, registry, request(state))

    expect(result.approved).toBe(true)
    expect(result.unitFit?.blockers).not.toContainEqual(
      expect.objectContaining({ code: 'branch_handoff_required' })
    )
    expect(result.unitFit?.designationResolved).toContain('@branch:records:')
  })

  it('selects the first usable edge in code-unit order and does not fall through a denial', () => {
    const state = stateWithAuthorization({
      id: 'z-grant',
    })
    state.authorityGraphState = {
      ...state.authorityGraphState!,
      graph: {
        ...state.authorityGraphState!.graph,
        edges: [
          {
            ...state.authorityGraphState!.graph.edges[0]!,
            id: 'a-deny',
            kind: 'dependency',
            strength: 20,
          },
          ...state.authorityGraphState!.graph.edges,
        ],
      },
    }
    const registry: SpecialistUnitRegistry = { units: [unitProfile()] }

    expect(authorizeDepartmentUnitHandoff(state, registry, request(state))).toEqual({
      approved: false,
      blockerCodes: ['permission-denied'],
    })
  })
})
