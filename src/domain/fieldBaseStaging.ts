// SPE-1654: bounded field-base staging — compact quality tags, deterministic expedition
// rotation (swap exhausted/damaged operative for a fresher bench/idle operative), and
// downstream supply scaling on mission rewards. Does not relax generic roster editing;
// only this module mutates deployed team membership mid-contract.

import {
  appendAgentHistoryEntry,
  createAgentHistoryEntry,
  setAgentAssignment,
} from './agent/lifecycle'
import { clamp } from './math'
import type {
  ActiveContractRuntime,
  Agent,
  CaseInstance,
  FieldBaseStagingPacket,
  FieldBaseStagingQuality,
  GameState,
  Id,
  MissionRewardInventoryGrant,
  Team,
} from './models'
import { rebuildDeploymentCarryInForCase } from './sim/downtimeCarryIn'
import { getTeamAssignedCaseId, getTeamMemberIds, normalizeGameState } from './teamSimulation'

const QUALITY_MAX = 3
const ROTATION_FATIGUE_THRESHOLD = 70

/** Coerce one persisted quality band onto 0..QUALITY_MAX; non-finite inputs become 0 (never NaN). */
function coerceQualityBand(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) {
    return 0
  }
  return clamp(Math.round(n), 0, QUALITY_MAX)
}

/**
 * Normalize unknown persisted `quality` objects onto the canonical ladder.
 * Shared with `sanitizeContractSystemState` so clamp rules stay single-sourced.
 */
export function sanitizeFieldBaseQualityBands(quality: unknown): FieldBaseStagingQuality {
  const q = quality && typeof quality === 'object' ? (quality as Record<string, unknown>) : {}
  return {
    safety: coerceQualityBand(q.safety),
    medical: coerceQualityBand(q.medical),
    supply: coerceQualityBand(q.supply),
    extractionAccess: coerceQualityBand(q.extractionAccess),
  }
}

/**
 * Returns a canonical packet or `null` when the persisted blob is unusable (missing quality object,
 * blank label after trim, etc.).
 */
export function sanitizePersistedFieldBasePacket(fieldBase: unknown): FieldBaseStagingPacket | null {
  if (!fieldBase || typeof fieldBase !== 'object') {
    return null
  }
  const fb = fieldBase as { label?: unknown; quality?: unknown }
  const label = typeof fb.label === 'string' ? fb.label.trim() : ''
  if (!label || !fb.quality || typeof fb.quality !== 'object') {
    return null
  }
  return { label, quality: sanitizeFieldBaseQualityBands(fb.quality) }
}

export function normalizeFieldBaseQuality(q: FieldBaseStagingQuality): FieldBaseStagingQuality {
  return sanitizeFieldBaseQualityBands(q)
}

export function readFieldBaseFromCase(caseData: CaseInstance): FieldBaseStagingPacket | null {
  const raw = caseData.contract as ActiveContractRuntime | undefined
  const fb = raw?.fieldBase
  return sanitizePersistedFieldBasePacket(fb)
}

/** Deterministic fatigue relief for an operative rotated back through the staging point. */
export function fieldBaseRotationFatigueRelief(packet: FieldBaseStagingPacket): number {
  const { medical, safety } = packet.quality
  return Math.min(28, medical * 7 + safety * 5)
}

/**
 * Deterministic material supply multiplier from staging `supply` band (1.0 .. 1.21).
 */
export function fieldBaseMaterialSupplyMultiplier(packet: FieldBaseStagingPacket): number {
  const supply = packet.quality.supply
  return (100 + supply * 7) / 100
}

export function applyFieldBaseSupplyToInventoryRewards(
  packet: FieldBaseStagingPacket,
  grants: MissionRewardInventoryGrant[]
): MissionRewardInventoryGrant[] {
  const mult = fieldBaseMaterialSupplyMultiplier(packet)
  return grants.map((grant) => {
    if (grant.kind !== 'material' || grant.quantity <= 0) {
      return grant
    }
    const nextQty = Math.max(1, Math.floor(grant.quantity * mult))
    return { ...grant, quantity: nextQty }
  })
}

export { formatFieldBaseStagingLegibilityLine } from '../data/fieldBaseStagingCopy'

function withTeamMembers(team: Team, memberIds: Id[]): Team {
  const uniqueMemberIds = [...new Set(memberIds)]
  const leaderId =
    team.leaderId && uniqueMemberIds.includes(team.leaderId)
      ? team.leaderId
      : (uniqueMemberIds[0] ?? null)

  return {
    ...team,
    memberIds: uniqueMemberIds,
    agentIds: uniqueMemberIds,
    leaderId,
  }
}

function hasDeployableInjury(agent: Agent): boolean {
  const flags = agent.vitals?.statusFlags ?? []
  return flags.some((f) => f === 'injury:minor' || f === 'injury:moderate')
}

function injuryRank(agent: Agent): number {
  const flags = agent.vitals?.statusFlags ?? []
  if (flags.includes('injury:moderate')) return 2
  if (flags.includes('injury:minor')) return 1
  return 0
}

function isRotationCandidate(agent: Agent | undefined): agent is Agent {
  if (!agent || agent.status === 'dead' || agent.status === 'resigned') {
    return false
  }
  if (agent.assignment?.state === 'training' || agent.assignment?.state === 'recovery') {
    return false
  }
  return true
}

