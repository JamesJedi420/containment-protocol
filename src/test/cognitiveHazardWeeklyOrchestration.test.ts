import { describe, expect, it } from 'vitest'

import {
  COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
  COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
  COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
  projectCognitiveHazardExposureReview,
  type CognitiveHazardExposureRecord,
} from '../domain/cognitiveHazardEngine'
import {
  advanceCognitiveHazardExposureRecordForWeek,
  applyWeeklyCognitiveHazardExposureTick,
  mergePropagationResistanceTriggerChannels,
  resolveTargetMemoryImpairmentBandFromProjection,
} from '../domain/cognitiveHazardWeeklyOrchestration'

function baseRecord(
  overrides: Partial<CognitiveHazardExposureRecord> = {}
): CognitiveHazardExposureRecord {
  return {
    id: 'cognitive-hazard:weekly-orchestration-test',
    label: 'Weekly orchestration test exposure profile',
    subjectRef: 'agent:weekly-orchestration-test',
    activeTriggerChannels: ['direct_perception'],
    fearPressure: 0.2,
    memeticExposure: 0.15,
    memoryImpairmentBand: 'intact',
    countermeasurePosture: 'none',
    ...overrides,
  }
}

describe('cognitiveHazardWeeklyOrchestration (SPE-1309 slice 3)', () => {
  it('is a no-op for an empty map without throwing', () => {
    expect(applyWeeklyCognitiveHazardExposureTick({}, 4)).toEqual({})
    expect(applyWeeklyCognitiveHazardExposureTick(undefined, 4)).toEqual({})
  })

  it('keeps stable subject fixture unchanged when exposure remains low', () => {
    const advanced = advanceCognitiveHazardExposureRecordForWeek(
      COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
      2
    )

    expect(advanced).toBe(COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE)
    expect(advanced.memoryImpairmentBand).toBe('intact')
    expect(advanced.knowledgeIntegrityDegraded).toBeUndefined()
    expect(advanced.agentDutyDegraded).toBeUndefined()
  })

  it('escalates memetic escalation fixture from fragmented to compromised while preserving subject ref', () => {
    const projection = projectCognitiveHazardExposureReview(
      COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE
    )

    expect(
      resolveTargetMemoryImpairmentBandFromProjection(
        COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
        projection
      )
    ).toBe('compromised')

    const advanced = advanceCognitiveHazardExposureRecordForWeek(
      COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
      2
    )

    expect(advanced).not.toBe(COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE)
    expect(advanced.memoryImpairmentBand).toBe('compromised')
    expect(advanced.knowledgeIntegrityDegraded).toBe(true)
    expect(advanced.agentDutyDegraded).toBe(true)
    expect(advanced.subjectRef).toBe(COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.subjectRef)
    expect(advanced.countermeasurePosture).toBe('mnestic_reinforcement')
  })

  it('keeps failed countermeasure fixture idempotent at erased', () => {
    const advanced = advanceCognitiveHazardExposureRecordForWeek(
      COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
      2
    )

    expect(advanced).toBe(COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE)
    expect(advanced.memoryImpairmentBand).toBe('erased')
    expect(advanced.agentDutyDegraded).toBe(true)
    expect(advanced.procedureRestrictionActive).toBe(true)
  })

  it('escalates intact records when exposure review band is elevated', () => {
    const record = baseRecord({
      id: 'cognitive-hazard:fragmented-escalation',
      fearPressure: 0.62,
      memeticExposure: 0.48,
    })
    const projection = projectCognitiveHazardExposureReview(record)

    expect(resolveTargetMemoryImpairmentBandFromProjection(record, projection)).toBe('fragmented')

    const advanced = advanceCognitiveHazardExposureRecordForWeek(record, 2)

    expect(advanced.memoryImpairmentBand).toBe('fragmented')
    expect(advanced.knowledgeIntegrityDegraded).toBe(true)
    expect(advanced.agentDutyDegraded).toBeUndefined()
  })

  it('merges sibling propagation-resistance tags into active trigger channels', () => {
    const record = baseRecord({
      activeTriggerChannels: ['reference_description'],
    })

    const merged = mergePropagationResistanceTriggerChannels(record, [
      'forgetting',
      'record_decay',
    ])

    expect(merged).toBeDefined()
    expect(merged?.activeTriggerChannels).toEqual([
      'memory_interaction',
      'recording_mediated',
      'reference_description',
    ])
  })

  it('is idempotent when re-applied after advance', () => {
    const first = advanceCognitiveHazardExposureRecordForWeek(
      COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
      2
    )
    const second = advanceCognitiveHazardExposureRecordForWeek(first, 2)

    expect(second).toBe(first)
    expect(
      applyWeeklyCognitiveHazardExposureTick(
        { [COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.id]: first },
        2
      )
    ).toEqual({
      [COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.id]: first,
    })
  })

  it('preserves source record when post-tick candidate fails validation', () => {
    const record = baseRecord({
      id: '',
      fearPressure: 0.72,
      memeticExposure: 0.61,
    })

    const advanced = advanceCognitiveHazardExposureRecordForWeek(record, 2)

    expect(advanced).toBe(record)
  })
})
