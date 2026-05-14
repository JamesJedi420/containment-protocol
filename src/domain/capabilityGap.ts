import type { GameState } from './models'
import { getCanonicalFundingState } from './funding'
import {
  agencyHasPaidCourierPrerequisite,
  getCourierShellRiskBreakdown,
} from './sim/frontBusiness'
import { COURIER_NETWORK_CAPACITY_GAP_CALIBRATION } from './sim/calibration'

export type CapabilityGapFamilyId = 'courierNetworkCapacity'

export type CapabilityGapKind = 'below_required' | 'below_desired_only' | 'none'

export type CapabilityGapMitigationKind = 'front_business_investment' | 'procurement' | 'mutual_aid'

export type CapabilityGapPayoffTiming = 'immediate' | 'delayed_weeks'

export interface CapabilityGapMitigationHook {
  kind: CapabilityGapMitigationKind
  label: string
  delayedPayoffWeeks?: number
  payoffTiming?: CapabilityGapPayoffTiming
  /** Always 0 in SPE-823a — hooks do not apply immediate score deltas. */
  immediateCapacityDelta?: number
  detail?: string
}

export interface CapabilityGapComponentNote {
  key: string
  value: string
}

export interface CapabilityGapReport {
  family: CapabilityGapFamilyId
  scenarioId: typeof COURIER_NETWORK_CAPACITY_GAP_CALIBRATION.scenarioId
  current: number
  required: number
  desiredFuture: number
  gapKind: CapabilityGapKind
  /** True while `current` is below the desired structural target (mitigations do not clear this). */
  unresolved: boolean
  componentNotes: CapabilityGapComponentNote[]
  mitigationHooks: CapabilityGapMitigationHook[]
}

function clampNonNegative(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.trunc(n))
}

function computeCourierNetworkCurrent(
  game: GameState
): { current: number; componentNotes: CapabilityGapComponentNote[] } {
  const cal = COURIER_NETWORK_CAPACITY_GAP_CALIBRATION
  const front = game.agency?.courierShellFront
  const notes: CapabilityGapComponentNote[] = []

  let tier = cal.informalNetworkBaseScore
  let tierLabel = 'informal_base'

  if (front?.type === 'courierShell') {
    switch (front.status) {
      case 'active':
        tier = cal.shellActiveScore
        tierLabel = 'shell_active'
        break
      case 'strained':
        tier = cal.shellStrainedScore
        tierLabel = 'shell_strained'
        break
      case 'collapsed':
        tier = cal.shellCollapsedScore
        tierLabel = 'shell_collapsed'
        break
      default:
        tierLabel = 'shell_unknown'
        break
    }
  } else if (agencyHasPaidCourierPrerequisite(game)) {
    tier += cal.paidInformalPrereqBoost
    tierLabel = `${tierLabel}+paid_prereq`
  }

  notes.push({ key: 'shellTier', value: `${tierLabel} (base ${tier})` })

  const breakdown = getCourierShellRiskBreakdown(game, game.week)
  const lockPen = Math.min(
    cal.lockoutPenaltyCap,
    breakdown.lockoutCount * cal.lockoutPenaltyPerLockout
  )
  const resPen = Math.min(
    cal.residuePenaltyCap,
    breakdown.residueCount * cal.residuePenaltyPerResidue
  )
  const bpPen = Math.min(
    cal.budgetPressurePenaltyCap,
    breakdown.budgetPressure * cal.budgetPressurePenaltyPerPoint
  )

  notes.push({
    key: 'riskBreakdown',
    value: `lockouts=${breakdown.lockoutCount} residue=${breakdown.residueCount} budgetPressure=${breakdown.budgetPressure} rawRisk=${breakdown.riskScore}`,
  })
  notes.push({
    key: 'penaltiesApplied',
    value: `lock=${lockPen} residue=${resPen} budget=${bpPen}`,
  })

  const fundingState = getCanonicalFundingState(game, game.week)
  const pendingProcurement = fundingState.procurementBacklog.filter((e) => e.status === 'pending').length
  const procPen = Math.min(
    cal.pendingProcurementPenaltyCap,
    pendingProcurement * cal.pendingProcurementPenaltyPerOrder
  )
  notes.push({ key: 'pendingProcurementOrders', value: String(pendingProcurement) })

  const current = clampNonNegative(tier - lockPen - resPen - bpPen - procPen)
  notes.push({ key: 'currentScore', value: String(current) })

  return { current, componentNotes: notes }
}

function buildMitigationHooks(): CapabilityGapMitigationHook[] {
  const cal = COURIER_NETWORK_CAPACITY_GAP_CALIBRATION
  return [
    {
      kind: 'front_business_investment',
      label: 'Reinvest courier shell / licensed desk capacity',
      delayedPayoffWeeks: cal.frontBusinessHookDelayedPayoffWeeks,
      payoffTiming: 'delayed_weeks',
      immediateCapacityDelta: 0,
      detail:
        'Spend and staff time now; usable network capacity rises only after the desk stabilizes (weekly resolve path).',
    },
    {
      kind: 'procurement',
      label: 'Emergency logistics procurement / broker backlog',
      delayedPayoffWeeks: cal.procurementHookDelayedPayoffWeeks,
      payoffTiming: 'delayed_weeks',
      immediateCapacityDelta: 0,
      detail: 'Clears channel friction after fulfillment; does not instantly raise the derived score.',
    },
    {
      kind: 'mutual_aid',
      label: 'Mutual-aid courier relay (temporary coverage)',
      payoffTiming: 'immediate',
      immediateCapacityDelta: 0,
      detail: 'Borrow partner capacity for urgent runs; underlying structural shortfall remains visible.',
    },
  ]
}

/**
 * SPE-823a: deterministic read-only courier network capacity gap (no `GameState` writes).
 */
export function buildCourierNetworkCapacityGapReport(game: GameState): CapabilityGapReport {
  const cal = COURIER_NETWORK_CAPACITY_GAP_CALIBRATION
  const { current, componentNotes } = computeCourierNetworkCurrent(game)
  const required = cal.requiredCapacity
  const desiredFuture = cal.desiredFutureCapacity

  let gapKind: CapabilityGapKind = 'none'
  if (current < required) {
    gapKind = 'below_required'
  } else if (current < desiredFuture) {
    gapKind = 'below_desired_only'
  }

  const unresolved = current < desiredFuture
  const mitigationHooks = unresolved ? buildMitigationHooks() : []

  return {
    family: 'courierNetworkCapacity',
    scenarioId: cal.scenarioId,
    current,
    required,
    desiredFuture,
    gapKind,
    unresolved,
    componentNotes,
    mitigationHooks,
  }
}
