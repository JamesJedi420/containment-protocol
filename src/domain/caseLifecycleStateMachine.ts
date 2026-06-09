/**
 * SPE-1310 slice 1: anomaly case lifecycle state machine.
 *
 * Pure deterministic transition graph for anomalous cases from lead intake through
 * confirmation, containment, and research-driven revision. Mirrors the compact
 * teamStateMachine pattern — no CaseInstance persistence in this slice.
 */

export type CaseLifecycleStage = 'lead' | 'confirmation' | 'containment' | 'revision'

export const CASE_LIFECYCLE_STAGES = [
  'lead',
  'confirmation',
  'containment',
  'revision',
] as const satisfies readonly CaseLifecycleStage[]

export const DEFAULT_CASE_LIFECYCLE_STAGE: CaseLifecycleStage = 'lead'

export type CaseLifecycleEvent =
  | 'credibility_review_passed'
  | 'anomaly_confirmed'
  | 'research_invalidation'
  | 'procedure_revised'

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
  },
  revision: {
    procedure_revised: 'containment',
  },
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

  return []
}

export function applyCaseLifecycleEventSequence(
  stage: CaseLifecycleStage,
  events: readonly CaseLifecycleEvent[]
): CaseLifecycleStage {
  return events.reduce(transitionCaseLifecycleStage, stage)
}
