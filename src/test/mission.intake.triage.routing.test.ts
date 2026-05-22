import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  applyMissionTriageDisposition,
  clearMissionTriageDisposition,
  generateWeeklyMissionIntake,
  isMissionTriageDispositionActive,
  mapMissionPriority,
  normalizeMissionRoutingState,
  recomputeMissionRouting,
  routeMission,
  routeMissionToTeam,
  shortlistMissionCandidateTeams,
  missionTriageEscalationBandFromReasonCodes,
  missionTriageShowsEscalationDeferralRisk,
  triageMission,
} from '../domain/missionIntakeRouting'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { evaluateDeploymentEligibility } from '../domain/deploymentReadiness'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { assignTeam } from '../domain/sim/assign'

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
    const routePreview = routeMission(normalized, missionId)
    const teamId = routePreview.candidateTeamIds[0]

    expect(teamId).toBeDefined()

    const teamRouted = routeMissionToTeam(normalized, missionId, teamId!)
    expect(teamRouted.assigned).toBe(true)
    // Match the canonical assignment flow: routing overlay alone is not canonical; persist assignment via `assignTeam`.
    const assignedState = assignTeam(teamRouted.state, missionId, teamId!)
    expect(assignedState.missionRouting?.missions[missionId]?.routingState).toBe('assigned')

    const roundTripped = loadGameSave(serializeGameSave(assignedState))
    expect(roundTripped.missionRouting?.missions[missionId]?.routingState).toBe('assigned')
  })

  it('maps escalation reason codes to triage UI bands', () => {
    expect(missionTriageEscalationBandFromReasonCodes(['escalation-high'])).toBe('high')
    expect(missionTriageEscalationBandFromReasonCodes(['escalation-medium'])).toBe('medium')
    expect(missionTriageEscalationBandFromReasonCodes(['escalation-low'])).toBe('low')
    expect(missionTriageShowsEscalationDeferralRisk(['escalation-high'])).toBe(true)
    expect(missionTriageShowsEscalationDeferralRisk(['escalation-medium'])).toBe(true)
    expect(missionTriageShowsEscalationDeferralRisk(['escalation-low'])).toBe(false)
  })

  it('applyMissionTriageDisposition sets deferred routingState for current week', () => {
    const state = {
      ...createStartingState(),
      missionRouting: normalizeMissionRoutingState(createStartingState()),
    }
    const missionId = 'case-001'
    const next = applyMissionTriageDisposition(state, missionId, 'defer')

    expect(next.missionRouting?.missions[missionId]?.routingState).toBe('deferred')
    expect(next.missionRouting?.missions[missionId]?.playerDisposition).toBe('defer')
    expect(next.missionRouting?.missions[missionId]?.playerDispositionWeek).toBe(state.week)
    expect(
      isMissionTriageDispositionActive(next.missionRouting?.missions[missionId], state.week)
    ).toBe(true)
  })

  it('recomputeMissionRouting drops disposition when recomputed for a later week', () => {
    const base = applyMissionTriageDisposition(
      {
        ...createStartingState(),
        missionRouting: normalizeMissionRoutingState(createStartingState()),
      },
      'case-001',
      'defer'
    )
    const nextWeekState = { ...base, week: base.week + 1 }
    const recomputed = recomputeMissionRouting(nextWeekState, base.week + 1)

    expect(recomputed.missions['case-001']?.playerDisposition).toBeUndefined()
    expect(recomputed.missions['case-001']?.routingState).not.toBe('deferred')
  })

  it('advanceWeek clears weekly triage disposition on the new week', () => {
    const base = applyMissionTriageDisposition(
      {
        ...createStartingState(),
        missionRouting: normalizeMissionRoutingState(createStartingState()),
      },
      'case-001',
      'defer'
    )

    expect(base.missionRouting?.missions['case-001']?.routingState).toBe('deferred')

    const advanced = advanceWeek(base)

    expect(advanced.week).toBe(base.week + 1)
    expect(advanced.missionRouting?.missions['case-001']?.playerDisposition).toBeUndefined()
    expect(advanced.missionRouting?.missions['case-001']?.routingState).not.toBe('deferred')
  })

  it('route disposition sets shortlisted without assigning a team', () => {
    const state = {
      ...createStartingState(),
      missionRouting: normalizeMissionRoutingState(createStartingState()),
    }
    const missionId = 'case-001'
    const next = applyMissionTriageDisposition(state, missionId, 'route')

    expect(next.missionRouting?.missions[missionId]?.routingState).toBe('shortlisted')
    expect(next.cases[missionId]?.assignedTeamIds).toEqual([])
  })

  it('ignore disposition marks triageIgnored without forcing deferred routingState', () => {
    const state = {
      ...createStartingState(),
      missionRouting: normalizeMissionRoutingState(createStartingState()),
    }
    const missionId = 'case-001'
    const next = applyMissionTriageDisposition(state, missionId, 'ignore')

    expect(next.missionRouting?.missions[missionId]?.triageIgnored).toBe(true)
    expect(next.missionRouting?.missions[missionId]?.routingState).not.toBe('deferred')
  })

  it('clearMissionTriageDisposition removes weekly disposition fields', () => {
    const state = applyMissionTriageDisposition(
      {
        ...createStartingState(),
        missionRouting: normalizeMissionRoutingState(createStartingState()),
      },
      'case-001',
      'defer'
    )
    const cleared = clearMissionTriageDisposition(state, 'case-001')

    expect(cleared.missionRouting?.missions['case-001']?.playerDisposition).toBeUndefined()
    expect(cleared.missionRouting?.missions['case-001']?.triageIgnored).toBeUndefined()
  })

  it('refreshMissionRouting preserves defer disposition within the same week', () => {
    const base = applyMissionTriageDisposition(
      {
        ...createStartingState(),
        missionRouting: normalizeMissionRoutingState(createStartingState()),
      },
      'case-001',
      'defer'
    )
    const refreshed = {
      ...base,
      missionRouting: recomputeMissionRouting(base, base.week),
    }

    expect(refreshed.missionRouting?.missions['case-001']?.routingState).toBe('deferred')
    expect(refreshed.missionRouting?.missions['case-001']?.playerDisposition).toBe('defer')
  })

  it('defer disposition blocks deployment eligibility', () => {
    const state = applyMissionTriageDisposition(
      {
        ...createStartingState(),
        missionRouting: normalizeMissionRoutingState(createStartingState()),
      },
      'case-001',
      'defer'
    )
    const teamId = Object.keys(state.teams)[0]!
    const eligibility = evaluateDeploymentEligibility(state, 'case-001', teamId)

    expect(eligibility.hardBlockers).toContain('routing-state-blocked')
  })

  it('assignTeam clears weekly triage disposition', () => {
    const base = applyMissionTriageDisposition(
      {
        ...createStartingState(),
        missionRouting: normalizeMissionRoutingState(createStartingState()),
      },
      'case-001',
      'defer'
    )
    const teamId = Object.keys(base.teams)[0]!
    const assigned = assignTeam(base, 'case-001', teamId)

    expect(assigned.missionRouting?.missions['case-001']?.playerDisposition).toBeUndefined()
    expect(assigned.missionRouting?.missions['case-001']?.routingState).not.toBe('deferred')
  })

  it('persists disposition through save/load', () => {
    const state = applyMissionTriageDisposition(
      {
        ...createStartingState(),
        missionRouting: normalizeMissionRoutingState(createStartingState()),
      },
      'case-001',
      'defer'
    )
    const roundTripped = loadGameSave(serializeGameSave(state))

    expect(roundTripped.missionRouting?.missions['case-001']?.routingState).toBe('deferred')
    expect(roundTripped.missionRouting?.missions['case-001']?.playerDisposition).toBe('defer')
  })
})
