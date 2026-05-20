import { describe, expect, it } from 'vitest'
import {
  buildSubjectTruthFromScouting,
  concealmentLayersFromRating,
  detectionScanTierOrder,
  resolveScoutingWithRevealPayload,
  scoutingOutcomeToDetectionScan,
} from '../domain/revealPayloadScoutingIntegration'
import { resolveScouting } from '../domain/scoutingResolution'

const SUBJECT = {
  exactIdentity: 'entity:chapel-wraith',
  category: 'spectral intruder',
  activeEffects: ['cold bloom'],
  dormantEffects: ['dream-residue latch'],
  activeProtections: ['warded perimeter'],
} as const

describe('revealPayloadScoutingIntegration (SPE-781 slice 2)', () => {
  it('maps concealment rating to deterministic concealment layers', () => {
    expect(concealmentLayersFromRating(0).map((layer) => layer.id)).toEqual([])
    expect(concealmentLayersFromRating(1).map((layer) => layer.id)).toEqual(['layer:signature-mask'])
    expect(concealmentLayersFromRating(2).map((layer) => layer.id)).toEqual([
      'layer:glamour',
      'layer:signature-mask',
    ])
    expect(concealmentLayersFromRating(3).map((layer) => layer.id)).toEqual([
      'layer:glamour',
      'layer:signature-mask',
    ])
    expect(concealmentLayersFromRating(Number.NaN).map((layer) => layer.id)).toEqual([])
  })

  it('uses effective scouting concealment for layer depth, not raw rating alone', () => {
    const sealed = buildSubjectTruthFromScouting(
      { teamCapability: 2, anomalyConcealment: 0, containerType: 'sealed' },
      SUBJECT
    )
    const open = buildSubjectTruthFromScouting(
      { teamCapability: 2, anomalyConcealment: 2, containerType: 'open' },
      SUBJECT
    )

    expect(sealed.concealmentLayers.length).toBeGreaterThan(open.concealmentLayers.length)
  })

  it('builds subject truth from scouting concealment without mutating identity fields', () => {
    const truth = buildSubjectTruthFromScouting(
      { teamCapability: 2, anomalyConcealment: 2 },
      SUBJECT
    )

    expect(truth.exactIdentity).toBe('entity:chapel-wraith')
    expect(truth.concealmentLayers).toHaveLength(2)
    expect(truth.dormantEffects).toEqual(['dream-residue latch'])
  })

  it('selects deeper scan families for revealed strong outcomes than withheld failures', () => {
    expect(
      scoutingOutcomeToDetectionScan({
        outcome: 'strong',
        revealed: true,
        withheld: false,
      })
    ).toEqual({ family: 'identity_probe', layersToStrip: 1 })

    expect(
      scoutingOutcomeToDetectionScan({
        outcome: 'catastrophic',
        revealed: false,
        withheld: true,
      })
    ).toEqual({ family: 'presence_sweep' })
  })

  it('returns presence-only tiers for absent subjects even when scouting reveals', () => {
    const integrated = resolveScoutingWithRevealPayload({
      teamCapability: 3,
      anomalyConcealment: 0,
      teamTags: ['recon-specialist'],
      subject: { ...SUBJECT, present: false },
    })

    expect(integrated.revealed).toBe(true)
    expect(detectionScanTierOrder(integrated.detectionScan)).toEqual(['presence'])
    expect(integrated.detectionScan.fields[0]?.playerFacingValue).toBe('no contact')
    expect(integrated.detectionScan.strippedLayerIds).toEqual([])
  })

  it('maps partial scouting outcomes to presence-only scans', () => {
    expect(
      scoutingOutcomeToDetectionScan({
        outcome: 'partial',
        revealed: false,
        withheld: false,
      })
    ).toEqual({ family: 'presence_sweep' })
  })

  it('preserves legacy scouting fields while attaching tiered detection payloads', () => {
    const input = {
      teamCapability: 3,
      anomalyConcealment: 2,
      teamTags: ['scout'],
      gearTags: ['thermal-vision'],
      subject: SUBJECT,
    }

    const legacy = resolveScouting(input)
    const integrated = resolveScoutingWithRevealPayload(input)

    expect(integrated.outcome).toBe(legacy.outcome)
    expect(integrated.revealed).toBe(legacy.revealed)
    expect(integrated.withheld).toBe(legacy.withheld)
    expect(integrated.value).toBe(legacy.value)

    if (integrated.revealed) {
      expect(detectionScanTierOrder(integrated.detectionScan).length).toBeGreaterThan(1)
      expect(
        integrated.detectionScan.fields.some((field) => field.tier === 'category')
      ).toBe(true)
    } else {
      expect(detectionScanTierOrder(integrated.detectionScan)).toEqual(['presence'])
    }
  })

  it('blocks exact identity on identity-probe scouting when two concealment layers remain after one peel', () => {
    const integrated = resolveScoutingWithRevealPayload({
      teamCapability: 3,
      anomalyConcealment: 2,
      teamTags: ['recon-specialist'],
      gearTags: ['thermal-vision'],
      subject: SUBJECT,
    })

    expect(integrated.outcome).toBe('strong')
    expect(integrated.revealed).toBe(true)
    expect(scoutingOutcomeToDetectionScan(integrated)).toEqual({
      family: 'identity_probe',
      layersToStrip: 1,
    })
    expect(detectionScanTierOrder(integrated.detectionScan)).toEqual([
      'presence',
      'category',
      'hostility',
      'concealment_depth',
    ])
    expect(
      integrated.detectionScan.fields.some((field) => field.tier === 'exact_identity')
    ).toBe(false)
  })
})
