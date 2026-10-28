/**
 * SPE-2099 — historical continuity board (slice 1).
 *
 * Pure deterministic records + chronology validation + player projection.
 * No GameState, site generator, franchise canon imports, or archive UI.
 */

export const HISTORICAL_CONTINUITY_BOARD_SCHEMA_VERSION = 'spe-2099.v1' as const

export type HistoricalEventId = string
export type HistoricalRecordId = string

export const HISTORICAL_TRUTH_LAYERS = [
  'public_history',
  'operational_truth',
  'institutional_record',
  'faction_record',
  'field_hypothesis',
  'recovered_journal',
  'oral_history',
  'hostile_dossier',
  'altered_record',
  'redacted_summary',
  'later_correction',
] as const
export type HistoricalTruthLayer = (typeof HISTORICAL_TRUTH_LAYERS)[number]

export const HISTORICAL_DATE_CONFIDENCES = [
  'exact',
  'approximate',
  'era_only',
  'unknown',
] as const
export type HistoricalDateConfidence = (typeof HISTORICAL_DATE_CONFIDENCES)[number]

export interface HistoricalRecord {
  readonly schemaVersion: typeof HISTORICAL_CONTINUITY_BOARD_SCHEMA_VERSION
  readonly recordId: HistoricalRecordId
  readonly eventId: HistoricalEventId
  readonly truthLayer: HistoricalTruthLayer
  readonly confidence: number
  readonly provenance: string
  readonly isSeed?: boolean
  readonly eraMarker?: string
  readonly approximateDate?: string
  readonly dateConfidence?: HistoricalDateConfidence
  readonly discoveryDate?: string
  readonly publicationDate?: string
  readonly locationId?: string
  readonly institutionIds?: readonly string[]
  readonly factionIds?: readonly string[]
  readonly publicExplanation?: string
  readonly operationalExplanation?: string
  /** Forbidden collapsed field — presence triggers truth_layer_collapse. */
  readonly historyText?: string
  readonly contradictionNotes?: readonly string[]
  readonly evidenceRefs?: readonly string[]
  readonly legacyConsequenceHookIds?: readonly string[]
  readonly supersedesRecordId?: HistoricalRecordId
  readonly revisionId?: string
  readonly autoResolveContradiction?: boolean
  readonly sharedUniversePromotedRecordId?: string
}

export const HISTORICAL_CHRONOLOGY_DIAGNOSTICS = [
  'conflicting_dates',
  'impossible_order',
  'duplicate_event_fingerprint',
  'public_vs_internal_mismatch',
  'missing_provenance',
  'confidence_without_downstream_hook',
  'stale_record',
  'unresolved_contradiction',
  'auto_resolve_forbidden',
  'truth_layer_collapse',
  'malformed_record',
] as const
export type HistoricalChronologyDiagnostic =
  (typeof HISTORICAL_CHRONOLOGY_DIAGNOSTICS)[number]

export interface HistoricalChronologyDiagnosticRecord {
  readonly code: HistoricalChronologyDiagnostic
  readonly severity: 'error' | 'warning'
  readonly recordId: string
  readonly eventId: string
  readonly message: string
  readonly relatedRecordIds?: readonly string[]
}

export interface HistoricalChronologyValidationResult {
  readonly ok: boolean
  readonly diagnostics: readonly HistoricalChronologyDiagnosticRecord[]
}

export interface HistoricalPlayerProjectionPolicy {
  readonly includeOperationalExplanation?: boolean
  readonly includeContradictionNotes?: boolean
  readonly redactHostileDossier?: boolean
}

export interface HistoricalPlayerProjection {
  readonly recordId: HistoricalRecordId
  readonly eventId: HistoricalEventId
  readonly truthLayer: HistoricalTruthLayer
  readonly publicExplanation: string | null
  readonly operationalExplanation: string | null
  readonly contradictionNotes: readonly string[]
  readonly redacted: boolean
}

