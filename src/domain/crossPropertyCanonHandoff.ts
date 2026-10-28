/**
 * SPE-3282 — cross-property canon handoff contract and promotion validation.
 *
 * Pure packet + deterministic promotion validator for Dead Air → shared-universe
 * material. No GameState ownership, no parallel lore DB, no CP gameplay taxonomy.
 * Consumers: SPE-2823 (producer), SPE-3175 (transport), SPE-2099 / SPE-1032 /
 * SPE-2264 / SPE-1910 / SPE-2263 / SPE-3139 (downstream owners via seams).
 */

export const CROSS_PROPERTY_CANON_HANDOFF_SCHEMA_VERSION = 'spe-3282.v1' as const
export type CrossPropertyCanonHandoffSchemaVersion =
  typeof CROSS_PROPERTY_CANON_HANDOFF_SCHEMA_VERSION

/** Epistemic status of a Dead Air proposition in the handoff packet. */
export const CANON_CLAIM_STATUSES = [
  'established',
  'unresolved',
  'disputed',
  'provisional',
  'negative_space',
  'contradicted',
  'source_limited',
  'non_promotable',
] as const
export type CanonClaimStatus = (typeof CANON_CLAIM_STATUSES)[number]

/** Disposition after promotion validation. */
export const PROMOTION_DISPOSITIONS = [
  'promote_established',
  'retain_unresolved',
  'retain_disputed',
  'reject_non_promotable',
  'supersede_prior',
  'withdraw',
] as const
export type PromotionDisposition = (typeof PROMOTION_DISPOSITIONS)[number]

/** Downstream projection/use classes — seams only; owners stay external. */
export const DOWNSTREAM_USE_CLASSES = [
  'non_campaign_transport', // SPE-3175
  'historical_continuity', // SPE-2099
  'agency_archive', // SPE-1032
  'institutional_interpretation', // SPE-2264
  'canon_rule_token', // SPE-2263
  'reference_integrity', // SPE-3139
  'authored_content_lineage', // SPE-2265
] as const
export type DownstreamUseClass = (typeof DOWNSTREAM_USE_CLASSES)[number]

export const CANON_ENTITY_KINDS = [
  'person',
  'location',
  'organization',
  'artifact',
  'phenomenon',
  'event',
  'work',
  'document',
  'object',
  'relationship',
] as const
export type CanonEntityKind = (typeof CANON_ENTITY_KINDS)[number]

export const CANON_RELATION_KINDS = [
  'located_within',
  'member_of',
  'employed_by',
  'parent_of',
  'child_of',
  'derived_name_from',
  'source_basis_of',
  'participant_in',
  'witness_of',
  'caused_by',
  'not_caused_by',
  'not_established_as_trigger',
  'alias_of',
  'not_alias_of',
  'supersedes',
  'withdraws',
] as const
export type CanonRelationKind = (typeof CANON_RELATION_KINDS)[number]

export const CROSS_PROPERTY_CANON_HANDOFF_DIAGNOSTICS = [
  'empty_packet_id',
  'empty_source_ref',
  'invalid_schema_version',
  'invalid_claim_status',
  'invalid_entity_kind',
  'invalid_relation_kind',
  'established_requires_established_status',
  'unresolved_cannot_promote_established',
  'negative_space_cannot_promote_established',
  'disputed_cannot_promote_established',
  'non_promotable_rejected',
  'research_artifact_lacks_canon_admission',
  'missing_release_member',
  'duplicate_record_id',
  'duplicate_relation_key',
  'supersession_missing_prior',
  'rename_identity_mismatch',
  'name_equality_is_not_identity',
  'governed_reference_seam',
  'canon_rule_requires_reusable_rule',
  'publication_time_is_not_occurrence',
] as const
export type CrossPropertyCanonHandoffDiagnostic =
  (typeof CROSS_PROPERTY_CANON_HANDOFF_DIAGNOSTICS)[number]

export interface CrossPropertyCanonHandoffDiagnosticRecord {
  readonly code: CrossPropertyCanonHandoffDiagnostic
  readonly field: string
  readonly message: string
  readonly sourceItemId?: string
  readonly conflictingAuthority?: string
}

export interface DeadAirSourceIdentity {
  readonly caseOrArtifactId: string
  readonly stableSourceRefs: readonly string[]
  /** Named-Element Registry id when present (REG-###). Not the shared entity id. */
  readonly namedElementRegistryId?: string
  readonly renameAuditRef?: string // REN-###
  readonly researchWorkflowCompleted?: boolean
  /** Explicit Dead Air canon/continuity disposition authorizing promotion. */
  readonly canonAdmissionAuthorized: boolean
}

export interface CanonChronologyRefs {
  /** In-universe occurrence (when the event/fact happens in-world). */
  readonly occurrenceRef?: string
  /** Dead Air establishment / approval timing. */
  readonly deadAirEstablishmentRef?: string
  /** Shared-universe promotion timing (not occurrence). */
  readonly sharedUniversePromotionRef?: string
  /** Transport/import timing (SPE-3175). */
  readonly transportImportRef?: string
}

