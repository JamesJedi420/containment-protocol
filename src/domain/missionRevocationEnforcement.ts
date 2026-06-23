import {
  AFFILIATION_REVOCATION_CAUSES,
  AFFILIATION_REVOCATION_KINDS,
  evaluateAffiliationRevocationOutcome,
  type AffiliationRevocationCause,
  type AffiliationRevocationDecision,
  type AffiliationRevocationKind,
  type AffiliationRevocationOutcomeInput,
  type AffiliationTrustOutcome,
} from './affiliationRevocationOutcomes'
import { ENTITY_WELFARE_PERMISSION_SURFACES } from './entityWelfareStatusPermissions'
import type { EntityWelfarePermissionSurface } from './entityWelfareStatusPermissions'
import type { Agent, CaseInstance, Team } from './models'

const REVOCATION_REQUIREMENT_TAG = 'revocation-clearance'
const REVOCATION_KIND_PREFIX = 'revocation-kind:'
const REVOCATION_CAUSE_PREFIX = 'revocation-cause:'
const REVOCATION_SURFACE_PREFIX = 'revocation-surface:'
const REVOCATION_TRUST_PREFIX = 'revocation-trust:'
const REVOCATION_REVIEW_PREFIX = 'revocation-review:'

const AFFILIATION_TRUST_OUTCOMES: readonly AffiliationTrustOutcome[] = [
  'trusted',
  'watch',
  'restricted',
  'probation',
  'suspended',
  'revoked',
  'blocked',
] as const

export interface MissionRevocationEnforcementResult {
  readonly required: boolean
  readonly allowed: boolean
  readonly decisions: readonly AffiliationRevocationDecision[]
  readonly reasonCodes: readonly string[]
}

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeEnumToken(value: unknown) {
  return normalizeToken(value).replaceAll('-', '_')
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.map(normalizeToken).filter((value) => value.length > 0))].sort(
    (left, right) => left.localeCompare(right)
  )
}

function isAffiliationRevocationKind(value: string): value is AffiliationRevocationKind {
  return AFFILIATION_REVOCATION_KINDS.includes(value as AffiliationRevocationKind)
}

function isAffiliationRevocationCause(value: string): value is AffiliationRevocationCause {
  return AFFILIATION_REVOCATION_CAUSES.includes(value as AffiliationRevocationCause)
}

function isEntityWelfarePermissionSurface(value: string): value is EntityWelfarePermissionSurface {
  return ENTITY_WELFARE_PERMISSION_SURFACES.includes(value as EntityWelfarePermissionSurface)
}

function isAffiliationTrustOutcome(value: string): value is AffiliationTrustOutcome {
  return AFFILIATION_TRUST_OUTCOMES.includes(value as AffiliationTrustOutcome)
}

export function missionRequiresRevocationClearance(
  mission: Pick<CaseInstance, 'requiredTags'>
): boolean {
  return mission.requiredTags.some((tag) => normalizeToken(tag) === REVOCATION_REQUIREMENT_TAG)
}

export function isMissionRevocationClearanceTag(tag: string): boolean {
  return normalizeToken(tag) === REVOCATION_REQUIREMENT_TAG
}

function collectPrefixedValues(tags: readonly string[], prefix: string) {
  return uniqueSorted(
    tags
      .map((tag) => normalizeToken(tag))
      .filter((tag) => tag.startsWith(prefix))
      .map((tag) => tag.slice(prefix.length))
  )
}

function collectRevocationKinds(tags: readonly string[]) {
  return collectPrefixedValues(tags, REVOCATION_KIND_PREFIX).map((value) =>
    normalizeEnumToken(value)
  )
}

function collectRevocationCause(tags: readonly string[]) {
  return (
    collectPrefixedValues(tags, REVOCATION_CAUSE_PREFIX)
      .map((value) => normalizeEnumToken(value))
      .find((value) => value.length > 0) ?? 'unknown'
  )
}

function collectAffectedSurfaces(tags: readonly string[]) {
  return ENTITY_WELFARE_PERMISSION_SURFACES.filter((surface) =>
    collectPrefixedValues(tags, REVOCATION_SURFACE_PREFIX)
      .map((value) => normalizeEnumToken(value))
      .filter(isEntityWelfarePermissionSurface)
      .includes(surface)
  )
}

function collectPriorTrust(tags: readonly string[]) {
  return (
    collectPrefixedValues(tags, REVOCATION_TRUST_PREFIX)
      .map((value) => normalizeEnumToken(value))
      .find(isAffiliationTrustOutcome) ?? 'watch'
  )
}

function collectReviewEvidenceRefs(tags: readonly string[]) {
  return collectPrefixedValues(tags, REVOCATION_REVIEW_PREFIX)
}

function decisionRestrictsMission(decision: AffiliationRevocationDecision) {
  return (
    decision.blockedSurfaces.includes('mission') ||
    ((decision.affectedSurfaces.includes('mission') || decision.affectedSurfaces.length === 0) &&
      decision.outcome !== 'unchanged') ||
    decision.outcome === 'suspended' ||
    decision.outcome === 'revoked' ||
    decision.outcome === 'blocked' ||
    decision.trustOutcome === 'suspended' ||
    decision.trustOutcome === 'revoked' ||
    decision.trustOutcome === 'blocked'
  )
}

export function evaluateMissionRevocationEnforcement(input: {
  readonly mission: Pick<CaseInstance, 'requiredTags'>
  readonly team: Pick<Team, 'id' | 'name' | 'tags'>
  readonly members: readonly Pick<Agent, 'tags'>[]
}): MissionRevocationEnforcementResult {
  if (!missionRequiresRevocationClearance(input.mission)) {
    return Object.freeze({
      required: false,
      allowed: true,
      decisions: Object.freeze([]),
      reasonCodes: Object.freeze([]),
    })
  }

  const tags = [...input.team.tags, ...input.members.flatMap((member) => member.tags)]
  const revocationKinds = collectRevocationKinds(tags)

  if (revocationKinds.length === 0) {
    return Object.freeze({
      required: true,
      allowed: true,
      decisions: Object.freeze([]),
      reasonCodes: Object.freeze(['no_revocation_evidence']),
    })
  }

  const cause = collectRevocationCause(tags)
  const affectedSurfaces = collectAffectedSurfaces(tags)
  const priorTrustBand = collectPriorTrust(tags)
  const reviewEvidenceRefs = collectReviewEvidenceRefs(tags)
  const decisions = revocationKinds.map((kind) =>
    evaluateAffiliationRevocationOutcome({
      subjectId: input.team.id,
      subjectLabel: input.team.name,
      kind: (isAffiliationRevocationKind(kind) ? kind : kind) as AffiliationRevocationKind,
      cause: (isAffiliationRevocationCause(cause) ? cause : cause) as AffiliationRevocationCause,
      priorTrustBand,
      affectedSurfaces,
      reviewEvidenceRefs,
    } satisfies AffiliationRevocationOutcomeInput)
  )

  return Object.freeze({
    required: true,
    allowed: decisions.every((decision) => !decisionRestrictsMission(decision)),
    decisions: Object.freeze(decisions),
    reasonCodes: Object.freeze(uniqueSorted(decisions.flatMap((decision) => decision.reasonCodes))),
  })
}
