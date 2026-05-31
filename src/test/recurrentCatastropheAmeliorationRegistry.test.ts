import { describe, expect, it } from 'vitest'
import {
  AMELIORATION_TACTICS,
  CATASTROPHE_FAILURE_MODES,
  IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE,
  PREVENTION_CEILINGS,
  PREVENTION_TACTICS,
  RECURRENCE_CADENCES,
  RECURRENCE_DAMAGE_LEDGER_FIXTURE,
  RECURRENCE_SEVERITY_BANDS,
  projectNextRecurrenceRisk,
  validateRecurrentCatastropheRecord,
  type RecurrentCatastropheRecord,
} from '../domain/recurrentCatastropheAmeliorationRegistry'

function baseRecord(
  overrides: Partial<RecurrentCatastropheRecord> = {}
): RecurrentCatastropheRecord {
  return {
    id: 'recurrent-catastrophe:test-base',
    label: 'Test recurrent catastrophe record',
    recurrenceCadence: 'monthly',
    failureMode: 'manifestation',
    preventionCeiling: 'unknown',
    ameliorationTactics: [{ tactic: 'shielding', active: true }],
    recurrenceCount: 0,
    ...overrides,
  }
}

describe('recurrentCatastropheAmeliorationRegistry (SPE-2117 slice 1)', () => {
  it('validates impossible prevention with active dampening and repair_budget tactics', () => {
    const result = validateRecurrentCatastropheRecord(IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE)

    expect(result.valid).toBe(true)
    expect(IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE.preventionCeiling).toBe('impossible')
    expect(
      IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE.ameliorationTactics.filter((entry) => entry.active)
    ).toEqual([
      { tactic: 'effect_dampening', active: true },
      { tactic: 'repair_budget', active: true },
    ])
  })

  it('validates recurrence history with damage ledger refs', () => {
    const result = validateRecurrentCatastropheRecord(RECURRENCE_DAMAGE_LEDGER_FIXTURE)

    expect(result.valid).toBe(true)
    expect(RECURRENCE_DAMAGE_LEDGER_FIXTURE.recurrenceCount).toBe(3)
    expect(RECURRENCE_DAMAGE_LEDGER_FIXTURE.damageLedgerRefs).toHaveLength(3)
  })

  it('projects higher recurrence risk when recurrenceCount increases with ledger history', () => {
    const baseline = projectNextRecurrenceRisk(IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE, {
      currentWeek: 52,
    })
    const elevated = projectNextRecurrenceRisk(RECURRENCE_DAMAGE_LEDGER_FIXTURE, {
      currentWeek: 52,
    })

    expect(baseline.recurrenceRiskScore).not.toBeNull()
    expect(elevated.recurrenceRiskScore).not.toBeNull()
    expect(elevated.recurrenceRiskScore!).toBeGreaterThan(baseline.recurrenceRiskScore!)
    expect(elevated.severityBand).not.toBe('dormant')
  })

  it('errors when active prevention tactic is set with impossible prevention ceiling', () => {
    const result = validateRecurrentCatastropheRecord(
      baseRecord({
        preventionCeiling: 'impossible',
        preventionTactics: [{ tactic: 'permanent_seal', active: true }],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'active_prevention_when_ceiling_impossible',
        severity: 'error',
      }),
    ])
  })

  it('warns when recurrenceCount is positive without damage ledger refs', () => {
    const result = validateRecurrentCatastropheRecord(
      baseRecord({
        recurrenceCount: 2,
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'recurrence_without_damage_ledger',
        severity: 'warning',
      }),
    ])
  })

  it('errors on franchise token in record label', () => {
    const result = validateRecurrentCatastropheRecord(
      baseRecord({
        label: 'Foundation breach recurrence cycle',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_label')).toBe(true)
  })

  it('errors on branded object number in record id', () => {
    const result = validateRecurrentCatastropheRecord(
      baseRecord({
        id: 'recurrent-catastrophe:SCP-682-cycle',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'branded_object_number_in_id')).toBe(true)
  })

  it('returns byte-stable validation results on repeated calls', () => {
    const first = validateRecurrentCatastropheRecord(IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE)
    const second = validateRecurrentCatastropheRecord(IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE)

    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it('errors when ameliorationTactics is not an array', () => {
    const result = validateRecurrentCatastropheRecord(
      baseRecord({
        ameliorationTactics: undefined as unknown as RecurrentCatastropheRecord['ameliorationTactics'],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'invalid_amelioration_tactics')).toBe(true)
  })

  it('redacts confidence when policy requests unknown redaction', () => {
    const projection = projectNextRecurrenceRisk(
      {
        ...RECURRENCE_DAMAGE_LEDGER_FIXTURE,
        unknownFields: ['confidence'],
      },
      {
        redactUnknown: true,
      }
    )

    expect(projection.confidence).toBeNull()
    expect(projection.redacted).toBe(true)
  })

  it('exports stable union catalogs', () => {
    expect(RECURRENCE_CADENCES).toEqual(['weekly', 'monthly', 'seasonal', 'annual', 'irregular'])
    expect(CATASTROPHE_FAILURE_MODES).toEqual(['breach', 'manifestation', 'cascade'])
    expect(PREVENTION_CEILINGS).toEqual(['impossible', 'cost_prohibitive', 'unknown'])
    expect(AMELIORATION_TACTICS).toEqual([
      'shielding',
      'evacuation',
      'effect_dampening',
      'repair_budget',
      'narrative_containment',
    ])
    expect(PREVENTION_TACTICS).toEqual(['neutralization', 'source_elimination', 'permanent_seal'])
    expect(RECURRENCE_SEVERITY_BANDS).toEqual(['dormant', 'elevated', 'imminent', 'critical'])
  })
})
