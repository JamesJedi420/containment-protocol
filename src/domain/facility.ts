import type {
  GameState,
  FacilityInstance,
  FacilityUpgradeMetadata,
  FacilityEffect,
} from './models'
import { assessFundingPressure, normalizeFundingState } from './funding'
import { assessResearchRequirements } from './research'

export interface FacilityUpgradeAssessment {
  canUpgrade: boolean
  blockedReasons: string[]
  missingResearchIds: string[]
  missingFacilityIds: string[]
  budgetPressure?: number
  staleProcurementRequestIds: string[]
  requiredFunding?: number
}

// Helper: Deep merge facility effects
function mergeEffects(a: FacilityEffect, b: FacilityEffect): FacilityEffect {
  const result: FacilityEffect = { ...a }
  for (const [k, v] of Object.entries(b)) {
    const key = k as keyof FacilityEffect
    result[key] = ((result[key] ?? 0) as number) + (v as number)
  }
  return result
}

// Initiate a facility upgrade if requirements are met
export function assessFacilityUpgrade(
  state: GameState,
  facilityId: string,
  upgrade: FacilityUpgradeMetadata
): FacilityUpgradeAssessment {
  const facility = state.facilityState?.facilities[facilityId]

  if (!facility) {
    return {
      canUpgrade: false,
      blockedReasons: ['missing-facility'],
      missingResearchIds: [],
      missingFacilityIds: [],
      staleProcurementRequestIds: [],
    }
  }

  const blockedReasons: string[] = []
  const fundingPressure = assessFundingPressure(state)
  const researchAssessment = assessResearchRequirements(
    state,
    upgrade.requirements?.requiredResearchIds ?? []
  )
  const missingFacilityIds = (upgrade.requirements?.requiredFacilityLevels ?? [])
    .filter((requirement) => {
      const otherFacility = state.facilityState?.facilities[requirement.facilityId]
      return !otherFacility || otherFacility.level < requirement.level
    })
    .map((requirement) => `${requirement.facilityId}:level-${requirement.level}`)

  if (facility.upgradeInProgress) {
    blockedReasons.push('upgrade-in-progress')
  }

  if (facility.level >= (facility.maxLevel ?? 99)) {
    blockedReasons.push('max-level-reached')
  }

  if (facility.status !== 'available' && facility.status !== 'active') {
    blockedReasons.push('facility-status-blocked')
  }

  if (!researchAssessment.satisfied) {
    blockedReasons.push('missing-research')
  }

  if (missingFacilityIds.length > 0) {
    blockedReasons.push('missing-facility-tier')
  }

  if ((state.funding ?? 0) < upgrade.costMoney) {
    blockedReasons.push('insufficient-funding')
  }

  if (fundingPressure.facilityUpgradeBlocked) {
    blockedReasons.push(
      fundingPressure.staleProcurementRequestIds.length > 0
        ? 'stale-procurement-backlog'
        : 'budget-pressure-gated'
    )
  }

  return {
    canUpgrade: blockedReasons.length === 0,
    blockedReasons,
    missingResearchIds: researchAssessment.missingIds,
    missingFacilityIds,
    budgetPressure: fundingPressure.budgetPressure,
    staleProcurementRequestIds: [...fundingPressure.staleProcurementRequestIds],
    ...((state.funding ?? 0) < upgrade.costMoney ? { requiredFunding: upgrade.costMoney } : {}),
  }
}

export function applyFacilityUpgrade(
  state: GameState,
  facilityId: string,
  upgrade: FacilityUpgradeMetadata
): GameState {
  const assessment = assessFacilityUpgrade(state, facilityId, upgrade)
  const facility = state.facilityState?.facilities[facilityId]
  if (!facility || !assessment.canUpgrade) return state
  const nextFunding = (state.funding ?? 0) - upgrade.costMoney
  const next: GameState = {
    ...state,
    funding: nextFunding,
    agency: state.agency
      ? {
          ...state.agency,
          funding: nextFunding,
          fundingState: normalizeFundingState(
            nextFunding,
            state.config,
            state.agency.fundingState,
            state.week
          ),
        }
      : state.agency,
    facilityState: {
      ...state.facilityState,
      facilities: {
        ...state.facilityState?.facilities,
        [facilityId]: {
          ...facility,
          upgradeInProgress: true,
          upgradeStartedWeek: state.week,
          upgradeCompleteWeek: state.week + upgrade.buildWeeks,
          status: 'upgrading',
          pendingEffectDeltas: upgrade.effectDeltas,
        },
      },
    },
  }
  return next
}

// Advance all facility upgrades, completing them if their timer is up
export function advanceFacilityUpgrades(state: GameState): GameState {
  if (!state.facilityState) return state
  const facilities: Record<string, FacilityInstance> = { ...state.facilityState.facilities }
  let changed = false
  for (const [id, facility] of Object.entries(facilities)) {
    if (facility.upgradeInProgress && facility.upgradeCompleteWeek !== undefined && state.week >= facility.upgradeCompleteWeek) {
      // Complete upgrade
      const pendingDeltas = facility.pendingEffectDeltas
      const newEffects = pendingDeltas ? mergeEffects(facility.effects, pendingDeltas) : facility.effects
      facilities[id] = {
        ...facility,
        level: facility.level + 1,
        upgradeInProgress: false,
        upgradeStartedWeek: undefined,
        upgradeCompleteWeek: undefined,
        status: 'active',
        effects: newEffects,
        pendingEffectDeltas: undefined,
      }
      changed = true
    }
  }
  if (!changed) return state
  return {
    ...state,
    facilityState: {
      ...state.facilityState,
      facilities,
    },
  }
}

// Summarize all facility effects for downstream systems
export function getFacilityEffectSummary(state: GameState): FacilityEffect {
  const summary: FacilityEffect = {}
  if (!state.facilityState) return summary
  for (const facility of Object.values(state.facilityState.facilities)) {
    for (const [k, v] of Object.entries(facility.effects)) {
      const key = k as keyof FacilityEffect
      summary[key] = ((summary[key] ?? 0) as number) + (v as number)
    }
  }
  return summary
}
