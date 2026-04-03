import {
  type Agent,
  type CaseInstance,
  type GameConfig,
  type GameState,
  type ResolutionOutcome,
  type Team,
} from '../models'
import { roll } from '../math'
import {
  buildAggregatedLeaderBonus,
  getTeamMemberIds,
  getUniqueTeamMembers,
} from '../teamSimulation'
import { evaluateCaseResolutionContext } from './scoring'
import { getRaidCoordinationAdjustment } from './resolve'
import { spawnCase } from './spawn'
import type { AgencyProtocolState } from '../protocols'

export interface RaidResolutionContext {
  partyCardScoreBonus?: number
  partyCardReasons?: string[]
  protocolState?: AgencyProtocolState
}

/**
 * Resolve a raid case with multiple assigned teams.
 * Each additional team beyond the first introduces a coordination penalty
 * capped at 35%, reflected as a delta reduction and a reason string.
 */
export function resolveRaid(
  c: CaseInstance,
  assignedTeams: Team[],
  agentsById: Record<string, Agent>,
  config: GameConfig,
  rng: () => number,
  inventory: GameState['inventory'] = {},
  context: RaidResolutionContext = {}
): ResolutionOutcome {
  const raidAgents: Agent[] = getUniqueTeamMembers(
    assignedTeams.map((team) => team.id),
    Object.fromEntries(assignedTeams.map((team) => [team.id, team])),
    agentsById
  )

  const supportTags = [...new Set(assignedTeams.flatMap((team) => team.tags))]
  const leaderBonusOverride = assignedTeams.some((team) => getTeamMemberIds(team).length > 1)
    ? buildAggregatedLeaderBonus(assignedTeams, agentsById)
    : undefined
  const coordination = getRaidCoordinationAdjustment(assignedTeams.length, config)

  return evaluateCaseResolutionContext({
    caseData: c,
    agents: raidAgents,
    config,
    context: {
      inventory,
      supportTags,
      preflight: {
        selectedTeamCount: assignedTeams.length,
        minTeamCount: c.raid?.minTeams ?? 2,
      },
      leaderBonusOverride,
      scoreAdjustment: coordination.scoreAdjustment,
      scoreAdjustmentReason: coordination.reason,
      partyCardScoreBonus: context.partyCardScoreBonus,
      partyCardReasons: context.partyCardReasons,
      protocolState: context.protocolState,
      triggerEvent: 'OnCaseStart',
    },
    resolutionRoll: c.mode === 'probability' ? rng() : undefined,
  }).outcome
}

const RAID_TRIGGER_PER_PRESSURE_CASE = 0.1
const RAID_EXTRA_CASE_PROB = 0.4
const FATIGUE_HIT = 15

function applyRaidFatigueToAllAgents(agents: GameState['agents']): GameState['agents'] {
  return Object.fromEntries(
    Object.entries(agents).map(([id, agent]) => [
      id,
      { ...agent, fatigue: Math.min(100, agent.fatigue + FATIGUE_HIT) },
    ])
  )
}

/**
 * Probabilistically trigger a raid based on high-stage open cases.
 * A raid spawns 1-2 additional cases and applies a fatigue hit to all agents.
 */
export function applyRaids(
  state: GameState,
  pressureCaseIds: string[] = Object.keys(state.cases),
  rng: () => number
): {
  state: GameState
  spawnedCaseIds: string[]
  spawnedCases: { caseId: string; trigger: 'raid_pressure' }[]
  notes: string[]
} {
  const pressureCount = pressureCaseIds.filter((caseId) => {
    const currentCase = state.cases[caseId]

    return currentCase && currentCase.status === 'open' && currentCase.stage >= 3
  }).length

  if (!roll(pressureCount * RAID_TRIGGER_PER_PRESSURE_CASE, rng)) {
    return { state, spawnedCaseIds: [], spawnedCases: [], notes: [] }
  }

  const usedIds = new Set(Object.keys(state.cases))
  const raidCases = [spawnCase(state, null, 'raid', [], rng, usedIds)]

  if (roll(RAID_EXTRA_CASE_PROB, rng)) {
    raidCases.push(spawnCase(state, null, 'raid', [], rng, usedIds))
  }

  const notes = [
    `RAID triggered by ${pressureCount} high-pressure case(s).`,
    `Spawned ${raidCases.length} raid case(s). All agents fatigued +${FATIGUE_HIT}.`,
  ]

  return {
    state: {
      ...state,
      agents: applyRaidFatigueToAllAgents(state.agents),
      cases: {
        ...state.cases,
        ...Object.fromEntries(raidCases.map((raidCase) => [raidCase.id, raidCase])),
      },
    },
    spawnedCaseIds: raidCases.map((raidCase) => raidCase.id),
    spawnedCases: raidCases.map((raidCase) => ({
      caseId: raidCase.id,
      trigger: 'raid_pressure' as const,
    })),
    notes,
  }
}
