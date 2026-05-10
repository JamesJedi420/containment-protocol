/**
 * SPE-17: Bounded execution-instability overlay on top of readiness/time-cost weakest-link resolution.
 * Distinct from intel-friction penalties inside weakest-link scoring — this applies after base resolution.
 */
import { describeContractArchiveInstabilityClause } from './contracts'
import type { CaseInstance } from './models'
import type { WeakestLinkMissionResolutionResult } from './weakestLinkResolution'

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
    expectedRecoveryWeeksDelta: (base.expectedRecoveryWeeksDelta ?? 0) + 1,
    deploymentDebtSignals: [
      ...(base.deploymentDebtSignals ?? []),
      'execution-instability-recovery-surcharge',
    ],
    executionInstability: {
      flag: 'contract_archive_instability',
      upstreamCause,
      downstreamEffect:
        'Unstable archive contract clause forced execution outcome one band worse (success → partial) and added +1 expected recovery week on the shared readiness/time-cost scaffold.',
      applied: true,
    },
    weakestLinkNarrativeReasonCodes: [
      ...base.weakestLinkNarrativeReasonCodes,
      'execution-instability-overlay',
    ],
  }
}
