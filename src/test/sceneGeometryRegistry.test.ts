import { describe, expect, it } from 'vitest'
import {
  createSceneGeometryFeature,
  resolveSceneGeometryFacts,
  validateSceneGeometryRegistry,
} from '../domain/sceneGeometryRegistry'

describe('SPE-2211 scene geometry registry', () => {
  const barricade = createSceneGeometryFeature({
    featureId: 'geom-barricade-a',
    label: 'Sandbag Barricade',
    concealmentBand: 'light',
    coverBand: 'heavy',
    lineOfEffectBlocked: true,
    highGroundEdge: false,
    flankEdge: true,
    difficultTerrain: false,
    solidBarrier: true,
    observationVolumeId: 'volume:approach-north',
    occlusionRegionId: 'occlusion:barricade-shadow',
    coverByCondition: {
      intact: 'heavy',
      burned: 'medium',
      broken: 'light',
    },
  })

  const twin = createSceneGeometryFeature({
    ...barricade,
    featureId: 'geom-barricade-b',
    label: 'Sandbag Barricade Twin',
  })

  it('distinguishes concealment, cover, line of effect, high ground, and flank edges', () => {
    const ridge = createSceneGeometryFeature({
      featureId: 'geom-ridge',
      label: 'Ridge Lip',
      concealmentBand: 'medium',
      coverBand: 'light',
      lineOfEffectBlocked: false,
      highGroundEdge: true,
      flankEdge: true,
      difficultTerrain: true,
      solidBarrier: false,
    })

    const facts = resolveSceneGeometryFacts({ feature: ridge })
    expect(facts.concealmentBand).toBe('medium')
    expect(facts.coverBand).toBe('light')
    expect(facts.lineOfEffectBlocked).toBe(false)
    expect(facts.highGroundEdge).toBe(true)
    expect(facts.flankEdge).toBe(true)
    expect(facts.difficultTerrain).toBe(true)
    expect(facts.solidBarrier).toBe(false)
    expect(facts.observationVolumeId).toBeUndefined()
  })

  it('resolves different cover bands from caller-owned condition state without mutating it', () => {
    const conditionBag = { state: 'intact' as string }
    const intact = resolveSceneGeometryFacts({
      feature: barricade,
      conditionState: conditionBag.state,
    })
    expect(intact.coverBand).toBe('heavy')
    expect(intact.conditionStateApplied).toBe('intact')
    expect(conditionBag.state).toBe('intact')

    conditionBag.state = 'broken'
    const broken = resolveSceneGeometryFacts({
      feature: twin,
      conditionState: conditionBag.state,
    })
    expect(broken.coverBand).toBe('light')
    expect(broken.conditionStateApplied).toBe('broken')

    // Same geometry + condition is deterministic.
    expect(
      resolveSceneGeometryFacts({ feature: barricade, conditionState: 'burned' }),
    ).toEqual(
      resolveSceneGeometryFacts({ feature: barricade, conditionState: 'burned' }),
    )
  })

  it('emits observation/occlusion geometry and relative exposure without owning sensing', () => {
    const front = resolveSceneGeometryFacts({
      feature: barricade,
      conditionState: 'intact',
      relativeFacing: 'front',
    })
    expect(front.observationVolumeId).toBe('volume:approach-north')
    expect(front.occlusionRegionId).toBe('occlusion:barricade-shadow')
    expect(front.relativeExposureBand).toBe('heavy')

    const flank = resolveSceneGeometryFacts({
      feature: barricade,
      conditionState: 'intact',
      relativeFacing: 'flank',
    })
    expect(flank.relativeExposureBand).toBe('medium')

    const rear = resolveSceneGeometryFacts({
      feature: barricade,
      conditionState: 'intact',
      relativeFacing: 'rear',
    })
    expect(rear.relativeExposureBand).toBe('light')
  })

  it('validates registry uniqueness and rejects invalid create inputs', () => {
    expect(validateSceneGeometryRegistry([barricade, twin])).toEqual([])
    expect(
      validateSceneGeometryRegistry([
        barricade,
        createSceneGeometryFeature({ ...twin, featureId: barricade.featureId }),
      ]),
    ).toEqual([`duplicate featureId: ${barricade.featureId}`])

    expect(() =>
      createSceneGeometryFeature({
        ...barricade,
        featureId: '',
      }),
    ).toThrow(/featureId is required/)

    expect(() =>
      createSceneGeometryFeature({
        ...barricade,
        featureId: 'geom-bad-band',
        coverBand: 'extreme' as never,
      }),
    ).toThrow(/coverBand is invalid/)
  })
})
