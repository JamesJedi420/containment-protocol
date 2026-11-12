import {
  evaluateAffiliationSiteClearance,
  type AffiliationSiteClearanceDecision,
} from './affiliationSiteClearance'
import type { AffiliationPersonStatusMissionRoutingEvidenceEntry } from './affiliationPersonStatusMissionRoutingEvidence'
import type { EntityWelfarePermissionSurface } from './entityWelfareStatusPermissions'
import type { Agent, CaseInstance, Team } from './models'

const SITE_CLEARANCE_PREFIX = 'site-clearance:'
const FACILITY_CLEARANCE_PREFIX = 'facility-clearance:'

export interface MissionSiteClearanceRequirement {
  readonly siteIds: readonly string[]
  readonly facilityIds: readonly string[]
}

export interface MissionSiteClearanceEnforcementResult {
  readonly required: boolean
  readonly allowed: boolean
  readonly decisions: readonly AffiliationSiteClearanceDecision[]
  readonly reasonCodes: readonly string[]
}

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.map(normalizeToken).filter((value) => value.length > 0))].sort(
    (left, right) => left.localeCompare(right)
  )
}

function collectPrefixedIds(values: readonly string[] | undefined, prefix: string) {
  return uniqueSorted(
    (values ?? [])
      .map((value) => normalizeToken(value))
      .filter((value) => value.startsWith(prefix))
      .map((value) => value.slice(prefix.length))
  )
}

export function parseMissionSiteClearanceRequirement(
  mission: Pick<CaseInstance, 'requiredTags'>
): MissionSiteClearanceRequirement {
  return Object.freeze({
    siteIds: Object.freeze(collectPrefixedIds(mission.requiredTags, SITE_CLEARANCE_PREFIX)),
    facilityIds: Object.freeze(collectPrefixedIds(mission.requiredTags, FACILITY_CLEARANCE_PREFIX)),
  })
}

export function isMissionSiteClearanceTag(tag: string): boolean {
  const normalized = normalizeToken(tag)
  return (
    normalized.startsWith(SITE_CLEARANCE_PREFIX) || normalized.startsWith(FACILITY_CLEARANCE_PREFIX)
  )
}

function buildClearedTeamOnboarding(team: Pick<Team, 'id' | 'name'>) {
  return Object.freeze({
    candidateId: team.id,
    candidateName: team.name,
    stage: 'cleared' as const,
    stageLabel: 'Cleared',
    fullAccessEligible: true,
    checkpointDecisions: Object.freeze([]),
    reasonCodes: Object.freeze(['mission_site_clearance_team_roster']),
  })
}

function collectGrantTags(team: Pick<Team, 'tags'>, members: readonly Pick<Agent, 'tags'>[]) {
  const values = [...team.tags, ...members.flatMap((member) => member.tags)]

  return {
    siteIds: collectPrefixedIds(values, SITE_CLEARANCE_PREFIX),
    facilityIds: collectPrefixedIds(values, FACILITY_CLEARANCE_PREFIX),
  }
}

function missionPermissionDecision(
  entry: AffiliationPersonStatusMissionRoutingEvidenceEntry,
  surface: EntityWelfarePermissionSurface
) {
  return entry.snapshot.permissionDecisions.find((decision) => decision.surface === surface)
}

