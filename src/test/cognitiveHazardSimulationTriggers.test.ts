import { describe, expect, it } from 'vitest'

import {
  COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
  COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
  COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
  type CognitiveHazardExposureRecord,
} from '../domain/cognitiveHazardEngine'
import {
  composeCognitiveHazardSimulationTriggerSubjectSummaries,
  listCognitiveHazardSimulationTriggersForSubjectRef,
  resolveCognitiveHazardSimulationTriggerForRecord,
  resolveCognitiveHazardSimulationTriggers,
  shouldEmitCognitiveHazardSimulationTrigger,
} from '../domain/cognitiveHazardSimulationTriggers'
import { buildWeeklyCognitiveHazardSimulationTriggerReportNotes } from '../domain/cognitiveHazardSimulationTriggerWeeklyReportNotes'

function baseRecord(
  overrides: Partial<CognitiveHazardExposureRecord> = {}
): CognitiveHazardExposureRecord {
  return {
    id: 'cognitive-hazard:simulation-trigger-test',
    label: 'Simulation trigger test exposure profile',
    subjectRef: 'agent:simulation-trigger-test',
    activeTriggerChannels: ['direct_perception'],
    fearPressure: 0.2,
    memeticExposure: 0.15,
    memoryImpairmentBand: 'intact',
    countermeasurePosture: 'none',
    ...overrides,
  }
}

describe('cognitiveHazardSimulationTriggers (SPE-1309 slice 5)', () => {
  it('is a no-op for an empty exposure map without throwing', () => {
    expect(resolveCognitiveHazardSimulationTriggers({})).toEqual([])
    expect(resolveCognitiveHazardSimulationTriggers(undefined)).toEqual([])
    expect(composeCognitiveHazardSimulationTriggerSubjectSummaries({})).toEqual([])
  })

  it('does not trigger stable subject fixture without effect flags', () => {
    expect(
      resolveCognitiveHazardSimulationTriggerForRecord(
        COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
        undefined
      )
    ).toBeNull()
  })

  it('resolves knowledge triggers for memetic escalation fixture before weekly band advance', () => {
    const trigger = resolveCognitiveHazardSimulationTriggerForRecord(
      COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
      undefined
    )

    expect(trigger).not.toBeNull()
    expect(trigger?.triggerKinds).toEqual(['knowledge_integrity_degraded'])
    expect(trigger?.activeTriggerChannels).toEqual([
      'direct_perception',
      'reference_description',
    ])
  })

  it('does not re-trigger terminal erased records when prior posture was already erased', () => {
    expect(
      shouldEmitCognitiveHazardSimulationTrigger(
        COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
        COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
        ['agent_duty_degraded', 'knowledge_integrity_degraded', 'procedure_restriction_active']
      )
    ).toBe(false)

    expect(
      resolveCognitiveHazardSimulationTriggerForRecord(
        COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
        COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE
      )
    ).toBeNull()
  })

  it('emits failed countermeasure triggers on first week when prior record is absent', () => {
    const trigger = resolveCognitiveHazardSimulationTriggerForRecord(
      COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE,
      undefined
    )

    expect(trigger?.triggerKinds).toEqual([
      'agent_duty_degraded',
      'knowledge_integrity_degraded',
      'procedure_restriction_active',
    ])
  })

  it('groups multiple records for one subject with deterministic ordering', () => {
    const sharedSubjectRef = 'agent:shared-subject-1'
    const first = baseRecord({
      id: 'cognitive-hazard:shared-b',
      subjectRef: sharedSubjectRef,
      memoryImpairmentBand: 'fragmented',
      knowledgeIntegrityDegraded: true,
      activeTriggerChannels: ['reference_description'],
      fearPressure: 0.62,
      memeticExposure: 0.48,
    })
    const second = baseRecord({
      id: 'cognitive-hazard:shared-a',
      subjectRef: sharedSubjectRef,
      memoryImpairmentBand: 'compromised',
      knowledgeIntegrityDegraded: true,
      agentDutyDegraded: true,
      activeTriggerChannels: ['direct_perception', 'memory_interaction'],
      countermeasurePosture: 'procedure_restricted',
      procedureRestrictionActive: true,
      fearPressure: 0.72,
      memeticExposure: 0.81,
    })

    const summaries = composeCognitiveHazardSimulationTriggerSubjectSummaries({
      [first.id]: first,
      [second.id]: second,
    })

    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.subjectRef).toBe(sharedSubjectRef)
    expect(summaries[0]?.recordIds).toEqual([
      'cognitive-hazard:shared-a',
      'cognitive-hazard:shared-b',
    ])
    expect(summaries[0]?.triggerKinds).toEqual([
      'agent_duty_degraded',
      'knowledge_integrity_degraded',
      'procedure_restriction_active',
    ])
  })

  it('lists triggers for subject refs with namespace overlap', () => {
    const record = baseRecord({
      subjectRef: 'agent:field-analyst-7',
      memoryImpairmentBand: 'fragmented',
      knowledgeIntegrityDegraded: true,
      activeTriggerChannels: ['reference_description'],
      fearPressure: 0.62,
      memeticExposure: 0.48,
    })

    const triggers = listCognitiveHazardSimulationTriggersForSubjectRef(
      { [record.id]: record },
      'field-analyst-7'
    )

    expect(triggers).toHaveLength(1)
    expect(triggers[0]?.recordId).toBe(record.id)
  })

  it('builds deterministic weekly report notes from trigger summaries', () => {
    const notes = buildWeeklyCognitiveHazardSimulationTriggerReportNotes({
      nextRecords: {
        [COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.id]:
          COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
      },
      week: 2,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('cognitive_hazard.simulation_trigger')
    expect(notes[0]?.content).toContain('Cognitive hazard simulation trigger')
    expect(notes[0]?.content).toContain('Knowledge integrity degraded')
  })

  it('skips records with effect flags but no active trigger channels', () => {
    const record = baseRecord({
      knowledgeIntegrityDegraded: true,
      activeTriggerChannels: [],
    })

    expect(resolveCognitiveHazardSimulationTriggerForRecord(record, undefined)).toBeNull()
  })
})
