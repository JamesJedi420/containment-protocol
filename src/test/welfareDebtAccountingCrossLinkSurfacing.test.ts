import { describe, expect, it } from 'vitest'
import { ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE } from '../domain/coerciveContainedPersonProtocolRegistry'
import { INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE } from '../domain/containedPersonIntegratedHealthBundleRegistry'
import { ETHICS_REVIEW_BOARD_MATRIX_FIXTURE } from '../domain/factionEthicsMatrixRegistry'
import { INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE } from '../domain/moralLegalAccountabilityMatrixRegistry'
import {
  composeAllWelfareDebtAccountingCrossLinkSummaries,
  formatWelfareDebtAccountingCrossLinkNoteContent,
} from '../domain/welfareDebtAccountingCrossLinkSurfacing'
import { buildWeeklyWelfareDebtAccountingCrossLinkReportNotes } from '../domain/welfareDebtAccountingCrossLinkWeeklyReportNotes'
import {
  composeWelfareDebtAccountingCrossLinksForRecord,
  formatWelfareDebtAccountingCrossLinkLabels,
} from '../domain/welfareDebtAccountingCrossLinks'
import { COERCIVE_RESTRAINT_LEDGER_FIXTURE } from '../domain/welfareDebtAccountingRegistry'

describe('welfareDebtAccountingCrossLinkSurfacing (SPE-1888 slice 8)', () => {
  it('no-ops compose summaries when records map is empty', () => {
    expect(
      composeAllWelfareDebtAccountingCrossLinkSummaries({
        records: {},
        bundles: {
          [INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE.id]:
            INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE,
        },
      })
    ).toEqual([])
  })

  it('no-ops compose summaries when all sibling maps are empty', () => {
    expect(
      composeAllWelfareDebtAccountingCrossLinkSummaries({
        records: {
          [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
        },
        bundles: {},
        coerciveProtocolRecords: {},
        factionEthicsRecords: {},
        accountabilityMatrixRecords: {},
      })
    ).toEqual([])
  })

  it('formats weekly note content from audit line with welfare-debt prefix', () => {
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
    expect(formatWelfareDebtAccountingCrossLinkNoteContent(summary!)).toContain(
      'Welfare-debt cross-link'
    )
    expect(formatWelfareDebtAccountingCrossLinkNoteContent(summary!)).toContain(
      COERCIVE_RESTRAINT_LEDGER_FIXTURE.id
    )
  })

  it('formats weekly note content with matrix projection labels when maps are hydrated', () => {
    const factionEthicsRecords = {
      [ETHICS_REVIEW_BOARD_MATRIX_FIXTURE.id]: ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
    }
    const accountabilityMatrixRecords = {
      [INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE.id]: INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE,
    }
    const summary = composeWelfareDebtAccountingCrossLinksForRecord(
      COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      { factionEthicsRecords, accountabilityMatrixRecords }
    )

    expect(summary).not.toBeNull()
    expect(
      formatWelfareDebtAccountingCrossLinkNoteContent(summary!, {
        factionEthicsRecords,
        accountabilityMatrixRecords,
      })
    ).toContain('Escalation Required')
    expect(
      formatWelfareDebtAccountingCrossLinkNoteContent(summary!, {
        factionEthicsRecords,
        accountabilityMatrixRecords,
      })
    ).toContain('Moral Blamed')
  })

  it('builds weekly report notes when cross-linked maps coexist', () => {
    const bundles = {
      [INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE.id]:
        INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE,
    }
    const records = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
    }
    const summary = composeWelfareDebtAccountingCrossLinksForRecord(
      COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      { bundles }
    )

    const notes = buildWeeklyWelfareDebtAccountingCrossLinkReportNotes({
      nextRecords: records,
      nextBundles: bundles,
      nextCoerciveProtocolRecords: {},
      week: 3,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('welfare_debt.accounting_cross_link')
    expect(notes[0]?.content).toBe(formatWelfareDebtAccountingCrossLinkNoteContent(summary!))
    expect(notes[0]?.metadata?.crossLinkLabels).toEqual(
      formatWelfareDebtAccountingCrossLinkLabels(summary!)
    )
  })

  it('no-ops weekly report notes when only welfare-debt records exist', () => {
    expect(
      buildWeeklyWelfareDebtAccountingCrossLinkReportNotes({
        nextRecords: {
          [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
        },
        nextBundles: {},
        nextCoerciveProtocolRecords: {},
        factionEthicsRecords: {},
        accountabilityMatrixRecords: {},
        week: 4,
        sequenceStart: 1,
      })
    ).toEqual([])
  })

  it('surfaces matrix cross-links when only persisted matrix maps coexist', () => {
    const records = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
    }
    const factionEthicsRecords = {
      [ETHICS_REVIEW_BOARD_MATRIX_FIXTURE.id]: ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
    }
    const accountabilityMatrixRecords = {
      [INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE.id]: INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE,
    }
    const summary = composeWelfareDebtAccountingCrossLinksForRecord(
      COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      { factionEthicsRecords, accountabilityMatrixRecords }
    )

    const notes = buildWeeklyWelfareDebtAccountingCrossLinkReportNotes({
      nextRecords: records,
      nextBundles: {},
      nextCoerciveProtocolRecords: {},
      factionEthicsRecords,
      accountabilityMatrixRecords,
      week: 6,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('welfare_debt.accounting_cross_link')
    expect(notes[0]?.content).toBe(
      formatWelfareDebtAccountingCrossLinkNoteContent(summary!, {
        factionEthicsRecords,
        accountabilityMatrixRecords,
      })
    )
    expect(notes[0]?.metadata?.crossLinkLabels).toEqual(
      formatWelfareDebtAccountingCrossLinkLabels(summary!)
    )
    expect(notes[0]?.metadata?.crossLinkLabels).toEqual(
      expect.arrayContaining([
        'faction-ethics:faction-ethics:ethics-review-board-routing',
        'accountability-matrix:accountability-matrix:independent-welfare-audit',
      ])
    )
    expect(notes[0]?.metadata?.projectionLabels).toEqual(
      expect.arrayContaining([
        'Escalation Required',
        'Moral Blamed · Legal Deferred · Institutional Blamed · Public Deferred',
      ])
    )
    expect(notes[0]?.content).toContain('Escalation Required')
    expect(notes[0]?.content).toContain(
      'Moral Blamed · Legal Deferred · Institutional Blamed · Public Deferred'
    )
  })

  it('surfaces coercive protocol cross-links when protocol map coexists', () => {
    const records = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: {
        ...COERCIVE_RESTRAINT_LEDGER_FIXTURE,
        subjectRef: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.subjectRef,
      },
    }
    const protocols = {
      [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
    }

    const notes = buildWeeklyWelfareDebtAccountingCrossLinkReportNotes({
      nextRecords: records,
      nextBundles: {},
      nextCoerciveProtocolRecords: protocols,
      week: 5,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.metadata?.coerciveProtocolLinkCount).toBe(1)
  })
})
