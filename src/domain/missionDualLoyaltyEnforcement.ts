import {
  AFFILIATION_LOYALTY_ANCHORS,
  evaluateAffiliationDualLoyaltyRisk,
  type AffiliationDualLoyaltyDecision,
  type AffiliationLoyaltyAnchor,
} from './affiliationDualLoyaltyRisk'
import type { Agent, CaseInstance, Team } from './models'

const DUAL_LOYALTY_REQUIREMENT_TAG = 'dual-loyalty-clearance'
const DUAL_LOYALTY_PREFIX = 'dual-loyalty:'
const LOYALTY_PRIMARY_PREFIX = 'loyalty-primary:'

export interface MissionDualLoyaltyEnforcementResult {
  readonly required: boolean
  readonly allowed: boolean
  readonly decisions: readonly AffiliationDualLoyaltyDecision[]
  readonly reasonCodes: readonly string[]
}

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeAnchorToken(value: unknown) {
  return normalizeToken(value).replaceAll('-', '_')
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.map(normalizeToken).filter((value) => value.length > 0))].sort(
    (left, right) => left.localeCompare(right)
  )
}

function isAffiliationLoyaltyAnchor(value: string): value is AffiliationLoyaltyAnchor {
  return AFFILIATION_LOYALTY_ANCHORS.includes(value as AffiliationLoyaltyAnchor)
}

export function missionRequiresDualLoyaltyClearance(
  mission: Pick<CaseInstance, 'requiredTags'>
): boolean {
  return mission.requiredTags.some((tag) => normalizeToken(tag) === DUAL_LOYALTY_REQUIREMENT_TAG)
}

export function isMissionDualLoyaltyClearanceTag(tag: string): boolean {
  return normalizeToken(tag) === DUAL_LOYALTY_REQUIREMENT_TAG
}

function collectPrimaryAnchor(tags: readonly string[]) {
  const anchors = tags
    .map((tag) => normalizeToken(tag))
    .filter((tag) => tag.startsWith(LOYALTY_PRIMARY_PREFIX))
    .map((tag) => normalizeAnchorToken(tag.slice(LOYALTY_PRIMARY_PREFIX.length)))
    .filter(isAffiliationLoyaltyAnchor)
    .sort((left, right) => left.localeCompare(right))

  return anchors[0] ?? 'agency'
}

function collectSecondaryAnchors(tags: readonly string[]) {
  return [
    ...new Set(
      tags
        .map((tag) => normalizeToken(tag))
        .filter((tag) => tag.startsWith(DUAL_LOYALTY_PREFIX))
        .map((tag) => normalizeAnchorToken(tag.slice(DUAL_LOYALTY_PREFIX.length)))
        .filter(isAffiliationLoyaltyAnchor)
    ),
  ].sort((left, right) => left.localeCompare(right))
}

function collectEvidenceTags(tags: readonly string[]) {
  return uniqueSorted(
    tags
      .map((tag) => normalizeToken(tag))
      .filter((tag) => tag === 'dual-loyalty:restricted' || tag === 'dual-loyalty:blocked')
      .map((tag) => tag.replace('dual-loyalty:', 'dual_loyalty:'))
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
    reasonCodes: Object.freeze(['mission_dual_loyalty_team_roster']),
  })
}

export function evaluateMissionDualLoyaltyEnforcement(input: {
  readonly mission: Pick<CaseInstance, 'requiredTags'>
  readonly team: Pick<Team, 'id' | 'name' | 'tags'>
  readonly members: readonly Pick<Agent, 'tags'>[]
}): MissionDualLoyaltyEnforcementResult {
  if (!missionRequiresDualLoyaltyClearance(input.mission)) {
    return Object.freeze({
      required: false,
      allowed: true,
      decisions: Object.freeze([]),
      reasonCodes: Object.freeze([]),
    })
  }

  const tags = [...input.team.tags, ...input.members.flatMap((member) => member.tags)]
  const decision = evaluateAffiliationDualLoyaltyRisk({
    subjectId: input.team.id,
    subjectLabel: input.team.name,
    primaryAnchor: collectPrimaryAnchor(tags),
    secondaryAnchors: collectSecondaryAnchors(tags),
    evidenceTags: collectEvidenceTags(tags),
    onboardingDecision: buildClearedTeamOnboarding(input.team),
  })
  const allowed =
    decision.riskLevel === 'none' ||
    decision.riskLevel === 'watch' ||
    !decision.restrictedSurfaces.includes('mission')

  return Object.freeze({
    required: true,
    allowed,
    decisions: Object.freeze([decision]),
    reasonCodes: Object.freeze(uniqueSorted(decision.reasonCodes)),
  })
}
