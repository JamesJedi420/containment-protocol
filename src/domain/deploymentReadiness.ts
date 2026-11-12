import { assessAttritionPressure, isAgentAttritionUnavailable } from './agent/attrition'
import { buildAgentLoadoutReadinessSummary } from './equipment'
import { assessFundingPressure } from './funding'
import { getMissionIntelRisk, getMissionIntelSummary } from './intel'
import { clamp } from './math'
import { buildTeamNicheSummary, mapCoverageRolesToNiches } from './nicheIdentity'
import { INTEL_CALIBRATION, DOWNTIME_CARRY_IN_CALIBRATION } from './sim/calibration'
import { evaluateConstructionReadinessBurden } from './constructionProgress'
import { createDefaultFatigueChannels, deriveFatigueChannelPenalties } from './agentFatigueChannels'
import {
  buildTeamCompositionState,
  buildTeamWeakestLinkSummary,
  validateTeamComposition,
} from './teamComposition'
import { getTeamAssignedCaseId, getTeamMemberIds } from './teamSimulation'
import {
  evaluateMissionSiteClearanceEnforcement,
  isMissionSiteClearanceTag,
} from './missionSiteClearanceEnforcement'
import {
  evaluateMissionDualLoyaltyEnforcement,
  isMissionDualLoyaltyClearanceTag,
} from './missionDualLoyaltyEnforcement'
import {
  evaluateMissionProtectedStatusEnforcement,
  isMissionProtectedStatusClearanceTag,
} from './missionProtectedStatusEnforcement'
import {
  evaluateMissionRevocationEnforcement,
  isMissionRevocationClearanceTag,
} from './missionRevocationEnforcement'
import { selectAffiliationPersonStatusMissionRoutingEvidence } from './affiliationPersonStatusMissionRoutingEvidence'
import type {
  Agent,
  AgentAvailabilityState,
  AgentDeploymentReadinessSnapshot,
  CaseInstance,
  DeploymentEligibilityResult,
  DeploymentHardBlockerCode,
  DeploymentReadinessCategory,
  DeploymentSoftRiskCode,
  GameState,
  Id,
  MissionRoutingStateKind,
  MissionTimeCostSummary,
  Team,
  TeamCoverageRole,
  TeamDeploymentReadinessState,
} from './models'

function shouldApplyDeploymentCarryInReadiness(mission: CaseInstance | undefined): boolean {
  if (!mission || mission.status !== 'in_progress') {
    return false
  }
  const duration = mission.durationWeeks
  const remaining = mission.weeksRemaining ?? duration
  return remaining === duration
}

function getTeamMembers(
  team: Pick<Team, 'memberIds' | 'agentIds'>,
  agentsById: GameState['agents']
) {
  return getTeamMemberIds(team)
    .map((agentId) => agentsById[agentId])
    .filter((agent): agent is Agent => Boolean(agent))
}

function getNicheEligibleMembers(members: Agent[]) {
  return members.filter((member) => {
    const availabilityState = getAgentAvailabilityState(member)
    return availabilityState === 'idle' || availabilityState === 'assigned'
  })
}

function buildMissionNicheSummary(
  members: Agent[],
  requiredRoles: readonly TeamCoverageRole[] | undefined
) {
  const requiredNiches = mapCoverageRolesToNiches(requiredRoles)
  return buildTeamNicheSummary(members, requiredNiches.length > 0 ? requiredNiches : undefined)
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter((value) => value.length > 0))].sort((a, b) => a.localeCompare(b))
}

function clampWeek(value: number) {
  return Math.max(0, Math.min(52, Math.trunc(Number.isFinite(value) ? value : 0)))
}

function getMissionIntelEffect(state: GameState, missionId: Id) {
  const mission = state.cases[missionId]

  if (!mission) {
    return {
      penalty: 0,
      risk: 0,
      summary: { confidence: 1, uncertainty: 0, age: 0 },
    }
  }

  const summary = getMissionIntelSummary(mission, state.week)
  const risk = getMissionIntelRisk(mission, state.week)

  return {
    penalty: Math.round(risk * INTEL_CALIBRATION.deploymentPenaltyCap),
    risk,
    summary,
  }
}

