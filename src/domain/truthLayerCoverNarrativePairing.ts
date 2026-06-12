/**
 * SPE-1343 cover-narrative pairing slice 1: dual-incident pairing resolver.
 *
 * Wires a public cover narrative record alongside a separate agency operational
 * record on the same site event, with optional disclosure registry cross-ref.
 * Does not collapse claim, doctrine, or verification layers.
 */

import type { PublicDisclosureRecord, PublicDisclosureRecordsMap } from './publicDisclosureStateRegistry'
import {
  COMPETING_TRUTH_LAYERS_FIXTURE,
  COVER_NARRATIVE_TRUTH_LAYER_FIXTURE,
  AGENCY_OPERATIONAL_TRUTH_LAYER_FIXTURE,
  type CompetingLayerRole,
  type TruthLayerRecord,
  type TruthLayerRecordsMap,
} from './truthLayerRecordRegistry'

// ---------------------------------------------------------------------------
// Pairing projection
// ---------------------------------------------------------------------------

export interface TruthLayerDualIncidentPairing {
  readonly incidentRecord: TruthLayerRecord
  readonly coverNarrativeRecord: TruthLayerRecord | null
  readonly operationalRecord: TruthLayerRecord | null
  readonly linkedDisclosureRecord: PublicDisclosureRecord | null
}

// ---------------------------------------------------------------------------
// Authored fixture bundle
// ---------------------------------------------------------------------------

/** Coastal research campus incident with cover narrative + agency operational siblings. */
export const COASTAL_RESEARCH_CAMPUS_DUAL_INCIDENT_TRUTH_LAYER_FIXTURES: TruthLayerRecordsMap =
  Object.freeze({
    [COMPETING_TRUTH_LAYERS_FIXTURE.id]: COMPETING_TRUTH_LAYERS_FIXTURE,
    [COVER_NARRATIVE_TRUTH_LAYER_FIXTURE.id]: COVER_NARRATIVE_TRUTH_LAYER_FIXTURE,
    [AGENCY_OPERATIONAL_TRUTH_LAYER_FIXTURE.id]: AGENCY_OPERATIONAL_TRUTH_LAYER_FIXTURE,
  })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function resolveCompetingLayerRecord(
  incidentRecord: TruthLayerRecord,
  layerRole: CompetingLayerRole,
  records: TruthLayerRecordsMap
): TruthLayerRecord | null {
  const competingLayers = incidentRecord.competingLayers ?? []
  const match = competingLayers.find((entry) => entry.layerRole === layerRole)
  if (!match) {
    return null
  }

  const recordRef = normalizeToken(match.recordRef)
  if (!recordRef) {
    return null
  }

  return records[recordRef] ?? null
}

function resolveLinkedDisclosureRecord(
  incidentRecord: TruthLayerRecord,
  disclosureRecords: PublicDisclosureRecordsMap | undefined
): PublicDisclosureRecord | null {
  const disclosureRef = normalizeToken(incidentRecord.linkedDisclosureRef ?? '')
  if (!disclosureRef || !disclosureRecords) {
    return null
  }

  return disclosureRecords[disclosureRef] ?? null
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolves one competing-layer sibling record from an incident's `competingLayers` refs.
 * Returns null when the ref is missing or the target record is not in the map.
 */
export function resolveTruthLayerCompetingLayerRecord(
  incidentRecord: TruthLayerRecord,
  layerRole: CompetingLayerRole,
  records: TruthLayerRecordsMap
): TruthLayerRecord | null {
  return resolveCompetingLayerRecord(incidentRecord, layerRole, records)
}

/**
 * Resolves cover-narrative and agency-operational sibling records for one incident,
 * plus optional linked disclosure record. Empty maps are a no-op without throw.
 */
export function resolveTruthLayerDualIncidentPairing(
  incidentRecord: TruthLayerRecord,
  truthLayerRecords: TruthLayerRecordsMap,
  publicDisclosureRecords?: PublicDisclosureRecordsMap
): TruthLayerDualIncidentPairing {
  return Object.freeze({
    incidentRecord,
    coverNarrativeRecord: resolveCompetingLayerRecord(
      incidentRecord,
      'cover_narrative',
      truthLayerRecords
    ),
    operationalRecord: resolveCompetingLayerRecord(
      incidentRecord,
      'operational_record',
      truthLayerRecords
    ),
    linkedDisclosureRecord: resolveLinkedDisclosureRecord(
      incidentRecord,
      publicDisclosureRecords
    ),
  })
}
