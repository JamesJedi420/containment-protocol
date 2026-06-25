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
import type { AffiliationPersonStatusRecord } from '../domain/affiliationPersonStatusRecords'
import type { Candidate } from '../domain/recruitment'

function makeClearedCandidate(id: string, name: string): Candidate {
  return {
    id,
    name,
    hireStatus: 'available',
    funnelStage: 'hired',
    revealLevel: 2,
    roleInclination: 'field',
    agentData: {
      role: 'field',
      specialization: 'recon',
      stats: {
        combat: 45,
        investigation: 55,
        utility: 50,
        social: 40,
      },
      traits: [],
    },
  } as Candidate
}

function clearedPersonStatusRecord(
  overrides: Partial<AffiliationPersonStatusRecord>
): AffiliationPersonStatusRecord {
  const subjectId = overrides.subjectId ?? 'subject:mission-routing'
  const candidateRef = overrides.candidateRef ?? `candidate:${subjectId}`

  return {
    id: overrides.id ?? `person-status:${subjectId}`,
    subjectId,
    subjectLabel: overrides.subjectLabel ?? subjectId,
    candidateRef,
    backgroundCleared: true,
    trainingCompleted: true,
    oathContractSigned: true,
    protectedStatus: 'full_staff',
    protectedAction: 'assign_mission',
    ...overrides,
  }
}

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

  it('leaves existing missions without explicit clearance requirements unchanged', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id
    const baseline = routeMission(state, missionId)

    state.cases[missionId] = {
      ...state.cases[missionId],
      tags: [...state.cases[missionId].tags, 'site:packet:explicitly-not-clearance'],
    }

    const routed = routeMission(state, missionId)

    expect(routed.routingState).toBe(baseline.routingState)
    expect(routed.routingBlockers).not.toContain('site-clearance-required')
    expect(routed.candidateTeamIds).toEqual(baseline.candidateTeamIds)
  })

  it('allows explicit site clearance through member grant tags', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id
    const teamId = Object.keys(state.teams)[0]!
    const memberId = state.teams[teamId]!.memberIds?.[0] ?? state.teams[teamId]!.agentIds[0]!
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredTags: [...state.cases[missionId].requiredTags, 'site-clearance:alpha'],
    }
    state.agents[memberId] = {
      ...state.agents[memberId],
      tags: [...state.agents[memberId].tags, 'site-clearance:alpha'],
    }

    const eligibility = evaluateDeploymentEligibility(state, missionId, teamId)
    const routed = routeMission(state, missionId)

    expect(eligibility.hardBlockers).not.toContain('site-clearance-required')
    expect(routed.candidateTeamIds).toContain(teamId)
    expect(routed.routingBlockers).not.toContain('site-clearance-required')
  })

  it('blocks mission routing when explicit site clearance is missing', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id
    const teamId = Object.keys(state.teams)[0]!
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredTags: ['site-clearance:restricted-yard'],
      requiredRoles: [],
    }

    const eligibility = evaluateDeploymentEligibility(state, missionId, teamId)
    const routed = routeMission(state, missionId)

    expect(eligibility.hardBlockers).toContain('site-clearance-required')
    expect(eligibility.hardBlockers).not.toContain('invalid-loadout-gate')
    expect(routed.routingState).toBe('blocked')
    expect(routed.routingBlockers).toContain('site-clearance-required')
    expect(routed.routingBlockers).not.toContain('invalid-loadout-gate')
  })

  it('allows explicit facility clearance through team grant tags only when facility matches', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id
    const [grantedTeamId, missingTeamId] = Object.keys(state.teams)
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredTags: ['facility-clearance:archive'],
      requiredRoles: [],
    }
    state.teams[grantedTeamId!] = {
      ...state.teams[grantedTeamId!]!,
      tags: [...state.teams[grantedTeamId!]!.tags, 'facility-clearance:archive'],
    }

    const grantedEligibility = evaluateDeploymentEligibility(state, missionId, grantedTeamId!)
    const missingEligibility = evaluateDeploymentEligibility(state, missionId, missingTeamId!)
    const candidates = shortlistMissionCandidateTeams(state, missionId)
    const routed = routeMission(state, missionId)

    expect(grantedEligibility.hardBlockers).not.toContain('site-clearance-required')
    expect(missingEligibility.hardBlockers).toContain('site-clearance-required')
    expect(
      candidates.find((candidate) => candidate.teamId === missingTeamId)?.blockerCodes
    ).toContain('site-clearance-required')
    expect(routed.candidateTeamIds).toContain(grantedTeamId)
    expect(routed.candidateTeamIds).not.toContain(missingTeamId)
  })

  it('allows explicit site clearance through exact-match durable person-status evidence', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id
    const teamId = Object.keys(state.teams)[0]!
    const memberId = state.teams[teamId]!.memberIds?.[0] ?? state.teams[teamId]!.agentIds[0]!
    const candidateId = `candidate:${memberId}`
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredTags: ['site-clearance:annex-7'],
      requiredRoles: [],
    }
    state.candidates = [makeClearedCandidate(candidateId, state.agents[memberId]!.name)]
    state.recruitmentPool = state.candidates
    state.affiliationPersonStatusRecords = {
      [`person-status:${memberId}`]: clearedPersonStatusRecord({
        id: `person-status:${memberId}`,
        subjectId: memberId,
        subjectLabel: state.agents[memberId]!.name,
        candidateRef: candidateId,
        grantedSiteIds: ['annex-7'],
      }),
    }

    const eligibility = evaluateDeploymentEligibility(state, missionId, teamId)
    const routed = routeMission(state, missionId)

    expect(eligibility.hardBlockers).not.toContain('site-clearance-required')
    expect(eligibility.hardBlockers).not.toContain('invalid-loadout-gate')
    expect(routed.candidateTeamIds).toContain(teamId)
    expect(routed.routingBlockers).not.toContain('site-clearance-required')
  })

  it('ignores durable person-status evidence that does not exactly match team or member ids', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id
    const teamId = Object.keys(state.teams)[0]!
    const candidateId = 'candidate:nonmatching'
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredTags: ['site-clearance:annex-7'],
      requiredRoles: [],
    }
    state.candidates = [makeClearedCandidate(candidateId, 'Nonmatching Record')]
    state.recruitmentPool = state.candidates
    state.affiliationPersonStatusRecords = {
      'person-status:nonmatching': clearedPersonStatusRecord({
        id: 'person-status:nonmatching',
        subjectId: 'agent:not-on-team',
        subjectLabel: 'Nonmatching Record',
        candidateRef: candidateId,
        grantedSiteIds: ['annex-7'],
      }),
    }

    const eligibility = evaluateDeploymentEligibility(state, missionId, teamId)
    const routed = routeMission(state, missionId)

    expect(eligibility.hardBlockers).toContain('site-clearance-required')
    expect(routed.routingBlockers).toContain('site-clearance-required')
  })

  it('leaves existing missions without explicit dual-loyalty requirements unchanged', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id
    const teamId = Object.keys(state.teams)[0]!
    const baseline = routeMission(state, missionId)

    state.teams[teamId] = {
      ...state.teams[teamId]!,
      tags: [...state.teams[teamId]!.tags, 'dual-loyalty:criminal'],
    }

    const routed = routeMission(state, missionId)

    expect(routed.routingState).toBe(baseline.routingState)
    expect(routed.routingBlockers).not.toContain('dual-loyalty-restricted')
    expect(routed.candidateTeamIds).toEqual(baseline.candidateTeamIds)
  })

  it('allows explicit dual-loyalty clearance for clean or watch-only teams', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id
    const teamId = Object.keys(state.teams)[0]!
    const memberId = state.teams[teamId]!.memberIds?.[0] ?? state.teams[teamId]!.agentIds[0]!
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredTags: ['dual-loyalty-clearance'],
      requiredRoles: [],
    }
    state.agents[memberId] = {
      ...state.agents[memberId],
      tags: [...state.agents[memberId].tags, 'dual-loyalty:civic'],
    }

    const eligibility = evaluateDeploymentEligibility(state, missionId, teamId)
    const routed = routeMission(state, missionId)

    expect(eligibility.hardBlockers).not.toContain('dual-loyalty-restricted')
    expect(eligibility.hardBlockers).not.toContain('invalid-loadout-gate')
    expect(routed.candidateTeamIds).toContain(teamId)
    expect(routed.routingBlockers).not.toContain('dual-loyalty-restricted')
  })

  it('blocks mission routing when explicit dual-loyalty review finds restricted evidence', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredTags: ['dual-loyalty-clearance'],
      requiredRoles: [],
    }

    for (const team of Object.values(state.teams)) {
      team.tags = [...team.tags, 'dual-loyalty:criminal']
    }

    const teamId = Object.keys(state.teams)[0]!
    const eligibility = evaluateDeploymentEligibility(state, missionId, teamId)
    const routed = routeMission(state, missionId)

    expect(eligibility.hardBlockers).toContain('dual-loyalty-restricted')
    expect(eligibility.hardBlockers).not.toContain('invalid-loadout-gate')
    expect(routed.routingState).toBe('blocked')
    expect(routed.routingBlockers).toContain('dual-loyalty-restricted')
    expect(routed.routingBlockers).not.toContain('invalid-loadout-gate')
  })

  it('blocks mission routing when explicit dual-loyalty review finds blocked evidence', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredTags: ['dual-loyalty-clearance'],
      requiredRoles: [],
    }

    for (const team of Object.values(state.teams)) {
      team.tags = [...team.tags, 'dual-loyalty:blocked']
    }

    const routed = routeMission(state, missionId)

    expect(routed.routingState).toBe('blocked')
    expect(routed.routingBlockers).toContain('dual-loyalty-restricted')
    expect(routed.routingBlockers).not.toContain('invalid-loadout-gate')
  })

  it('blocks explicit dual-loyalty review from durable person-status evidence', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id
    const teamId = Object.keys(state.teams)[0]!
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredTags: ['dual-loyalty-clearance'],
      requiredRoles: [],
    }
    state.affiliationPersonStatusRecords = Object.fromEntries(
      Object.values(state.teams).map((team) => {
        const memberId = team.memberIds?.[0] ?? team.agentIds[0]!
        return [
          `person-status:${memberId}`,
          clearedPersonStatusRecord({
            id: `person-status:${memberId}`,
            subjectId: memberId,
            subjectLabel: state.agents[memberId]!.name,
            primaryLoyaltyAnchor: 'agency',
            secondaryLoyaltyAnchors: ['patron'],
            dualLoyaltyEvidenceTags: ['dual_loyalty:restricted'],
          }),
        ]
      })
    )

    const eligibility = evaluateDeploymentEligibility(state, missionId, teamId)
    const routed = routeMission(state, missionId)

    expect(eligibility.hardBlockers).toContain('dual-loyalty-restricted')
    expect(routed.routingBlockers).toContain('dual-loyalty-restricted')
    expect(routed.routingBlockers).not.toContain('invalid-loadout-gate')
  })

  it('leaves existing missions without explicit protected-status requirements unchanged', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id
    const teamId = Object.keys(state.teams)[0]!
    const baseline = routeMission(state, missionId)

    state.teams[teamId] = {
      ...state.teams[teamId]!,
      tags: [...state.teams[teamId]!.tags, 'protected-status:minor'],
    }

    const routed = routeMission(state, missionId)

    expect(routed.routingState).toBe(baseline.routingState)
    expect(routed.routingBlockers).not.toContain('protected-status-restricted')
    expect(routed.candidateTeamIds).toEqual(baseline.candidateTeamIds)
  })

  it('allows explicit protected-status clearance for full staff teams', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id
    const teamId = Object.keys(state.teams)[0]!
    const memberId = state.teams[teamId]!.memberIds?.[0] ?? state.teams[teamId]!.agentIds[0]!
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredTags: ['protected-status-clearance'],
      requiredRoles: [],
    }
    state.agents[memberId] = {
      ...state.agents[memberId],
      tags: [...state.agents[memberId].tags, 'protected-status:full-staff'],
    }

    const eligibility = evaluateDeploymentEligibility(state, missionId, teamId)
    const routed = routeMission(state, missionId)

    expect(eligibility.hardBlockers).not.toContain('protected-status-restricted')
    expect(eligibility.hardBlockers).not.toContain('invalid-loadout-gate')
    expect(routed.candidateTeamIds).toContain(teamId)
    expect(routed.routingBlockers).not.toContain('protected-status-restricted')
  })

  it('blocks mission routing when explicit protected-status review restricts assignment', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredTags: ['protected-status-clearance'],
      requiredRoles: [],
    }

    for (const team of Object.values(state.teams)) {
      team.tags = [...team.tags, 'protected-status:minor']
    }

    const teamId = Object.keys(state.teams)[0]!
    const eligibility = evaluateDeploymentEligibility(state, missionId, teamId)
    const routed = routeMission(state, missionId)

    expect(eligibility.hardBlockers).toContain('protected-status-restricted')
    expect(eligibility.hardBlockers).not.toContain('invalid-loadout-gate')
    expect(routed.routingState).toBe('blocked')
    expect(routed.routingBlockers).toContain('protected-status-restricted')
    expect(routed.routingBlockers).not.toContain('invalid-loadout-gate')
  })

  it('blocks explicit protected-status review from durable person-status evidence', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id
    const teamId = Object.keys(state.teams)[0]!
    const memberId = state.teams[teamId]!.memberIds?.[0] ?? state.teams[teamId]!.agentIds[0]!
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredTags: ['protected-status-clearance'],
      requiredRoles: [],
    }
    state.affiliationPersonStatusRecords = {
      [`person-status:${memberId}`]: clearedPersonStatusRecord({
        id: `person-status:${memberId}`,
        subjectId: memberId,
        subjectLabel: state.agents[memberId]!.name,
        protectedStatus: 'minor',
        protectedAction: 'assign_mission',
      }),
    }

    const eligibility = evaluateDeploymentEligibility(state, missionId, teamId)
    const routed = routeMission(state, missionId)

    expect(eligibility.hardBlockers).toContain('protected-status-restricted')
    expect(routed.routingBlockers).toContain('protected-status-restricted')
    expect(routed.routingBlockers).not.toContain('invalid-loadout-gate')
  })

  it('allows explicit revocation clearance when no active revocation evidence exists', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id
    const teamId = Object.keys(state.teams)[0]!
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredTags: ['revocation-clearance'],
      requiredRoles: [],
    }

    const eligibility = evaluateDeploymentEligibility(state, missionId, teamId)
    const routed = routeMission(state, missionId)

    expect(eligibility.hardBlockers).not.toContain('revocation-restricted')
    expect(eligibility.hardBlockers).not.toContain('invalid-loadout-gate')
    expect(routed.candidateTeamIds).toContain(teamId)
    expect(routed.routingBlockers).not.toContain('revocation-restricted')
  })

  it('blocks mission routing when explicit revocation review restricts mission access', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredTags: ['revocation-clearance'],
      requiredRoles: [],
    }

    for (const team of Object.values(state.teams)) {
      team.tags = [
        ...team.tags,
        'revocation-kind:revocation',
        'revocation-cause:site-breach',
        'revocation-surface:mission',
      ]
    }

    const teamId = Object.keys(state.teams)[0]!
    const eligibility = evaluateDeploymentEligibility(state, missionId, teamId)
    const routed = routeMission(state, missionId)

    expect(eligibility.hardBlockers).toContain('revocation-restricted')
    expect(eligibility.hardBlockers).not.toContain('invalid-loadout-gate')
    expect(routed.routingState).toBe('blocked')
    expect(routed.routingBlockers).toContain('revocation-restricted')
    expect(routed.routingBlockers).not.toContain('invalid-loadout-gate')
  })

  it('blocks explicit revocation review from durable person-status evidence', () => {
    const state = createStartingState()
    const missionId = state.cases['case-001'].id
    const teamId = Object.keys(state.teams)[0]!
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredTags: ['revocation-clearance'],
      requiredRoles: [],
    }
    state.affiliationPersonStatusRecords = Object.fromEntries(
      Object.values(state.teams).map((team) => {
        const memberId = team.memberIds?.[0] ?? team.agentIds[0]!
        return [
          `person-status:${memberId}`,
          clearedPersonStatusRecord({
            id: `person-status:${memberId}`,
            subjectId: memberId,
            subjectLabel: state.agents[memberId]!.name,
            revocationKind: 'revocation',
            revocationCause: 'site_breach',
            revocationAffectedSurfaces: ['mission'],
          }),
        ]
      })
    )

    const eligibility = evaluateDeploymentEligibility(state, missionId, teamId)
    const routed = routeMission(state, missionId)

    expect(eligibility.hardBlockers).toContain('revocation-restricted')
    expect(routed.routingBlockers).toContain('revocation-restricted')
    expect(routed.routingBlockers).not.toContain('invalid-loadout-gate')
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