export function getAgentAvailabilityState(agent: Agent): AgentAvailabilityState {
  if (agent.status === 'dead' || agent.status === 'resigned') {
    return 'unavailable'
  }

  if (isAgentAttritionUnavailable(agent)) {
    return 'unavailable'
  }

  if (agent.assignment?.state === 'training') {
    return 'training'
  }

  if (
    agent.assignment?.state === 'recovery' ||
    agent.status === 'injured' ||
    agent.status === 'recovering'
  ) {
    return 'recovering'
  }

  if (agent.assignment?.state === 'assigned') {
    return 'assigned'
  }

  return 'idle'
}

export function buildAgentDeploymentReadinessSnapshot(
  agent: Agent,
  missionRequiredTags: string[] = [],
  state?: Pick<GameState, 'researchState'>
): AgentDeploymentReadinessSnapshot {
  const availabilityState = getAgentAvailabilityState(agent)
  const loadoutReadiness = buildAgentLoadoutReadinessSummary(agent, { state }).readiness
  const requiredCertIds = missionRequiredTags
    .filter((tag) => tag.startsWith('cert:'))
    .map((tag) => tag.slice(5))
  const certifications = agent.progression?.certifications ?? {}
  const certificationReadiness =
    requiredCertIds.length === 0 ||
    requiredCertIds.every(
      (certificationId) => certifications[certificationId]?.state === 'certified'
    )
      ? 'ready'
      : 'blocked'

  const deployable =
    (availabilityState === 'idle' || availabilityState === 'assigned') &&
    loadoutReadiness !== 'blocked' &&
    certificationReadiness === 'ready'

  return {
    agentId: agent.id,
    deployable,
    availabilityState,
    fatigue: clamp(Math.round(agent.fatigue), 0, 100),
    loadoutReadiness,
    certificationReadiness,
    ...(availabilityState === 'training' ? { trainingLockReason: 'training-assignment' } : {}),
  }
}

export function buildMissionTimeCostSummary(
  state: GameState,
  missionId: Id,
  teamId: Id,
  hardBlockers: DeploymentHardBlockerCode[] = [],
  softRisks: DeploymentSoftRiskCode[] = []
): MissionTimeCostSummary {
  const mission = state.cases[missionId]
  const team = state.teams[teamId]
  const members = team ? getTeamMembers(team, state.agents) : []
  const fundingPressure = assessFundingPressure(state)
  const attritionPressure = assessAttritionPressure(state)
  const averageFatigue =
    members.length > 0
      ? Math.round(members.reduce((sum, member) => sum + member.fatigue, 0) / members.length)
      : 100

  const expectedTravelWeeks = clampWeek(
    mission?.regionTag && mission.regionTag !== 'local'
      ? mission.regionTag === 'regional'
        ? 1
        : 2
      : 0
  )

  const setupPenaltyFromBlockers = hardBlockers.includes('training-blocked')
    ? 1
    : hardBlockers.includes('missing-certification') ||
        hardBlockers.includes('invalid-loadout-gate') ||
        hardBlockers.includes('site-clearance-required') ||
        hardBlockers.includes('dual-loyalty-restricted') ||
        hardBlockers.includes('protected-status-restricted') ||
        hardBlockers.includes('revocation-restricted')
      ? 2
      : 0
  const setupPenaltyFromBudget = fundingPressure.deploymentSetupDelayWeeks
  const setupPenaltyFromAttrition = attritionPressure.deploymentSetupDelayWeeks

  const expectedSetupWeeks = clampWeek(
    1 +
      setupPenaltyFromBlockers +
      setupPenaltyFromBudget +
      setupPenaltyFromAttrition +
      (softRisks.includes('low-cohesion-band') ? 1 : 0)
  )
  const expectedResolutionWeeks = clampWeek(mission?.durationWeeks ?? 1)
  const expectedRecoveryWeeks = clampWeek(
    Math.round(averageFatigue / 35) + (mission?.kind === 'raid' ? 1 : 0)
  )

  const expectedTotalWeeks = Math.max(
    1,
    expectedTravelWeeks + expectedSetupWeeks + expectedResolutionWeeks + expectedRecoveryWeeks
  )

  return {
    missionId,
    plannedStartWeek: state.week + (hardBlockers.length > 0 ? 1 : 0),
    expectedTravelWeeks,
    expectedSetupWeeks,
    expectedResolutionWeeks,
    expectedRecoveryWeeks,
    expectedTotalWeeks,
    timeCostReasonCodes: uniqueSorted([
      expectedTravelWeeks > 0 ? 'travel-burden' : 'travel-minimal',
      setupPenaltyFromBlockers > 0 ? 'setup-blocked-gates' : 'setup-ready',
      setupPenaltyFromBudget > 0 ? 'budget-pressure-friction' : '',
      setupPenaltyFromAttrition > 0 ? 'attrition-pressure-friction' : '',
      expectedResolutionWeeks >= 4 ? 'execution-extended' : 'execution-standard',
      expectedRecoveryWeeks >= 2 ? 'recovery-tail-elevated' : 'recovery-tail-light',
    ]),
  }
}