function compareStrings(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function freezeDiagnostics(
  diagnostics: readonly HistoricalChronologyDiagnosticRecord[],
): readonly HistoricalChronologyDiagnosticRecord[] {
  return Object.freeze(
    [...diagnostics]
      .sort(
        (a, b) =>
          compareStrings(a.code, b.code) ||
          compareStrings(a.recordId, b.recordId) ||
          compareStrings(a.eventId, b.eventId) ||
          compareStrings(a.message, b.message),
      )
      .map((entry) =>
        Object.freeze({
          ...entry,
          relatedRecordIds: entry.relatedRecordIds
            ? Object.freeze([...entry.relatedRecordIds].sort(compareStrings))
            : undefined,
        }),
      ),
  )
}

function isTruthLayer(value: string): value is HistoricalTruthLayer {
  return (HISTORICAL_TRUTH_LAYERS as readonly string[]).includes(value)
}

function parseDateToken(value: string | undefined): number | null {
  if (!value || value.trim().length === 0) return null
  const trimmed = value.trim()
  // Accept ISO-ish YYYY or YYYY-MM-DD for ordering only.
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(trimmed)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2] ?? '01')
  const day = Number(match[3] ?? '01')
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }
  return year * 10000 + month * 100 + day
}

/**
 * Validate a batch of historical records for chronology / layer integrity.
 * Read-only; does not mutate or auto-merge records.
 */
export function validateHistoricalChronology(
  records: readonly HistoricalRecord[],
): HistoricalChronologyValidationResult {
  const diagnostics: HistoricalChronologyDiagnosticRecord[] = []
  if (!Array.isArray(records)) {
    return {
      ok: false,
      diagnostics: freezeDiagnostics([
        {
          code: 'malformed_record',
          severity: 'error',
          recordId: '',
          eventId: '',
          message: 'records array is required',
        },
      ]),
    }
  }

  const byId = new Map<string, HistoricalRecord>()
  for (const record of records) {
    if (
      !record ||
      typeof record.recordId !== 'string' ||
      record.recordId.trim().length === 0 ||
      typeof record.eventId !== 'string' ||
      record.eventId.trim().length === 0 ||
      !isTruthLayer(record.truthLayer)
    ) {
      diagnostics.push({
        code: 'malformed_record',
        severity: 'error',
        recordId: String(record?.recordId ?? ''),
        eventId: String(record?.eventId ?? ''),
        message: 'recordId, eventId, and truthLayer are required',
      })
      continue
    }
    byId.set(record.recordId.trim(), record)
  }

  const fingerprintCounts = new Map<string, string[]>()
  for (const record of byId.values()) {
    const recordId = record.recordId.trim()
    const eventId = record.eventId.trim()

    if (record.autoResolveContradiction === true) {
      diagnostics.push({
        code: 'auto_resolve_forbidden',
        severity: 'error',
        recordId,
        eventId,
        message: 'Auto-resolving contradictions is forbidden; use explicit supersession',
      })
    }

    if (typeof record.historyText === 'string' && record.historyText.trim().length > 0) {
      diagnostics.push({
        code: 'truth_layer_collapse',
        severity: 'warning',
        recordId,
        eventId,
        message: 'historyText collapses layered public/operational explanations',
      })
    }

    const provenance = (record.provenance ?? '').trim()
    if (!record.isSeed && provenance.length === 0) {
      diagnostics.push({
        code: 'missing_provenance',
        severity: 'error',
        recordId,
        eventId,
        message: 'Non-seed historical record requires provenance',
      })
    }

    if (
      Number.isFinite(record.confidence) &&
      record.confidence > 0.8 &&
      (!record.legacyConsequenceHookIds ||
        record.legacyConsequenceHookIds.length === 0) &&
      (!record.evidenceRefs || record.evidenceRefs.length === 0)
    ) {
      diagnostics.push({
        code: 'confidence_without_downstream_hook',
        severity: 'warning',
        recordId,
        eventId,
        message: 'High confidence without evidenceRefs or legacyConsequenceHookIds',
      })
    }

    const publicText = (record.publicExplanation ?? '').trim()
    const operationalText = (record.operationalExplanation ?? '').trim()
    if (
      publicText.length > 0 &&
      operationalText.length > 0 &&
      publicText === operationalText &&
      record.truthLayer !== 'public_history'
    ) {
      diagnostics.push({
        code: 'public_vs_internal_mismatch',
        severity: 'warning',
        recordId,
        eventId,
        message: 'Public and operational explanations are identical',
      })
    }

    const occurrence = parseDateToken(record.approximateDate)
    const discovery = parseDateToken(record.discoveryDate)
    const publication = parseDateToken(record.publicationDate)
    if (occurrence !== null && discovery !== null && discovery < occurrence) {
      diagnostics.push({
        code: 'impossible_order',
        severity: 'error',
        recordId,
        eventId,
        message: 'discoveryDate precedes approximateDate',
      })
    }
    if (occurrence !== null && publication !== null && publication < occurrence) {
      diagnostics.push({
        code: 'impossible_order',
        severity: 'error',
        recordId,
        eventId,
        message: 'publicationDate precedes approximateDate',
      })
    }

    const fingerprint = [
      eventId,
      record.truthLayer,
      record.approximateDate?.trim() ?? '',
      publicText,
      operationalText,
    ].join('|')
    const bucket = fingerprintCounts.get(fingerprint) ?? []
    bucket.push(recordId)
    fingerprintCounts.set(fingerprint, bucket)

    if (record.supersedesRecordId) {
      const prior = byId.get(record.supersedesRecordId.trim())
      if (prior) {
        // Prior remains readable — no diagnostic. Mark superseded prior as stale warning.
        diagnostics.push({
          code: 'stale_record',
          severity: 'warning',
          recordId: prior.recordId.trim(),
          eventId: prior.eventId.trim(),
          message: `Record superseded by ${recordId}`,
          relatedRecordIds: [recordId],
        })
      }
    }
  }

  for (const [fingerprint, ids] of fingerprintCounts) {
    if (ids.length > 1) {
      diagnostics.push({
        code: 'duplicate_event_fingerprint',
        severity: 'warning',
        recordId: ids[0]!,
        eventId: fingerprint.split('|')[0] ?? '',
        message: 'Duplicate event fingerprint across records',
        relatedRecordIds: ids,
      })
    }
  }

  // Conflicting dates for same eventId across distinct truth layers.
  const byEvent = new Map<string, HistoricalRecord[]>()
  for (const record of byId.values()) {
    const eventId = record.eventId.trim()
    const list = byEvent.get(eventId) ?? []
    list.push(record)
    byEvent.set(eventId, list)
  }
  for (const [eventId, group] of byEvent) {
    const dated = group
      .map((r) => ({
        recordId: r.recordId.trim(),
        token: parseDateToken(r.approximateDate),
        layer: r.truthLayer,
      }))
      .filter((entry) => entry.token !== null)
    const uniqueTokens = [...new Set(dated.map((entry) => entry.token!))]
    if (uniqueTokens.length > 1) {
      diagnostics.push({
        code: 'conflicting_dates',
        severity: 'error',
        recordId: dated[0]!.recordId,
        eventId,
        message: 'Conflicting approximateDate values for the same eventId',
        relatedRecordIds: dated.map((entry) => entry.recordId),
      })
    }

    const layers = new Set(group.map((r) => r.truthLayer))
    if (layers.size > 1) {
      const hasNotes = group.some(
        (r) => (r.contradictionNotes?.length ?? 0) > 0 || r.supersedesRecordId,
      )
      if (!hasNotes) {
        diagnostics.push({
          code: 'unresolved_contradiction',
          severity: 'warning',
          recordId: group[0]!.recordId.trim(),
          eventId,
          message:
            'Multiple truth layers for one event without contradiction notes or supersession',
          relatedRecordIds: group.map((r) => r.recordId.trim()),
        })
      }
    }
  }

  const frozen = freezeDiagnostics(diagnostics)
  const hasError = frozen.some((d) => d.severity === 'error')
  return { ok: !hasError, diagnostics: frozen }
}

