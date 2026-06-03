import { describe, expect, it } from 'vitest'
import {
  applyFalsePositionScanProjection,
  applyFalseDetectionScanProjection,
  applyGlamourOverlayScanProjection,
  applyAntiScanCompartmentScanProjection,
  applyOutOfPhaseScanProjection,
  applySignatureMaskScanProjection,
  ANTI_SCAN_COMPARTMENT_TAG,
  ANTI_SCAN_DEGRADED_PRESENCE_SKEW,
  ANTI_SCAN_PARTIAL_PRESENCE_SKEW,
  antiScanCompartmentScoutingScoreAdjustment,
  EM_SWEEP_TAG,
  isAntiScanCompartmentAligned,
  isOutOfPhasePresenceAligned,
  LIMINAL_FREQUENCY_TAG,
  LIMINAL_PRESENCE_TAG,
  MODALITY_ANTI_SCAN_TAG,
  MODALITY_OUT_OF_PHASE_TAG,
  OUT_OF_PHASE_ABSENT_ROUTE_SKEW,
  OUT_OF_PHASE_PARTIAL_PRESENCE_SKEW,
  outOfPhaseScoutingScoreAdjustment,
  SCAN_BYPASS_TAG,
  buildSubjectTruthFromCaseHiddenState,
  formatDecoyLocusLabel,
  FALSE_DETECTION_FABRICATED_CATEGORY,
  FALSE_DETECTION_FABRICATED_PRESENCE,
  GLAMOUR_OVERLAY_CATEGORY_SKEW,
  GLAMOUR_OVERLAY_HOSTILITY_SKEW,
  hiddenStateModalityLayer,
  INSTRUMENTATION_ATTACK_TAG,
  MODALITY_FALSE_DETECTION_TAG,
  MODALITY_GLAMOUR_TAG,
  MODALITY_SIGNATURE_MASK_TAG,
  PRESENTATION_OVERLAY_TAG,
  resolveHiddenStateModality,
  scoutingOutcomeToDetectionScanForCase,
  SIGNATURE_MASK_CATEGORY_SKEW,
} from '../domain/hiddenStateModality'
import { resolveDetectionScan } from '../domain/revealPayload'
import {
  detectionScanTierOrder,
  resolveScoutingWithCaseHiddenState,
} from '../domain/revealPayloadScoutingIntegration'
import { resolveScouting } from '../domain/scoutingResolution'
import type { CaseInstance } from '../domain/models'
import { createStarterCase } from '../domain/templates/startingCases'

const SCOUTING_INPUT = {
  teamCapability: 3,
  anomalyConcealment: 2,
  teamTags: ['recon-specialist'],
  gearTags: ['thermal-vision'],
} as const

const SCOUTING_LOW_CONCEALMENT = {
  ...SCOUTING_INPUT,
  anomalyConcealment: 0,
} as const

const SUBJECT = {
  exactIdentity: 'entity:chapel-wraith',
  category: 'spectral intruder',
  hostility: 'latent' as const,
  activeEffects: ['cold bloom'],
  dormantEffects: ['dream-residue latch'],
  activeProtections: ['warded perimeter'],
}

function createModalityCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({
      id: 'case-modality-matrix',
      templateId: 'combat_vampire_nest',
    }),
    mode: 'threshold',
    hiddenState: 'hidden',
    detectionConfidence: 0.2,
    counterDetection: false,
    tags: ['concealment'],
    requiredTags: [],
    preferredTags: [],
    assignedTeamIds: ['team-modality'],
    infiltrationCoverProfile: undefined,
    infiltrationProbePlan: undefined,
    stealthLeaveBehindId: undefined,
    weights: { combat: 0, investigation: 0.4, utility: 0, social: 0 },
    difficulty: { combat: 0, investigation: 40, utility: 0, social: 0 },
    ...overrides,
  }
}

