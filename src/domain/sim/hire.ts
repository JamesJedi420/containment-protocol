import { type Agent, type AgentData, type AgentRole, type GameState, type Id } from '../models'
import { appendOperationEventDrafts, type AnyOperationEventDraft, createAgentHiredDraft } from '../events'
import { getTeamAssignedCaseId, normalizeGameState } from '../teamSimulation'
import { createAgent, mergeDomainStats, mapAgentRoleToOperationalRole } from '../agent/factory'
import { createDefaultAgentProgression, deriveDomainStatsFromBase } from '../agentDefaults'
import { appendAgentHistoryEntry, createAgentHistoryEntry } from '../agent/lifecycle'
import {
  getCandidatePool,
  getCandidateWeeklyCost,
  isCandidateHireable,
  normalizeCandidateCategory,
  normalizeStaffCandidateSpecialty,
  previewCandidate,
  syncCandidatePoolState,
} from '../recruitment'

function shouldNormalizeNoopState(state: GameState) {
  for (const team of Object.values(state.teams)) {
    const memberIds = team.memberIds ?? []
    const agentIds = team.agentIds ?? []

    if (memberIds.length !== agentIds.length) {
      return true
    }

    if (memberIds.some((agentId, index) => agentId !== agentIds[index])) {
      return true
    }

    if (team.leaderId && !memberIds.includes(team.leaderId)) {
      return true
    }

    const assignedCaseId = getTeamAssignedCaseId(team)
    if (assignedCaseId && !state.cases[assignedCaseId]) {
      return true
    }
  }

  return false
}

function normalizeNoopIfDirty(state: GameState) {
  return shouldNormalizeNoopState(state) ? normalizeGameState(state) : state
}

function mapRecruitRoleToAgentRole(
  specialization: string,
  recruitRole: AgentData['role']
): AgentRole {
  if (recruitRole === 'field' || recruitRole === 'combat') {
    return 'hunter'
  }

  if (recruitRole === 'containment') {
    return specialization.includes('anomaly') || specialization.includes('ward')
      ? 'occultist'
      : 'medium'
  }

  if (recruitRole === 'analyst' || recruitRole === 'investigation') {
    return specialization.includes('signal') ? 'tech' : 'investigator'
  }

  if (specialization.includes('medical')) {
    return 'medic'
  }

  if (specialization.includes('liaison')) {
    return 'negotiator'
  }

  return 'tech'
}

function deriveBaseStatsFromCandidate(agentData: AgentData) {
  const domainStats = agentData.domainStats ?? {}

  if (agentData.stats) {
    return {
      combat: agentData.stats.combat,
      investigation: agentData.stats.investigation,
      utility: agentData.stats.utility,
      social: agentData.stats.social,
    }
  }

  const physicalStrength = domainStats.physical?.strength ?? 35
  const physicalEndurance = domainStats.physical?.endurance ?? 35
  const tacticalAwareness = domainStats.tactical?.awareness ?? 35
  const tacticalReaction = domainStats.tactical?.reaction ?? 35
  const cognitiveAnalysis = domainStats.cognitive?.analysis ?? 35
  const cognitiveInvestigation = domainStats.cognitive?.investigation ?? 35
  const socialNegotiation = domainStats.social?.negotiation ?? 35
  const socialInfluence = domainStats.social?.influence ?? 35
  const stabilityResistance = domainStats.stability?.resistance ?? 35
  const stabilityTolerance = domainStats.stability?.tolerance ?? 35
  const technicalEquipment = domainStats.technical?.equipment ?? 35
  const technicalAnomaly = domainStats.technical?.anomaly ?? 35

  return {
    combat: Math.round(
      (physicalStrength + physicalEndurance + tacticalAwareness + tacticalReaction) / 4
    ),
    investigation: Math.round((cognitiveAnalysis + cognitiveInvestigation + technicalAnomaly) / 3),
    utility: Math.round((technicalEquipment + stabilityResistance + stabilityTolerance) / 3),
    social: Math.round((socialNegotiation + socialInfluence) / 2),
  }
}

