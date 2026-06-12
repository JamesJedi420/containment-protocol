import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE } from '../../domain/containedPersonIntegratedHealthBundleRegistry'
import {
  COERCIVE_RESTRAINT_LEDGER_FIXTURE,
  FORCED_SEDATION_CYCLE_FIXTURE,
  projectWelfareDebtAccounting,
  validateWelfareDebtAccountingRecord,
  type WelfareDebtAccountingRecord,
} from '../../domain/welfareDebtAccountingRegistry'
import {
  formatWelfareDebtAccountingEnumLabel,
  getWelfareDebtAccountingMirrorView,
} from './welfareDebtAccountingMirrorView'

function warningOnlyRecord(): WelfareDebtAccountingRecord {
  return {
    id: 'welfare-debt:warning-only-escalated',
    label: 'Escalated welfare debt without mitigation path',
    subjectRef: 'subject:warning-only',
    debtCategory: 'coerced_medication',
    severityBand: 'critical',
    mitigationState: 'escalated',
    sourceProcedureLabel: 'forced sedation stabilization cycle',
    reviewOwnerLabel: 'psychiatric review panel',
    containmentBenefitScore: 0.64,
  }
}

describe('welfareDebtAccountingMirrorView (SPE-1888 slice 2)', () => {
  it('returns empty mirror when welfareDebtAccountingRecords map is empty', () => {
    const game = createStartingState()

    expect(game.welfareDebtAccountingRecords).toEqual({})

    const view = getWelfareDebtAccountingMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.records).toEqual([])
  })

  it('mirrors severity, mitigation state, and containment benefit from hydrated records', () => {
    const game = createStartingState()
    game.welfareDebtAccountingRecords = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
    }

    const view = getWelfareDebtAccountingMirrorView(game)
    const record = view.records[0]
    const projection = projectWelfareDebtAccounting(COERCIVE_RESTRAINT_LEDGER_FIXTURE)

    expect(view.isEmpty).toBe(false)
    expect(view.summary.unresolvedCount).toBe(1)
    expect(record?.severityBandLabel).toBe('High')
    expect(record?.mitigationStateLabel).toBe('Unresolved')
    expect(record?.sourceProcedureLabel).toBe('extended mechanical restraint cycle')
    expect(record?.reviewOwnerLabel).toBe('ethics review board')
    expect(record?.containmentBenefitScoreLabel).toBe(projection.containmentBenefitScore?.toFixed(2))
  })

  it('counts unresolved, escalated, and mitigated records in summary', () => {
    const mitigatedRecord: WelfareDebtAccountingRecord = {
      id: 'welfare-debt:mitigated-entry',
      label: 'Mitigated welfare debt entry',
      subjectRef: 'subject:mitigated',
      debtCategory: 'privilege_deprivation',
      severityBand: 'moderate',
      mitigationState: 'mitigated',
      sourceProcedureLabel: 'privilege suspension cycle',
      reviewOwnerLabel: 'ethics review board',
      mitigationPathLabel: 'restored visitation rights',
      containmentBenefitScore: 0.42,
    }

    const game = createStartingState()
    game.welfareDebtAccountingRecords = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      [FORCED_SEDATION_CYCLE_FIXTURE.id]: FORCED_SEDATION_CYCLE_FIXTURE,
      [mitigatedRecord.id]: mitigatedRecord,
    }

    const view = getWelfareDebtAccountingMirrorView(game)

    expect(view.summary.unresolvedCount).toBe(1)
    expect(view.summary.escalatedCount).toBe(1)
    expect(view.summary.mitigatedCount).toBe(1)
  })

  it('still mirrors warning-only records with validation warning labels', () => {
    const warningRecord = warningOnlyRecord()
    expect(validateWelfareDebtAccountingRecord(warningRecord).valid).toBe(true)

    const game = createStartingState()
    game.welfareDebtAccountingRecords = {
      [warningRecord.id]: warningRecord,
    }

    const view = getWelfareDebtAccountingMirrorView(game)
    const record = view.records[0]

    expect(view.summary.totalRecords).toBe(1)
    expect(record?.validationWarningLabels.length).toBe(1)
    expect(record?.mitigationPathLabel).toBe('—')
    expect(record?.mitigationStateLabel).toBe('Escalated')
  })

  it('shows dash placeholders for redacted containment benefit scores', () => {
    const redactedRecord: WelfareDebtAccountingRecord = {
      ...COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      id: 'welfare-debt:redacted-benefit',
      redactedFields: ['containmentBenefitScore'],
    }

    const game = createStartingState()
    game.welfareDebtAccountingRecords = {
      [redactedRecord.id]: redactedRecord,
    }

    const view = getWelfareDebtAccountingMirrorView(game)
    const record = view.records[0]

    expect(record?.containmentBenefitScoreLabel).toBe('—')
    expect(record?.redacted).toBe(true)
  })

  it('orders records by id and is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.welfareDebtAccountingRecords = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      [FORCED_SEDATION_CYCLE_FIXTURE.id]: FORCED_SEDATION_CYCLE_FIXTURE,
    }

    const view = getWelfareDebtAccountingMirrorView(game)

    expect(view.records.map((record) => record.id)).toEqual([
      COERCIVE_RESTRAINT_LEDGER_FIXTURE.id,
      FORCED_SEDATION_CYCLE_FIXTURE.id,
    ])

    const first = JSON.stringify(getWelfareDebtAccountingMirrorView(game))
    const second = JSON.stringify(getWelfareDebtAccountingMirrorView(game))

    expect(first).toBe(second)
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatWelfareDebtAccountingEnumLabel('harmful_restraint')).toBe('Harmful Restraint')
    expect(formatWelfareDebtAccountingEnumLabel('unresolved')).toBe('Unresolved')
  })

  it('surfaces ledger cross-link labels when integrated health bundles coexist', () => {
    const game = createStartingState()
    game.welfareDebtAccountingRecords = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
    }
    game.containedPersonIntegratedHealthBundles = {
      [INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE.id]:
        INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE,
    }

    const view = getWelfareDebtAccountingMirrorView(game)
    const record = view.records[0]

    expect(view.summary.crossLinkedCount).toBe(1)
    expect(record?.crossLinkLabels.some((label) => label.startsWith('integrated-health:'))).toBe(
      true
    )
    expect(record?.crossLinkLabels.some((label) => label.startsWith('review_owner:'))).toBe(true)
  })
})