function buildDurableSiteClearanceDecisions(input: {
  readonly mission: Pick<CaseInstance, 'id' | 'title' | 'requiredTags' | 'siteLayer'>
  readonly requirement: MissionSiteClearanceRequirement
  readonly durableEvidence: readonly AffiliationPersonStatusMissionRoutingEvidenceEntry[]
}) {
  return input.durableEvidence.flatMap((entry) => [
    ...input.requirement.siteIds.map((siteId) =>
      evaluateAffiliationSiteClearance({
        subjectId: entry.record.subjectId,
        subjectLabel: entry.record.subjectLabel,
        surface: 'mission',
        onboardingDecision: entry.snapshot.onboardingDecision,
        basePermissionDecision: missionPermissionDecision(entry, 'mission'),
        context: {
          boundary: 'site',
          siteId,
          siteLabel: siteId,
          siteLayer: input.mission.siteLayer ?? entry.record.siteLayer ?? 'transition',
          grantedSiteIds: entry.record.grantedSiteIds,
          restrictedSiteIds: entry.record.restrictedSiteIds,
          blockedSiteIds: entry.record.blockedSiteIds,
          minimumOnboardingStage: entry.record.minimumOnboardingStage,
        },
      })
    ),
    ...input.requirement.facilityIds.map((facilityId) =>
      evaluateAffiliationSiteClearance({
        subjectId: entry.record.subjectId,
        subjectLabel: entry.record.subjectLabel,
        surface: 'mission',
        onboardingDecision: entry.snapshot.onboardingDecision,
        basePermissionDecision: missionPermissionDecision(entry, 'mission'),
        context: {
          boundary: 'facility',
          facilityId,
          facilityLabel: facilityId,
          siteLayer: input.mission.siteLayer ?? entry.record.siteLayer ?? 'transition',
          grantedFacilityIds: entry.record.grantedFacilityIds,
          restrictedFacilityIds: entry.record.restrictedFacilityIds,
          blockedFacilityIds: entry.record.blockedFacilityIds,
          minimumOnboardingStage: entry.record.minimumOnboardingStage,
        },
      })
    ),
  ])
}

function requirementAllowed(
  decisions: readonly AffiliationSiteClearanceDecision[],
  field: 'siteId' | 'facilityId',
  value: string
) {
  return decisions.some((decision) => decision[field] === value && decision.outcome === 'allowed')
}

export function evaluateMissionSiteClearanceEnforcement(input: {
  readonly mission: Pick<CaseInstance, 'id' | 'title' | 'requiredTags' | 'siteLayer'>
  readonly team: Pick<Team, 'id' | 'name' | 'tags'>
  readonly members: readonly Pick<Agent, 'tags'>[]
  readonly durableEvidence?: readonly AffiliationPersonStatusMissionRoutingEvidenceEntry[]
}): MissionSiteClearanceEnforcementResult {
  const requirement = parseMissionSiteClearanceRequirement(input.mission)
  const required = requirement.siteIds.length > 0 || requirement.facilityIds.length > 0

  if (!required) {
    return Object.freeze({
      required: false,
      allowed: true,
      decisions: Object.freeze([]),
      reasonCodes: Object.freeze([]),
    })
  }

  const grants = collectGrantTags(input.team, input.members)
  const onboardingDecision = buildClearedTeamOnboarding(input.team)
  const tagDecisions = [
    ...requirement.siteIds.map((siteId) =>
      evaluateAffiliationSiteClearance({
        subjectId: input.team.id,
        subjectLabel: input.team.name,
        surface: 'mission',
        onboardingDecision,
        context: {
          boundary: 'site',
          siteId,
          siteLabel: siteId,
          siteLayer: input.mission.siteLayer ?? 'transition',
          grantedSiteIds: grants.siteIds,
        },
      })
    ),
    ...requirement.facilityIds.map((facilityId) =>
      evaluateAffiliationSiteClearance({
        subjectId: input.team.id,
        subjectLabel: input.team.name,
        surface: 'mission',
        onboardingDecision,
        context: {
          boundary: 'facility',
          facilityId,
          facilityLabel: facilityId,
          siteLayer: input.mission.siteLayer ?? 'transition',
          grantedFacilityIds: grants.facilityIds,
        },
      })
    ),
  ]
  const decisions = [
    ...tagDecisions,
    ...buildDurableSiteClearanceDecisions({
      mission: input.mission,
      requirement,
      durableEvidence: input.durableEvidence ?? [],
    }),
  ]
  const reasonCodes = uniqueSorted(decisions.flatMap((decision) => decision.reasonCodes))
  const allowed =
    requirement.siteIds.every((siteId) => requirementAllowed(decisions, 'siteId', siteId)) &&
    requirement.facilityIds.every((facilityId) =>
      requirementAllowed(decisions, 'facilityId', facilityId)
    )

  return Object.freeze({
    required: true,
    allowed,
    decisions: Object.freeze(decisions),
    reasonCodes: Object.freeze(reasonCodes),
  })
}
