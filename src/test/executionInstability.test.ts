import { describe, it, expect } from 'vitest'
import { describeContractArchiveInstabilityClause } from '../domain/contracts'
import { applyExecutionInstabilityOverlay } from '../domain/executionInstability'
import type { CaseInstance } from '../domain/models'
import { resolveWeakestLinkMission } from '../domain/weakestLinkResolution'
import { explainWeakestLinkResolution } from '../domain/visibility'

const PERFECT_TEAM_PARAMS = {
  missionId: 'm-instability',
  week: 2,
  baseScore: 100,
  requiredScore: 80,
  intelConfidence: 1,
  intelUncertainty: 0,
  teamReadiness: {
    teamId: 't1',
    readinessCategory: 'mission_ready' as const,
    readinessScore: 100,
    hardBlockers: [] as string[],
    softRisks: [] as string[],
    coverageCompleteness: { required: ['containment'], covered: ['containment'], missing: [] },
    cohesionBand: 'strong' as const,
    minimumMemberReadiness: 100,
    averageFatigue: 10,
    estimatedDeployWeeks: 0,
    estimatedRecoveryWeeks: 0,
    computedWeek: 2,
  },
  teamCohesion: {
    cohesionBand: 'strong' as const,
    cohesionScore: 100,
    chemistryScore: 100,
    coordinationScore: 100,
    trustScore: 100,
    fatiguePenalty: 0,
    cohesionFlags: [] as string[],
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
      issues: [] as string[],
    },
  ],
  trainingLocks: [] as string[],
  fatigueSignals: [10, 12, 14],
  missingRoles: [] as string[],
}

describe('SPE-17 execution instability overlay', () => {
  it('describeContractArchiveInstabilityClause returns clause text for ritual archive contract', () => {
    const caseInstance = {
      contract: { templateId: 'institutions-ritual-archive' },
    } as CaseInstance
    const text = describeContractArchiveInstabilityClause(caseInstance)
    expect(text).toContain('Unstable Archive')
    expect(text).toContain('Site instability')
  })

  it('returns null when no contract or wrong template', () => {
    expect(describeContractArchiveInstabilityClause({} as CaseInstance)).toBeNull()
    expect(
      describeContractArchiveInstabilityClause({
        contract: { templateId: 'ops-blacksite-recon' },
      } as CaseInstance)
    ).toBeNull()
  })

  it('downgrades success to partial when archive instability clause is present', () => {
    const base = resolveWeakestLinkMission(PERFECT_TEAM_PARAMS)
    expect(base.resultKind).toBe('success')

    const caseInstance = {
      contract: { templateId: 'institutions-ritual-archive' },
    } as CaseInstance

    const overlaid = applyExecutionInstabilityOverlay(caseInstance, base)
    expect(overlaid.resultKind).toBe('partial')
    expect(overlaid.outcomeCategory).toBe('partial')
    expect(overlaid.executionInstability?.applied).toBe(true)
    expect(overlaid.executionInstability?.flag).toBe('contract_archive_instability')
    expect(overlaid.injuryRiskDelta).toBe(0.08)
    expect(overlaid.fatalityRiskDelta).toBe(0.04)
    expect(overlaid.expectedRecoveryWeeksDelta).toBe(1)
    expect(overlaid.deploymentDebtSignals).toContain('execution-instability-recovery-surcharge')
    expect(overlaid.weakestLinkNarrativeReasonCodes).toContain('execution-instability-overlay')
  })

  it('surfaces upstream cause and downstream effect in visibility explanations', () => {
    const base = resolveWeakestLinkMission(PERFECT_TEAM_PARAMS)
    const overlaid = applyExecutionInstabilityOverlay(
      { contract: { templateId: 'institutions-ritual-archive' } } as CaseInstance,
      base
    )
    const explanation = explainWeakestLinkResolution(overlaid)
    expect(explanation.summary).toContain('archive-instability')
    expect(explanation.details.some((d) => d.includes('Upstream instability cause'))).toBe(true)
    expect(explanation.details.some((d) => d.includes('Downstream instability effect'))).toBe(true)
    expect(explanation.details.some((d) => d.includes('+1 expected recovery week'))).toBe(true)
    expect(explanation.details.some((d) => d.includes('injury risk by +0.08'))).toBe(true)
    expect(explanation.details.some((d) => d.includes('fatality risk by +0.04'))).toBe(true)
  })

  it('does not change outcome when base is already partial', () => {
    const partialBase = resolveWeakestLinkMission({
      ...PERFECT_TEAM_PARAMS,
      baseScore: 70,
      teamReadiness: {
        ...PERFECT_TEAM_PARAMS.teamReadiness,
        coverageCompleteness: { required: ['containment'], covered: [], missing: ['containment'] },
        minimumMemberReadiness: 40,
      },
    })
    expect(partialBase.resultKind).toBe('partial')

    const overlaid = applyExecutionInstabilityOverlay(
      { contract: { templateId: 'institutions-ritual-archive' } } as CaseInstance,
      partialBase
    )
    expect(overlaid.resultKind).toBe('partial')
    expect(overlaid.executionInstability?.applied).toBe(false)
    expect(overlaid.injuryRiskDelta).toBeUndefined()
    expect(overlaid.fatalityRiskDelta).toBeUndefined()
    expect(overlaid.expectedRecoveryWeeksDelta).toBeUndefined()
    expect(overlaid.deploymentDebtSignals).toBeUndefined()
  })
})
