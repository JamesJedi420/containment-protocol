/**
 * SPE-3293 — shared-universe canon release binding and campaign adoption.
 *
 * Campaign-side binding under SPE-1734. Consumes SPE-3300 catalog. Adoption
 * routes through SPE-2898 transition vocabulary. Does not own domain adapters
 * or the release catalog.
 */

import {
  resolveRuleChangeTransition,
  type RuleChangeTransitionDeclaration,
  type TransitionResult,
  type TransitionSubject,
} from './ruleChangeTransitionContract'
import {
  diffSharedUniverseReleases,
  lookupSharedUniverseRelease,
  resolveDefaultNewCampaignRelease,
  type SharedUniverseCanonReleaseCatalog,
  type SharedUniverseCanonReleaseId,
} from './sharedUniverseCanonReleaseCatalog'

export const SHARED_UNIVERSE_CANON_RELEASE_BINDING_SCHEMA_VERSION =
  'spe-3293.v1' as const
export type SharedUniverseCanonReleaseBindingSchemaVersion =
  typeof SHARED_UNIVERSE_CANON_RELEASE_BINDING_SCHEMA_VERSION

export const SHARED_UNIVERSE_BINDING_KINDS = [
  'legacy_unbound',
  'bound',
] as const
export type SharedUniverseBindingKind = (typeof SHARED_UNIVERSE_BINDING_KINDS)[number]

export interface SharedUniverseCanonReleaseBinding {
  readonly schemaVersion: SharedUniverseCanonReleaseBindingSchemaVersion
  readonly kind: SharedUniverseBindingKind
  /** Present only when kind === 'bound'. */
  readonly releaseId?: SharedUniverseCanonReleaseId
  readonly boundAtWeek?: number
  readonly priorReleaseIds?: readonly SharedUniverseCanonReleaseId[]
  readonly lastAdoptionReceiptId?: string
}

export interface SharedUniverseAdoptionReceipt {
  readonly receiptId: string
  readonly fromKind: SharedUniverseBindingKind
  readonly fromReleaseId: SharedUniverseCanonReleaseId | null
  readonly toReleaseId: SharedUniverseCanonReleaseId
  readonly transitionMarkerId: string | null
  readonly transitionDisposition: string
  readonly catalogDiffEntryCount: number
  readonly committedAtWeek: number
}

export interface SharedUniverseEntityMaterializationReceipt {
  readonly receiptId: string
  readonly releaseId: SharedUniverseCanonReleaseId
  readonly sharedEntityId: string
  readonly sharedEntityRevisionDigest: string
  readonly targetDomain: string
  readonly representationKind: string
  readonly localEntityId: string
  readonly materializationPolicyVersion: string
}

export interface SharedUniverseRelationMaterializationReceipt {
  readonly receiptId: string
  readonly releaseId: SharedUniverseCanonReleaseId
  readonly sharedRelationshipKey: string
  readonly sharedRelationshipRevision: string
  readonly targetLocalRecordId: string
  readonly materializationPolicyVersion: string
}

export const SHARED_UNIVERSE_BINDING_DIAGNOSTICS = [
  'unknown_release',
  'ineligible_release',
  'missing_default',
  'adoption_policy_failed',
  'domain_precommit_failed',
  'already_bound_to_target',
  'malformed_binding',
] as const
export type SharedUniverseBindingDiagnostic =
  (typeof SHARED_UNIVERSE_BINDING_DIAGNOSTICS)[number]

export interface SharedUniverseBindingDiagnosticRecord {
  readonly code: SharedUniverseBindingDiagnostic
  readonly field: string
  readonly message: string
}

