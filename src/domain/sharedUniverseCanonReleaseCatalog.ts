/**
 * SPE-3300 — shared-universe canon release catalog and scoped resolver.
 *
 * Immutable release catalog over SPE-3282 promotion/release-membership inputs.
 * Non-campaign authoritative content — no GameState ownership. Campaign binding
 * stays with SPE-3293; transport/materialization orchestration stays SPE-3175.
 */

import {
  CROSS_PROPERTY_CANON_HANDOFF_SCHEMA_VERSION,
  type CrossPropertyCanonHandoffPacket,
  type CrossPropertyCanonRecord,
  type SharedUniverseReleaseManifest,
  validateCrossPropertyCanonHandoff,
} from './crossPropertyCanonHandoff'

export const SHARED_UNIVERSE_CANON_RELEASE_CATALOG_SCHEMA_VERSION =
  'spe-3300.v1' as const
export type SharedUniverseCanonReleaseCatalogSchemaVersion =
  typeof SHARED_UNIVERSE_CANON_RELEASE_CATALOG_SCHEMA_VERSION

export type SharedUniverseCanonReleaseId = string

export const RELEASE_SUPPORT_STATES = [
  'supported',
  'withdrawn',
  'tombstoned',
] as const
export type ReleaseSupportState = (typeof RELEASE_SUPPORT_STATES)[number]

export const RELEASE_MEMBER_RESOLUTION_KINDS = [
  'present_exact_revision',
  'absent',
  'superseded',
  'withdrawn',
  'introduced_later',
  'unknown_member',
  'invalid_release',
] as const
export type ReleaseMemberResolutionKind =
  (typeof RELEASE_MEMBER_RESOLUTION_KINDS)[number]

export const RELEASE_DIFF_CLASSIFICATIONS = [
  'added',
  'removed',
  'revised',
  'superseded',
  'unchanged',
] as const
export type ReleaseDiffClassification =
  (typeof RELEASE_DIFF_CLASSIFICATIONS)[number]

export const SHARED_UNIVERSE_CANON_RELEASE_CATALOG_DIAGNOSTICS = [
  'empty_release_id',
  'duplicate_release_id',
  'invalid_packet',
  'unknown_release',
  'withdrawn_cannot_be_default',
  'no_eligible_default',
  'inconsistent_manifest',
] as const
export type SharedUniverseCanonReleaseCatalogDiagnostic =
  (typeof SHARED_UNIVERSE_CANON_RELEASE_CATALOG_DIAGNOSTICS)[number]

export interface SharedUniverseCanonReleaseCatalogDiagnosticRecord {
  readonly code: SharedUniverseCanonReleaseCatalogDiagnostic
  readonly field: string
  readonly message: string
  readonly releaseId?: string
}

export interface SharedUniverseReleaseMemberRevision {
  readonly recordId: string
  readonly revisionDigest: string
  readonly claimStatus: CrossPropertyCanonRecord['claimStatus']
  readonly sharedEntityId?: string
  readonly approvedName?: string
  readonly supersedesRecordId?: string
  readonly summary: string
}

export interface SharedUniverseCanonReleaseRecord {
  readonly schemaVersion: SharedUniverseCanonReleaseCatalogSchemaVersion
  readonly releaseId: SharedUniverseCanonReleaseId
  readonly orderedMemberRecordIds: readonly string[]
  readonly members: Readonly<Record<string, SharedUniverseReleaseMemberRevision>>
  readonly predecessorReleaseId?: SharedUniverseCanonReleaseId
  readonly supportState: ReleaseSupportState
  readonly newCampaignEligible: boolean
  readonly provenancePacketId: string
  readonly materializedFromSchema: typeof CROSS_PROPERTY_CANON_HANDOFF_SCHEMA_VERSION
}

export interface SharedUniverseCanonReleaseCatalog {
  readonly schemaVersion: SharedUniverseCanonReleaseCatalogSchemaVersion
  readonly releases: Readonly<Record<string, SharedUniverseCanonReleaseRecord>>
  readonly defaultNewCampaignReleaseId: SharedUniverseCanonReleaseId | null
}

export interface ReleaseMemberResolution {
  readonly kind: ReleaseMemberResolutionKind
  readonly releaseId: SharedUniverseCanonReleaseId
  readonly recordId: string
  readonly revision?: SharedUniverseReleaseMemberRevision
}