export interface CanonNamingState {
  readonly approvedName?: string
  readonly namingState: 'locked' | 'bounded_unresolved'
  readonly aliases?: readonly string[]
  readonly historicalForms?: readonly string[]
  readonly sensitiveNameReviewDisposition?: string
  readonly namingAuthorityRefs?: readonly string[]
}

export interface SharedUniverseEntityRef {
  /** Kind-neutral su.entity.<ordinal> when cross-property continuity is required. */
  readonly sharedEntityId: string
  readonly primaryKind: CanonEntityKind
  readonly facets?: readonly string[]
  readonly sourceElementType?: string
  readonly eventClass?: string
  readonly naming: CanonNamingState
  /** Real/source basis id when distinct from fictional shared identity. */
  readonly sourceProvenanceEntityId?: string
}

export interface CanonRelationAssertion {
  readonly relationId: string
  readonly kind: CanonRelationKind
  readonly fromRef: string
  readonly toRef: string
  readonly epistemicStatus: CanonClaimStatus
  readonly sourceAuthorityRefs: readonly string[]
  readonly temporalExtentRef?: string
  readonly scopeNote?: string
}

export interface CanonRevisionRefs {
  readonly priorPromotedRecordId?: string
  readonly supersedesRecordId?: string
  readonly withdrawnRecordId?: string
  readonly replacementRecordId?: string
}

export interface CrossPropertyCanonRecord {
  readonly recordId: string
  readonly claimStatus: CanonClaimStatus
  readonly source: DeadAirSourceIdentity
  readonly chronology: CanonChronologyRefs
  readonly revision?: CanonRevisionRefs
  readonly entity?: SharedUniverseEntityRef
  readonly relations?: readonly CanonRelationAssertion[]
  readonly permittedUseClasses: readonly DownstreamUseClass[]
  /** True only when the material establishes a reusable governed rule (SPE-2263). */
  readonly establishesReusableCanonRule?: boolean
  readonly canonRuleTokenRef?: string
  readonly summary: string
}

export interface CrossPropertyCanonHandoffPacket {
  readonly schemaVersion: CrossPropertyCanonHandoffSchemaVersion
  readonly packetId: string
  readonly originatingDeadAirCaseId: string
  readonly records: readonly CrossPropertyCanonRecord[]
  /** Prior promoted records retained for supersession/traceability (not overwritten). */
  readonly retainedPriorRecords?: readonly CrossPropertyCanonRecord[]
}

export interface SharedUniverseReleaseManifest {
  readonly schemaVersion: CrossPropertyCanonHandoffSchemaVersion
  readonly releaseId: string
  readonly orderedMemberRecordIds: readonly string[]
  readonly memberDigests: readonly string[]
}

export type CrossPropertyCanonHandoffValidationResult =
  | {
      readonly ok: true
      readonly packet: CrossPropertyCanonHandoffPacket
      readonly dispositions: Readonly<Record<string, PromotionDisposition>>
      readonly diagnostics: readonly CrossPropertyCanonHandoffDiagnosticRecord[]
      readonly release?: SharedUniverseReleaseManifest
    }
  | {
      readonly ok: false
      readonly diagnostics: readonly CrossPropertyCanonHandoffDiagnosticRecord[]
      readonly dispositions: Readonly<Record<string, PromotionDisposition>>
    }

export interface InstitutionalInterpretationProjection {
  readonly interpretationId: string
  readonly promotedRecordId: string
  readonly attributedClaim: string
  readonly differsFromPromotedCanon: boolean
}

const CLAIM_STATUS_SET: ReadonlySet<string> = new Set(CANON_CLAIM_STATUSES)
const ENTITY_KIND_SET: ReadonlySet<string> = new Set(CANON_ENTITY_KINDS)
const RELATION_KIND_SET: ReadonlySet<string> = new Set(CANON_RELATION_KINDS)
const USE_CLASS_SET: ReadonlySet<string> = new Set(DOWNSTREAM_USE_CLASSES)

function diagnostic(
  code: CrossPropertyCanonHandoffDiagnostic,
  field: string,
  message: string,
  extra?: Pick<
    CrossPropertyCanonHandoffDiagnosticRecord,
    'sourceItemId' | 'conflictingAuthority'
  >,
): CrossPropertyCanonHandoffDiagnosticRecord {
  return Object.freeze({
    code,
    field,
    message,
    ...(extra?.sourceItemId !== undefined
      ? { sourceItemId: extra.sourceItemId }
      : {}),
    ...(extra?.conflictingAuthority !== undefined
      ? { conflictingAuthority: extra.conflictingAuthority }
      : {}),
  })
}

