/**
 * SPE-2898 — rule-change transition and grandfathering contract.
 *
 * Shared deterministic transition vocabulary for consequential campaign-rule
 * changes under SPE-1734. Domain systems remain authoritative for actual
 * conversion/compensation; this module returns dispositions only.
 *
 * Hard compatibility conflicts are surfaced to SPE-151 (world-law) — this
 * resolver never silently overrides grandfathering or current rules.
 */

export const RULE_CHANGE_TRANSITION_OWNER = 'SPE-2898' as const
export const RULE_CHANGE_TRANSITION_SCHEMA_VERSION = 'spe-2898.v1' as const

export const TRANSITION_POLICIES = [
  'prospective_only',
  'grandfather_existing',
  'migrate_existing',
  'revalidate_at_boundary',
  'invalidate_or_reissue',
] as const
export type TransitionPolicy = (typeof TRANSITION_POLICIES)[number]

export const COHORT_DECISIONS = [
  'pre_change',
  'post_change',
  'in_flight',
] as const
export type CohortDecision = (typeof COHORT_DECISIONS)[number]

export const TRANSITION_DISPOSITIONS = [
  'unchanged_prior_semantics',
  'apply_new_rule',
  'migrate_once',
  'await_boundary',
  'invalidate',
  'reissue',
  'compatibility_conflict',
  'domain_conversion_failed',
  'already_migrated',
] as const
export type TransitionDisposition = (typeof TRANSITION_DISPOSITIONS)[number]

export const TRANSITION_REASON_CODES = [
  'resolved',
  'missing_policy',
  'unknown_policy',
  'unknown_state_family',
  'malformed_input',
  'duplicate_declaration',
  'compatibility_conflict_routed',
  'domain_conversion_failed',
  'migration_already_applied',
] as const
export type TransitionReasonCode = (typeof TRANSITION_REASON_CODES)[number]

export interface RuleVersionRef {
  readonly ruleId: string
  readonly versionId: string
}

export interface TransitionEffectivePoint {
  /** Authoritative campaign week when the rule change takes effect. */
  readonly week: number
  readonly branchId?: string
}

export interface AffectedStateFamilyPolicy {
  readonly stateFamily: string
  readonly policy: TransitionPolicy
  /** Lifecycle boundary name for `revalidate_at_boundary` (e.g. `mission_terminal`). */
  readonly revalidationBoundary?: string
  /** Domain handler id for migrate/invalidate — never executed here. */
  readonly domainHandlerRef?: string
  /** Compatibility owner when hard conflict must be routed (typically SPE-151). */
  readonly compatibilityOwnerRef?: string
}

export interface RuleChangeTransitionDeclaration {
  readonly transitionId: string
  readonly source: RuleVersionRef
  readonly target: RuleVersionRef
  readonly effectivePoint: TransitionEffectivePoint
  readonly affectedFamilies: readonly AffectedStateFamilyPolicy[]
}

export interface TransitionSubject {
  readonly subjectId: string
  readonly stateFamily: string
  /** Week the subject was created / last committed under prior rules. */
  readonly originatedWeek: number
  readonly originatingRule: RuleVersionRef
  /** Present when subject is mid-lifecycle across the cutover. */
  readonly inFlight?: boolean
  /** Current lifecycle boundary for revalidation checks. */
  readonly currentBoundary?: string
  /** Exactly-once marker from a prior migrate/revalidate application. */
  readonly transitionMarkerId?: string
  /** Domain reports a hard compatibility conflict with current rules. */
  readonly hardCompatibilityConflict?: boolean
  /** Domain reports conversion failure for migrate_existing. */
  readonly domainConversionFailed?: boolean
}

export interface TransitionResult {
  readonly schemaVersion: typeof RULE_CHANGE_TRANSITION_SCHEMA_VERSION
  readonly owner: typeof RULE_CHANGE_TRANSITION_OWNER
  readonly transitionId: string
  readonly subjectId: string
  readonly stateFamily: string
  readonly source: RuleVersionRef
  readonly target: RuleVersionRef
  readonly cohort: CohortDecision
  readonly policy: TransitionPolicy
  readonly effectivePoint: TransitionEffectivePoint
  readonly disposition: TransitionDisposition
  readonly reasonCode: TransitionReasonCode
  readonly originatingRuleProvenance: RuleVersionRef
  readonly transitionMarkerId: string | null
  readonly domainHandlerRef: string | null
  readonly compatibilityOwnerRef: string | null
  readonly explanation: string
}

