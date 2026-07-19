/**
 * SPE-2644 / SPE-956: GameState persistence for authored incident-lane baselines.
 *
 * One map keyed by incident id with five optional lane baselines used by the
 * SPE-2639/2640 incident path. Sanitize/hydrate + thin resolve only.
 * Does not change evaluators, mirror, week-close, or expand the incident-path composer.
 */

import {
  EXAMPLE_DISCUSSION_BASELINE,
  tryNormalizeDiscussionMemoryBaseline,
  type DiscussionMemoryBaseline,
} from './asyncDiscussionSurface'
import {
  EXAMPLE_MEMORY_STABILIZATION_BASELINE,
  tryNormalizeCollectiveMemoryBaseline,
  type CollectiveMemoryBaseline,
} from './collectiveMemoryStabilization'
import {
  EXAMPLE_INCIDENT_BASELINE,
  tryNormalizeIncidentResponseBaseline,
  type IncidentResponseDecision,
} from './communityAdvisoryDecisionInfluence'
import {
  EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
  tryNormalizeHotlineGuidanceBaseline,
  type HotlineGuidanceBaseline,
} from './hotlineChannel'
import { SPE_956_EXAMPLE_INCIDENT_ID } from './spe956ParticipatoryChannelIncidentPath'
import {
  EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
  tryNormalizeSurvivorSupportBaseline,
  type SurvivorSupportBaseline,
} from './survivorInformalRegistry'

export interface Spe956PersistedIncidentBaselines {
  readonly incidentId: string
  readonly advisory?: IncidentResponseDecision
  readonly hotline?: HotlineGuidanceBaseline
  readonly asyncDiscussion?: DiscussionMemoryBaseline
  readonly survivorSupport?: SurvivorSupportBaseline
  readonly collectiveMemory?: CollectiveMemoryBaseline
}

export type Spe956IncidentBaselineRecordsMap = Record<string, Spe956PersistedIncidentBaselines>

export interface Spe956IncidentBaselineGameStateLike {
  readonly spe956IncidentBaselineRecords?: Spe956IncidentBaselineRecordsMap | null
}

type PlainRecord = Record<string, unknown>

function isPlainRecord(value: unknown): value is PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSafeMapKey(id: string): boolean {
  return id !== '__proto__' && id !== 'constructor' && id !== 'prototype'
}

function normalizeIncidentId(value: unknown): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : ''
}

function sanitizeSpe956IncidentBaselineEntry(
  value: unknown,
  mapKey: string
): Spe956PersistedIncidentBaselines | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const incidentId = normalizeIncidentId(value.incidentId)
  if (
    incidentId.length === 0 ||
    !isSafeMapKey(incidentId) ||
    !isSafeMapKey(mapKey) ||
    incidentId !== mapKey
  ) {
    return null
  }

  let advisory: IncidentResponseDecision | undefined
  if (value.advisory !== undefined) {
    const normalized = tryNormalizeIncidentResponseBaseline(value.advisory)
    if (normalized !== null && normalized.incidentId === incidentId) {
      advisory = normalized
    }
  }

  let hotline: HotlineGuidanceBaseline | undefined
  if (value.hotline !== undefined) {
    const normalized = tryNormalizeHotlineGuidanceBaseline(value.hotline)
    if (normalized !== null && normalized.incidentId === incidentId) {
      hotline = normalized
    }
  }

  let asyncDiscussion: DiscussionMemoryBaseline | undefined
  if (value.asyncDiscussion !== undefined) {
    const normalized = tryNormalizeDiscussionMemoryBaseline(value.asyncDiscussion)
    if (normalized !== null) {
      asyncDiscussion = normalized
    }
  }

  let survivorSupport: SurvivorSupportBaseline | undefined
  if (value.survivorSupport !== undefined) {
    const normalized = tryNormalizeSurvivorSupportBaseline(value.survivorSupport)
    if (normalized !== null) {
      survivorSupport = normalized
    }
  }

  let collectiveMemory: CollectiveMemoryBaseline | undefined
  if (value.collectiveMemory !== undefined) {
    const normalized = tryNormalizeCollectiveMemoryBaseline(value.collectiveMemory)
    if (normalized !== null) {
      collectiveMemory = normalized
    }
  }

  if (
    advisory === undefined &&
    hotline === undefined &&
    asyncDiscussion === undefined &&
    survivorSupport === undefined &&
    collectiveMemory === undefined
  ) {
    return null
  }

  return Object.freeze({
    incidentId,
    ...(advisory !== undefined ? { advisory } : {}),
    ...(hotline !== undefined ? { hotline } : {}),
    ...(asyncDiscussion !== undefined ? { asyncDiscussion } : {}),
    ...(survivorSupport !== undefined ? { survivorSupport } : {}),
    ...(collectiveMemory !== undefined ? { collectiveMemory } : {}),
  })
}

/** Hydration: canonical authored incident baseline map keyed by incident id. */
export function sanitizeSpe956IncidentBaselineRecords(
  value: unknown,
  fallback: Spe956IncidentBaselineRecordsMap = {}
): Spe956IncidentBaselineRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next = Object.create(null) as Spe956IncidentBaselineRecordsMap
  const seenIds = new Set<string>()

  for (const [mapKey, entry] of Object.entries(value)) {
    if (!isSafeMapKey(mapKey)) {
      continue
    }

    const record = sanitizeSpe956IncidentBaselineEntry(entry, mapKey)
    if (record === null) {
      continue
    }

    if (seenIds.has(record.incidentId)) {
      continue
    }

    seenIds.add(record.incidentId)
    next[record.incidentId] = record
  }

  return next
}

export function extractSpe956IncidentBaselineRecords(
  game: Spe956IncidentBaselineGameStateLike | null | undefined
): Spe956IncidentBaselineRecordsMap {
  return sanitizeSpe956IncidentBaselineRecords(game?.spe956IncidentBaselineRecords, {})
}

/** Resolve own-property incident baselines; reject unsafe ids. */
export function resolveSpe956IncidentBaselines(
  game: Spe956IncidentBaselineGameStateLike | null | undefined,
  incidentId: string
): Spe956PersistedIncidentBaselines | null {
  const trimmed = typeof incidentId === 'string' ? incidentId.trim() : ''
  if (trimmed.length === 0 || !isSafeMapKey(trimmed)) {
    return null
  }

  const records = extractSpe956IncidentBaselineRecords(game)
  if (!Object.prototype.hasOwnProperty.call(records, trimmed)) {
    return null
  }

  return records[trimmed] ?? null
}

export const SPE_956_EXAMPLE_INCIDENT_BASELINE_RECORDS: Spe956IncidentBaselineRecordsMap =
  Object.freeze(
    Object.assign(Object.create(null), {
      [SPE_956_EXAMPLE_INCIDENT_ID]: Object.freeze({
        incidentId: SPE_956_EXAMPLE_INCIDENT_ID,
        advisory: EXAMPLE_INCIDENT_BASELINE,
        hotline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
        asyncDiscussion: EXAMPLE_DISCUSSION_BASELINE,
        survivorSupport: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
        collectiveMemory: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
      }),
    })
  ) as Spe956IncidentBaselineRecordsMap
