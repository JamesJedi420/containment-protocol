import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  projectSurveillanceInterventionTuningReview,
  SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
  validateSurveillanceInterventionTuningRecord,
  type SurveillanceInterventionTuningRecord,
} from '../../domain/surveillanceCapacityInterventionTuningRegistry'
import {
  formatSurveillanceInterventionTuningEnumLabel,
  getSurveillanceInterventionTuningMirrorView,
} from './surveillanceInterventionTuningMirrorView'

function relaxedWithoutRationaleRecord(): SurveillanceInterventionTuningRecord {
  return {
    id: 'surveillance-tuning:relaxed-warning-only',
    label: 'Relaxed under high surveillance without rationale',
    subjectRef: 'subject:field-asset-44',
    currentInterventionLevel: 'relaxed',
    surveillanceSignalScore: 0.72,
    meaningfulContactScore: 0.18,
    healthcareLoadScore: 0.35,
    collateralStrainScore: 0.22,
  }
}

function redactedSurveillanceRecord(): SurveillanceInterventionTuningRecord {
  return {
    id: 'surveillance-tuning:redacted-signal',
    label: 'Redacted surveillance signal profile',
    subjectRef: 'subject:analyst-asset-7',
    currentInterventionLevel: 'sustained',
    surveillanceSignalScore: 0.8,
    meaningfulContactScore: 0.2,
    redactedFields: ['surveillanceSignalScore'],
    confidence: 0.58,
  }
}

describe('surveillanceInterventionTuningMirrorView (SPE-848 slice 4)', () => {
  it('returns empty mirror when surveillanceInterventionTuningRecords map is empty', () => {
    const game = createStartingState()

    expect(game.surveillanceInterventionTuningRecords).toEqual({})

    const view = getSurveillanceInterventionTuningMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.records).toEqual([])
  })

  it('mirrors intervention level, signal scores, and horizon outcomes from hydrated records', () => {
    const game = createStartingState()
    game.surveillanceInterventionTuningRecords = {
      [SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]: SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
    }

    const view = getSurveillanceInterventionTuningMirrorView(game)
    const record = view.records[0]
    const projection = projectSurveillanceInterventionTuningReview(SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE)

    expect(view.isEmpty).toBe(false)
    expect(record?.interventionLevelLabel).toBe('Sustained')
    expect(record?.surveillanceSignalScoreLabel).toBe(projection.surveillanceSignalScore?.toFixed(2))
    expect(record?.meaningfulContactScoreLabel).toBe(projection.meaningfulContactScore?.toFixed(2))
    expect(record?.monitoringExceedsContactLabel).toBe('Yes')
    expect(record?.sustainedUnderCollateralStrainLabel).toBe('Yes')
    expect(record?.horizonOutcomeLabels).toEqual([
      'Short: Elevated Isolation Pressure',
      'Medium: Compliance Metric Stable',
      'Long: Legitimacy Erosion Risk',
    ])
  })

  it('aggregates monitoring and collateral-strain projection counts', () => {
    const game = createStartingState()
    game.surveillanceInterventionTuningRecords = {
      [SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]: SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
      [relaxedWithoutRationaleRecord().id]: relaxedWithoutRationaleRecord(),
    }

    const view = getSurveillanceInterventionTuningMirrorView(game)

    expect(view.summary.monitoringExceedsContactCount).toBe(2)
    expect(view.summary.sustainedUnderCollateralStrainCount).toBe(1)
    expect(view.summary.totalRecords).toBe(2)
  })

  it('still mirrors warning-only records with validation warning labels', () => {
    const warningRecord = relaxedWithoutRationaleRecord()
    expect(validateSurveillanceInterventionTuningRecord(warningRecord).valid).toBe(true)

    const game = createStartingState()
    game.surveillanceInterventionTuningRecords = {
      [warningRecord.id]: warningRecord,
    }

    const view = getSurveillanceInterventionTuningMirrorView(game)
    const record = view.records[0]

    expect(view.summary.totalRecords).toBe(1)
    expect(record?.validationWarningLabels.length).toBe(1)
    expect(record?.interventionLevelLabel).toBe('Relaxed')
  })

  it('does not leak redacted surveillance signal scores in mirror labels', () => {
    const redactedRecord = redactedSurveillanceRecord()
    const projection = projectSurveillanceInterventionTuningReview(redactedRecord)

    expect(projection.surveillanceSignalScore).toBeNull()
    expect(projection.redacted).toBe(true)

    const game = createStartingState()
    game.surveillanceInterventionTuningRecords = {
      [redactedRecord.id]: redactedRecord,
    }

    const view = getSurveillanceInterventionTuningMirrorView(game)
    const record = view.records[0]

    expect(record?.surveillanceSignalScoreLabel).toBe('—')
    expect(record?.redacted).toBe(true)
    expect(record?.monitoringExceedsContactLabel).toBe('—')
  })

  it('orders records by id and is byte-stable for repeated mirror builds', () => {
    const warningRecord = relaxedWithoutRationaleRecord()
    const game = createStartingState()
    game.surveillanceInterventionTuningRecords = {
      [SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]: SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
      [warningRecord.id]: warningRecord,
    }

    const view = getSurveillanceInterventionTuningMirrorView(game)

    expect(view.records.map((record) => record.id)).toEqual([
      SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id,
      warningRecord.id,
    ])

    const first = JSON.stringify(getSurveillanceInterventionTuningMirrorView(game))
    const second = JSON.stringify(getSurveillanceInterventionTuningMirrorView(game))

    expect(first).toBe(second)
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatSurveillanceInterventionTuningEnumLabel('alternative_support')).toBe(
      'Alternative Support'
    )
    expect(formatSurveillanceInterventionTuningEnumLabel('elevated_isolation_pressure')).toBe(
      'Elevated Isolation Pressure'
    )
  })
})