function deriveReadinessCategory(
  hardBlockers: DeploymentHardBlockerCode[],
  softRisks: DeploymentSoftRiskCode[]
): DeploymentReadinessCategory {
  if (hardBlockers.includes('recovery-required')) {
    return 'recovery_required'
  }

  if (hardBlockers.length > 0) {
    if (
      hardBlockers.includes('missing-coverage') ||
      hardBlockers.includes('missing-certification') ||
      hardBlockers.includes('invalid-loadout-gate') ||
      hardBlockers.includes('site-clearance-required') ||
      hardBlockers.includes('dual-loyalty-restricted') ||
      hardBlockers.includes('protected-status-restricted') ||
      hardBlockers.includes('revocation-restricted') ||
      hardBlockers.includes('team-state-incompatible')
    ) {
      return 'hard_blocked'
    }

    return 'temporarily_blocked'
  }

  if (softRisks.length > 0) {
    return 'conditional'
  }

  return 'mission_ready'
}

export function evaluateDeploymentEligibility(
  state: GameState,
  missionId: Id,
  teamId: Id
): DeploymentEligibilityResult {
  const mission = state.cases[missionId]
  const team = state.teams[teamId]

  if (!mission || !team) {
    const hardBlockers: DeploymentHardBlockerCode[] = ['team-state-incompatible']
    return {
      eligible: false,
      hardBlockers,
      softRisks: [],
      intelPenalty: 0,
      timeCostSummary: buildMissionTimeCostSummary(state, missionId, teamId, hardBlockers, []),
      weakestLinkContributors: [],
      explanationNotes: ['Missing mission or team reference.'],
    }
  }

  const composition = buildTeamCompositionState(team, state.agents, state.teams)
  const missionValidation = validateTeamComposition(team, state.agents, state.teams, {
    requiredRoles: mission.requiredRoles,
  })
  const weakestLink = buildTeamWeakestLinkSummary(team, state.agents, {
    requiredRoles: mission.requiredRoles,
  })
  const members = getTeamMembers(team, state.agents)
  const nicheEligibleMembers = getNicheEligibleMembers(members)
  const missionNicheSummary = buildMissionNicheSummary(
    nicheEligibleMembers,
    missionValidation.requiredRoles
  )
  const hasMissionNicheMismatch =
    missionNicheSummary.missingNiches.length > 0 || missionNicheSummary.substituteNiches.length > 0
  const agentSnapshots = members.map((member) =>
    buildAgentDeploymentReadinessSnapshot(member, mission.requiredTags, state)
  )

  const averageFatigue =
    members.length > 0
      ? Math.round(members.reduce((sum, member) => sum + member.fatigue, 0) / members.length)
      : 100
  const missionIntelEffect = getMissionIntelEffect(state, missionId)
  const fundingPressure = assessFundingPressure(state)
  const attritionPressure = assessAttritionPressure(state)
  const missionRoutingState = state.missionRouting?.missions[missionId]?.routingState
  const tagCoverage = new Set(
    members.flatMap((member) => member.tags.map((tag) => tag.trim()).filter(Boolean))
  )
  const durablePersonStatusEvidence = selectAffiliationPersonStatusMissionRoutingEvidence({
    records: state.affiliationPersonStatusRecords,
    team,
    members,
    candidates:
      state.recruitmentPool && state.recruitmentPool.length > 0
        ? state.recruitmentPool
        : state.candidates,
    entityWelfareReclassificationRecords: state.entityWelfareReclassificationRecords,
  })
  const siteClearance = evaluateMissionSiteClearanceEnforcement({
    mission,
    team,
    members,
    durableEvidence: durablePersonStatusEvidence,
  })
  const dualLoyalty = evaluateMissionDualLoyaltyEnforcement({
    mission,
    team,
    members,
    durableEvidence: durablePersonStatusEvidence,
  })
  const protectedStatus = evaluateMissionProtectedStatusEnforcement({
    mission,
    team,
    members,
    durableEvidence: durablePersonStatusEvidence,
  })
  const revocation = evaluateMissionRevocationEnforcement({
    mission,
    team,
    members,
    durableEvidence: durablePersonStatusEvidence,
  })

  const missingRequiredTags = mission.requiredTags.filter(
    (requiredTag) =>
      !requiredTag.startsWith('cert:') &&
      !isMissionSiteClearanceTag(requiredTag) &&
      !isMissionDualLoyaltyClearanceTag(requiredTag) &&
      !isMissionProtectedStatusClearanceTag(requiredTag) &&
      !isMissionRevocationClearanceTag(requiredTag) &&
      !tagCoverage.has(requiredTag)
  )

  const hardBlockers = uniqueSorted([
    missionValidation.missingRoles.length > 0 ? 'missing-coverage' : '',
    composition.validationIssues.some(
      (issue: { code: string }) =>
        issue.code === 'invalid-team' ||
        issue.code === 'invalid-leader' ||
        issue.code === 'duplicate-membership' ||
        issue.code === 'deploy-conflict' ||
        issue.code === 'stale-member-reference'
    )
      ? 'team-state-incompatible'
      : '',
    agentSnapshots.some((snapshot) => snapshot.availabilityState === 'training')
      ? 'training-blocked'
      : '',
    missingRequiredTags.length > 0 ? 'invalid-loadout-gate' : '',
    siteClearance.required && !siteClearance.allowed ? 'site-clearance-required' : '',
    dualLoyalty.required && !dualLoyalty.allowed ? 'dual-loyalty-restricted' : '',
    protectedStatus.required && !protectedStatus.allowed ? 'protected-status-restricted' : '',
    revocation.required && !revocation.allowed ? 'revocation-restricted' : '',
    agentSnapshots.some((snapshot) => snapshot.certificationReadiness === 'blocked')
      ? 'missing-certification'
      : '',
    team.status?.state === 'recovering' ||
    members.some((member) => getAgentAvailabilityState(member) === 'recovering')
      ? 'recovery-required'
      : '',
    missionRoutingState === 'blocked' || missionRoutingState === 'deferred'
      ? 'routing-state-blocked'
      : '',
    getTeamAssignedCaseId(team) && getTeamAssignedCaseId(team) !== missionId
      ? 'capacity-locked'
      : '',
  ]) as DeploymentHardBlockerCode[]

  const softRisks = uniqueSorted([
    composition.cohesion.cohesionBand === 'fragile' ||
    composition.cohesion.cohesionBand === 'unstable'
      ? 'low-cohesion-band'
      : '',
    averageFatigue >= 55 ? 'high-fatigue-burden' : '',
    weakestLink.totalPenalty > 0 ? 'weakest-link-risk' : '',
    (composition.category === 'balanced_rapid_response_team' && mission.kind === 'raid') ||
    hasMissionNicheMismatch
      ? 'strategic-mismatch'
      : '',
    fundingPressure.deploymentSetupDelayWeeks > 0 ? 'budget-pressure' : '',
    attritionPressure.constrained ? 'attrition-pressure' : '',
    missionIntelEffect.penalty >= INTEL_CALIBRATION.deploymentSoftRiskThreshold
      ? 'intel-uncertainty'
      : '',
  ]) as DeploymentSoftRiskCode[]

  const timeCostSummary = buildMissionTimeCostSummary(
    state,
    missionId,
    teamId,
    hardBlockers,
    softRisks
  )

  return {
    eligible: hardBlockers.length === 0,
    hardBlockers,
    softRisks,
    intelPenalty: missionIntelEffect.penalty,
    timeCostSummary,
    weakestLinkContributors: weakestLink.penalties.map((penalty) => penalty.code),
    explanationNotes: [
      `Coverage missing: ${missionValidation.missingRoles.length}`,
      `Cohesion band: ${composition.cohesion.cohesionBand}`,
      `Average fatigue: ${averageFatigue}`,
      `Budget pressure: ${fundingPressure.budgetPressure}/4 with ${fundingPressure.pendingProcurementRequestIds.length} pending procurement item(s).`,
      `Attrition pressure: ${attritionPressure.replacementPressure} replacement pressure, ${attritionPressure.staffingGap} staffing gap, ${attritionPressure.temporaryUnavailableCount} temporary absence(s).`,
      `Mission intel risk: ${missionIntelEffect.penalty}/${INTEL_CALIBRATION.deploymentPenaltyCap} (confidence ${missionIntelEffect.summary.confidence.toFixed(2)}, uncertainty ${missionIntelEffect.summary.uncertainty.toFixed(2)}, age ${missionIntelEffect.summary.age})`,
      siteClearance.required
        ? `Site clearance: ${
            siteClearance.allowed ? 'allowed' : 'blocked'
          } (${siteClearance.reasonCodes.join(', ') || 'no reasons'}).`
        : '',
      dualLoyalty.required
        ? `Dual loyalty: ${
            dualLoyalty.allowed ? 'allowed' : 'blocked'
          } (${dualLoyalty.reasonCodes.join(', ') || 'no reasons'}).`
        : '',
      protectedStatus.required
        ? `Protected status: ${
            protectedStatus.allowed ? 'allowed' : 'blocked'
          } (${protectedStatus.reasonCodes.join(', ') || 'no reasons'}).`
        : '',
      revocation.required
        ? `Revocation: ${
            revocation.allowed ? 'allowed' : 'blocked'
          } (${revocation.reasonCodes.join(', ') || 'no reasons'}).`
        : '',
      missionNicheSummary.summaryLines[0] ?? '',
      missionNicheSummary.overlappingNiches.length > 0
        ? `Niche overlap: ${missionNicheSummary.overlappingNiches.join(', ')}.`
        : '',
      `Routing state: ${(missionRoutingState ?? 'queued') satisfies MissionRoutingStateKind | 'queued'}`,
    ],
  }
}

