/**
 * Shared campaign-calendar surface (SPE-1071 slice 1).
 *
 * Pure derivation of `GameState.week` into a typed `CampaignDate`. `state.week`
 * remains the single mutable source of truth; this module adds no new
 * persisted state. Downstream systems (incidents, staffing, projects) read
 * dated views via these selectors without changing existing week-counter
 * semantics.
 *
 * Slice 1 intentionally does not include month semantics, seasonal modifiers,
 * anniversary recurrence, fiscal/reporting cycles, archive/history surfaces,
 * or any UI. Those land in later SPE-1071 slices.
 */

import type {
  CalendarConfig,
  CampaignDate,
  CampaignSeason,
  GameConfig,
  GameState,
  Id,
} from './models'

const DEFAULT_WEEKS_PER_YEAR = 52
const SEASON_ORDER: readonly CampaignSeason[] = ['spring', 'summer', 'autumn', 'winter'] as const
const SEASON_COUNT = SEASON_ORDER.length

const DEFAULT_EPOCH_YEAR = 1
const DEFAULT_EPOCH_WEEK_OF_YEAR = 1

function deriveWeeksPerSeason(weeksPerYear: number): number {
  return Math.max(1, Math.floor(weeksPerYear / SEASON_COUNT))
}

/**
 * Build a `CalendarConfig` from optional overrides, falling back to
 * `GameConfig.weeksPerYear` when present, then to slice-1 defaults.
 * Pure and deterministic.
 */
export function resolveCalendarConfig(
  source?: Pick<GameConfig, 'weeksPerYear'> | Partial<CalendarConfig>
): CalendarConfig {
  const weeksPerYearRaw =
    typeof source?.weeksPerYear === 'number' && Number.isFinite(source.weeksPerYear)
      ? Math.floor(source.weeksPerYear)
      : DEFAULT_WEEKS_PER_YEAR
  const weeksPerYear = Math.max(1, weeksPerYearRaw)

  const overrideWeeksPerSeason = (source as Partial<CalendarConfig> | undefined)?.weeksPerSeason
  const weeksPerSeason =
    typeof overrideWeeksPerSeason === 'number' && Number.isFinite(overrideWeeksPerSeason)
      ? Math.max(1, Math.floor(overrideWeeksPerSeason))
      : deriveWeeksPerSeason(weeksPerYear)

  const overrideEpochYear = (source as Partial<CalendarConfig> | undefined)?.epochYear
  const epochYear =
    typeof overrideEpochYear === 'number' && Number.isFinite(overrideEpochYear)
      ? Math.floor(overrideEpochYear)
      : DEFAULT_EPOCH_YEAR

  const overrideEpochWeekOfYear = (source as Partial<CalendarConfig> | undefined)?.epochWeekOfYear
  const epochWeekOfYear =
    typeof overrideEpochWeekOfYear === 'number' && Number.isFinite(overrideEpochWeekOfYear)
      ? Math.max(1, Math.min(weeksPerYear, Math.floor(overrideEpochWeekOfYear)))
      : DEFAULT_EPOCH_WEEK_OF_YEAR

  return { weeksPerYear, weeksPerSeason, epochYear, epochWeekOfYear }
}

function seasonForWeekOfYear(weekOfYear: number, weeksPerSeason: number): CampaignSeason {
  // weekOfYear is 1-based. Seasons partition the year in order; any
  // remainder weeks past the last full season fall into the final season.
  const zeroBasedIndex = Math.max(0, weekOfYear - 1)
  const rawSeasonIndex = Math.floor(zeroBasedIndex / weeksPerSeason)
  const seasonIndex = Math.min(SEASON_COUNT - 1, rawSeasonIndex)
  return SEASON_ORDER[seasonIndex]
}

/**
 * Pure derivation of an absolute week counter into a `CampaignDate`. The
 * input must be a non-negative integer matching `GameState.week` semantics.
 */
export function getCampaignDate(
  absoluteWeek: number,
  calendarConfig: CalendarConfig
): CampaignDate {
  const safeAbsoluteWeek = Math.max(0, Math.floor(absoluteWeek))
  const { weeksPerYear, weeksPerSeason, epochYear, epochWeekOfYear } = calendarConfig

  // Translate so absoluteWeek 0 lands at (epochYear, epochWeekOfYear).
  const offset = safeAbsoluteWeek + (epochWeekOfYear - 1)
  const yearDelta = Math.floor(offset / weeksPerYear)
  const weekOfYear = (offset % weeksPerYear) + 1
  const year = epochYear + yearDelta
  const season = seasonForWeekOfYear(weekOfYear, weeksPerSeason)

  return { absoluteWeek: safeAbsoluteWeek, year, weekOfYear, season }
}

/**
 * Add `weeks` (may be negative) to a `CampaignDate`, re-deriving the result
 * via `getCampaignDate` so all fields remain internally consistent.
 */
export function addWeeks(
  date: CampaignDate,
  weeks: number,
  calendarConfig: CalendarConfig
): CampaignDate {
  const next = date.absoluteWeek + Math.floor(weeks)
  return getCampaignDate(next, calendarConfig)
}

/**
 * Total order over `CampaignDate` by `absoluteWeek`. Returns -1, 0, or 1.
 */
export function compareCampaignDates(a: CampaignDate, b: CampaignDate): -1 | 0 | 1 {
  if (a.absoluteWeek < b.absoluteWeek) return -1
  if (a.absoluteWeek > b.absoluteWeek) return 1
  return 0
}

/**
 * Compact debug/log representation, e.g. `Y2 W14 (summer)`.
 */
export function formatCampaignDate(date: CampaignDate): string {
  return `Y${date.year} W${date.weekOfYear} (${date.season})`
}

/**
 * Selector: `CampaignDate` for the current `state.week`. Reads
 * `state.config.weeksPerYear` when available.
 */
export function selectCurrentCampaignDate(state: GameState): CampaignDate {
  return getCampaignDate(state.week, resolveCalendarConfig(state.config))
}

/**
 * Selector: dated deadline for a case, derived from `state.week +
 * case.deadlineRemaining`. Returns null when the case is not present or
 * does not carry a deadline countdown. Proof consumer for SPE-1071 AC1
 * (incident-side dated record).
 */
export function selectCaseDeadlineDate(
  state: GameState,
  caseId: Id
): CampaignDate | null {
  const caseInstance = state.cases?.[caseId]
  if (!caseInstance) return null
  const remaining = caseInstance.deadlineRemaining
  if (typeof remaining !== 'number' || !Number.isFinite(remaining)) return null
  return getCampaignDate(state.week + Math.max(0, Math.floor(remaining)), resolveCalendarConfig(state.config))
}

/**
 * Selector: dated training-completion week for a queued training entry,
 * derived from `state.week + entry.remainingWeeks`. Proof consumer for
 * SPE-1071 AC1 (staffing/recovery-side dated record). Returns null when
 * the entry is not found or does not carry a remaining-weeks countdown.
 */
export function selectTrainingCompletionDate(
  state: GameState,
  trainingEntryId: Id
): CampaignDate | null {
  const entry = state.trainingQueue?.find((e) => e.id === trainingEntryId)
  if (!entry) return null
  const remaining = entry.remainingWeeks
  if (typeof remaining !== 'number' || !Number.isFinite(remaining)) return null
  return getCampaignDate(state.week + Math.max(0, Math.floor(remaining)), resolveCalendarConfig(state.config))
}
