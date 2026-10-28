/**
 * SPE-700 — institution calendars and availability shifts.
 *
 * Pure caller-owned calendar packets. Campaign week identity comes from
 * SPE-1071 `getCampaignDate`; institution doctrine/profile stays SPE-698.
 * No GameState field and no liturgical sandbox.
 */

import { getCampaignDate, resolveCalendarConfig } from './campaignCalendar'
import type { CalendarConfig, CampaignDate } from './models'

export const INSTITUTION_CALENDAR_OWNER = 'SPE-700' as const

export type InstitutionCalendarEffectKind =
  | 'public_access'
  | 'staffing'
  | 'crowding'
  | 'ritual_behavior'

export type InstitutionCalendarRecurrence =
  | { readonly kind: 'once'; readonly absoluteWeek: number }
  | { readonly kind: 'annual_week_of_year'; readonly weekOfYear: number }
  | { readonly kind: 'interval'; readonly everyWeeks: number; readonly anchorAbsoluteWeek: number }

export interface InstitutionCalendarEntry {
  readonly entryId: string
  readonly institutionProfileId: string
  readonly label: string
  readonly recurrence: InstitutionCalendarRecurrence
  readonly effects: readonly InstitutionCalendarEffect[]
}

export interface InstitutionCalendarEffect {
  readonly kind: InstitutionCalendarEffectKind
  /** Signed delta applied while the entry is active. */
  readonly delta: number
  readonly reason: string
}

export interface InstitutionAvailabilityShift {
  readonly institutionProfileId: string
  readonly absoluteWeek: number
  readonly weekOfYear: number
  readonly activeEntryIds: readonly string[]
  readonly publicAccessDelta: number
  readonly staffingDelta: number
  readonly crowdingDelta: number
  readonly ritualBehaviorDelta: number
  readonly reasons: readonly string[]
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function normalizeDelta(value: number): number {
  if (!isFiniteNumber(value)) return 0
  return Math.trunc(value)
}

function entryActiveOnDate(entry: InstitutionCalendarEntry, date: CampaignDate): boolean {
  const recurrence = entry.recurrence
  switch (recurrence.kind) {
    case 'once':
      return date.absoluteWeek === Math.max(0, Math.trunc(recurrence.absoluteWeek))
    case 'annual_week_of_year': {
      const weekOfYear = Math.max(1, Math.trunc(recurrence.weekOfYear))
      return date.weekOfYear === weekOfYear
    }
    case 'interval': {
      const every = Math.max(1, Math.trunc(recurrence.everyWeeks))
      const anchor = Math.max(0, Math.trunc(recurrence.anchorAbsoluteWeek))
      if (date.absoluteWeek < anchor) return false
      return (date.absoluteWeek - anchor) % every === 0
    }
    default: {
      const _exhaustive: never = recurrence
      return _exhaustive
    }
  }
}

/**
 * Fail-closed create: require non-empty ids/label and at least one effect.
 */
export function createInstitutionCalendarEntry(
  input: InstitutionCalendarEntry,
): InstitutionCalendarEntry {
  const entryId = input.entryId.trim()
  const institutionProfileId = input.institutionProfileId.trim()
  const label = input.label.trim()
  if (!entryId) throw new Error('institution calendar entryId is required')
  if (!institutionProfileId) throw new Error('institution calendar institutionProfileId is required')
  if (!label) throw new Error('institution calendar label is required')
  if (!Array.isArray(input.effects) || input.effects.length === 0) {
    throw new Error('institution calendar entry requires at least one effect')
  }

  const effects = input.effects.map((effect) => ({
    kind: effect.kind,
    delta: normalizeDelta(effect.delta),
    reason: effect.reason.trim() || `${label}:${effect.kind}`,
  }))

  return Object.freeze({
    entryId,
    institutionProfileId,
    label,
    recurrence: input.recurrence,
    effects: Object.freeze(effects),
  })
}

export function listActiveInstitutionCalendarEntries(
  entries: readonly InstitutionCalendarEntry[],
  absoluteWeek: number,
  calendarConfig?: CalendarConfig | Pick<{ weeksPerYear: number }, 'weeksPerYear'>,
): InstitutionCalendarEntry[] {
  const config = resolveCalendarConfig(calendarConfig)
  const date = getCampaignDate(absoluteWeek, config)
  return entries.filter((entry) => entryActiveOnDate(entry, date))
}

/**
 * Project availability/behavior deltas for one institution at one absolute week.
 */
export function projectInstitutionAvailabilityShift(args: {
  readonly institutionProfileId: string
  readonly absoluteWeek: number
  readonly entries: readonly InstitutionCalendarEntry[]
  readonly calendarConfig?: CalendarConfig | Pick<{ weeksPerYear: number }, 'weeksPerYear'>
}): InstitutionAvailabilityShift {
  const institutionProfileId = args.institutionProfileId.trim()
  const config = resolveCalendarConfig(args.calendarConfig)
  const date = getCampaignDate(args.absoluteWeek, config)
  const active = args.entries.filter(
    (entry) =>
      entry.institutionProfileId === institutionProfileId && entryActiveOnDate(entry, date),
  )

  let publicAccessDelta = 0
  let staffingDelta = 0
  let crowdingDelta = 0
  let ritualBehaviorDelta = 0
  const reasons: string[] = []

  for (const entry of active) {
    for (const effect of entry.effects) {
      const delta = normalizeDelta(effect.delta)
      switch (effect.kind) {
        case 'public_access':
          publicAccessDelta += delta
          break
        case 'staffing':
          staffingDelta += delta
          break
        case 'crowding':
          crowdingDelta += delta
          break
        case 'ritual_behavior':
          ritualBehaviorDelta += delta
          break
        default: {
          const _exhaustive: never = effect.kind
          void _exhaustive
          break
        }
      }
      reasons.push(effect.reason)
    }
  }

  return Object.freeze({
    institutionProfileId,
    absoluteWeek: date.absoluteWeek,
    weekOfYear: date.weekOfYear,
    activeEntryIds: Object.freeze(active.map((entry) => entry.entryId)),
    publicAccessDelta,
    staffingDelta,
    crowdingDelta,
    ritualBehaviorDelta,
    reasons: Object.freeze(reasons),
  })
}
