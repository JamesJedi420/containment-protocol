// Weakest-Link Mission Resolution Logic
// Core deterministic mission resolution system for Containment Protocol
// Integrates with deployment readiness, team composition/cohesion, training, loadout, escalation, and recovery

import { clamp } from './math'
import type { TeamCohesionSummary } from './models'
import type { TeamDeploymentReadinessState } from './models'
import type { AgentLoadoutReadinessSummary } from './equipment'
import { WEAKEST_LINK_CALIBRATION } from './sim/calibration'

// --- Types ---

export type WeakestLinkPenaltySourceCode =
  | 'missing-coverage'
  | 'low-min-readiness'
  | 'fragile-cohesion'
  | 'training-lock-pressure'
  | 'loadout-gate-miss'
  | 'fatigue-concentration'
  | 'intel-friction'

export type WeakestLinkPenaltyBucket = {
  code: WeakestLinkPenaltySourceCode
  weight: number
  rawSignal: number
  appliedPenalty: number
}

export type WeakestLinkResolutionOutcomeCategory =
  | 'clean_success'
  | 'strained_success'
  | 'partial'
  | 'failure'
  | 'failure_recovery_pressure'

export type WeakestLinkResultKind = 'success' | 'partial' | 'fail'

export type RecoveryPressureBand = 'low' | 'moderate' | 'high' | 'severe'

export interface WeakestLinkMissionResolutionResult {
  // Canonical envelope
  missionId: string
  week: number
  outcomeCategory: WeakestLinkResolutionOutcomeCategory
  resultKind: WeakestLinkResultKind
  baseScore: number
  requiredScore: number
  finalDelta: number

  // Weakest-link breakdown
  weakestLinkTotalPenalty: number
  weakestLinkPenaltyBuckets: WeakestLinkPenaltyBucket[]
  weakestLinkContributors: string[]
  weakestLinkNarrativeReasonCodes: string[]

  // Post-resolution pressure
  injuryRiskDelta?: number
  fatalityRiskDelta?: number
  expectedRecoveryWeeksDelta?: number
  recoveryPressureBand?: RecoveryPressureBand
  deploymentDebtSignals?: string[]

  // Debug/overlay
  penaltyComputationVersion?: string
  orderedPenaltyApplication?: WeakestLinkPenaltyBucket[]
  cappedPenalties?: WeakestLinkPenaltyBucket[]
}

// --- Core Logic ---

