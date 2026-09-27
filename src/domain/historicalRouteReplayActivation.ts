/**
 * SPE-3024 / SPE-3033 — calendar and interaction start-condition activation of
 * historical-route replays.
 *
 * Owns the SPE-1605 / SPE-1071 policy that decides when an SPE-1392 reactivated
 * route becomes a persisted SPE-3009 `HistoricalRouteReplayRecord`. Inserts
 * via SPE-3017 normalize. Does not invent SPE-950 possession, SPE-3007
 * route_link, or SPE-3020 consequence policy.
 *
 * SPE-3024 owns `absolute_week` matching at campaign week-close.
 * SPE-3033 owns one SPE-1605 `interaction` start at the interaction seam
 * (pure create into the registry; SPE-3018 advance remains week-close only).
 */

import {
  createHistoricalRouteReplay,
  normalizeHistoricalRouteReplayRegistry,
  type HistoricalRouteReplayRegistry,
} from './historicalRouteReplay'
import {
  listHistoricalRouteMemoryGraphs,
  normalizeHistoricalRouteMemoryGraph,
  normalizeHistoricalRouteMemoryGraphRegistry,
  normalizeHistoricalRouteMemoryGraphsFromGameState,
  type HistoricalRouteMemoryGraph,
  type HistoricalRouteMemoryGraphRegistry,
} from './historicalRouteMemory'

export const HISTORICAL_ROUTE_REPLAY_ABSOLUTE_WEEK_START = 'absolute_week' as const
export const HISTORICAL_ROUTE_REPLAY_INTERACTION_START = 'interaction' as const

/**
 * SPE-1605 explicit-interaction families used as historical-route start keys.
 * Compact vocabulary from the SPE-1605 body — do not invent parallel taxonomies.
 */
export const HISTORICAL_ROUTE_REPLAY_INTERACTION_KINDS = [
  'enter_zone',
  'make_noise',
  'operate_control',
  'open_access',
  'search',
  'remove_asset',
  'interview_witness',
  'touch_sensitive_object',
] as const

export type HistoricalRouteReplayInteractionKind =
  (typeof HISTORICAL_ROUTE_REPLAY_INTERACTION_KINDS)[number]

const INTERACTION_KIND_SET: ReadonlySet<string> = new Set(HISTORICAL_ROUTE_REPLAY_INTERACTION_KINDS)

export type HistoricalRouteReplayStartConditionKind =
  | typeof HISTORICAL_ROUTE_REPLAY_ABSOLUTE_WEEK_START
  | typeof HISTORICAL_ROUTE_REPLAY_INTERACTION_START

/**
 * SPE-1605 start condition keyed to SPE-1071 campaign absolute week
 * (`GameState.week` / `CampaignDate.absoluteWeek`).
 */
export interface HistoricalRouteReplayAbsoluteWeekStartCondition {
  readonly kind: typeof HISTORICAL_ROUTE_REPLAY_ABSOLUTE_WEEK_START
  readonly absoluteWeek: number
}

/**
 * SPE-1605 / SPE-3033 start condition keyed to one explicit interaction.
 * `interactionId` is the authored instance so one family can start different events.
 */
export interface HistoricalRouteReplayInteractionStartCondition {
  readonly kind: typeof HISTORICAL_ROUTE_REPLAY_INTERACTION_START
  readonly interactionKind: HistoricalRouteReplayInteractionKind
  readonly interactionId: string
}

export type HistoricalRouteReplayStartCondition =
  HistoricalRouteReplayAbsoluteWeekStartCondition | HistoricalRouteReplayInteractionStartCondition

/** Signal passed at the interaction seam when an explicit SPE-1605 interaction fires. */
export interface HistoricalRouteReplayInteractionStartSignal {
  readonly interactionKind: HistoricalRouteReplayInteractionKind
  readonly interactionId: string
}

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

function isInteractionKind(value: unknown): value is HistoricalRouteReplayInteractionKind {
  return typeof value === 'string' && INTERACTION_KIND_SET.has(value)
}

