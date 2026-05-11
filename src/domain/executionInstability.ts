/**
 * SPE-17: Bounded execution-instability overlay on top of readiness/time-cost weakest-link resolution.
 * Distinct from intel-friction penalties inside weakest-link scoring — this applies after base resolution.
 */
import { describeContractArchiveInstabilityClause } from './contracts'
import type { CaseInstance, MissionSpawnedConsequence } from './models'
import type { WeakestLinkMissionResolutionResult } from './weakestLinkResolution'

export function buildExecutionInstabilityRouteShift(
  currentRoute: string | null | undefined,
  weakestLinkResult: WeakestLinkMissionResolutionResult | undefined
): string | undefined {
  if (!weakestLinkResult?.executionInstability?.applied) {
    return undefined
  }

  const baseRoute = typeof currentRoute === 'string' && currentRoute.length > 0 ? currentRoute : 'primary'
  return `${baseRoute}->fallback-containment`
}

export function buildExecutionInstabilityObjectiveDriftConsequence(
  currentCase: CaseInstance,
  weakestLinkResult: WeakestLinkMissionResolutionResult | undefined
): MissionSpawnedConsequence | undefined {
  if (!weakestLinkResult?.executionInstability?.applied) {
    return undefined
  }

  return {
    type: 'queued_follow_up',
    caseId: currentCase.id,
    caseTitle: currentCase.title,
    detail: 'Execution instability shifted objective integrity and queued follow-up objective realignment.',
  }
}

export function applyExecutionInstabilityOverlay(
  currentCase: CaseInstance,
  base: WeakestLinkMissionResolutionResult
): WeakestLinkMissionResolutionResult {
  const upstreamCause = describeContractArchiveInstabilityClause(currentCase)
  if (!upstreamCause) {
    return base
  }

  if (base.resultKind !== 'success') {
    return {
      ...base,
      executionInstability: {
        flag: 'contract_archive_instability',
        upstreamCause,
        downstreamEffect:
          'Archive instability clause active; base weakest-link outcome was already partial or worse, so no further downgrade.',
        applied: false,
      },
    }
  }

  return {
    ...base,
    outcomeCategory: 'partial',
    resultKind: 'partial',
    injuryRiskDelta: Number(((base.injuryRiskDelta ?? 0) + 0.08).toFixed(2)),
    fatalityRiskDelta: Number(((base.fatalityRiskDelta ?? 0) + 0.04).toFixed(2)),
    expectedRecoveryWeeksDelta: (base.expectedRecoveryWeeksDelta ?? 0) + 1,
    deploymentDebtSignals: [
      ...(base.deploymentDebtSignals ?? []),
      'execution-instability-recovery-surcharge',
      'ally-reliability-fracture',
    ],
    executionInstability: {
      flag: 'contract_archive_instability',
      upstreamCause,
      downstreamEffect:
        'Unstable archive contract clause forced execution outcome one band worse (success → partial), added +1 expected recovery week, increased injury risk by +0.08, and increased fatality risk by +0.04 on the shared readiness/time-cost scaffold.',
      applied: true,
    },
    weakestLinkNarrativeReasonCodes: [
      ...base.weakestLinkNarrativeReasonCodes,
      'execution-instability-overlay',
    ],
  }
}
