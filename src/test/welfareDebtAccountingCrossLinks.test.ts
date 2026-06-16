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
  composeEthicsAccountabilityCrossLinksForCoerciveProtocolRecord,
  composeWelfareDebtAccountingCrossLinksForRecord,
  composeWelfareDebtCrossLinksForCoerciveProtocolRecord,
  formatCoerciveProtocolAccountabilityMatrixCrossLinkLabels,
  formatCoerciveProtocolAccountabilityMatrixProjectionLabels,
  formatCoerciveProtocolFactionEthicsCrossLinkLabels,
  formatCoerciveProtocolFactionEthicsProjectionLabels,
  formatCoerciveProtocolWelfareDebtCrossLinkLabels,
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

describe('welfareDebtAccountingCrossLinks inverse compose (SPE-1882 slice 12)', () => {
  it('returns empty links when welfare-debt records map is empty', () => {
    expect(
      composeWelfareDebtCrossLinksForCoerciveProtocolRecord(
        ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE
      )
    ).toEqual([])
  })

  it('links welfare-debt ledger entries by procedureRef when creation-tick id matches', () => {
    const creationTickRecord: WelfareDebtAccountingRecord = {
      ...COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      id: `welfare-debt:${ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.procedureRef}:subject:cooperative-field-asset-31`,
      subjectRef: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.subjectRef,
    }

    const links = composeWelfareDebtCrossLinksForCoerciveProtocolRecord(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      {
        welfareDebtRecords: {
          [creationTickRecord.id]: creationTickRecord,
        },
      }
    )

    expect(links).toHaveLength(1)
    expect(links[0]?.debtRef).toBe(creationTickRecord.id)
    expect(links[0]?.matchKind).toBe('procedure_ref')
    expect(formatCoerciveProtocolWelfareDebtCrossLinkLabels(links)).toEqual([
      `welfare-debt:${creationTickRecord.id}`,
    ])
  })

  it('falls back to subject-only welfare-debt matches for authored fixture ids', () => {
    const links = composeWelfareDebtCrossLinksForCoerciveProtocolRecord(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      {
        welfareDebtRecords: {
          [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: {
            ...COERCIVE_RESTRAINT_LEDGER_FIXTURE,
            subjectRef: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.subjectRef,
          },
        },
      }
    )

    expect(links).toHaveLength(1)
    expect(links[0]?.matchKind).toBe('subject_ref')
  })

  it('inverse compose is byte-stable across repeated calls', () => {
    const welfareDebtRecords = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: {
        ...COERCIVE_RESTRAINT_LEDGER_FIXTURE,
        subjectRef: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.subjectRef,
      },
    }

    const first = composeWelfareDebtCrossLinksForCoerciveProtocolRecord(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      { welfareDebtRecords }
    )
    const second = composeWelfareDebtCrossLinksForCoerciveProtocolRecord(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      { welfareDebtRecords }
    )

    expect(first).toEqual(second)
  })
})

describe('welfareDebtAccountingCrossLinks ethics/accountability inverse compose (SPE-1882 slice 16)', () => {
  it('returns empty ethics/accountability links when welfare-debt records map is empty', () => {
    expect(
      composeEthicsAccountabilityCrossLinksForCoerciveProtocolRecord(
        ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE
      )
    ).toEqual({
      factionEthicsLinks: [],
      accountabilityMatrixLinks: [],
      accountabilityLinkRefs: [],
    })
  })

  it('surfaces opaque review-owner and mitigation-path labels when matrix maps are absent', () => {
    const welfareDebtRecords = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: {
        ...COERCIVE_RESTRAINT_LEDGER_FIXTURE,
        subjectRef: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.subjectRef,
      },
    }
    const summary = composeEthicsAccountabilityCrossLinksForCoerciveProtocolRecord(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      { welfareDebtRecords }
    )

    expect(formatCoerciveProtocolFactionEthicsCrossLinkLabels(summary)).toEqual([
      'review_owner:review-owner:ethics-review-board',
    ])
    expect(formatCoerciveProtocolAccountabilityMatrixCrossLinkLabels(summary)).toEqual([
      'mitigation_path:mitigation-path:independent-welfare-audit',
    ])
  })

  it('wires SPE-1047 and SPE-1131 matrix projections when maps are provided', () => {
    const welfareDebtRecords = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: {
        ...COERCIVE_RESTRAINT_LEDGER_FIXTURE,
        subjectRef: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.subjectRef,
      },
    }
    const summary = composeEthicsAccountabilityCrossLinksForCoerciveProtocolRecord(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      {
        welfareDebtRecords,
        factionEthicsRecords: {
          [ETHICS_REVIEW_BOARD_MATRIX_FIXTURE.id]: ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
        },
        accountabilityMatrixRecords: {
          [INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE.id]: INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE,
        },
      }
    )

    expect(summary.factionEthicsLinks).toHaveLength(1)
    expect(summary.accountabilityMatrixLinks).toHaveLength(1)
    expect(formatCoerciveProtocolFactionEthicsCrossLinkLabels(summary)).toEqual([
      'faction-ethics:faction-ethics:ethics-review-board-routing',
    ])
    expect(formatCoerciveProtocolAccountabilityMatrixCrossLinkLabels(summary)).toEqual([
      'accountability-matrix:accountability-matrix:independent-welfare-audit',
    ])
  })

  it('ethics/accountability inverse compose is byte-stable across repeated calls', () => {
    const input = {
      welfareDebtRecords: {
        [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: {
          ...COERCIVE_RESTRAINT_LEDGER_FIXTURE,
          subjectRef: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.subjectRef,
        },
      },
      factionEthicsRecords: {
        [ETHICS_REVIEW_BOARD_MATRIX_FIXTURE.id]: ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
      },
      accountabilityMatrixRecords: {
        [INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE.id]: INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE,
      },
    }

    const first = composeEthicsAccountabilityCrossLinksForCoerciveProtocolRecord(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      input
    )
    const second = composeEthicsAccountabilityCrossLinksForCoerciveProtocolRecord(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      input
    )

    expect(first).toEqual(second)
  })
})

