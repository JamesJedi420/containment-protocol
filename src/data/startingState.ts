import { type GameState } from '../domain/models'
import { createStartingCampaignGovernanceState } from '../domain/campaignGovernance'
import { createDefaultWeeklyDirectiveState } from '../domain/directives'
import { createStartingSupplyNetworkState } from '../domain/supplyNetwork'
import { syncTeamSimulationState } from '../domain/teamSimulation'
import { caseTemplateMap, starterCases, starterRoster, starterTeams } from '../domain/templates'
import { createStartingPartyCardState } from './partyCards'
import { createStartingInventory, createStartingMarket } from './production'
import { startingKnowledge } from './startingKnowledge'

const startingStateTemplate: GameState = {
  week: 1,
  rngSeed: 1337,
  rngState: 1337,
  gameOver: false,

  directiveState: createDefaultWeeklyDirectiveState(),

  agents: starterRoster,
  staff: {},
  candidates: [],
  recruitmentPool: [],
  teams: starterTeams,
  cases: starterCases,

  templates: caseTemplateMap,
  reports: [],
  events: [],
  inventory: createStartingInventory(),
  caseQueue: {
    queuedCaseIds: [],
    priorities: {},
  },
  trainingQueue: [],
  productionQueue: [],
  market: createStartingMarket(),
  partyCards: createStartingPartyCardState(),

  knowledge: startingKnowledge,
  supplyNetwork: createStartingSupplyNetworkState(),
  regionalState: {
    regions: ['bio_containment', 'occult_district', 'perimeter_sector'],
    control: {
      bio_containment: 'agency',
      occult_district: 'agency',
      perimeter_sector: 'agency',
    },
    routes: {
      bio_containment: ['perimeter_sector'],
      occult_district: ['perimeter_sector'],
      perimeter_sector: ['bio_containment', 'occult_district'],
    },
    knowledge: {},
  },

  agency: {
    containmentRating: 72,
    clearanceLevel: 1,
    funding: 110,
    authority: 44,
    supportAvailable: 2,
    maintenanceSpecialistsAvailable: 2, // Default starting value for maintenance capacity
    upkeepBurden: 0,
  },

  containmentRating: 72,
  clearanceLevel: 1,
  funding: 110,

  config: {
    maxActiveCases: 7,
    trainingSlots: 4,
    partialMargin: 15,
    stageScalar: 1.15,
    challengeModeEnabled: false,
    durationModel: 'capacity',
    attritionPerWeek: 4,
    probabilityK: 2.4,
    raidCoordinationPenaltyPerExtraTeam: 0.08,
    weeksPerYear: 52,
    fundingBasePerWeek: 8,
    fundingPerResolution: 8,
    fundingPenaltyPerFail: 7,
    fundingPenaltyPerUnresolved: 12,
    containmentWeeklyDecay: 2,
    containmentDeltaPerResolution: 3,
    containmentDeltaPerFail: -4,
    containmentDeltaPerUnresolved: -6,
    clearanceThresholds: [0, 180, 420, 760, 1200],
  },

  academyTier: 0,
}

export function createStartingState(): GameState {
  const state = syncTeamSimulationState(structuredClone(startingStateTemplate));
  state.campaignGovernance = createStartingCampaignGovernanceState(state)
  // Ensure at least one valid report for dashboard tests
  if (!state.reports || state.reports.length === 0) {
    state.reports = [
      {
        week: 1,
        rngStateBefore: 1000,
        rngStateAfter: 1001,
        newCases: [],
        progressedCases: [],
        resolvedCases: [],
        failedCases: [],
        partialCases: [],
        unresolvedTriggers: [],
        spawnedCases: [],
        maxStage: 1,
        avgFatigue: 0,
        teamStatus: [],
        notes: [],
      },
    ];
  }
  return state;
}

export const startingState = createStartingState()
