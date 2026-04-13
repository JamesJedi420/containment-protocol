// cspell:words kellan sato
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { getAgentStatCap } from '../domain/agentPotential'
import { trainingCatalog } from '../data/training'
import { evaluateAgentBreakdown } from '../domain/evaluateAgent'
import { getXpThresholdForLevel } from '../domain/progression'
import { cloneDomainStats, deriveDomainStatsFromBase } from '../domain/statDomains'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { assignTeam } from '../domain/sim/assign'
import { computeTeamScore } from '../domain/sim/scoring'
import {
  assessAgentTrainingQueue,
  assessTeamTrainingQueue,
  advanceTrainingQueues,
  cancelTraining,
  getTrainingCancelRefund,
  getTrainingFatigueSchedule,
  getTrainingIncurredFatigue,
  getTrainingProjectedTotalFatigue,
  getTeamTrainingScaledCost,
  getTrainingAptitudeBonus,
  isTeamBlockedByTraining,
  queueTeamTraining,
  queueTraining,
  spendSkillPoint,
  ROLE_TRAINING_APTITUDE,
  TRAINING_FATIGUE_GATE,
} from '../domain/sim/training'
import {
  buildAgentSquadCompositionProfile,
  getTeamMembers,
  normalizeGameState,
} from '../domain/teamSimulation'
import { type Agent } from '../domain/models'

const combatDrills = trainingCatalog.find((program) => program.trainingId === 'combat-drills')
const coordinationDrill = trainingCatalog.find(
  (program) => program.trainingId === 'coordination-drill'
)
const threatAssessment = trainingCatalog.find(
  (program) => program.trainingId === 'threat-assessment'
)

if (!combatDrills) {
  throw new Error('Missing combat-drills training program in catalog.')
}

if (!coordinationDrill) {
  throw new Error('Missing coordination-drill training program in catalog.')
}

if (!threatAssessment) {
  throw new Error('Missing threat-assessment training program in catalog.')
}