export function buildTeamDeploymentReadinessState(
  state: GameState,
  teamId: Id,
  missionId?: Id
): TeamDeploymentReadinessState {
  const team = state.teams[teamId]
  const members = team ? getTeamMembers(team, state.agents) : []
  const effectiveMissionId =
    missionId ?? (team ? getTeamAssignedCaseId(team) : null) ?? Object.keys(state.cases)[0] ?? ''
  const effectiveMission = state.cases[effectiveMissionId]
  const missionValidation =
    team && effectiveMission
      ? validateTeamComposition(team, state.agents, state.teams, {
          requiredRoles: effectiveMission.requiredRoles,
        })
      : null

  const eligibility = evaluateDeploymentEligibility(state, effectiveMissionId, teamId)
  const composition = team ? buildTeamCompositionState(team, state.agents, state.teams) : undefined
  const nicheEligibleMembers = getNicheEligibleMembers(members)
  const nicheSummary =
    effectiveMission && team
      ? buildMissionNicheSummary(nicheEligibleMembers, missionValidation?.requiredRoles)
      : undefined

  const minimumMemberReadiness =
    members.length > 0
      ? Math.min(...members.map((member) => clamp(Math.round(100 - member.fatigue), 0, 100)))
      : 0
  const averageFatigue =
    members.length > 0
      ? Math.round(members.reduce((sum, member) => sum + member.fatigue, 0) / members.length)
      : 100
  const missionIntelEffect = getMissionIntelEffect(state, effectiveMissionId)

  let deploymentCarryInReadinessDelta = 0
  const deploymentCarryInCodes: string[] = []
  if (
    effectiveMission &&
    shouldApplyDeploymentCarryInReadiness(effectiveMission) &&
    effectiveMission.deploymentCarryInByAgentId
  ) {
    const carryInMap = effectiveMission.deploymentCarryInByAgentId
    for (const member of members) {
      const stamp = carryInMap[member.id]
      if (stamp) {
        deploymentCarryInReadinessDelta += stamp.readinessDelta
        deploymentCarryInCodes.push(stamp.code)
      }
    }
    deploymentCarryInReadinessDelta = clamp(
      deploymentCarryInReadinessDelta,
      -DOWNTIME_CARRY_IN_CALIBRATION.teamReadinessDeltaCap,
      DOWNTIME_CARRY_IN_CALIBRATION.teamReadinessDeltaCap
    )
  }

  const nonIntelSoftRiskCount = eligibility.softRisks.filter(
    (riskCode) => riskCode !== 'intel-uncertainty'
  ).length

  // SPE-110: Construction-incomplete site burden — read-only, does not alter softRisks list.
  const constructionBurden = evaluateConstructionReadinessBurden(state, effectiveMissionId)

  // SPE-130 Phase 1: derive per-member channel penalties and average them across the team.
  const averageChannelPenalty =
    members.length > 0
      ? Math.round(
          members.reduce((sum, member) => {
            const penalties = deriveFatigueChannelPenalties(
              member.fatigueChannels ?? createDefaultFatigueChannels()
            )
            return sum + penalties.readinessPenalty
          }, 0) / members.length
        )
      : 0

  const readinessScore = clamp(
    100 -
      averageFatigue -
      averageChannelPenalty -
      eligibility.hardBlockers.length * 12 -
      nonIntelSoftRiskCount * 6 +
      ((composition?.requiredCoverageRoles.length ?? 0) - (composition?.missingRoles.length ?? 0)) *
        8 -
      missionIntelEffect.penalty -
      constructionBurden +
      deploymentCarryInReadinessDelta,
    0,
    100
  )

  return {
    teamId,
    readinessCategory: deriveReadinessCategory(eligibility.hardBlockers, eligibility.softRisks),
    readinessScore: Math.round(readinessScore),
    hardBlockers: [...eligibility.hardBlockers],
    softRisks: [...eligibility.softRisks],
    nicheSummary,
    intelPenalty: missionIntelEffect.penalty,
    deploymentCarryInReadinessDelta:
      deploymentCarryInReadinessDelta !== 0 ? deploymentCarryInReadinessDelta : undefined,
    deploymentCarryInCodes:
      deploymentCarryInCodes.length > 0
        ? [...new Set(deploymentCarryInCodes)].sort((a, b) => a.localeCompare(b))
        : undefined,
    coverageCompleteness: {
      required: [...(missionValidation?.requiredRoles ?? composition?.requiredCoverageRoles ?? [])],
      covered: [...(missionValidation?.coveredRoles ?? composition?.coveredRoles ?? [])],
      missing: [...(missionValidation?.missingRoles ?? composition?.missingRoles ?? [])],
    },
    cohesionBand: composition?.cohesion.cohesionBand ?? 'fragile',
    minimumMemberReadiness,
    averageFatigue,
    estimatedDeployWeeks:
      eligibility.timeCostSummary.expectedTravelWeeks +
      eligibility.timeCostSummary.expectedSetupWeeks,
    estimatedRecoveryWeeks: eligibility.timeCostSummary.expectedRecoveryWeeks,
    computedWeek: state.week,
  }
}