export type ResolveRuleChangeTransitionResult =
  | { readonly ok: true; readonly result: TransitionResult }
  | {
      readonly ok: false
      readonly reasonCode: TransitionReasonCode
      readonly detail: string
    }

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isTransitionPolicy(value: unknown): value is TransitionPolicy {
  return (
    typeof value === 'string' &&
    (TRANSITION_POLICIES as readonly string[]).includes(value)
  )
}

function freezeRuleVersion(ref: RuleVersionRef): RuleVersionRef {
  return Object.freeze({
    ruleId: ref.ruleId.trim(),
    versionId: ref.versionId.trim(),
  })
}

function validateRuleVersion(
  ref: RuleVersionRef | null | undefined,
  label: string
): string | null {
  if (!ref || !isNonEmptyString(ref.ruleId) || !isNonEmptyString(ref.versionId)) {
    return `${label} ruleId/versionId required`
  }
  return null
}

/**
 * Validate a transition declaration. Missing family policies are not checked
 * here — resolution fails closed when a subject family has no policy.
 */
export function validateRuleChangeTransitionDeclaration(
  declaration: RuleChangeTransitionDeclaration | null | undefined
):
  | { readonly ok: true; readonly declaration: RuleChangeTransitionDeclaration }
  | { readonly ok: false; readonly reasonCode: TransitionReasonCode; readonly detail: string } {
  if (declaration == null) {
    return { ok: false, reasonCode: 'malformed_input', detail: 'declaration required' }
  }
  if (!isNonEmptyString(declaration.transitionId)) {
    return { ok: false, reasonCode: 'malformed_input', detail: 'transitionId required' }
  }
  const sourceErr = validateRuleVersion(declaration.source, 'source')
  if (sourceErr) return { ok: false, reasonCode: 'malformed_input', detail: sourceErr }
  const targetErr = validateRuleVersion(declaration.target, 'target')
  if (targetErr) return { ok: false, reasonCode: 'malformed_input', detail: targetErr }
  if (
    typeof declaration.effectivePoint?.week !== 'number' ||
    !Number.isInteger(declaration.effectivePoint.week) ||
    declaration.effectivePoint.week < 0
  ) {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      detail: 'effectivePoint.week must be a non-negative integer',
    }
  }
  if (
    !Array.isArray(declaration.affectedFamilies) ||
    declaration.affectedFamilies.length === 0
  ) {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      detail: 'affectedFamilies required',
    }
  }
  const seen = new Set<string>()
  const families: AffectedStateFamilyPolicy[] = []
  for (const family of declaration.affectedFamilies) {
    if (!isNonEmptyString(family?.stateFamily)) {
      return {
        ok: false,
        reasonCode: 'unknown_state_family',
        detail: 'stateFamily required',
      }
    }
    const stateFamily = family.stateFamily.trim()
    if (seen.has(stateFamily)) {
      return {
        ok: false,
        reasonCode: 'duplicate_declaration',
        detail: `duplicate stateFamily ${stateFamily}`,
      }
    }
    seen.add(stateFamily)
    if (!isTransitionPolicy(family.policy)) {
      return {
        ok: false,
        reasonCode: 'unknown_policy',
        detail: String(family.policy),
      }
    }
    if (
      family.policy === 'revalidate_at_boundary' &&
      !isNonEmptyString(family.revalidationBoundary)
    ) {
      return {
        ok: false,
        reasonCode: 'malformed_input',
        detail: `revalidationBoundary required for ${stateFamily}`,
      }
    }
    families.push(
      Object.freeze({
        stateFamily,
        policy: family.policy,
        revalidationBoundary: optionalTrimmedString(family.revalidationBoundary),
        domainHandlerRef: optionalTrimmedString(family.domainHandlerRef),
        compatibilityOwnerRef:
          optionalTrimmedString(family.compatibilityOwnerRef) ?? 'SPE-151',
      })
    )
  }

  return {
    ok: true,
    declaration: Object.freeze({
      transitionId: declaration.transitionId.trim(),
      source: freezeRuleVersion(declaration.source),
      target: freezeRuleVersion(declaration.target),
      effectivePoint: Object.freeze({
        week: declaration.effectivePoint.week,
        branchId: optionalTrimmedString(declaration.effectivePoint.branchId),
      }),
      affectedFamilies: Object.freeze(families),
    }),
  }
}

