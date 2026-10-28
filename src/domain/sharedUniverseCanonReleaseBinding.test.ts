import { describe, expect, it } from 'vitest'
import { FIXTURE_ESTABLISHED_FACT, FIXTURE_SUPERSESSION } from './crossPropertyCanonHandoff'
import type { RuleChangeTransitionDeclaration } from './ruleChangeTransitionContract'
import {
  createEmptySharedUniverseCanonReleaseCatalog,
  materializeSharedUniverseRelease,
} from './sharedUniverseCanonReleaseCatalog'
import {
  adoptSharedUniverseRelease,
  bindNewCampaignToSharedUniverseRelease,
  createLegacyUnboundSharedUniverseBinding,
  getBoundSharedUniverseReleaseId,
  recordEntityMaterializationReceipt,
  recordRelationMaterializationReceipt,
  sanitizeSharedUniverseCanonReleaseBinding,
} from './sharedUniverseCanonReleaseBinding'
import { sanitizeCampaignLedger, createSeedCampaignLedger } from './campaignLedger'

function adoptionDeclaration(
  fromReleaseId: string,
  toReleaseId: string,
): RuleChangeTransitionDeclaration {
  return {
    transitionId: `transition:su.${fromReleaseId}.${toReleaseId}`,
    source: { ruleId: 'rule:shared-universe-release', versionId: fromReleaseId },
    target: { ruleId: 'rule:shared-universe-release', versionId: toReleaseId },
    effectivePoint: { week: 5, branchId: 'branch:main' },
    affectedFamilies: [
      {
        stateFamily: 'shared_universe_binding',
        policy: 'migrate_existing',
        domainHandlerRef: 'handler:su-release-adopt',
      },
    ],
  }
}

