import { describe, expect, it } from 'vitest'

import {
  ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
  EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
  validateCoerciveProtocolRecord,
} from '../domain/coerciveContainedPersonProtocolRegistry'
import {
  composeAllCoerciveProtocolIntegratedHealthReconciliations,
  composeCoerciveProtocolIntegratedHealthReconciliation,
  listCoerciveProtocolsForIntegratedHealthSubject,
  listSurveillanceInterventionTuningRecordsForSubject,
  resolveIntegratedHealthBundleForSubject,
} from '../domain/coerciveProtocolIntegratedHealthCrossReconciliation'
import {
  SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
  validateSurveillanceInterventionTuningRecord,
} from '../domain/surveillanceCapacityInterventionTuningRegistry'
import {
  INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE,
  INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE,
  validateContainedPersonIntegratedHealthBundle,
} from '../domain/containedPersonIntegratedHealthBundleRegistry'

describe('coerciveProtocolIntegratedHealthCrossReconciliation (SPE-2428 slice 1)', () => {
  it('returns empty summary for empty maps without throw', () => {
    const summary = composeCoerciveProtocolIntegratedHealthReconciliation(
      undefined,
      undefined,
      'subject:missing'
    )

    expect(summary.links).toEqual([])
    expect(summary.surveillanceTuningLinks).toEqual([])
    expect(summary.linkedProtocolCount).toBe(0)
    expect(summary.linkedBundleCount).toBe(0)
    expect(summary.linkedTuningCount).toBe(0)
    expect(summary.protocolRiskReviews).toEqual([])
    expect(summary.triggeredContradictionChecks).toEqual([])
    expect(summary.surveillanceTuningProjections).toEqual([])
    expect(summary.crossSystemTensionFlags).toEqual([])
    expect(summary.structuredReasons).toContain('link_count:0')
    expect(summary.structuredReasons).toContain('linked_tuning_count:0')
    expect(summary.structuredReasons).toContain('tuning:none')
    expect(summary.structuredReasons).toContain('tension:none')
  })

  it('links abusive surveillance protocol to bundle by subject ref with tension flags', () => {
    expect(validateCoerciveProtocolRecord(ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE).valid).toBe(
      true
    )
    expect(
      validateContainedPersonIntegratedHealthBundle(INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE)
        .valid
    ).toBe(true)

    const protocols = {
      [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
    }
    const bundles = {
      [INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE.subjectRef]:
        INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE,
    }

    const summary = composeCoerciveProtocolIntegratedHealthReconciliation(
      protocols,
      bundles,
      ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.subjectRef
    )

    expect(summary.linkedProtocolCount).toBe(1)
    expect(summary.linkedBundleCount).toBe(1)
    expect(summary.links).toHaveLength(1)
    expect(summary.links[0]?.matchKind).toBe('subject_ref')
    expect(summary.protocolRiskReviews[0]?.contradictionRiskFlags).toContain(
      'surveillance_isolation_burden'
    )
    expect(summary.triggeredContradictionChecks.some((check) => check.flag === 'surveillance_isolation_burden')).toBe(
      true
    )
    expect(summary.bundleMentalStateBand).toBe('stable')
    expect(summary.bundleTherapeuticChannelStates).toEqual(['degraded'])
    expect(summary.crossSystemTensionFlags).toEqual([
      'monitoring_substitutes_contact_signal',
      'surveillance_burden_low_humane_care_risk',
      'surveillance_burden_no_active_contact_channel',
      'surveillance_burden_stable_mental_state',
    ])
    expect(summary.structuredReasons).toContain('tension:present')
    expect(summary.structuredReasons).toContain('tuning:none')
    expect(summary.linkedTuningCount).toBe(0)
  })

  it('cross-joins surveillance tuning record with protocol and bundle by subject ref', () => {
    expect(validateSurveillanceInterventionTuningRecord(SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE).valid).toBe(
      true
    )

    const protocols = {
      [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
    }
    const bundles = {
      [INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE.subjectRef]:
        INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE,
    }
    const surveillanceTuningRecords = {
      [SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]: SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
    }

    const summary = composeCoerciveProtocolIntegratedHealthReconciliation(
      protocols,
      bundles,
      ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.subjectRef,
      surveillanceTuningRecords
    )

    expect(summary.linkedTuningCount).toBe(1)
    expect(summary.surveillanceTuningLinks).toHaveLength(1)
    expect(summary.surveillanceTuningLinks[0]?.matchKind).toBe('subject_ref')
    expect(summary.surveillanceTuningProjections[0]?.monitoringExceedsContact).toBe(true)
    expect(summary.surveillanceTuningProjections[0]?.sustainedUnderCollateralStrain).toBe(true)
    expect(summary.crossSystemTensionFlags).toEqual([
      'monitoring_substitutes_contact_signal',
      'surveillance_burden_low_humane_care_risk',
      'surveillance_burden_no_active_contact_channel',
      'surveillance_burden_stable_mental_state',
      'surveillance_tuning_monitoring_exceeds_contact',
      'surveillance_tuning_sustained_under_collateral_strain',
    ])
    expect(summary.structuredReasons).toContain('linked_tuning_count:1')
    expect(summary.structuredReasons).toContain('tuning:linked')
  })

  it('omits links when bundle is missing for a protocol subject', () => {
    const protocols = {
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
    }

    const summary = composeCoerciveProtocolIntegratedHealthReconciliation(
      protocols,
      {},
      EMERGENCY_SEDATION_PROTOCOL_FIXTURE.subjectRef
    )

    expect(summary.links).toEqual([])
    expect(summary.linkedBundleCount).toBe(0)
    expect(summary.protocolRiskReviews).toHaveLength(1)
    expect(summary.crossSystemTensionFlags).toEqual([])
  })

  it('lists hydrated protocols and resolves bundle for subject in stable id order', () => {
    const protocols = {
      [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
    }
    const bundles = {
      [INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE.subjectRef]:
        INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE,
    }

    expect(
      listCoerciveProtocolsForIntegratedHealthSubject(
        protocols,
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.subjectRef
      ).map((record) => record.id)
    ).toEqual([ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id])

    expect(
      resolveIntegratedHealthBundleForSubject(
        bundles,
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.subjectRef
      )?.id
    ).toBe(INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE.id)

    const tuningRecords = {
      [SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]: SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
    }

    expect(
      listSurveillanceInterventionTuningRecordsForSubject(
        tuningRecords,
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.subjectRef
      ).map((record) => record.id)
    ).toEqual([SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id])
  })

  it('composeAll returns summaries in subject locale order with byte-stable repeat', () => {
    const protocols = {
      [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
    }
    const bundles = {
      [INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE.subjectRef]:
        INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE,
      [INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE.subjectRef]:
        INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE,
    }

    const first = composeAllCoerciveProtocolIntegratedHealthReconciliations(protocols, bundles)
    const second = composeAllCoerciveProtocolIntegratedHealthReconciliations(protocols, bundles)

    expect(first).toEqual(second)
    expect(first).toHaveLength(1)
    expect(first[0]?.subjectRef).toBe('subject:cooperative-field-asset-22')
  })

  it('skips invalid hydrate drops without re-surfacing them', () => {
    const invalidProtocol = {
      ...ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
      id: '',
    }
    const invalidBundle = {
      ...INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE,
      id: '',
    }

    expect(validateCoerciveProtocolRecord(invalidProtocol).valid).toBe(false)
    expect(validateContainedPersonIntegratedHealthBundle(invalidBundle).valid).toBe(false)

    const summary = composeCoerciveProtocolIntegratedHealthReconciliation(
      { 'coercive-protocol:invalid': invalidProtocol },
      { 'subject:invalid': invalidBundle },
      ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.subjectRef
    )

    expect(summary.links).toEqual([])
    expect(summary.linkedProtocolCount).toBe(0)
    expect(summary.linkedBundleCount).toBe(0)
  })
})
