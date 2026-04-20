import {
  advanceProgressClock as advanceProgressClockState,
  getProgressClock as getProgressClockState,
  readGameStateManager,
  setProgressClock as setProgressClockState,
} from './gameStateManager'
import type { GameState, ProgressClockState } from './models'

export const PROGRESS_CLOCK_IDS = {
  breachFollowUpPosture: 'containment.breach.followup.posture',
  incidentBreach: 'incident.chain.breach',
  storyBreachDepth: 'story.breach-depth',
} as const

export interface ProgressClockDefinition {
  id: string
  label: string
  max: number
  hidden?: boolean
  description?: string
  tags?: readonly string[]
}

export type ProgressClockDefaults = Partial<Pick<ProgressClockState, 'label' | 'max' | 'hidden'>>

export interface ProgressClockView extends ProgressClockState {
  completed: boolean
  remaining: number
  progressRatio: number
  visibility: 'hidden' | 'visible'
  description?: string
  tags: string[]
}

export interface ProgressClockCondition {
  clockId: string
  minValue?: number
  maxValue?: number
  /**
   * Author-friendly threshold alias. Equivalent to `minValue`, but reads more
   * clearly when a trigger or route unlocks at a specific segment count.
   */
  threshold?: number
  completed?: boolean
  hidden?: boolean
}

export interface ProgressClockConditionEvaluation {
  clockId: string
  exists: boolean
  passes: boolean
  currentValue: number
  max: number
  completed: boolean
  hidden: boolean
  failedChecks: Array<'missing' | 'min' | 'max' | 'threshold' | 'completed' | 'hidden'>
}

const AUTHORED_PROGRESS_CLOCKS: readonly ProgressClockDefinition[] = [
  {
    id: PROGRESS_CLOCK_IDS.breachFollowUpPosture,
    label: 'Breach Follow-Up Posture',
    max: 3,
    description:
      'Tracks how deeply the agency commits to a breach response posture before the next follow-up stage.',
    tags: ['frontdesk', 'breach', 'posture'],
  },
  {
    id: PROGRESS_CLOCK_IDS.incidentBreach,
    label: 'Breach Chain',
    max: 4,
    description: 'Story-facing breach chain progress used by authored follow-ups and report surfaces.',
    tags: ['incident', 'breach'],
  },
  {
    id: PROGRESS_CLOCK_IDS.storyBreachDepth,
    label: 'Breach Depth',
    max: 4,
    description: 'Generic breach-depth clock for authored/runtime testing and follow-up routing.',
    tags: ['story', 'breach'],
  },
] as const

const AUTHORED_PROGRESS_CLOCK_MAP = new Map(
  AUTHORED_PROGRESS_CLOCKS.map((definition) => [definition.id, definition])
)

function normalizeClockId(value: string | ProgressClockDefinition | undefined | null) {
  if (typeof value === 'string') {
    return value.trim()
  }

  return typeof value?.id === 'string' ? value.id.trim() : ''
}

function sanitizeClockInteger(value: number | undefined, fallback: number, min = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return Math.max(min, Math.trunc(fallback))
  }

  return Math.max(min, Math.trunc(value))
}

function normalizeClockDefinition(
  source: string | ProgressClockDefinition
): ProgressClockDefinition | undefined {
  if (typeof source !== 'string') {
    return source
  }

  return AUTHORED_PROGRESS_CLOCK_MAP.get(source.trim())
}

function resolveClockDefaults(
  source: string | ProgressClockDefinition,
  overrides?: ProgressClockDefaults
): ProgressClockDefaults | undefined {
  const definition = normalizeClockDefinition(source)
  const next: ProgressClockDefaults = {
    ...(definition ? { label: definition.label, max: definition.max } : {}),
    ...(definition && definition.hidden !== undefined ? { hidden: definition.hidden } : {}),
    ...(overrides?.label !== undefined ? { label: overrides.label } : {}),
    ...(overrides?.max !== undefined ? { max: overrides.max } : {}),
    ...(overrides?.hidden !== undefined ? { hidden: overrides.hidden } : {}),
  }

  return Object.keys(next).length > 0 ? next : undefined
}

function resolveAdvanceClockDefaults(
  source: string | ProgressClockDefinition,
  overrides?: ProgressClockDefaults
) {
  const defaults = resolveClockDefaults(source, overrides)

  if (defaults?.label === undefined || defaults.max === undefined) {
    return undefined
  }

  return {
    label: defaults.label,
    max: defaults.max,
    ...(defaults.hidden !== undefined ? { hidden: defaults.hidden } : {}),
  }
}

function buildProgressClockView(
  clock: ProgressClockState,
  definition?: ProgressClockDefinition
): ProgressClockView {
  const max = Math.max(1, sanitizeClockInteger(clock.max, definition?.max ?? 4, 1))
  const value = Math.min(max, sanitizeClockInteger(clock.value, 0, 0))
  const completedAtWeek =
    clock.completedAtWeek !== undefined ? sanitizeClockInteger(clock.completedAtWeek, 1, 1) : undefined
  const completed = value >= max || completedAtWeek !== undefined
  const hidden = clock.hidden ?? definition?.hidden ?? false

  return {
    ...clock,
    label: clock.label || definition?.label || clock.id,
    value,
    max,
    ...(clock.hidden !== undefined ? { hidden: clock.hidden } : hidden ? { hidden: true } : {}),
    ...(completed && completedAtWeek !== undefined ? { completedAtWeek } : {}),
    completed,
    remaining: Math.max(0, max - value),
    progressRatio: max > 0 ? value / max : 0,
    visibility: hidden ? 'hidden' : 'visible',
    ...(definition?.description ? { description: definition.description } : {}),
    tags: definition?.tags ? [...definition.tags] : [],
  }
}

