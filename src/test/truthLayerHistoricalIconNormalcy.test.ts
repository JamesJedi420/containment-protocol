import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  COVER_NARRATIVE_TRUTH_LAYER_FIXTURE,
  HISTORICAL_ICON_NORMALCY_PRESSURE_FIXTURE,
  HISTORICAL_ICON_NORMALCY_TRUTH_LAYER_FIXTURES,
  HISTORICAL_ICON_OPERATIONAL_TRUTH_LAYER_FIXTURE,
  PUBLIC_MYTH_TRUTH_LAYER_FIXTURE,
  projectTruthLayerOpsView,
  projectTruthLayerReviewView,
  validateTruthLayerRecord,
} from '../domain/truthLayerRecordRegistry'
import { resolveTruthLayerCompetingLayerRecord } from '../domain/truthLayerCoverNarrativePairing'

describe('truthLayerHistoricalIconNormalcy (SPE-1343 slice 1)', () => {
  it('validates historical-icon parent and public-myth / operational sibling fixtures', () => {
    const parentResult = validateTruthLayerRecord(HISTORICAL_ICON_NORMALCY_PRESSURE_FIXTURE)
    const mythResult = validateTruthLayerRecord(PUBLIC_MYTH_TRUTH_LAYER_FIXTURE)
    const opsResult = validateTruthLayerRecord(HISTORICAL_ICON_OPERATIONAL_TRUTH_LAYER_FIXTURE)

    expect(parentResult.valid).toBe(true)
    expect(mythResult.valid).toBe(true)
    expect(opsResult.valid).toBe(true)
    expect(HISTORICAL_ICON_NORMALCY_PRESSURE_FIXTURE.competingLayers).toHaveLength(2)
    expect(PUBLIC_MYTH_TRUTH_LAYER_FIXTURE.claim.sourceConfidence).toBe('rumor')
    expect(HISTORICAL_ICON_OPERATIONAL_TRUTH_LAYER_FIXTURE.verification.sourceConfidence).toBe(
      'verified'
    )
    expect(PUBLIC_MYTH_TRUTH_LAYER_FIXTURE.claim.narrative).not.toBe(
      HISTORICAL_ICON_OPERATIONAL_TRUTH_LAYER_FIXTURE.verification.narrative
    )
  })

  it('does not collapse public myth into cover narrative alone', () => {
    expect(PUBLIC_MYTH_TRUTH_LAYER_FIXTURE.claim.sourceConfidence).not.toBe('public_cover')
    expect(PUBLIC_MYTH_TRUTH_LAYER_FIXTURE.claim.narrative).toMatch(/founding covenant/)
    expect(COVER_NARRATIVE_TRUTH_LAYER_FIXTURE.claim.narrative).toMatch(/solvent leak/)
    expect(PUBLIC_MYTH_TRUTH_LAYER_FIXTURE.claim.narrative).not.toBe(
      COVER_NARRATIVE_TRUTH_LAYER_FIXTURE.claim.narrative
    )
  })

  it('resolves public_myth and operational_record siblings from fixture map', () => {
    const publicMyth = resolveTruthLayerCompetingLayerRecord(
      HISTORICAL_ICON_NORMALCY_PRESSURE_FIXTURE,
      'public_myth',
      HISTORICAL_ICON_NORMALCY_TRUTH_LAYER_FIXTURES
    )
    const operational = resolveTruthLayerCompetingLayerRecord(
      HISTORICAL_ICON_NORMALCY_PRESSURE_FIXTURE,
      'operational_record',
      HISTORICAL_ICON_NORMALCY_TRUTH_LAYER_FIXTURES
    )

    expect(publicMyth).toBe(PUBLIC_MYTH_TRUTH_LAYER_FIXTURE)
    expect(operational).toBe(HISTORICAL_ICON_OPERATIONAL_TRUTH_LAYER_FIXTURE)
    expect(publicMyth?.claim.narrative).toMatch(/founding covenant/)
    expect(operational?.verification.narrative).toMatch(/Ground-penetrating survey/)
  })

  it('projects separate review surfaces with correction pressure on each record', () => {
    const parentReview = projectTruthLayerReviewView(HISTORICAL_ICON_NORMALCY_PRESSURE_FIXTURE)
    const mythReview = projectTruthLayerReviewView(PUBLIC_MYTH_TRUTH_LAYER_FIXTURE)
    const opsReview = projectTruthLayerReviewView(HISTORICAL_ICON_OPERATIONAL_TRUTH_LAYER_FIXTURE)

    expect(parentReview.layerDivergence).toBe(true)
    expect(parentReview.claim.narrative).toMatch(/consecrated civic memory/)
    expect(parentReview.doctrine.narrative).toMatch(/normalcy protocol/)
    expect(parentReview.verification.narrative).toMatch(/breach pathway/)
    expect(parentReview.correctionPressure).toBe(0.71)
    expect(parentReview.mythInfrastructureActive).toBe(true)

    expect(mythReview.claim.narrative).not.toBe(mythReview.verification.narrative)
    expect(mythReview.correctionPressure).toBe(0.83)
    expect(mythReview.mythInfrastructureActive).toBe(true)

    expect(opsReview.claim.narrative).not.toBe(opsReview.verification.narrative)
    expect(opsReview.correctionPressure).toBe(0.54)
    expect(opsReview.verification.sourceConfidence).toBe('verified')
  })

  it('projects ops view with myth driving ops without verified mechanism on public myth record', () => {
    const mythOps = projectTruthLayerOpsView(PUBLIC_MYTH_TRUTH_LAYER_FIXTURE)

    expect(mythOps.mythInfrastructureActive).toBe(true)
    expect(mythOps.correctionPressure).toBe(0.83)
    expect(mythOps.mythDrivesOpsWithoutVerification).toBe(true)
    expect(mythOps.verificationSourceConfidence).not.toBe('verified')
  })

  it('returns null siblings for empty map without throw', () => {
    const publicMyth = resolveTruthLayerCompetingLayerRecord(
      HISTORICAL_ICON_NORMALCY_PRESSURE_FIXTURE,
      'public_myth',
      {}
    )
    const operational = resolveTruthLayerCompetingLayerRecord(
      HISTORICAL_ICON_NORMALCY_PRESSURE_FIXTURE,
      'operational_record',
      {}
    )

    expect(publicMyth).toBeNull()
    expect(operational).toBeNull()
  })

  it('round-trips historical-icon fixture map byte-stable through save/load', () => {
    const state = createStartingState()
    state.truthLayerRecords = { ...HISTORICAL_ICON_NORMALCY_TRUTH_LAYER_FIXTURES }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.truthLayerRecords).toEqual(state.truthLayerRecords)
    expect(
      loaded.truthLayerRecords?.[PUBLIC_MYTH_TRUTH_LAYER_FIXTURE.id]?.correctionPressure
    ).toBe(0.83)
    expect(
      loaded.truthLayerRecords?.[HISTORICAL_ICON_OPERATIONAL_TRUTH_LAYER_FIXTURE.id]?.verification
        .evidenceRef
    ).toBe('report:substrate-survey-18')
  })

  it('hydrates historical-icon fixture records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        truthLayerRecords: HISTORICAL_ICON_NORMALCY_TRUTH_LAYER_FIXTURES,
      },
      fallback
    )

    expect(hydrated.truthLayerRecords).toEqual(HISTORICAL_ICON_NORMALCY_TRUTH_LAYER_FIXTURES)
  })

  it('produces byte-stable review projection output on repeated runs', () => {
    const first = JSON.stringify(projectTruthLayerReviewView(HISTORICAL_ICON_NORMALCY_PRESSURE_FIXTURE))
    const second = JSON.stringify(projectTruthLayerReviewView(HISTORICAL_ICON_NORMALCY_PRESSURE_FIXTURE))

    expect(first).toBe(second)
  })
})