function compareStrings(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function freezeDiagnostics(
  diagnostics: readonly SharedUniverseBindingDiagnosticRecord[],
): readonly SharedUniverseBindingDiagnosticRecord[] {
  return Object.freeze(
    [...diagnostics]
      .sort(
        (a, b) =>
          compareStrings(a.code, b.code) || compareStrings(a.field, b.field),
      )
      .map((entry) => Object.freeze({ ...entry })),
  )
}

export function createLegacyUnboundSharedUniverseBinding(): SharedUniverseCanonReleaseBinding {
  return Object.freeze({
    schemaVersion: SHARED_UNIVERSE_CANON_RELEASE_BINDING_SCHEMA_VERSION,
    kind: 'legacy_unbound' as const,
  })
}

/**
 * Fail-closed sanitize for campaign ledger hydration.
 * Absent/malformed → explicit legacy_unbound (never invents latest release).
 */
export function sanitizeSharedUniverseCanonReleaseBinding(
  raw: unknown,
): SharedUniverseCanonReleaseBinding {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return createLegacyUnboundSharedUniverseBinding()
  }
  const record = raw as Record<string, unknown>
  if (record.schemaVersion !== SHARED_UNIVERSE_CANON_RELEASE_BINDING_SCHEMA_VERSION) {
    return createLegacyUnboundSharedUniverseBinding()
  }
  if (record.kind === 'legacy_unbound') {
    return createLegacyUnboundSharedUniverseBinding()
  }
  if (record.kind !== 'bound' || typeof record.releaseId !== 'string' || record.releaseId.trim().length === 0) {
    return createLegacyUnboundSharedUniverseBinding()
  }
  const prior =
    Array.isArray(record.priorReleaseIds)
      ? record.priorReleaseIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : []
  return Object.freeze({
    schemaVersion: SHARED_UNIVERSE_CANON_RELEASE_BINDING_SCHEMA_VERSION,
    kind: 'bound' as const,
    releaseId: record.releaseId.trim(),
    boundAtWeek:
      typeof record.boundAtWeek === 'number' && Number.isFinite(record.boundAtWeek)
        ? Math.max(0, Math.floor(record.boundAtWeek))
        : 0,
    priorReleaseIds: Object.freeze(prior.map((id) => id.trim())),
    lastAdoptionReceiptId:
      typeof record.lastAdoptionReceiptId === 'string'
        ? record.lastAdoptionReceiptId
        : undefined,
  })
}

/**
 * Bind a new campaign to an eligible catalog release (default or explicit).
 * Does not mutate existing campaigns.
 */
export function bindNewCampaignToSharedUniverseRelease(input: {
  readonly catalog: SharedUniverseCanonReleaseCatalog
  readonly releaseId?: SharedUniverseCanonReleaseId
  readonly requireSharedUniverse: boolean
  readonly week?: number
}):
  | {
      readonly ok: true
      readonly binding: SharedUniverseCanonReleaseBinding
    }
  | {
      readonly ok: false
      readonly diagnostics: readonly SharedUniverseBindingDiagnosticRecord[]
    } {
  if (!input.requireSharedUniverse && input.releaseId === undefined) {
    return { ok: true, binding: createLegacyUnboundSharedUniverseBinding() }
  }

  let targetId = input.releaseId?.trim()
  if (targetId === undefined || targetId.length === 0) {
    const defaultResult = resolveDefaultNewCampaignRelease(input.catalog)
    if (!defaultResult.ok) {
      return {
        ok: false,
        diagnostics: freezeDiagnostics([
          {
            code: 'missing_default',
            field: 'defaultNewCampaignReleaseId',
            message: 'Shared-universe content requires an eligible default release',
          },
        ]),
      }
    }
    targetId = defaultResult.release.releaseId
  }

  const lookedUp = lookupSharedUniverseRelease(input.catalog, targetId)
  if (!lookedUp.ok) {
    return {
      ok: false,
      diagnostics: freezeDiagnostics([
        {
          code: 'unknown_release',
          field: 'releaseId',
          message: `Unknown release ${targetId}`,
        },
      ]),
    }
  }
  if (
    !lookedUp.release.newCampaignEligible ||
    lookedUp.release.supportState !== 'supported'
  ) {
    return {
      ok: false,
      diagnostics: freezeDiagnostics([
        {
          code: 'ineligible_release',
          field: 'releaseId',
          message: `Release ${targetId} is not eligible for new campaigns`,
        },
      ]),
    }
  }

  return {
    ok: true,
    binding: Object.freeze({
      schemaVersion: SHARED_UNIVERSE_CANON_RELEASE_BINDING_SCHEMA_VERSION,
      kind: 'bound' as const,
      releaseId: lookedUp.release.releaseId,
      boundAtWeek: input.week ?? 0,
      priorReleaseIds: Object.freeze([] as string[]),
    }),
  }
}

export interface AdoptSharedUniverseReleaseInput {
  readonly catalog: SharedUniverseCanonReleaseCatalog
  readonly current: SharedUniverseCanonReleaseBinding
  readonly targetReleaseId: SharedUniverseCanonReleaseId
  readonly week: number
  readonly transitionDeclaration: RuleChangeTransitionDeclaration
  readonly transitionSubject: TransitionSubject
  /** Domain precommit validators — all must return ok before commit. */
  readonly domainPrecommitResults?: readonly { readonly ok: boolean; readonly detail?: string }[]
  readonly existingAdoptionReceiptIds?: readonly string[]
}

/**
 * Atomic adoption: validate target + SPE-2898 transition + domain precommits,
 * then commit binding + receipt. Failure leaves prior binding unchanged.
 */
