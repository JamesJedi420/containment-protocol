import { describe, expect, it } from 'vitest'
import {
  applyFalsePositionScanProjection,
  buildSubjectTruthFromCaseHiddenState,
  formatDecoyLocusLabel,
  hiddenStateModalityLayer,
  resolveHiddenStateModality,
  scoutingOutcomeToDetectionScanForCase,
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
