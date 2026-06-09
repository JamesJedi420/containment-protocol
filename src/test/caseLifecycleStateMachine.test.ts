import { describe, expect, it } from 'vitest'
import {
  CASE_LIFECYCLE_STAGES,
  CASE_LIFECYCLE_TRANSITIONS,
  DEFAULT_CASE_LIFECYCLE_STAGE,
  applyCaseLifecycleEventSequence,
  getCaseLifecycleEventSequence,
  isValidCaseLifecycleTransition,
  transitionCaseLifecycleStage,
} from '../domain/caseLifecycleStateMachine'

describe('caseLifecycleStateMachine', () => {
  it('defines the four core simulation stages', () => {
    expect(CASE_LIFECYCLE_STAGES).toEqual(['lead', 'confirmation', 'containment', 'revision'])
    expect(DEFAULT_CASE_LIFECYCLE_STAGE).toBe('lead')
  })

  it('defines the compact lead-through-containment transition graph', () => {
    expect(CASE_LIFECYCLE_TRANSITIONS.lead.credibility_review_passed).toBe('confirmation')
    expect(CASE_LIFECYCLE_TRANSITIONS.confirmation.anomaly_confirmed).toBe('containment')
    expect(CASE_LIFECYCLE_TRANSITIONS.containment.research_invalidation).toBe('revision')
    expect(CASE_LIFECYCLE_TRANSITIONS.revision.procedure_revised).toBe('containment')
  })

  it('rejects invalid transitions by preserving the current stage', () => {
    expect(transitionCaseLifecycleStage('lead', 'anomaly_confirmed')).toBe('lead')
    expect(transitionCaseLifecycleStage('confirmation', 'research_invalidation')).toBe('confirmation')
    expect(isValidCaseLifecycleTransition('lead', 'procedure_revised')).toBe(false)
  })

  it('emits the expected event sequence from lead to containment', () => {
    expect(getCaseLifecycleEventSequence('lead', 'containment')).toEqual([
      'credibility_review_passed',
      'anomaly_confirmed',
    ])
  })

  it('emits the research invalidation loop between containment and revision', () => {
    expect(getCaseLifecycleEventSequence('containment', 'revision')).toEqual(['research_invalidation'])
    expect(getCaseLifecycleEventSequence('revision', 'containment')).toEqual(['procedure_revised'])
  })

  it('applies transitions deterministically one event at a time', () => {
    const stage = applyCaseLifecycleEventSequence('lead', [
      'credibility_review_passed',
      'anomaly_confirmed',
      'research_invalidation',
    ])

    expect(stage).toBe('revision')
  })

  it('returns to containment after procedure revision', () => {
    const stage = applyCaseLifecycleEventSequence('revision', ['procedure_revised'])

    expect(stage).toBe('containment')
  })
})