export function adoptSharedUniverseRelease(input: AdoptSharedUniverseReleaseInput):
  | {
      readonly ok: true
      readonly binding: SharedUniverseCanonReleaseBinding
      readonly receipt: SharedUniverseAdoptionReceipt
      readonly transition: TransitionResult
    }
  | {
      readonly ok: false
      readonly binding: SharedUniverseCanonReleaseBinding
      readonly diagnostics: readonly SharedUniverseBindingDiagnosticRecord[]
    } {
  const targetId = input.targetReleaseId.trim()
  if (
    input.current.kind === 'bound' &&
    input.current.releaseId === targetId
  ) {
    return {
      ok: false,
      binding: input.current,
      diagnostics: freezeDiagnostics([
        {
          code: 'already_bound_to_target',
          field: 'targetReleaseId',
          message: 'Campaign is already bound to the target release',
        },
      ]),
    }
  }

  const lookedUp = lookupSharedUniverseRelease(input.catalog, targetId)
  if (!lookedUp.ok) {
    return {
      ok: false,
      binding: input.current,
      diagnostics: freezeDiagnostics([
        {
          code: 'unknown_release',
          field: 'targetReleaseId',
          message: `Unknown target release ${targetId}`,
        },
      ]),
    }
  }

  // Historical lookup allowed for withdrawn targets that still exist; new-campaign
  // eligibility is not required for explicit adoption of a retained release.
  if (lookedUp.release.supportState === 'tombstoned') {
    return {
      ok: false,
      binding: input.current,
      diagnostics: freezeDiagnostics([
        {
          code: 'ineligible_release',
          field: 'targetReleaseId',
          message: `Tombstoned release ${targetId} cannot be adopted`,
        },
      ]),
    }
  }

  const fromReleaseId =
    input.current.kind === 'bound' ? (input.current.releaseId ?? null) : null
  if (fromReleaseId !== null) {
    const diff = diffSharedUniverseReleases(input.catalog, fromReleaseId, targetId)
    if (!diff.ok) {
      return {
        ok: false,
        binding: input.current,
        diagnostics: freezeDiagnostics([
          {
            code: 'unknown_release',
            field: 'catalogDiff',
            message: 'Unable to compute catalog structural diff for adoption',
          },
        ]),
      }
    }
  }

  const transition = resolveRuleChangeTransition(
    input.transitionDeclaration,
    input.transitionSubject,
  )
  if (!transition.ok) {
    return {
      ok: false,
      binding: input.current,
      diagnostics: freezeDiagnostics([
        {
          code: 'adoption_policy_failed',
          field: 'transition',
          message: transition.detail,
        },
      ]),
    }
  }

  for (const precommit of input.domainPrecommitResults ?? []) {
    if (!precommit.ok) {
      return {
        ok: false,
        binding: input.current,
        diagnostics: freezeDiagnostics([
          {
            code: 'domain_precommit_failed',
            field: 'domainPrecommit',
            message: precommit.detail ?? 'Domain precommit validation failed',
          },
        ]),
      }
    }
  }

  const receiptId = `su.adopt.${fromReleaseId ?? 'legacy'}.${targetId}.w${input.week}`
  if (input.existingAdoptionReceiptIds?.includes(receiptId)) {
    // Idempotent: already committed this adoption.
    return {
      ok: true,
      binding: input.current.kind === 'bound' && input.current.releaseId === targetId
        ? input.current
        : Object.freeze({
            schemaVersion: SHARED_UNIVERSE_CANON_RELEASE_BINDING_SCHEMA_VERSION,
            kind: 'bound' as const,
            releaseId: targetId,
            boundAtWeek: input.week,
            priorReleaseIds: Object.freeze([
              ...(input.current.priorReleaseIds ?? []),
              ...(fromReleaseId !== null ? [fromReleaseId] : []),
            ]),
            lastAdoptionReceiptId: receiptId,
          }),
      receipt: Object.freeze({
        receiptId,
        fromKind: input.current.kind,
        fromReleaseId,
        toReleaseId: targetId,
        transitionMarkerId: transition.result.transitionMarkerId,
        transitionDisposition: transition.result.disposition,
        catalogDiffEntryCount: 0,
        committedAtWeek: input.week,
      }),
      transition: transition.result,
    }
  }

  let catalogDiffEntryCount = 0
  if (fromReleaseId !== null) {
    const diff = diffSharedUniverseReleases(input.catalog, fromReleaseId, targetId)
    if (diff.ok) catalogDiffEntryCount = diff.diff.entries.length
  }

  const priorIds = [
    ...(input.current.priorReleaseIds ?? []),
    ...(fromReleaseId !== null ? [fromReleaseId] : []),
  ]

  const binding: SharedUniverseCanonReleaseBinding = Object.freeze({
    schemaVersion: SHARED_UNIVERSE_CANON_RELEASE_BINDING_SCHEMA_VERSION,
    kind: 'bound' as const,
    releaseId: targetId,
    boundAtWeek: input.week,
    priorReleaseIds: Object.freeze(priorIds),
    lastAdoptionReceiptId: receiptId,
  })

  const receipt: SharedUniverseAdoptionReceipt = Object.freeze({
    receiptId,
    fromKind: input.current.kind,
    fromReleaseId,
    toReleaseId: targetId,
    transitionMarkerId: transition.result.transitionMarkerId,
    transitionDisposition: transition.result.disposition,
    catalogDiffEntryCount,
    committedAtWeek: input.week,
  })

  return {
    ok: true,
    binding,
    receipt,
    transition: transition.result,
  }
}