describe('training queue mechanics', () => {
  it('returns queue assessment metadata for locked and unaffordable programs', () => {
    const tier0 = createStartingState()
    const locked = assessAgentTrainingQueue(tier0, 'a_sato', threatAssessment.trainingId)

    expect(locked.canQueue).toBe(false)
    expect(locked.reason).toBe('program_locked')
    expect(locked.requiredTier).toBe(1)

    const lowFunding = {
      ...createStartingState(),
      academyTier: 1,
      funding: threatAssessment.fundingCost - 1,
    }
    const unaffordable = assessAgentTrainingQueue(lowFunding, 'a_sato', threatAssessment.trainingId)

    expect(unaffordable.canQueue).toBe(false)
    expect(unaffordable.reason).toBe('insufficient_funding')
    expect(unaffordable.requiredFunding).toBe(threatAssessment.fundingCost)
  })

  it('returns team drill scaled costs and affordability from queue assessment', () => {
    const state = createStartingState()
    const assessment = assessTeamTrainingQueue(state, 't_nightwatch', coordinationDrill.trainingId)

    expect(assessment.canQueue).toBe(true)
    expect(assessment.participantIds.length).toBe(4)
    expect(assessment.scaledCost).toBe(
      getTeamTrainingScaledCost(coordinationDrill.fundingCost, assessment.participantIds.length)
    )

    const lowFunding = {
      ...state,
      funding: assessment.scaledCost - 1,
    }
    const blocked = assessTeamTrainingQueue(
      lowFunding,
      't_nightwatch',
      coordinationDrill.trainingId
    )

    expect(blocked.canQueue).toBe(false)
    expect(blocked.reason).toBe('insufficient_funding')
    expect(blocked.requiredFunding).toBe(assessment.scaledCost)
  })

  it('rejects invalid queue starts and blocks deployed teams from training', () => {
    const startingState = createStartingState()

    expect(queueTraining(startingState, 'a_ava', 'missing-program')).toBe(startingState)

    const lowFundingState = {
      ...createStartingState(),
      funding: combatDrills.fundingCost - 1,
    }

    const lowFundingResult = queueTraining(lowFundingState, 'a_ava', combatDrills.trainingId)

    expect(lowFundingResult).toBe(lowFundingState)
    expect(lowFundingResult.funding).toBe(lowFundingState.funding)
    expect(lowFundingResult.trainingQueue).toHaveLength(0)

    const inactiveState = {
      ...createStartingState(),
      agents: {
        ...createStartingState().agents,
        a_ava: {
          ...createStartingState().agents.a_ava,
          status: 'injured' as const,
        },
      },
    }

    const inactiveResult = queueTraining(inactiveState, 'a_ava', combatDrills.trainingId)

    expect(inactiveResult).not.toBe(inactiveState)
    expect(inactiveResult.trainingQueue).toHaveLength(0)
    expect(inactiveResult.teams.t_nightwatch.derivedStats?.overall).toBeGreaterThan(0)

    const deployedState = assignTeam(createStartingState(), 'case-001', 't_nightwatch')

    const deployedResult = queueTraining(deployedState, 'a_ava', combatDrills.trainingId)

    expect(deployedResult).toBe(deployedState)
    expect(deployedResult.funding).toBe(deployedState.funding)
    expect(deployedResult.trainingQueue).toHaveLength(0)

    const queuedState = queueTraining(startingState, 'a_ava', combatDrills.trainingId)

    expect(queuedState).not.toBe(startingState)
    expect(queuedState.trainingQueue).toHaveLength(1)
    expect(queuedState.funding).toBe(startingState.funding - combatDrills.fundingCost)
    expect(queuedState.agents.a_ava.assignment).toMatchObject({
      state: 'training',
      startedWeek: startingState.week,
      teamId: 't_nightwatch',
      trainingProgramId: combatDrills.trainingId,
    })
    expect(queuedState.agents.a_ava.serviceRecord?.lastTrainingWeek).toBe(startingState.week)
    expect(queuedState.agents.a_ava.readinessProfile).toMatchObject({
      state: 'training',
      deploymentEligible: false,
    })
    expect(queuedState.agents.a_ava.history?.timeline.at(-1)).toMatchObject({
      week: startingState.week,
      eventType: 'agent.training_started',
      note: `Started ${combatDrills.name}.`,
    })
    expect(isTeamBlockedByTraining(queuedState.teams.t_nightwatch, queuedState.agents)).toBe(true)
    expect(queuedState.events[0]).toMatchObject({
      id: 'evt-000001',
      type: 'agent.training_started',
      sourceSystem: 'agent',
      timestamp: '2042-01-01T00:00:00.001Z',
      payload: {
        week: startingState.week,
        agentId: 'a_ava',
        agentName: 'Ava Brooks',
        trainingId: combatDrills.trainingId,
        trainingName: combatDrills.name,
        etaWeeks: combatDrills.durationWeeks,
        fundingCost: combatDrills.fundingCost,
      },
    })
  })

  it('completes training on the weekly tick and applies the stat gain', () => {
    const startingState = createStartingState()
    const queuedState = queueTraining(startingState, 'a_ava', combatDrills.trainingId)
    const nextQueueState = {
      ...queuedState,
      trainingQueue: queuedState.trainingQueue.map((entry) =>
        entry.agentId === 'a_ava' ? { ...entry, remainingWeeks: 1 } : entry
      ),
    }

    const result = advanceTrainingQueues(nextQueueState)
    const startingAgent = startingState.agents.a_ava
    const completedAgent = result.state.agents.a_ava

    expect(result.completed).toHaveLength(1)
    expect(result.state.trainingQueue).toHaveLength(0)
    expect(result.notes).toEqual(['Ava Brooks: Close-Quarters Drills completed.'])

    const aptitudeBonus = getTrainingAptitudeBonus(startingAgent.role, combatDrills.targetStat)
    // rawGain = statDelta + academyBonus(0) + aptitudeBonus + instructorBonus(0),
    // XP = rawGain * 10 * (durationWeeks / 2)
    const expectedXp =
      (combatDrills.statDelta + aptitudeBonus) * 10 * (combatDrills.durationWeeks / 2)
    const totalXpAfter = (startingAgent.progression?.xp ?? 0) + expectedXp

    expect(result.eventDrafts).toEqual([
      {
        type: 'progression.xp_gained',
        sourceSystem: 'agent',
        payload: {
          week: startingState.week,
          agentId: 'a_ava',
          agentName: 'Ava Brooks',
          xpAmount: expectedXp,
          reason: `${combatDrills.name} completed`,
          totalXp: totalXpAfter,
          level: startingAgent.progression?.level ?? startingAgent.level ?? 1,
          levelsGained: 0,
        },
      },
      {
        type: 'agent.training_completed',
        sourceSystem: 'agent',
        payload: {
          week: startingState.week,
          queueId: queuedState.trainingQueue[0]!.id,
          agentId: 'a_ava',
          agentName: 'Ava Brooks',
          trainingId: combatDrills.trainingId,
          trainingName: combatDrills.name,
        },
      },
    ])
    expect(completedAgent.assignment).toMatchObject({ state: 'idle' })
    expect(completedAgent.serviceRecord?.lastTrainingWeek).toBe(startingState.week)
    expect(completedAgent.readinessProfile?.state).toBe('ready')
    expect(completedAgent.baseStats.combat).toBe(
      startingAgent.baseStats.combat + combatDrills.statDelta + aptitudeBonus
    )
    // This test fast-forwards to the final week by setting remainingWeeks to 1,
    // so only one incremental fatigue tick is applied here.
    expect(completedAgent.fatigue).toBe(startingAgent.fatigue + 3)
    expect(completedAgent.progression?.xp).toBe(totalXpAfter)
    expect(completedAgent.progression?.skillTree?.skillPoints).toBe(
      startingAgent.progression?.skillTree?.skillPoints ?? 0
    )
    expect(completedAgent.history?.counters.trainingWeeks).toBe(
      (startingAgent.history?.counters.trainingWeeks ?? 0) + combatDrills.durationWeeks
    )
    expect(completedAgent.history?.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          week: startingState.week,
          eventType: 'agent.training_completed',
          note: 'Close-Quarters Drills completed.',
        }),
        expect.objectContaining({
          week: startingState.week,
          eventType: 'progression.xp_gained',
          note: `Close-Quarters Drills completed: +${expectedXp} XP`,
        }),
      ])
    )
    expect(result.eventDrafts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'progression.xp_gained',
          sourceSystem: 'agent',
          payload: expect.objectContaining({
            week: startingState.week,
            agentId: 'a_ava',
            agentName: 'Ava Brooks',
            xpAmount: expectedXp,
            totalXp: totalXpAfter,
            level: completedAgent.progression?.level,
            levelsGained: 0,
          }),
        }),
      ])
    )
  })

  it('updates progression level when training xp crosses the next threshold', () => {
    const startingState = createStartingState()
    const baseAgent = startingState.agents.a_ava
    const aptitudeBonus = getTrainingAptitudeBonus(baseAgent.role, combatDrills.targetStat)
    const expectedXp =
      (combatDrills.statDelta + aptitudeBonus) * 10 * (combatDrills.durationWeeks / 2)
    const seededAgent = {
      ...baseAgent,
      level: 1,
      progression: {
        ...(baseAgent.progression ?? {
          xp: 0,
          level: 1,
          potentialTier: 'C' as const,
          growthProfile: 'balanced',
        }),
        xp: getXpThresholdForLevel(2) - expectedXp,
        level: 1,
      },
    }
    const queuedState = queueTraining(
      {
        ...startingState,
        agents: {
          ...startingState.agents,
          a_ava: seededAgent,
        },
      },
      'a_ava',
      combatDrills.trainingId
    )
    const nextQueueState = {
      ...queuedState,
      trainingQueue: queuedState.trainingQueue.map((entry) =>
        entry.agentId === 'a_ava' ? { ...entry, remainingWeeks: 1 } : entry
      ),
    }

    const result = advanceTrainingQueues(nextQueueState)

    expect(result.state.agents.a_ava.progression?.level).toBe(2)
    expect(result.state.agents.a_ava.level).toBe(2)
    expect(result.state.agents.a_ava.progression?.skillTree?.skillPoints).toBe(1)
    expect(result.state.agents.a_ava.history?.timeline).toContainEqual(
      expect.objectContaining({
        week: startingState.week,
        eventType: 'simulation.weekly_tick',
        note: 'Reached level 2.',
      })
    )
    expect(result.eventDrafts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'progression.xp_gained',
          sourceSystem: 'agent',
          payload: expect.objectContaining({
            week: startingState.week,
            agentId: 'a_ava',
            agentName: 'Ava Brooks',
            xpAmount: expectedXp,
            totalXp: result.state.agents.a_ava.progression?.xp,
            level: 2,
            levelsGained: 1,
          }),
        }),
        expect.objectContaining({
          type: 'agent.promoted',
          sourceSystem: 'agent',
          payload: expect.objectContaining({
            week: startingState.week,
            agentId: 'a_ava',
            agentName: 'Ava Brooks',
            newRole: seededAgent.role,
            previousLevel: 1,
            newLevel: 2,
            levelsGained: 1,
            skillPointsGranted: 1,
          }),
        }),
        expect.objectContaining({
          type: 'agent.training_completed',
          sourceSystem: 'agent',
          payload: expect.objectContaining({
            week: startingState.week,
            agentId: 'a_ava',
            agentName: 'Ava Brooks',
            trainingId: combatDrills.trainingId,
          }),
        }),
      ])
    )
  })

  it('keeps equipped gear active after training completion and folds the training gain into the same evaluator path', () => {
    const startingState = createStartingState()
    const caseData = {
      ...startingState.cases['case-001'],
      preferredTags: [],
      requiredTags: [],
      tags: ['combat', 'threat', 'breach'],
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
    }
    const equippedState = {
      ...startingState,
      agents: {
        ...startingState.agents,
        a_ava: {
          ...startingState.agents.a_ava,
          equipment: {
            ...(startingState.agents.a_ava.equipment ?? {}),
            silver_rounds: 1,
          },
          equipmentSlots: {
            ...(startingState.agents.a_ava.equipmentSlots ?? {}),
            primary: 'silver_rounds',
          },
        },
      },
    }
    const beforeBreakdown = evaluateAgentBreakdown(equippedState.agents.a_ava, {
      caseData,
      supportTags: caseData.tags,
      fatigueOverride: 0,
    })
    const queuedState = queueTraining(equippedState, 'a_ava', combatDrills.trainingId)
    const nextQueueState = {
      ...queuedState,
      trainingQueue: queuedState.trainingQueue.map((entry) =>
        entry.agentId === 'a_ava' ? { ...entry, remainingWeeks: 1 } : entry
      ),
    }

    const result = advanceTrainingQueues(nextQueueState)
    const completedAgent = result.state.agents.a_ava
    const afterBreakdown = evaluateAgentBreakdown(completedAgent, {
      caseData,
      supportTags: caseData.tags,
      fatigueOverride: 0,
    })

    expect(completedAgent.equipmentSlots?.primary).toBe('silver_rounds')
    expect(beforeBreakdown.powerImpact.activeEquipmentIds).toContain('silver_rounds')
    expect(afterBreakdown.powerImpact.activeEquipmentIds).toContain('silver_rounds')
    expect(beforeBreakdown.powerImpact.equipmentContributionDelta).toBeGreaterThan(0)
    expect(afterBreakdown.powerImpact.equipmentContributionDelta).toBeGreaterThan(0)
    expect(completedAgent.baseStats.combat).toBe(
      startingState.agents.a_ava.baseStats.combat +
        combatDrills.statDelta +
        getTrainingAptitudeBonus('hunter', 'combat')
    )
    expect(afterBreakdown.score).toBeGreaterThan(beforeBreakdown.score)
  })

  it('preserves direct domain stat overrides when training completes', () => {
    const startingState = createStartingState()
    const baseAgent = startingState.agents.a_ava
    const customStats = cloneDomainStats(
      baseAgent.stats ?? deriveDomainStatsFromBase(baseAgent.baseStats)
    )

    customStats.tactical.awareness += 3
    customStats.technical.anomaly += 4
    customStats.social.influence += 5

    const customizedState = {
      ...startingState,
      agents: {
        ...startingState.agents,
        a_ava: {
          ...baseAgent,
          stats: customStats,
        },
      },
    }
    const queuedState = queueTraining(customizedState, 'a_ava', combatDrills.trainingId)
    const preparedState = {
      ...queuedState,
      trainingQueue: queuedState.trainingQueue.map((entry) =>
        entry.agentId === 'a_ava' ? { ...entry, remainingWeeks: 1 } : entry
      ),
    }

    const result = advanceTrainingQueues(preparedState)
    const completedAgent = result.state.agents.a_ava
    expect(completedAgent.stats).toBeDefined()
    const nextBaseStats = {
      ...baseAgent.baseStats,
      combat:
        baseAgent.baseStats.combat +
        combatDrills.statDelta +
        getTrainingAptitudeBonus(baseAgent.role, 'combat'),
    }
    const previousDerivedStats = deriveDomainStatsFromBase(baseAgent.baseStats)
    const nextDerivedStats = deriveDomainStatsFromBase(nextBaseStats)
    const completedStats =
      completedAgent.stats ?? deriveDomainStatsFromBase(completedAgent.baseStats)

    expect(completedStats.tactical.awareness).toBe(
      customStats.tactical.awareness +
        (nextDerivedStats.tactical.awareness - previousDerivedStats.tactical.awareness)
    )
    expect(completedStats.technical.anomaly).toBe(
      customStats.technical.anomaly +
        (nextDerivedStats.technical.anomaly - previousDerivedStats.technical.anomaly)
    )
    expect(completedStats.social.influence).toBe(
      customStats.social.influence +
        (nextDerivedStats.social.influence - previousDerivedStats.social.influence)
    )
  })

  it('queues team drills as grouped training entries and locks the participating agents', () => {
    const startingState = createStartingState()
    const queuedState = queueTeamTraining(
      startingState,
      't_nightwatch',
      coordinationDrill.trainingId
    )
    const teamEntries = queuedState.trainingQueue.filter((entry) => entry.teamId === 't_nightwatch')

    // 4 participants: base cost + 25% * 2 extra members
    const scaledDrillCost =
      coordinationDrill.fundingCost + Math.round(coordinationDrill.fundingCost * 0.25 * 2)
    expect(queuedState.funding).toBe(startingState.funding - scaledDrillCost)
    expect(teamEntries).toHaveLength(4)
    expect(new Set(teamEntries.map((entry) => entry.drillGroupId)).size).toBe(1)
    expect(teamEntries.every((entry) => entry.scope === 'team')).toBe(true)
    expect(teamEntries.every((entry) => entry.trainingId === coordinationDrill.trainingId)).toBe(
      true
    )
    expect(teamEntries.every((entry) => entry.memberIds?.length === 4)).toBe(true)

    for (const entry of teamEntries) {
      expect(queuedState.agents[entry.agentId].assignment).toMatchObject({
        state: 'training',
        teamId: 't_nightwatch',
        trainingProgramId: coordinationDrill.trainingId,
      })
      expect(queuedState.agents[entry.agentId].history?.timeline.at(-1)).toMatchObject({
        week: startingState.week,
        eventType: 'agent.training_started',
        note: `Started ${coordinationDrill.name} with ${entry.teamName}.`,
      })
    }

    expect(
      queuedState.events.filter((event) => event.type === 'agent.training_started')
    ).toHaveLength(4)

    const deployedState = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    expect(queueTeamTraining(deployedState, 't_nightwatch', coordinationDrill.trainingId)).toBe(
      deployedState
    )
  })

  it('leaves team drill funding unchanged when the queue start is rejected', () => {
    const startingState = createStartingState()
    const assessment = assessTeamTrainingQueue(
      startingState,
      't_nightwatch',
      coordinationDrill.trainingId
    )

    expect(assessment.canQueue).toBe(true)

    const lowFundingState = normalizeGameState({
      ...startingState,
      funding: assessment.scaledCost - 1,
    })
    const result = queueTeamTraining(lowFundingState, 't_nightwatch', coordinationDrill.trainingId)

    expect(result).toBe(lowFundingState)
    expect(result.funding).toBe(lowFundingState.funding)
    expect(result.trainingQueue).toHaveLength(0)
  })

  it('completes team drills with chemistry and bond improvements but no stat gains', () => {
    const startingState = createStartingState()
    const queuedState = queueTeamTraining(
      startingState,
      't_nightwatch',
      coordinationDrill.trainingId
    )
    const preparedState = {
      ...queuedState,
      trainingQueue: queuedState.trainingQueue.map((entry) =>
        entry.teamId === 't_nightwatch' ? { ...entry, remainingWeeks: 1 } : entry
      ),
    }
    const team = startingState.teams.t_nightwatch
    const caseData = startingState.cases['case-001']
    const beforeMembers = getTeamMembers(team, startingState.agents)
    const beforeComposition = buildAgentSquadCompositionProfile(
      beforeMembers,
      team.leaderId,
      team.tags,
      {
        caseData,
        teamTags: team.tags,
      }
    )
    const beforeScore = computeTeamScore(beforeMembers, caseData, { teamTags: team.tags })

    const result = advanceTrainingQueues(preparedState)
    const afterMembers = getTeamMembers(team, result.state.agents)
    const afterComposition = buildAgentSquadCompositionProfile(
      afterMembers,
      team.leaderId,
      team.tags,
      {
        caseData,
        teamTags: team.tags,
      }
    )
    const afterScore = computeTeamScore(afterMembers, caseData, { teamTags: team.tags })

    expect(result.completed).toHaveLength(4)
    expect(result.state.trainingQueue).toHaveLength(0)
    expect(result.notes).toContain('Ava Brooks: Coordination Drill completed with Night Watch.')
    expect(
      result.eventDrafts.filter((draft) => draft.type === 'agent.training_completed')
    ).toHaveLength(4)

    // Team drills are chemistry-only — no stat gains regardless of scope or aptitude.
    expect(result.state.agents.a_ava.baseStats.utility).toBe(
      startingState.agents.a_ava.baseStats.utility
    )
    expect(result.state.agents.a_rook.baseStats.utility).toBe(
      startingState.agents.a_rook.baseStats.utility
    )
    expect(result.state.agents.a_ava.relationships.a_rook).toBeCloseTo(
      coordinationDrill.relationshipDelta ?? 0,
      5
    )
    expect(result.state.agents.a_ava.progression?.skillTree?.trainedRelationships.a_rook).toBe(
      coordinationDrill.trainedRelationshipDelta
    )
    expect(result.state.agents.a_rook.progression?.skillTree?.trainedRelationships.a_ava).toBe(
      coordinationDrill.trainedRelationshipDelta
    )
    expect(afterComposition.chemistryProfile.bonus).toBeGreaterThan(
      beforeComposition.chemistryProfile.bonus
    )
    expect(afterScore.modifierBreakdown.chemistryBonus).toBeGreaterThan(
      beforeScore.modifierBreakdown.chemistryBonus
    )
    // Total score improvement cannot be asserted here: training accrues fatigue which
    // can offset the chemistry gain. The chemistry assertions above prove the drill worked.
  })

  it('adds weekly report entries for completed training through advanceWeek', () => {
    const startingState = createStartingState()
    const queuedState = queueTeamTraining(
      startingState,
      't_nightwatch',
      coordinationDrill.trainingId
    )
    const preparedState = {
      ...queuedState,
      trainingQueue: queuedState.trainingQueue.map((entry) =>
        entry.teamId === 't_nightwatch' ? { ...entry, remainingWeeks: 1 } : entry
      ),
    }

    const next = advanceWeek(preparedState)
    const report = next.reports[0]

    expect(report.notes.filter((note) => note.type === 'agent.training_completed')).toHaveLength(4)
    expect(
      report.notes.some(
        (note) =>
          note.type === 'agent.training_completed' &&
          note.content === 'Ava Brooks: Coordination Drill completed.'
      )
    ).toBe(true)
    expect(
      next.events.filter(
        (event) =>
          event.type === 'agent.training_completed' &&
          event.payload.trainingId === coordinationDrill.trainingId
      )
    ).toHaveLength(4)
  })

  it('clamps base stat gain at the agent ceiling when training would exceed it', () => {
    const state = createStartingState()
    const targetCap = getAgentStatCap(state.agents.a_ava, 'combat')
    const cappedAgent = {
      ...state.agents.a_ava,
      baseStats: { ...state.agents.a_ava.baseStats, combat: Math.max(0, targetCap - 1) },
    }
    const capped = queueTraining(
      { ...state, agents: { ...state.agents, a_ava: cappedAgent } },
      'a_ava',
      combatDrills.trainingId
    )
    const prepared = {
      ...capped,
      trainingQueue: capped.trainingQueue.map((e) =>
        e.agentId === 'a_ava' ? { ...e, remainingWeeks: 1 } : e
      ),
    }
    const result = advanceTrainingQueues(prepared)
    expect(result.state.agents.a_ava.baseStats.combat).toBe(targetCap)
  })
})

