import { describe, expect, it } from 'vitest'
import {
  CARE_CADENCES,
  CARE_MODES,
  CHANNEL_STATES,
  MISSED_STREAK_ELEVATED_RISK_FIXTURE,
  WEEKLY_PSYCH_SCREENING_FIXTURE,
  projectCareComplianceRisk,
  validateTherapeuticCareScheduleRecord,
  type TherapeuticCareScheduleRecord,
} from '../domain/containedPersonTherapeuticCareRegistry'

function baseRecord(
  overrides: Partial<TherapeuticCareScheduleRecord> = {}
): TherapeuticCareScheduleRecord {
  return {
    id: 'care-schedule:test-base',
    label: 'Test base record',
    subjectRef: 'subject:test-base',
    careMode: 'cooperative_checkin',
    cadence: 'weekly',
    channelState: 'active',
    missedSessionStreak: 0,
    ...overrides,
  }
}

describe('containedPersonTherapeuticCareRegistry (SPE-2115 slice 1)', () => {
  it('validates weekly psych screening fixture with active mediated channel', () => {
    const result = validateTherapeuticCareScheduleRecord(WEEKLY_PSYCH_SCREENING_FIXTURE)

    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
    expect(WEEKLY_PSYCH_SCREENING_FIXTURE.careMode).toBe('psych_screening')
    expect(WEEKLY_PSYCH_SCREENING_FIXTURE.cadence).toBe('weekly')
    expect(WEEKLY_PSYCH_SCREENING_FIXTURE.channelState).toBe('active')
    expect(WEEKLY_PSYCH_SCREENING_FIXTURE.staffAssigneeRefs).toEqual([
      'staff:psych-mediator-4',
      'staff:custody-liaison-2',
    ])
  })

  it('validates missed streak fixture', () => {
    const result = validateTherapeuticCareScheduleRecord(MISSED_STREAK_ELEVATED_RISK_FIXTURE)

    expect(result.valid).toBe(true)
    expect(MISSED_STREAK_ELEVATED_RISK_FIXTURE.missedSessionStreak).toBe(3)
    expect(MISSED_STREAK_ELEVATED_RISK_FIXTURE.containmentDependency).toBe(true)
  })

  it('projects elevated compliance risk when missedSessionStreak is high', () => {
    const baseline = projectCareComplianceRisk(WEEKLY_PSYCH_SCREENING_FIXTURE)
    const elevated = projectCareComplianceRisk(MISSED_STREAK_ELEVATED_RISK_FIXTURE)

    expect(baseline.complianceRiskScore).not.toBeNull()
    expect(elevated.complianceRiskScore).not.toBeNull()
    expect(elevated.complianceRiskScore!).toBeGreaterThan(baseline.complianceRiskScore!)
    expect(elevated.lockdownEscalationLikely).toBe(true)
  })

  it('warns when suspended without documented cause', () => {
    const result = validateTherapeuticCareScheduleRecord(
      baseRecord({
        channelState: 'suspended',
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'suspended_without_documented_cause',
        severity: 'warning',
      }),
    ])
  })

  it('warns when active channel has elevated missed session streak', () => {
    const result = validateTherapeuticCareScheduleRecord(
      baseRecord({
        channelState: 'active',
        missedSessionStreak: 3,
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'active_channel_with_operational_inconsistency',
        severity: 'warning',
      }),
    ])
  })

  it('errors on franchise label token in record fields', () => {
    const result = validateTherapeuticCareScheduleRecord(
      baseRecord({
        label: 'Foundation psych screening schedule',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_label')).toBe(true)
  })

  it('errors on branded object number in record id', () => {
    const result = validateTherapeuticCareScheduleRecord(
      baseRecord({
        id: 'care-schedule:SCP-049-care',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'branded_object_number_in_id')).toBe(true)
  })

  it('errors on invalid missed session streak', () => {
    const result = validateTherapeuticCareScheduleRecord(
      baseRecord({
        missedSessionStreak: -1,
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'invalid_missed_session_streak',
        severity: 'error',
      }),
    ])
  })

  it('redacts compliance risk when policy requests unknown redaction', () => {
    const projection = projectCareComplianceRisk(
      {
        ...MISSED_STREAK_ELEVATED_RISK_FIXTURE,
        unknownFields: ['complianceRiskScore'],
      },
      {
        redactUnknown: true,
      }
    )

    expect(projection.complianceRiskScore).toBeNull()
    expect(projection.redacted).toBe(true)
  })

  it('returns byte-stable validation results on repeated calls', () => {
    const first = validateTherapeuticCareScheduleRecord(WEEKLY_PSYCH_SCREENING_FIXTURE)
    const second = validateTherapeuticCareScheduleRecord(WEEKLY_PSYCH_SCREENING_FIXTURE)

    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it('exports stable union catalogs', () => {
    expect(CARE_MODES).toEqual([
      'psych_screening',
      'mediated_audio',
      'visitation_ban',
      'cooperative_checkin',
    ])
    expect(CARE_CADENCES).toEqual(['weekly', 'biweekly'])
    expect(CHANNEL_STATES).toEqual(['active', 'degraded', 'suspended'])
  })
})