function pickOutgoingMemberId(teamMembers: Agent[]): Id | null {
  const scored = teamMembers
    .filter((a) => isRotationCandidate(a))
    .filter((a) => a.fatigue >= ROTATION_FATIGUE_THRESHOLD || hasDeployableInjury(a))
    .map((a) => ({
      id: a.id,
      fatigue: a.fatigue,
      inj: injuryRank(a),
    }))
    .sort(
      (x, y) =>
        y.fatigue - x.fatigue ||
        y.inj - x.inj ||
        x.id.localeCompare(y.id)
    )

  return scored[0]?.id ?? null
}

function collectIncomingPool(state: GameState, deployedTeamId: Id): Agent[] {
  const pool: Agent[] = []
  const seen = new Set<Id>()

  for (const agent of Object.values(state.agents)) {
    if (!isRotationCandidate(agent) || agent.status !== 'active') {
      continue
    }
    const host = Object.values(state.teams).find((t) => getTeamMemberIds(t).includes(agent.id))
    if (!host) {
      if (!seen.has(agent.id)) {
        pool.push(agent)
        seen.add(agent.id)
      }
      continue
    }
    if (host.id === deployedTeamId) {
      continue
    }
    const assignedCase = getTeamAssignedCaseId(host)
    if (!assignedCase) {
      if (!seen.has(agent.id)) {
        pool.push(agent)
        seen.add(agent.id)
      }
    }
  }

  return pool
}

function pickIncomingAgentId(pool: Agent[], excludeId: Id): Id | null {
  const sorted = [...pool]
    .filter((a) => a.id !== excludeId)
    .sort((a, b) => a.fatigue - b.fatigue || a.id.localeCompare(b.id))

  return sorted[0]?.id ?? null
}

/**
 * At week open, for each in-progress contract case with `fieldBase`, swap one exhausted
 * or field-injured operative for the freshest eligible bench / off-mission operative.
 * Applies deterministic fatigue relief to the rotated-out operative.
 */
export function applyFieldBaseStagingRotationAtWeekOpen(state: GameState): GameState {
  let next: GameState = state
  let teams = { ...state.teams }
  let mutated = false

  for (const caseData of Object.values(state.cases)) {
    if (caseData.status !== 'in_progress' || caseData.assignedTeamIds.length !== 1) {
      continue
    }

    const packet = readFieldBaseFromCase(caseData)
    if (!packet) {
      continue
    }

    const teamId = caseData.assignedTeamIds[0]!
    const team = teams[teamId]
    if (!team) {
      continue
    }

    const memberIds = getTeamMemberIds(team)
    const members = memberIds
      .map((id) => next.agents[id])
      .filter((a): a is Agent => Boolean(a))

    const outgoingId = pickOutgoingMemberId(members)
    if (!outgoingId) {
      continue
    }

    const pool = collectIncomingPool({ ...next, teams }, teamId)
    const incomingId = pickIncomingAgentId(pool, outgoingId)
    if (!incomingId) {
      continue
    }

    const incomingSourceTeam = Object.values(teams).find((t) =>
      getTeamMemberIds(t).includes(incomingId)
    )

    const nextTeams = { ...teams }

    if (incomingSourceTeam && incomingSourceTeam.id !== teamId) {
      nextTeams[incomingSourceTeam.id] = withTeamMembers(
        incomingSourceTeam,
        getTeamMemberIds(incomingSourceTeam).filter((id) => id !== incomingId)
      )
    }

    const deployed = nextTeams[teamId]!
    const replacedMembers = getTeamMemberIds(deployed).map((id) =>
      id === outgoingId ? incomingId : id
    )
    nextTeams[teamId] = withTeamMembers(deployed, replacedMembers)

    const relief = fieldBaseRotationFatigueRelief(packet)
    const outAgent = next.agents[outgoingId]
    let rotatedOut = outAgent
    if (
      rotatedOut &&
      rotatedOut.assignment?.state === 'assigned' &&
      rotatedOut.assignment.caseId === caseData.id
    ) {
      rotatedOut = appendAgentHistoryEntry(
        setAgentAssignment(rotatedOut, { state: 'idle' }),
        createAgentHistoryEntry(
          state.week,
          'assignment.team_unassigned',
          `Field staging rotation released from ${caseData.title}.`
        )
      )
    }
    if (rotatedOut) {
      rotatedOut = {
        ...rotatedOut,
        fatigue: clamp(rotatedOut.fatigue - relief, 0, 100),
      }
    }

    const inAgent = next.agents[incomingId]
    const rotatedIn =
      inAgent && inAgent.status === 'active' && inAgent.assignment?.state !== 'training'
        ? appendAgentHistoryEntry(
            setAgentAssignment(inAgent, {
              state: 'assigned',
              caseId: caseData.id,
              teamId,
              startedWeek: state.week,
            }),
            createAgentHistoryEntry(
              state.week,
              'assignment.team_assigned',
              `Field staging rotation forward assigned to ${caseData.title}.`
            )
          )
        : inAgent

    const nextAgents: GameState['agents'] = {
      ...next.agents,
      ...(rotatedOut ? { [outgoingId]: rotatedOut } : {}),
      ...(rotatedIn ? { [incomingId]: rotatedIn } : {}),
    }

    const interim: GameState = { ...next, teams: nextTeams, agents: nextAgents }
    const carryIn = rebuildDeploymentCarryInForCase(interim, caseData.id)
    next = {
      ...interim,
      cases: {
        ...interim.cases,
        [caseData.id]: {
          ...interim.cases[caseData.id]!,
          deploymentCarryInByAgentId: carryIn,
        },
      },
    }
    teams = nextTeams
    mutated = true
  }

  return mutated ? normalizeGameState(next) : state
}