function normalizeStartCondition(value: unknown): HistoricalRouteReplayStartCondition | null {
  if (!isRecord(value)) return null
  if (value.kind === HISTORICAL_ROUTE_REPLAY_ABSOLUTE_WEEK_START) {
    if (!isNonNegativeInteger(value.absoluteWeek)) return null
    return Object.freeze({
      kind: HISTORICAL_ROUTE_REPLAY_ABSOLUTE_WEEK_START,
      absoluteWeek: value.absoluteWeek,
    })
  }
  if (value.kind === HISTORICAL_ROUTE_REPLAY_INTERACTION_START) {
    if (!isInteractionKind(value.interactionKind)) return null
    if (!validId(value.interactionId) || isIntegerIndexId(value.interactionId)) return null
    return Object.freeze({
      kind: HISTORICAL_ROUTE_REPLAY_INTERACTION_START,
      interactionKind: value.interactionKind,
      interactionId: value.interactionId,
    })
  }
  return null
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
    case HISTORICAL_ROUTE_REPLAY_INTERACTION_START:
      // SPE-3033 owns interaction matching; calendar week-close ignores these.
      return false
    default: {
      const _exhaustive: never = condition
      void _exhaustive
      return false
    }
  }
}

function startConditionMatchesInteractionSignal(
  condition: HistoricalRouteReplayStartCondition,
  signal: HistoricalRouteReplayInteractionStartSignal
): boolean {
  switch (condition.kind) {
    case HISTORICAL_ROUTE_REPLAY_INTERACTION_START:
      return (
        condition.interactionKind === signal.interactionKind &&
        condition.interactionId === signal.interactionId
      )
    case HISTORICAL_ROUTE_REPLAY_ABSOLUTE_WEEK_START:
      // SPE-3024 owns calendar matching; interaction seam ignores these.
      return false
    default: {
      const _exhaustive: never = condition
      void _exhaustive
      return false
    }
  }
}

function normalizeInteractionStartSignal(
  signal: HistoricalRouteReplayInteractionStartSignal | null | undefined
): HistoricalRouteReplayInteractionStartSignal | null {
  if (!signal || !isRecord(signal)) return null
  if (!isInteractionKind(signal.interactionKind)) return null
  if (!validId(signal.interactionId) || isIntegerIndexId(signal.interactionId)) return null
  return Object.freeze({
    interactionKind: signal.interactionKind,
    interactionId: signal.interactionId,
  })
}

/**
 * Shared SPE-3009 create + SPE-3017 insert for matching activation candidates.
 * Existing `eventId` siblings stay identity (idempotent). Missing/inactive
 * SPE-1392 paths invent nothing.
 */
function activateMatchingCandidates(
  registry: unknown,
  graphs:
    | HistoricalRouteMemoryGraphRegistry
    | HistoricalRouteMemoryGraph
    | {
        readonly historicalRouteMemoryGraphs?: unknown
        readonly historicalRouteMemoryGraph?: unknown
      }
    | null
    | undefined,
  matching: readonly HistoricalRouteReplayActivationCandidate[]
): HistoricalRouteReplayRegistry {
  const normalized = normalizeHistoricalRouteReplayRegistry(registry)
  const siteGraphs = resolveActivationGraphs(graphs)
  if (siteGraphs.length === 0 || matching.length === 0) {
    return normalized
  }

  const nextEntries: Record<string, (typeof normalized)[string]> = { ...normalized }
  let changed = false

  for (const candidate of matching) {
    if (nextEntries[candidate.eventId]) continue

    let created: ReturnType<typeof createHistoricalRouteReplay> = undefined
    for (const graph of siteGraphs) {
      created = createHistoricalRouteReplay(graph, {
        eventId: candidate.eventId,
        activationId: candidate.activationId,
        originAnchorId: candidate.originAnchorId,
        terminalAnchorId: candidate.terminalAnchorId,
      })
      if (created) break
    }
    if (!created) continue

    nextEntries[candidate.eventId] = created
    changed = true
  }

  return changed ? normalizeHistoricalRouteReplayRegistry(nextEntries) : normalized
}

/**
 * Resolve the SPE-1392 graphs SPE-3024 activation may try, in deterministic
 * `siteId` order. Accepts the SPE-3027 multi-site registry, a single legacy
 * SPE-3024 graph, or a dual-read GameState-shaped object.
 */
