/**
 * SPE-2632 / SPE-956 slice 1: GameState persistence for participatory channel envelopes.
 * Slice 1 persists survivor informal registry records only (SPE-2630 authored shape).
 * Sanitize/hydrate follows SPE-2621 pattern. No evaluator contract changes.
 */

import {
  CATALOG_RULES,
  CREDIBILITY_CEILINGS,
  EXAMPLE_SURVIVOR_REGISTRY,
  RECOGNITION_STANCES,
  SUPPORT_KNOWLEDGE_BANDS,
  type CatalogRule,
  type CredibilityCeiling,
  type RecognitionStance,
  type SupportKnowledgeBand,
  type SurvivorInformalRegistry,
} from './survivorInformalRegistry'

export const SPE_956_PARTICIPATORY_CHANNEL_PERSISTENCE_SCHEMA_VERSION =
  'spe-956-participatory-channel.v1' as const

export type Spe956ParticipatoryChannelPersistenceSchemaVersion =
  typeof SPE_956_PARTICIPATORY_CHANNEL_PERSISTENCE_SCHEMA_VERSION

/** Persisted survivor informal registry: opaque authored SPE-2630 channel envelope. */
export type Spe956PersistedSurvivorInformalRegistry = SurvivorInformalRegistry

export type Spe956SurvivorInformalRegistryRecordsMap = Record<
  string,
  Spe956PersistedSurvivorInformalRegistry
>

type PlainRecord = Record<string, unknown>

function isPlainRecord(value: unknown): value is PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeId(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function isSafeMapKey(id: string): boolean {
  return id !== '__proto__' && id !== 'constructor' && id !== 'prototype'
}

function isRecognitionStance(value: unknown): value is RecognitionStance {
  return typeof value === 'string' && (RECOGNITION_STANCES as readonly string[]).includes(value)
}

function isCatalogRule(value: unknown): value is CatalogRule {
  return typeof value === 'string' && (CATALOG_RULES as readonly string[]).includes(value)
}

function isSupportKnowledgeBand(value: unknown): value is SupportKnowledgeBand {
  return typeof value === 'string' && (SUPPORT_KNOWLEDGE_BANDS as readonly string[]).includes(value)
}

function isCredibilityCeiling(value: unknown): value is CredibilityCeiling {
  return typeof value === 'string' && (CREDIBILITY_CEILINGS as readonly string[]).includes(value)
}

function sanitizeSpe956SurvivorInformalRegistryEntry(
  value: unknown
): Spe956PersistedSurvivorInformalRegistry | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeId(value.id, '')
  if (
    id.length === 0 ||
    !isSafeMapKey(id) ||
    !isRecognitionStance(value.recognitionStance) ||
    !isCatalogRule(value.catalogRule) ||
    !isSupportKnowledgeBand(value.supportKnowledgeBand) ||
    !isCredibilityCeiling(value.credibilityCeiling)
  ) {
    return null
  }

  return Object.freeze({
    id,
    recognitionStance: value.recognitionStance,
    catalogRule: value.catalogRule,
    supportKnowledgeBand: value.supportKnowledgeBand,
    credibilityCeiling: value.credibilityCeiling,
  })
}

/** Hydration: canonical authored registry map keyed by registry id. */
export function sanitizeSpe956SurvivorInformalRegistryRecords(
  value: unknown,
  fallback: Spe956SurvivorInformalRegistryRecordsMap = {}
): Spe956SurvivorInformalRegistryRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next = Object.create(null) as Spe956SurvivorInformalRegistryRecordsMap
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeSpe956SurvivorInformalRegistryEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  // Plain-record input (including authored `{}`) wins over fallback so cleared
  // maps survive Zustand rehydration when current state still holds records.
  return next
}

export function extractSpe956SurvivorInformalRegistryRecords(
  game: Partial<{
    spe956SurvivorInformalRegistryRecords?: Spe956SurvivorInformalRegistryRecordsMap
  }>
): Spe956SurvivorInformalRegistryRecordsMap {
  return game.spe956SurvivorInformalRegistryRecords ?? {}
}

export function resolvePersistedSurvivorInformalRegistry(
  game: Partial<{
    spe956SurvivorInformalRegistryRecords?: Spe956SurvivorInformalRegistryRecordsMap
  }>,
  registryId: string
): Spe956PersistedSurvivorInformalRegistry | null {
  if (!isSafeMapKey(registryId)) {
    return null
  }

  const records = extractSpe956SurvivorInformalRegistryRecords(game)
  if (!Object.prototype.hasOwnProperty.call(records, registryId)) {
    return null
  }

  return records[registryId] ?? null
}

/** EXAMPLE persisted registry fixture (mirrors SPE-2630 authored registry). */
export const SPE_956_EXAMPLE_SURVIVOR_INFORMAL_REGISTRY_RECORDS: Spe956SurvivorInformalRegistryRecordsMap =
  Object.freeze({
    [EXAMPLE_SURVIVOR_REGISTRY.id]: EXAMPLE_SURVIVOR_REGISTRY,
  })
