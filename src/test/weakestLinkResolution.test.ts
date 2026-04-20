import { describe, it, expect } from 'vitest'
import { resolveWeakestLinkMission } from '../domain/weakestLinkResolution'

describe('resolveWeakestLinkMission', () => {
  it('returns clean_success for perfect team', () => {
    const result = resolveWeakestLinkMission({
      missionId: 'm1',
      week: 1,
      baseScore: 100,
      requiredScore: 80,
      teamReadiness: {
        teamId: 't1',
        readinessCategory: 'mission_ready',
        readinessScore: 100,
        hardBlockers: [],
        softRisks: [],
        coverageCompleteness: { required: ['containment'], covered: ['containment'], missing: [] },
        cohesionBand: 'strong',
        minimumMemberReadiness: 100,
        averageFatigue: 10,
        estimatedDeployWeeks: 0,
        estimatedRecoveryWeeks: 0,
        computedWeek: 1,
      },
      teamCohesion: { cohesionBand: 'strong', cohesionScore: 100, chemistryScore: 100, coordinationScore: 100, trustScore: 100, fatiguePenalty: 0, cohesionFlags: [] },
      loadoutSummaries: [{ agentId: 'a1', role: 'hunter', equippedItemCount: 3, compatibleItemCount: 3, incompatibleItemCount: 0, emptySlotCount: 0, readiness: 'ready', issues: [] }],
      trainingLocks: [],
      fatigueSignals: [10, 20, 30],
      missingRoles: [],
    })
    expect(result.outcomeCategory).toBe('clean_success')
    expect(result.resultKind).toBe('success')
    expect(result.weakestLinkTotalPenalty).toBe(0)
  })

  it('returns partial for low readiness', () => {
    const result = resolveWeakestLinkMission({
      missionId: 'm2',
      week: 1,
      baseScore: 70,
      requiredScore: 80,
      teamReadiness: {
        teamId: 't2',
        readinessCategory: 'mission_ready',
        readinessScore: 70,
        hardBlockers: [],
        softRisks: [],
        coverageCompleteness: { required: ['containment'], covered: [], missing: ['containment'] },
        cohesionBand: 'steady',
        minimumMemberReadiness: 40,
        averageFatigue: 20,
        estimatedDeployWeeks: 0,
        estimatedRecoveryWeeks: 0,
        computedWeek: 1,
      },
      teamCohesion: { cohesionBand: 'steady', cohesionScore: 70, chemistryScore: 70, coordinationScore: 70, trustScore: 70, fatiguePenalty: 0, cohesionFlags: [] },
      loadoutSummaries: [{ agentId: 'a2', role: 'hunter', equippedItemCount: 3, compatibleItemCount: 3, incompatibleItemCount: 0, emptySlotCount: 0, readiness: 'ready', issues: [] }],
      trainingLocks: [],
      fatigueSignals: [10, 20, 30],
      missingRoles: [],
    })
    expect(result.outcomeCategory).toBe('partial')
    expect(result.resultKind).toBe('partial')
    expect(result.weakestLinkTotalPenalty).toBeGreaterThan(0)
  })

  it('returns failure_recovery_pressure for high fatigue', () => {
    const result = resolveWeakestLinkMission({
      missionId: 'm3',
      week: 1,
      baseScore: 50,
      requiredScore: 80,
      teamReadiness: {
        teamId: 't3',
        readinessCategory: 'mission_ready',
        readinessScore: 50,
        hardBlockers: [],
        softRisks: [],
        coverageCompleteness: { required: ['containment'], covered: [], missing: ['containment'] },
        cohesionBand: 'fragile',
        minimumMemberReadiness: 50,
        averageFatigue: 90,
        estimatedDeployWeeks: 0,
        estimatedRecoveryWeeks: 0,
        computedWeek: 1,
      },
      teamCohesion: { cohesionBand: 'fragile', cohesionScore: 30, chemistryScore: 30, coordinationScore: 30, trustScore: 30, fatiguePenalty: 40, cohesionFlags: ['fatigue-overload'] },
      loadoutSummaries: [{ agentId: 'a3', role: 'hunter', equippedItemCount: 3, compatibleItemCount: 3, incompatibleItemCount: 0, emptySlotCount: 0, readiness: 'ready', issues: [] }],
      trainingLocks: [],
      fatigueSignals: [90, 95, 100],
      missingRoles: [],
    })
    expect(result.outcomeCategory).toBe('failure_recovery_pressure')
    expect(result.resultKind).toBe('fail')
    expect(result.weakestLinkTotalPenalty).toBeGreaterThan(0)
    expect(result.recoveryPressureBand).toBeDefined()
  })
})
