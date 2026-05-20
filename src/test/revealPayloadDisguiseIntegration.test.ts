import { describe, expect, it } from 'vitest'
import { evaluateBehaviorWeightedDisguiseValidation } from '../domain/disguiseValidation'
import {
  buildSubjectTruthFromDisguise,
  detectionScanTierOrder,
  disguiseConcealmentRatingFromCase,
  disguiseValidationToDetectionScan,
  evaluateBehaviorWeightedDisguiseValidationWithRevealPayload,
} from '../domain/revealPayloadDisguiseIntegration'
import type { Agent, CaseInstance } from '../domain/models'
import { createStarterCase } from '../domain/templates/startingCases'

const SUBJECT = {
  exactIdentity: 'entity:covert-briefing',
  category: 'embedded operative',
  activeEffects: ['forged credentials'],
  dormantEffects: ['backup legend'],
  activeProtections: ['document cover'],
} as const

function createBehaviorObserver(id: string, tags: string[], social: number): Agent {
  return {
    id,
    name: id,
    role: 'medium',
    baseStats: {
      combat: 10,
      investigation: 50,
      utility: 40,
      social,
    },
    tags: ['medium', ...tags],
    relationships: {},
    fatigue: 0,
    status: 'active',
  }
}

function createHiddenCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({
      id: 'case-disguise-reveal',
      templateId: 'ops-004',
    }),
    mode: 'threshold',
    hiddenState: 'hidden',
    detectionConfidence: 0.2,
    counterDetection: false,
    tags: ['infiltration', 'public'],
    requiredTags: ['medium'],
    preferredTags: [],
    assignedTeamIds: [],
    weights: { combat: 0, investigation: 0, utility: 0, social: 1 },
    difficulty: { combat: 0, investigation: 0, utility: 0, social: 40 },
    ...overrides,
  }
}