describe('training catalog', () => {
  it('includes breach-rehearsal and forensics-debrief as queueable team drills', () => {
    const state = createStartingState()
    const breachRehearsal = trainingCatalog.find((p) => p.trainingId === 'breach-rehearsal')
    const forensicsDebrief = trainingCatalog.find((p) => p.trainingId === 'forensics-debrief')

    expect(breachRehearsal).toBeDefined()
    expect(forensicsDebrief).toBeDefined()
    expect(breachRehearsal?.scope).toBe('team')
    expect(breachRehearsal?.targetStat).toBe('combat')
    expect(forensicsDebrief?.scope).toBe('team')
    expect(forensicsDebrief?.targetStat).toBe('investigation')

    const breachQueued = queueTeamTraining(state, 't_nightwatch', 'breach-rehearsal')
    expect(breachQueued.trainingQueue.length).toBeGreaterThanOrEqual(1)
    expect(breachQueued.trainingQueue.every((e) => e.scope === 'team')).toBe(true)

    const forensicsQueued = queueTeamTraining(state, 't_nightwatch', 'forensics-debrief')
    expect(forensicsQueued.trainingQueue.length).toBeGreaterThanOrEqual(1)
    expect(forensicsQueued.trainingQueue.every((e) => e.scope === 'team')).toBe(true)
  })
})

