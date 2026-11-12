import { describe, expect, it } from 'vitest'
import {
  FIXTURE_ESTABLISHED_FACT,
  FIXTURE_RESEARCH_WITHOUT_ADMISSION,
  FIXTURE_SUPERSESSION,
} from './crossPropertyCanonHandoff'
import {
  createEmptySharedUniverseCanonReleaseCatalog,
  diffSharedUniverseReleases,
  lookupSharedUniverseRelease,
  materializeSharedUniverseRelease,
  resolveDefaultNewCampaignRelease,
  resolveReleaseMember,
  sanitizeSharedUniverseCanonReleaseCatalog,
  setDefaultNewCampaignRelease,
  withdrawSharedUniverseRelease,
} from './sharedUniverseCanonReleaseCatalog'

describe('SPE-3300 shared-universe canon release catalog', () => {
  it('materializes a validated SPE-3282 packet into a stable release and is idempotent', () => {
    const empty = createEmptySharedUniverseCanonReleaseCatalog()
    const first = materializeSharedUniverseRelease(empty, FIXTURE_ESTABLISHED_FACT, {
      releaseLabel: 'blackwood-a',
      setAsNewCampaignDefault: true,
    })
    expect(first.ok).toBe(true)
    if (!first.ok || !first.release) return
    const second = materializeSharedUniverseRelease(first.catalog, FIXTURE_ESTABLISHED_FACT, {
      releaseLabel: 'blackwood-a',
    })
    expect(second.ok).toBe(true)
    expect(second.release?.releaseId).toBe(first.release.releaseId)
    expect(Object.keys(second.catalog.releases)).toHaveLength(1)
  })

  it('rejects research-only material that fails SPE-3282 promotion', () => {
    const result = materializeSharedUniverseRelease(
      createEmptySharedUniverseCanonReleaseCatalog(),
      FIXTURE_RESEARCH_WITHOUT_ADMISSION,
    )
    expect(result.ok).toBe(false)
    expect(result.diagnostics.some((d) => d.code === 'invalid_packet')).toBe(true)
  })

  it('keeps release A unchanged after publishing release B', () => {
    let catalog = createEmptySharedUniverseCanonReleaseCatalog()
    const a = materializeSharedUniverseRelease(catalog, FIXTURE_ESTABLISHED_FACT, {
      releaseLabel: 'rel-a',
      setAsNewCampaignDefault: true,
    })
    expect(a.ok).toBe(true)
    if (!a.ok || !a.release) return
    catalog = a.catalog
    const releaseAId = a.release.releaseId
    const membersA = a.release.orderedMemberRecordIds

    const bPacket = {
      ...FIXTURE_SUPERSESSION,
      packetId: 'packet.rel-b',
    }
    const b = materializeSharedUniverseRelease(catalog, bPacket, {
      releaseLabel: 'rel-b',
      predecessorReleaseId: releaseAId,
    })
    expect(b.ok).toBe(true)
    if (!b.ok) return
    const stillA = lookupSharedUniverseRelease(b.catalog, releaseAId)
    expect(stillA.ok).toBe(true)
    if (!stillA.ok) return
    expect(stillA.release.orderedMemberRecordIds).toEqual(membersA)
  })

  it('resolves a B-only member as introduced_later under release A', () => {
    let catalog = createEmptySharedUniverseCanonReleaseCatalog()
    const a = materializeSharedUniverseRelease(catalog, FIXTURE_ESTABLISHED_FACT, {
      releaseLabel: 'scope-a',
    })
    expect(a.ok).toBe(true)
    if (!a.ok || !a.release) return
    catalog = a.catalog
    const b = materializeSharedUniverseRelease(catalog, FIXTURE_SUPERSESSION, {
      releaseLabel: 'scope-b',
      predecessorReleaseId: a.release.releaseId,
    })
    expect(b.ok).toBe(true)
    if (!b.ok || !b.release) return
    const resolution = resolveReleaseMember(
      b.catalog,
      a.release.releaseId,
      'rec.replacement.1',
    )
    expect(resolution.kind).toBe('introduced_later')
  })

  it('diffs rename supersession as superseded while preserving shared entity', () => {
    const a = materializeSharedUniverseRelease(
      createEmptySharedUniverseCanonReleaseCatalog(),
      FIXTURE_ESTABLISHED_FACT,
      {
      releaseLabel: 'name-a',
    },
    )
    expect(a.ok).toBe(true)
    if (!a.ok || !a.release) return
    const renamePacket = {
      ...FIXTURE_SUPERSESSION,
      packetId: 'packet.rename-from-a',
      retainedPriorRecords: FIXTURE_ESTABLISHED_FACT.records,
      records: [
        {
          ...FIXTURE_SUPERSESSION.records[0]!,
          revision: {
            supersedesRecordId: 'rec.established.1',
            priorPromotedRecordId: 'rec.established.1',
            replacementRecordId: 'rec.replacement.1',
          },
        },
      ],
    }
    const b = materializeSharedUniverseRelease(a.catalog, renamePacket, {
      releaseLabel: 'name-b',
      predecessorReleaseId: a.release.releaseId,
    })
    expect(b.ok).toBe(true)
    if (!b.ok || !b.release) return
    const diff = diffSharedUniverseReleases(
      b.catalog,
      a.release.releaseId,
      b.release.releaseId,
    )
    expect(diff.ok).toBe(true)
    if (!diff.ok) return
    const superseded = diff.diff.entries.find((entry) => entry.classification === 'superseded')
    expect(superseded?.recordId).toBe('rec.established.1')
    expect(superseded?.toRevisionDigest).toBeDefined()
    expect(superseded?.sharedEntityId).toBe('su.entity.1')
    // Replacement member is represented via the superseded entry's toRevisionDigest,
    // not as a separate add+remove pair.
    expect(
      diff.diff.entries.some(
        (entry) =>
          entry.recordId === 'rec.replacement.1' && entry.classification === 'added',
      ),
    ).toBe(false)
  })

  it('withdraws a release from new-campaign eligibility while keeping historical lookup', () => {
    const materialized = materializeSharedUniverseRelease(
      createEmptySharedUniverseCanonReleaseCatalog(),
      FIXTURE_ESTABLISHED_FACT,
      { releaseLabel: 'withdraw-a', setAsNewCampaignDefault: true },
    )
    expect(materialized.ok).toBe(true)
    if (!materialized.ok || !materialized.release) return
    const withdrawn = withdrawSharedUniverseRelease(
      materialized.catalog,
      materialized.release.releaseId,
    )
    expect(withdrawn.ok).toBe(true)
    const lookup = lookupSharedUniverseRelease(
      withdrawn.catalog,
      materialized.release.releaseId,
    )
    expect(lookup.ok).toBe(true)
    if (!lookup.ok) return
    expect(lookup.release.supportState).toBe('withdrawn')
    expect(lookup.release.newCampaignEligible).toBe(false)
    const defaultResult = resolveDefaultNewCampaignRelease(withdrawn.catalog)
    expect(defaultResult.ok).toBe(false)
  })

  it('resolves an explicit default for new campaigns without inventing latest', () => {
    const emptyDefault = resolveDefaultNewCampaignRelease(
      createEmptySharedUniverseCanonReleaseCatalog(),
    )
    expect(emptyDefault.ok).toBe(false)

    const materialized = materializeSharedUniverseRelease(
      createEmptySharedUniverseCanonReleaseCatalog(),
      FIXTURE_ESTABLISHED_FACT,
      { releaseLabel: 'default-a' },
    )
    expect(materialized.ok).toBe(true)
    if (!materialized.ok || !materialized.release) return
    const withDefault = setDefaultNewCampaignRelease(
      materialized.catalog,
      materialized.release.releaseId,
    )
    expect(withDefault.ok).toBe(true)
    const resolved = resolveDefaultNewCampaignRelease(withDefault.catalog)
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    expect(resolved.release.releaseId).toBe(materialized.release.releaseId)
  })

  it('fails unknown release ids with stable diagnostics (no latest fallback)', () => {
    const result = lookupSharedUniverseRelease(
      createEmptySharedUniverseCanonReleaseCatalog(),
      'su.release.missing',
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diagnostics[0]?.code).toBe('unknown_release')
  })

  it('sanitizes malformed catalog input to empty without inventing releases', () => {
    expect(sanitizeSharedUniverseCanonReleaseCatalog(null).releases).toEqual({})
    expect(sanitizeSharedUniverseCanonReleaseCatalog({ schemaVersion: 'nope' }).releases).toEqual(
      {},
    )
  })

  it('round-trips a catalog through sanitize without losing release identity', () => {
    const materialized = materializeSharedUniverseRelease(
      createEmptySharedUniverseCanonReleaseCatalog(),
      FIXTURE_ESTABLISHED_FACT,
      { releaseLabel: 'persist-a', setAsNewCampaignDefault: true },
    )
    expect(materialized.ok).toBe(true)
    if (!materialized.ok) return
    const hydrated = sanitizeSharedUniverseCanonReleaseCatalog(
      JSON.parse(JSON.stringify(materialized.catalog)),
    )
    expect(Object.keys(hydrated.releases)).toEqual(Object.keys(materialized.catalog.releases))
    expect(hydrated.defaultNewCampaignReleaseId).toBe(
      materialized.catalog.defaultNewCampaignReleaseId,
    )
  })
})