describe('welfareDebtAccountingCrossLinks ethics/accountability projection labels (SPE-1882 slice 17)', () => {
  it('returns empty projection labels when matrix maps are absent', () => {
    const welfareDebtRecords = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: {
        ...COERCIVE_RESTRAINT_LEDGER_FIXTURE,
        subjectRef: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.subjectRef,
      },
    }
    const summary = composeEthicsAccountabilityCrossLinksForCoerciveProtocolRecord(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      { welfareDebtRecords }
    )

    expect(formatCoerciveProtocolFactionEthicsProjectionLabels(summary, undefined)).toEqual([])
    expect(formatCoerciveProtocolAccountabilityMatrixProjectionLabels(summary, undefined)).toEqual(
      []
    )
  })

  it('surfaces permissibility verdict labels when faction ethics matrix is hydrated', () => {
    const welfareDebtRecords = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: {
        ...COERCIVE_RESTRAINT_LEDGER_FIXTURE,
        subjectRef: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.subjectRef,
      },
    }
    const summary = composeEthicsAccountabilityCrossLinksForCoerciveProtocolRecord(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      {
        welfareDebtRecords,
        factionEthicsRecords: {
          [ETHICS_REVIEW_BOARD_MATRIX_FIXTURE.id]: ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
        },
      }
    )

    expect(formatCoerciveProtocolFactionEthicsProjectionLabels(summary, {})).toEqual([])
    expect(
      formatCoerciveProtocolFactionEthicsProjectionLabels(summary, {
        [ETHICS_REVIEW_BOARD_MATRIX_FIXTURE.id]: ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
      })
    ).toEqual(['Escalation Required'])
  })

  it('surfaces moral/legal outcome summary labels when accountability matrix is hydrated', () => {
    const welfareDebtRecords = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: {
        ...COERCIVE_RESTRAINT_LEDGER_FIXTURE,
        subjectRef: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.subjectRef,
      },
    }
    const summary = composeEthicsAccountabilityCrossLinksForCoerciveProtocolRecord(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      {
        welfareDebtRecords,
        accountabilityMatrixRecords: {
          [INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE.id]: INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE,
        },
      }
    )

    expect(formatCoerciveProtocolAccountabilityMatrixProjectionLabels(summary, {})).toEqual([])
    expect(
      formatCoerciveProtocolAccountabilityMatrixProjectionLabels(summary, {
        [INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE.id]: INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE,
      })
    ).toEqual([
      'Moral Blamed · Legal Deferred · Institutional Blamed · Public Deferred',
    ])
  })

  it('sorts multiple matrix projection labels by cross-link wired-ref order', () => {
    const welfareDebtRecords = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: {
        ...COERCIVE_RESTRAINT_LEDGER_FIXTURE,
        subjectRef: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.subjectRef,
      },
      [FORCED_SEDATION_CYCLE_FIXTURE.id]: {
        ...FORCED_SEDATION_CYCLE_FIXTURE,
        subjectRef: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.subjectRef,
      },
    }
    const summary = composeEthicsAccountabilityCrossLinksForCoerciveProtocolRecord(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      {
        welfareDebtRecords,
        factionEthicsRecords: {
          [ETHICS_REVIEW_BOARD_MATRIX_FIXTURE.id]: ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
          [PSYCHIATRIC_REVIEW_PANEL_MATRIX_FIXTURE.id]: PSYCHIATRIC_REVIEW_PANEL_MATRIX_FIXTURE,
        },
      }
    )

    expect(formatCoerciveProtocolFactionEthicsProjectionLabels(summary, {
      [ETHICS_REVIEW_BOARD_MATRIX_FIXTURE.id]: ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
      [PSYCHIATRIC_REVIEW_PANEL_MATRIX_FIXTURE.id]: PSYCHIATRIC_REVIEW_PANEL_MATRIX_FIXTURE,
    })).toEqual(['Escalation Required', 'Restricted'])
  })
})