describe('partial-team drill support', () => {
  it('queues a team drill with only the eligible subset when some members are unavailable', () => {
    const state = createStartingState()
    // Block a_ava with individual training — she is on t_nightwatch
    const blockedState = queueTraining(state, 'a_ava', combatDrills.trainingId)

    const result = queueTeamTraining(blockedState, 't_nightwatch', coordinationDrill.trainingId)

    // a_ava must not appear in the drill
    expect(
      result.trainingQueue
        .filter((e) => e.teamId === 't_nightwatch')
        .every((e) => e.agentId !== 'a_ava')
    ).toBe(true)

    // At least 2 participants enrolled
    const drillEntries = result.trainingQueue.filter(
      (e) => e.teamId === 't_nightwatch' && e.scope === 'team'
    )
    expect(drillEntries.length).toBeGreaterThanOrEqual(2)

    // All drill entries share one drillGroupId
    const drillIds = new Set(drillEntries.map((e) => e.drillGroupId))
    expect(drillIds.size).toBe(1)

    // memberIds on entries must not include a_ava
    drillEntries.forEach((entry) => {
      expect(entry.memberIds).not.toContain('a_ava')
    })
  })

  it('rejects a team drill if fewer than 2 members are eligible', () => {
    const state = createStartingState()
    // t_nightwatch members: a_ava, a_kellan, a_mina, a_rook
    // Block 3 of them via individual training, leaving only a_rook eligible
    const s1 = queueTraining(state, 'a_ava', combatDrills.trainingId)
    const s2 = queueTraining(s1, 'a_kellan', combatDrills.trainingId)
    const s3 = queueTraining(s2, 'a_mina', combatDrills.trainingId)

    const result = queueTeamTraining(s3, 't_nightwatch', coordinationDrill.trainingId)

    // Only 1 member left → drill should be rejected
    const drillEntries = result.trainingQueue.filter(
      (e) => e.scope === 'team' && e.teamId === 't_nightwatch'
    )
    expect(drillEntries).toHaveLength(0)
  })

  it('excludes team members at or above TRAINING_FATIGUE_GATE from the drill', () => {
    const state = createStartingState()
    const tiredAva = { ...state.agents.a_ava, fatigue: TRAINING_FATIGUE_GATE }
    const s = { ...state, agents: { ...state.agents, a_ava: tiredAva } }

    const result = queueTeamTraining(s, 't_nightwatch', coordinationDrill.trainingId)

    const drillEntries = result.trainingQueue.filter(
      (e) => e.scope === 'team' && e.teamId === 't_nightwatch'
    )

    // a_ava must not appear
    expect(drillEntries.every((e) => e.agentId !== 'a_ava')).toBe(true)
    // Remaining eligible members (3) still form a valid drill
    expect(drillEntries.length).toBeGreaterThanOrEqual(2)
  })
})

