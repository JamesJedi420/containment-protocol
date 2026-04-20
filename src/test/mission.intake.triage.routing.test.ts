import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  generateWeeklyMissionIntake,
  mapMissionPriority,
  normalizeMissionRoutingState,
  routeMission,
  routeMissionToTeam,
  shortlistMissionCandidateTeams,
  triageMission,
} from '../domain/missionIntakeRouting'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'

describe('mission intake, triage, and routing', () => {
  it('generates deterministic weekly intake batches with stable mission ordering', () => {
    const state = createStartingState()
    const first = generateWeeklyMissionIntake(state)
    const second = generateWeeklyMissionIntake(state)

    expect(first.generatedMissionIds).toEqual(second.generatedMissionIds)
    expect(first.notes).toEqual(second.notes)
    expect(first.state.missionRouting?.orderedMissionIds).toEqual(
      second.state.missionRouting?.orderedMissionIds
    )
  })

  it('holds one intake slot open during the second escalation band', () => {
    const base = createStartingState()
    const extraCase = {
      ...base.cases['case-001'],
      id: 'case-004',
      assignedTeamIds: [],
      status: 'open' as const,
    }
    const state = {
      ...base,
      week: 13,
      config: {
        ...base.config,
        maxActiveCases: 5,
      },
      cases: {
        ...base.cases,
        'case-004': extraCase,
      },
      missionRouting: normalizeMissionRoutingState({
        ...base,
        week: 13,
        config: {
          ...base.config,
          maxActiveCases: 5,
        },
        cases: {
          ...base.cases,
          'case-004': extraCase,
        },
      }),
    }

    const earlyBand = generateWeeklyMissionIntake({ ...state, week: 12 })
    const secondBand = generateWeeklyMissionIntake(state)

    expect(earlyBand.generatedMissionIds).toHaveLength(1)
    expect(secondBand.generatedMissionIds).toEqual([])
  })

  it('maps triage score to explicit priority bands deterministically', () => {
    expect(mapMissionPriority(95)).toBe('critical')
    expect(mapMissionPriority(72)).toBe('high')
    expect(mapMissionPriority(40)).toBe('normal')
    expect(mapMissionPriority(10)).toBe('low')
  })

  it('returns structured deterministic triage results with reason codes', () => {
    const state = createStartingState()
    const mission = state.cases['case-001']

    const first = triageMission(state, mission)
    const second = triageMission(state, mission)

    expect(second).toEqual(first)
    expect(first.score).toBeGreaterThanOrEqual(0)
    expect(first.score).toBeLessThanOrEqual(100)
    expect(first.reasonCodes.length).toBeGreaterThan(0)
  })

  it('deterministically lowers triage score when mission intel is weak', () => {
    const base = createStartingState()
    const missionId = 'case-001'
    const strongIntelState = {
      ...base,
      cases: {
        ...base.cases,
        [missionId]: {
          ...base.cases[missionId],
          intelConfidence: 1,
          intelUncertainty: 0,
          intelLastUpdatedWeek: base.week,
        },
      },
    }
    const weakIntelState = {
      ...base,
      cases: {
        ...base.cases,
        [missionId]: {
          ...base.cases[missionId],
          intelConfidence: 0.2,
          intelUncertainty: 0.8,
          intelLastUpdatedWeek: base.week,
        },
      },
    }

    const strongIntel = triageMission(strongIntelState, strongIntelState.cases[missionId])
    const weakIntel = triageMission(weakIntelState, weakIntelState.cases[missionId])

    expect(weakIntel.score).toBeLessThan(strongIntel.score)
    expect(weakIntel.dimensions.intelRisk).toBeGreaterThan(strongIntel.dimensions.intelRisk)
    expect(weakIntel.reasonCodes).toContain('intel-risk-high')
  })

  it('builds deterministic candidate ranking with prescribed tie-break ordering', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id
    const ranked = shortlistMissionCandidateTeams(state, missionId)

    expect(ranked.length).toBeGreaterThan(0)
    expect(ranked[0]?.expectedTotalWeeks).toBeGreaterThan(0)

    for (let index = 1; index < ranked.length; index += 1) {
      const left = ranked[index - 1]!
      const right = ranked[index]!
      expect(
        left.completeness > right.completeness ||
          (left.completeness === right.completeness &&
            (left.cohesionScore > right.cohesionScore ||
              (left.cohesionScore === right.cohesionScore &&
                (left.fatigueBurden < right.fatigueBurden ||
                  (left.fatigueBurden === right.fatigueBurden && left.teamId <= right.teamId)))))
      ).toBe(true)
    }
  })

  it('surfaces explicit routing blocker codes when no team is eligible', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id

    for (const team of Object.values(state.teams)) {
      for (const memberId of team.memberIds ?? team.agentIds ?? []) {
        state.agents[memberId] = {
          ...state.agents[memberId],
          assignment: {
            state: 'training',
            startedWeek: state.week,
            teamId: team.id,
          },
        }
      }
    }

    const routed = routeMission(state, missionId)

    expect(routed.routingState).toBe('blocked')
    expect(routed.routingBlockers).toContain('no-eligible-teams')
    expect(routed.routingBlockers).toContain('training-blocked')
    expect(routed.timeCostSummary?.expectedTotalWeeks).toBeGreaterThan(0)
  })

  it('requires explicit assignment action and preserves mission routing through save/load', () => {
    const state = createStartingState()
    const normalized = {
      ...state,
      missionRouting: normalizeMissionRoutingState(state),
    }
    const missionId = normalized.cases['case-001'].id
    const routed = routeMission(normalized, missionId)
    const teamId = routed.candidateTeamIds[0]

    expect(teamId).toBeDefined()

    const assignedResult = routeMissionToTeam(normalized, missionId, teamId!)
    expect(assignedResult.assigned).toBe(true)
    expect(assignedResult.state.missionRouting?.missions[missionId]?.routingState).toBe('assigned')

    const roundTripped = loadGameSave(serializeGameSave(assignedResult.state))
    expect(roundTripped.missionRouting?.missions[missionId]?.routingState).toBe('assigned')
  })
})