/**
 * Idempotent entity materialization receipt — identity glue only.
 */
export function recordEntityMaterializationReceipt(input: {
  readonly existing: readonly SharedUniverseEntityMaterializationReceipt[]
  readonly releaseId: SharedUniverseCanonReleaseId
  readonly sharedEntityId: string
  readonly sharedEntityRevisionDigest: string
  readonly targetDomain: string
  readonly representationKind: string
  readonly localEntityId: string
  readonly materializationPolicyVersion: string
}): {
  readonly receipt: SharedUniverseEntityMaterializationReceipt
  readonly created: boolean
  readonly receipts: readonly SharedUniverseEntityMaterializationReceipt[]
} {
  const match = input.existing.find(
    (entry) =>
      entry.releaseId === input.releaseId &&
      entry.sharedEntityId === input.sharedEntityId &&
      entry.sharedEntityRevisionDigest === input.sharedEntityRevisionDigest &&
      entry.targetDomain === input.targetDomain &&
      entry.representationKind === input.representationKind &&
      entry.materializationPolicyVersion === input.materializationPolicyVersion,
  )
  if (match) {
    return {
      receipt: match,
      created: false,
      receipts: input.existing,
    }
  }
  const receipt: SharedUniverseEntityMaterializationReceipt = Object.freeze({
    receiptId: `su.ent.${input.releaseId}.${input.sharedEntityId}.${input.targetDomain}.${input.representationKind}`,
    releaseId: input.releaseId,
    sharedEntityId: input.sharedEntityId,
    sharedEntityRevisionDigest: input.sharedEntityRevisionDigest,
    targetDomain: input.targetDomain,
    representationKind: input.representationKind,
    localEntityId: input.localEntityId,
    materializationPolicyVersion: input.materializationPolicyVersion,
  })
  return {
    receipt,
    created: true,
    receipts: Object.freeze([...input.existing, receipt]),
  }
}

export function recordRelationMaterializationReceipt(input: {
  readonly existing: readonly SharedUniverseRelationMaterializationReceipt[]
  readonly releaseId: SharedUniverseCanonReleaseId
  readonly sharedRelationshipKey: string
  readonly sharedRelationshipRevision: string
  readonly targetLocalRecordId: string
  readonly materializationPolicyVersion: string
}): {
  readonly receipt: SharedUniverseRelationMaterializationReceipt
  readonly created: boolean
  readonly receipts: readonly SharedUniverseRelationMaterializationReceipt[]
} {
  const match = input.existing.find(
    (entry) =>
      entry.releaseId === input.releaseId &&
      entry.sharedRelationshipKey === input.sharedRelationshipKey &&
      entry.sharedRelationshipRevision === input.sharedRelationshipRevision &&
      entry.materializationPolicyVersion === input.materializationPolicyVersion,
  )
  if (match) {
    return {
      receipt: match,
      created: false,
      receipts: input.existing,
    }
  }
  const receipt: SharedUniverseRelationMaterializationReceipt = Object.freeze({
    receiptId: `su.rel.${input.releaseId}.${input.sharedRelationshipKey}`,
    releaseId: input.releaseId,
    sharedRelationshipKey: input.sharedRelationshipKey,
    sharedRelationshipRevision: input.sharedRelationshipRevision,
    targetLocalRecordId: input.targetLocalRecordId,
    materializationPolicyVersion: input.materializationPolicyVersion,
  })
  return {
    receipt,
    created: true,
    receipts: Object.freeze([...input.existing, receipt]),
  }
}

/** Downstream consumers read campaign-bound release id without editorial workflow state. */
export function getBoundSharedUniverseReleaseId(
  binding: SharedUniverseCanonReleaseBinding | undefined,
): SharedUniverseCanonReleaseId | null {
  if (binding == null || binding.kind !== 'bound' || binding.releaseId == null) {
    return null
  }
  return binding.releaseId
}
