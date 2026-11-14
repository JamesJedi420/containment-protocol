/**
 * SPE-2227 slice 1: deterministic bounded campaign region packet registry.
 *
 * Compact metadata for district, corridor, campus, and facility slices.
 * Boundaries and instability hooks are explicit. This is not a world map,
 * GameState field, or live traversal surface.
 */

export const REGION_KINDS = ['district', 'corridor', 'campus', 'facility'] as const
export type RegionKind = (typeof REGION_KINDS)[number]

export const INSTABILITY_HOOK_IDS = [
  'resource_scarcity',
  'social_pressure',
  'recurring_incident',
  'hostile_actor',
  'unsafe_route',
  'unresolved_contradiction',
] as const
export type InstabilityHookId = (typeof INSTABILITY_HOOK_IDS)[number]

const DOSSIER_TEXT_FIELDS = [
  'premise',
  'authorityStructure',
  'recurringIncidentPressure',
  'resourceScarcity',
  'socialPressure',
  'entryState',
  'exitState',
  'ecology',
  'history',
  'lifecycle',
] as const
const DOSSIER_LIST_FIELDS = [
  'sites',
  'unsafeRoutes',
  'localHazards',
  'hostileActors',
  'unresolvedContradictions',
  'operatingLaws',
] as const
type RegionDossier = Partial<
  Record<(typeof DOSSIER_TEXT_FIELDS)[number], string> &
    Record<(typeof DOSSIER_LIST_FIELDS)[number], readonly string[]>
>

/** Optional dossier text/lists describe authored context, never executable laws or live state. */
export interface BoundedCampaignRegionPacket extends Readonly<RegionDossier> {
  readonly id: string
  readonly regionKind: RegionKind
  readonly boundaryRefs: readonly string[]
  readonly instabilityHookIds: readonly InstabilityHookId[]
}

export interface RegionPacketValidationIssue {
  readonly code: string
  readonly field: string
  readonly packetId?: string
}

export interface RegionPacketValidationResult {
  readonly valid: boolean
  readonly issues: readonly RegionPacketValidationIssue[]
}

export type RegionPacketLookup =
  | { readonly status: 'found'; readonly packet: BoundedCampaignRegionPacket }
  | { readonly status: 'unknown_packet_id' }
  | { readonly status: 'ambiguous_packet_id' }
  | { readonly status: 'invalid_packet_id' }

const KIND_SET: ReadonlySet<string> = new Set(REGION_KINDS)
const HOOK_SET: ReadonlySet<string> = new Set(INSTABILITY_HOOK_IDS)
const PACKET_ID = /^region-packet:[a-z0-9]+(?:-[a-z0-9]+)*$/
const BOUNDARY_REF = /^boundary:[a-z0-9]+(?:-[a-z0-9]+)*$/

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

function freezePacket(input: BoundedCampaignRegionPacket): BoundedCampaignRegionPacket {
  const dossier: RegionDossier = {}
  for (const field of DOSSIER_TEXT_FIELDS) {
    if (input[field] !== undefined) dossier[field] = input[field]
  }
  for (const field of DOSSIER_LIST_FIELDS) {
    if (input[field] !== undefined) dossier[field] = Object.freeze([...input[field]])
  }
  return Object.freeze({
    id: input.id,
    regionKind: input.regionKind,
    boundaryRefs: Object.freeze([...input.boundaryRefs]),
    instabilityHookIds: Object.freeze([...input.instabilityHookIds]),
    ...dossier,
  })
}

function issuesResult(issues: RegionPacketValidationIssue[]): RegionPacketValidationResult {
  const ordered = issues
    .slice()
    .sort(
      (a, b) =>
        compareStrings(a.code, b.code) ||
        compareStrings(a.field, b.field) ||
        compareStrings(a.packetId ?? '', b.packetId ?? '')
    )
  return Object.freeze({
    valid: ordered.length === 0,
    issues: Object.freeze(ordered.map((issue) => Object.freeze({ ...issue }))),
  })
}

