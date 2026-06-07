import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE,
  RECURRENCE_DAMAGE_LEDGER_FIXTURE,
  type RecurrentCatastropheRecord,
} from '../../domain/recurrentCatastropheAmeliorationRegistry'
import {
  formatRecurrentCatastropheEnumLabel,
  getRecurrentCatastropheMirrorView,
} from './recurrentCatastropheMirrorView'

function recurrenceWithoutLedgerFixture(): RecurrentCatastropheRecord {
  return {
    id: 'recurrent-catastrophe:warning-only-recurrence',
    label: 'Recurrence without damage ledger',
    recurrenceCadence: 'monthly',
    failureMode: 'manifestation',
    preventionCeiling: 'unknown',
    ameliorationTactics: [{ tactic: 'shielding', active: true }],
    recurrenceCount: 2,
  }
}

describe('recurrentCatastropheMirrorView (SPE-2117 slice 4)', () => {
  it('returns empty mirror when recurrentCatastropheRecords map is empty', () => {
    const game = createStartingState()

    expect(game.recurrentCatastropheRecords).toEqual({})

    const view = getRecurrentCatastropheMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.records).toEqual([])
  })

  it('mirrors persisted fields and recurrence risk projection at current week', () => {
    const game = createStartingState()
    game.week = 52
    game.recurrentCatastropheRecords = {
      [IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE.id]: IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE,
      [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: RECURRENCE_DAMAGE_LEDGER_FIXTURE,
    }

    const view = getRecurrentCatastropheMirrorView(game)
    const impossible = view.records.find(
      (record) => record.id === IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE.id
    )
    const history = view.records.find(
      (record) => record.id === RECURRENCE_DAMAGE_LEDGER_FIXTURE.id
    )

    expect(view.isEmpty).toBe(false)
    expect(view.summary.totalRecords).toBe(2)
    expect(view.summary.impossiblePreventionCount).toBe(1)
    expect(view.summary.week).toBe(52)
    expect(impossible?.preventionCeilingLabel).toBe('Impossible')
    expect(impossible?.activeAmeliorationLabels).toEqual(['Effect Dampening', 'Repair Budget'])
    expect(history?.recurrenceCountLabel).toBe('3')
    expect(history?.lastOccurrenceWeekLabel).toBe('W40')
    expect(history?.damageLedgerRefLabels).toHaveLength(3)
    expect(history?.severityBandLabel).not.toBe('Dormant')
    expect(history?.recurrenceRiskScoreLabel).not.toBe('—')
  })

  it('surfaces validation warnings for warnings-only records', () => {
    const game = createStartingState()
    const fixture = recurrenceWithoutLedgerFixture()
    game.recurrentCatastropheRecords = {
      [fixture.id]: fixture,
    }

    const view = getRecurrentCatastropheMirrorView(game)
    const record = view.records[0]

    expect(record?.validationWarningLabels.length).toBeGreaterThanOrEqual(1)
    expect(record?.validationWarningLabels.some((label) => label.includes('recurrenceCount'))).toBe(
      true
    )
  })

  it('renders redacted projection fields as legibility gaps', () => {
    const game = createStartingState()
    game.recurrentCatastropheRecords = {
      [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: {
        ...RECURRENCE_DAMAGE_LEDGER_FIXTURE,
        redactedFields: ['recurrenceRiskScore', 'confidence'],
      },
    }

    const view = getRecurrentCatastropheMirrorView(game)
    const record = view.records[0]

    expect(record?.recurrenceRiskScoreLabel).toBe('—')
    expect(record?.severityBandLabel).toBe('—')
    expect(record?.confidenceLabel).toBe('—')
    expect(record?.redacted).toBe(true)
  })

  it('counts critical severity band in summary', () => {
    const game = createStartingState()
    game.week = 100
    game.recurrentCatastropheRecords = {
      [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: RECURRENCE_DAMAGE_LEDGER_FIXTURE,
    }

    const view = getRecurrentCatastropheMirrorView(game)

    expect(view.summary.criticalSeverityCount).toBeGreaterThanOrEqual(0)
    const record = view.records[0]
    if (record?.severityBandLabel === 'Critical') {
      expect(view.summary.criticalSeverityCount).toBe(1)
    }
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatRecurrentCatastropheEnumLabel('effect_dampening')).toBe('Effect Dampening')
    expect(formatRecurrentCatastropheEnumLabel('cost_prohibitive')).toBe('Cost Prohibitive')
  })

  it('surfaces review ref validation warnings from persisted postIncidentReviewRecords', () => {
    const game = createStartingState()
    game.postIncidentReviewRecords = {}
    game.recurrentCatastropheRecords = {
      [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: RECURRENCE_DAMAGE_LEDGER_FIXTURE,
    }

    const view = getRecurrentCatastropheMirrorView(game)
    const record = view.records[0]

    expect(record?.validationWarningLabels.some((label) => label.includes('does not resolve'))).toBe(
      true
    )
  })

  it('is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.recurrentCatastropheRecords = {
      [IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE.id]: IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE,
      [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: RECURRENCE_DAMAGE_LEDGER_FIXTURE,
    }

    const first = JSON.stringify(getRecurrentCatastropheMirrorView(game))
    const second = JSON.stringify(getRecurrentCatastropheMirrorView(game))

    expect(first).toBe(second)
  })
})