/**
 * Extension point for additional authored clock catalogs.
 * Keep ids stable and deterministic so save/load and debug tooling remain easy
 * to inspect. Prefer additive catalog growth over mutating stored clock state.
 */
export function getProgressClockDefinition(clockId: string | ProgressClockDefinition) {
  return normalizeClockDefinition(clockId)
}

export function getProgressClockDefaults(
  clockId: string | ProgressClockDefinition,
  overrides?: ProgressClockDefaults
) {
  return resolveClockDefaults(clockId, overrides)
}

export function readProgressClock(
  state: GameState,
  clockId: string | ProgressClockDefinition
) {
  const normalizedId = normalizeClockId(clockId)

  if (normalizedId.length === 0) {
    return null
  }

  const clock = getProgressClockState(state, normalizedId)

  if (!clock) {
    return null
  }

  return buildProgressClockView(clock, normalizeClockDefinition(clockId))
}

export function listProgressClocks(state: GameState) {
  return Object.values(readGameStateManager(state).progressClocks)
    .map((clock) => buildProgressClockView(clock, getProgressClockDefinition(clock.id)))
    .sort((left, right) => left.id.localeCompare(right.id))
}

export function setDefinedProgressClock(
  state: GameState,
  clockId: string | ProgressClockDefinition,
  patch: Partial<ProgressClockState>
) {
  const normalizedId = normalizeClockId(clockId)

  if (normalizedId.length === 0) {
    return state
  }

  const defaults = resolveClockDefaults(clockId)
  return setProgressClockState(state, normalizedId, {
    ...(defaults?.label !== undefined && patch.label === undefined ? { label: defaults.label } : {}),
    ...(defaults?.max !== undefined && patch.max === undefined ? { max: defaults.max } : {}),
    ...(defaults?.hidden !== undefined && patch.hidden === undefined
      ? { hidden: defaults.hidden }
      : {}),
    ...patch,
  })
}

export function advanceDefinedProgressClock(
  state: GameState,
  clockId: string | ProgressClockDefinition,
  delta: number,
  defaults?: ProgressClockDefaults
) {
  const normalizedId = normalizeClockId(clockId)

  if (normalizedId.length === 0) {
    return state
  }

  return advanceProgressClockState(
    state,
    normalizedId,
    delta,
    resolveAdvanceClockDefaults(clockId, defaults)
  )
}

export function isProgressClockComplete(
  state: GameState,
  clockId: string | ProgressClockDefinition
) {
  return Boolean(readProgressClock(state, clockId)?.completed)
}

export function doesProgressClockMeetThreshold(
  state: GameState,
  clockId: string | ProgressClockDefinition,
  threshold: number
) {
  const clock = readProgressClock(state, clockId)

  if (!clock || typeof threshold !== 'number' || !Number.isFinite(threshold)) {
    return false
  }

  return clock.value >= Math.max(0, Math.trunc(threshold))
}

export function evaluateProgressClockCondition(
  state: GameState,
  condition: ProgressClockCondition
): ProgressClockConditionEvaluation {
  const normalizedId = normalizeClockId(condition.clockId)
  const clock = normalizedId.length > 0 ? readProgressClock(state, normalizedId) : null
  const failedChecks: ProgressClockConditionEvaluation['failedChecks'] = []
  const threshold = condition.threshold

  if (!clock) {
    failedChecks.push('missing')
    return {
      clockId: normalizedId || 'unknown-clock',
      exists: false,
      passes: false,
      currentValue: 0,
      max: 0,
      completed: false,
      hidden: false,
      failedChecks,
    }
  }

  if (
    condition.minValue !== undefined &&
    Number.isFinite(condition.minValue) &&
    clock.value < sanitizeClockInteger(condition.minValue, condition.minValue, 0)
  ) {
    failedChecks.push('min')
  }

  if (
    threshold !== undefined &&
    Number.isFinite(threshold) &&
    clock.value < sanitizeClockInteger(threshold, threshold, 0)
  ) {
    failedChecks.push('threshold')
  }

  if (
    condition.maxValue !== undefined &&
    Number.isFinite(condition.maxValue) &&
    clock.value > sanitizeClockInteger(condition.maxValue, condition.maxValue, 0)
  ) {
    failedChecks.push('max')
  }

  if (condition.completed !== undefined && clock.completed !== condition.completed) {
    failedChecks.push('completed')
  }

  if (condition.hidden !== undefined && (clock.visibility === 'hidden') !== condition.hidden) {
    failedChecks.push('hidden')
  }

  return {
    clockId: clock.id,
    exists: true,
    passes: failedChecks.length === 0,
    currentValue: clock.value,
    max: clock.max,
    completed: clock.completed,
    hidden: clock.visibility === 'hidden',
    failedChecks,
  }
}

export function areProgressClockConditionsSatisfied(
  state: GameState,
  conditions: readonly ProgressClockCondition[]
) {
  return conditions.every((condition) => evaluateProgressClockCondition(state, condition).passes)
}
