import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
  COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
  COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
  type CognitiveHazardExposureRecord,
} from '../../domain/cognitiveHazardEngine'
import {
  formatCognitiveHazardEnumLabel,
  getCognitiveHazardExposureMirrorView,
} from './cognitiveHazardExposureMirrorView'

describe('cognitiveHazardExposureMirrorView (SPE-1309 slice 6)', () => {
  it('returns empty mirror when cognitiveHazardExposureRecords map is empty', () => {
    const game = createStartingState()

    expect(game.cognitiveHazardExposureRecords).toEqual({})

    const view = getCognitiveHazardExposureMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.summary.simulationTriggerSubjectCount).toBe(0)
    expect(view.records).toEqual([])
  })

  it('mirrors projection labels and simulation trigger chips without raw record fields', () => {
    const game = createStartingState()
    game.cognitiveHazardExposureRecords = {
      [COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.id]:
        COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
      [COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE.id]: COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
    }

    const view = getCognitiveHazardExposureMirrorView(game)
    const escalation = view.records.find(
      (record) => record.id === COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.id
    )
    const stable = view.records.find(
      (record) => record.id === COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE.id
    )

    expect(view.isEmpty).toBe(false)
    expect(view.summary.totalRecords).toBe(2)
    expect(view.summary.elevatedExposureCount).toBe(1)
    expect(view.summary.simulationTriggerSubjectCount).toBe(1)
    expect(view.records.map((record) => record.id)).toEqual([
      COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.id,
      COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE.id,
    ])
    expect(escalation?.subjectRefLabel).toBe(
      COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.subjectRef
    )
    expect(escalation?.triggerChannelLabels).toEqual(['Direct Perception', 'Reference Description'])
    expect(escalation?.fearPressureLabel).toBe('0.58')
    expect(escalation?.memeticExposureLabel).toBe('0.71')
    expect(escalation?.exposureReviewBandLabel).toBe('Elevated')
    expect(escalation?.knowledgeIntegrityDegradedLabel).toBe('Yes')
    expect(escalation?.simulationTriggerKindLabels).toEqual(['Knowledge integrity degraded'])
    expect(escalation?.summaryLabel).toBe('—')
    expect(stable?.simulationTriggerKindLabels).toEqual([])
    expect(stable?.exposureReviewBandLabel).toBe('Stable')
  })

  it('shows safe placeholders for redacted unit scores and summary', () => {
    const redactedRecord: CognitiveHazardExposureRecord = Object.freeze({
      ...COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
      summary: 'Hidden narrative that must not surface in mirror.',
      redactedFields: Object.freeze([
        'summary',
        'fearPressure',
        'memeticExposure',
        'confidence',
      ] as const),
    })
    const game = createStartingState()
    game.cognitiveHazardExposureRecords = {
      [redactedRecord.id]: redactedRecord,
    }

    const view = getCognitiveHazardExposureMirrorView(game)
    const record = view.records[0]

    expect(record?.summaryLabel).toBe('[Redacted]')
    expect(record?.fearPressureLabel).toBe('—')
    expect(record?.memeticExposureLabel).toBe('—')
    expect(record?.confidenceLabel).toBe('—')
    expect(record?.redacted).toBe(true)
    expect(JSON.stringify(record)).not.toContain('Hidden narrative')
  })

  it('mirrors failed countermeasure effect flags and trigger kinds', () => {
    const game = createStartingState()
    game.cognitiveHazardExposureRecords = {
      [COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE.id]:
        COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
    }

    const view = getCognitiveHazardExposureMirrorView(game)
    const record = view.records[0]

    expect(view.summary.countermeasureFailedCount).toBe(1)
    expect(record?.countermeasureFailedLabel).toBe('Yes')
    expect(record?.agentDutyDegradedLabel).toBe('Yes')
    expect(record?.procedureRestrictionActiveLabel).toBe('Yes')
    expect(record?.simulationTriggerKindLabels).toEqual([
      'Agent duty degraded',
      'Knowledge integrity degraded',
      'Procedure restriction active',
    ])
    expect(record?.exposureReviewBandLabel).toBe('Critical')
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatCognitiveHazardEnumLabel('memory_interaction')).toBe('Memory Interaction')
    expect(formatCognitiveHazardEnumLabel('procedure_restricted')).toBe('Procedure Restricted')
  })

  it('is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.cognitiveHazardExposureRecords = {
      [COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.id]:
        COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
    }

    const first = JSON.stringify(getCognitiveHazardExposureMirrorView(game))
    const second = JSON.stringify(getCognitiveHazardExposureMirrorView(game))

    expect(first).toBe(second)
  })
})