function resolveActivationGraphs(
  graphs:
    | HistoricalRouteMemoryGraphRegistry
    | HistoricalRouteMemoryGraph
    | {
        readonly historicalRouteMemoryGraphs?: unknown
        readonly historicalRouteMemoryGraph?: unknown
      }
    | null
    | undefined
): readonly HistoricalRouteMemoryGraph[] {
  if (graphs == null) {
    return Object.freeze([])
  }
  if (isRecord(graphs) && Array.isArray((graphs as HistoricalRouteMemoryGraph).anchors)) {
    const single = normalizeHistoricalRouteMemoryGraph(graphs)
    return single ? Object.freeze([single]) : Object.freeze([])
  }
  if (
    isRecord(graphs) &&
    ('historicalRouteMemoryGraphs' in graphs || 'historicalRouteMemoryGraph' in graphs)
  ) {
    return listHistoricalRouteMemoryGraphs(
      normalizeHistoricalRouteMemoryGraphsFromGameState(
        graphs as {
          readonly historicalRouteMemoryGraphs?: unknown
          readonly historicalRouteMemoryGraph?: unknown
        }
      )
    )
  }
  return listHistoricalRouteMemoryGraphs(normalizeHistoricalRouteMemoryGraphRegistry(graphs))
}

/**
 * SPE-3024: activate matching calendar/start-condition candidates into the
 * persisted replay registry.
 *
 * - Matching uses SPE-1071 absolute week (`campaignWeek` === `GameState.week`
 *   for the closing campaign week). Interaction candidates never match here.
 * - Creation calls SPE-3009 `createHistoricalRouteReplay` against SPE-3027
 *   registry graphs in deterministic `siteId` order (fail-closed on
 *   missing/inactive SPE-1392 path). A single legacy SPE-3024 graph remains
 *   accepted as activation input for dual-read migration.
 * - Existing `eventId` siblings stay identity (idempotent re-activation).
 * - Insert order is deterministic code-unit `eventId`; result is SPE-3017
 *   normalized.
 * - Call only from campaign week-close (never mid-week).
 */
export function activateHistoricalRouteReplayRegistryForCalendarWeek(
  registry: unknown,
  graphs:
    | HistoricalRouteMemoryGraphRegistry
    | HistoricalRouteMemoryGraph
    | {
        readonly historicalRouteMemoryGraphs?: unknown
        readonly historicalRouteMemoryGraph?: unknown
      }
    | null
    | undefined,
  candidates: readonly HistoricalRouteReplayActivationCandidate[] | null | undefined,
  campaignWeek: number
): HistoricalRouteReplayRegistry {
  const normalized = normalizeHistoricalRouteReplayRegistry(registry)
  if (!isNonNegativeInteger(campaignWeek)) {
    return normalized
  }

  const authored = normalizeHistoricalRouteReplayActivationCandidates(candidates)
  const matching = authored.filter((candidate) =>
    startConditionMatchesCampaignWeek(candidate.startCondition, campaignWeek)
  )
  return activateMatchingCandidates(normalized, graphs, matching)
}

/**
 * SPE-3033: activate matching interaction start-condition candidates into the
 * persisted replay registry at the interaction seam.
 *
 * - Matching requires SPE-1605 `interaction` kind + exact `interactionKind` /
 *   `interactionId`. Calendar `absolute_week` candidates never match here.
 * - Creation reuses SPE-3009 `createHistoricalRouteReplay` + SPE-3017 normalize
 *   (same fail-closed inactive-path rules as SPE-3024).
 * - Existing `eventId` siblings stay identity (idempotent re-trigger).
 * - Dormant / no-match / malformed signal → identity no-op (registry frozen).
 * - Creates `approaching` only; SPE-3018 advance remains week-close-only.
 * - Call from the interaction seam when an explicit interaction fires. Does not
 *   rewrite SPE-3024 calendar week-close policy.
 */
export function activateHistoricalRouteReplayRegistryForInteractionStart(
  registry: unknown,
  graphs:
    | HistoricalRouteMemoryGraphRegistry
    | HistoricalRouteMemoryGraph
    | {
        readonly historicalRouteMemoryGraphs?: unknown
        readonly historicalRouteMemoryGraph?: unknown
      }
    | null
    | undefined,
  candidates: readonly HistoricalRouteReplayActivationCandidate[] | null | undefined,
  signal: HistoricalRouteReplayInteractionStartSignal | null | undefined
): HistoricalRouteReplayRegistry {
  const normalized = normalizeHistoricalRouteReplayRegistry(registry)
  const normalizedSignal = normalizeInteractionStartSignal(signal)
  if (!normalizedSignal) {
    return normalized
  }

  const authored = normalizeHistoricalRouteReplayActivationCandidates(candidates)
  const matching = authored.filter((candidate) =>
    startConditionMatchesInteractionSignal(candidate.startCondition, normalizedSignal)
  )
  return activateMatchingCandidates(normalized, graphs, matching)
}
