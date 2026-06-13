import { describe, expect, it } from 'vitest'
import {
  EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
  ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
} from '../domain/coerciveContainedPersonProtocolRegistry'
import { EXTENDED_MECHANICAL_RESTRAINT_ANCHOR } from '../domain/coerciveProcedureRegistry'
import { INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE } from '../domain/containedPersonIntegratedHealthBundleRegistry'
import {
  ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
  PSYCHIATRIC_REVIEW_PANEL_MATRIX_FIXTURE,
} from '../domain/factionEthicsMatrixRegistry'
import {
  EXTERNAL_OVERSIGHT_ESCALATION_MATRIX_FIXTURE,
  INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE,
} from '../domain/moralLegalAccountabilityMatrixRegistry'
import {
  composeAllWelfareDebtAccountingCrossLinks,
  composeWelfareDebtAccountingCrossLinksForRecord,
  formatWelfareDebtAccountingCrossLinkLabels,
  resolveProcedureRefFromWelfareDebtRecordId,
  resolveSubjectRefFromWelfareDebtRecordId,
} from '../domain/welfareDebtAccountingCrossLinks'
import {
  COERCIVE_RESTRAINT_LEDGER_FIXTURE,
  FORCED_SEDATION_CYCLE_FIXTURE,
  type WelfareDebtAccountingRecord,
} from '../domain/welfareDebtAccountingRegistry'