describe('training cancellation', () => {
  it('refunds funding and clears agent assignment for individual training', () => {
    const state = createStartingState()
    const queued = queueTraining(state, 'a_ava', combatDrills.trainingId)
    const cancelled = cancelTraining(queued, 'a_ava')

    expect(cancelled.funding).toBe(state.funding)
    expect(cancelled.trainingQueue).toHaveLength(0)
    expect(cancelled.agents.a_ava.assignment).toMatchObject({ state: 'idle' })
    expect(cancelled.agents.a_ava.history?.timeline.at(-1)).toMatchObject({
      week: state.week,
      eventType: 'agent.training_cancelled',
      note: `${combatDrills.name} cancelled.`,
    })
    expect(cancelled.events.at(-1)).toMatchObject({
      type: 'agent.training_cancelled',
      sourceSystem: 'agent',
      payload: {
        week: state.week,
        agentId: 'a_ava',
        agentName: 'Ava Brooks',
        trainingId: combatDrills.trainingId,
        trainingName: combatDrills.name,
        refund: combatDrills.fundingCost,
      },
    })
  })

  it('atomically cancels all team drill members and emits one event per participant', () => {
    const state = createStartingState()
    const queued = queueTeamTraining(state, 't_nightwatch', coordinationDrill!.trainingId)
    const members = Object.values(queued.agents).filter(
      (agent) => agent.assignment?.state === 'training'
    )

    expect(members.length).toBeGreaterThanOrEqual(2)

    const cancelled = cancelTraining(queued, members[0]!.id)

    expect(cancelled.funding).toBe(state.funding)
    expect(cancelled.trainingQueue).toHaveLength(0)

    for (const member of members) {
      expect(cancelled.agents[member.id]?.assignment).toMatchObject({ state: 'idle' })
    }

    const cancelEvents = cancelled.events.filter((e) => e.type === 'agent.training_cancelled')

    // One event per drill participant
    expect(cancelEvents).toHaveLength(members.length)

    // Every participant gets a cancel event
    for (const member of members) {
      expect(cancelEvents.find((e) => e.payload.agentId === member.id)).toBeDefined()
    }

    // 4 participants: base cost + 25% * 2 extra members; cancelled immediately so full refund
    const scaledDrillCostForCancel =
      coordinationDrill!.fundingCost + Math.round(coordinationDrill!.fundingCost * 0.25 * 2)
    // Refund is attributed to the first cancelled entry's event; others have refund 0
    expect(cancelEvents[0]).toMatchObject({
      payload: expect.objectContaining({
        refund: scaledDrillCostForCancel,
        trainingId: coordinationDrill!.trainingId,
      }),
    })
    for (const event of cancelEvents.slice(1)) {
      expect(event.payload.refund).toBe(0)
    }
  })

  it('is a no-op when the agent has no queued entry', () => {
    const state = createStartingState()
    const result = cancelTraining(state, 'a_ava')

    expect(result).toEqual(expect.objectContaining({ funding: state.funding, trainingQueue: [] }))
    expect(result.events).toHaveLength(state.events.length)
  })

  it('applies proportional fatigue when cancelled after weeks have elapsed', () => {
    const state = createStartingState()
    const queued = queueTraining(state, 'a_ava', combatDrills.trainingId)

    // Simulate 1 of 2 weeks elapsed by mutating remainingWeeks on the queue entry
    const partiallyElapsed = {
      ...queued,
      trainingQueue: queued.trainingQueue.map((entry) =>
        entry.agentId === 'a_ava' ? { ...entry, remainingWeeks: 1 } : entry
      ),
    }

    const beforeFatigue = partiallyElapsed.agents.a_ava.fatigue
    const cancelled = cancelTraining(partiallyElapsed, 'a_ava')

    // Incremental fatigue is applied during weekly advancement, not on cancellation.
    expect(cancelled.agents.a_ava.fatigue).toBe(beforeFatigue)
    expect(cancelled.trainingQueue).toHaveLength(0)
    // Partial refund: floor(fundingCost * remainingWeeks / durationWeeks) = floor(10 * 1/2) = 5
    const expectedRefund = Math.floor((combatDrills.fundingCost * 1) / combatDrills.durationWeeks)
    expect(cancelled.funding).toBe(state.funding - combatDrills.fundingCost + expectedRefund)
  })

  it('applies fatigue incrementally per advanced week before completion', () => {
    const state = createStartingState()
    const queued = queueTraining(state, 'a_ava', combatDrills.trainingId)

    const afterWeekOne = advanceTrainingQueues(queued).state
    expect(afterWeekOne.agents.a_ava.fatigue).toBe(state.agents.a_ava.fatigue + 3)

    const afterCompletion = advanceTrainingQueues(afterWeekOne).state
    expect(afterCompletion.agents.a_ava.fatigue).toBe(
      state.agents.a_ava.fatigue + combatDrills.fatigueDelta
    )
  })

  it('slightly front-loads fatigue on longer training programs while preserving the total', () => {
    const state = { ...createStartingState(), academyTier: 1 }
    const queued = queueTraining(state, 'a_ava', threatAssessment.trainingId)

    const afterWeekOne = advanceTrainingQueues(queued).state
    expect(afterWeekOne.agents.a_ava.fatigue).toBe(state.agents.a_ava.fatigue + 2)

    const afterWeekTwo = advanceTrainingQueues(afterWeekOne).state
    expect(afterWeekTwo.agents.a_ava.fatigue).toBe(state.agents.a_ava.fatigue + 4)

    const afterCompletion = advanceTrainingQueues(afterWeekTwo).state
    expect(afterCompletion.agents.a_ava.fatigue).toBe(
      state.agents.a_ava.fatigue + threatAssessment.fatigueDelta
    )
  })

  it('applies instructor mitigation to weekly fatigue and grants instructor completion XP bonus', () => {
    const state = createStartingState()
    const withInstructor = {
      ...state,
      staff: {
        ...state.staff,
        'ins-01': {
          role: 'instructor' as const,
          name: 'Prof. Chen',
          efficiency: 82,
          instructorSpecialty: 'combat' as const,
          assignedAgentId: 'a_ava',
        },
      },
    }

    const queuedWithInstructor = queueTraining(withInstructor, 'a_ava', combatDrills.trainingId)
    const afterWeekOne = advanceTrainingQueues(queuedWithInstructor).state

    // combat-drills week-1 fatigue is +3; instructor bonus (+1) mitigates to +2
    expect(afterWeekOne.agents.a_ava.fatigue).toBe(withInstructor.agents.a_ava.fatigue + 2)

    const completedWithInstructor = advanceTrainingQueues(afterWeekOne).state
    expect(completedWithInstructor.agents.a_ava.fatigue).toBe(
      withInstructor.agents.a_ava.fatigue + 4
    )

    const queuedWithoutInstructor = queueTraining(state, 'a_ava', combatDrills.trainingId)
    const completedWithoutInstructor = advanceTrainingQueues(
      advanceTrainingQueues(queuedWithoutInstructor).state
    ).state

    // +1 stat gain from instructor raises base XP by +10; instructor retention bonus adds +5.
    expect(completedWithInstructor.agents.a_ava.progression?.xp).toBe(
      (completedWithoutInstructor.agents.a_ava.progression?.xp ?? 0) + 15
    )
  })

  it('reports incurred fatigue, projected total fatigue, and cancel refund from queue helpers', () => {
    const state = createStartingState()
    const queued = queueTraining(state, 'a_ava', combatDrills.trainingId)
    const entry = queued.trainingQueue[0]!

    expect(getTrainingIncurredFatigue(entry)).toBe(0)
    expect(getTrainingProjectedTotalFatigue(entry)).toBe(combatDrills.fatigueDelta)
    expect(getTrainingCancelRefund(entry)).toBe(combatDrills.fundingCost)

    const advanced = advanceTrainingQueues(queued).state
    const progressedEntry = advanced.trainingQueue[0]!

    expect(getTrainingIncurredFatigue(progressedEntry)).toBe(3)
    expect(getTrainingCancelRefund(progressedEntry)).toBe(5)
  })

  it('returns per-week fatigue schedule matching total fatigueDelta', () => {
    const state = createStartingState()
    const queued = queueTraining(state, 'a_ava', combatDrills.trainingId)
    const entry = queued.trainingQueue[0]!

    const schedule = getTrainingFatigueSchedule(entry)

    expect(schedule).toHaveLength(combatDrills!.durationWeeks)
    expect(schedule.reduce((sum, n) => sum + n, 0)).toBe(combatDrills!.fatigueDelta)
  })
})

