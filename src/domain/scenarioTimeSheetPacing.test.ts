import { describe, expect, it } from 'vitest'
import {
  activeWindowsAtTick,
  normalizeScenarioTimeSheet,
  SCENARIO_TIME_SHEET_FIXTURES,
  validateScenarioTimeSheet,
} from './scenarioTimeSheetPacing'

describe('scenarioTimeSheetPacing', () => {
  const fixture = SCENARIO_TIME_SHEET_FIXTURES[0]

  it('validates a multi-window time sheet', () => {
    const result = validateScenarioTimeSheet(fixture)
    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([])
  })

  it('rejects missing mandatory structure', () => {
    const result = validateScenarioTimeSheet({ id: 'bad' })
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'invalid_sheet_id')).toBe(true)
  })

  it('rejects invalid end tick', () => {
    const bad = {
      id: 'timesheet:bad',
      windows: [{ id: 'window:x', kind: 'beat', startTick: 10, endTick: 5 }],
    }
    const result = validateScenarioTimeSheet(bad)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'invalid_end_tick')).toBe(true)
  })

  it('normalizes and orders deterministically', () => {
    const normalized = normalizeScenarioTimeSheet(fixture)
    expect(normalized).not.toBeNull()
    expect(normalized!.windows.map((w) => w.id)).toEqual([
      'window:beat-opening',
      'window:clue-window',
      'window:patrol',
      'window:exposure',
    ])
  })

  it('resolves active windows at tick', () => {
    const normalized = normalizeScenarioTimeSheet(fixture)!
    const at5 = activeWindowsAtTick(normalized, 5)
    expect(at5.map((w) => w.id).sort()).toEqual(['window:beat-opening', 'window:clue-window'])
    const at13 = activeWindowsAtTick(normalized, 13)
    expect(at13.map((w) => w.kind)).toContain('exposure_deadline')
    expect(at13.map((w) => w.kind)).toContain('patrol')
  })

  it('covers deadline expiry and activation', () => {
    const normalized = normalizeScenarioTimeSheet(fixture)!
    const before = activeWindowsAtTick(normalized, 11)
    const after = activeWindowsAtTick(normalized, 12)
    expect(before.some((w) => w.kind === 'exposure_deadline')).toBe(false)
    expect(after.some((w) => w.kind === 'exposure_deadline')).toBe(true)
    const expired = activeWindowsAtTick(normalized, 30)
    expect(expired.some((w) => w.kind === 'exposure_deadline')).toBe(false)
  })
})
