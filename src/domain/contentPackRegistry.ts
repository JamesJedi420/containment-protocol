/**
 * SPE-1510 — Generator content-pack registry (slice 1).
 *
 * Bounded pure-domain registry for named content packs that feed shared generators.
 * Supports registration, context-based inclusion/exclusion, and provenance retention.
 *
 * No mod platform, no GameState mutation, no flattening of all packs into one pool.
 */

export const CONTENT_PACK_REGISTRY_OWNER = 'SPE-1510' as const
export const CONTENT_PACK_REGISTRY_SCHEMA_VERSION = 'spe-1510.v1' as const
export const CONTENT_PACK_REGISTRY_MAX_PACKS = 32 as const

export const CONTENT_PACK_KINDS = [
  'core',
  'regional',
  'faction',
  'anomaly',
  'source_mined',
  'contract',
] as const
export type ContentPackKind = (typeof CONTENT_PACK_KINDS)[number]

export interface ContentPackContext {
  readonly route?: string
  readonly biome?: string
  readonly legality?: 'legal' | 'restricted' | 'forbidden'
  readonly projectState?: string
}

export interface ContentPack {
  readonly id: string
  readonly name: string
  readonly kind: ContentPackKind
  readonly entries: readonly string[]
  readonly includeWhen?: Readonly<Partial<ContentPackContext>>
  readonly excludeWhen?: Readonly<Partial<ContentPackContext>>
}

export interface ContentPackRegistry {
  readonly schemaVersion: typeof CONTENT_PACK_REGISTRY_SCHEMA_VERSION
  readonly packs: Readonly<Record<string, ContentPack>>
}

export interface SelectedPackResult {
  readonly packId: string
  readonly entries: readonly string[]
  readonly provenance: string
}

const FORBIDDEN_IDS = new Set(['__proto__', 'constructor', 'prototype'])

function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !FORBIDDEN_IDS.has(value.trim())
}

function matchesContext(gate: Readonly<Partial<ContentPackContext>> | undefined, ctx: ContentPackContext): boolean {
  if (!gate) return true
  if (gate.route !== undefined && gate.route !== ctx.route) return false
  if (gate.biome !== undefined && gate.biome !== ctx.biome) return false
  if (gate.legality !== undefined && gate.legality !== ctx.legality) return false
  if (gate.projectState !== undefined && gate.projectState !== ctx.projectState) return false
  return true
}

export function createEmptyContentPackRegistry(): ContentPackRegistry {
  return Object.freeze({
    schemaVersion: CONTENT_PACK_REGISTRY_SCHEMA_VERSION,
    packs: Object.freeze(Object.create(null)),
  })
}

export function registerContentPack(
  registry: ContentPackRegistry,
  pack: ContentPack
): ContentPackRegistry | null {
  if (!isSafeId(pack.id) || !isSafeId(pack.name)) return null
  if (!(CONTENT_PACK_KINDS as readonly string[]).includes(pack.kind)) return null
  if (!Array.isArray(pack.entries) || pack.entries.some((e) => typeof e !== 'string')) return null
  if (Object.keys(registry.packs).length >= CONTENT_PACK_REGISTRY_MAX_PACKS && !(pack.id in registry.packs)) {
    return null
  }
  const packs = { ...registry.packs, [pack.id]: Object.freeze({ ...pack }) }
  return Object.freeze({
    schemaVersion: registry.schemaVersion,
    packs: Object.freeze(packs),
  })
}

/**
 * Select contributing packs for a context and return entries with provenance.
 * Deterministic: packs ordered by id.
 */
export function selectContentPacks(
  registry: ContentPackRegistry,
  ctx: ContentPackContext
): readonly SelectedPackResult[] {
  const results: SelectedPackResult[] = []
  const ids = Object.keys(registry.packs).sort()
  for (const id of ids) {
    const pack = registry.packs[id]
    if (!pack) continue
    const include = matchesContext(pack.includeWhen, ctx)
    const exclude = pack.excludeWhen ? matchesContext(pack.excludeWhen, ctx) : false
    if (include && !exclude) {
      results.push(
        Object.freeze({
          packId: pack.id,
          entries: Object.freeze([...pack.entries]),
          provenance: `${CONTENT_PACK_REGISTRY_OWNER}:${pack.id}:${pack.kind}`,
        })
      )
    }
  }
  return Object.freeze(results)
}