describe('training queue mechanics — stat ceiling guard', () => {
  it('rejects queueTraining when the target stat is already at the agent ceiling', () => {
    const state = createStartingState()
    const targetCap = getAgentStatCap(state.agents.a_ava, 'combat')
    const maxedAgent = {
      ...state.agents.a_ava,
      baseStats: { ...state.agents.a_ava.baseStats, combat: targetCap },
    }
    const stateWithMaxed = { ...state, agents: { ...state.agents, a_ava: maxedAgent } }

    const result = queueTraining(stateWithMaxed, 'a_ava', combatDrills.trainingId)

    expect(result.trainingQueue).toHaveLength(0)
    expect(result.funding).toBe(stateWithMaxed.funding)
  })

  it('rejects queueTraining when agent fatigue is at or above TRAINING_FATIGUE_GATE', () => {
    const state = createStartingState()
    const tiredAgent = { ...state.agents.a_ava, fatigue: TRAINING_FATIGUE_GATE }
    const stateWithTired = { ...state, agents: { ...state.agents, a_ava: tiredAgent } }

    const result = queueTraining(stateWithTired, 'a_ava', combatDrills.trainingId)

    expect(result.trainingQueue).toHaveLength(0)
    expect(result.funding).toBe(stateWithTired.funding)
  })

  it('allows queueTraining when agent fatigue is just below TRAINING_FATIGUE_GATE', () => {
    const state = createStartingState()
    const agent = { ...state.agents.a_ava, fatigue: TRAINING_FATIGUE_GATE - 1 }
    const s = { ...state, agents: { ...state.agents, a_ava: agent } }

    const result = queueTraining(s, 'a_ava', combatDrills.trainingId)

    expect(result.trainingQueue).toHaveLength(1)
  })
})

describe('role-based training aptitude', () => {
  it('getTrainingAptitudeBonus returns 1 for a role training its affinity stat', () => {
    expect(getTrainingAptitudeBonus('hunter', 'combat')).toBe(1)
    expect(getTrainingAptitudeBonus('investigator', 'investigation')).toBe(1)
    expect(getTrainingAptitudeBonus('occultist', 'investigation')).toBe(1)
    expect(getTrainingAptitudeBonus('tech', 'utility')).toBe(1)
    expect(getTrainingAptitudeBonus('medic', 'utility')).toBe(1)
    expect(getTrainingAptitudeBonus('negotiator', 'social')).toBe(1)
    expect(getTrainingAptitudeBonus('medium', 'social')).toBe(1)
  })

  it('getTrainingAptitudeBonus returns 0 for non-affinity stats', () => {
    expect(getTrainingAptitudeBonus('hunter', 'investigation')).toBe(0)
    expect(getTrainingAptitudeBonus('negotiator', 'combat')).toBe(0)
  })

  it('every role has an aptitude entry', () => {
    const roles = [
      'hunter',
      'occultist',
      'investigator',
      'medium',
      'tech',
      'medic',
      'negotiator',
    ] as const
    for (const role of roles) {
      expect(ROLE_TRAINING_APTITUDE[role]).toBeDefined()
    }
  })

  it('hunter completing combat drills gains +1 extra statDelta via aptitude', () => {
    const state = createStartingState()
    const hunterAgent = Object.values(state.agents).find((a) => a.role === 'hunter')

    if (!hunterAgent) {
      return // skip if starting state has no hunter
    }

    const beforeCombat = hunterAgent.baseStats.combat
    const queued = queueTraining(state, hunterAgent.id, combatDrills.trainingId)

    // Advance enough weeks to complete
    let advanced = queued
    for (let i = 0; i < combatDrills.durationWeeks; i++) {
      advanced = advanceWeek(advanced)
    }

    const afterCombat = advanced.agents[hunterAgent.id]!.baseStats.combat
    // hunter gets statDelta (2) + aptitudeBonus (1) = 3, capped at 100
    const expected = Math.min(100, beforeCombat + combatDrills.statDelta + 1)
    expect(afterCombat).toBe(expected)
  })
})

describe('endurance protocol — persistent recovery rate bonus', () => {
  const enduranceProtocol = trainingCatalog.find(
    (program) => program.trainingId === 'endurance-protocol'
  )

  it('endurance-protocol exists in the catalog with a recoveryBonus', () => {
    expect(enduranceProtocol).toBeDefined()
    expect(enduranceProtocol?.recoveryBonus).toBeGreaterThan(0)
  })

  it('completing endurance-protocol sets recoveryRateBonus on the agent', () => {
    if (!enduranceProtocol) return

    const state = createStartingState()
    const agent = Object.values(state.agents).find((a) => a.status === 'active')!
    const queued = queueTraining(state, agent.id, enduranceProtocol.trainingId)

    const preparedState = {
      ...queued,
      trainingQueue: queued.trainingQueue.map((entry) =>
        entry.agentId === agent.id ? { ...entry, remainingWeeks: 1 } : entry
      ),
    }

    const result = advanceTrainingQueues(preparedState)
    const completedAgent = result.state.agents[agent.id]!

    expect(completedAgent.recoveryRateBonus).toBe(
      (agent.recoveryRateBonus ?? 0) + enduranceProtocol.recoveryBonus!
    )
  })

  it('agent with recoveryRateBonus recovers more fatigue per idle week', () => {
    if (!enduranceProtocol) return

    const state = createStartingState()
    const agent = Object.values(state.agents).find((a) => a.status === 'active')!

    const withBonus = {
      ...state,
      agents: {
        ...state.agents,
        [agent.id]: { ...agent, fatigue: 50, recoveryRateBonus: 2 },
      },
    }
    const withoutBonus = {
      ...state,
      agents: {
        ...state.agents,
        [agent.id]: { ...agent, fatigue: 50 },
      },
    }

    const afterWithBonus = advanceWeek(withBonus)
    const afterWithoutBonus = advanceWeek(withoutBonus)

    expect(afterWithBonus.agents[agent.id]!.fatigue).toBeLessThan(
      afterWithoutBonus.agents[agent.id]!.fatigue
    )
  })
})