function isNonEmpty(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeId(value: string): string {
  return value.trim()
}

function compareDiagnostics(
  left: CrossPropertyCanonHandoffDiagnosticRecord,
  right: CrossPropertyCanonHandoffDiagnosticRecord,
): number {
  const byCode = left.code.localeCompare(right.code)
  if (byCode !== 0) return byCode
  const byField = left.field.localeCompare(right.field)
  if (byField !== 0) return byField
  return (left.sourceItemId ?? '').localeCompare(right.sourceItemId ?? '')
}

function freezeDiagnostics(
  diagnostics: readonly CrossPropertyCanonHandoffDiagnosticRecord[],
): readonly CrossPropertyCanonHandoffDiagnosticRecord[] {
  return Object.freeze(
    [...diagnostics].sort(compareDiagnostics).map((entry) => Object.freeze({ ...entry })),
  )
}

function relationKey(relation: CanonRelationAssertion): string {
  return [
    relation.kind,
    normalizeId(relation.fromRef),
    normalizeId(relation.toRef),
    relation.epistemicStatus,
    relation.temporalExtentRef?.trim() ?? '',
  ].join('|')
}

function digestRecord(record: CrossPropertyCanonRecord): string {
  return [
    normalizeId(record.recordId),
    record.claimStatus,
    record.source.caseOrArtifactId,
    record.entity?.sharedEntityId ?? '',
    record.summary,
  ].join('#')
}

function dispositionForStatus(status: CanonClaimStatus): PromotionDisposition {
  switch (status) {
    case 'established':
      return 'promote_established'
    case 'unresolved':
    case 'provisional':
    case 'source_limited':
    case 'negative_space':
      return 'retain_unresolved'
    case 'disputed':
    case 'contradicted':
      return 'retain_disputed'
    case 'non_promotable':
      return 'reject_non_promotable'
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

/**
 * Validate a cross-property handoff packet. Established promotion is fail-closed
 * for unresolved / negative-space / disputed / non-promotable material.
 * Identical inputs yield byte-stable diagnostic ordering and release membership.
 */
export function validateCrossPropertyCanonHandoff(
  packet: CrossPropertyCanonHandoffPacket,
  options?: { readonly buildRelease?: boolean; readonly releaseLabel?: string },
): CrossPropertyCanonHandoffValidationResult {
  const diagnostics: CrossPropertyCanonHandoffDiagnosticRecord[] = []
  const dispositions: Record<string, PromotionDisposition> = Object.create(null)
  const recordIds = new Set<string>()
  const relationKeys = new Set<string>()
  const retainedById = new Map(
    (packet.retainedPriorRecords ?? []).map((record) => [
      normalizeId(record.recordId),
      record,
    ]),
  )

  if (packet.schemaVersion !== CROSS_PROPERTY_CANON_HANDOFF_SCHEMA_VERSION) {
    diagnostics.push(
      diagnostic(
        'invalid_schema_version',
        'schemaVersion',
        `Expected ${CROSS_PROPERTY_CANON_HANDOFF_SCHEMA_VERSION}`,
      ),
    )
  }
  if (!isNonEmpty(packet.packetId)) {
    diagnostics.push(diagnostic('empty_packet_id', 'packetId', 'packetId is required'))
  }
  if (!isNonEmpty(packet.originatingDeadAirCaseId)) {
    diagnostics.push(
      diagnostic(
        'empty_source_ref',
        'originatingDeadAirCaseId',
        'originatingDeadAirCaseId is required',
      ),
    )
  }

  const promotableEstablishedIds: string[] = []

  for (const record of packet.records) {
    const recordId = isNonEmpty(record.recordId) ? normalizeId(record.recordId) : ''
    const fieldPrefix = recordId.length > 0 ? `records[${recordId}]` : 'records[?]'

    if (!isNonEmpty(record.recordId)) {
      diagnostics.push(
        diagnostic('empty_packet_id', `${fieldPrefix}.recordId`, 'recordId is required'),
      )
      continue
    }
    if (recordIds.has(recordId)) {
      diagnostics.push(
        diagnostic(
          'duplicate_record_id',
          `${fieldPrefix}.recordId`,
          `Duplicate recordId ${recordId}`,
          { sourceItemId: recordId },
        ),
      )
      continue
    }
    recordIds.add(recordId)

    if (!CLAIM_STATUS_SET.has(record.claimStatus)) {
      diagnostics.push(
        diagnostic(
          'invalid_claim_status',
          `${fieldPrefix}.claimStatus`,
          `Unknown claimStatus`,
          { sourceItemId: recordId },
        ),
      )
    }

    if (!isNonEmpty(record.source.caseOrArtifactId)) {
      diagnostics.push(
        diagnostic(
          'empty_source_ref',
          `${fieldPrefix}.source.caseOrArtifactId`,
          'caseOrArtifactId is required',
          { sourceItemId: recordId },
        ),
      )
    }

    if (
      record.source.researchWorkflowCompleted === true &&
      record.source.canonAdmissionAuthorized !== true
    ) {
      diagnostics.push(
        diagnostic(
          'research_artifact_lacks_canon_admission',
          `${fieldPrefix}.source.canonAdmissionAuthorized`,
          'Research/workflow completion does not authorize shared-universe promotion',
          { sourceItemId: recordId },
        ),
      )
    }

    for (const useClass of record.permittedUseClasses) {
      if (!USE_CLASS_SET.has(useClass)) {
        diagnostics.push(
          diagnostic(
            'governed_reference_seam',
            `${fieldPrefix}.permittedUseClasses`,
            `Unknown use class ${String(useClass)}`,
            { sourceItemId: recordId },
          ),
        )
      }
    }

    if (record.entity) {
      if (!ENTITY_KIND_SET.has(record.entity.primaryKind)) {
        diagnostics.push(
          diagnostic(
            'invalid_entity_kind',
            `${fieldPrefix}.entity.primaryKind`,
            'Unknown entity kind',
            { sourceItemId: recordId },
          ),
        )
      }
      if (
        record.entity.naming.namingState === 'locked' &&
        !isNonEmpty(record.entity.naming.approvedName)
      ) {
        diagnostics.push(
          diagnostic(
            'unresolved_cannot_promote_established',
            `${fieldPrefix}.entity.naming.approvedName`,
            'Locked naming requires approvedName',
            { sourceItemId: recordId },
          ),
        )
      }
      if (
        record.entity.sourceProvenanceEntityId !== undefined &&
        record.entity.sourceProvenanceEntityId === record.entity.sharedEntityId
      ) {
        diagnostics.push(
          diagnostic(
            'name_equality_is_not_identity',
            `${fieldPrefix}.entity.sourceProvenanceEntityId`,
            'Source provenance identity must remain distinct from shared entity id',
            { sourceItemId: recordId },
          ),
        )
      }
    }

    for (const relation of record.relations ?? []) {
      if (!RELATION_KIND_SET.has(relation.kind)) {
        diagnostics.push(
          diagnostic(
            'invalid_relation_kind',
            `${fieldPrefix}.relations[${relation.relationId}].kind`,
            'Unknown relation kind',
            { sourceItemId: recordId },
          ),
        )
      }
      const key = relationKey(relation)
      if (relationKeys.has(key)) {
        diagnostics.push(
          diagnostic(
            'duplicate_relation_key',
            `${fieldPrefix}.relations[${relation.relationId}]`,
            'Duplicate relation assertion',
            { sourceItemId: recordId },
          ),
        )
      } else {
        relationKeys.add(key)
      }
      if (
        (relation.kind === 'caused_by' || relation.kind === 'not_caused_by') &&
        relation.epistemicStatus !== 'established' &&
        record.claimStatus === 'established'
      ) {
        // Non-established causality must not collapse into established engine causality.
        diagnostics.push(
          diagnostic(
            'disputed_cannot_promote_established',
            `${fieldPrefix}.relations[${relation.relationId}].epistemicStatus`,
            'Non-established causality cannot promote as established engine causality',
            { sourceItemId: recordId, conflictingAuthority: relation.kind },
          ),
        )
      }
    }

    if (
      record.chronology.sharedUniversePromotionRef !== undefined &&
      record.chronology.occurrenceRef !== undefined &&
      record.chronology.sharedUniversePromotionRef === record.chronology.occurrenceRef
    ) {
      diagnostics.push(
        diagnostic(
          'publication_time_is_not_occurrence',
          `${fieldPrefix}.chronology`,
          'Promotion/publication timing must not equal in-universe occurrence timing',
          { sourceItemId: recordId },
        ),
      )
    }

    if (record.establishesReusableCanonRule === true) {
      if (!isNonEmpty(record.canonRuleTokenRef)) {
        diagnostics.push(
          diagnostic(
            'canon_rule_requires_reusable_rule',
            `${fieldPrefix}.canonRuleTokenRef`,
            'Reusable canon rule requires SPE-2263 token ref',
            { sourceItemId: recordId },
          ),
        )
      }
    } else if (isNonEmpty(record.canonRuleTokenRef)) {
      diagnostics.push(
        diagnostic(
          'canon_rule_requires_reusable_rule',
          `${fieldPrefix}.establishesReusableCanonRule`,
          'Canon-rule token ref requires establishesReusableCanonRule',
          { sourceItemId: recordId },
        ),
      )
    }

    const revision = record.revision
    if (revision?.supersedesRecordId !== undefined) {
      const priorId = normalizeId(revision.supersedesRecordId)
      if (!retainedById.has(priorId) && !recordIds.has(priorId)) {
        diagnostics.push(
          diagnostic(
            'supersession_missing_prior',
            `${fieldPrefix}.revision.supersedesRecordId`,
            `Prior promoted record ${priorId} must be retained for traceability`,
            { sourceItemId: recordId },
          ),
        )
      } else {
        dispositions[recordId] = 'supersede_prior'
        const prior = retainedById.get(priorId)
        if (
          prior?.entity &&
          record.entity &&
          prior.entity.sharedEntityId !== record.entity.sharedEntityId
        ) {
          diagnostics.push(
            diagnostic(
              'rename_identity_mismatch',
              `${fieldPrefix}.entity.sharedEntityId`,
              'Rename/supersession must preserve shared entity identity',
              {
                sourceItemId: recordId,
                conflictingAuthority: prior.entity.sharedEntityId,
              },
            ),
          )
        }
      }
    } else if (revision?.withdrawnRecordId !== undefined) {
      dispositions[recordId] = 'withdraw'
    } else {
      dispositions[recordId] = dispositionForStatus(record.claimStatus)
    }

    // Established members eligible for release membership (including supersessions)
    const disposition = dispositions[recordId]
    const establishedEligible =
      record.claimStatus === 'established' &&
      record.source.canonAdmissionAuthorized === true &&
      (disposition === 'promote_established' || disposition === 'supersede_prior')
    if (establishedEligible) {
      promotableEstablishedIds.push(recordId)
    } else if (
      disposition === 'promote_established' &&
      record.source.canonAdmissionAuthorized !== true
    ) {
      diagnostics.push(
        diagnostic(
          'research_artifact_lacks_canon_admission',
          `${fieldPrefix}.source.canonAdmissionAuthorized`,
          'Established promotion requires Dead Air canon admission',
          { sourceItemId: recordId },
        ),
      )
    }
  }

  // Packet-level ok: structural validity. Unresolved/disputed/non-promotable
  // records may remain in a valid packet with non-established dispositions.
  const hasStructuralFailure = diagnostics.some((entry) =>
    [
      'empty_packet_id',
      'empty_source_ref',
      'invalid_schema_version',
      'invalid_claim_status',
      'invalid_entity_kind',
      'invalid_relation_kind',
      'duplicate_record_id',
      'duplicate_relation_key',
      'supersession_missing_prior',
      'rename_identity_mismatch',
      'name_equality_is_not_identity',
      'canon_rule_requires_reusable_rule',
      'publication_time_is_not_occurrence',
      'research_artifact_lacks_canon_admission',
      'disputed_cannot_promote_established',
      'unresolved_cannot_promote_established',
    ].includes(entry.code),
  )

  const frozenDiagnostics = freezeDiagnostics(diagnostics)
  const frozenDispositions = Object.freeze({ ...dispositions })

  if (hasStructuralFailure) {
    return {
      ok: false,
      diagnostics: frozenDiagnostics,
      dispositions: frozenDispositions,
    }
  }

  let release: SharedUniverseReleaseManifest | undefined
  if (options?.buildRelease === true) {
    const ordered = [...promotableEstablishedIds].sort((a, b) => a.localeCompare(b))
    if (ordered.length === 0) {
      return {
        ok: false,
        diagnostics: freezeDiagnostics([
          ...frozenDiagnostics,
          diagnostic(
            'missing_release_member',
            'release',
            'Release construction requires at least one established promoted member',
          ),
        ]),
        dispositions: frozenDispositions,
      }
    }
    const members = ordered.map((id) => {
      const record = packet.records.find((entry) => normalizeId(entry.recordId) === id)!
      return digestRecord(record)
    })
    const releaseLabel = options.releaseLabel?.trim() || packet.packetId
    release = Object.freeze({
      schemaVersion: CROSS_PROPERTY_CANON_HANDOFF_SCHEMA_VERSION,
      releaseId: `su.release.${releaseLabel}.${ordered.join('+')}`,
      orderedMemberRecordIds: Object.freeze(ordered),
      memberDigests: Object.freeze(members),
    })
  }

  return {
    ok: true,
    packet: Object.freeze({
      ...packet,
      records: Object.freeze([...packet.records]),
      retainedPriorRecords: packet.retainedPriorRecords
        ? Object.freeze([...packet.retainedPriorRecords])
        : undefined,
    }),
    dispositions: frozenDispositions,
    diagnostics: frozenDiagnostics,
    release,
  }
}

/**
 * Attempt established-fact promotion for a single record. Unresolved,
 * negative-space, disputed, and non-promotable material fail with stable
 * reason codes while remaining representable in a valid packet.
 */
export function attemptEstablishedPromotion(record: CrossPropertyCanonRecord): {
  readonly ok: boolean
  readonly disposition: PromotionDisposition
  readonly diagnostics: readonly CrossPropertyCanonHandoffDiagnosticRecord[]
} {
  const field = `records[${normalizeId(record.recordId)}].claimStatus`
  const sourceItemId = normalizeId(record.recordId)
  switch (record.claimStatus) {
    case 'established': {
      if (record.source.canonAdmissionAuthorized !== true) {
        return {
          ok: false,
          disposition: 'reject_non_promotable',
          diagnostics: freezeDiagnostics([
            diagnostic(
              'research_artifact_lacks_canon_admission',
              `records[${sourceItemId}].source.canonAdmissionAuthorized`,
              'Established promotion requires Dead Air canon admission',
              { sourceItemId },
            ),
          ]),
        }
      }
      return {
        ok: true,
        disposition: 'promote_established',
        diagnostics: Object.freeze([]),
      }
    }
    case 'unresolved':
    case 'provisional':
    case 'source_limited':
      return {
        ok: false,
        disposition: 'retain_unresolved',
        diagnostics: freezeDiagnostics([
          diagnostic(
            'unresolved_cannot_promote_established',
            field,
            'Unresolved material cannot promote as established',
            { sourceItemId },
          ),
        ]),
      }
    case 'negative_space':
      return {
        ok: false,
        disposition: 'retain_unresolved',
        diagnostics: freezeDiagnostics([
          diagnostic(
            'negative_space_cannot_promote_established',
            field,
            'Negative-space material cannot promote as established',
            { sourceItemId },
          ),
        ]),
      }
    case 'disputed':
    case 'contradicted':
      return {
        ok: false,
        disposition: 'retain_disputed',
        diagnostics: freezeDiagnostics([
          diagnostic(
            'disputed_cannot_promote_established',
            field,
            'Disputed/contradicted material cannot collapse to established',
            { sourceItemId },
          ),
        ]),
      }
    case 'non_promotable':
      return {
        ok: false,
        disposition: 'reject_non_promotable',
        diagnostics: freezeDiagnostics([
          diagnostic(
            'non_promotable_rejected',
            field,
            'Explicitly non-promotable material is rejected',
            { sourceItemId },
          ),
        ]),
      }
    default: {
      const _exhaustive: never = record.claimStatus
      return _exhaustive
    }
  }
}

/**
 * SPE-3175 seam: accepted packets are consumable outside campaign GameState.
 * Returns a frozen transport envelope without mutating campaign state.
 */
export function projectHandoffToNonCampaignTransport(
  packet: CrossPropertyCanonHandoffPacket,
): {
  readonly transportOwner: 'SPE-3175'
  readonly packetId: string
  readonly recordIds: readonly string[]
  readonly campaignGameStateOwned: false
} {
  return Object.freeze({
    transportOwner: 'SPE-3175' as const,
    packetId: packet.packetId,
    recordIds: Object.freeze(
      packet.records.map((record) => normalizeId(record.recordId)).sort((a, b) => a.localeCompare(b)),
    ),
    campaignGameStateOwned: false as const,
  })
}

/**
 * SPE-2099 / SPE-1032 seam: historical projection retains source authority + uncertainty.
 */
export function projectHandoffToHistoricalContinuity(
  record: CrossPropertyCanonRecord,
): {
  readonly projectionOwner: 'SPE-2099' | 'SPE-1032'
  readonly recordId: string
  readonly claimStatus: CanonClaimStatus
  readonly sourceAuthority: string
  readonly uncertaintyPreserved: true
} {
  return Object.freeze({
    projectionOwner: 'SPE-2099' as const,
    recordId: normalizeId(record.recordId),
    claimStatus: record.claimStatus,
    sourceAuthority: record.source.caseOrArtifactId,
    uncertaintyPreserved: true as const,
  })
}

/**
 * SPE-2264 seam: institutional interpretation may differ without mutating promoted canon.
 */
export function projectInstitutionalInterpretation(
  record: CrossPropertyCanonRecord,
  attributedClaim: string,
): InstitutionalInterpretationProjection {
  return Object.freeze({
    interpretationId: `interp.${normalizeId(record.recordId)}`,
    promotedRecordId: normalizeId(record.recordId),
    attributedClaim,
    differsFromPromotedCanon: attributedClaim.trim() !== record.summary.trim(),
  })
}

/**
 * SPE-3139 seam: hand governed reference checks to the existing validator boundary
 * without reimplementing reachability here.
 */
export function handGovernedReferencesToIntegrityBoundary(
  record: CrossPropertyCanonRecord,
): {
  readonly integrityOwner: 'SPE-3139'
  readonly recordId: string
  readonly refs: readonly string[]
} {
  const refs: string[] = [
    ...record.source.stableSourceRefs,
    ...(record.source.namedElementRegistryId
      ? [record.source.namedElementRegistryId]
      : []),
    ...(record.relations ?? []).flatMap((relation) => [
      relation.fromRef,
      relation.toRef,
      ...relation.sourceAuthorityRefs,
    ]),
  ]
  return Object.freeze({
    integrityOwner: 'SPE-3139' as const,
    recordId: normalizeId(record.recordId),
    refs: Object.freeze(
      [...new Set(refs.map((ref) => ref.trim()).filter((ref) => ref.length > 0))].sort((a, b) =>
        a.localeCompare(b),
      ),
    ),
  })
}

// --- Fixtures (acceptance coverage) ---

function baseSource(
  overrides?: Partial<DeadAirSourceIdentity>,
): DeadAirSourceIdentity {
  return Object.freeze({
    caseOrArtifactId: 'DA-CASE-001',
    stableSourceRefs: Object.freeze(['src:da:001']),
    canonAdmissionAuthorized: true,
    ...overrides,
    stableSourceRefs: Object.freeze(
      overrides?.stableSourceRefs ?? ['src:da:001'],
    ),
  })
}

export const FIXTURE_ESTABLISHED_FACT: CrossPropertyCanonHandoffPacket = Object.freeze({
  schemaVersion: CROSS_PROPERTY_CANON_HANDOFF_SCHEMA_VERSION,
  packetId: 'packet.established.1',
  originatingDeadAirCaseId: 'DA-CASE-001',
  records: Object.freeze([
    Object.freeze({
      recordId: 'rec.established.1',
      claimStatus: 'established' as const,
      source: baseSource({ namedElementRegistryId: 'REG-001' }),
      chronology: Object.freeze({
        occurrenceRef: 'occ:1912-04',
        deadAirEstablishmentRef: 'dae:2024-01',
        sharedUniversePromotionRef: 'sup:2026-10',
      }),
      entity: Object.freeze({
        sharedEntityId: 'su.entity.1',
        primaryKind: 'location' as const,
        facets: Object.freeze(['institution', 'site']),
        sourceElementType: 'school/location',
        naming: Object.freeze({
          approvedName: 'Blackwood Academy',
          namingState: 'locked' as const,
        }),
      }),
      permittedUseClasses: Object.freeze([
        'non_campaign_transport',
        'historical_continuity',
        'agency_archive',
      ] as DownstreamUseClass[]),
      summary: 'Blackwood Academy exists as an established shared-universe location.',
    }),
  ]),
})

export const FIXTURE_UNRESOLVED_NEGATIVE_SPACE: CrossPropertyCanonHandoffPacket =
  Object.freeze({
    schemaVersion: CROSS_PROPERTY_CANON_HANDOFF_SCHEMA_VERSION,
    packetId: 'packet.unresolved.1',
    originatingDeadAirCaseId: 'DA-CASE-002',
    records: Object.freeze([
      Object.freeze({
        recordId: 'rec.unresolved.1',
        claimStatus: 'unresolved' as const,
        source: baseSource({ caseOrArtifactId: 'DA-CASE-002' }),
        chronology: Object.freeze({ occurrenceRef: 'occ:unknown' }),
        permittedUseClasses: Object.freeze([
          'non_campaign_transport',
        ] as DownstreamUseClass[]),
        summary: 'Cause of the Blackwood fire remains unresolved.',
      }),
      Object.freeze({
        recordId: 'rec.negative.1',
        claimStatus: 'negative_space' as const,
        source: baseSource({ caseOrArtifactId: 'DA-CASE-002' }),
        chronology: Object.freeze({}),
        permittedUseClasses: Object.freeze([
          'non_campaign_transport',
        ] as DownstreamUseClass[]),
        summary: 'No established trigger entity for the Blackwood fire.',
        relations: Object.freeze([
          Object.freeze({
            relationId: 'rel.neg.1',
            kind: 'not_established_as_trigger' as const,
            fromRef: 'su.entity.unknown',
            toRef: 'event.blackwood.fire',
            epistemicStatus: 'negative_space' as const,
            sourceAuthorityRefs: Object.freeze(['src:da:002']),
          }),
        ]),
      }),
    ]),
  })

export const FIXTURE_DISPUTED: CrossPropertyCanonHandoffPacket = Object.freeze({
  schemaVersion: CROSS_PROPERTY_CANON_HANDOFF_SCHEMA_VERSION,
  packetId: 'packet.disputed.1',
  originatingDeadAirCaseId: 'DA-CASE-003',
  records: Object.freeze([
    Object.freeze({
      recordId: 'rec.disputed.1',
      claimStatus: 'disputed' as const,
      source: baseSource({ caseOrArtifactId: 'DA-CASE-003' }),
      chronology: Object.freeze({ occurrenceRef: 'occ:1931' }),
      permittedUseClasses: Object.freeze([
        'institutional_interpretation',
      ] as DownstreamUseClass[]),
      summary: 'Competing accounts of the 1931 breach remain disputed.',
    }),
  ]),
})

export const FIXTURE_SUPERSESSION: CrossPropertyCanonHandoffPacket = Object.freeze({
  schemaVersion: CROSS_PROPERTY_CANON_HANDOFF_SCHEMA_VERSION,
  packetId: 'packet.supersession.1',
  originatingDeadAirCaseId: 'DA-CASE-001',
  retainedPriorRecords: Object.freeze([
    Object.freeze({
      recordId: 'rec.prior.1',
      claimStatus: 'established' as const,
      source: baseSource({
        namedElementRegistryId: 'REG-001',
        renameAuditRef: 'REN-001',
      }),
      chronology: Object.freeze({ occurrenceRef: 'occ:1912-04' }),
      entity: Object.freeze({
        sharedEntityId: 'su.entity.1',
        primaryKind: 'location' as const,
        naming: Object.freeze({
          approvedName: 'Blackwood School',
          namingState: 'locked' as const,
        }),
      }),
      permittedUseClasses: Object.freeze([
        'historical_continuity',
      ] as DownstreamUseClass[]),
      summary: 'Prior approved name Blackwood School.',
    }),
  ]),
  records: Object.freeze([
    Object.freeze({
      recordId: 'rec.replacement.1',
      claimStatus: 'established' as const,
      source: baseSource({
        namedElementRegistryId: 'REG-001',
        renameAuditRef: 'REN-001',
      }),
      chronology: Object.freeze({
        occurrenceRef: 'occ:1912-04',
        sharedUniversePromotionRef: 'sup:2026-11',
      }),
      revision: Object.freeze({
        supersedesRecordId: 'rec.prior.1',
        priorPromotedRecordId: 'rec.prior.1',
        replacementRecordId: 'rec.replacement.1',
      }),
      entity: Object.freeze({
        sharedEntityId: 'su.entity.1',
        primaryKind: 'location' as const,
        naming: Object.freeze({
          approvedName: 'Blackwood Academy',
          namingState: 'locked' as const,
          aliases: Object.freeze(['Blackwood School']),
        }),
      }),
      permittedUseClasses: Object.freeze([
        'historical_continuity',
        'non_campaign_transport',
      ] as DownstreamUseClass[]),
      summary: 'Renamed to Blackwood Academy; shared entity preserved.',
    }),
  ]),
})

export const FIXTURE_SAME_NAME_DIFFERENT_ENTITIES: CrossPropertyCanonHandoffPacket =
  Object.freeze({
    schemaVersion: CROSS_PROPERTY_CANON_HANDOFF_SCHEMA_VERSION,
    packetId: 'packet.same-name.1',
    originatingDeadAirCaseId: 'DA-CASE-004',
    records: Object.freeze([
      Object.freeze({
        recordId: 'rec.entity.a',
        claimStatus: 'established' as const,
        source: baseSource({
          caseOrArtifactId: 'DA-CASE-004',
          namedElementRegistryId: 'REG-010',
        }),
        chronology: Object.freeze({ occurrenceRef: 'occ:a' }),
        entity: Object.freeze({
          sharedEntityId: 'su.entity.10',
          primaryKind: 'person' as const,
          naming: Object.freeze({
            approvedName: 'Morgan Hale',
            namingState: 'locked' as const,
          }),
        }),
        permittedUseClasses: Object.freeze([
          'agency_archive',
        ] as DownstreamUseClass[]),
        summary: 'Morgan Hale (investigator).',
      }),
      Object.freeze({
        recordId: 'rec.entity.b',
        claimStatus: 'established' as const,
        source: baseSource({
          caseOrArtifactId: 'DA-CASE-004',
          namedElementRegistryId: 'REG-011',
        }),
        chronology: Object.freeze({ occurrenceRef: 'occ:b' }),
        entity: Object.freeze({
          sharedEntityId: 'su.entity.11',
          primaryKind: 'person' as const,
          naming: Object.freeze({
            approvedName: 'Morgan Hale',
            namingState: 'locked' as const,
          }),
        }),
        permittedUseClasses: Object.freeze([
          'agency_archive',
        ] as DownstreamUseClass[]),
        summary: 'Morgan Hale (unrelated civilian).',
      }),
    ]),
  })

export const FIXTURE_RESEARCH_WITHOUT_ADMISSION: CrossPropertyCanonHandoffPacket =
  Object.freeze({
    schemaVersion: CROSS_PROPERTY_CANON_HANDOFF_SCHEMA_VERSION,
    packetId: 'packet.research.1',
    originatingDeadAirCaseId: 'DA-CASE-005',
    records: Object.freeze([
      Object.freeze({
        recordId: 'rec.research.1',
        claimStatus: 'established' as const,
        source: baseSource({
          caseOrArtifactId: 'DA-CASE-005',
          researchWorkflowCompleted: true,
          canonAdmissionAuthorized: false,
        }),
        chronology: Object.freeze({}),
        permittedUseClasses: Object.freeze([
          'non_campaign_transport',
        ] as DownstreamUseClass[]),
        summary: 'Pattern Observatory output without canon admission.',
      }),
    ]),
  })

export const FIXTURE_CANON_RULE: CrossPropertyCanonHandoffPacket = Object.freeze({
  schemaVersion: CROSS_PROPERTY_CANON_HANDOFF_SCHEMA_VERSION,
  packetId: 'packet.rule.1',
  originatingDeadAirCaseId: 'DA-CASE-006',
  records: Object.freeze([
    Object.freeze({
      recordId: 'rec.rule.1',
      claimStatus: 'established' as const,
      source: baseSource({ caseOrArtifactId: 'DA-CASE-006' }),
      chronology: Object.freeze({ occurrenceRef: 'occ:rule' }),
      establishesReusableCanonRule: true,
      canonRuleTokenRef: 'spe-2263:token.mirror-bleed',
      permittedUseClasses: Object.freeze([
        'canon_rule_token',
      ] as DownstreamUseClass[]),
      summary: 'Reusable mirror-bleed rule established across incidents.',
    }),
  ]),
})

export const FIXTURE_FICTIONALIZED_SOURCE_SEPARATION: CrossPropertyCanonHandoffPacket =
  Object.freeze({
    schemaVersion: CROSS_PROPERTY_CANON_HANDOFF_SCHEMA_VERSION,
    packetId: 'packet.fiction.1',
    originatingDeadAirCaseId: 'DA-CASE-007',
    records: Object.freeze([
      Object.freeze({
        recordId: 'rec.fiction.1',
        claimStatus: 'established' as const,
        source: baseSource({ caseOrArtifactId: 'DA-CASE-007' }),
        chronology: Object.freeze({ occurrenceRef: 'occ:fictional' }),
        entity: Object.freeze({
          sharedEntityId: 'su.entity.20',
          primaryKind: 'location' as const,
          sourceProvenanceEntityId: 'su.entity.source.20',
          naming: Object.freeze({
            approvedName: 'Ashford Hollow',
            namingState: 'locked' as const,
          }),
        }),
        relations: Object.freeze([
          Object.freeze({
            relationId: 'rel.source.1',
            kind: 'source_basis_of' as const,
            fromRef: 'su.entity.source.20',
            toRef: 'su.entity.20',
            epistemicStatus: 'established' as const,
            sourceAuthorityRefs: Object.freeze(['src:da:007']),
          }),
          Object.freeze({
            relationId: 'rel.not-alias.1',
            kind: 'not_alias_of' as const,
            fromRef: 'su.entity.20',
            toRef: 'su.entity.source.20',
            epistemicStatus: 'established' as const,
            sourceAuthorityRefs: Object.freeze(['src:da:007']),
          }),
        ]),
        permittedUseClasses: Object.freeze([
          'historical_continuity',
        ] as DownstreamUseClass[]),
        summary: 'Fictionalized Ashford Hollow distinct from real-source basis.',
      }),
    ]),
  })
