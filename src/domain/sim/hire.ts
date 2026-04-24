import { type Agent, type AgentData, type GameState, type Id } from '../models'
import { createRecruitmentScoutIntel } from '../agentPotential'
import {
  appendOperationEventDrafts,
  type AnyOperationEventDraft,
  createAgentHiredDraft,
  createFactionStandingChangedDraft,
  createFactionUnlockAvailableDraft,
} from '../events'
import { getTeamAssignedCaseId, normalizeGameState } from '../teamSimulation'
import { createAgent, mergeDomainStats, mapAgentRoleToOperationalRole } from '../agent/factory'
import { createDefaultAgentProgression, deriveDomainStatsFromBase } from '../agentDefaults'
import { appendAgentHistoryEntry, createAgentHistoryEntry } from '../agent/lifecycle'
import {
  applyFactionRecruitInteraction,
  diffFactionRecruitUnlocks,
  getFactionRecruitUnlocks,
} from '../factions'
import {
  getCandidatePool,
  getCandidateFunnelStage,
  getCandidateWeeklyCost,
  isCandidateHireable,
  mapRecruitRoleToAgentRole,
  normalizeCandidateCategory,
  normalizeStaffCandidateSpecialty,
  previewCandidate,
  resolveCandidateActualPotentialTier,
  syncCandidatePoolState,
} from '../recruitment'
import { agentClassTables } from '../templates/classTables'

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
  candidate: Extract<GameState['candidates'][number], { category: 'agent' }>
): Agent {
  const agentData = candidate.agentData
  const role = mapRecruitRoleToAgentRole(agentData.specialization, agentData.role)
  const classTags = agentClassTables[role]?.tags ?? []
  const tags = [...new Set([role, ...classTags, agentData.specialization, ...agentData.traits])]
  const baseStats = deriveBaseStatsFromCandidate(agentData)
  const derivedStats = deriveDomainStatsFromBase(baseStats)
  const progressionBase = createDefaultAgentProgression(1)
  const livePotentialTier = resolveCandidateActualPotentialTier(candidate)

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
        potentialTier: livePotentialTier,
        growthProfile: agentData.growthProfile ?? progressionBase.growthProfile,
        ...(candidate.scoutReport
          ? {
              potentialIntel: createRecruitmentScoutIntel(
                candidate.scoutReport.confirmedTier ?? candidate.scoutReport.projectedTier,
                candidate.scoutReport.confidence,
                candidate.scoutReport.scoutedWeek ?? week,
                candidate.scoutReport.exactKnown
              ),
            }
          : {}),
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

  if (getCandidateFunnelStage(candidate) === 'lost') {
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
  const previousUnlocks = getFactionRecruitUnlocks({ factions: state.factions ?? {} })

  if (recruitCategory === 'agent' && candidate.agentData) {
    const sourceDisposition = candidate.sourceDisposition ?? 'supportive'
    const relationshipDelta = candidate.sourceContactId
      ? sourceDisposition === 'adversarial'
        ? -6
        : 6
      : 0
    const reputationDelta = candidate.sourceFactionId
      ? sourceDisposition === 'adversarial'
        ? -4
        : 4
      : 0
    const factionBefore = candidate.sourceFactionId ? state.factions?.[candidate.sourceFactionId] : undefined
    const contactBefore =
      candidate.sourceFactionId && candidate.sourceContactId
        ? (factionBefore?.contacts ?? []).find((contact) => contact.id === candidate.sourceContactId)
        : undefined
    const nextFactions = applyFactionRecruitInteraction(state.factions ?? {}, {
      factionId: candidate.sourceFactionId,
      contactId: candidate.sourceContactId,
      relationshipDelta,
      reputationDelta,
    })
    const factionAfter = candidate.sourceFactionId ? nextFactions[candidate.sourceFactionId] : undefined
    const contactAfter =
      candidate.sourceFactionId && candidate.sourceContactId
        ? (factionAfter?.contacts ?? []).find((contact) => contact.id === candidate.sourceContactId)
        : undefined
    const nextUnlocks = getFactionRecruitUnlocks({ factions: nextFactions })
    const nextState = syncCandidatePoolState(
      {
        ...state,
        funding: state.funding - weeklyCost,
        factions: nextFactions,
        agents: {
          ...state.agents,
          [candidateId]: createActiveAgent(
            candidateId,
            state.week,
            candidate.name,
            candidate.age,
            candidate.portraitId,
            candidate as Extract<GameState['candidates'][number], { category: 'agent' }>
          ),
        },
      },
      remainingCandidates
    )

    eventDrafts.push(
      createAgentHiredDraft({
        week: state.week,
        candidateId,
        agentId: candidateId,
        agentName: candidate.name,
        recruitCategory,
        sourceFactionId: candidate.sourceFactionId,
        sourceFactionName: candidate.sourceFactionName,
        sourceContactId: candidate.sourceContactId,
        sourceContactName: candidate.sourceContactName,
      })
    )

    if (candidate.sourceFactionId && factionBefore && factionAfter) {
      eventDrafts.push(
        createFactionStandingChangedDraft({
          week: state.week,
          factionId: candidate.sourceFactionId,
          factionName: candidate.sourceFactionName ?? factionAfter.name ?? candidate.sourceFactionId,
          delta: reputationDelta,
          standingBefore: Math.round((factionBefore.reputation ?? 0) / 5),
          standingAfter: Math.round(
            (factionAfter.reputation ?? factionBefore.reputation ?? 0) / 5
          ),
          reputationBefore: factionBefore.reputation ?? 0,
          reputationAfter: factionAfter.reputation ?? factionBefore.reputation ?? 0,
          reason: 'recruitment.hired',
          interactionLabel:
            candidate.sourceSummary ??
            `${candidate.name} entered through a ${sourceDisposition} faction channel`,
          contactId: candidate.sourceContactId,
          contactName: candidate.sourceContactName,
          contactRelationshipBefore: contactBefore?.relationship,
          contactRelationshipAfter: contactAfter?.relationship,
          contactDelta: relationshipDelta,
        })
      )

      for (const unlock of diffFactionRecruitUnlocks(previousUnlocks, nextUnlocks).filter(
        (entry) => entry.factionId === candidate.sourceFactionId
      )) {
        eventDrafts.push(
          createFactionUnlockAvailableDraft({
            week: state.week,
            factionId: unlock.factionId,
            factionName: unlock.factionName,
            contactId: unlock.contactId,
            contactName: unlock.contactName,
            label: unlock.label,
            summary: unlock.summary ?? unlock.label,
            disposition: unlock.disposition === 'adversarial' ? 'adversarial' : 'supportive',
          })
        )
      }
    }

    return normalizeGameState(appendOperationEventDrafts(nextState, eventDrafts))
  }

  if (recruitCategory === 'staff' && candidate.staffData) {
    const nextState = syncCandidatePoolState(
      {
        ...state,
        funding: state.funding - weeklyCost,
        staff: {
          ...state.staff,
          [candidateId]: {
            ...candidate.staffData,
            specialty: normalizeStaffCandidateSpecialty(candidate.staffData.specialty),
          },
        },
      },
      remainingCandidates
    )

    eventDrafts.push(
      createAgentHiredDraft({
        week: state.week,
        candidateId,
        agentId: candidateId,
        agentName: candidate.name,
        recruitCategory,
      })
    )

    return normalizeGameState(appendOperationEventDrafts(nextState, eventDrafts))
  }

  if (recruitCategory === 'instructor' && candidate.instructorData) {
    const nextState = syncCandidatePoolState(
      {
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
      },
      remainingCandidates
    )

    eventDrafts.push(
      createAgentHiredDraft({
        week: state.week,
        candidateId,
        agentId: candidateId,
        agentName: candidate.name,
        recruitCategory,
      })
    )

    return normalizeGameState(appendOperationEventDrafts(nextState, eventDrafts))
  }

  return normalizeNoopIfDirty(state)
}