function validatePacket(
  input: unknown,
  index: number,
  issues: RegionPacketValidationIssue[]
): BoundedCampaignRegionPacket | null {
  const field = `packets[${index}]`
  if (!isPlainRecord(input)) {
    issues.push({ code: 'invalid_packet', field })
    return null
  }

  const id = token(input.id)
  const regionKind = token(input.regionKind)
  let legal = true

  if (!PACKET_ID.test(id)) {
    issues.push({
      code: 'invalid_packet_id',
      field: `${field}.id`,
      ...(id ? { packetId: id } : {}),
    })
    legal = false
  }
  if (!KIND_SET.has(regionKind)) {
    issues.push({
      code: 'unknown_region_kind',
      field: `${field}.regionKind`,
      ...(id ? { packetId: id } : {}),
    })
    legal = false
  }

  const rawBoundaries = input.boundaryRefs
  const boundaryRefs: string[] = []
  if (!Array.isArray(rawBoundaries) || rawBoundaries.length === 0) {
    issues.push({
      code: 'missing_boundary_refs',
      field: `${field}.boundaryRefs`,
      ...(id ? { packetId: id } : {}),
    })
    legal = false
  } else {
    for (let bIndex = 0; bIndex < rawBoundaries.length; bIndex += 1) {
      const ref = token(rawBoundaries[bIndex])
      if (!BOUNDARY_REF.test(ref)) {
        issues.push({
          code: 'invalid_boundary_ref',
          field: `${field}.boundaryRefs[${bIndex}]`,
          ...(id ? { packetId: id } : {}),
        })
        legal = false
      } else {
        boundaryRefs.push(ref)
      }
    }
  }

  const rawHooks = input.instabilityHookIds
  const instabilityHookIds: InstabilityHookId[] = []
  if (!Array.isArray(rawHooks)) {
    issues.push({
      code: 'invalid_instability_hooks',
      field: `${field}.instabilityHookIds`,
      ...(id ? { packetId: id } : {}),
    })
    legal = false
  } else {
    for (let hIndex = 0; hIndex < rawHooks.length; hIndex += 1) {
      const hook = token(rawHooks[hIndex])
      if (!HOOK_SET.has(hook)) {
        issues.push({
          code: 'unknown_instability_hook_id',
          field: `${field}.instabilityHookIds[${hIndex}]`,
          ...(id ? { packetId: id } : {}),
        })
        legal = false
      } else {
        instabilityHookIds.push(hook as InstabilityHookId)
      }
    }
  }

  const dossier: RegionDossier = {}
  for (const key of DOSSIER_TEXT_FIELDS) {
    if (input[key] === undefined) continue
    const value = token(input[key])
    if (typeof input[key] !== 'string' || value.length === 0) {
      issues.push({ code: 'invalid_dossier_field', field: `${field}.${key}`, packetId: id })
      legal = false
    } else dossier[key] = value
  }
  for (const key of DOSSIER_LIST_FIELDS) {
    const value = input[key]
    if (value === undefined) continue
    if (
      !Array.isArray(value) ||
      Array.from(value).some((item) => typeof item !== 'string' || !token(item))
    ) {
      issues.push({ code: 'invalid_dossier_field', field: `${field}.${key}`, packetId: id })
      legal = false
    } else dossier[key] = value.map(token)
  }

  if (!legal || !KIND_SET.has(regionKind)) return null

  return freezePacket({
    id,
    regionKind: regionKind as RegionKind,
    boundaryRefs,
    instabilityHookIds,
    ...dossier,
  })
}

/**
 * Accept a list of region packets. Explicit boundaries are required.
 * Unknown kinds, hooks, and missing boundary refs fail closed.
 * Input order is not significant for validity.
 */
export function validateBoundedCampaignRegionPackets(input: unknown): RegionPacketValidationResult {
  if (!Array.isArray(input)) {
    return issuesResult([{ code: 'invalid_registry', field: 'packets' }])
  }

  const issues: RegionPacketValidationIssue[] = []
  const seenIds = new Set<string>()

  for (let index = 0; index < input.length; index += 1) {
    const packet = validatePacket(input[index], index, issues)
    if (!packet) continue
    if (seenIds.has(packet.id)) {
      issues.push({
        code: 'duplicate_packet_id',
        field: `packets[${index}].id`,
        packetId: packet.id,
      })
    }
    seenIds.add(packet.id)
  }

  return issuesResult(issues)
}

/** Frozen copy sorted by packet id. Returns null when validation fails. */
export function normalizeBoundedCampaignRegionPackets(
  input: readonly BoundedCampaignRegionPacket[]
): readonly BoundedCampaignRegionPacket[] | null {
  const validation = validateBoundedCampaignRegionPackets(input)
  if (!validation.valid) return null
  const ordered = input
    .map((packet, index) => validatePacket(packet, index, [])!)
    .sort((a, b) => compareStrings(a.id, b.id))
  return Object.freeze(ordered)
}

export function lookupBoundedCampaignRegionPacket(
  packets: readonly BoundedCampaignRegionPacket[],
  packetId: string
): RegionPacketLookup {
  const id = token(packetId)
  if (!PACKET_ID.test(id)) {
    return Object.freeze({ status: 'invalid_packet_id' })
  }
  const matches = packets.filter((packet) => packet.id === id)
  if (matches.length === 0) return Object.freeze({ status: 'unknown_packet_id' })
  if (matches.length > 1) return Object.freeze({ status: 'ambiguous_packet_id' })
  return Object.freeze({ status: 'found', packet: freezePacket(matches[0]!) })
}

/** Authored slice-1 fixtures. Not live map state. */
export const BOUNDED_CAMPAIGN_REGION_PACKET_FIXTURES: readonly BoundedCampaignRegionPacket[] =
  Object.freeze([
    Object.freeze({
      id: 'region-packet:north-district',
      regionKind: 'district',
      boundaryRefs: Object.freeze(['boundary:north-edge', 'boundary:river-corridor']),
      instabilityHookIds: Object.freeze(['resource_scarcity', 'social_pressure'] as const),
      premise: 'Dense urban district with limited external resupply',
      authorityStructure: 'Municipal liaison with local containment post',
      recurringIncidentPressure: 'Weekly low-grade anomaly reports',
    }),
    Object.freeze({
      id: 'region-packet:service-corridor',
      regionKind: 'corridor',
      boundaryRefs: Object.freeze(['boundary:service-north', 'boundary:service-south']),
      instabilityHookIds: Object.freeze(['unsafe_route'] as const),
    }),
  ])
