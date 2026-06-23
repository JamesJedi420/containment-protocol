import {
  AFFILIATION_PROTECTED_STATUSES,
  evaluateAffiliationProtectedStatusAction,
  type AffiliationProtectedActionDecision,
  type AffiliationProtectedStatus,
} from './affiliationProtectedStatusActions'
import type { Agent, CaseInstance, Team } from './models'

const PROTECTED_STATUS_REQUIREMENT_TAG = 'protected-status-clearance'
const PROTECTED_STATUS_PREFIX = 'protected-status:'
const PROTECTED_REVIEW_PREFIX = 'protected-review:'

export interface MissionProtectedStatusEnforcementResult {
  readonly required: boolean
  readonly allowed: boolean
  readonly decisions: readonly AffiliationProtectedActionDecision[]
  readonly reasonCodes: readonly string[]
}

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeStatusToken(value: unknown) {
  return normalizeToken(value).replaceAll('-', '_')
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.map(normalizeToken).filter((value) => value.length > 0))].sort(
    (left, right) => left.localeCompare(right)
  )
}

function isAffiliationProtectedStatus(value: string): value is AffiliationProtectedStatus {
  return AFFILIATION_PROTECTED_STATUSES.includes(value as AffiliationProtectedStatus)
}

export function missionRequiresProtectedStatusClearance(
  mission: Pick<CaseInstance, 'requiredTags'>
): boolean {
  return mission.requiredTags.some(
    (tag) => normalizeToken(tag) === PROTECTED_STATUS_REQUIREMENT_TAG
  )
}

export function isMissionProtectedStatusClearanceTag(tag: string): boolean {
  return normalizeToken(tag) === PROTECTED_STATUS_REQUIREMENT_TAG
}

function collectProtectedStatuses(tags: readonly string[]) {
  return [
    ...new Set(
      tags
        .map((tag) => normalizeToken(tag))
        .filter((tag) => tag.startsWith(PROTECTED_STATUS_PREFIX))
        .map((tag) => normalizeStatusToken(tag.slice(PROTECTED_STATUS_PREFIX.length)))
        .filter(isAffiliationProtectedStatus)
    ),
  ].sort((left, right) => left.localeCompare(right))
}

function collectReviewEvidenceRefs(tags: readonly string[]) {
  return uniqueSorted(
    tags
      .map((tag) => normalizeToken(tag))
      .filter((tag) => tag.startsWith(PROTECTED_REVIEW_PREFIX))
      .map((tag) => tag.slice(PROTECTED_REVIEW_PREFIX.length))
  )
}

export function evaluateMissionProtectedStatusEnforcement(input: {
  readonly mission: Pick<CaseInstance, 'requiredTags'>
  readonly team: Pick<Team, 'id' | 'name' | 'tags'>
  readonly members: readonly Pick<Agent, 'tags'>[]
}): MissionProtectedStatusEnforcementResult {
  if (!missionRequiresProtectedStatusClearance(input.mission)) {
    return Object.freeze({
      required: false,
      allowed: true,
      decisions: Object.freeze([]),
      reasonCodes: Object.freeze([]),
    })
  }

  const tags = [...input.team.tags, ...input.members.flatMap((member) => member.tags)]
  const statuses = collectProtectedStatuses(tags)
  const reviewEvidenceRefs = collectReviewEvidenceRefs(tags)
  const hasFlag = (flag: string) => tags.some((tag) => normalizeToken(tag) === flag)
  const candidateStatuses = statuses.length > 0 ? statuses : (['unknown'] as const)
  const decisions = candidateStatuses.map((protectedStatus) =>
    evaluateAffiliationProtectedStatusAction({
      subjectId: input.team.id,
      subjectLabel: input.team.name,
      protectedStatus,
      action: 'assign_mission',
      minor: hasFlag('protected-minor'),
      medicalHold: hasFlag('protected-medical-hold'),
      careDutyActive: hasFlag('protected-care-duty-active'),
      dueProcessRequired: hasFlag('protected-due-process-required'),
      reviewEvidenceRefs,
    })
  )

  return Object.freeze({
    required: true,
    allowed: decisions.every((decision) => decision.outcome === 'allowed'),
    decisions: Object.freeze(decisions),
    reasonCodes: Object.freeze(uniqueSorted(decisions.flatMap((decision) => decision.reasonCodes))),
  })
}