function optionalTrimmedString(value: unknown): string | undefined {
  if (value == null) return undefined
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function resolveCohort(
  subject: TransitionSubject,
  effectiveWeek: number
): CohortDecision {
  // In-flight cutover only applies to subjects that originated before the
  // effective point; post-change "inFlight" flags do not rewrite cohort.
  if (subject.inFlight && subject.originatedWeek < effectiveWeek) return 'in_flight'
  if (subject.originatedWeek < effectiveWeek) return 'pre_change'
  return 'post_change'
}

function markerFor(
  transitionId: string,
  kind: 'migrate' | 'revalidate' | 'reissue' | 'invalidate',
  subjectId: string,
  boundary?: string
): string {
  const base = `${kind}:${transitionId}:${subjectId}`
  return boundary ? `${base}:${boundary}` : base
}

function dispositionFor(
  transitionId: string,
  policy: TransitionPolicy,
  cohort: CohortDecision,
  subject: TransitionSubject,
  family: AffectedStateFamilyPolicy
): {
  disposition: TransitionDisposition
  reasonCode: TransitionReasonCode
  explanation: string
  markerId: string | null
} {
  const existingMarker = optionalTrimmedString(subject.transitionMarkerId)

  if (subject.hardCompatibilityConflict) {
    return {
      disposition: 'compatibility_conflict',
      reasonCode: 'compatibility_conflict_routed',
      explanation: `Hard compatibility conflict routed to ${family.compatibilityOwnerRef ?? 'SPE-151'}`,
      markerId: existingMarker ?? null,
    }
  }

  if (policy === 'prospective_only') {
    if (cohort === 'pre_change' || cohort === 'in_flight') {
      return {
        disposition: 'unchanged_prior_semantics',
        reasonCode: 'resolved',
        explanation: 'Prospective-only: pre-change / in-flight subjects keep prior semantics',
        markerId: null,
      }
    }
    return {
      disposition: 'apply_new_rule',
      reasonCode: 'resolved',
      explanation: 'Prospective-only: post-change subjects use the new rule',
      markerId: null,
    }
  }

  if (policy === 'grandfather_existing') {
    if (cohort === 'pre_change' || cohort === 'in_flight') {
      return {
        disposition: 'unchanged_prior_semantics',
        reasonCode: 'resolved',
        explanation: 'Grandfathered: retain originating rule provenance',
        markerId: null,
      }
    }
    return {
      disposition: 'apply_new_rule',
      reasonCode: 'resolved',
      explanation: 'Post-change subjects are not grandfathered',
      markerId: null,
    }
  }

  if (policy === 'migrate_existing') {
    const expectedMarker = markerFor(transitionId, 'migrate', subject.subjectId.trim())
    if (existingMarker === expectedMarker) {
      return {
        disposition: 'already_migrated',
        reasonCode: 'migration_already_applied',
        explanation: 'Exactly-once migration marker already present',
        markerId: expectedMarker,
      }
    }
    if (subject.domainConversionFailed) {
      return {
        disposition: 'domain_conversion_failed',
        reasonCode: 'domain_conversion_failed',
        explanation: 'Domain conversion failed — no half-migrated success disposition',
        markerId: null,
      }
    }
    if (cohort === 'post_change') {
      return {
        disposition: 'apply_new_rule',
        reasonCode: 'resolved',
        explanation: 'Post-change subject already under target rule — no migration',
        markerId: null,
      }
    }
    return {
      disposition: 'migrate_once',
      reasonCode: 'resolved',
      explanation: 'Migrate exactly once via domain handler',
      markerId: expectedMarker,
    }
  }

  if (policy === 'revalidate_at_boundary') {
    if (cohort === 'post_change') {
      return {
        disposition: 'apply_new_rule',
        reasonCode: 'resolved',
        explanation: 'Post-change subjects do not revalidate under prior-rule boundary policy',
        markerId: null,
      }
    }
    const boundary = family.revalidationBoundary!
    if (subject.currentBoundary === boundary) {
      const expectedMarker = markerFor(
        transitionId,
        'revalidate',
        subject.subjectId.trim(),
        boundary
      )
      if (existingMarker === expectedMarker) {
        return {
          disposition: 'already_migrated',
          reasonCode: 'migration_already_applied',
          explanation: 'Revalidation already applied at boundary',
          markerId: expectedMarker,
        }
      }
      return {
        disposition: 'migrate_once',
        reasonCode: 'resolved',
        explanation: `Revalidate at boundary ${boundary}`,
        markerId: expectedMarker,
      }
    }
    return {
      disposition: 'await_boundary',
      reasonCode: 'resolved',
      explanation: `Waiting for boundary ${boundary} (current=${optionalTrimmedString(subject.currentBoundary) ?? 'none'})`,
      markerId: null,
    }
  }

  // invalidate_or_reissue
  if (cohort === 'post_change') {
    return {
      disposition: 'apply_new_rule',
      reasonCode: 'resolved',
      explanation: 'Post-change subjects use new rule without invalidation',
      markerId: null,
    }
  }
  if (cohort === 'in_flight') {
    const expectedMarker = markerFor(transitionId, 'reissue', subject.subjectId.trim())
    if (existingMarker === expectedMarker) {
      return {
        disposition: 'already_migrated',
        reasonCode: 'migration_already_applied',
        explanation: 'Reissue already applied for this transition',
        markerId: expectedMarker,
      }
    }
    return {
      disposition: 'reissue',
      reasonCode: 'resolved',
      explanation: 'In-flight cutover: reissue under target rule',
      markerId: expectedMarker,
    }
  }
  const invalidateMarker = markerFor(transitionId, 'invalidate', subject.subjectId.trim())
  if (existingMarker === invalidateMarker) {
    return {
      disposition: 'already_migrated',
      reasonCode: 'migration_already_applied',
      explanation: 'Invalidation already applied for this transition',
      markerId: invalidateMarker,
    }
  }
  return {
    disposition: 'invalidate',
    reasonCode: 'resolved',
    explanation: 'Invalidate pre-change subject; domain may reissue',
    markerId: invalidateMarker,
  }
}

/**
 * Resolve the transition disposition for one subject under one declaration.
 * Does not mutate domain state — returns structured disposition + marker only.
 */
export function resolveRuleChangeTransition(
  declarationInput: RuleChangeTransitionDeclaration,
  subjectInput: TransitionSubject
): ResolveRuleChangeTransitionResult {
  const validated = validateRuleChangeTransitionDeclaration(declarationInput)
  if (!validated.ok) {
    return {
      ok: false,
      reasonCode: validated.reasonCode,
      detail: validated.detail,
    }
  }
  const declaration = validated.declaration

  if (
    !isNonEmptyString(subjectInput?.subjectId) ||
    !isNonEmptyString(subjectInput?.stateFamily)
  ) {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      detail: 'subjectId and stateFamily required',
    }
  }
  if (
    typeof subjectInput.originatedWeek !== 'number' ||
    !Number.isInteger(subjectInput.originatedWeek) ||
    subjectInput.originatedWeek < 0
  ) {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      detail: 'originatedWeek must be a non-negative integer',
    }
  }
  const originErr = validateRuleVersion(subjectInput.originatingRule, 'originating')
  if (originErr) {
    return { ok: false, reasonCode: 'malformed_input', detail: originErr }
  }

  const stateFamily = subjectInput.stateFamily.trim()
  const family = declaration.affectedFamilies.find((f) => f.stateFamily === stateFamily)
  if (!family) {
    return {
      ok: false,
      reasonCode: 'missing_policy',
      detail: `no transition policy for consequential state family ${stateFamily}`,
    }
  }

  const cohort = resolveCohort(subjectInput, declaration.effectivePoint.week)
  const resolved = dispositionFor(
    declaration.transitionId,
    family.policy,
    cohort,
    subjectInput,
    family
  )

  return {
    ok: true,
    result: Object.freeze({
      schemaVersion: RULE_CHANGE_TRANSITION_SCHEMA_VERSION,
      owner: RULE_CHANGE_TRANSITION_OWNER,
      transitionId: declaration.transitionId,
      subjectId: subjectInput.subjectId.trim(),
      stateFamily,
      source: declaration.source,
      target: declaration.target,
      cohort,
      policy: family.policy,
      effectivePoint: declaration.effectivePoint,
      disposition: resolved.disposition,
      reasonCode: resolved.reasonCode,
      originatingRuleProvenance: freezeRuleVersion(subjectInput.originatingRule),
      transitionMarkerId: resolved.markerId,
      domainHandlerRef: family.domainHandlerRef ?? null,
      compatibilityOwnerRef:
        resolved.disposition === 'compatibility_conflict'
          ? (family.compatibilityOwnerRef ?? 'SPE-151')
          : null,
      explanation: resolved.explanation,
    }),
  }
}

/**
 * Serialize a transition marker for save/load — callers persist the marker id
 * on the subject; re-resolution must remain idempotent.
 */
export function serializeTransitionMarker(
  result: Pick<TransitionResult, 'transitionMarkerId' | 'disposition'>
): string | null {
  if (
    result.disposition === 'migrate_once' ||
    result.disposition === 'already_migrated' ||
    result.disposition === 'reissue' ||
    result.disposition === 'invalidate'
  ) {
    return result.transitionMarkerId
  }
  return null
}
