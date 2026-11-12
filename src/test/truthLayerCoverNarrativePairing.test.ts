import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { DISCLOSURE_PROGRESSION_FIXTURE } from '../domain/publicDisclosureStateRegistry'
import {
  AGENCY_OPERATIONAL_TRUTH_LAYER_FIXTURE,
  COMPETING_TRUTH_LAYERS_FIXTURE,
  COVER_NARRATIVE_TRUTH_LAYER_FIXTURE,
  projectTruthLayerReviewView,
  validateTruthLayerRecord,
} from '../domain/truthLayerRecordRegistry'
import {
  COASTAL_RESEARCH_CAMPUS_DUAL_INCIDENT_TRUTH_LAYER_FIXTURES,
  resolveTruthLayerCompetingLayerRecord,
  resolveTruthLayerDualIncidentPairing,
} from '../domain/truthLayerCoverNarrativePairing'

describe('truthLayerCoverNarrativePairing (SPE-1343 slice 1)', () => {
  it('validates cover narrative and agency operational sibling fixtures', () => {
    const coverResult = validateTruthLayerRecord(COVER_NARRATIVE_TRUTH_LAYER_FIXTURE)
    const opsResult = validateTruthLayerRecord(AGENCY_OPERATIONAL_TRUTH_LAYER_FIXTURE)

    expect(coverResult.valid).toBe(true)
    expect(opsResult.valid).toBe(true)
    expect(COVER_NARRATIVE_TRUTH_LAYER_FIXTURE.claim.sourceConfidence).toBe('public_cover')
    expect(AGENCY_OPERATIONAL_TRUTH_LAYER_FIXTURE.verification.sourceConfidence).toBe('verified')
    expect(COVER_NARRATIVE_TRUTH_LAYER_FIXTURE.claim.narrative).not.toBe(
      AGENCY_OPERATIONAL_TRUTH_LAYER_FIXTURE.verification.narrative
    )
  })

  it('resolves coastal research campus dual-incident pairing from fixture map', () => {
    const pairing = resolveTruthLayerDualIncidentPairing(
      COMPETING_TRUTH_LAYERS_FIXTURE,
      COASTAL_RESEARCH_CAMPUS_DUAL_INCIDENT_TRUTH_LAYER_FIXTURES,
      {
        [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
      }
    )

    expect(pairing.incidentRecord).toBe(COMPETING_TRUTH_LAYERS_FIXTURE)
    expect(pairing.coverNarrativeRecord).toBe(COVER_NARRATIVE_TRUTH_LAYER_FIXTURE)
    expect(pairing.operationalRecord).toBe(AGENCY_OPERATIONAL_TRUTH_LAYER_FIXTURE)
    expect(pairing.linkedDisclosureRecord).toBe(DISCLOSURE_PROGRESSION_FIXTURE)
    expect(pairing.coverNarrativeRecord?.claim.narrative).toMatch(/solvent leak/)
    expect(pairing.operationalRecord?.verification.narrative).toMatch(/Seal inspection/)
  })

  it('resolves competing layer refs by role without collapsing claim and verification', () => {
    const cover = resolveTruthLayerCompetingLayerRecord(
      COMPETING_TRUTH_LAYERS_FIXTURE,
      'cover_narrative',
      COASTAL_RESEARCH_CAMPUS_DUAL_INCIDENT_TRUTH_LAYER_FIXTURES
    )
    const operational = resolveTruthLayerCompetingLayerRecord(
      COMPETING_TRUTH_LAYERS_FIXTURE,
      'operational_record',
      COASTAL_RESEARCH_CAMPUS_DUAL_INCIDENT_TRUTH_LAYER_FIXTURES
    )

    expect(cover).toBe(COVER_NARRATIVE_TRUTH_LAYER_FIXTURE)
    expect(operational).toBe(AGENCY_OPERATIONAL_TRUTH_LAYER_FIXTURE)

    const coverReview = projectTruthLayerReviewView(cover!)
    const opsReview = projectTruthLayerReviewView(operational!)

    expect(coverReview.claim.narrative).not.toBe(coverReview.verification.narrative)
    expect(opsReview.claim.narrative).not.toBe(opsReview.verification.narrative)
    expect(coverReview.claim.narrative).not.toBe(opsReview.verification.narrative)
  })

  it('returns null siblings for empty map without throw', () => {
    const pairing = resolveTruthLayerDualIncidentPairing(COMPETING_TRUTH_LAYERS_FIXTURE, {})

    expect(pairing.coverNarrativeRecord).toBeNull()
    expect(pairing.operationalRecord).toBeNull()
    expect(pairing.linkedDisclosureRecord).toBeNull()
  })

  it('round-trips dual-incident fixture map byte-stable through save/load', () => {
    const state = createStartingState()
    state.truthLayerRecords = { ...COASTAL_RESEARCH_CAMPUS_DUAL_INCIDENT_TRUTH_LAYER_FIXTURES }
    state.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.truthLayerRecords).toEqual(state.truthLayerRecords)
    expect(
      loaded.truthLayerRecords?.[COVER_NARRATIVE_TRUTH_LAYER_FIXTURE.id]?.linkedDisclosureRef
    ).toBe('disclosure:coastal-research-campus')
    expect(
      loaded.truthLayerRecords?.[AGENCY_OPERATIONAL_TRUTH_LAYER_FIXTURE.id]?.verification
        .evidenceRef
    ).toBe('report:ops-log-24')

    const pairing = resolveTruthLayerDualIncidentPairing(
      COMPETING_TRUTH_LAYERS_FIXTURE,
      loaded.truthLayerRecords ?? {},
      loaded.publicDisclosureRecords
    )

    expect(pairing.coverNarrativeRecord).toEqual(COVER_NARRATIVE_TRUTH_LAYER_FIXTURE)
    expect(pairing.operationalRecord).toEqual(AGENCY_OPERATIONAL_TRUTH_LAYER_FIXTURE)
    expect(pairing.linkedDisclosureRecord).toEqual(DISCLOSURE_PROGRESSION_FIXTURE)
  })

  it('hydrates dual-incident fixture records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        truthLayerRecords: COASTAL_RESEARCH_CAMPUS_DUAL_INCIDENT_TRUTH_LAYER_FIXTURES,
        publicDisclosureRecords: {
          [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
        },
      },
      fallback
    )

    expect(hydrated.truthLayerRecords).toEqual(COASTAL_RESEARCH_CAMPUS_DUAL_INCIDENT_TRUTH_LAYER_FIXTURES)
    expect(hydrated.publicDisclosureRecords?.[DISCLOSURE_PROGRESSION_FIXTURE.id]).toEqual(
      DISCLOSURE_PROGRESSION_FIXTURE
    )
  })

  it('produces byte-stable pairing output on repeated runs', () => {
    const first = JSON.stringify(
      resolveTruthLayerDualIncidentPairing(
        COMPETING_TRUTH_LAYERS_FIXTURE,
        COASTAL_RESEARCH_CAMPUS_DUAL_INCIDENT_TRUTH_LAYER_FIXTURES,
        {
          [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
        }
      )
    )
    const second = JSON.stringify(
      resolveTruthLayerDualIncidentPairing(
        COMPETING_TRUTH_LAYERS_FIXTURE,
        COASTAL_RESEARCH_CAMPUS_DUAL_INCIDENT_TRUTH_LAYER_FIXTURES,
        {
          [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
        }
      )
    )

    expect(first).toBe(second)
  })
})
