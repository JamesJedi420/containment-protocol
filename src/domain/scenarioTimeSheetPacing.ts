/**
 * SPE-2224 slice 1: deterministic scenario time-sheet pacing component.
 *
 * Compact authoring structures for scheduled beats, clue windows, actor movement,
 * patrol/event windows, exposure deadlines, irreversible ticks, anomaly cycles,
 * and fatigue intervals. Pure domain; no GameState or real-time engine.
 */

export const WINDOW_KINDS = [
  'beat',
  'clue',
  'actor_movement',
  'patrol',
  'event',
  'exposure_deadline',
  'irreversible_tick',
  'anomaly_cycle',
  'fatigue_interval',
] as const
export type WindowKind = (typeof WINDOW_KINDS)[number]

export interface TimeWindow {
  readonly id: string
  readonly kind: WindowKind
  readonly startTick: number
  readonly endTick: number
  readonly actorRef?: string
  readonly clueRef?: string
  readonly deadlineRef?: string
}

export interface ScenarioTimeSheet {
  readonly id: string
  readonly windows: readonly TimeWindow[]
}

export interface TimeSheetValidationIssue {
  readonly code: string
  readonly field: string
  readonly sheetId?: string
}

export interface TimeSheetValidationResult {
  readonly valid: boolean
  readonly issues: readonly TimeSheetValidationIssue[]
}

const WINDOW_ID = /^window:[a-z0-9]+(?:-[a-z0-9]+)*$/
const SHEET_ID = /^timesheet:[a-z0-9]+(?:-[a-z0-9]+)*$/
const KIND_SET: ReadonlySet<string> = new Set(WINDOW_KINDS)

function compareStrings(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function token(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function freezeWindow(w: TimeWindow): TimeWindow {
  return Object.freeze({ ...w })
}

function issuesResult(issues: TimeSheetValidationIssue[]): TimeSheetValidationResult {
  const ordered = issues
    .slice()
    .sort(
      (a, b) =>
        compareStrings(a.code, b.code) ||
        compareStrings(a.field, b.field) ||
        compareStrings(a.sheetId ?? '', b.sheetId ?? '')
    )
  return Object.freeze({
    valid: ordered.length === 0,
    issues: Object.freeze(ordered.map((issue) => Object.freeze({ ...issue }))),
  })
}

function validateWindow(
  input: unknown,
  index: number,
  issues: TimeSheetValidationIssue[]
): TimeWindow | null {
  const field = `windows[${index}]`
  if (!isPlainRecord(input)) {
    issues.push({ code: 'invalid_window', field })
    return null
  }

  const id = token(input.id)
  const kind = token(input.kind)
  const start = typeof input.startTick === 'number' ? input.startTick : NaN
  const end = typeof input.endTick === 'number' ? input.endTick : NaN
  let legal = true

  if (!WINDOW_ID.test(id)) {
    issues.push({ code: 'invalid_window_id', field: `${field}.id` })
    legal = false
  }
  if (!KIND_SET.has(kind)) {
    issues.push({ code: 'unknown_window_kind', field: `${field}.kind` })
    legal = false
  }
  if (!Number.isInteger(start) || start < 0) {
    issues.push({ code: 'invalid_start_tick', field: `${field}.startTick` })
    legal = false
  }
  if (!Number.isInteger(end) || end <= start) {
    issues.push({ code: 'invalid_end_tick', field: `${field}.endTick` })
    legal = false
  }

  if (!legal) return null

  const window: TimeWindow = {
    id,
    kind: kind as WindowKind,
    startTick: start,
    endTick: end,
    ...(typeof input.actorRef === 'string' ? { actorRef: token(input.actorRef) } : {}),
    ...(typeof input.clueRef === 'string' ? { clueRef: token(input.clueRef) } : {}),
    ...(typeof input.deadlineRef === 'string' ? { deadlineRef: token(input.deadlineRef) } : {}),
  }

  return freezeWindow(window)
}

/**
 * Validate a time sheet. Windows must have unique ids, legal ticks, known kinds.
 * Ordering is by startTick then id for determinism.
 */
export function validateScenarioTimeSheet(input: unknown): TimeSheetValidationResult {
  if (!isPlainRecord(input)) {
    return issuesResult([{ code: 'invalid_sheet', field: 'sheet' }])
  }

  const id = token(input.id)
  const issues: TimeSheetValidationIssue[] = []
  if (!SHEET_ID.test(id)) {
    issues.push({ code: 'invalid_sheet_id', field: 'id' })
  }

  const rawWindows = input.windows
  if (!Array.isArray(rawWindows)) {
    issues.push({ code: 'invalid_windows', field: 'windows', sheetId: id })
    return issuesResult(issues)
  }

  const seen = new Set<string>()
  for (let i = 0; i < rawWindows.length; i += 1) {
    const w = validateWindow(rawWindows[i], i, issues)
    if (!w) continue
    if (seen.has(w.id)) {
      issues.push({ code: 'duplicate_window_id', field: `windows[${i}].id`, sheetId: id })
    }
    seen.add(w.id)
  }

  return issuesResult(issues)
}

/** Frozen normalized sheet sorted by startTick then id. Null if invalid. */
export function normalizeScenarioTimeSheet(input: unknown): ScenarioTimeSheet | null {
  const validation = validateScenarioTimeSheet(input)
  if (!validation.valid) return null
  const sheet = input as ScenarioTimeSheet
  const windows = sheet.windows
    .map((w, i) => validateWindow(w, i, [])!)
    .sort((a, b) => a.startTick - b.startTick || compareStrings(a.id, b.id))
  return Object.freeze({
    id: token(sheet.id),
    windows: Object.freeze(windows),
  })
}

/** Resolve active windows at a given tick. Deterministic order. */
export function activeWindowsAtTick(sheet: ScenarioTimeSheet, tick: number): readonly TimeWindow[] {
  if (!Number.isInteger(tick) || tick < 0) return Object.freeze([])
  const active = sheet.windows.filter((w) => w.startTick <= tick && tick < w.endTick)
  return Object.freeze([...active])
}

/** Authored slice-1 fixtures. */
export const SCENARIO_TIME_SHEET_FIXTURES: readonly ScenarioTimeSheet[] = Object.freeze([
  Object.freeze({
    id: 'timesheet:demo-scenario',
    windows: Object.freeze([
      Object.freeze({
        id: 'window:beat-opening',
        kind: 'beat',
        startTick: 0,
        endTick: 10,
      }),
      Object.freeze({
        id: 'window:clue-window',
        kind: 'clue',
        startTick: 5,
        endTick: 20,
        clueRef: 'clue:evidence-a',
      }),
      Object.freeze({
        id: 'window:patrol',
        kind: 'patrol',
        startTick: 8,
        endTick: 15,
        actorRef: 'actor:guard-1',
      }),
      Object.freeze({
        id: 'window:exposure',
        kind: 'exposure_deadline',
        startTick: 12,
        endTick: 30,
        deadlineRef: 'deadline:exposure-1',
      }),
    ]),
  }),
])