describe('hiddenStateModality (SPE-2281)', () => {
  it('resolves modality kinds from case hidden-state fields', () => {
    expect(resolveHiddenStateModality(createModalityCase({ hiddenState: undefined }))).toBe('none')
    expect(resolveHiddenStateModality(createModalityCase({ hiddenState: 'revealed' }))).toBe('none')
    expect(resolveHiddenStateModality(createModalityCase({ hiddenState: 'hidden' }))).toBe(
      'concealed_presence'
    )
    expect(
      resolveHiddenStateModality(
        createModalityCase({
          hiddenState: 'hidden',
          tags: ['infiltration', 'concealment'],
          infiltrationCoverProfile: { claimedRole: 'courier', documentTier: 1 },
        })
      )
    ).toBe('disguised_identity')
    expect(
      resolveHiddenStateModality(
        createModalityCase({
          hiddenState: 'displaced',
          displacementTarget: 'sector-east-wing',
        })
      )
    ).toBe('false_position')
    expect(
      resolveHiddenStateModality(
        createModalityCase({
          hiddenState: 'hidden',
          tags: [MODALITY_SIGNATURE_MASK_TAG],
        })
      )
    ).toBe('signature_masking')
    expect(
      resolveHiddenStateModality(
        createModalityCase({
          hiddenState: 'hidden',
          tags: [MODALITY_FALSE_DETECTION_TAG],
        })
      )
    ).toBe('false_detection_output')
    expect(
      resolveHiddenStateModality(
        createModalityCase({
          hiddenState: 'hidden',
          tags: [INSTRUMENTATION_ATTACK_TAG],
        })
      )
    ).toBe('false_detection_output')
    expect(
      resolveHiddenStateModality(
        createModalityCase({
          hiddenState: 'hidden',
          tags: [MODALITY_FALSE_DETECTION_TAG, MODALITY_SIGNATURE_MASK_TAG],
        })
      )
    ).toBe('false_detection_output')
    expect(
      resolveHiddenStateModality(
        createModalityCase({
          hiddenState: 'hidden',
          tags: [MODALITY_GLAMOUR_TAG],
        })
      )
    ).toBe('glamour_overlay')
    expect(
      resolveHiddenStateModality(
        createModalityCase({
          hiddenState: 'hidden',
          tags: [PRESENTATION_OVERLAY_TAG],
        })
      )
    ).toBe('glamour_overlay')
    expect(
      resolveHiddenStateModality(
        createModalityCase({
          hiddenState: 'hidden',
          tags: [MODALITY_SIGNATURE_MASK_TAG, MODALITY_GLAMOUR_TAG],
        })
      )
    ).toBe('signature_masking')
    expect(
      resolveHiddenStateModality(
        createModalityCase({
          hiddenState: 'hidden',
          tags: [MODALITY_FALSE_DETECTION_TAG, MODALITY_GLAMOUR_TAG],
        })
      )
    ).toBe('false_detection_output')
    expect(
      resolveHiddenStateModality(
        createModalityCase({
          hiddenState: 'hidden',
          tags: [MODALITY_OUT_OF_PHASE_TAG],
        })
      )
    ).toBe('out_of_phase_presence')
    expect(
      resolveHiddenStateModality(
        createModalityCase({
          hiddenState: 'hidden',
          tags: [LIMINAL_PRESENCE_TAG],
        })
      )
    ).toBe('out_of_phase_presence')
    expect(
      resolveHiddenStateModality(
        createModalityCase({
          hiddenState: 'hidden',
          tags: [MODALITY_GLAMOUR_TAG, MODALITY_OUT_OF_PHASE_TAG],
        })
      )
    ).toBe('glamour_overlay')
    expect(
      resolveHiddenStateModality(
        createModalityCase({
          hiddenState: 'hidden',
          tags: [MODALITY_ANTI_SCAN_TAG],
        })
      )
    ).toBe('anti_scan_compartment')
    expect(
      resolveHiddenStateModality(
        createModalityCase({
          hiddenState: 'hidden',
          tags: [ANTI_SCAN_COMPARTMENT_TAG],
        })
      )
    ).toBe('anti_scan_compartment')
    expect(
      resolveHiddenStateModality(
        createModalityCase({
          hiddenState: 'hidden',
          tags: [MODALITY_OUT_OF_PHASE_TAG, MODALITY_ANTI_SCAN_TAG],
        })
      )
    ).toBe('out_of_phase_presence')
  })

  it('maps anti-scan compartment to authored anti-scan layer', () => {
    expect(hiddenStateModalityLayer('anti_scan_compartment')?.id).toBe('layer:authored-anti-scan')
  })

  it('maps out-of-phase presence to authored out-of-phase layer', () => {
    expect(hiddenStateModalityLayer('out_of_phase_presence')?.id).toBe('layer:authored-out-of-phase')
  })

  it('maps glamour overlay to authored glamour layer', () => {
    expect(hiddenStateModalityLayer('glamour_overlay')?.id).toBe('layer:authored-glamour')
  })

  it('maps false-detection output to authored false-detection layer', () => {
    expect(hiddenStateModalityLayer('false_detection_output')?.id).toBe(
      'layer:authored-false-detection'
    )
  })

  it('maps each modality to a distinct concealment layer id', () => {
    expect(hiddenStateModalityLayer('concealed_presence')?.id).toBe('layer:concealed-presence')
    expect(hiddenStateModalityLayer('false_position')?.id).toBe('layer:false-position')
    expect(hiddenStateModalityLayer('disguised_identity')?.id).toBe('layer:disguised-identity')
    expect(hiddenStateModalityLayer('none')).toBeNull()
  })

  it('builds concealed-presence truth with modality layer ahead of scouting layers', () => {
    const caseData = createModalityCase({ hiddenState: 'hidden', tags: ['concealment'] })
    const truth = buildSubjectTruthFromCaseHiddenState(caseData, SCOUTING_INPUT, SUBJECT)

    expect(truth.present).toBe(true)
    expect(truth.concealmentLayers[0]?.id).toBe('layer:concealed-presence')
    expect(truth.concealmentLayers.length).toBeGreaterThan(1)
  })

  it('blocks category on concealed presence until a modality layer is stripped', () => {
    const caseData = createModalityCase({ hiddenState: 'hidden', tags: ['concealment'] })
    const truth = buildSubjectTruthFromCaseHiddenState(caseData, SCOUTING_LOW_CONCEALMENT, SUBJECT)

    const blocked = resolveDetectionScan(truth, { family: 'category_pass' })
    expect(detectionScanTierOrder(blocked)).toEqual(['presence'])
    expect(blocked.fields.some((field) => field.tier === 'category')).toBe(false)

    const peeled = resolveDetectionScan(truth, { family: 'identity_probe', layersToStrip: 1 })
    expect(peeled.strippedLayerIds).toContain('layer:concealed-presence')
    expect(detectionScanTierOrder(peeled)).toContain('category')
  })

  it('projects false-position readouts to decoy locus while retaining canonical identity', () => {
    const caseData = createModalityCase({
      hiddenState: 'displaced',
      displacementTarget: 'sector-east-wing',
    })
    const truth = buildSubjectTruthFromCaseHiddenState(caseData, SCOUTING_LOW_CONCEALMENT, SUBJECT)
    const scan = resolveDetectionScan(truth, { family: 'category_pass' })
    const projected = applyFalsePositionScanProjection(scan, caseData)

    expect(formatDecoyLocusLabel('sector-east-wing')).toBe('decoy locus sector-east-wing')
    expect(projected.fields.find((field) => field.tier === 'category')?.playerFacingValue).toBe(
      'decoy locus sector-east-wing'
    )
    expect(projected.fields.find((field) => field.tier === 'category')?.internalValue).toBe(
      'spectral intruder'
    )

    const identityProbe = applyFalsePositionScanProjection(
      resolveDetectionScan(truth, { family: 'identity_probe', layersToStrip: 1 }),
      caseData
    )
    const identityField = identityProbe.fields.find((field) => field.tier === 'exact_identity')
    expect(identityField?.internalValue).toBe('entity:chapel-wraith')
    expect(identityField?.playerFacingValue).toBe('entity:chapel-wraith')
  })

  it('strips the outer modality layer on category_pass when counter-detection is active', () => {
    const caseData = createModalityCase({
      hiddenState: 'hidden',
      counterDetection: true,
      tags: ['concealment'],
    })
    const truth = buildSubjectTruthFromCaseHiddenState(caseData, SCOUTING_LOW_CONCEALMENT, SUBJECT)
    const scanInput = scoutingOutcomeToDetectionScanForCase(
      { outcome: 'success', revealed: true, withheld: false },
      caseData
    )

    expect(scanInput).toEqual({ family: 'category_pass', layersToStrip: 1 })

    const scan = resolveDetectionScan(truth, scanInput)
    expect(scan.strippedLayerIds).toEqual(['layer:concealed-presence'])
    expect(detectionScanTierOrder(scan)).toContain('category')
  })

  it('strips only the outer modality layer when counter-detection is active', () => {
    const caseData = createModalityCase({
      hiddenState: 'hidden',
      counterDetection: true,
      tags: ['concealment'],
    })
    const truth = buildSubjectTruthFromCaseHiddenState(caseData, SCOUTING_INPUT, SUBJECT)
    const scanInput = scoutingOutcomeToDetectionScanForCase(
      { outcome: 'strong', revealed: true, withheld: false },
      caseData
    )

    expect(scanInput).toEqual({ family: 'identity_probe', layersToStrip: 1 })

    const scan = resolveDetectionScan(truth, scanInput)
    expect(scan.strippedLayerIds).toEqual(['layer:concealed-presence'])
    expect(scan.remainingConcealmentLayers.some((layer) => layer.id === 'layer:glamour')).toBe(true)
    expect(detectionScanTierOrder(scan)).not.toContain('exact_identity')
  })

  it('produces distinct detection scans across the three modalities in one compose path', () => {
    const concealed = resolveScoutingWithCaseHiddenState({
      ...SCOUTING_LOW_CONCEALMENT,
      subject: SUBJECT,
      caseData: createModalityCase({ hiddenState: 'hidden', tags: ['concealment'] }),
    })
    const displaced = resolveScoutingWithCaseHiddenState({
      ...SCOUTING_LOW_CONCEALMENT,
      subject: SUBJECT,
      caseData: createModalityCase({
        hiddenState: 'displaced',
        displacementTarget: 'loading-dock',
      }),
    })
    const disguised = resolveScoutingWithCaseHiddenState({
      ...SCOUTING_LOW_CONCEALMENT,
      subject: SUBJECT,
      caseData: createModalityCase({
        hiddenState: 'hidden',
        tags: ['infiltration', 'concealment'],
        infiltrationAwareness: 0,
        infiltrationCoverProfile: { claimedRole: 'courier', documentTier: 2 },
      }),
    })

    expect(concealed.outcome).toBe('strong')
    expect(displaced.outcome).toBe('strong')
    expect(disguised.outcome).toBe('strong')

    expect(concealed.detectionScan.strippedLayerIds).toEqual(['layer:concealed-presence'])
    expect(displaced.detectionScan.strippedLayerIds).toEqual(['layer:false-position'])
    expect(disguised.detectionScan.strippedLayerIds).toEqual(['layer:disguised-identity'])

    expect(
      displaced.detectionScan.fields.find((field) => field.tier === 'category')?.playerFacingValue
    ).toContain('decoy locus loading-dock')
    expect(
      disguised.detectionScan.fields.find((field) => field.tier === 'category')?.playerFacingValue
    ).toContain('courier cover')
    expect(
      concealed.detectionScan.fields.find((field) => field.tier === 'category')?.playerFacingValue
    ).toBe('spectral intruder')
  })

  it('projects signature-mask category skew while blocking exact identity', () => {
    const caseData = createModalityCase({
      hiddenState: 'hidden',
      tags: [MODALITY_SIGNATURE_MASK_TAG],
    })
    const truth = buildSubjectTruthFromCaseHiddenState(caseData, SCOUTING_LOW_CONCEALMENT, SUBJECT)
    const scan = applySignatureMaskScanProjection(
      resolveDetectionScan(truth, { family: 'category_pass' })
    )

    expect(scan.fields.find((field) => field.tier === 'category')?.playerFacingValue).toBe(
      SIGNATURE_MASK_CATEGORY_SKEW
    )
    expect(scan.fields.find((field) => field.tier === 'category')?.internalValue).toBe(
      'spectral intruder'
    )
    expect(detectionScanTierOrder(scan)).not.toContain('exact_identity')
  })

  it('strips signature-masking layer on counter-detection without solving rating layers', () => {
    const caseData = createModalityCase({
      hiddenState: 'hidden',
      counterDetection: true,
      tags: [MODALITY_SIGNATURE_MASK_TAG],
    })
    const truth = buildSubjectTruthFromCaseHiddenState(caseData, SCOUTING_INPUT, SUBJECT)
    const scanInput = scoutingOutcomeToDetectionScanForCase(
      { outcome: 'strong', revealed: true, withheld: false },
      caseData
    )

    expect(scanInput).toEqual({ family: 'identity_probe', layersToStrip: 1 })

    const scan = resolveDetectionScan(truth, scanInput)
    expect(scan.strippedLayerIds).toEqual(['layer:authored-signature-mask'])
    expect(scan.remainingConcealmentLayers.some((layer) => layer.id === 'layer:glamour')).toBe(true)
    expect(scan.remainingConcealmentLayers.some((layer) => layer.id === 'layer:signature-mask')).toBe(
      true
    )
    expect(detectionScanTierOrder(scan)).not.toContain('exact_identity')
  })

  it('preserves rating-derived signature mask when authored modality layer is stripped', () => {
    const caseData = createModalityCase({
      hiddenState: 'hidden',
      counterDetection: true,
      tags: [MODALITY_SIGNATURE_MASK_TAG],
    })
    const truth = buildSubjectTruthFromCaseHiddenState(caseData, SCOUTING_INPUT, SUBJECT)

    expect(truth.concealmentLayers.map((layer) => layer.id)).toEqual([
      'layer:authored-signature-mask',
      'layer:glamour',
      'layer:signature-mask',
    ])

    const scan = resolveDetectionScan(truth, { family: 'identity_probe', layersToStrip: 1 })
    expect(scan.strippedLayerIds).toEqual(['layer:authored-signature-mask'])
    expect(scan.remainingConcealmentLayers.map((layer) => layer.id)).toEqual([
      'layer:glamour',
      'layer:signature-mask',
    ])
    expect(detectionScanTierOrder(scan)).not.toContain('exact_identity')
  })

  it('maps signature masking to authored layer distinct from rating sig-mask', () => {
    expect(hiddenStateModalityLayer('signature_masking')?.id).toBe('layer:authored-signature-mask')
  })

  it('projects false-detection fabricated readouts while preserving internal truth', () => {
    const caseData = createModalityCase({
      hiddenState: 'hidden',
      tags: [MODALITY_FALSE_DETECTION_TAG],
    })
    const truth = buildSubjectTruthFromCaseHiddenState(caseData, SCOUTING_LOW_CONCEALMENT, SUBJECT)
    const scan = applyFalseDetectionScanProjection(
      resolveDetectionScan(truth, { family: 'category_pass' })
    )

    expect(scan.fields.find((field) => field.tier === 'presence')?.playerFacingValue).toBe(
      FALSE_DETECTION_FABRICATED_PRESENCE
    )
    expect(scan.fields.find((field) => field.tier === 'category')?.playerFacingValue).toBe(
      FALSE_DETECTION_FABRICATED_CATEGORY
    )
    expect(scan.fields.find((field) => field.tier === 'category')?.internalValue).toBe(
      'spectral intruder'
    )
    expect(detectionScanTierOrder(scan)).not.toContain('exact_identity')
  })

  it('strips false-detection layer on counter-detection without solving rating layers', () => {
    const caseData = createModalityCase({
      hiddenState: 'hidden',
      counterDetection: true,
      tags: [MODALITY_FALSE_DETECTION_TAG],
    })
    const truth = buildSubjectTruthFromCaseHiddenState(caseData, SCOUTING_INPUT, SUBJECT)
    const scanInput = scoutingOutcomeToDetectionScanForCase(
      { outcome: 'strong', revealed: true, withheld: false },
      caseData
    )

    expect(scanInput).toEqual({ family: 'identity_probe', layersToStrip: 1 })

    const scan = resolveDetectionScan(truth, scanInput)
    expect(scan.strippedLayerIds).toEqual(['layer:authored-false-detection'])
    expect(scan.remainingConcealmentLayers.some((layer) => layer.id === 'layer:glamour')).toBe(true)
    expect(detectionScanTierOrder(scan)).not.toContain('exact_identity')
  })

  it('includes false-detection output in distinct modality compose path', () => {
    const falseDetection = resolveScoutingWithCaseHiddenState({
      ...SCOUTING_LOW_CONCEALMENT,
      subject: SUBJECT,
      caseData: createModalityCase({
        hiddenState: 'hidden',
        tags: [MODALITY_FALSE_DETECTION_TAG],
      }),
    })
    const concealed = resolveScoutingWithCaseHiddenState({
      ...SCOUTING_LOW_CONCEALMENT,
      subject: SUBJECT,
      caseData: createModalityCase({ hiddenState: 'hidden', tags: ['concealment'] }),
    })
    const signatureMasked = resolveScoutingWithCaseHiddenState({
      ...SCOUTING_LOW_CONCEALMENT,
      subject: SUBJECT,
      caseData: createModalityCase({
        hiddenState: 'hidden',
        tags: [MODALITY_SIGNATURE_MASK_TAG],
      }),
    })

    expect(falseDetection.detectionScan.strippedLayerIds).toEqual(['layer:authored-false-detection'])
    expect(
      falseDetection.detectionScan.fields.find((field) => field.tier === 'category')
        ?.playerFacingValue
    ).toBe(FALSE_DETECTION_FABRICATED_CATEGORY)
    expect(
      concealed.detectionScan.fields.find((field) => field.tier === 'category')?.playerFacingValue
    ).toBe('spectral intruder')
    expect(
      signatureMasked.detectionScan.fields.find((field) => field.tier === 'category')
        ?.playerFacingValue
    ).toBe(SIGNATURE_MASK_CATEGORY_SKEW)
  })

  it('includes signature masking in distinct modality compose path', () => {
    const signatureMasked = resolveScoutingWithCaseHiddenState({
      ...SCOUTING_LOW_CONCEALMENT,
      subject: SUBJECT,
      caseData: createModalityCase({
        hiddenState: 'hidden',
        tags: [MODALITY_SIGNATURE_MASK_TAG],
      }),
    })

    expect(signatureMasked.detectionScan.strippedLayerIds).toEqual(['layer:authored-signature-mask'])
    expect(
      signatureMasked.detectionScan.fields.find((field) => field.tier === 'category')
        ?.playerFacingValue
    ).toBe(SIGNATURE_MASK_CATEGORY_SKEW)
  })

  it('projects glamour-overlay presentation skew while blocking deeper tiers until stripped', () => {
    const caseData = createModalityCase({
      hiddenState: 'hidden',
      tags: [MODALITY_GLAMOUR_TAG],
    })
    const truth = buildSubjectTruthFromCaseHiddenState(caseData, SCOUTING_LOW_CONCEALMENT, SUBJECT)
    const blocked = resolveDetectionScan(truth, { family: 'category_pass' })

    expect(detectionScanTierOrder(blocked)).toEqual(['presence'])
    expect(blocked.fields.some((field) => field.tier === 'category')).toBe(false)

    const blockedProbe = resolveDetectionScan(truth, { family: 'identity_probe' })
    expect(detectionScanTierOrder(blockedProbe)).toEqual(['presence', 'concealment_depth'])
    expect(blockedProbe.fields.some((field) => field.tier === 'category')).toBe(false)
    expect(blockedProbe.fields.some((field) => field.tier === 'hostility')).toBe(false)
    expect(blockedProbe.fields.some((field) => field.tier === 'exact_identity')).toBe(false)

    const scan = applyGlamourOverlayScanProjection(
      resolveDetectionScan(truth, { family: 'identity_probe', layersToStrip: 1 })
    )

    expect(scan.fields.find((field) => field.tier === 'category')?.playerFacingValue).toBe(
      GLAMOUR_OVERLAY_CATEGORY_SKEW
    )
    expect(scan.fields.find((field) => field.tier === 'category')?.internalValue).toBe(
      'spectral intruder'
    )
    expect(scan.fields.find((field) => field.tier === 'hostility')?.playerFacingValue).toBe(
      GLAMOUR_OVERLAY_HOSTILITY_SKEW
    )
    expect(scan.fields.find((field) => field.tier === 'hostility')?.internalValue).toBe('latent')
    expect(scan.strippedLayerIds).toEqual(['layer:authored-glamour'])
  })

  it('strips glamour-overlay layer on counter-detection without solving rating layers', () => {
    const caseData = createModalityCase({
      hiddenState: 'hidden',
      counterDetection: true,
      tags: [MODALITY_GLAMOUR_TAG],
    })
    const truth = buildSubjectTruthFromCaseHiddenState(caseData, SCOUTING_INPUT, SUBJECT)
    const scanInput = scoutingOutcomeToDetectionScanForCase(
      { outcome: 'strong', revealed: true, withheld: false },
      caseData
    )

    expect(scanInput).toEqual({ family: 'identity_probe', layersToStrip: 1 })

    const scan = resolveDetectionScan(truth, scanInput)
    expect(scan.strippedLayerIds).toEqual(['layer:authored-glamour'])
    expect(scan.remainingConcealmentLayers.some((layer) => layer.id === 'layer:glamour')).toBe(true)
    expect(detectionScanTierOrder(scan)).not.toContain('exact_identity')
  })

  it('preserves rating-derived glamour when authored glamour layer is stripped', () => {
    const caseData = createModalityCase({
      hiddenState: 'hidden',
      counterDetection: true,
      tags: [MODALITY_GLAMOUR_TAG],
    })
    const truth = buildSubjectTruthFromCaseHiddenState(caseData, SCOUTING_INPUT, SUBJECT)

    expect(truth.concealmentLayers.map((layer) => layer.id)).toEqual([
      'layer:authored-glamour',
      'layer:glamour',
      'layer:signature-mask',
    ])

    const scan = resolveDetectionScan(truth, { family: 'identity_probe', layersToStrip: 1 })
    expect(scan.strippedLayerIds).toEqual(['layer:authored-glamour'])
    expect(scan.remainingConcealmentLayers.map((layer) => layer.id)).toEqual([
      'layer:glamour',
      'layer:signature-mask',
    ])
    expect(detectionScanTierOrder(scan)).not.toContain('exact_identity')
  })

  it('includes glamour overlay in distinct modality compose path', () => {
    const glamourOverlay = resolveScoutingWithCaseHiddenState({
      ...SCOUTING_LOW_CONCEALMENT,
      subject: SUBJECT,
      caseData: createModalityCase({
        hiddenState: 'hidden',
        tags: [MODALITY_GLAMOUR_TAG],
      }),
    })
    const signatureMasked = resolveScoutingWithCaseHiddenState({
      ...SCOUTING_LOW_CONCEALMENT,
      subject: SUBJECT,
      caseData: createModalityCase({
        hiddenState: 'hidden',
        tags: [MODALITY_SIGNATURE_MASK_TAG],
      }),
    })
    const falseDetection = resolveScoutingWithCaseHiddenState({
      ...SCOUTING_LOW_CONCEALMENT,
      subject: SUBJECT,
      caseData: createModalityCase({
        hiddenState: 'hidden',
        tags: [MODALITY_FALSE_DETECTION_TAG],
      }),
    })

    expect(glamourOverlay.detectionScan.strippedLayerIds).toEqual(['layer:authored-glamour'])
    expect(
      glamourOverlay.detectionScan.fields.find((field) => field.tier === 'category')?.playerFacingValue
    ).toBe(GLAMOUR_OVERLAY_CATEGORY_SKEW)
    expect(
      glamourOverlay.detectionScan.fields.find((field) => field.tier === 'hostility')?.playerFacingValue
    ).toBe(GLAMOUR_OVERLAY_HOSTILITY_SKEW)
    expect(
      signatureMasked.detectionScan.fields.find((field) => field.tier === 'category')?.playerFacingValue
    ).toBe(SIGNATURE_MASK_CATEGORY_SKEW)
    expect(
      falseDetection.detectionScan.fields.find((field) => field.tier === 'category')?.playerFacingValue
    ).toBe(FALSE_DETECTION_FABRICATED_CATEGORY)
  })

  it('preserves rating-derived glamour layer when modality tag absent', () => {
    const caseData = createModalityCase({ hiddenState: 'hidden', tags: ['concealment'] })
    const truth = buildSubjectTruthFromCaseHiddenState(caseData, SCOUTING_INPUT, SUBJECT)

    expect(truth.concealmentLayers.some((layer) => layer.id === 'layer:glamour')).toBe(true)
    expect(truth.concealmentLayers.some((layer) => layer.id === 'layer:authored-glamour')).toBe(
      false
    )
  })

  it('withholds presence when out-of-phase route is misaligned', () => {
    const caseData = createModalityCase({
      hiddenState: 'hidden',
      tags: [MODALITY_OUT_OF_PHASE_TAG],
      route: 'ritual-corridor-alpha',
    })
    const truth = buildSubjectTruthFromCaseHiddenState(caseData, SCOUTING_INPUT, SUBJECT)

    expect(truth.present).toBe(false)
    expect(truth.concealmentLayers[0]?.id).toBe('layer:authored-out-of-phase')
  })

  it('keeps presence when out-of-phase route or frequency is aligned', () => {
    const caseData = createModalityCase({
      hiddenState: 'hidden',
      tags: [MODALITY_OUT_OF_PHASE_TAG],
      route: 'ritual-corridor-alpha',
    })
    const truth = buildSubjectTruthFromCaseHiddenState(
      caseData,
      { ...SCOUTING_INPUT, teamTags: ['ritual-corridor-alpha'] },
      SUBJECT
    )

    expect(truth.present).toBe(true)
    expect(isOutOfPhasePresenceAligned(caseData, [LIMINAL_FREQUENCY_TAG])).toBe(true)
  })

  it('projects out-of-phase readouts for misaligned and aligned presence', () => {
    const caseData = createModalityCase({
      hiddenState: 'hidden',
      tags: [MODALITY_OUT_OF_PHASE_TAG],
      route: 'ritual-corridor-alpha',
    })
    const misalignedTruth = buildSubjectTruthFromCaseHiddenState(
      caseData,
      SCOUTING_LOW_CONCEALMENT,
      SUBJECT
    )
    const misalignedScan = applyOutOfPhaseScanProjection(
      resolveDetectionScan(misalignedTruth, { family: 'presence_sweep' }),
      caseData,
      SCOUTING_LOW_CONCEALMENT.teamTags
    )

    expect(
      misalignedScan.fields.find((field) => field.tier === 'presence')?.playerFacingValue
    ).toBe(OUT_OF_PHASE_ABSENT_ROUTE_SKEW)

    const alignedTruth = buildSubjectTruthFromCaseHiddenState(
      caseData,
      { ...SCOUTING_LOW_CONCEALMENT, teamTags: [LIMINAL_FREQUENCY_TAG] },
      SUBJECT
    )
    const alignedScan = applyOutOfPhaseScanProjection(
      resolveDetectionScan(alignedTruth, { family: 'category_pass' }),
      caseData,
      [LIMINAL_FREQUENCY_TAG]
    )

    expect(
      alignedScan.fields.find((field) => field.tier === 'presence')?.playerFacingValue
    ).toBe(OUT_OF_PHASE_PARTIAL_PRESENCE_SKEW)
    expect(alignedScan.fields.some((field) => field.tier === 'category')).toBe(false)
  })

  it('strips out-of-phase layer on counter-detection without solving other families', () => {
    const caseData = createModalityCase({
      hiddenState: 'hidden',
      counterDetection: true,
      tags: [MODALITY_OUT_OF_PHASE_TAG],
      route: 'ritual-corridor-alpha',
    })
    const truth = buildSubjectTruthFromCaseHiddenState(
      caseData,
      { ...SCOUTING_INPUT, teamTags: [LIMINAL_FREQUENCY_TAG] },
      SUBJECT
    )
    const scanInput = scoutingOutcomeToDetectionScanForCase(
      { outcome: 'strong', revealed: true, withheld: false },
      caseData
    )

    const scan = resolveDetectionScan(truth, scanInput)
    expect(scan.strippedLayerIds).toEqual(['layer:authored-out-of-phase'])
    expect(detectionScanTierOrder(scan)).not.toContain('exact_identity')
  })

  it('applies route-caution score adjustment when out-of-phase presence is misaligned', () => {
    const caseData = createModalityCase({
      hiddenState: 'hidden',
      tags: [MODALITY_OUT_OF_PHASE_TAG],
      route: 'ritual-corridor-alpha',
    })

    expect(outOfPhaseScoutingScoreAdjustment(caseData, SCOUTING_INPUT.teamTags).delta).toBe(0.25)
    expect(outOfPhaseScoutingScoreAdjustment(caseData, SCOUTING_INPUT.teamTags).reason).toContain(
      'route caution'
    )
    expect(
      outOfPhaseScoutingScoreAdjustment(caseData, [LIMINAL_FREQUENCY_TAG]).delta
    ).toBe(0)
  })

  it('suppresses route-caution score when alignment comes from agent tags only', () => {
    const caseData = createModalityCase({
      hiddenState: 'hidden',
      tags: [MODALITY_OUT_OF_PHASE_TAG],
      route: 'ritual-corridor-alpha',
    })

    expect(outOfPhaseScoutingScoreAdjustment(caseData, []).delta).toBe(0.25)
    expect(outOfPhaseScoutingScoreAdjustment(caseData, [LIMINAL_FREQUENCY_TAG]).delta).toBe(0)
  })

  it('projects anti-scan readouts for misaligned and aligned bypass', () => {
    const caseData = createModalityCase({
      hiddenState: 'hidden',
      tags: [MODALITY_ANTI_SCAN_TAG],
      compartment: 'warded-volume-alpha',
    })
    const misalignedTruth = buildSubjectTruthFromCaseHiddenState(
      caseData,
      SCOUTING_LOW_CONCEALMENT,
      SUBJECT
    )
    const misalignedScan = applyAntiScanCompartmentScanProjection(
      resolveDetectionScan(misalignedTruth, { family: 'presence_sweep' }),
      caseData,
      SCOUTING_LOW_CONCEALMENT.teamTags
    )

    expect(misalignedTruth.present).toBe(true)
    expect(
      misalignedScan.fields.find((field) => field.tier === 'presence')?.playerFacingValue
    ).toBe(ANTI_SCAN_DEGRADED_PRESENCE_SKEW)

    const alignedTruth = buildSubjectTruthFromCaseHiddenState(
      caseData,
      { ...SCOUTING_LOW_CONCEALMENT, teamTags: [SCAN_BYPASS_TAG] },
      SUBJECT
    )
    const alignedScan = applyAntiScanCompartmentScanProjection(
      resolveDetectionScan(alignedTruth, { family: 'category_pass' }),
      caseData,
      [SCAN_BYPASS_TAG]
    )

    expect(
      alignedScan.fields.find((field) => field.tier === 'presence')?.playerFacingValue
    ).toBe(ANTI_SCAN_PARTIAL_PRESENCE_SKEW)
    expect(isAntiScanCompartmentAligned(caseData, [EM_SWEEP_TAG])).toBe(true)
    expect(
      isAntiScanCompartmentAligned(caseData, ['warded-volume-alpha'])
    ).toBe(true)
  })

  it('strips anti-scan layer on counter-detection without solving other families', () => {
    const caseData = createModalityCase({
      hiddenState: 'hidden',
      counterDetection: true,
      tags: [MODALITY_ANTI_SCAN_TAG],
      compartment: 'warded-volume-alpha',
    })
    const truth = buildSubjectTruthFromCaseHiddenState(
      caseData,
      { ...SCOUTING_INPUT, teamTags: [SCAN_BYPASS_TAG] },
      SUBJECT
    )
    const scanInput = scoutingOutcomeToDetectionScanForCase(
      { outcome: 'strong', revealed: true, withheld: false },
      caseData
    )

    const scan = resolveDetectionScan(truth, scanInput)
    expect(scan.strippedLayerIds).toEqual(['layer:authored-anti-scan'])
  })

  it('applies scan-caution score adjustment when anti-scan bypass is misaligned', () => {
    const caseData = createModalityCase({
      hiddenState: 'hidden',
      tags: [MODALITY_ANTI_SCAN_TAG],
      compartment: 'warded-volume-alpha',
    })

    expect(antiScanCompartmentScoutingScoreAdjustment(caseData, SCOUTING_INPUT.teamTags).delta).toBe(
      0.3
    )
    expect(
      antiScanCompartmentScoutingScoreAdjustment(caseData, SCOUTING_INPUT.teamTags).reason
    ).toContain('scan caution')
    expect(antiScanCompartmentScoutingScoreAdjustment(caseData, [SCAN_BYPASS_TAG]).delta).toBe(0)
  })

  it('includes anti-scan compartment in distinct modality compose path', () => {
    const antiScan = resolveScoutingWithCaseHiddenState({
      ...SCOUTING_LOW_CONCEALMENT,
      subject: SUBJECT,
      caseData: createModalityCase({
        hiddenState: 'hidden',
        tags: [MODALITY_ANTI_SCAN_TAG],
        compartment: 'warded-volume-alpha',
      }),
    })
    const outOfPhase = resolveScoutingWithCaseHiddenState({
      ...SCOUTING_LOW_CONCEALMENT,
      subject: SUBJECT,
      caseData: createModalityCase({
        hiddenState: 'hidden',
        tags: [MODALITY_OUT_OF_PHASE_TAG],
        route: 'ritual-corridor-alpha',
      }),
    })

    expect(
      antiScan.detectionScan.fields.find((field) => field.tier === 'presence')?.playerFacingValue
    ).toBe(ANTI_SCAN_DEGRADED_PRESENCE_SKEW)
    const antiScanTruth = buildSubjectTruthFromCaseHiddenState(
      createModalityCase({
        hiddenState: 'hidden',
        tags: [MODALITY_ANTI_SCAN_TAG],
        compartment: 'warded-volume-alpha',
      }),
      SCOUTING_LOW_CONCEALMENT,
      SUBJECT
    )
    expect(
      antiScanTruth.concealmentLayers.some((layer) => layer.id === 'layer:authored-anti-scan')
    ).toBe(true)
    expect(
      outOfPhase.detectionScan.fields.find((field) => field.tier === 'presence')?.playerFacingValue
    ).toBe(OUT_OF_PHASE_ABSENT_ROUTE_SKEW)
  })

  it('includes out-of-phase presence in distinct modality compose path', () => {
    const outOfPhase = resolveScoutingWithCaseHiddenState({
      ...SCOUTING_LOW_CONCEALMENT,
      subject: SUBJECT,
      caseData: createModalityCase({
        hiddenState: 'hidden',
        tags: [MODALITY_OUT_OF_PHASE_TAG],
        route: 'ritual-corridor-alpha',
      }),
    })
    const glamourOverlay = resolveScoutingWithCaseHiddenState({
      ...SCOUTING_LOW_CONCEALMENT,
      subject: SUBJECT,
      caseData: createModalityCase({
        hiddenState: 'hidden',
        tags: [MODALITY_GLAMOUR_TAG],
      }),
    })

    expect(
      outOfPhase.detectionScan.fields.find((field) => field.tier === 'presence')?.playerFacingValue
    ).toBe(OUT_OF_PHASE_ABSENT_ROUTE_SKEW)
    expect(
      outOfPhase.detectionScan.remainingConcealmentLayers.some(
        (layer) => layer.id === 'layer:authored-out-of-phase'
      )
    ).toBe(true)
    expect(
      glamourOverlay.detectionScan.fields.find((field) => field.tier === 'category')?.playerFacingValue
    ).toBe(GLAMOUR_OVERLAY_CATEGORY_SKEW)
  })

  it('preserves legacy scouting fields while attaching modality-aware detection scans', () => {
    const input = {
      ...SCOUTING_INPUT,
      subject: SUBJECT,
      caseData: createModalityCase({
        hiddenState: 'hidden',
        tags: ['concealment'],
      }),
    }

    const legacy = resolveScouting(input)
    const integrated = resolveScoutingWithCaseHiddenState(input)

    expect(integrated.outcome).toBe(legacy.outcome)
    expect(integrated.revealed).toBe(legacy.revealed)
    expect(integrated.withheld).toBe(legacy.withheld)
    expect(integrated.value).toBe(legacy.value)
  })
})
