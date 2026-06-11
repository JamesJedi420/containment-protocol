import { describe, expect, it } from 'vitest'

import {
  ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
  STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE,
} from '../domain/coerciveContainedPersonProtocolRegistry'
import {
  composeAllCoerciveProtocolIntegratedHealthReconciliationSummaries,
  formatCoerciveProtocolCrossLinkLabel,
  formatCoerciveProtocolIntegratedHealthReconciliationNoteContent,
  formatCoerciveProtocolIntegratedHealthReconciliationSummaryLabels,
  formatCrossSystemTensionFlagLabel,
  formatIntegratedHealthBundleCrossLinkLabel,
  formatPsychologicalResilienceCrossLinkLabel,
  formatSurveillanceTuningCrossLinkLabel,
} from '../domain/coerciveProtocolIntegratedHealthCrossReconciliationSurfacing'
import { composeCoerciveProtocolIntegratedHealthReconciliation } from '../domain/coerciveProtocolIntegratedHealthCrossReconciliation'
import {
  INTEGRATED_HEALTH_BUNDLE_STAFF_EXCLUSION_TENSION_FIXTURE,
  INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE,
} from '../domain/containedPersonIntegratedHealthBundleRegistry'
import { buildWeeklyCoerciveProtocolIntegratedHealthReconciliationReportNotes } from '../domain/coerciveProtocolIntegratedHealthCrossReconciliationWeeklyReportNotes'
import { PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE } from '../domain/psychologicalResilienceRegistry'
import { SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE } from '../domain/surveillanceCapacityInterventionTuningRegistry'