export function resolveWeakestLinkMission(
  params: {
    missionId: string
    week: number
    baseScore: number
    requiredScore: number
    intelConfidence?: number
    intelUncertainty?: number
    teamReadiness: TeamDeploymentReadinessState
    teamCohesion: TeamCohesionSummary
    loadoutSummaries: AgentLoadoutReadinessSummary[]
    trainingLocks: string[]
    fatigueSignals: number[]
    missingRoles: string[] // required for penalty computation
    // ...other integration fields as needed
  }
): WeakestLinkMissionResolutionResult {
  const PENALTY_WEIGHTS = WEAKEST_LINK_CALIBRATION.weights
  const PENALTY_CAPS = WEAKEST_LINK_CALIBRATION.caps
  const PENALTY_SCALES = WEAKEST_LINK_CALIBRATION.basePenaltyScales

  function buildPenaltyBucket(
    code: WeakestLinkPenaltySourceCode,
    rawSignal: number
  ): WeakestLinkPenaltyBucket {
    const weight = PENALTY_WEIGHTS[code]
    const appliedPenalty = Math.min(
      PENALTY_CAPS[code],
      Number((Math.max(0, rawSignal) * PENALTY_SCALES[code] * weight).toFixed(2))
    )

    return {
      code,
      weight,
      rawSignal,
      appliedPenalty,
    }
  }

  // --- Penalty Source Computation ---
  const penaltyBuckets: WeakestLinkPenaltyBucket[] = []
  const contributors: string[] = []
  const narrativeCodes: string[] = []

  // 1. Coverage gaps
  const missingCoverage = params.missingRoles.length > 0 ? 1 : 0
  if (missingCoverage > 0) {
    contributors.push('missing-coverage')
    narrativeCodes.push('missing-coverage')
  }
  penaltyBuckets.push(buildPenaltyBucket('missing-coverage', missingCoverage))

  // 2. Readiness floor
  const minReadiness = typeof params.teamReadiness.minimumMemberReadiness === 'number'
    ? params.teamReadiness.minimumMemberReadiness
    : 100
  const lowMinReadiness =
    minReadiness < WEAKEST_LINK_CALIBRATION.minimumReadinessFloor
      ? (WEAKEST_LINK_CALIBRATION.minimumReadinessFloor - minReadiness) /
        WEAKEST_LINK_CALIBRATION.minimumReadinessFloor
      : 0
  if (lowMinReadiness > 0) {
    contributors.push('low-min-readiness')
    narrativeCodes.push('low-min-readiness')
  }
  penaltyBuckets.push(buildPenaltyBucket('low-min-readiness', lowMinReadiness))

  // 3. Cohesion fragility
  const fragileCohesion = params.teamCohesion.cohesionBand === 'fragile' ? 1 : 0
  if (fragileCohesion > 0) {
    contributors.push('fragile-cohesion')
    narrativeCodes.push('fragile-cohesion')
  }
  penaltyBuckets.push(buildPenaltyBucket('fragile-cohesion', fragileCohesion))

  // 4. Training lock pressure
  const trainingLockPressure = params.trainingLocks.length > 0 ? 1 : 0
  if (trainingLockPressure > 0) {
    contributors.push('training-lock-pressure')
    narrativeCodes.push('training-lock-pressure')
  }
  penaltyBuckets.push(buildPenaltyBucket('training-lock-pressure', trainingLockPressure))

  // 5. Loadout gate miss
  const loadoutGateMiss = params.loadoutSummaries.some(l => l.readiness === 'blocked') ? 1 : 0
  if (loadoutGateMiss > 0) {
    contributors.push('loadout-gate-miss')
    narrativeCodes.push('loadout-gate-miss')
  }
  penaltyBuckets.push(buildPenaltyBucket('loadout-gate-miss', loadoutGateMiss))

  // 6. Fatigue concentration
  let fatigueConcentration = 0
  if (params.fatigueSignals.length > 0) {
    const maxFatigue = Math.max(...params.fatigueSignals)
    fatigueConcentration =
      maxFatigue > WEAKEST_LINK_CALIBRATION.fatigueSafeThreshold
        ? (maxFatigue - WEAKEST_LINK_CALIBRATION.fatigueSafeThreshold) /
          (WEAKEST_LINK_CALIBRATION.fatigueMaxThreshold -
            WEAKEST_LINK_CALIBRATION.fatigueSafeThreshold)
        : 0
    if (fatigueConcentration > 0) {
      contributors.push('fatigue-concentration')
      narrativeCodes.push('fatigue-concentration')
    }
  }
  penaltyBuckets.push(buildPenaltyBucket('fatigue-concentration', fatigueConcentration))

  // 7. Mission intel friction
  const intelConfidence = clamp(params.intelConfidence ?? 1, 0, 1)
  const intelUncertainty = clamp(params.intelUncertainty ?? 0, 0, 1)
  const intelFriction = clamp(((1 - intelConfidence) + intelUncertainty) / 2, 0, 1)
  if (intelFriction > 0) {
    contributors.push('intel-friction')
    narrativeCodes.push('intel-friction')
  }
  penaltyBuckets.push(buildPenaltyBucket('intel-friction', intelFriction))

  // --- Clamp and sum penalties ---
  const totalPenalty = Math.min(
    WEAKEST_LINK_CALIBRATION.globalPenaltyCap,
    penaltyBuckets.reduce((sum, b) => sum + b.appliedPenalty, 0)
  )

  // --- Final score delta ---
  const finalDelta = params.baseScore - totalPenalty - params.requiredScore

  // --- Outcome selection ---
  let outcomeCategory: WeakestLinkResolutionOutcomeCategory = 'clean_success'
  let resultKind: WeakestLinkResultKind = 'success'

  if (finalDelta >= 10 && totalPenalty === 0) {
    outcomeCategory = 'clean_success'
    resultKind = 'success'
  } else if (finalDelta >= 0) {
    outcomeCategory = totalPenalty > 0 ? 'strained_success' : 'clean_success'
    resultKind = 'success'
  } else if (
    finalDelta < 0 &&
    finalDelta > WEAKEST_LINK_CALIBRATION.partialFailureThreshold
  ) {
    outcomeCategory = 'partial'
    resultKind = 'partial'
  } else if (finalDelta <= WEAKEST_LINK_CALIBRATION.partialFailureThreshold) {
    // Recovery pressure promotion
    const recoveryPressure = penaltyBuckets.find(b => b.code === 'fatigue-concentration')?.appliedPenalty || 0
    if (recoveryPressure >= WEAKEST_LINK_CALIBRATION.recoveryPressureFailureThreshold) {
      outcomeCategory = 'failure_recovery_pressure'
    } else {
      outcomeCategory = 'failure'
    }
    resultKind = 'fail'
  }

  // --- Recovery pressure band (example logic) ---
  let recoveryPressureBand: RecoveryPressureBand | undefined = undefined
  if (totalPenalty >= WEAKEST_LINK_CALIBRATION.recoveryPressureBands.severe) recoveryPressureBand = 'severe'
  else if (totalPenalty >= WEAKEST_LINK_CALIBRATION.recoveryPressureBands.high) recoveryPressureBand = 'high'
  else if (totalPenalty >= WEAKEST_LINK_CALIBRATION.recoveryPressureBands.moderate) recoveryPressureBand = 'moderate'
  else if (totalPenalty > 0) recoveryPressureBand = 'low'

  return {
    missionId: params.missionId,
    week: params.week,
    outcomeCategory,
    resultKind,
    baseScore: params.baseScore,
    requiredScore: params.requiredScore,
    finalDelta,
    weakestLinkTotalPenalty: totalPenalty,
    weakestLinkPenaltyBuckets: penaltyBuckets,
    weakestLinkContributors: contributors,
    weakestLinkNarrativeReasonCodes: narrativeCodes,
    recoveryPressureBand,
    penaltyComputationVersion: '1.2',
    orderedPenaltyApplication: penaltyBuckets,
    cappedPenalties: penaltyBuckets.map(b => ({ ...b })),
  }
}
