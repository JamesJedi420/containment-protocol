// cspell:words cand
import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import { type Candidate } from '../domain/models'
import { assignTeam } from '../domain/sim/assign'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { hireCandidate } from '../domain/sim/hire'
import { computeTeamScore } from '../domain/sim/scoring'
import { buildAgencyProtocolState } from '../domain/protocols'
import { hasGameStateMirrorParity, normalizeGameState } from '../domain/teamSimulation'

describe('core agent model integration', () => {
  it('normalizes sparse legacy agents into the canonical runtime shape', () => {
    const game = createStartingState()
    game.agents.legacy = {
      id: 'legacy',
      name: 'Legacy Agent',
      role: 'tech',
      baseStats: {
        combat: 18,
        investigation: 61,
        utility: 57,
        social: 29,
      },
      tags: ['tech'],
      relationships: {},
      fatigue: 14,
      status: 'active',
    }

    const normalized = normalizeGameState(game)
    const agent = normalized.agents.legacy

    expect(agent.identity).toMatchObject({ name: 'Legacy Agent' })
    expect(agent.stats).toBeDefined()
    expect(agent.specialization).toBe('tech')
    expect(agent.vitals).toMatchObject({ health: 100, stress: 14, morale: 86, wounds: 0 })
    expect(agent.serviceRecord).toEqual({
      joinedWeek: 1,
    })
    expect(agent.readinessProfile).toMatchObject({
      state: 'ready',
      band: 'steady',
      deploymentEligible: true,
      recoveryRequired: false,
    })
    expect(agent.progression).toMatchObject({
      level: 1,
      xp: 0,
      growthStats: {},
      skillTree: { skillPoints: 0, trainedRelationships: {} },
    })
    expect(agent.equipment).toEqual({})
    expect(agent.equipmentSlots).toEqual({})
    expect(agent.traits).toEqual([])
    expect(agent.abilities).toEqual([])
    expect(agent.history).toMatchObject({
      casesCompleted: 0,
      trainingsDone: 0,
      bonds: {},
      performanceStats: {
        deployments: 0,
        totalContribution: 0,
        totalThreatHandled: 0,
        totalDamageTaken: 0,
        totalHealingPerformed: 0,
        totalEvidenceGathered: 0,
        totalContainmentActionsCompleted: 0,
        totalFieldPower: 0,
        totalContainment: 0,
        totalInvestigation: 0,
        totalSupport: 0,
        totalStressImpact: 0,
        totalEquipmentContributionDelta: 0,
        totalKitContributionDelta: 0,
        totalProtocolContributionDelta: 0,
        totalEquipmentScoreDelta: 0,
        totalKitScoreDelta: 0,
        totalProtocolScoreDelta: 0,
        totalKitEffectivenessDelta: 0,
        totalProtocolEffectivenessDelta: 0,
      },
      alliesWorkedWith: [],
    })
    expect(agent.history?.timeline).toEqual([])
    expect(agent.history?.logs).toEqual([])
    expect(agent.assignment).toEqual({ state: 'idle' })
    expect(agent.assignmentStatus).toEqual({ state: 'idle', teamId: null, caseId: null })
    expect(agent.operationalRole).toBe('investigation')
  })

  it('hydrates sparse imported agents without changing the persistence contract', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame({
      ...fallback,
      agents: {
        imported: {
          id: 'imported',
          name: 'Imported Agent',
          role: 'investigator',
          baseStats: {
            combat: 21,
            investigation: 63,
            utility: 41,
            social: 34,
          },
          tags: ['forensics'],
          relationships: {},
          fatigue: 9,
          status: 'active',
        },
      },
      teams: {},
    })

    const agent = hydrated.agents.imported

    expect(agent.identity?.name).toBe('Imported Agent')
    expect(agent.specialization).toBe('investigator')
    expect(agent.vitals).toMatchObject({ stress: 9, morale: 91, wounds: 0 })
    expect(agent.serviceRecord).toEqual({ joinedWeek: 1 })
    expect(agent.readinessProfile).toMatchObject({
      state: 'ready',
      band: 'steady',
      deploymentEligible: true,
    })
    expect(agent.progression).toMatchObject({
      level: 1,
      growthStats: {},
      skillTree: { skillPoints: 0, trainedRelationships: {} },
    })
    expect(agent.equipment).toEqual({})
    expect(agent.equipmentSlots).toEqual({})
    expect(agent.abilities).toEqual([])
    expect(agent.assignment).toEqual({ state: 'idle' })
    expect(agent.history?.logs).toEqual([])
  })

  it('hydrates academy tier and preserves training queue metadata', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame({
      ...fallback,
      academyTier: 999,
      trainingQueue: [
        {
          id: 'training-legacy-1',
          trainingId: 'coordination-drill',
          trainingName: 'Coordination Drill',
          scope: 'team',
          agentId: 'a_ava',
          agentName: 'Ava Brooks',
          teamId: 't_nightwatch',
          teamName: 'Night Watch',
          drillGroupId: 'group-1',
          memberIds: ['a_ava', 'a_rook'],
          targetStat: 'utility',
          statDelta: 1,
          startedWeek: 2,
          durationWeeks: 2,
          remainingWeeks: 1,
          fundingCost: 15,
          fatigueDelta: 6,
          recoveryBonus: 1,
          stabilityResistanceDelta: 1,
          stabilityToleranceDelta: 1,
          academyStatBonus: 1,
          relationshipDelta: 0.25,
          trainedRelationshipDelta: 2,
        },
      ],
    })

    expect(hydrated.academyTier).toBe(3)
    expect(hydrated.trainingQueue).toHaveLength(1)
    expect(hydrated.trainingQueue[0]).toMatchObject({
      scope: 'team',
      teamId: 't_nightwatch',
      teamName: 'Night Watch',
      drillGroupId: 'group-1',
      memberIds: ['a_ava', 'a_rook'],
      recoveryBonus: 1,
      stabilityResistanceDelta: 1,
      stabilityToleranceDelta: 1,
      academyStatBonus: 1,
      relationshipDelta: 0.25,
      trainedRelationshipDelta: 2,
    })
  })

  it('creates fully populated agents when hiring candidates into the roster', () => {
    const candidate: Candidate = {
      id: 'cand-core-agent',
      name: 'Core Recruit',
      portraitId: 'portrait-core-recruit',
      age: 33,
      category: 'agent',
      hireStatus: 'available',
      weeklyCost: 18,
      weeklyWage: 18,
      revealLevel: 2,
      expiryWeek: 6,
      evaluation: {
        overallVisible: true,
        overall: 72,
        overallValue: 72,
        potentialVisible: true,
        potentialTier: 'mid',
        rumorTags: ['steady-aim'],
        impression: 'Capable under pressure.',
        teamwork: 'Works cleanly in multi-team operations.',
        outlook: 'Steady contributor trajectory.',
      },
      agentData: {
        role: 'field',
        specialization: 'recon',
        stats: {
          combat: 68,
          investigation: 44,
          utility: 39,
          social: 28,
        },
        traits: ['steady-aim'],
        growthProfile: 'adaptive',
      },
    }
    const state = createStartingState()
    state.candidates = [candidate]
    state.recruitmentPool = [candidate]

    const next = hireCandidate(state, candidate.id)
    const agent = next.agents[candidate.id]

    expect(agent.identity).toMatchObject({
      name: 'Core Recruit',
      age: 33,
      portraitId: 'portrait-core-recruit',
    })
    expect(agent.specialization).toBe('recon')
    expect(agent.vitals).toMatchObject({ health: 100, stress: 0, morale: 100, wounds: 0 })
    expect(agent.progression).toMatchObject({
      level: 1,
      growthProfile: 'adaptive',
      growthStats: {},
      skillTree: { skillPoints: 0, trainedRelationships: {} },
    })
    expect(agent.serviceRecord).toEqual({
      joinedWeek: state.week,
    })
    expect(agent.readinessProfile).toMatchObject({
      state: 'ready',
      band: 'steady',
      deploymentEligible: true,
    })
    expect(agent.equipment).toEqual({})
    expect(agent.equipmentSlots).toEqual({})
    expect(agent.abilities).toEqual([])
    expect(agent.history?.timeline).toEqual([
      expect.objectContaining({
        week: state.week,
        eventType: 'agent.hired',
        note: 'Hired into the agency.',
      }),
    ])
    expect(agent.history?.logs).toEqual([
      expect.objectContaining({
        type: 'agent.hired',
        payload: expect.objectContaining({
          agentId: candidate.id,
          candidateId: candidate.id,
        }),
      }),
    ])
    expect(agent.assignment).toEqual({ state: 'idle' })
    expect(agent.assignmentStatus).toEqual({ state: 'idle', teamId: null, caseId: null })
  })

  it('canonicalizes inconsistent imported progression xp to match the stored level floor', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame({
      ...fallback,
      agents: {
        imported: {
          id: 'imported',
          name: 'Imported Agent',
          role: 'investigator',
          level: 4,
          progression: {
            xp: 420,
            level: 4,
            potentialTier: 'B',
            growthProfile: 'steady',
          },
          baseStats: {
            combat: 21,
            investigation: 63,
            utility: 41,
            social: 34,
          },
          tags: ['forensics'],
          relationships: {},
          fatigue: 9,
          status: 'active',
        },
      },
      teams: {},
    })

    expect(hydrated.agents.imported.progression).toMatchObject({
      level: 4,
      xp: expect.any(Number),
      skillTree: { skillPoints: 0, trainedRelationships: {} },
    })
    expect(hydrated.agents.imported.progression!.xp).toBeGreaterThan(420)
  })

  it('ties assignment history to the created operation event log', () => {
    const state = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    const assignedAgentId = state.teams.t_nightwatch.agentIds[0]
    const agent = state.agents[assignedAgentId]

    expect(agent.history?.timeline.at(-1)).toMatchObject({
      eventType: 'assignment.team_assigned',
    })
    expect(agent.serviceRecord?.lastAssignmentWeek).toBe(state.week)
    expect(agent.history?.logs.at(-1)).toMatchObject({
      type: 'assignment.team_assigned',
      payload: expect.objectContaining({
        caseId: 'case-001',
        teamId: 't_nightwatch',
      }),
    })
  })

  it('records collaborator and performance history through weekly case resolution', () => {
    const assigned = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    const teamMemberIds = [...assigned.teams.t_nightwatch.agentIds]
    const gearedAgentId = teamMemberIds[0]
    assigned.agency = {
      ...assigned.agency,
      containmentRating: 90,
      clearanceLevel: 2,
      funding: 200,
    }
    assigned.containmentRating = 90
    assigned.clearanceLevel = 2
    assigned.funding = 200
    assigned.agents[gearedAgentId] = {
      ...assigned.agents[gearedAgentId],
      equipment: {},
      equipmentSlots: {
        secondary: 'ward_seals',
        utility1: 'warding_kits',
      },
    }

    assigned.cases['case-001'] = {
      ...assigned.cases['case-001'],
      tags: ['anomaly', 'occult', 'containment', 'evidence'],
      requiredTags: [],
      preferredTags: [],
      difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
      durationWeeks: 1,
      weeksRemaining: 1,
      status: 'in_progress',
    }

    const protocolState = buildAgencyProtocolState(assigned)
    const expectedScore = computeTeamScore(
      teamMemberIds.map((agentId) => assigned.agents[agentId]!),
      assigned.cases['case-001'],
      { protocolState }
    )

    const next = advanceWeek(assigned)

    for (const agentId of teamMemberIds) {
      const agent = next.agents[agentId]
      const expectedPerformance = expectedScore.agentPerformance.find(
        (entry) => entry.agentId === agentId
      )
      const collaboratorIds = teamMemberIds.filter((candidateId) => candidateId !== agentId)

      expect(agent.history?.casesCompleted).toBeGreaterThanOrEqual(1)
      expect(agent.serviceRecord?.lastCaseWeek).toBe(next.week - 1)
      expect(agent.history?.performanceStats.deployments).toBeGreaterThanOrEqual(1)
      expect(agent.history?.performanceStats.totalContribution).toBeCloseTo(
        expectedPerformance?.contribution ?? 0,
        2
      )
      expect(agent.history?.performanceStats.totalThreatHandled).toBeCloseTo(
        expectedPerformance?.threatHandled ?? 0,
        2
      )
      expect(agent.history?.performanceStats.totalDamageTaken).toBeCloseTo(
        expectedPerformance?.damageTaken ?? 0,
        2
      )
      expect(agent.history?.performanceStats.totalHealingPerformed).toBeCloseTo(
        expectedPerformance?.healingPerformed ?? 0,
        2
      )
      expect(agent.history?.performanceStats.totalEvidenceGathered).toBeCloseTo(
        expectedPerformance?.evidenceGathered ?? 0,
        2
      )
      expect(agent.history?.performanceStats.totalContainmentActionsCompleted).toBeCloseTo(
        expectedPerformance?.containmentActionsCompleted ?? 0,
        2
      )
      expect(agent.history?.performanceStats.totalFieldPower).toBeCloseTo(
        expectedPerformance?.fieldPower ?? 0,
        2
      )
      expect(agent.history?.performanceStats.totalContainment).toBeCloseTo(
        expectedPerformance?.containment ?? 0,
        2
      )
      expect(agent.history?.performanceStats.totalInvestigation).toBeCloseTo(
        expectedPerformance?.investigation ?? 0,
        2
      )
      expect(agent.history?.performanceStats.totalSupport).toBeCloseTo(
        expectedPerformance?.support ?? 0,
        2
      )
      expect(agent.history?.performanceStats.totalStressImpact).toBeCloseTo(
        expectedPerformance?.stressImpact ?? 0,
        2
      )
      expect(agent.history?.performanceStats.totalProtocolContributionDelta).toBeCloseTo(
        expectedPerformance?.powerImpact?.protocolContributionDelta ?? 0,
        2
      )
      expect(agent.history?.performanceStats.totalProtocolScoreDelta).toBeCloseTo(
        expectedPerformance?.powerImpact?.protocolScoreDelta ?? 0,
        2
      )
      if (agentId === gearedAgentId) {
        expect(agent.history?.performanceStats.totalEquipmentContributionDelta).toBeCloseTo(
          expectedPerformance?.powerImpact?.equipmentContributionDelta ?? 0,
          2
        )
        expect(agent.history?.performanceStats.totalKitContributionDelta).toBeCloseTo(
          expectedPerformance?.powerImpact?.kitContributionDelta ?? 0,
          2
        )
        expect(agent.history?.performanceStats.totalEquipmentContributionDelta).toBeGreaterThan(0)
        expect(agent.history?.performanceStats.totalKitEffectivenessDelta).toBeGreaterThan(0)
      }
      expect(agent.history?.counters.stressSustained).toBeGreaterThanOrEqual(0)
      expect(agent.history?.counters.anomalyExposures).toBeGreaterThanOrEqual(1)
      expect(agent.history?.counters.evidenceRecovered).toBeGreaterThanOrEqual(1)
      expect(agent.history?.alliesWorkedWith).toEqual(expect.arrayContaining(collaboratorIds))
      expect(agent.history?.logs.some((entry) => entry.type === 'case.resolved')).toBe(true)

      for (const collaboratorId of collaboratorIds) {
        expect(agent.history?.bonds[collaboratorId]).toBe(agent.relationships[collaboratorId])
      }
    }
  })

  it('repairs legacy mirror mismatches during normalization', () => {
    const state = createStartingState()
    const candidate: Candidate = {
      id: 'cand-mirror-parity',
      name: 'Mirror Candidate',
      portraitId: 'portrait-mirror-candidate',
      age: 29,
      category: 'agent',
      hireStatus: 'available',
      weeklyCost: 14,
      weeklyWage: 14,
      revealLevel: 2,
      expiryWeek: state.week + 4,
      evaluation: {
        overallVisible: true,
        overall: 61,
        overallValue: 61,
        potentialVisible: true,
        potentialTier: 'mid',
        rumorTags: ['reliable'],
        impression: 'Reliable under operational pressure.',
        teamwork: 'Integrates quickly with established squads.',
        outlook: 'Steady trajectory expected.',
      },
      agentData: {
        role: 'field',
        specialization: 'recon',
        stats: {
          combat: 56,
          investigation: 49,
          utility: 45,
          social: 38,
        },
        traits: ['reliable'],
        growthProfile: 'steady',
      },
    }
    const team = state.teams.t_nightwatch

    state.candidates = [candidate]

    state.agency = {
      containmentRating: 88,
      clearanceLevel: 3,
      funding: 420,
    }
    state.containmentRating = 12
    state.clearanceLevel = 1
    state.funding = 100
    state.recruitmentPool = []
    team.status!.assignedCaseId = null
    team.assignedCaseId = 'case-001'

    expect(hasGameStateMirrorParity(state)).toBe(false)

    const normalized = normalizeGameState(state)

    expect(hasGameStateMirrorParity(normalized)).toBe(true)
    expect(normalized.containmentRating).toBe(12)
    expect(normalized.clearanceLevel).toBe(1)
    expect(normalized.funding).toBe(100)
    expect(normalized.recruitmentPool).toEqual([candidate])
    expect(normalized.teams.t_nightwatch.status!.assignedCaseId).toBe(null)
    expect(normalized.teams.t_nightwatch.assignedCaseId).toBeUndefined()
  })
})
