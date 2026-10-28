/**
 * SPE-3139 — authored incident reference-integrity validator (slice 1).
 *
 * Authoring-time, read-only validation over an explicitly supplied record batch:
 * dangling/missing refs, wrong-kind refs, bounded reachability from explicit
 * roots, exemptions, and optional SPE-3300 release-context membership for
 * shared-universe-derived references. No GameState, no content registry, no
 * automatic repair, no CI lint wiring.
 */

import {
  resolveReleaseMember,
  type SharedUniverseCanonReleaseCatalog,
  type SharedUniverseCanonReleaseId,
} from './sharedUniverseCanonReleaseCatalog'

export const AUTHORED_INCIDENT_REFERENCE_INTEGRITY_SCHEMA_VERSION =
  'spe-3139.v1' as const

export const AUTHORED_RECORD_KINDS = [
  'incident',
  'case',
  'hazard',
  'entity',
  'event',
  'location',
  'other',
] as const
export type AuthoredRecordKind = (typeof AUTHORED_RECORD_KINDS)[number]

export interface AuthoredGovernedReference {
  readonly fieldPath: string
  readonly targetId: string
  readonly expectedKind: AuthoredRecordKind
  /** When set, target eligibility is gated by SPE-3300 release membership. */
  readonly sharedUniversePromotedRecordId?: string
}

export interface AuthoredContentIntegrityRecord {
  readonly recordId: string
  readonly kind: AuthoredRecordKind
  readonly references: readonly AuthoredGovernedReference[]
  /**
   * When false, record is skipped for orphan/unreachable reporting.
   * Defaults to true when omitted.
   */
  readonly validationEligible?: boolean
  /**
   * Caller- or lifecycle-supplied exemption that suppresses unreachable
   * diagnostics without requiring SPE-1502 for all content.
   */
  readonly lifecycleExempt?: boolean
}

export const AUTHORED_REFERENCE_INTEGRITY_DIAGNOSTICS = [
  'dangling_reference',
  'wrong_kind',
  'unreachable_record',
  'release_unavailable',
  'stale_revision',
  'malformed_input',
] as const
export type AuthoredReferenceIntegrityDiagnostic =
  (typeof AUTHORED_REFERENCE_INTEGRITY_DIAGNOSTICS)[number]

export interface AuthoredReferenceIntegrityDiagnosticRecord {
  readonly code: AuthoredReferenceIntegrityDiagnostic
  readonly sourceRecordId: string
  readonly fieldPath: string
  readonly referencedId: string
  readonly expectedKind?: AuthoredRecordKind
  readonly resolvedKind?: AuthoredRecordKind
  readonly message: string
}

export type AuthoredReferenceIntegrityValidationResult =
  | {
      readonly ok: true
      readonly diagnostics: readonly AuthoredReferenceIntegrityDiagnosticRecord[]
    }
  | {
      readonly ok: false
      readonly diagnostics: readonly AuthoredReferenceIntegrityDiagnosticRecord[]
    }

