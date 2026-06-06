import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  MISSED_STREAK_ELEVATED_RISK_FIXTURE,
  WEEKLY_PSYCH_SCREENING_FIXTURE,
  projectCareComplianceRisk,
  validateTherapeuticCareScheduleRecord,
  type TherapeuticCareScheduleRecord,
} from '../../domain/containedPersonTherapeuticCareRegistry'
import {
  formatContainedPersonTherapeuticCareEnumLabel,
  getContainedPersonTherapeuticCareMirrorView,
} from './containedPersonTherapeuticCareMirrorView'

function warningOnlyRecord(): TherapeuticCareScheduleRecord {
  return {
    id: 'care-schedule:suspended-warning-only',
    label: 'Suspended channel without documented cause',
    subjectRef: 'subject:cooperative-field-asset-9',
    careMode: 'mediated_audio',
    cadence: 'weekly',
    channelState: 'suspended',
    missedSessionStreak: 4,
  }
}

describe('containedPersonTherapeuticCareMirrorView (SPE-2115 slice 4)', () => {
  it('returns empty mirror when containedPersonTherapeuticCareRecords map is empty', () => {
    const game = createStartingState()

    expect(game.containedPersonTherapeuticCareRecords).toEqual({})

    const view = getContainedPersonTherapeuticCareMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.records).toEqual([])
  })

  it('mirrors schedule, channel posture, and compliance risk from hydrated records', () => {
    const game = createStartingState()
    game.containedPersonTherapeuticCareRecords = {
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
    }

    const view = getContainedPersonTherapeuticCareMirrorView(game)
    const record = view.records[0]
    const projection = projectCareComplianceRisk(WEEKLY_PSYCH_SCREENING_FIXTURE)

    expect(view.isEmpty).toBe(false)
    expect(record?.careModeLabel).toBe('Psych Screening')
    expect(record?.cadenceLabel).toBe('Weekly')
    expect(record?.channelStateLabel).toBe('Active')
    expect(record?.complianceRiskScoreLabel).toBe(projection.complianceRiskScore?.toFixed(2))
    expect(record?.staffAssigneeRefLabels).toEqual([
      'staff:custody-liaison-2',
      'staff:psych-mediator-4',
    ])
  })

  it('shows degraded and suspended channel counts with lockdown escalation summary', () => {
    const game = createStartingState()
    game.containedPersonTherapeuticCareRecords = {
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
      [MISSED_STREAK_ELEVATED_RISK_FIXTURE.id]: MISSED_STREAK_ELEVATED_RISK_FIXTURE,
    }

    const view = getContainedPersonTherapeuticCareMirrorView(game)
    const elevatedRecord = view.records.find(
      (record) => record.id === MISSED_STREAK_ELEVATED_RISK_FIXTURE.id
    )

    expect(view.summary.degradedChannelCount).toBe(1)
    expect(view.summary.suspendedChannelCount).toBe(0)
    expect(view.summary.lockdownEscalationCount).toBe(1)
    expect(elevatedRecord?.channelStateLabel).toBe('Degraded')
    expect(elevatedRecord?.lockdownEscalationLikelyLabel).toBe('Yes')
    expect(elevatedRecord?.containmentDependencyLabel).toBe('Yes')
  })

  it('still mirrors warning-only records with validation warning labels', () => {
    const warningRecord = warningOnlyRecord()
    expect(validateTherapeuticCareScheduleRecord(warningRecord).valid).toBe(true)

    const game = createStartingState()
    game.containedPersonTherapeuticCareRecords = {
      [warningRecord.id]: warningRecord,
    }

    const view = getContainedPersonTherapeuticCareMirrorView(game)
    const record = view.records[0]

    expect(view.summary.totalRecords).toBe(1)
    expect(view.summary.suspendedChannelCount).toBe(1)
    expect(record?.validationWarningLabels.length).toBe(1)
    expect(record?.channelStateLabel).toBe('Suspended')
  })

  it('orders records by id and is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.containedPersonTherapeuticCareRecords = {
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
      [MISSED_STREAK_ELEVATED_RISK_FIXTURE.id]: MISSED_STREAK_ELEVATED_RISK_FIXTURE,
    }

    const view = getContainedPersonTherapeuticCareMirrorView(game)

    expect(view.records.map((record) => record.id)).toEqual([
      MISSED_STREAK_ELEVATED_RISK_FIXTURE.id,
      WEEKLY_PSYCH_SCREENING_FIXTURE.id,
    ])

    const first = JSON.stringify(getContainedPersonTherapeuticCareMirrorView(game))
    const second = JSON.stringify(getContainedPersonTherapeuticCareMirrorView(game))

    expect(first).toBe(second)
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatContainedPersonTherapeuticCareEnumLabel('psych_screening')).toBe('Psych Screening')
    expect(formatContainedPersonTherapeuticCareEnumLabel('cooperative_checkin')).toBe(
      'Cooperative Checkin'
    )
  })
})
