/**
 * SPE-3024 — calendar/start-condition activation of historical-route replays.
 *
 * Owns the SPE-1605 / SPE-1071 policy that decides when an SPE-1392 reactivated
 * route becomes a persisted SPE-3009 `HistoricalRouteReplayRecord`. Inserts
 * via SPE-3017 normalize. Does not invent SPE-950 possession, SPE-3007
 * route_link, mid-week interaction starts, or SPE-3020 consequence policy.
 */

import {
  createHistoricalRouteReplay,
  normalizeHistoricalRouteReplayRegistry,
  type HistoricalRouteReplayRegistry,
} from './historicalRouteReplay'
import type { HistoricalRouteMemoryGraph } from './historicalRouteMemory'

export const HISTORICAL_ROUTE_REPLAY_ABSOLUTE_WEEK_START = 'absolute_week' as const

export type HistoricalRouteReplayStartConditionKind =
  typeof HISTORICAL_ROUTE_REPLAY_ABSOLUTE_WEEK_START

/**
 * SPE-1605 start condition keyed to SPE-1071 campaign absolute week
 * (`GameState.week` / `CampaignDate.absoluteWeek`).
 */
export interface HistoricalRouteReplayAbsoluteWeekStartCondition {
  readonly kind: typeof HISTORICAL_ROUTE_REPLAY_ABSOLUTE_WEEK_START
  readonly absoluteWeek: number
}

export type HistoricalRouteReplayStartCondition = HistoricalRouteReplayAbsoluteWeekStartCondition

export interface HistoricalRouteReplayActivationCandidate {
  readonly eventId: string
  readonly activationId: string
  readonly originAnchorId: string
  readonly terminalAnchorId: string
  readonly startCondition: HistoricalRouteReplayStartCondition
}

export type HistoricalRouteReplayActivationCandidateList =
  readonly HistoricalRouteReplayActivationCandidate[]

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

/** Reject JavaScript integer-index keys that cannot retain code-unit object-key order. */
function isIntegerIndexId(value: string): boolean {
  const numeric = Number(value)
  return (
    Number.isInteger(numeric) &&
    numeric >= 0 &&
    numeric < 4_294_967_295 &&
    String(numeric) === value
  )
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function normalizeStartCondition(value: unknown): HistoricalRouteReplayStartCondition | null {
  if (!isRecord(value)) return null
  if (value.kind !== HISTORICAL_ROUTE_REPLAY_ABSOLUTE_WEEK_START) return null
  if (!isNonNegativeInteger(value.absoluteWeek)) return null
  return Object.freeze({
    kind: HISTORICAL_ROUTE_REPLAY_ABSOLUTE_WEEK_START,
    absoluteWeek: value.absoluteWeek,
  })
}

function normalizeActivationCandidate(
  value: unknown
): HistoricalRouteReplayActivationCandidate | null {
  if (!isRecord(value)) return null
  if (
    !validId(value.eventId) ||
    isIntegerIndexId(value.eventId) ||
    !validId(value.activationId) ||
    !validId(value.originAnchorId) ||
    !validId(value.terminalAnchorId) ||
    value.originAnchorId === value.terminalAnchorId
  ) {
    return null
  }

  const startCondition = normalizeStartCondition(value.startCondition)
  if (!startCondition) return null

  return Object.freeze({
    eventId: value.eventId,
    activationId: value.activationId,
    originAnchorId: value.originAnchorId,
    terminalAnchorId: value.terminalAnchorId,
    startCondition,
  })
}

/**
 * Fail-closed sanitize for authored SPE-1605 activation candidates.
 * Malformed siblings drop independently; duplicates keep the first by
 * code-unit `eventId` order. Missing/non-array hydrates empty.
 */
export function normalizeHistoricalRouteReplayActivationCandidates(
  value: unknown
): HistoricalRouteReplayActivationCandidateList {
  if (!Array.isArray(value)) {
    return Object.freeze([])
  }

  const byEventId = new Map<string, HistoricalRouteReplayActivationCandidate>()
  for (const raw of value) {
    const candidate = normalizeActivationCandidate(raw)
    if (!candidate) continue
    if (byEventId.has(candidate.eventId)) continue
    byEventId.set(candidate.eventId, candidate)
  }

  const ordered = [...byEventId.values()].sort((left, right) =>
    compareCodeUnits(left.eventId, right.eventId)
  )
  return Object.freeze(ordered.map((candidate) => candidate))
}

function startConditionMatchesCampaignWeek(
  condition: HistoricalRouteReplayStartCondition,
  campaignWeek: number
): boolean {
  switch (condition.kind) {
    case HISTORICAL_ROUTE_REPLAY_ABSOLUTE_WEEK_START:
      return condition.absoluteWeek === campaignWeek
    default: {
      const _exhaustive: never = condition.kind
      void _exhaustive
      return false
    }
  }
}

/**
 * SPE-3024: activate matching calendar/start-condition candidates into the
 * persisted replay registry.
 *
 * - Matching uses SPE-1071 absolute week (`campaignWeek` === `GameState.week`
 *   for the closing campaign week).
 * - Creation calls SPE-3009 `createHistoricalRouteReplay` (fail-closed on
 *   missing/inactive SPE-1392 path).
 * - Existing `eventId` siblings stay identity (idempotent re-activation).
 * - Insert order is deterministic code-unit `eventId`; result is SPE-3017
 *   normalized.
 * - Call only from campaign week-close (never mid-week).
 */
export function activateHistoricalRouteReplayRegistryForCalendarWeek(
  registry: unknown,
  graph: HistoricalRouteMemoryGraph | null | undefined,
  candidates: readonly HistoricalRouteReplayActivationCandidate[] | null | undefined,
  campaignWeek: number
): HistoricalRouteReplayRegistry {
  const normalized = normalizeHistoricalRouteReplayRegistry(registry)
  if (!graph || !isNonNegativeInteger(campaignWeek)) {
    return normalized
  }

  const authored = normalizeHistoricalRouteReplayActivationCandidates(candidates)
  const matching = authored.filter((candidate) =>
    startConditionMatchesCampaignWeek(candidate.startCondition, campaignWeek)
  )
  if (matching.length === 0) {
    return normalized
  }

  const nextEntries: Record<string, (typeof normalized)[string]> = { ...normalized }
  let changed = false

  for (const candidate of matching) {
    if (nextEntries[candidate.eventId]) continue

    const created = createHistoricalRouteReplay(graph, {
      eventId: candidate.eventId,
      activationId: candidate.activationId,
      originAnchorId: candidate.originAnchorId,
      terminalAnchorId: candidate.terminalAnchorId,
    })
    if (!created) continue

    nextEntries[candidate.eventId] = created
    changed = true
  }

  return changed ? normalizeHistoricalRouteReplayRegistry(nextEntries) : normalized
}
