import { describe, expect, it } from 'vitest'
import {
  CASE_LIFECYCLE_INSTITUTIONAL_LABELS,
  CASE_LIFECYCLE_STAGES,
  CASE_LIFECYCLE_TRANSITIONS,
  DEFAULT_CASE_LIFECYCLE_INSTITUTIONAL_LABEL,
  DEFAULT_CASE_LIFECYCLE_STAGE,
  applyCaseLifecycleEventSequence,
  getCaseLifecycleEventSequence,
  isValidCaseLifecycleTransition,
  projectLifecycleInstitutionalLabel,
  transitionCaseLifecycleStage,
} from '../domain/caseLifecycleStateMachine'

describe('caseLifecycleStateMachine', () => {
  it('defines the core simulation stages including presumed_neutralized disposition', () => {
    expect(CASE_LIFECYCLE_STAGES).toEqual([
      'lead',
      'confirmation',
      'containment',
      'revision',
      'presumed_neutralized',
    ])
    expect(DEFAULT_CASE_LIFECYCLE_STAGE).toBe('lead')
  })

  it('defines the compact lead-through-containment transition graph', () => {
    expect(CASE_LIFECYCLE_TRANSITIONS.lead.credibility_review_passed).toBe('confirmation')
    expect(CASE_LIFECYCLE_TRANSITIONS.confirmation.anomaly_confirmed).toBe('containment')
    expect(CASE_LIFECYCLE_TRANSITIONS.containment.research_invalidation).toBe('revision')
    expect(CASE_LIFECYCLE_TRANSITIONS.revision.procedure_revised).toBe('containment')
    expect(CASE_LIFECYCLE_TRANSITIONS.containment.presumed_neutralized_entered).toBe(
      'presumed_neutralized'
    )
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

  it('enters presumed_neutralized from containment on disposition event', () => {
    expect(getCaseLifecycleEventSequence('containment', 'presumed_neutralized')).toEqual([
      'presumed_neutralized_entered',
    ])
    expect(
      applyCaseLifecycleEventSequence('containment', ['presumed_neutralized_entered'])
    ).toBe('presumed_neutralized')
  })

  it('defines institutional labels distinct from lifecycle stages and policy tiers', () => {
    expect(CASE_LIFECYCLE_INSTITUTIONAL_LABELS).toEqual([
      'preliminary_intake',
      'credibility_screening',
      'active_anomaly_file',
      'procedure_revision_hold',
      'presumed_clear_surveillance_obligations',
    ])
    expect(DEFAULT_CASE_LIFECYCLE_INSTITUTIONAL_LABEL).toBe('preliminary_intake')
  })

  it('projectLifecycleInstitutionalLabel maps disposition without using policy tier', () => {
    expect(projectLifecycleInstitutionalLabel({ lifecycleStage: 'lead' })).toBe('preliminary_intake')
    expect(projectLifecycleInstitutionalLabel({ lifecycleStage: 'confirmation' })).toBe(
      'credibility_screening'
    )
    expect(projectLifecycleInstitutionalLabel({ lifecycleStage: 'containment' })).toBe(
      'active_anomaly_file'
    )
    expect(projectLifecycleInstitutionalLabel({ lifecycleStage: 'revision' })).toBe(
      'procedure_revision_hold'
    )
    expect(projectLifecycleInstitutionalLabel({ lifecycleStage: 'presumed_neutralized' })).toBe(
      'presumed_clear_surveillance_obligations'
    )
    expect(projectLifecycleInstitutionalLabel({ lifecycleStage: undefined })).toBeUndefined()
  })
})