describe('psych-conditioning direct stability pathway', () => {
  const psychConditioning = trainingCatalog.find(
    (program) => program.trainingId === 'psych-conditioning'
  )

  it('catalog entry includes direct stability deltas', () => {
    expect(psychConditioning).toBeDefined()
    expect(psychConditioning?.stabilityResistanceDelta).toBeGreaterThan(0)
    expect(psychConditioning?.stabilityToleranceDelta).toBeGreaterThan(0)
  })

  it('completion directly increases stability stats beyond base-derived changes', () => {
    if (!psychConditioning) return

    const state = { ...createStartingState(), academyTier: 1 }
    const agentId = 'a_ava'
    const before = state.agents[agentId]
    const beforeDerived = deriveDomainStatsFromBase(before.baseStats)

    const queued = queueTraining(state, agentId, psychConditioning.trainingId)
    const prepared = {
      ...queued,
      trainingQueue: queued.trainingQueue.map((entry) =>
        entry.agentId === agentId ? { ...entry, remainingWeeks: 1 } : entry
      ),
    }
    const result = advanceTrainingQueues(prepared)
    const after = result.state.agents[agentId]
    const afterDerived = deriveDomainStatsFromBase(after.baseStats)

    const derivedOnlyResistanceDelta =
      afterDerived.stability.resistance - beforeDerived.stability.resistance
    const derivedOnlyToleranceDelta =
      afterDerived.stability.tolerance - beforeDerived.stability.tolerance

    expect(after.stats?.stability.resistance).toBe(
      (before.stats ?? beforeDerived).stability.resistance +
        derivedOnlyResistanceDelta +
        (psychConditioning.stabilityResistanceDelta ?? 0)
    )
    expect(after.stats?.stability.tolerance).toBe(
      (before.stats ?? beforeDerived).stability.tolerance +
        derivedOnlyToleranceDelta +
        (psychConditioning.stabilityToleranceDelta ?? 0)
    )
  })

  it('still allows queueing when the target stat is capped because secondary benefits remain useful', () => {
    if (!psychConditioning) return

    const state = { ...createStartingState(), academyTier: 1 }
    const cap = getAgentStatCap(state.agents.a_ava, psychConditioning.targetStat)
    const cappedState = {
      ...state,
      agents: {
        ...state.agents,
        a_ava: {
          ...state.agents.a_ava,
          baseStats: {
            ...state.agents.a_ava.baseStats,
            [psychConditioning.targetStat]: cap,
          },
        },
      },
    }

    const assessment = assessAgentTrainingQueue(cappedState, 'a_ava', psychConditioning.trainingId)
    const queued = queueTraining(cappedState, 'a_ava', psychConditioning.trainingId)

    expect(assessment.canQueue).toBe(true)
    expect(queued.trainingQueue).toHaveLength(1)
  })
})

describe('training-driven potential intel', () => {
  it('can confirm a projection and trigger a breakthrough under exceptional circumstances', () => {
    const state = { ...createStartingState(), academyTier: 1 }
    const agent = state.agents.a_ava
    const seededAgent: Agent = {
      ...agent,
      level: 3,
      progression: {
        ...(agent.progression ?? {
          xp: 0,
          level: 3,
          potentialTier: 'C' as const,
          growthProfile: 'steady',
        }),
        level: 3,
        potentialTier: 'C',
        growthProfile: 'steady',
        potentialIntel: {
          visibleTier: 'D',
          exactKnown: false,
          confidence: 'high',
          discoveryProgress: 90,
          source: 'recruitment_scout',
        },
      },
    }
    const nearCap = getAgentStatCap(seededAgent, threatAssessment.targetStat) - 2
    const preparedAgent: Agent = {
      ...seededAgent,
      baseStats: {
        ...seededAgent.baseStats,
        [threatAssessment.targetStat]: nearCap,
      },
    }
    const seededState = {
      ...state,
      agents: {
        ...state.agents,
        a_ava: preparedAgent,
      },
    }

    const queued = queueTraining(seededState, 'a_ava', threatAssessment.trainingId)
    const prepared = {
      ...queued,
      trainingQueue: queued.trainingQueue.map((entry) =>
        entry.agentId === 'a_ava' ? { ...entry, remainingWeeks: 1 } : entry
      ),
    }
    const result = advanceTrainingQueues(prepared)
    const progressed = result.state.agents.a_ava

    expect(progressed.progression?.potentialTier).toBe('B')
    expect(progressed.progression?.potentialIntel).toMatchObject({
      visibleTier: 'B',
      exactKnown: true,
      confidence: 'confirmed',
      discoveryProgress: 100,
    })
    expect(progressed.history?.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          note: 'Training feedback confirmed C-tier potential.',
        }),
        expect.objectContaining({
          note: 'Exceptional progress triggered a breakthrough to B-tier potential.',
        }),
      ])
    )
  })
})

