/**
 * SPE-1347 slice 1: cover-story truth-layer pairing anchor.
 *
 * Resolves optional truth-layer cover narrative sibling for a cover-story record
 * without collapsing claim, doctrine, or verification layers.
 */

import type { CoverStoryRecord } from './coverStoryLifecycleRegistry'
import {
  COASTAL_RESEARCH_CAMPUS_DUAL_INCIDENT_TRUTH_LAYER_FIXTURES,
  resolveTruthLayerDualIncidentPairing,
  type TruthLayerDualIncidentPairing,
} from './truthLayerCoverNarrativePairing'
import {
  COMPETING_TRUTH_LAYERS_FIXTURE,
  type TruthLayerRecord,
  type TruthLayerRecordsMap,
} from './truthLayerRecordRegistry'

// ---------------------------------------------------------------------------
// Anchor projection
// ---------------------------------------------------------------------------

export interface CoverStoryTruthLayerAnchor {
  readonly coverStoryRecord: CoverStoryRecord
  readonly linkedTruthLayerRecord: TruthLayerRecord | null
  readonly dualIncidentPairing: TruthLayerDualIncidentPairing | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function resolveLinkedTruthLayerRecord(
  coverStoryRecord: CoverStoryRecord,
  truthLayerRecords: TruthLayerRecordsMap
): TruthLayerRecord | null {
  const linkedRef = normalizeToken(coverStoryRecord.linkedTruthLayerRef ?? '')
  if (!linkedRef) {
    return null
  }

  return truthLayerRecords[linkedRef] ?? null
}

function resolveParentIncidentPairing(
  linkedRecord: TruthLayerRecord | null,
  truthLayerRecords: TruthLayerRecordsMap
): TruthLayerDualIncidentPairing | null {
  if (!linkedRecord) {
    return null
  }

  const directIncident = truthLayerRecords[COMPETING_TRUTH_LAYERS_FIXTURE.id]
  if (directIncident) {
    const pairing = resolveTruthLayerDualIncidentPairing(directIncident, truthLayerRecords)
    if (
      pairing.coverNarrativeRecord?.id === linkedRecord.id ||
      pairing.operationalRecord?.id === linkedRecord.id
    ) {
      return pairing
    }
  }

  for (const incidentRecord of Object.values(truthLayerRecords)) {
    const pairing = resolveTruthLayerDualIncidentPairing(incidentRecord, truthLayerRecords)
    if (
      pairing.coverNarrativeRecord?.id === linkedRecord.id ||
      pairing.operationalRecord?.id === linkedRecord.id
    ) {
      return pairing
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolves truth-layer anchor for one cover-story record.
 * Empty maps are a no-op without throw.
 */
export function resolveCoverStoryTruthLayerAnchor(
  coverStoryRecord: CoverStoryRecord,
  truthLayerRecords: TruthLayerRecordsMap = {}
): CoverStoryTruthLayerAnchor {
  const linkedTruthLayerRecord = resolveLinkedTruthLayerRecord(coverStoryRecord, truthLayerRecords)
  const dualIncidentPairing = resolveParentIncidentPairing(
    linkedTruthLayerRecord,
    truthLayerRecords
  )

  return Object.freeze({
    coverStoryRecord,
    linkedTruthLayerRecord,
    dualIncidentPairing,
  })
}

/** Authored coastal campus bundle for cover-story + truth-layer anchor round-trip checks. */
export const COASTAL_CAMPUS_COVER_STORY_TRUTH_LAYER_ANCHOR_FIXTURES = Object.freeze({
  truthLayerRecords: COASTAL_RESEARCH_CAMPUS_DUAL_INCIDENT_TRUTH_LAYER_FIXTURES,
})