const SURVEILLANCE_PROTOCOLS = {
  [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
    ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
}

const SURVEILLANCE_BUNDLES = {
  [INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE.subjectRef]:
    INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE,
}

const SURVEILLANCE_TUNING_RECORDS = {
  [SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]: SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
}

const RESILIENCE_PROTOCOL = {
  ...ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
  subjectFitValidationRef: PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.operatorRef,
}

const RESILIENCE_PROTOCOLS = {
  [RESILIENCE_PROTOCOL.id]: RESILIENCE_PROTOCOL,
}

const PSYCHOLOGICAL_RESILIENCE_RECORDS = {
  [PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]:
    PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
}

const STAFF_EXCLUSION_PROTOCOLS = {
  [STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE.id]: STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE,
}

const STAFF_EXCLUSION_BUNDLES = {
  [INTEGRATED_HEALTH_BUNDLE_STAFF_EXCLUSION_TENSION_FIXTURE.subjectRef]:
    INTEGRATED_HEALTH_BUNDLE_STAFF_EXCLUSION_TENSION_FIXTURE,
}

describe('coerciveProtocolIntegratedHealthCrossReconciliationSurfacing (SPE-2429 slice 2)', () => {
  it('formats cross-link labels from persisted record and bundle fields', () => {
    expect(
      formatCoerciveProtocolCrossLinkLabel(ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE)
    ).toBe(
      `${ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id} (${ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.label})`
    )
    expect(
      formatIntegratedHealthBundleCrossLinkLabel(INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE)
    ).toBe(
      `${INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE.id} (${INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE.label})`
    )
    expect(formatCrossSystemTensionFlagLabel('surveillance_burden_stable_mental_state')).toBe(
      'Surveillance Burden Stable Mental State'
    )
  })

  it('returns no summaries for empty maps without throw', () => {
    expect(
      composeAllCoerciveProtocolIntegratedHealthReconciliationSummaries({
        protocols: undefined,
        bundles: undefined,
      })
    ).toEqual([])
    expect(
      composeAllCoerciveProtocolIntegratedHealthReconciliationSummaries({
        protocols: {},
        bundles: {},
      })
    ).toEqual([])
  })

  it('builds weekly report notes when linked maps coexist', () => {
    const summary = composeCoerciveProtocolIntegratedHealthReconciliation(
      SURVEILLANCE_PROTOCOLS,
      SURVEILLANCE_BUNDLES,
      ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.subjectRef
    )

    const notes = buildWeeklyCoerciveProtocolIntegratedHealthReconciliationReportNotes({
      nextProtocols: SURVEILLANCE_PROTOCOLS,
      nextBundles: SURVEILLANCE_BUNDLES,
      week: 3,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('coercive_protocol.integrated_health_reconciliation')
    expect(notes[0]?.content).toBe(
      formatCoerciveProtocolIntegratedHealthReconciliationNoteContent({
        summary,
        protocols: SURVEILLANCE_PROTOCOLS,
        bundles: SURVEILLANCE_BUNDLES,
      })
    )
    expect(notes[0]?.content).toContain('Coercive protocol cross-link')
    expect(notes[0]?.content).toContain('subject:cooperative-field-asset-22')
    expect(notes[0]?.content).toContain('Surveillance Burden Stable Mental State')
  })

  it('returns no weekly notes when either map is empty', () => {
    expect(
      buildWeeklyCoerciveProtocolIntegratedHealthReconciliationReportNotes({
        nextProtocols: SURVEILLANCE_PROTOCOLS,
        nextBundles: {},
        week: 3,
        sequenceStart: 1,
      })
    ).toEqual([])
    expect(
      buildWeeklyCoerciveProtocolIntegratedHealthReconciliationReportNotes({
        nextProtocols: {},
        nextBundles: SURVEILLANCE_BUNDLES,
        week: 3,
        sequenceStart: 1,
      })
    ).toEqual([])
  })
})

describe('coerciveProtocolIntegratedHealthCrossReconciliationSurfacing (SPE-2439 slice 4)', () => {
  it('formats surveillance tuning cross-link labels from persisted id and label only', () => {
    expect(formatSurveillanceTuningCrossLinkLabel(SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE)).toBe(
      `${SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id} (${SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.label})`
    )
    expect(formatCrossSystemTensionFlagLabel('surveillance_tuning_monitoring_exceeds_contact')).toBe(
      'Surveillance Tuning Monitoring Exceeds Contact'
    )
  })

  it('passes surveillance tuning records into compose summaries without throw on empty maps', () => {
    expect(
      composeAllCoerciveProtocolIntegratedHealthReconciliationSummaries({
        protocols: SURVEILLANCE_PROTOCOLS,
        bundles: SURVEILLANCE_BUNDLES,
        surveillanceTuningRecords: {},
      })
    ).toHaveLength(1)
    expect(
      composeAllCoerciveProtocolIntegratedHealthReconciliationSummaries({
        protocols: SURVEILLANCE_PROTOCOLS,
        bundles: SURVEILLANCE_BUNDLES,
        surveillanceTuningRecords: undefined,
      })[0]?.linkedTuningCount
    ).toBe(0)
  })

  it('surfaces surveillance-tuning tension flags and tuning labels when tuning map coexists', () => {
    const summary = composeCoerciveProtocolIntegratedHealthReconciliation(
      SURVEILLANCE_PROTOCOLS,
      SURVEILLANCE_BUNDLES,
      ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.subjectRef,
      SURVEILLANCE_TUNING_RECORDS
    )

    const notes = buildWeeklyCoerciveProtocolIntegratedHealthReconciliationReportNotes({
      nextProtocols: SURVEILLANCE_PROTOCOLS,
      nextBundles: SURVEILLANCE_BUNDLES,
      nextSurveillanceTuningRecords: SURVEILLANCE_TUNING_RECORDS,
      week: 3,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.content).toBe(
      formatCoerciveProtocolIntegratedHealthReconciliationNoteContent({
        summary,
        protocols: SURVEILLANCE_PROTOCOLS,
        bundles: SURVEILLANCE_BUNDLES,
        surveillanceTuningRecords: SURVEILLANCE_TUNING_RECORDS,
      })
    )
    expect(notes[0]?.content).toContain('1 tuning record(s)')
    expect(notes[0]?.content).toContain(
      formatSurveillanceTuningCrossLinkLabel(SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE)
    )
    expect(notes[0]?.content).toContain('Surveillance Tuning Monitoring Exceeds Contact')
    expect(notes[0]?.content).toContain('Surveillance Tuning Sustained Under Collateral Strain')
    expect(notes[0]?.content).not.toContain('0.88')
    expect(notes[0]?.metadata?.linkedTuningCount).toBe(1)
  })

  it('keeps byte-stable surveillance-tuning tension flag ordering in note metadata', () => {
    const notes = buildWeeklyCoerciveProtocolIntegratedHealthReconciliationReportNotes({
      nextProtocols: SURVEILLANCE_PROTOCOLS,
      nextBundles: SURVEILLANCE_BUNDLES,
      nextSurveillanceTuningRecords: SURVEILLANCE_TUNING_RECORDS,
      week: 3,
      sequenceStart: 1,
    })

    expect(notes[0]?.metadata?.crossSystemTensionFlags).toEqual([
      'monitoring_substitutes_contact_signal',
      'surveillance_burden_low_humane_care_risk',
      'surveillance_burden_no_active_contact_channel',
      'surveillance_burden_stable_mental_state',
      'surveillance_tuning_monitoring_exceeds_contact',
      'surveillance_tuning_sustained_under_collateral_strain',
    ])
  })
})

describe('coerciveProtocolIntegratedHealthCrossReconciliationSurfacing (SPE-2440 slice 5)', () => {
  it('formats psychological resilience cross-link labels from persisted id and label only', () => {
    expect(
      formatPsychologicalResilienceCrossLinkLabel(PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE)
    ).toBe(
      `${PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id} (${PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.label})`
    )
    expect(formatCrossSystemTensionFlagLabel('psychological_resilience_exposure_elevated')).toBe(
      'Psychological Resilience Exposure Elevated'
    )
  })

  it('passes psychological resilience records into compose summaries without throw on empty maps', () => {
    expect(
      composeAllCoerciveProtocolIntegratedHealthReconciliationSummaries({
        protocols: RESILIENCE_PROTOCOLS,
        bundles: SURVEILLANCE_BUNDLES,
        psychologicalResilienceRecords: {},
      })
    ).toHaveLength(1)
    expect(
      composeAllCoerciveProtocolIntegratedHealthReconciliationSummaries({
        protocols: RESILIENCE_PROTOCOLS,
        bundles: SURVEILLANCE_BUNDLES,
        psychologicalResilienceRecords: undefined,
      })[0]?.linkedResilienceCount
    ).toBe(0)
  })

  it('surfaces psychological-resilience tension flags and resilience labels when resilience map coexists', () => {
    const summary = composeCoerciveProtocolIntegratedHealthReconciliation(
      RESILIENCE_PROTOCOLS,
      SURVEILLANCE_BUNDLES,
      ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.subjectRef,
      undefined,
      PSYCHOLOGICAL_RESILIENCE_RECORDS
    )

    const notes = buildWeeklyCoerciveProtocolIntegratedHealthReconciliationReportNotes({
      nextProtocols: RESILIENCE_PROTOCOLS,
      nextBundles: SURVEILLANCE_BUNDLES,
      nextPsychologicalResilienceRecords: PSYCHOLOGICAL_RESILIENCE_RECORDS,
      week: 3,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.content).toBe(
      formatCoerciveProtocolIntegratedHealthReconciliationNoteContent({
        summary,
        protocols: RESILIENCE_PROTOCOLS,
        bundles: SURVEILLANCE_BUNDLES,
        psychologicalResilienceRecords: PSYCHOLOGICAL_RESILIENCE_RECORDS,
      })
    )
    expect(notes[0]?.content).toContain('1 resilience record(s)')
    expect(notes[0]?.content).toContain(
      formatPsychologicalResilienceCrossLinkLabel(PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE)
    )
    expect(notes[0]?.content).toContain('Psychological Resilience Exposure Elevated')
    expect(notes[0]?.content).toContain('Psychological Resilience Duty Reliability Degraded')
    expect(notes[0]?.content).not.toContain('0.72')
    expect(notes[0]?.content).not.toContain('0.79')
    expect(notes[0]?.metadata?.linkedResilienceCount).toBe(1)
  })

  it('keeps byte-stable psychological-resilience tension flag ordering in note metadata', () => {
    const notes = buildWeeklyCoerciveProtocolIntegratedHealthReconciliationReportNotes({
      nextProtocols: RESILIENCE_PROTOCOLS,
      nextBundles: SURVEILLANCE_BUNDLES,
      nextPsychologicalResilienceRecords: PSYCHOLOGICAL_RESILIENCE_RECORDS,
      week: 3,
      sequenceStart: 1,
    })

    expect(notes[0]?.metadata?.crossSystemTensionFlags).toEqual([
      'monitoring_substitutes_contact_signal',
      'psychological_resilience_duty_reliability_degraded',
      'psychological_resilience_exposure_elevated',
      'surveillance_burden_low_humane_care_risk',
      'surveillance_burden_no_active_contact_channel',
      'surveillance_burden_stable_mental_state',
    ])
  })
})

describe('coerciveProtocolIntegratedHealthCrossReconciliationSurfacing (SPE-2442 slice 6)', () => {
  it('formats staff-duty tension flag labels from compose tokens only', () => {
    expect(
      formatCrossSystemTensionFlagLabel('staff_exclusion_support_duty_obligation_elevated')
    ).toBe('Staff Exclusion Support Duty Obligation Elevated')
    expect(
      formatCrossSystemTensionFlagLabel('staff_exclusion_bundle_no_active_contact_cross_tension')
    ).toBe('Staff Exclusion Bundle No Active Contact Cross Tension')
  })

  it('returns empty staff-duty tension labels when bundle is missing for staff-exclusion protocol', () => {
    const summary = composeCoerciveProtocolIntegratedHealthReconciliation(
      STAFF_EXCLUSION_PROTOCOLS,
      {},
      STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE.subjectRef
    )

    const labels = formatCoerciveProtocolIntegratedHealthReconciliationSummaryLabels({
      summary,
      protocols: STAFF_EXCLUSION_PROTOCOLS,
      bundles: {},
    })

    expect(labels.staffExclusionTensionFlagLabels).toEqual([])
  })

  it('surfaces staff-duty tension flags and staff-duty segment when staff-exclusion fixtures coexist', () => {
    const summary = composeCoerciveProtocolIntegratedHealthReconciliation(
      STAFF_EXCLUSION_PROTOCOLS,
      STAFF_EXCLUSION_BUNDLES,
      STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE.subjectRef
    )

    const notes = buildWeeklyCoerciveProtocolIntegratedHealthReconciliationReportNotes({
      nextProtocols: STAFF_EXCLUSION_PROTOCOLS,
      nextBundles: STAFF_EXCLUSION_BUNDLES,
      week: 3,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.content).toBe(
      formatCoerciveProtocolIntegratedHealthReconciliationNoteContent({
        summary,
        protocols: STAFF_EXCLUSION_PROTOCOLS,
        bundles: STAFF_EXCLUSION_BUNDLES,
      })
    )
    expect(notes[0]?.content).toContain('Staff-duty tension flags:')
    expect(notes[0]?.content).toContain('Staff Exclusion Support Duty Obligation Elevated')
    expect(notes[0]?.content).toContain('Staff Exclusion Medical Access Not Routed')
    expect(notes[0]?.content).toContain('Staff Exclusion Bundle No Active Contact Cross Tension')
    expect(notes[0]?.content).not.toContain('0.81')
    expect(notes[0]?.content).not.toContain('0.73')
    expect(notes[0]?.content).not.toContain('excludes staff or support personnel')
  })

  it('keeps byte-stable staff-duty tension flag ordering in note metadata', () => {
    const notes = buildWeeklyCoerciveProtocolIntegratedHealthReconciliationReportNotes({
      nextProtocols: STAFF_EXCLUSION_PROTOCOLS,
      nextBundles: STAFF_EXCLUSION_BUNDLES,
      week: 3,
      sequenceStart: 1,
    })

    expect(notes[0]?.metadata?.crossSystemTensionFlags).toEqual([
      'staff_exclusion_accommodation_access_not_routed',
      'staff_exclusion_bundle_no_active_contact_cross_tension',
      'staff_exclusion_exposure_risk_not_separated',
      'staff_exclusion_medical_access_not_routed',
      'staff_exclusion_support_duty_obligation_elevated',
    ])
  })
})
