import { type GameState } from '../domain/models'
import { createDefaultWeeklyDirectiveState } from '../domain/directives'
import { createInitialFactionState } from '../domain/factions'
import { refreshContractBoard } from '../domain/contracts'
import { syncTeamSimulationState } from '../domain/teamSimulation'
import { ensureManagedGameState } from '../domain/gameStateManager'
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
  factions: createInitialFactionState(),

  agency: {
    containmentRating: 72,
    clearanceLevel: 1,
    funding: 110,
    supportAvailable: 2,
    maintenanceSpecialistsAvailable: 2, // Default starting value for maintenance capacity
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
  return ensureManagedGameState(
    refreshContractBoard(syncTeamSimulationState(structuredClone(startingStateTemplate)))
  )
}

export const startingState = createStartingState()