describe('spendSkillPoint', () => {
  function withSkillTree(
    agent: Agent,
    skillTree: NonNullable<NonNullable<Agent['progression']>['skillTree']>
  ) {
    if (!agent.progression) {
      throw new Error(`Agent ${agent.id} is missing progression data in test setup.`)
    }

    return {
      ...agent,
      progression: {
        ...agent.progression,
        skillTree: {
          ...(agent.progression.skillTree ?? { skillPoints: 0, trainedRelationships: {} }),
          ...skillTree,
        },
      },
    }
  }

  it('decrements skillPoints and boosts the chosen base stat by 1', () => {
    const state = createStartingState()
    const agent = state.agents.a_ava
    const agentWithPoints = withSkillTree(agent, { skillPoints: 1, trainedRelationships: {} })
    const s = { ...state, agents: { ...state.agents, a_ava: agentWithPoints } }
    const result = spendSkillPoint(s, 'a_ava', 'combat')

    expect(result.agents.a_ava.progression?.skillTree?.skillPoints).toBe(0)
    expect(result.agents.a_ava.baseStats.combat).toBe(agentWithPoints.baseStats.combat + 1)
  })

  it('sets specialization on first spend', () => {
    const state = createStartingState()
    const agent = state.agents.a_ava
    const agentWithPoints = withSkillTree(agent, {
      skillPoints: 2,
      trainedRelationships: {},
      specialization: undefined as 'combat' | 'investigation' | 'utility' | 'social' | undefined,
    })
    const s = { ...state, agents: { ...state.agents, a_ava: agentWithPoints } }
    const result = spendSkillPoint(s, 'a_ava', 'social')

    expect(result.agents.a_ava.progression?.skillTree?.specialization).toBe('social')
  })

  it('preserves existing specialization on subsequent spends', () => {
    const state = createStartingState()
    const agent = state.agents.a_ava
    const agentWithPoints = withSkillTree(agent, {
      skillPoints: 2,
      trainedRelationships: {},
      specialization: 'combat',
    })
    const s = { ...state, agents: { ...state.agents, a_ava: agentWithPoints } }
    const result = spendSkillPoint(s, 'a_ava', 'social')

    expect(result.agents.a_ava.progression?.skillTree?.specialization).toBe('combat')
  })

  it('is a no-op when agent has no skill points', () => {
    const state = createStartingState()
    const result = spendSkillPoint(state, 'a_ava', 'combat')

    expect(result.agents.a_ava.progression?.skillTree?.skillPoints ?? 0).toBe(0)
    expect(result.agents.a_ava.baseStats.combat).toBe(state.agents.a_ava.baseStats.combat)
  })

  it('is a no-op when the target stat is already at the agent ceiling', () => {
    const state = createStartingState()
    const agent = state.agents.a_ava
    const targetCap = getAgentStatCap(agent, 'combat')
    const agentWithPoints: Agent = {
      ...withSkillTree(agent, { skillPoints: 1, trainedRelationships: {} }),
      baseStats: { ...agent.baseStats, combat: targetCap },
    }
    const s = { ...state, agents: { ...state.agents, a_ava: agentWithPoints } }
    const result = spendSkillPoint(s, 'a_ava', 'combat')

    expect(result.agents.a_ava.progression?.skillTree?.skillPoints).toBe(1)
    expect(result.agents.a_ava.baseStats.combat).toBe(targetCap)
  })

  it('is a no-op when agent status is not active', () => {
    const state = createStartingState()
    const agent = state.agents.a_ava
    const agentWithPoints: Agent = {
      ...withSkillTree(agent, { skillPoints: 1, trainedRelationships: {} }),
      status: 'injured',
    }
    const s = { ...state, agents: { ...state.agents, a_ava: agentWithPoints } }
    const result = spendSkillPoint(s, 'a_ava', 'combat')

    expect(result.agents.a_ava.progression?.skillTree?.skillPoints).toBe(1)
    expect(result.agents.a_ava.baseStats.combat).toBe(agent.baseStats.combat)
  })

  it('is a no-op when agent is on assignment', () => {
    const state = createStartingState()
    const agent = state.agents.a_ava
    const agentWithPoints: Agent = {
      ...withSkillTree(agent, { skillPoints: 1, trainedRelationships: {} }),
      assignment: { state: 'assigned' as const, caseId: 'case-01', teamId: 't-01', startedWeek: 1 },
    }
    const s = { ...state, agents: { ...state.agents, a_ava: agentWithPoints } }
    const result = spendSkillPoint(s, 'a_ava', 'combat')

    expect(result.agents.a_ava.progression?.skillTree?.skillPoints).toBe(1)
    expect(result.agents.a_ava.baseStats.combat).toBe(agent.baseStats.combat)
  })
})

describe('queueTeamTraining team-drill chemistry gate', () => {
  it('enrolls maxed-stat members in team drills because drills are chemistry-only', () => {
    const state = createStartingState()
    const nightwatch = state.teams['t_nightwatch']
    if (!nightwatch) return

    const memberIds = nightwatch.memberIds ?? nightwatch.agentIds ?? []
    if (memberIds.length < 2) return

    // Max out the target stat for the first member
    const maxedId = memberIds[0]!
    const targetCap = getAgentStatCap(state.agents[maxedId]!, 'utility')
    const stateWithMaxed = {
      ...state,
      agents: {
        ...state.agents,
        [maxedId]: {
          ...state.agents[maxedId]!,
          baseStats: { ...state.agents[maxedId]!.baseStats, utility: targetCap },
        },
      },
    }

    const result = queueTeamTraining(stateWithMaxed, 't_nightwatch', coordinationDrill.trainingId)

    // Maxed-stat member SHOULD be enrolled — team drills build bonds, not stats
    expect(result.agents[maxedId]?.assignment?.state).toBe('training')
    // All eligible members are enrolled
    const traineeCount = memberIds.filter(
      (id) => result.agents[id]?.assignment?.state === 'training'
    ).length
    expect(traineeCount).toBeGreaterThanOrEqual(2)
  })

  it('queues the drill even when all members have maxed stats', () => {
    const state = createStartingState()
    const nightwatch = state.teams['t_nightwatch']
    if (!nightwatch) return

    const memberIds = nightwatch.memberIds ?? nightwatch.agentIds ?? []
    if (memberIds.length < 2) return

    // Max out utility for every member — drill should still be queued for chemistry
    const allMaxedAgents = { ...state.agents }
    for (const id of memberIds) {
      allMaxedAgents[id] = {
        ...allMaxedAgents[id]!,
        baseStats: {
          ...allMaxedAgents[id]!.baseStats,
          utility: getAgentStatCap(allMaxedAgents[id]!, 'utility'),
        },
      }
    }

    const before = state.funding
    const result = queueTeamTraining(
      { ...state, agents: allMaxedAgents },
      't_nightwatch',
      coordinationDrill.trainingId
    )

    // Funding was spent — drill was queued successfully
    expect(result.funding).toBeLessThan(before)
    const traineeCount = memberIds.filter(
      (id) => result.agents[id]?.assignment?.state === 'training'
    ).length
    expect(traineeCount).toBeGreaterThanOrEqual(2)
  })
})

describe('new +2 team drills coverage', () => {
  it('catalog contains +2 team drills for combat, investigation, and utility', () => {
    const teamDrills = trainingCatalog.filter((p) => p.scope === 'team')

    const statDeltas: Record<string, number> = {}
    for (const drill of teamDrills) {
      if (!statDeltas[drill.targetStat] || drill.statDelta > statDeltas[drill.targetStat]!) {
        statDeltas[drill.targetStat] = drill.statDelta
      }
    }

    expect(statDeltas['combat']).toBeGreaterThanOrEqual(2)
    expect(statDeltas['investigation']).toBeGreaterThanOrEqual(2)
    expect(statDeltas['utility']).toBeGreaterThanOrEqual(2)
    expect(statDeltas['social']).toBeGreaterThanOrEqual(2)
  })

  it('assault-collective, deep-inquiry, and systems-integration exist in catalog', () => {
    const ids = trainingCatalog.map((p) => p.trainingId)
    expect(ids).toContain('assault-collective')
    expect(ids).toContain('deep-inquiry')
    expect(ids).toContain('systems-integration')
  })
})

describe('XP formula uses rawGain', () => {
  it('agent with academy bonus earns more XP than same agent without', () => {
    const base = createStartingState()
    const agentId = Object.keys(base.agents)[0]!
    const agent = base.agents[agentId]!

    // Ensure the agent has headroom for the bonus to matter
    const cappedAgent = {
      ...agent,
      baseStats: {
        ...agent.baseStats,
        [combatDrills!.targetStat]: Math.min(agent.baseStats[combatDrills!.targetStat], 90),
      },
    }

    const noBonus = {
      ...base,
      academyTier: 0,
      agents: { ...base.agents, [agentId]: cappedAgent },
    }
    const withBonus = {
      ...base,
      academyTier: 1, // now gives +1
      agents: { ...base.agents, [agentId]: cappedAgent },
    }

    const runToCompletion = (s: typeof base) => {
      let cur = queueTraining(s, agentId, combatDrills!.trainingId)
      for (let i = 0; i < combatDrills!.durationWeeks; i++) {
        cur = advanceTrainingQueues(cur).state
      }
      return cur.agents[agentId]!.progression?.xp ?? 0
    }

    expect(runToCompletion(withBonus)).toBeGreaterThan(runToCompletion(noBonus))
  })
})
