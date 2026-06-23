import {
  evaluateAffiliationSiteClearance,
  type AffiliationSiteClearanceDecision,
} from './affiliationSiteClearance'
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

export function evaluateMissionSiteClearanceEnforcement(input: {
  readonly mission: Pick<CaseInstance, 'id' | 'title' | 'requiredTags' | 'siteLayer'>
  readonly team: Pick<Team, 'id' | 'name' | 'tags'>
  readonly members: readonly Pick<Agent, 'tags'>[]
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
  const decisions = [
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
  const reasonCodes = uniqueSorted(decisions.flatMap((decision) => decision.reasonCodes))

  return Object.freeze({
    required: true,
    allowed: decisions.every((decision) => decision.outcome === 'allowed'),
    decisions: Object.freeze(decisions),
    reasonCodes: Object.freeze(reasonCodes),
  })
}
