import { describe, expect, it } from 'vitest'
import {
  resolveDetectionScan,
  stripConcealmentLayers,
  type ConcealmentLayer,
  type SubjectTruthState,
} from '../domain/revealPayload'

const BASE_LAYERS: readonly ConcealmentLayer[] = [
  {
    id: 'layer:glamour',
    blockedTiers: ['category', 'exact_identity', 'hostility'],
  },
  {
    id: 'layer:signature-mask',
    blockedTiers: ['exact_identity'],
  },
]

const CATEGORY_ONLY_LAYERS: readonly ConcealmentLayer[] = [
  {
    id: 'layer:signature-mask',
    blockedTiers: ['exact_identity'],
  },
]

function buildSubject(overrides: Partial<SubjectTruthState> = {}): SubjectTruthState {
  return {
    present: true,
    exactIdentity: 'entity:chapel-wraith',
    category: 'spectral intruder',
    hostility: 'latent',
    activeProtections: ['warded perimeter'],
    concealmentLayers: BASE_LAYERS,
    activeEffects: ['cold bloom'],
    dormantEffects: ['dream-residue latch'],
    ...overrides,
  }
}

describe('revealPayload (SPE-781 slice 1)', () => {
  it('returns presence without exact identity on a category pass while concealment remains', () => {
    const result = resolveDetectionScan(buildSubject({ concealmentLayers: CATEGORY_ONLY_LAYERS }), {
      family: 'category_pass',
    })

    expect(result.fields.map((field) => field.tier)).toEqual(['presence', 'category'])
    expect(result.fields.find((field) => field.tier === 'presence')?.playerFacingValue).toBe(
      'contact detected'
    )

    const category = result.fields.find((field) => field.tier === 'category')
    expect(category?.internalValue).toBe('spectral intruder')
    expect(category?.playerFacingValue).toBe('unclassified contact')
    expect(category?.ambiguous).toBe(true)
    expect(result.fields.some((field) => field.tier === 'exact_identity')).toBe(false)
  })

  it('strips concealment layers before exposing deeper identity tiers', () => {
    const withoutPeel = resolveDetectionScan(buildSubject(), { family: 'identity_probe' })
    expect(withoutPeel.fields.map((field) => field.tier)).toEqual(['presence', 'concealment_depth'])
    expect(withoutPeel.remainingConcealmentLayers).toHaveLength(2)

    const withPeel = resolveDetectionScan(buildSubject(), {
      family: 'identity_probe',
      layersToStrip: 1,
    })

    expect(withPeel.strippedLayerIds).toEqual(['layer:glamour'])
    expect(withPeel.remainingConcealmentLayers.map((layer) => layer.id)).toEqual([
      'layer:signature-mask',
    ])
    expect(withPeel.fields.map((field) => field.tier)).toEqual([
      'presence',
      'category',
      'hostility',
      'concealment_depth',
    ])

    const fullyStripped = resolveDetectionScan(buildSubject(), {
      family: 'identity_probe',
      layersToStrip: 2,
    })

    expect(fullyStripped.fields.find((field) => field.tier === 'exact_identity')).toMatchObject({
      internalValue: 'entity:chapel-wraith',
      playerFacingValue: 'entity:chapel-wraith',
      ambiguous: false,
    })
  })

  it('shows active effects while dormant effects stay hidden from active-effect scans', () => {
    const result = resolveDetectionScan(buildSubject(), { family: 'active_effects' })

    const active = result.fields.find((field) => field.tier === 'active_protection')
    expect(active?.internalValue).toEqual(['warded perimeter', 'cold bloom'])
    expect(active?.playerFacingValue).toContain('cold bloom')
    expect(active?.playerFacingValue).not.toContain('dream-residue latch')
  })

  it('peels layers deterministically via stripConcealmentLayers', () => {
    expect(stripConcealmentLayers(BASE_LAYERS, 0)).toEqual({
      remaining: BASE_LAYERS,
      strippedIds: [],
    })

    expect(stripConcealmentLayers(BASE_LAYERS, 99)).toEqual({
      remaining: [],
      strippedIds: ['layer:glamour', 'layer:signature-mask'],
    })
  })

  it('reports remaining concealment depth after a partial peel', () => {
    const partialPeel = resolveDetectionScan(buildSubject(), {
      family: 'identity_probe',
      layersToStrip: 1,
    })

    expect(partialPeel.remainingConcealmentLayers.map((layer) => layer.id)).toEqual([
      'layer:signature-mask',
    ])
    expect(partialPeel.fields.map((field) => field.tier)).toEqual([
      'presence',
      'category',
      'hostility',
      'concealment_depth',
    ])
    expect(partialPeel.fields.some((field) => field.tier === 'exact_identity')).toBe(false)
  })

  it('returns only presence when the subject is absent', () => {
    const result = resolveDetectionScan(buildSubject({ present: false }), {
      family: 'identity_probe',
      layersToStrip: 2,
    })

    expect(result.fields).toEqual([
      {
        tier: 'presence',
        internalValue: false,
        playerFacingValue: 'no contact',
        ambiguous: false,
      },
    ])
  })

  it('omits active protection when the tier is blocked or no active signals exist', () => {
    const blocked = resolveDetectionScan(
      buildSubject({
        concealmentLayers: [{ id: 'layer:warded', blockedTiers: ['active_protection'] }],
      }),
      { family: 'active_effects' }
    )
    expect(blocked.fields.map((field) => field.tier)).toEqual(['presence'])

    const emptySignals = resolveDetectionScan(
      buildSubject({ activeEffects: [], activeProtections: [] }),
      { family: 'active_effects' }
    )
    expect(emptySignals.fields.map((field) => field.tier)).toEqual(['presence'])
  })

  it('treats invalid layer strip counts as zero', () => {
    expect(stripConcealmentLayers(BASE_LAYERS, Number.NaN)).toEqual({
      remaining: BASE_LAYERS,
      strippedIds: [],
    })
    expect(stripConcealmentLayers(BASE_LAYERS, -3)).toEqual({
      remaining: BASE_LAYERS,
      strippedIds: [],
    })
  })
})
