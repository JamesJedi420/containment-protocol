import { describe, expect, it } from 'vitest'
import type { TimeWindow } from './scenarioTimeSheetPacing'
import {
  activeWindowsAtTick,
  normalizeScenarioTimeSheet,
  SCENARIO_TIME_SHEET_FIXTURES,
  validateScenarioTimeSheet,
  WINDOW_KINDS,
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

  it.each([null, true, false, '', '3', {}, Symbol('tick'), Infinity, NaN, 1.5, -1])(
    'rejects non-numeric or invalid authored ticks (%s) without coercion or exceptions',
    (tick) => {
      for (const field of ['startTick', 'endTick']) {
        const input = {
          id: 'timesheet:bad-tick',
          windows: [{ id: 'window:bad', kind: 'beat', startTick: 0, endTick: 5, [field]: tick }],
        }
        expect(validateScenarioTimeSheet(input).valid).toBe(false)
        expect(normalizeScenarioTimeSheet(input)).toBeNull()
      }
    }
  )

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

  it('preserves trimmed optional references without adding omitted fields', () => {
    const normalized = normalizeScenarioTimeSheet({
      id: 'timesheet:refs',
      windows: [
        {
          id: 'window:all',
          kind: 'beat',
          startTick: 0,
          endTick: 1,
          actorRef: ' actor:guard ',
          clueRef: ' clue:evidence ',
          deadlineRef: ' deadline:exposure ',
        },
        { id: 'window:none', kind: 'beat', startTick: 0, endTick: 1 },
      ],
    })!
    expect(normalized.windows[0]).toEqual({
      id: 'window:all',
      kind: 'beat',
      startTick: 0,
      endTick: 1,
      actorRef: 'actor:guard',
      clueRef: 'clue:evidence',
      deadlineRef: 'deadline:exposure',
    })
    expect(normalized.windows[1]).not.toHaveProperty('actorRef')
    expect(normalized.windows[1]).not.toHaveProperty('clueRef')
    expect(normalized.windows[1]).not.toHaveProperty('deadlineRef')
  })

  it.each(['actorRef', 'clueRef', 'deadlineRef'])(
    'rejects malformed supplied %s rather than silently dropping its link',
    (ref) => {
      for (const value of [42, null, false, {}, '', '  ']) {
        const input = {
          id: 'timesheet:refs',
          windows: [{ id: 'window:ref', kind: 'patrol', startTick: 0, endTick: 5, [ref]: value }],
        }
        expect(validateScenarioTimeSheet(input)).toMatchObject({
          valid: false,
          issues: [expect.objectContaining({ field: `windows[0].${ref}` })],
        })
        expect(normalizeScenarioTimeSheet(input)).toBeNull()
      }
      expect(
        validateScenarioTimeSheet({
          id: 'timesheet:refs',
          windows: [
            { id: 'window:ref', kind: 'patrol', startTick: 0, endTick: 5, [ref]: undefined },
          ],
        }).valid
      ).toBe(true)
    }
  )

  it('orders direct resolution of equivalent authored sheets without normalizing first', () => {
    const windows: TimeWindow[] = [
      { id: 'window:z', kind: 'beat', startTick: 1, endTick: 5 },
      { id: 'window:b', kind: 'beat', startTick: 0, endTick: 5 },
      { id: 'window:a', kind: 'beat', startTick: 0, endTick: 5 },
    ]
    const before = structuredClone(windows)
    const input = { id: 'timesheet:direct', windows }
    const active = activeWindowsAtTick(input, 2)
    expect(active.map((w) => w.id)).toEqual(['window:a', 'window:b', 'window:z'])
    expect(activeWindowsAtTick({ ...input, windows: [...windows].reverse() }, 2)).toEqual(active)
    expect(windows).toEqual(before)
    expect(Object.isFrozen(active)).toBe(true)
  })

  it('attributes an invalid start and a valid end only to the invalid start field', () => {
    const input = {
      id: 'timesheet:diagnostic',
      windows: [{ id: 'window:diagnostic', kind: 'beat', startTick: null, endTick: 5 }],
    }
    expect(validateScenarioTimeSheet(input)).toEqual({
      valid: false,
      issues: [{ code: 'invalid_start_tick', field: 'windows[0].startTick' }],
    })
    expect(normalizeScenarioTimeSheet(input)).toBeNull()
  })

  it('orders shuffled and tied windows without mutating authoring input', () => {
    const windows = [
      { id: 'window:z', kind: 'beat', startTick: 3, endTick: 8 },
      { id: 'window:b', kind: 'beat', startTick: 1, endTick: 8 },
      { id: 'window:a', kind: 'beat', startTick: 1, endTick: 8 },
    ]
    const input = { id: 'timesheet:order', windows }
    const before = structuredClone(input)
    const normalized = normalizeScenarioTimeSheet(input)!
    expect(input).toEqual(before)
    expect(normalized.windows.map((w) => w.id)).toEqual(['window:a', 'window:b', 'window:z'])
    expect(normalizeScenarioTimeSheet({ ...input, windows: [...windows].reverse() })).toEqual(
      normalized
    )
    expect(activeWindowsAtTick(normalized, 4).map((w) => w.id)).toEqual([
      'window:a',
      'window:b',
      'window:z',
    ])
    expect(Object.isFrozen(normalized)).toBe(true)
    expect(Object.isFrozen(normalized.windows)).toBe(true)
    expect(normalized.windows.every(Object.isFrozen)).toBe(true)
    windows[0].startTick = 7
    expect(normalized.windows[2].startTick).toBe(3)
  })

  it('resolves patrol and clue references at inclusive starts and exclusive ends', () => {
    const sheet = normalizeScenarioTimeSheet(fixture)!
    expect(activeWindowsAtTick(sheet, 7).some((w) => w.actorRef === 'actor:guard-1')).toBe(false)
    expect(activeWindowsAtTick(sheet, 8).find((w) => w.kind === 'patrol')?.actorRef).toBe(
      'actor:guard-1'
    )
    expect(activeWindowsAtTick(sheet, 14).some((w) => w.kind === 'patrol')).toBe(true)
    expect(activeWindowsAtTick(sheet, 15).some((w) => w.kind === 'patrol')).toBe(false)
    expect(activeWindowsAtTick(sheet, 19).find((w) => w.kind === 'clue')?.clueRef).toBe(
      'clue:evidence-a'
    )
    expect(activeWindowsAtTick(sheet, 20).some((w) => w.kind === 'clue')).toBe(false)
    expect(
      activeWindowsAtTick(sheet, 12).find((w) => w.kind === 'exposure_deadline')?.deadlineRef
    ).toBe('deadline:exposure-1')
  })

  it('supports every authored window kind including fatigue and anomaly intervals', () => {
    const sheet = normalizeScenarioTimeSheet({
      id: 'timesheet:kinds',
      windows: WINDOW_KINDS.map((kind) => ({
        id: `window:${kind.replaceAll('_', '-')}`,
        kind,
        startTick: 1,
        endTick: 2,
      })),
    })!
    expect(
      activeWindowsAtTick(sheet, 1)
        .map((w) => w.kind)
        .sort()
    ).toEqual([...WINDOW_KINDS].sort())
    expect(activeWindowsAtTick(sheet, 2)).toEqual([])
  })

  it('rejects duplicate identities and invalid sheets without producing normalized data', () => {
    const duplicate = {
      id: 'timesheet:duplicate',
      windows: [fixture.windows[0], fixture.windows[0]],
    }
    expect(validateScenarioTimeSheet(duplicate).issues).toContainEqual({
      code: 'duplicate_window_id',
      field: 'windows[1].id',
      sheetId: 'timesheet:duplicate',
    })
    for (const input of [null, {}, duplicate, { id: 'timesheet:bad', windows: [null] }]) {
      expect(validateScenarioTimeSheet(input).valid).toBe(false)
      expect(normalizeScenarioTimeSheet(input)).toBeNull()
    }
  })

  it('does not resolve fractional, negative or non-finite query ticks', () => {
    for (const tick of [-1, 0.5, NaN, Infinity])
      expect(activeWindowsAtTick(fixture, tick)).toEqual([])
  })
})