describe('SPE-3293 shared-universe canon release binding', () => {
  it('binds two new campaigns to the same default release identically', () => {
    const materialized = materializeSharedUniverseRelease(
      createEmptySharedUniverseCanonReleaseCatalog(),
      FIXTURE_ESTABLISHED_FACT,
      { releaseLabel: 'camp-default', setAsNewCampaignDefault: true },
    )
    expect(materialized.ok).toBe(true)
    if (!materialized.ok || !materialized.release) return
    const a = bindNewCampaignToSharedUniverseRelease({
      catalog: materialized.catalog,
      requireSharedUniverse: true,
    })
    const b = bindNewCampaignToSharedUniverseRelease({
      catalog: materialized.catalog,
      requireSharedUniverse: true,
    })
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    expect(a.binding.releaseId).toBe(b.binding.releaseId)
    expect(a.binding.releaseId).toBe(materialized.release.releaseId)
  })

  it('fails new-campaign bind when default is missing', () => {
    const result = bindNewCampaignToSharedUniverseRelease({
      catalog: createEmptySharedUniverseCanonReleaseCatalog(),
      requireSharedUniverse: true,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diagnostics[0]?.code).toBe('missing_default')
  })

  it('hydrates absent ledger metadata to legacy_unbound, not latest', () => {
    const binding = sanitizeSharedUniverseCanonReleaseBinding(undefined)
    expect(binding.kind).toBe('legacy_unbound')
    expect(getBoundSharedUniverseReleaseId(binding)).toBeNull()

    const ledger = sanitizeCampaignLedger({}, createSeedCampaignLedger())
    expect(ledger.sharedUniverseCanonRelease?.kind).toBe('legacy_unbound')
  })

  it('preserves bound release across sanitize round-trip', () => {
    const binding = {
      schemaVersion: 'spe-3293.v1' as const,
      kind: 'bound' as const,
      releaseId: 'su.release.test',
      boundAtWeek: 3,
      priorReleaseIds: ['su.release.prior'],
      lastAdoptionReceiptId: 'su.adopt.x',
    }
    const hydrated = sanitizeSharedUniverseCanonReleaseBinding(
      JSON.parse(JSON.stringify(binding)),
    )
    expect(hydrated).toEqual(binding)
  })

  it('does not change an existing binding when a newer release is published', () => {
    let catalog = createEmptySharedUniverseCanonReleaseCatalog()
    const a = materializeSharedUniverseRelease(catalog, FIXTURE_ESTABLISHED_FACT, {
      releaseLabel: 'stable-a',
      setAsNewCampaignDefault: true,
    })
    expect(a.ok).toBe(true)
    if (!a.ok || !a.release) return
    catalog = a.catalog
    const bound = bindNewCampaignToSharedUniverseRelease({
      catalog,
      requireSharedUniverse: true,
    })
    expect(bound.ok).toBe(true)
    if (!bound.ok) return
    const before = bound.binding.releaseId
    const b = materializeSharedUniverseRelease(catalog, FIXTURE_SUPERSESSION, {
      releaseLabel: 'newer-b',
      setAsNewCampaignDefault: true,
    })
    expect(b.ok).toBe(true)
    expect(bound.binding.releaseId).toBe(before)
  })

  it('adopts A→B once via SPE-2898 and is idempotent on repeated receipt id', () => {
    let catalog = createEmptySharedUniverseCanonReleaseCatalog()
    const a = materializeSharedUniverseRelease(catalog, FIXTURE_ESTABLISHED_FACT, {
      releaseLabel: 'adopt-a',
      setAsNewCampaignDefault: true,
    })
    expect(a.ok).toBe(true)
    if (!a.ok || !a.release) return
    catalog = a.catalog
    const b = materializeSharedUniverseRelease(catalog, FIXTURE_SUPERSESSION, {
      releaseLabel: 'adopt-b',
      predecessorReleaseId: a.release.releaseId,
    })
    expect(b.ok).toBe(true)
    if (!b.ok || !b.release) return
    catalog = b.catalog

    const current = bindNewCampaignToSharedUniverseRelease({
      catalog,
      releaseId: a.release.releaseId,
      requireSharedUniverse: true,
    })
    expect(current.ok).toBe(true)
    if (!current.ok) return

    const first = adoptSharedUniverseRelease({
      catalog,
      current: current.binding,
      targetReleaseId: b.release.releaseId,
      week: 5,
      transitionDeclaration: adoptionDeclaration(a.release.releaseId, b.release.releaseId),
      transitionSubject: {
        subjectId: 'campaign:1',
        stateFamily: 'shared_universe_binding',
        originatedWeek: 1,
        originatingRule: {
          ruleId: 'rule:shared-universe-release',
          versionId: a.release.releaseId,
        },
      },
      domainPrecommitResults: [{ ok: true }],
    })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.binding.releaseId).toBe(b.release.releaseId)
    expect(first.binding.priorReleaseIds).toContain(a.release.releaseId)
    expect(first.receipt.fromReleaseId).toBe(a.release.releaseId)

    const second = adoptSharedUniverseRelease({
      catalog,
      current: first.binding,
      targetReleaseId: b.release.releaseId,
      week: 5,
      transitionDeclaration: adoptionDeclaration(a.release.releaseId, b.release.releaseId),
      transitionSubject: {
        subjectId: 'campaign:1',
        stateFamily: 'shared_universe_binding',
        originatedWeek: 1,
        originatingRule: {
          ruleId: 'rule:shared-universe-release',
          versionId: a.release.releaseId,
        },
      },
      existingAdoptionReceiptIds: [first.receipt.receiptId],
    })
    expect(second.ok).toBe(false)
    if (second.ok) return
    expect(second.diagnostics[0]?.code).toBe('already_bound_to_target')
    expect(second.binding.releaseId).toBe(b.release.releaseId)
  })

  it('failed domain precommit leaves prior binding unchanged', () => {
    const materialized = materializeSharedUniverseRelease(
      createEmptySharedUniverseCanonReleaseCatalog(),
      FIXTURE_ESTABLISHED_FACT,
      { releaseLabel: 'precommit-a', setAsNewCampaignDefault: true },
    )
    expect(materialized.ok).toBe(true)
    if (!materialized.ok || !materialized.release) return
    const b = materializeSharedUniverseRelease(materialized.catalog, FIXTURE_SUPERSESSION, {
      releaseLabel: 'precommit-b',
    })
    expect(b.ok).toBe(true)
    if (!b.ok || !b.release) return
    const current = createLegacyUnboundSharedUniverseBinding()
    const failed = adoptSharedUniverseRelease({
      catalog: b.catalog,
      current,
      targetReleaseId: b.release.releaseId,
      week: 2,
      transitionDeclaration: adoptionDeclaration('legacy', b.release.releaseId),
      transitionSubject: {
        subjectId: 'campaign:fail',
        stateFamily: 'shared_universe_binding',
        originatedWeek: 0,
        originatingRule: {
          ruleId: 'rule:shared-universe-release',
          versionId: 'legacy',
        },
      },
      domainPrecommitResults: [{ ok: false, detail: 'reprojection blocked' }],
    })
    expect(failed.ok).toBe(false)
    if (failed.ok) return
    expect(failed.binding).toEqual(current)
    expect(failed.diagnostics[0]?.code).toBe('domain_precommit_failed')
  })

  it('entity and relation materialization receipts are idempotent', () => {
    const first = recordEntityMaterializationReceipt({
      existing: [],
      releaseId: 'su.release.x',
      sharedEntityId: 'su.entity.1',
      sharedEntityRevisionDigest: 'digest-1',
      targetDomain: 'archive',
      representationKind: 'historical_record',
      localEntityId: 'hist:1',
      materializationPolicyVersion: 'v1',
    })
    expect(first.created).toBe(true)
    const second = recordEntityMaterializationReceipt({
      existing: first.receipts,
      releaseId: 'su.release.x',
      sharedEntityId: 'su.entity.1',
      sharedEntityRevisionDigest: 'digest-1',
      targetDomain: 'archive',
      representationKind: 'historical_record',
      localEntityId: 'hist:SHOULD-NOT-REPLACE',
      materializationPolicyVersion: 'v1',
    })
    expect(second.created).toBe(false)
    expect(second.receipt.localEntityId).toBe('hist:1')
    expect(second.receipts).toHaveLength(1)

    const relFirst = recordRelationMaterializationReceipt({
      existing: [],
      releaseId: 'su.release.x',
      sharedRelationshipKey: 'rel.1',
      sharedRelationshipRevision: 'r1',
      targetLocalRecordId: 'local:rel:1',
      materializationPolicyVersion: 'v1',
    })
    const relSecond = recordRelationMaterializationReceipt({
      existing: relFirst.receipts,
      releaseId: 'su.release.x',
      sharedRelationshipKey: 'rel.1',
      sharedRelationshipRevision: 'r1',
      targetLocalRecordId: 'local:rel:DUPLICATE',
      materializationPolicyVersion: 'v1',
    })
    expect(relSecond.created).toBe(false)
    expect(relSecond.receipt.targetLocalRecordId).toBe('local:rel:1')
  })
})