describe('revealPayloadDisguiseIntegration (SPE-781 slice 3)', () => {
  it('maps infiltration awareness and document tier to concealment rating', () => {
    const lowAwareness = createHiddenCase({
      infiltrationAwareness: 0.1,
      infiltrationCoverProfile: { claimedRole: 'courier', documentTier: 2 },
    })
    const highAwarenessWeakDocs = createHiddenCase({
      infiltrationAwareness: 1,
      infiltrationCoverProfile: { claimedRole: 'maintenance', documentTier: 0 },
    })

    expect(disguiseConcealmentRatingFromCase(lowAwareness)).toBe(0)
    expect(disguiseConcealmentRatingFromCase(highAwarenessWeakDocs)).toBe(3)
  })

  it('builds subject truth with disguise concealment layers', () => {
    const caseData = createHiddenCase({
      infiltrationAwareness: 0.9,
      infiltrationCoverProfile: { claimedRole: 'maintenance', documentTier: 0 },
    })
    const truth = buildSubjectTruthFromDisguise(caseData, SUBJECT)

    expect(truth.present).toBe(true)
    expect(truth.exactIdentity).toBe('entity:covert-briefing')
    expect(truth.concealmentLayers).toHaveLength(2)
  })

  it('selects deeper scan families for strong validation than inactive paths', () => {
    expect(
      disguiseValidationToDetectionScan({
        active: false,
        level: 'none',
        counterDetection: false,
      })
    ).toEqual({ family: 'presence_sweep' })

    expect(
      disguiseValidationToDetectionScan({
        active: true,
        level: 'meaningful',
        counterDetection: false,
      })
    ).toEqual({ family: 'category_pass' })

    expect(
      disguiseValidationToDetectionScan({
        active: true,
        level: 'strong',
        counterDetection: true,
      })
    ).toEqual({ family: 'identity_probe', layersToStrip: 1 })
  })

  it('preserves legacy validation fields while attaching tiered detection payloads', () => {
    const observer = createBehaviorObserver('a_disguise_reveal', ['liaison', 'negotiation'], 58)
    const caseData = createHiddenCase({
      infiltrationAwareness: 0.35,
      infiltrationCoverProfile: { claimedRole: 'official_inspector', documentTier: 1 },
    })

    const legacy = evaluateBehaviorWeightedDisguiseValidation(caseData, [observer])
    const integrated = evaluateBehaviorWeightedDisguiseValidationWithRevealPayload({
      caseData,
      agents: [observer],
      subject: SUBJECT,
    })

    expect(integrated.active).toBe(legacy.active)
    expect(integrated.level).toBe(legacy.level)
    expect(integrated.scoreAdjustment).toBe(legacy.scoreAdjustment)
    expect(integrated.detectionConfidence).toBe(legacy.detectionConfidence)
    expect(integrated.counterDetection).toBe(legacy.counterDetection)

    if (integrated.level === 'strong') {
      expect(detectionScanTierOrder(integrated.detectionScan).length).toBeGreaterThan(2)
    } else if (integrated.active) {
      expect(
        integrated.detectionScan.fields.some((field) => field.tier === 'category')
      ).toBe(true)
    } else {
      expect(detectionScanTierOrder(integrated.detectionScan)).toEqual(['presence'])
    }
  })

  it('blocks exact identity on strong counter-detection when two concealment layers remain', () => {
    const observer = createBehaviorObserver('a_disguise_reveal_strong', ['liaison', 'negotiation'], 60)
    const caseData = createHiddenCase({
      infiltrationAwareness: 0.95,
      infiltrationCoverProfile: { claimedRole: 'maintenance', documentTier: 0 },
      counterDetection: true,
    })

    const integrated = evaluateBehaviorWeightedDisguiseValidationWithRevealPayload({
      caseData,
      agents: [observer],
      subject: SUBJECT,
    })

    expect(integrated.level).toBe('strong')
    expect(disguiseValidationToDetectionScan(integrated)).toEqual({
      family: 'identity_probe',
      layersToStrip: 1,
    })
    expect(
      integrated.detectionScan.fields.some((field) => field.tier === 'exact_identity')
    ).toBe(false)
    expect(detectionScanTierOrder(integrated.detectionScan)).toContain('category')
  })

  it('maps active none-level validation to presence-only scans for hidden subjects', () => {
    expect(
      disguiseValidationToDetectionScan({
        active: true,
        level: 'none',
        counterDetection: false,
      })
    ).toEqual({ family: 'presence_sweep' })

    const integrated = evaluateBehaviorWeightedDisguiseValidationWithRevealPayload({
      caseData: createHiddenCase(),
      agents: [],
      subject: SUBJECT,
    })

    expect(integrated.active).toBe(false)
    expect(disguiseValidationToDetectionScan(integrated)).toEqual({ family: 'presence_sweep' })
  })

  it('maps meaningful validation to category scans without exposing exact identity under concealment', () => {
    const observer = createBehaviorObserver('a_partial_proc', ['investigator'], 46)
    const caseData = createHiddenCase({
      tags: ['infiltration', 'witness'],
      weights: { combat: 0, investigation: 1, utility: 0, social: 0 },
      difficulty: { combat: 0, investigation: 40, utility: 0, social: 0 },
      infiltrationAwareness: 0.9,
      infiltrationCoverProfile: { claimedRole: 'maintenance', documentTier: 0 },
    })

    const integrated = evaluateBehaviorWeightedDisguiseValidationWithRevealPayload({
      caseData,
      agents: [observer],
      subject: SUBJECT,
    })

    expect(integrated.level).toBe('meaningful')
    expect(disguiseValidationToDetectionScan(integrated)).toEqual({ family: 'category_pass' })
    expect(
      integrated.detectionScan.fields.some((field) => field.tier === 'exact_identity')
    ).toBe(false)
    expect(integrated.detectionScan.fields[0]?.playerFacingValue).toBe('contact detected')
  })

  it('uses context overrides for concealment rating independent of stored case fields', () => {
    const caseData = createHiddenCase({
      infiltrationAwareness: 0,
      infiltrationCoverProfile: { claimedRole: 'courier', documentTier: 2 },
    })

    expect(disguiseConcealmentRatingFromCase(caseData)).toBe(0)
    expect(disguiseConcealmentRatingFromCase(caseData, { infiltrationAwareness: 1 })).toBe(2)
    expect(
      disguiseConcealmentRatingFromCase(caseData, {
        infiltrationAwareness: 1,
        documentTier: 0,
      })
    ).toBe(3)
  })

  it('treats non-finite awareness as zero concealment contribution', () => {
    const caseData = createHiddenCase({
      infiltrationAwareness: Number.NaN,
      infiltrationCoverProfile: { claimedRole: 'courier', documentTier: 0 },
    })

    expect(disguiseConcealmentRatingFromCase(caseData)).toBe(1)
  })

  it('does not run disguise scans as contact when case is displaced', () => {
    const observer = createBehaviorObserver('a_displaced', ['liaison', 'negotiation'], 60)
    const displacedCase = createHiddenCase({ hiddenState: 'displaced' })

    const integrated = evaluateBehaviorWeightedDisguiseValidationWithRevealPayload({
      caseData: displacedCase,
      agents: [observer],
      subject: SUBJECT,
    })

    expect(integrated.active).toBe(false)
    expect(detectionScanTierOrder(integrated.detectionScan)).toEqual(['presence'])
    expect(integrated.detectionScan.fields[0]?.playerFacingValue).toBe('no contact')
  })

  it('returns presence-only tiers for visible cases even when validation is inactive', () => {
    const observer = createBehaviorObserver('a_visible', ['liaison'], 55)
    const visibleCase = createHiddenCase({ hiddenState: undefined })

    const integrated = evaluateBehaviorWeightedDisguiseValidationWithRevealPayload({
      caseData: visibleCase,
      agents: [observer],
      subject: SUBJECT,
    })

    expect(integrated.active).toBe(false)
    expect(detectionScanTierOrder(integrated.detectionScan)).toEqual(['presence'])
    expect(integrated.detectionScan.fields[0]?.playerFacingValue).toBe('no contact')
  })
})