export interface ReleaseStructuralDiffEntry {
  readonly recordId: string
  readonly classification: ReleaseDiffClassification
  readonly fromRevisionDigest?: string
  readonly toRevisionDigest?: string
  readonly sharedEntityId?: string
}

export interface ReleaseStructuralDiff {
  readonly fromReleaseId: SharedUniverseCanonReleaseId
  readonly toReleaseId: SharedUniverseCanonReleaseId
  readonly entries: readonly ReleaseStructuralDiffEntry[]
}

function compareStrings(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function diagnostic(
  code: SharedUniverseCanonReleaseCatalogDiagnostic,
  field: string,
  message: string,
  releaseId?: string,
): SharedUniverseCanonReleaseCatalogDiagnosticRecord {
  return Object.freeze({
    code,
    field,
    message,
    ...(releaseId !== undefined ? { releaseId } : {}),
  })
}

function freezeDiagnostics(
  diagnostics: readonly SharedUniverseCanonReleaseCatalogDiagnosticRecord[],
): readonly SharedUniverseCanonReleaseCatalogDiagnosticRecord[] {
  return Object.freeze(
    [...diagnostics]
      .sort(
        (left, right) =>
          compareStrings(left.code, right.code) ||
          compareStrings(left.field, right.field) ||
          compareStrings(left.releaseId ?? '', right.releaseId ?? ''),
      )
      .map((entry) => Object.freeze({ ...entry })),
  )
}

function memberRevisionFromRecord(
  record: CrossPropertyCanonRecord,
  digest: string,
): SharedUniverseReleaseMemberRevision {
  return Object.freeze({
    recordId: record.recordId.trim(),
    revisionDigest: digest,
    claimStatus: record.claimStatus,
    sharedEntityId: record.entity?.sharedEntityId,
    approvedName: record.entity?.naming.approvedName,
    supersedesRecordId: record.revision?.supersedesRecordId,
    summary: record.summary,
  })
}

export function createEmptySharedUniverseCanonReleaseCatalog(): SharedUniverseCanonReleaseCatalog {
  return Object.freeze({
    schemaVersion: SHARED_UNIVERSE_CANON_RELEASE_CATALOG_SCHEMA_VERSION,
    releases: Object.freeze(Object.create(null) as Record<string, SharedUniverseCanonReleaseRecord>),
    defaultNewCampaignReleaseId: null,
  })
}

/**
 * Materialize a validated SPE-3282 packet+release into the catalog.
 * Idempotent for identical releaseId + member digests.
 */
export function materializeSharedUniverseRelease(
  catalog: SharedUniverseCanonReleaseCatalog,
  packet: CrossPropertyCanonHandoffPacket,
  options?: {
    readonly releaseLabel?: string
    readonly predecessorReleaseId?: SharedUniverseCanonReleaseId
    readonly setAsNewCampaignDefault?: boolean
  },
): {
  readonly ok: boolean
  readonly catalog: SharedUniverseCanonReleaseCatalog
  readonly release?: SharedUniverseCanonReleaseRecord
  readonly diagnostics: readonly SharedUniverseCanonReleaseCatalogDiagnosticRecord[]
} {
  const validation = validateCrossPropertyCanonHandoff(packet, {
    buildRelease: true,
    releaseLabel: options?.releaseLabel,
  })
  if (!validation.ok || validation.release === undefined) {
    return {
      ok: false,
      catalog,
      diagnostics: freezeDiagnostics([
        diagnostic(
          'invalid_packet',
          'packet',
          'SPE-3282 validation failed; release not materialized',
        ),
      ]),
    }
  }

  const manifest: SharedUniverseReleaseManifest = validation.release
  const releaseId = manifest.releaseId.trim()
  if (releaseId.length === 0) {
    return {
      ok: false,
      catalog,
      diagnostics: freezeDiagnostics([
        diagnostic('empty_release_id', 'releaseId', 'releaseId is required'),
      ]),
    }
  }

  const existing = catalog.releases[releaseId]
  if (existing) {
    const sameMembership =
      existing.orderedMemberRecordIds.length === manifest.orderedMemberRecordIds.length &&
      existing.orderedMemberRecordIds.every(
        (id, index) => id === manifest.orderedMemberRecordIds[index],
      ) &&
      manifest.orderedMemberRecordIds.every((id, index) => {
        const member = existing.members[id]
        return member?.revisionDigest === manifest.memberDigests[index]
      })
    if (sameMembership) {
      return {
        ok: true,
        catalog,
        release: existing,
        diagnostics: Object.freeze([]),
      }
    }
    return {
      ok: false,
      catalog,
      diagnostics: freezeDiagnostics([
        diagnostic(
          'duplicate_release_id',
          'releaseId',
          'Release id already exists with different membership',
          releaseId,
        ),
      ]),
    }
  }

  const members: Record<string, SharedUniverseReleaseMemberRevision> = Object.create(null)
  for (let index = 0; index < manifest.orderedMemberRecordIds.length; index += 1) {
    const recordId = manifest.orderedMemberRecordIds[index]!
    const record = packet.records.find((entry) => entry.recordId.trim() === recordId)
    if (!record) {
      return {
        ok: false,
        catalog,
        diagnostics: freezeDiagnostics([
          diagnostic(
            'inconsistent_manifest',
            `members[${recordId}]`,
            'Manifest member missing from packet records',
            releaseId,
          ),
        ]),
      }
    }
    members[recordId] = memberRevisionFromRecord(record, manifest.memberDigests[index]!)
  }

  const release: SharedUniverseCanonReleaseRecord = Object.freeze({
    schemaVersion: SHARED_UNIVERSE_CANON_RELEASE_CATALOG_SCHEMA_VERSION,
    releaseId,
    orderedMemberRecordIds: Object.freeze([...manifest.orderedMemberRecordIds]),
    members: Object.freeze(members),
    predecessorReleaseId: options?.predecessorReleaseId,
    supportState: 'supported' as const,
    newCampaignEligible: true,
    provenancePacketId: packet.packetId,
    materializedFromSchema: CROSS_PROPERTY_CANON_HANDOFF_SCHEMA_VERSION,
  })

  const nextReleases: Record<string, SharedUniverseCanonReleaseRecord> = Object.create(null)
  for (const [id, entry] of Object.entries(catalog.releases)) {
    nextReleases[id] = entry
  }
  nextReleases[releaseId] = release

  let defaultId = catalog.defaultNewCampaignReleaseId
  if (options?.setAsNewCampaignDefault === true) {
    defaultId = releaseId
  }

  return {
    ok: true,
    catalog: Object.freeze({
      schemaVersion: SHARED_UNIVERSE_CANON_RELEASE_CATALOG_SCHEMA_VERSION,
      releases: Object.freeze(nextReleases),
      defaultNewCampaignReleaseId: defaultId,
    }),
    release,
    diagnostics: Object.freeze([]),
  }
}

export function lookupSharedUniverseRelease(
  catalog: SharedUniverseCanonReleaseCatalog,
  releaseId: SharedUniverseCanonReleaseId,
):
  | { readonly ok: true; readonly release: SharedUniverseCanonReleaseRecord }
  | {
      readonly ok: false
      readonly diagnostics: readonly SharedUniverseCanonReleaseCatalogDiagnosticRecord[]
    } {
  const trimmed = releaseId.trim()
  if (trimmed.length === 0) {
    return {
      ok: false,
      diagnostics: freezeDiagnostics([
        diagnostic('empty_release_id', 'releaseId', 'releaseId is required'),
      ]),
    }
  }
  const release = catalog.releases[trimmed]
  if (!release) {
    return {
      ok: false,
      diagnostics: freezeDiagnostics([
        diagnostic('unknown_release', 'releaseId', 'Unknown release id', trimmed),
      ]),
    }
  }
  return { ok: true, release }
}

export function withdrawSharedUniverseRelease(
  catalog: SharedUniverseCanonReleaseCatalog,
  releaseId: SharedUniverseCanonReleaseId,
  options?: { readonly tombstone?: boolean },
): {
  readonly ok: boolean
  readonly catalog: SharedUniverseCanonReleaseCatalog
  readonly diagnostics: readonly SharedUniverseCanonReleaseCatalogDiagnosticRecord[]
} {
  const lookedUp = lookupSharedUniverseRelease(catalog, releaseId)
  if (!lookedUp.ok) {
    return { ok: false, catalog, diagnostics: lookedUp.diagnostics }
  }
  const release = lookedUp.release
  const nextState: ReleaseSupportState = options?.tombstone === true ? 'tombstoned' : 'withdrawn'
  const updated: SharedUniverseCanonReleaseRecord = Object.freeze({
    ...release,
    supportState: nextState,
    newCampaignEligible: false,
  })
  const nextReleases: Record<string, SharedUniverseCanonReleaseRecord> = Object.create(null)
  for (const [id, entry] of Object.entries(catalog.releases)) {
    nextReleases[id] = id === release.releaseId ? updated : entry
  }
  let defaultId = catalog.defaultNewCampaignReleaseId
  if (defaultId === release.releaseId) {
    defaultId = null
  }
  return {
    ok: true,
    catalog: Object.freeze({
      schemaVersion: SHARED_UNIVERSE_CANON_RELEASE_CATALOG_SCHEMA_VERSION,
      releases: Object.freeze(nextReleases),
      defaultNewCampaignReleaseId: defaultId,
    }),
    diagnostics: Object.freeze([]),
  }
}

export function setDefaultNewCampaignRelease(
  catalog: SharedUniverseCanonReleaseCatalog,
  releaseId: SharedUniverseCanonReleaseId | null,
): {
  readonly ok: boolean
  readonly catalog: SharedUniverseCanonReleaseCatalog
  readonly diagnostics: readonly SharedUniverseCanonReleaseCatalogDiagnosticRecord[]
} {
  if (releaseId === null) {
    return {
      ok: true,
      catalog: Object.freeze({
        ...catalog,
        defaultNewCampaignReleaseId: null,
      }),
      diagnostics: Object.freeze([]),
    }
  }
  const lookedUp = lookupSharedUniverseRelease(catalog, releaseId)
  if (!lookedUp.ok) {
    return { ok: false, catalog, diagnostics: lookedUp.diagnostics }
  }
  if (!lookedUp.release.newCampaignEligible || lookedUp.release.supportState !== 'supported') {
    return {
      ok: false,
      catalog,
      diagnostics: freezeDiagnostics([
        diagnostic(
          'withdrawn_cannot_be_default',
          'defaultNewCampaignReleaseId',
          'Withdrawn/tombstoned releases cannot be new-campaign default',
          lookedUp.release.releaseId,
        ),
      ]),
    }
  }
  return {
    ok: true,
    catalog: Object.freeze({
      ...catalog,
      defaultNewCampaignReleaseId: lookedUp.release.releaseId,
    }),
    diagnostics: Object.freeze([]),
  }
}

export function resolveDefaultNewCampaignRelease(
  catalog: SharedUniverseCanonReleaseCatalog,
):
  | { readonly ok: true; readonly release: SharedUniverseCanonReleaseRecord }
  | {
      readonly ok: false
      readonly diagnostics: readonly SharedUniverseCanonReleaseCatalogDiagnosticRecord[]
    } {
  if (catalog.defaultNewCampaignReleaseId === null) {
    return {
      ok: false,
      diagnostics: freezeDiagnostics([
        diagnostic(
          'no_eligible_default',
          'defaultNewCampaignReleaseId',
          'No eligible new-campaign default release is selected',
        ),
      ]),
    }
  }
  const lookedUp = lookupSharedUniverseRelease(catalog, catalog.defaultNewCampaignReleaseId)
  if (!lookedUp.ok) return lookedUp
  if (!lookedUp.release.newCampaignEligible || lookedUp.release.supportState !== 'supported') {
    return {
      ok: false,
      diagnostics: freezeDiagnostics([
        diagnostic(
          'withdrawn_cannot_be_default',
          'defaultNewCampaignReleaseId',
          'Default release is no longer eligible',
          lookedUp.release.releaseId,
        ),
      ]),
    }
  }
  return lookedUp
}

/**
 * Scoped membership resolution for a promoted record id under a release.
 */
export function resolveReleaseMember(
  catalog: SharedUniverseCanonReleaseCatalog,
  releaseId: SharedUniverseCanonReleaseId,
  recordId: string,
): ReleaseMemberResolution {
  const trimmedRelease = releaseId.trim()
  const trimmedRecord = recordId.trim()
  const release = catalog.releases[trimmedRelease]
  if (!release) {
    return Object.freeze({
      kind: 'invalid_release' as const,
      releaseId: trimmedRelease,
      recordId: trimmedRecord,
    })
  }
  if (release.supportState === 'tombstoned' && release.members[trimmedRecord] === undefined) {
    // Tombstone still allows historical member lookup when present.
  }
  const member = release.members[trimmedRecord]
  if (member) {
    if (release.supportState === 'withdrawn' || release.supportState === 'tombstoned') {
      // Member remains historically resolvable; withdrawn applies to eligibility, not erase.
    }
    if (member.supersedesRecordId !== undefined) {
      // Present as the superseding revision for this release.
    }
    return Object.freeze({
      kind: 'present_exact_revision' as const,
      releaseId: trimmedRelease,
      recordId: trimmedRecord,
      revision: member,
    })
  }

  // Check whether any member supersedes this record id within the release.
  for (const candidate of Object.values(release.members)) {
    if (candidate.supersedesRecordId?.trim() === trimmedRecord) {
      return Object.freeze({
        kind: 'superseded' as const,
        releaseId: trimmedRelease,
        recordId: trimmedRecord,
        revision: candidate,
      })
    }
  }

  // Globally known in a later release?
  for (const other of Object.values(catalog.releases)) {
    if (other.releaseId === trimmedRelease) continue
    if (other.members[trimmedRecord] !== undefined) {
      const later =
        other.predecessorReleaseId === trimmedRelease ||
        release.predecessorReleaseId === undefined
      if (later && other.members[trimmedRecord]) {
        return Object.freeze({
          kind: 'introduced_later' as const,
          releaseId: trimmedRelease,
          recordId: trimmedRecord,
          revision: other.members[trimmedRecord],
        })
      }
    }
  }

  // Known anywhere?
  const knownAnywhere = Object.values(catalog.releases).some(
    (entry) => entry.members[trimmedRecord] !== undefined,
  )
  if (!knownAnywhere) {
    return Object.freeze({
      kind: 'unknown_member' as const,
      releaseId: trimmedRelease,
      recordId: trimmedRecord,
    })
  }
  return Object.freeze({
    kind: 'absent' as const,
    releaseId: trimmedRelease,
    recordId: trimmedRecord,
  })
}

/**
 * Deterministic structural diff A → B by record identity (not list position).
 */
export function diffSharedUniverseReleases(
  catalog: SharedUniverseCanonReleaseCatalog,
  fromReleaseId: SharedUniverseCanonReleaseId,
  toReleaseId: SharedUniverseCanonReleaseId,
):
  | { readonly ok: true; readonly diff: ReleaseStructuralDiff }
  | {
      readonly ok: false
      readonly diagnostics: readonly SharedUniverseCanonReleaseCatalogDiagnosticRecord[]
    } {
  const fromLookup = lookupSharedUniverseRelease(catalog, fromReleaseId)
  if (!fromLookup.ok) return fromLookup
  const toLookup = lookupSharedUniverseRelease(catalog, toReleaseId)
  if (!toLookup.ok) return toLookup

  const from = fromLookup.release
  const to = toLookup.release
  const ids = new Set([
    ...Object.keys(from.members),
    ...Object.keys(to.members),
  ])
  const entries: ReleaseStructuralDiffEntry[] = []
  for (const recordId of [...ids].sort(compareStrings)) {
    const left = from.members[recordId]
    const right = to.members[recordId]
    if (left && !right) {
      // Removed unless a later member supersedes it.
      const superseder = Object.values(to.members).find(
        (member) => member.supersedesRecordId?.trim() === recordId,
      )
      if (superseder) {
        entries.push(
          Object.freeze({
            recordId,
            classification: 'superseded' as const,
            fromRevisionDigest: left.revisionDigest,
            toRevisionDigest: superseder.revisionDigest,
            sharedEntityId: superseder.sharedEntityId ?? left.sharedEntityId,
          }),
        )
      } else {
        entries.push(
          Object.freeze({
            recordId,
            classification: 'removed' as const,
            fromRevisionDigest: left.revisionDigest,
            sharedEntityId: left.sharedEntityId,
          }),
        )
      }
      continue
    }
    if (!left && right) {
      if (right.supersedesRecordId && from.members[right.supersedesRecordId.trim()]) {
        // Covered when iterating the superseded prior id.
        continue
      }
      entries.push(
        Object.freeze({
          recordId,
          classification: 'added' as const,
          toRevisionDigest: right.revisionDigest,
          sharedEntityId: right.sharedEntityId,
        }),
      )
      continue
    }
    if (left && right) {
      if (left.revisionDigest === right.revisionDigest) {
        entries.push(
          Object.freeze({
            recordId,
            classification: 'unchanged' as const,
            fromRevisionDigest: left.revisionDigest,
            toRevisionDigest: right.revisionDigest,
            sharedEntityId: right.sharedEntityId ?? left.sharedEntityId,
          }),
        )
      } else {
        entries.push(
          Object.freeze({
            recordId,
            classification: 'revised' as const,
            fromRevisionDigest: left.revisionDigest,
            toRevisionDigest: right.revisionDigest,
            sharedEntityId: right.sharedEntityId ?? left.sharedEntityId,
          }),
        )
      }
    }
  }

  return {
    ok: true,
    diff: Object.freeze({
      fromReleaseId: from.releaseId,
      toReleaseId: to.releaseId,
      entries: Object.freeze(entries),
    }),
  }
}

/**
 * Fail-closed hydrate for non-campaign catalog persistence callers.
 * Absent/malformed → empty catalog (no invented releases).
 */
export function sanitizeSharedUniverseCanonReleaseCatalog(
  input: unknown,
): SharedUniverseCanonReleaseCatalog {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return createEmptySharedUniverseCanonReleaseCatalog()
  }
  const record = input as Record<string, unknown>
  if (record.schemaVersion !== SHARED_UNIVERSE_CANON_RELEASE_CATALOG_SCHEMA_VERSION) {
    return createEmptySharedUniverseCanonReleaseCatalog()
  }
  if (typeof record.releases !== 'object' || record.releases === null || Array.isArray(record.releases)) {
    return createEmptySharedUniverseCanonReleaseCatalog()
  }
  const releases: Record<string, SharedUniverseCanonReleaseRecord> = Object.create(null)
  for (const [id, value] of Object.entries(record.releases as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue
    const entry = value as Record<string, unknown>
    if (typeof entry.releaseId !== 'string' || entry.releaseId.trim() !== id.trim()) continue
    if (!Array.isArray(entry.orderedMemberRecordIds)) continue
    if (typeof entry.members !== 'object' || entry.members === null) continue
    const supportState = entry.supportState
    if (
      supportState !== 'supported' &&
      supportState !== 'withdrawn' &&
      supportState !== 'tombstoned'
    ) {
      continue
    }
    const members: Record<string, SharedUniverseReleaseMemberRevision> = Object.create(null)
    for (const [memberId, memberValue] of Object.entries(
      entry.members as Record<string, unknown>,
    )) {
      if (typeof memberValue !== 'object' || memberValue === null) continue
      const member = memberValue as Record<string, unknown>
      if (typeof member.recordId !== 'string' || typeof member.revisionDigest !== 'string') continue
      if (typeof member.summary !== 'string' || typeof member.claimStatus !== 'string') continue
      members[memberId] = Object.freeze({
        recordId: member.recordId,
        revisionDigest: member.revisionDigest,
        claimStatus: member.claimStatus as CrossPropertyCanonRecord['claimStatus'],
        sharedEntityId:
          typeof member.sharedEntityId === 'string' ? member.sharedEntityId : undefined,
        approvedName: typeof member.approvedName === 'string' ? member.approvedName : undefined,
        supersedesRecordId:
          typeof member.supersedesRecordId === 'string' ? member.supersedesRecordId : undefined,
        summary: member.summary,
      })
    }
    releases[id] = Object.freeze({
      schemaVersion: SHARED_UNIVERSE_CANON_RELEASE_CATALOG_SCHEMA_VERSION,
      releaseId: entry.releaseId,
      orderedMemberRecordIds: Object.freeze(
        entry.orderedMemberRecordIds.filter((item): item is string => typeof item === 'string'),
      ),
      members: Object.freeze(members),
      predecessorReleaseId:
        typeof entry.predecessorReleaseId === 'string' ? entry.predecessorReleaseId : undefined,
      supportState,
      newCampaignEligible: entry.newCampaignEligible === true,
      provenancePacketId:
        typeof entry.provenancePacketId === 'string' ? entry.provenancePacketId : '',
      materializedFromSchema: CROSS_PROPERTY_CANON_HANDOFF_SCHEMA_VERSION,
    })
  }
  const defaultId =
    typeof record.defaultNewCampaignReleaseId === 'string'
      ? record.defaultNewCampaignReleaseId
      : null
  return Object.freeze({
    schemaVersion: SHARED_UNIVERSE_CANON_RELEASE_CATALOG_SCHEMA_VERSION,
    releases: Object.freeze(releases),
    defaultNewCampaignReleaseId:
      defaultId !== null && releases[defaultId] !== undefined ? defaultId : null,
  })
}
