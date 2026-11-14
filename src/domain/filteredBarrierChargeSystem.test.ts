import { describe, expect, it } from 'vitest'
import {
  type FilteredBarrierChargeRecord,
  validateFilteredBarrierChargeRecord,
  projectFilteredBarrierCharge,
  CHANNEL_FILTER_KINDS,
  REFRESH_CYCLE_KINDS,
  BLOCK_CATEGORIES,
} from './filteredBarrierChargeSystem'

describe('filteredBarrierChargeSystem (SPE-2194 slice 1)', () => {
  const validRecord: FilteredBarrierChargeRecord = {
    id: 'fbc-001',
    label: 'Primary spectral filter',
    barrierRef: 'barrier-site-alpha-1',
    channelFilter: 'spectral',
    chargeRemaining: 42,
    dailyChargeBudget: 100,
    perRoundUpkeep: 5,
    refreshCycle: 'daily',
    blockCategories: ['entity_passage', 'energy_transfer'],
  }

  it('validates a complete bounded record', () => {
    const result = validateFilteredBarrierChargeRecord(validRecord)
    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('rejects missing id', () => {
    const result = validateFilteredBarrierChargeRecord({ ...validRecord, id: '' })
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'missing_id')).toBe(true)
  })

  it('rejects invalid channel filter', () => {
    const result = validateFilteredBarrierChargeRecord({
      ...validRecord,
      channelFilter: 'unknown' as any,
    })
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'invalid_channel_filter')).toBe(true)
  })

  it('rejects negative charge remaining', () => {
    const result = validateFilteredBarrierChargeRecord({
      ...validRecord,
      chargeRemaining: -1,
    })
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'invalid_charge_remaining')).toBe(true)
  })

  it('rejects empty block categories', () => {
    const result = validateFilteredBarrierChargeRecord({
      ...validRecord,
      blockCategories: [],
    })
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'empty_block_categories')).toBe(true)
  })

  it('rejects duplicate block categories', () => {
    const result = validateFilteredBarrierChargeRecord({
      ...validRecord,
      blockCategories: ['entity_passage', 'entity_passage'],
    })
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'duplicate_block_category')).toBe(true)
  })

  it('projects a valid record with derived flags', () => {
    const projection = projectFilteredBarrierCharge(validRecord)
    expect(projection.recordId).toBe('fbc-001')
    expect(projection.hasRemainingCharge).toBe(true)
    expect(projection.budgetExceeded).toBe(false)
    expect(projection.blockCategories).toEqual(['energy_transfer', 'entity_passage'])
  })

  it('covers documented separate budget and upkeep fields', () => {
    const highBudget: FilteredBarrierChargeRecord = {
      ...validRecord,
      chargeRemaining: 150,
      dailyChargeBudget: 100,
      perRoundUpkeep: 10,
    }
    const result = validateFilteredBarrierChargeRecord(highBudget)
    expect(result.valid).toBe(true)
    const projection = projectFilteredBarrierCharge(highBudget)
    expect(projection.budgetExceeded).toBe(true)
    expect(projection.dailyChargeBudget).toBe(100)
    expect(projection.perRoundUpkeep).toBe(10)
  })

  it('exports stable kind unions', () => {
    expect(CHANNEL_FILTER_KINDS).toContain('spectral')
    expect(REFRESH_CYCLE_KINDS).toContain('daily')
    expect(BLOCK_CATEGORIES).toContain('entity_passage')
  })
})