/**
 * Player-facing projection. Operational truth omitted unless policy opts in.
 */
export function projectHistoricalRecordForPlayer(
  record: HistoricalRecord,
  policy: HistoricalPlayerProjectionPolicy = {},
): HistoricalPlayerProjection {
  const redactHostile =
    policy.redactHostileDossier !== false && record.truthLayer === 'hostile_dossier'
  const includeOperational = policy.includeOperationalExplanation === true
  const includeNotes = policy.includeContradictionNotes === true

  return Object.freeze({
    recordId: record.recordId.trim(),
    eventId: record.eventId.trim(),
    truthLayer: record.truthLayer,
    publicExplanation: redactHostile
      ? null
      : (record.publicExplanation?.trim() || null),
    operationalExplanation:
      includeOperational && !redactHostile
        ? (record.operationalExplanation?.trim() || null)
        : null,
    contradictionNotes: Object.freeze(
      includeNotes && !redactHostile
        ? [...(record.contradictionNotes ?? [])]
        : [],
    ),
    redacted: redactHostile,
  })
}

/** Records that remain readable after supersession (all input records). */
export function listReadableHistoricalRecords(
  records: readonly HistoricalRecord[],
): readonly HistoricalRecord[] {
  return Object.freeze(
    [...records].sort(
      (a, b) =>
        compareStrings(a.eventId, b.eventId) ||
        compareStrings(a.recordId, b.recordId),
    ),
  )
}