function compareStrings(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function freezeDiagnostics(
  diagnostics: readonly AuthoredReferenceIntegrityDiagnosticRecord[],
): readonly AuthoredReferenceIntegrityDiagnosticRecord[] {
  return Object.freeze(
    [...diagnostics]
      .sort(
        (a, b) =>
          compareStrings(a.code, b.code) ||
          compareStrings(a.sourceRecordId, b.sourceRecordId) ||
          compareStrings(a.fieldPath, b.fieldPath) ||
          compareStrings(a.referencedId, b.referencedId),
      )
      .map((entry) => Object.freeze({ ...entry })),
  )
}

function isEligible(record: AuthoredContentIntegrityRecord): boolean {
  return record.validationEligible !== false && record.lifecycleExempt !== true
}

/**
 * Validate governed cross-record references and root reachability for a
 * caller-supplied authored content batch. Read-only; does not mutate records.
 */
export function validateAuthoredReferenceIntegrity(input: {
  readonly records: readonly AuthoredContentIntegrityRecord[]
  readonly rootIds: readonly string[]
  readonly exemptRecordIds?: readonly string[]
  readonly boundReleaseId?: SharedUniverseCanonReleaseId | null
  readonly releaseCatalog?: SharedUniverseCanonReleaseCatalog | null
}): AuthoredReferenceIntegrityValidationResult {
  const diagnostics: AuthoredReferenceIntegrityDiagnosticRecord[] = []
  const { records, rootIds } = input

  if (!Array.isArray(records) || !Array.isArray(rootIds)) {
    return {
      ok: false,
      diagnostics: freezeDiagnostics([
        {
          code: 'malformed_input',
          sourceRecordId: '',
          fieldPath: 'input',
          referencedId: '',
          message: 'records and rootIds arrays are required',
        },
      ]),
    }
  }

  const byId = new Map<string, AuthoredContentIntegrityRecord>()
  for (const record of records) {
    if (
      typeof record.recordId !== 'string' ||
      record.recordId.trim().length === 0 ||
      !Array.isArray(record.references)
    ) {
      diagnostics.push({
        code: 'malformed_input',
        sourceRecordId: String(record.recordId ?? ''),
        fieldPath: 'record',
        referencedId: '',
        message: 'recordId and references are required',
      })
      continue
    }
    byId.set(record.recordId.trim(), record)
  }

  const exempt = new Set(
    (input.exemptRecordIds ?? []).map((id) => id.trim()).filter(Boolean),
  )

  for (const record of byId.values()) {
    for (const ref of record.references) {
      const targetId = ref.targetId.trim()
      const fieldPath = ref.fieldPath.trim() || 'references'
      if (targetId.length === 0) {
        diagnostics.push({
          code: 'dangling_reference',
          sourceRecordId: record.recordId,
          fieldPath,
          referencedId: '',
          expectedKind: ref.expectedKind,
          message: 'Empty referenced id',
        })
        continue
      }

      const target = byId.get(targetId)
      if (!target) {
        diagnostics.push({
          code: 'dangling_reference',
          sourceRecordId: record.recordId,
          fieldPath,
          referencedId: targetId,
          expectedKind: ref.expectedKind,
          message: `Missing referenced id ${targetId}`,
        })
        continue
      }

      if (target.kind !== ref.expectedKind) {
        diagnostics.push({
          code: 'wrong_kind',
          sourceRecordId: record.recordId,
          fieldPath,
          referencedId: targetId,
          expectedKind: ref.expectedKind,
          resolvedKind: target.kind,
          message: `Expected kind ${ref.expectedKind}, resolved ${target.kind}`,
        })
      }

      const promotedId = ref.sharedUniversePromotedRecordId?.trim()
      if (
        promotedId &&
        input.boundReleaseId &&
        input.releaseCatalog
      ) {
        const membership = resolveReleaseMember(
          input.releaseCatalog,
          input.boundReleaseId,
          promotedId,
        )
        if (
          membership.kind === 'absent' ||
          membership.kind === 'introduced_later' ||
          membership.kind === 'unknown_member' ||
          membership.kind === 'invalid_release'
        ) {
          diagnostics.push({
            code: 'release_unavailable',
            sourceRecordId: record.recordId,
            fieldPath,
            referencedId: targetId,
            expectedKind: ref.expectedKind,
            resolvedKind: target.kind,
            message: `Referenced shared-universe member ${promotedId} unavailable under bound release (${membership.kind})`,
          })
        } else if (membership.kind === 'superseded') {
          diagnostics.push({
            code: 'stale_revision',
            sourceRecordId: record.recordId,
            fieldPath,
            referencedId: targetId,
            expectedKind: ref.expectedKind,
            resolvedKind: target.kind,
            message: `Referenced shared-universe member ${promotedId} is superseded under bound release`,
          })
        }
      }
    }
  }

  const roots = rootIds.map((id) => id.trim()).filter((id) => id.length > 0)
  const reachable = new Set<string>()
  const queue: string[] = []
  for (const rootId of [...roots].sort(compareStrings)) {
    if (byId.has(rootId) && !reachable.has(rootId)) {
      reachable.add(rootId)
      queue.push(rootId)
    }
  }
  while (queue.length > 0) {
    const currentId = queue.shift()!
    const current = byId.get(currentId)
    if (!current) continue
    const nextIds = current.references
      .map((ref) => ref.targetId.trim())
      .filter((id) => id.length > 0 && byId.has(id))
      .sort(compareStrings)
    for (const nextId of nextIds) {
      if (!reachable.has(nextId)) {
        reachable.add(nextId)
        queue.push(nextId)
      }
    }
  }

  for (const record of [...byId.values()].sort((a, b) =>
    compareStrings(a.recordId, b.recordId),
  )) {
    if (reachable.has(record.recordId)) continue
    if (exempt.has(record.recordId)) continue
    if (!isEligible(record)) continue
    diagnostics.push({
      code: 'unreachable_record',
      sourceRecordId: record.recordId,
      fieldPath: 'record',
      referencedId: record.recordId,
      expectedKind: record.kind,
      resolvedKind: record.kind,
      message: `Record ${record.recordId} unreachable from supplied roots`,
    })
  }

  const frozen = freezeDiagnostics(diagnostics)
  if (frozen.length > 0) {
    return { ok: false, diagnostics: frozen }
  }
  return { ok: true, diagnostics: frozen }
}
