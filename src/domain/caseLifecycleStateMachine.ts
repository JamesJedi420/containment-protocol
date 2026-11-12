/**
 * SPE-1310 slice 1: anomaly case lifecycle state machine.
 *
 * Pure deterministic transition graph for anomalous cases from lead intake through
 * confirmation, containment, and research-driven revision. Mirrors the compact
 * teamStateMachine pattern — no CaseInstance persistence in this slice.
 */

export type CaseLifecycleStage =
  | 'lead'
  | 'confirmation'
  | 'containment'
  | 'revision'
  | 'presumed_neutralized'

export const CASE_LIFECYCLE_STAGES = [
  'lead',
  'confirmation',
  'containment',
  'revision',
  'presumed_neutralized',
] as const satisfies readonly CaseLifecycleStage[]

/** Weeks after disposition entry before the next surveillance obligation is due. */
export const PRESUMED_NEUTRALIZED_SURVEILLANCE_INTERVAL_WEEKS = 4

/** Weeks after disposition entry before breach-readiness review is due. */
export const PRESUMED_NEUTRALIZED_BREACH_READINESS_INTERVAL_WEEKS = 8

export type ContainmentPolicyTier = 'standard' | 'elevated' | 'critical'

export const CONTAINMENT_POLICY_TIERS = [
  'standard',
  'elevated',
  'critical',
] as const satisfies readonly ContainmentPolicyTier[]

const CONTAINMENT_POLICY_TIER_RANK: Readonly<Record<ContainmentPolicyTier, number>> = {
  standard: 0,
  elevated: 1,
  critical: 2,
}

export function upgradeContainmentPolicyTier(
  tier: ContainmentPolicyTier | undefined
): ContainmentPolicyTier {
  const current = tier ?? 'standard'
  if (current === 'standard') {
    return 'elevated'
  }

  if (current === 'elevated') {
    return 'critical'
  }

  return 'critical'
}

export function isContainmentPolicyTier(value: unknown): value is ContainmentPolicyTier {
  return typeof value === 'string' && (CONTAINMENT_POLICY_TIERS as readonly string[]).includes(value)
}

export function containmentPolicyTierRank(tier: ContainmentPolicyTier | undefined): number {
  return CONTAINMENT_POLICY_TIER_RANK[tier ?? 'standard']
}

export const DEFAULT_CASE_LIFECYCLE_STAGE: CaseLifecycleStage = 'lead'

/**
 * SPE-1310 slice 6: institutional filing classification — official case copy
 * distinct from operational `containmentPolicyTier` and simulation `lifecycleStage`.
 */
export type CaseLifecycleInstitutionalLabel =
  | 'preliminary_intake'
  | 'credibility_screening'
  | 'active_anomaly_file'
  | 'procedure_revision_hold'
  | 'presumed_clear_surveillance_obligations'

export const CASE_LIFECYCLE_INSTITUTIONAL_LABELS = [
  'preliminary_intake',
  'credibility_screening',
  'active_anomaly_file',
  'procedure_revision_hold',
  'presumed_clear_surveillance_obligations',
] as const satisfies readonly CaseLifecycleInstitutionalLabel[]

export const DEFAULT_CASE_LIFECYCLE_INSTITUTIONAL_LABEL: CaseLifecycleInstitutionalLabel =
  'preliminary_intake'

const CASE_LIFECYCLE_STAGE_INSTITUTIONAL_LABEL: Readonly<
  Record<CaseLifecycleStage, CaseLifecycleInstitutionalLabel>
> = {
  lead: 'preliminary_intake',
  confirmation: 'credibility_screening',
  containment: 'active_anomaly_file',
  revision: 'procedure_revision_hold',
  presumed_neutralized: 'presumed_clear_surveillance_obligations',
}

export function isCaseLifecycleInstitutionalLabel(
  value: unknown
): value is CaseLifecycleInstitutionalLabel {
  return (
    typeof value === 'string' &&
    (CASE_LIFECYCLE_INSTITUTIONAL_LABELS as readonly string[]).includes(value)
  )
}

export function formatCaseLifecycleInstitutionalLabel(
  label: CaseLifecycleInstitutionalLabel
): string {
  return label
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

/**
 * Projects institutional classification from lifecycle disposition only.
 * Operational `containmentPolicyTier` does not influence institutional copy.
 */
export function projectLifecycleInstitutionalLabel(input: {
  readonly lifecycleStage?: CaseLifecycleStage
}): CaseLifecycleInstitutionalLabel | undefined {
  const stage = input.lifecycleStage
  if (stage === undefined) {
    return undefined
  }

  return CASE_LIFECYCLE_STAGE_INSTITUTIONAL_LABEL[stage]
}

export type CaseLifecycleEvent =
  | 'credibility_review_passed'
  | 'anomaly_confirmed'
  | 'research_invalidation'
  | 'procedure_revised'
  | 'presumed_neutralized_entered'

export const CASE_LIFECYCLE_TRANSITIONS: Record<
  CaseLifecycleStage,
  Partial<Record<CaseLifecycleEvent, CaseLifecycleStage>>
> = {
  lead: {
    credibility_review_passed: 'confirmation',
  },
  confirmation: {
    anomaly_confirmed: 'containment',
  },
  containment: {
    research_invalidation: 'revision',
    presumed_neutralized_entered: 'presumed_neutralized',
  },
  revision: {
    procedure_revised: 'containment',
  },
  presumed_neutralized: {},
}

export function transitionCaseLifecycleStage(
  stage: CaseLifecycleStage,
  event: CaseLifecycleEvent
): CaseLifecycleStage {
  return CASE_LIFECYCLE_TRANSITIONS[stage][event] ?? stage
}

export function isValidCaseLifecycleTransition(
  stage: CaseLifecycleStage,
  event: CaseLifecycleEvent
): boolean {
  return CASE_LIFECYCLE_TRANSITIONS[stage][event] !== undefined
}

export function getCaseLifecycleEventSequence(
  currentStage: CaseLifecycleStage,
  targetStage: CaseLifecycleStage
): CaseLifecycleEvent[] {
  if (currentStage === targetStage) {
    return []
  }

  if (targetStage === 'confirmation') {
    if (currentStage === 'lead') {
      return ['credibility_review_passed']
    }
  }

  if (targetStage === 'containment') {
    if (currentStage === 'lead') {
      return ['credibility_review_passed', 'anomaly_confirmed']
    }

    if (currentStage === 'confirmation') {
      return ['anomaly_confirmed']
    }

    if (currentStage === 'revision') {
      return ['procedure_revised']
    }
  }

  if (targetStage === 'revision') {
    if (currentStage === 'lead') {
      return ['credibility_review_passed', 'anomaly_confirmed', 'research_invalidation']
    }

    if (currentStage === 'confirmation') {
      return ['anomaly_confirmed', 'research_invalidation']
    }

    if (currentStage === 'containment') {
      return ['research_invalidation']
    }
  }

  if (targetStage === 'presumed_neutralized') {
    if (currentStage === 'containment') {
      return ['presumed_neutralized_entered']
    }
  }

  return []
}

export function applyCaseLifecycleEventSequence(
  stage: CaseLifecycleStage,
  events: readonly CaseLifecycleEvent[]
): CaseLifecycleStage {
  return events.reduce(transitionCaseLifecycleStage, stage)
}
