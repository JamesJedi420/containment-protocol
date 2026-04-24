import { describe, it, expect } from 'vitest'
import { applyFacilityUpgrade, advanceFacilityUpgrades, getFacilityEffectSummary } from '../domain/facility'
import type { GameState, FacilityInstance } from '../domain/models'

const TEST_MARKET: GameState['market'] = {
  week: 1,
  featuredRecipeId: '',
  pressure: 'stable',
  costMultiplier: 1,
}

const TEST_DIRECTIVE: GameState['directiveState'] = {
  selectedId: null,
  history: [],
}

const TEST_CONFIG: GameState['config'] = {
  clearanceThresholds: [],
  fundingBasePerWeek: 0,
  containmentWeeklyDecay: 0,
  attritionPerWeek: 1,
  durationModel: 'attrition',
  maxActiveCases: 10,
  trainingSlots: 1,
  partialMargin: 0,
  stageScalar: 1,
  challengeModeEnabled: false,
  probabilityK: 1,
  raidCoordinationPenaltyPerExtraTeam: 0,
  weeksPerYear: 52,
  fundingPerResolution: 0,
  fundingPenaltyPerFail: 0,
  fundingPenaltyPerUnresolved: 0,
  containmentDeltaPerResolution: 0,
  containmentDeltaPerFail: 0,
  containmentDeltaPerUnresolved: 0,
}

function makeTestState(overrides: Partial<GameState> = {}): GameState {
  return {
    containmentRating: 0,
    clearanceLevel: 0,
    funding: 0,
    week: 1,
    facilityState: { facilities: {} },
    academyTier: 0,
    rngSeed: 0,
    rngState: 0,
    gameOver: false,
    directiveState: TEST_DIRECTIVE,
    agents: {},
    staff: {},
    candidates: [],
    teams: {},
    cases: {},
    templates: {},
    reports: [],
    events: [],
    inventory: {},
    trainingQueue: [],
    productionQueue: [],
    knowledge: {},
    market: TEST_MARKET,
    config: TEST_CONFIG,
    ...overrides,
  }
}

function makeTestFacility(overrides: Partial<FacilityInstance> = {}): FacilityInstance {
  return {
    facilityId: 'research_lab',
    category: 'research_lab',
    level: 1,
    maxLevel: 3,
    status: 'active',
    effects: { researchSpeedMultiplier: 1 },
    ...overrides,
  }
}

describe('Facility Progression System', () => {
  it('initiates an upgrade deterministically', () => {
    const facility = makeTestFacility({ status: 'active', level: 1 })
    const state = makeTestState({
      funding: 100,
      week: 10,
      facilityState: { facilities: { research_lab: facility } },
    })
    const upgraded = applyFacilityUpgrade(state, 'research_lab', { costMoney: 100, costMaterials: 0, buildWeeks: 2, effectDeltas: { researchSpeedMultiplier: 0.5 } })
    expect(upgraded.facilityState?.facilities.research_lab.upgradeInProgress).toBe(true)
    expect(upgraded.facilityState?.facilities.research_lab.upgradeStartedWeek).toBe(10)
    expect(upgraded.facilityState?.facilities.research_lab.upgradeCompleteWeek).toBe(12)
    expect(upgraded.facilityState?.facilities.research_lab.status).toBe('upgrading')
  })

  it('progresses and completes upgrades deterministically', () => {
    const facility = makeTestFacility({ status: 'upgrading', level: 1, upgradeInProgress: true, upgradeStartedWeek: 10, upgradeCompleteWeek: 12 })
    let state = makeTestState({
      week: 11,
      facilityState: { facilities: { research_lab: facility } },
    })
    state = advanceFacilityUpgrades(state)
    expect(state.facilityState?.facilities.research_lab.status).toBe('upgrading')
    state = { ...state, week: 12 }
    state = advanceFacilityUpgrades(state)
    expect(state.facilityState?.facilities.research_lab.status).toBe('active')
    expect(state.facilityState?.facilities.research_lab.level).toBe(2)
    expect(state.facilityState?.facilities.research_lab.upgradeInProgress).toBe(false)
  })

  it('enforces prerequisites and does not upgrade if missing', () => {
    const facility = makeTestFacility({ status: 'available', level: 1 })
    const state = makeTestState({
      week: 10,
      facilityState: { facilities: { research_lab: facility } },
    })
    // Missing required research
    const upgraded = applyFacilityUpgrade(state, 'research_lab', { costMoney: 100, costMaterials: 0, buildWeeks: 2, requirements: { requiredResearchIds: ['r1'] }, effectDeltas: { researchSpeedMultiplier: 0.5 } })
    expect(upgraded.facilityState?.facilities.research_lab.level).toBe(1)
    expect(upgraded.facilityState?.facilities.research_lab.upgradeInProgress).not.toBe(true)
  })

  it('applies effect deltas on completion', () => {
    const facility = makeTestFacility({ status: 'upgrading', level: 1, upgradeInProgress: true, upgradeStartedWeek: 10, upgradeCompleteWeek: 12, effects: { researchSpeedMultiplier: 1 }, pendingEffectDeltas: { researchSpeedMultiplier: 0.5 } })
    let state = makeTestState({
      week: 12,
      facilityState: { facilities: { research_lab: facility } },
    })
    state = advanceFacilityUpgrades(state)
    expect(state.facilityState?.facilities.research_lab.effects.researchSpeedMultiplier).toBe(1.5)
  })

  it('summarizes facility effects for downstream systems', () => {
    const facilityA = makeTestFacility({ facilityId: 'research_lab', effects: { researchSpeedMultiplier: 1.5, researchSlots: 2 } })
    const facilityB = makeTestFacility({ facilityId: 'fabrication_lab', effects: { fabricationYield: 2 } })
    const state = makeTestState({
      week: 10,
      facilityState: { facilities: { research_lab: facilityA, fabrication_lab: facilityB } },
    })
    const summary = getFacilityEffectSummary(state)
    expect(summary.researchSpeedMultiplier).toBe(1.5)
    expect(summary.researchSlots).toBe(2)
    expect(summary.fabricationYield).toBe(2)
  })
})