describe('welfareDebtAccountingCrossLinks (SPE-1888 slice 7 + slice 9)', () => {
  it('returns empty compose for empty records map without throw', () => {
    expect(composeAllWelfareDebtAccountingCrossLinks({ records: {} })).toEqual([])
  })

  it('parses procedureRef from creation-tick welfare-debt record ids', () => {
    const recordId = `welfare-debt:${EXTENDED_MECHANICAL_RESTRAINT_ANCHOR.procedureRef}:subject:cooperative-field-asset-31`

    expect(resolveProcedureRefFromWelfareDebtRecordId(recordId)).toBe(
      EXTENDED_MECHANICAL_RESTRAINT_ANCHOR.procedureRef
    )
    expect(
      resolveSubjectRefFromWelfareDebtRecordId(
        recordId,
        EXTENDED_MECHANICAL_RESTRAINT_ANCHOR.procedureRef
      )
    ).toBe('subject:cooperative-field-asset-31')
  })

  it('does not parse procedureRef from authored fixture ids', () => {
    expect(
      resolveProcedureRefFromWelfareDebtRecordId(COERCIVE_RESTRAINT_LEDGER_FIXTURE.id)
    ).toBeUndefined()
  })

  it('links integrated health bundle by subjectRef', () => {
    const summary = composeWelfareDebtAccountingCrossLinksForRecord(
      COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      {
        bundles: {
          [INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE.id]:
            INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE,
        },
      }
    )

    expect(summary?.integratedHealthLinks).toHaveLength(1)
    expect(summary?.integratedHealthLinks[0]?.integratedHealthBundleId).toBe(
      'subject:contained-person-field-links'
    )
    expect(summary?.integratedHealthLinks[0]?.matchKind).toBe('subject_ref')
  })

  it('links coercive protocol by procedureRef when creation-tick id matches', () => {
    const creationTickRecord: WelfareDebtAccountingRecord = {
      ...COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      id: `welfare-debt:${ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.procedureRef}:subject:cooperative-field-asset-31`,
      subjectRef: 'subject:cooperative-field-asset-31',
    }

    const summary = composeWelfareDebtAccountingCrossLinksForRecord(creationTickRecord, {
      coerciveProtocolRecords: {
        [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]:
          ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
        [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
      },
    })

    expect(summary?.coerciveProtocolLinks).toHaveLength(1)
    expect(summary?.coerciveProtocolLinks[0]?.coerciveProtocolId).toBe(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id
    )
    expect(summary?.coerciveProtocolLinks[0]?.matchKind).toBe('procedure_ref')
  })

  it('falls back to subject-only coercive protocol matches for authored fixture ids', () => {
    const summary = composeWelfareDebtAccountingCrossLinksForRecord(
      {
        ...COERCIVE_RESTRAINT_LEDGER_FIXTURE,
        subjectRef: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.subjectRef,
      },
      {
        coerciveProtocolRecords: {
          [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]:
            ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
        },
      }
    )

    expect(summary?.coerciveProtocolLinks).toHaveLength(1)
    expect(summary?.coerciveProtocolLinks[0]?.matchKind).toBe('subject_ref')
  })

  it('derives opaque accountability link refs from review owner and mitigation path labels', () => {
    const summary = composeWelfareDebtAccountingCrossLinksForRecord(
      COERCIVE_RESTRAINT_LEDGER_FIXTURE
    )

    expect(summary?.accountabilityLinkRefs.map((ref) => ref.wiredRef)).toEqual([
      'mitigation-path:independent-welfare-audit',
      'review-owner:ethics-review-board',
    ])
  })

  it('wires SPE-1047 faction ethics matrix projections when records map is provided', () => {
    const summary = composeWelfareDebtAccountingCrossLinksForRecord(
      COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      {
        factionEthicsRecords: {
          [ETHICS_REVIEW_BOARD_MATRIX_FIXTURE.id]: ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
        },
      }
    )

    expect(summary?.factionEthicsLinks).toHaveLength(1)
    expect(summary?.factionEthicsLinks[0]?.factionEthicsRecordId).toBe(
      ETHICS_REVIEW_BOARD_MATRIX_FIXTURE.id
    )
    expect(summary?.factionEthicsLinks[0]?.wiredRef).toBe(
      'faction-ethics:faction-ethics:ethics-review-board-routing'
    )
    expect(summary?.factionEthicsLinks[0]?.matchKind).toBe('review_owner_label')
    expect(summary?.accountabilityLinkRefs.map((ref) => ref.kind)).toContain('faction_ethics')
    expect(
      summary?.accountabilityLinkRefs.some((ref) => ref.kind === 'review_owner')
    ).toBe(false)
  })

  it('wires SPE-1131 accountability matrix projections when records map is provided', () => {
    const summary = composeWelfareDebtAccountingCrossLinksForRecord(
      COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      {
        accountabilityMatrixRecords: {
          [INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE.id]: INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE,
        },
      }
    )

    expect(summary?.accountabilityMatrixLinks).toHaveLength(1)
    expect(summary?.accountabilityMatrixLinks[0]?.accountabilityMatrixRecordId).toBe(
      INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE.id
    )
    expect(summary?.accountabilityMatrixLinks[0]?.wiredRef).toBe(
      'accountability-matrix:accountability-matrix:independent-welfare-audit'
    )
    expect(summary?.accountabilityMatrixLinks[0]?.matchKind).toBe('mitigation_path_label')
    expect(summary?.accountabilityLinkRefs.map((ref) => ref.kind)).toContain(
      'accountability_matrix'
    )
    expect(
      summary?.accountabilityLinkRefs.some((ref) => ref.kind === 'mitigation_path')
    ).toBe(false)
  })

  it('matches matrix projections for sedation fixture labels', () => {
    const summary = composeWelfareDebtAccountingCrossLinksForRecord(FORCED_SEDATION_CYCLE_FIXTURE, {
      factionEthicsRecords: {
        [PSYCHIATRIC_REVIEW_PANEL_MATRIX_FIXTURE.id]: PSYCHIATRIC_REVIEW_PANEL_MATRIX_FIXTURE,
      },
      accountabilityMatrixRecords: {
        [EXTERNAL_OVERSIGHT_ESCALATION_MATRIX_FIXTURE.id]:
          EXTERNAL_OVERSIGHT_ESCALATION_MATRIX_FIXTURE,
      },
    })

    expect(summary?.factionEthicsLinks[0]?.matchKind).toBe('review_owner_label')
    expect(summary?.accountabilityMatrixLinks[0]?.matchKind).toBe('mitigation_path_label')
  })

  it('falls back to opaque accountability refs when matrix maps are absent', () => {
    const summary = composeWelfareDebtAccountingCrossLinksForRecord(
      COERCIVE_RESTRAINT_LEDGER_FIXTURE
    )

    expect(summary?.factionEthicsLinks).toEqual([])
    expect(summary?.accountabilityMatrixLinks).toEqual([])
    expect(summary?.accountabilityLinkRefs.map((ref) => ref.kind)).toEqual([
      'mitigation_path',
      'review_owner',
    ])
  })

  it('skips invalid records without re-surfacing', () => {
    const invalid = {
      id: 'welfare-debt:invalid',
      label: '',
      subjectRef: 'subject:invalid',
      debtCategory: 'harmful_restraint',
      severityBand: 'high',
      mitigationState: 'unresolved',
      sourceProcedureLabel: 'test',
      reviewOwnerLabel: 'ethics review board',
    } as WelfareDebtAccountingRecord

    expect(composeWelfareDebtAccountingCrossLinksForRecord(invalid)).toBeNull()
  })

  it('sorts cross-link labels deterministically', () => {
    const summary = composeWelfareDebtAccountingCrossLinksForRecord(
      COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      {
        bundles: {
          [INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE.id]:
            INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE,
        },
      }
    )

    expect(summary).not.toBeNull()

    const first = formatWelfareDebtAccountingCrossLinkLabels(summary!)
    const second = formatWelfareDebtAccountingCrossLinkLabels(summary!)

    expect(first).toEqual(second)
    expect(first.some((label) => label.startsWith('integrated-health:'))).toBe(true)
    expect(first.some((label) => label.startsWith('review_owner:'))).toBe(true)
  })

  it('includes matrix wired refs in labels when maps are provided', () => {
    const summary = composeWelfareDebtAccountingCrossLinksForRecord(
      COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      {
        factionEthicsRecords: {
          [ETHICS_REVIEW_BOARD_MATRIX_FIXTURE.id]: ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
        },
        accountabilityMatrixRecords: {
          [INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE.id]: INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE,
        },
      }
    )

    const labels = formatWelfareDebtAccountingCrossLinkLabels(summary!)
    expect(labels.some((label) => label.startsWith('faction-ethics:'))).toBe(true)
    expect(labels.some((label) => label.startsWith('accountability-matrix:'))).toBe(true)
    expect(labels.some((label) => label.startsWith('review_owner:'))).toBe(false)
    expect(labels.some((label) => label.startsWith('mitigation_path:'))).toBe(false)
  })

  it('composeAll returns byte-stable ordering by debtRef', () => {
    const records = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      'welfare-debt:zzz-second': {
        ...COERCIVE_RESTRAINT_LEDGER_FIXTURE,
        id: 'welfare-debt:zzz-second',
        label: 'Second entry',
      },
    }

    const first = composeAllWelfareDebtAccountingCrossLinks({ records })
    const second = composeAllWelfareDebtAccountingCrossLinks({ records })

    expect(first.map((entry) => entry.debtRef)).toEqual(second.map((entry) => entry.debtRef))
    expect(first.map((entry) => entry.debtRef)).toEqual([
      COERCIVE_RESTRAINT_LEDGER_FIXTURE.id,
      'welfare-debt:zzz-second',
    ])
  })
})
