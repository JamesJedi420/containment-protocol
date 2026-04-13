import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  applyIntelUpdate,
  degradeMissionIntelRecord,
  getMissionIntelSummary,
} from '../domain/intel'
import { buildTeamDeploymentReadinessState } from '../domain/deploymentReadiness'
import { triageMission } from '../domain/missionIntakeRouting'
import { createInitialResearchState, getResearchIntelModifiers } from '../domain/research'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { resolveWeakestLinkMission } from '../domain/weakestLinkResolution'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'

describe('intel layer', () => {
  it('applies deterministic intel acquisition updates and stamps the explicit week', () => {
    const caseId = 'case-001'
    const base = createStartingState()
    const prepared = {
      ...base,
      cases: {
        ...base.cases,
        [caseId]: {
          ...base.cases[caseId],
          intelConfidence: 0.4,
          intelUncertainty: 0.7,
          intelLastUpdatedWeek: 1,
        },
      },
    }

    const delta = {
      confidenceGain: 0.25,
      uncertaintyReduction: 0.3,
    }

    const nextA = applyIntelUpdate(prepared, caseId, delta, 4)
    const nextB = applyIntelUpdate(structuredClone(prepared), caseId, delta, 4)
    const summary = getMissionIntelSummary(nextA.cases[caseId], 4)

    expect(nextA).toEqual(nextB)
    expect(summary.confidence).toBeCloseTo(0.65, 5)
    expect(summary.uncertainty).toBeCloseTo(0.4, 5)
    expect(summary.age).toBe(0)
    expect(nextA.cases[caseId].intelLastUpdatedWeek).toBe(4)
  })

  it('degrades stale intel deterministically during weekly advancement', () => {
    const caseId = 'case-001'
    const state = {
      ...createStartingState(),
      week: 2,
      cases: {
        ...createStartingState().cases,
        [caseId]: {
          ...createStartingState().cases[caseId],
          status: 'open' as const,
          deadlineRemaining: 99,
          intelConfidence: 1,
          intelUncertainty: 0,
          intelLastUpdatedWeek: 1,
        },
      },
    }

    const next = advanceWeek(state)

    expect(next.cases[caseId].intelConfidence).toBeCloseTo(0.96, 5)
    expect(next.cases[caseId].intelUncertainty).toBeCloseTo(0.04, 5)
    expect(next.cases[caseId].intelLastUpdatedWeek).toBe(1)
  })

  it('lets completed intel-tool research reduce deterministic weekly intel degradation', () => {
    const caseId = 'case-001'
    const baselineResearch = createInitialResearchState()
    const state = {
      ...createStartingState(),
      week: 4,
      cases: {
        ...createStartingState().cases,
        [caseId]: {
          ...createStartingState().cases[caseId],
          intelConfidence: 1,
          intelUncertainty: 0,
          intelLastUpdatedWeek: 1,
        },
      },
      researchState: {
        ...baselineResearch,
        projects: {
          'intel-doctrine': {
            projectId: 'intel-doctrine',
            category: 'field_ops' as const,
            status: 'completed' as const,
            costTime: 1,
            costMaterials: 0,
            costData: 0,
            progressTime: 1,
            unlocks: [
              {
                id: 'unlock-intel-doctrine',
                category: 'intel_tool' as const,
                label: 'Intel doctrine',
              },
            ],
            completedWeek: 3,
          },
        },
        completedProjectIds: ['intel-doctrine'],
      },
    }

    const degradedWithoutResearch = degradeMissionIntelRecord({ ...state.cases }, state.week)[caseId]
    const degradedWithResearch = degradeMissionIntelRecord(
      { ...state.cases },
      state.week,
      getResearchIntelModifiers(state)
    )[caseId]

    expect(degradedWithResearch.intelConfidence).toBeGreaterThan(
      degradedWithoutResearch.intelConfidence
    )
    expect(degradedWithResearch.intelUncertainty).toBeLessThan(
      degradedWithoutResearch.intelUncertainty
    )
  })

  it('clamps intel acquisition and degradation to 0..1 bounds', () => {
    const caseId = 'case-001'
    const base = createStartingState()
    const updated = applyIntelUpdate(
      {
        ...base,
        cases: {
          ...base.cases,
          [caseId]: {
            ...base.cases[caseId],
            intelConfidence: 0.92,
            intelUncertainty: 0.08,
            intelLastUpdatedWeek: 1,
          },
        },
      },
      caseId,
      { confidenceGain: 5, uncertaintyReduction: 5 },
      10
    )

    expect(updated.cases[caseId].intelConfidence).toBe(1)
    expect(updated.cases[caseId].intelUncertainty).toBe(0)

    const degraded = advanceWeek({
      ...updated,
      week: 50,
      cases: {
        ...updated.cases,
        [caseId]: {
          ...updated.cases[caseId],
          deadlineRemaining: 99,
          intelConfidence: 0.02,
          intelUncertainty: 0.98,
          intelLastUpdatedWeek: 1,
        },
      },
    })

    expect(degraded.cases[caseId].intelConfidence).toBe(0)
    expect(degraded.cases[caseId].intelUncertainty).toBe(1)
  })

  it('applies worse weakest-link outcomes when mission intel is stale or uncertain', () => {
    const baseParams: Parameters<typeof resolveWeakestLinkMission>[0] = {
      missionId: 'intel-mission',
      week: 4,
      baseScore: 84,
      requiredScore: 80,
      teamReadiness: {
        teamId: 't1',
        readinessCategory: 'mission_ready' as const,
        readinessScore: 100,
        hardBlockers: [],
        softRisks: [],
        coverageCompleteness: { required: ['containment'], covered: ['containment'], missing: [] },
        cohesionBand: 'strong' as const,
        minimumMemberReadiness: 100,
        averageFatigue: 10,
        estimatedDeployWeeks: 0,
        estimatedRecoveryWeeks: 0,
        computedWeek: 4,
      },
      teamCohesion: {
        cohesionBand: 'strong' as const,
        cohesionScore: 100,
        chemistryScore: 100,
        coordinationScore: 100,
        trustScore: 100,
        fatiguePenalty: 0,
        cohesionFlags: [],
      },
      loadoutSummaries: [
        {
          agentId: 'a1',
          role: 'hunter' as const,
          equippedItemCount: 3,
          compatibleItemCount: 3,
          incompatibleItemCount: 0,
          emptySlotCount: 0,
          readiness: 'ready' as const,
          issues: [],
        },
      ],
      trainingLocks: [],
      fatigueSignals: [10, 12, 15],
      missingRoles: [],
    }

    const freshIntel = resolveWeakestLinkMission({
      ...baseParams,
      intelConfidence: 1,
      intelUncertainty: 0,
    })
    const staleIntel = resolveWeakestLinkMission({
      ...baseParams,
      intelConfidence: 0.2,
      intelUncertainty: 0.8,
    })

    expect(freshIntel.resultKind).toBe('success')
    expect(freshIntel.weakestLinkTotalPenalty).toBe(0)
    expect(staleIntel.weakestLinkTotalPenalty).toBeGreaterThan(freshIntel.weakestLinkTotalPenalty)
    expect(staleIntel.weakestLinkContributors).toContain('intel-friction')
    expect(staleIntel.resultKind).toBe('partial')
  })

  it('round-trips mission intel fields cleanly through save and load', () => {
    const caseId = 'case-001'
    const baselineResearch = createInitialResearchState()
    const state = {
      ...createStartingState(),
      week: 6,
      cases: {
        ...createStartingState().cases,
        [caseId]: {
          ...createStartingState().cases[caseId],
          intelConfidence: 0.37,
          intelUncertainty: 0.63,
          intelLastUpdatedWeek: 5,
        },
      },
      researchState: {
        ...baselineResearch,
        projects: {
          'intel-doctrine': {
            projectId: 'intel-doctrine',
            category: 'field_ops' as const,
            status: 'completed' as const,
            costTime: 1,
            costMaterials: 0,
            costData: 0,
            progressTime: 1,
            unlocks: [
              {
                id: 'unlock-intel-doctrine',
                category: 'intel_tool' as const,
                label: 'Intel doctrine',
              },
            ],
            completedWeek: 5,
          },
        },
        completedProjectIds: ['intel-doctrine'],
      },
    }
    const beforeTriage = triageMission(state, state.cases[caseId])
    const beforeReadiness = buildTeamDeploymentReadinessState(state, 't_nightwatch', caseId)

    const loaded = loadGameSave(serializeGameSave(state))
    const afterTriage = triageMission(loaded, loaded.cases[caseId])
    const afterReadiness = buildTeamDeploymentReadinessState(loaded, 't_nightwatch', caseId)

    expect(loaded.cases[caseId]).toMatchObject({
      intelConfidence: 0.37,
      intelUncertainty: 0.63,
      intelLastUpdatedWeek: 5,
    })
    expect(getMissionIntelSummary(loaded.cases[caseId], loaded.week)).toEqual({
      confidence: 0.37,
      uncertainty: 0.63,
      age: 1,
    })
    expect(loaded.researchState?.completedProjectIds).toContain('intel-doctrine')
    expect(afterTriage.score).toBe(beforeTriage.score)
    expect(afterReadiness.intelPenalty).toBe(beforeReadiness.intelPenalty)
  })
})