function createActiveAgent(
  candidateId: Id,
  week: number,
  name: string,
  age: number | undefined,
  portraitId: string | undefined,
  agentData: NonNullable<GameState['candidates'][number]['agentData']>
): Agent {
  const role = mapRecruitRoleToAgentRole(agentData.specialization, agentData.role)
  const tags = [...new Set([role, agentData.specialization, ...agentData.traits])]
  const baseStats = deriveBaseStatsFromCandidate(agentData)
  const derivedStats = deriveDomainStatsFromBase(baseStats)
  const progressionBase = createDefaultAgentProgression(1)

  return appendAgentHistoryEntry(
    createAgent({
      id: candidateId,
      name,
      role,
      createdWeek: week,
      specialization: agentData.specialization,
      operationalRole: mapAgentRoleToOperationalRole(role),
      identity: {
        portraitId,
      },
      age,
      baseStats,
      stats: mergeDomainStats(derivedStats, agentData.domainStats ?? {}),
      progression: {
        ...progressionBase,
        growthProfile: agentData.growthProfile ?? progressionBase.growthProfile,
      },
      traits: agentData.traits.map((traitId) => ({
        id: traitId,
        label: traitId,
        modifiers: {},
      })),
      tags,
      relationships: {},
      fatigue: 0,
      status: 'active',
    }),
    createAgentHistoryEntry(week, 'agent.hired', 'Hired into the agency.')
  )
}

export function hireCandidate(state: GameState, candidateId: string): GameState {
  const currentRecruitmentPool = getCandidatePool(state)
  const candidate = currentRecruitmentPool.find((entry) => entry.id === candidateId)

  if (!candidate) {
    return normalizeNoopIfDirty(state)
  }

  if (!isCandidateHireable(candidate.hireStatus)) {
    return normalizeNoopIfDirty(state)
  }

  const preview = previewCandidate(candidate, state)
  if (!preview.canHire) {
    return normalizeNoopIfDirty(state)
  }

  const weeklyCost = getCandidateWeeklyCost(candidate) ?? 0

  const remainingCandidates = currentRecruitmentPool.filter((entry) => entry.id !== candidateId)
  const eventDrafts: AnyOperationEventDraft[] = []
  const recruitCategory = normalizeCandidateCategory(candidate.category)

  if (recruitCategory === 'agent' && candidate.agentData) {
    const nextState = syncCandidatePoolState({
      ...state,
      funding: state.funding - weeklyCost,
      agents: {
        ...state.agents,
        [candidateId]: createActiveAgent(
          candidateId,
          state.week,
          candidate.name,
          candidate.age,
          candidate.portraitId,
          candidate.agentData
        ),
      },
    }, remainingCandidates)

    eventDrafts.push(createAgentHiredDraft({
      week: state.week,
      candidateId,
      agentId: candidateId,
      agentName: candidate.name,
      recruitCategory,
    }))

    return normalizeGameState(appendOperationEventDrafts(nextState, eventDrafts))
  }

  if (recruitCategory === 'staff' && candidate.staffData) {
    const nextState = syncCandidatePoolState({
      ...state,
      funding: state.funding - weeklyCost,
      staff: {
        ...state.staff,
        [candidateId]: {
          ...candidate.staffData,
          specialty: normalizeStaffCandidateSpecialty(candidate.staffData.specialty),
        },
      },
    }, remainingCandidates)

    eventDrafts.push(createAgentHiredDraft({
      week: state.week,
      candidateId,
      agentId: candidateId,
      agentName: candidate.name,
      recruitCategory,
    }))

    return normalizeGameState(appendOperationEventDrafts(nextState, eventDrafts))
  }

  if (recruitCategory === 'instructor' && candidate.instructorData) {
    const nextState = syncCandidatePoolState({
      ...state,
      funding: state.funding - weeklyCost,
      staff: {
        ...state.staff,
        [candidateId]: {
          role: 'instructor' as const,
          name: candidate.name,
          efficiency: candidate.instructorData.efficiency,
          instructorSpecialty: candidate.instructorData.instructorSpecialty,
        },
      },
    }, remainingCandidates)

    eventDrafts.push(createAgentHiredDraft({
      week: state.week,
      candidateId,
      agentId: candidateId,
      agentName: candidate.name,
      recruitCategory,
    }))

    return normalizeGameState(appendOperationEventDrafts(nextState, eventDrafts))
  }

  return normalizeNoopIfDirty(state)
}
