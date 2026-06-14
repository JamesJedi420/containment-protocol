import { describe, expect, it } from 'vitest'

import {
  COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
  COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
  COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
  inferTriggerChannelsFromPropagationResistance,
  projectCognitiveHazardExposureReview,
  validateCognitiveHazardExposureRecord,
  type CognitiveHazardExposureRecord,
} from '../domain/cognitiveHazardEngine'

function baseRecord(
  overrides: Partial<CognitiveHazardExposureRecord> = {}
): CognitiveHazardExposureRecord {
  return {
    id: 'cognitive-hazard:test-base',
    label: 'Test base exposure profile',
    subjectRef: 'agent:test-subject-1',
    activeTriggerChannels: ['direct_perception'],
    fearPressure: 0.2,
    memeticExposure: 0.15,
    memoryImpairmentBand: 'intact',
    countermeasurePosture: 'none',
    ...overrides,
  }
}

describe('cognitiveHazardEngine (SPE-1309 slice 1)', () => {
  it('validates stable subject fixture and projects stable review band', () => {
    const first = validateCognitiveHazardExposureRecord(
      COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE
    )
    const second = validateCognitiveHazardExposureRecord(
      COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE
    )

    expect(first.valid).toBe(true)
    expect(first).toEqual(second)

    const projection = projectCognitiveHazardExposureReview(
      COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE
    )

    expect(projection.exposureReviewBand).toBe('stable')
    expect(projection.activeTriggerChannels).toEqual(['reference_description'])
    expect(projection.agentDutyDegraded).toBe(false)
    expect(projection.knowledgeIntegrityDegraded).toBe(false)
    expect(projection.procedureRestrictionActive).toBe(false)
  })

  it('projects memetic escalation with elevated review band and knowledge degradation', () => {
    const validation = validateCognitiveHazardExposureRecord(
      COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE
    )
    const projection = projectCognitiveHazardExposureReview(
      COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE
    )

    expect(validation.valid).toBe(true)
    expect(projection.exposureReviewBand).toBe('elevated')
    expect(projection.aggregateExposurePressure).toBe(0.71)
    expect(projection.knowledgeIntegrityDegraded).toBe(true)
    expect(projection.countermeasureShieldingActive).toBe(false)
    expect(projection.triggerChannelLabels).toEqual([
      'Direct Perception',
      'Reference Description',
    ])
  })

  it('projects failed countermeasure with critical review band and duty/procedure flags', () => {
    const validation = validateCognitiveHazardExposureRecord(
      COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE
    )
    const projection = projectCognitiveHazardExposureReview(
      COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE
    )

    expect(validation.valid).toBe(true)
    expect(
      validation.issues.some((issue) => issue.code === 'failed_countermeasure_without_refs')
    ).toBe(true)
    expect(projection.exposureReviewBand).toBe('critical')
    expect(projection.countermeasureFailed).toBe(true)
    expect(projection.agentDutyDegraded).toBe(true)
    expect(projection.knowledgeIntegrityDegraded).toBe(true)
    expect(projection.procedureRestrictionActive).toBe(true)
  })

  it('warns when erased memory band lacks explicit knowledge degradation flag', () => {
    const result = validateCognitiveHazardExposureRecord(
      baseRecord({
        memoryImpairmentBand: 'erased',
        countermeasurePosture: 'amnestic_protocol',
        countermeasureRefs: ['procedure:amnestic-cycle-1'],
      })
    )

    expect(result.valid).toBe(true)
    expect(
      result.issues.some((issue) => issue.code === 'erased_memory_without_knowledge_degradation')
    ).toBe(true)
  })

  it('rejects franchise tokens in label', () => {
    const result = validateCognitiveHazardExposureRecord(
      baseRecord({
        label: 'Foundation exposure profile',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_label')).toBe(true)
  })

  it('maps SPE-2108 propagation resistance tags onto trigger channels', () => {
    const channels = inferTriggerChannelsFromPropagationResistance([
      'forgetting',
      'retrieval_block',
      'record_decay',
    ])

    expect(channels).toEqual([
      'memory_interaction',
      'recording_mediated',
      'reference_description',
    ])
  })
})
