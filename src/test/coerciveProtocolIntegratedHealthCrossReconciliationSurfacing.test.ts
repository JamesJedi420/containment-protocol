import { describe, expect, it } from 'vitest'

import {
  ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
} from '../domain/coerciveContainedPersonProtocolRegistry'
import {
  composeAllCoerciveProtocolIntegratedHealthReconciliationSummaries,
  formatCoerciveProtocolCrossLinkLabel,
  formatCoerciveProtocolIntegratedHealthReconciliationNoteContent,
  formatCrossSystemTensionFlagLabel,
  formatIntegratedHealthBundleCrossLinkLabel,
} from '../domain/coerciveProtocolIntegratedHealthCrossReconciliationSurfacing'
import { composeCoerciveProtocolIntegratedHealthReconciliation } from '../domain/coerciveProtocolIntegratedHealthCrossReconciliation'
import { INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE } from '../domain/containedPersonIntegratedHealthBundleRegistry'
import { buildWeeklyCoerciveProtocolIntegratedHealthReconciliationReportNotes } from '../domain/coerciveProtocolIntegratedHealthCrossReconciliationWeeklyReportNotes'

const SURVEILLANCE_PROTOCOLS = {
  [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
    ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
}

const SURVEILLANCE_BUNDLES = {
  [INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE.subjectRef]:
    INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE,
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
