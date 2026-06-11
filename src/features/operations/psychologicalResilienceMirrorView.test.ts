import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE,
  PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
  PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE,
  projectPsychologicalResilienceReview,
  validatePsychologicalResilienceRecord,
  type PsychologicalResilienceRecord,
} from '../../domain/psychologicalResilienceRegistry'
import {
  formatPsychologicalResilienceEnumLabel,
  getPsychologicalResilienceMirrorView,
} from './psychologicalResilienceMirrorView'

function warningOnlyRecord(): PsychologicalResilienceRecord {
  return {
    id: 'psych-resilience:breakdown-warning-only',
    label: 'Breakdown without treatment flag',
    operatorRef: 'agent:field-operator-99',
    depletionBand: 'breakdown',
    exposureScore: 0.88,
    exposureEventCount: 6,
    recoveryChannel: 'treatment_required',
    treatmentRequired: false,
    restRecoverable: false,
  }
}

function redactedExposureRecord(): PsychologicalResilienceRecord {
  return {
    id: 'psych-resilience:redacted-exposure',
    label: 'Redacted exposure score profile',
    operatorRef: 'agent:analyst-operator-5',
    depletionBand: 'strained',
    exposureScore: 0.55,
    exposureEventCount: 3,
    recoveryChannel: 'counseling_recommended',
    treatmentRequired: false,
    restRecoverable: true,
    redactedFields: ['exposureScore'],
    confidence: 0.62,
  }
}

describe('psychologicalResilienceMirrorView (SPE-1615 slice 5)', () => {
  it('returns empty mirror when psychologicalResilienceRecords map is empty', () => {
    const game = createStartingState()

    expect(game.psychologicalResilienceRecords).toEqual({})

    const view = getPsychologicalResilienceMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.records).toEqual([])
  })

  it('mirrors depletion band, exposure posture, and recovery channel from hydrated records', () => {
    const game = createStartingState()
    game.psychologicalResilienceRecords = {
      [PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE,
    }

    const view = getPsychologicalResilienceMirrorView(game)
    const record = view.records[0]
    const projection = projectPsychologicalResilienceReview(
      PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE
    )

    expect(view.isEmpty).toBe(false)
    expect(record?.depletionBandLabel).toBe('Stable')
    expect(record?.exposureScoreLabel).toBe(projection.exposureScore?.toFixed(2))
    expect(record?.exposureElevatedLabel).toBe('—')
    expect(record?.treatmentGatedLabel).toBe('—')
    expect(record?.exposureSourceLabels).toEqual(['Impossible Evidence'])
  })

  it('shows exposure elevated and treatment gated projection labels for staged and breakdown fixtures', () => {
    const game = createStartingState()
    game.psychologicalResilienceRecords = {
      [PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
      [PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE,
    }

    const view = getPsychologicalResilienceMirrorView(game)
    const stagedRecord = view.records.find(
      (record) => record.id === PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id
    )
    const breakdownRecord = view.records.find(
      (record) => record.id === PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE.id
    )

    expect(view.summary.exposureElevatedCount).toBe(2)
    expect(view.summary.treatmentGatedCount).toBe(1)
    expect(view.summary.depletionAdvancedCount).toBe(2)
    expect(view.summary.dutyReliabilityDegradedCount).toBe(2)
    expect(stagedRecord?.exposureElevatedLabel).toBe('Yes')
    expect(stagedRecord?.treatmentGatedLabel).toBe('—')
    expect(stagedRecord?.complicationLabels).toEqual(['Communication Strain', 'Hypervigilance'])
    expect(breakdownRecord?.depletionBandLabel).toBe('Breakdown')
    expect(breakdownRecord?.treatmentGatedLabel).toBe('Yes')
    expect(breakdownRecord?.restRecoveryEligibleLabel).toBe('—')
  })

  it('still mirrors warning-only records with validation warning labels', () => {
    const warningRecord = warningOnlyRecord()
    expect(validatePsychologicalResilienceRecord(warningRecord).valid).toBe(true)

    const game = createStartingState()
    game.psychologicalResilienceRecords = {
      [warningRecord.id]: warningRecord,
    }

    const view = getPsychologicalResilienceMirrorView(game)
    const record = view.records[0]

    expect(view.summary.totalRecords).toBe(1)
    expect(view.summary.treatmentGatedCount).toBe(1)
    expect(record?.validationWarningLabels.length).toBe(2)
    expect(record?.depletionBandLabel).toBe('Breakdown')
  })

  it('does not leak redacted exposure scores in mirror labels', () => {
    const redactedRecord = redactedExposureRecord()
    const projection = projectPsychologicalResilienceReview(redactedRecord)

    expect(projection.exposureScore).toBeNull()
    expect(projection.redacted).toBe(true)

    const game = createStartingState()
    game.psychologicalResilienceRecords = {
      [redactedRecord.id]: redactedRecord,
    }

    const view = getPsychologicalResilienceMirrorView(game)
    const record = view.records[0]

    expect(record?.exposureScoreLabel).toBe('—')
    expect(record?.redacted).toBe(true)
    expect(record?.exposureElevatedLabel).toBe('—')
  })

  it('orders records by id and is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.psychologicalResilienceRecords = {
      [PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE,
      [PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
    }

    const view = getPsychologicalResilienceMirrorView(game)

    expect(view.records.map((record) => record.id)).toEqual([
      PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE.id,
      PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id,
    ])

    const first = JSON.stringify(getPsychologicalResilienceMirrorView(game))
    const second = JSON.stringify(getPsychologicalResilienceMirrorView(game))

    expect(first).toBe(second)
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatPsychologicalResilienceEnumLabel('cognitohazard_contact')).toBe(
      'Cognitohazard Contact'
    )
    expect(formatPsychologicalResilienceEnumLabel('treatment_required')).toBe('Treatment Required')
  })
})
