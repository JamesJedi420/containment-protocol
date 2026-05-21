import { describe, expect, it } from 'vitest'
import {
  appendDetectionScanResolutionReason,
  DETECTION_SCAN_READOUT_PREFIX,
  formatDetectionScanSummary,
  shouldAppendDetectionScanReportNote,
} from '../domain/detectionScanReportNotes'
import { resolveDetectionScan, type SubjectTruthState } from '../domain/revealPayload'
import {
  buildDisguiseRevealSubjectFromCase,
  evaluateBehaviorWeightedDisguiseValidationWithRevealPayload,
} from '../domain/revealPayloadDisguiseIntegration'
import { createStarterCase } from '../domain/templates/startingCases'
import type { Agent } from '../domain/models'

function buildSubject(overrides: Partial<SubjectTruthState> = {}): SubjectTruthState {
  return {
    present: true,
    exactIdentity: 'entity:case-scan-copy',
    category: 'concealed contact',
    hostility: 'latent',
    activeProtections: [],
    concealmentLayers: [
      {
        id: 'layer:mask',
        blockedTiers: ['exact_identity'],
      },
    ],
    activeEffects: [],
    dormantEffects: [],
    ...overrides,
  }
}

describe('detectionScanReportNotes', () => {
  it('formats ordered tier values into a detection readout line', () => {
    const scan = resolveDetectionScan(buildSubject(), { family: 'category_pass' })

    expect(formatDetectionScanSummary(scan)).toBe(
      `${DETECTION_SCAN_READOUT_PREFIX} contact detected; unclassified contact.`
    )
  })

  it('appends counter-detection peel suffix when layers were stripped', () => {
    const scan = resolveDetectionScan(buildSubject(), {
      family: 'identity_probe',
      layersToStrip: 1,
    })

    expect(formatDetectionScanSummary(scan)).toContain('Counter-detection stripped 1 concealment layer.')
    expect(formatDetectionScanSummary(scan)).toContain('entity:case-scan-copy')
  })

  it('returns false when validation is inactive', () => {
    const scan = resolveDetectionScan(buildSubject({ present: false }), { family: 'presence_sweep' })

    expect(
      shouldAppendDetectionScanReportNote({
        active: false,
        detectionScan: scan,
      })
    ).toBe(false)
  })

  it('allows active scans with informational presence readouts', () => {
    const scan = resolveDetectionScan(buildSubject(), { family: 'presence_sweep' })

    expect(
      shouldAppendDetectionScanReportNote({
        active: true,
        detectionScan: scan,
      })
    ).toBe(true)
  })

  it('returns false for active validation with presence-only absent contact', () => {
    const scan = resolveDetectionScan(buildSubject({ present: false }), { family: 'presence_sweep' })

    expect(
      shouldAppendDetectionScanReportNote({
        active: true,
        detectionScan: scan,
      })
    ).toBe(false)
  })

  it('does not append when validation is inactive', () => {
    const scan = resolveDetectionScan(buildSubject({ present: false }), { family: 'presence_sweep' })
    const reasons: string[] = []

    appendDetectionScanResolutionReason(reasons, {
      active: false,
      level: 'none',
      scoreAdjustment: 0,
      evidenceSignals: [],
      counterDetection: false,
      shouldDegradeSuccessToPartial: false,
      detectionScan: scan,
    })

    expect(reasons).toHaveLength(0)
  })

  it('does not append a readout prefix-only line when tier values are empty', () => {
    expect(formatDetectionScanSummary({ fields: [], remainingConcealmentLayers: [], strippedLayerIds: [] })).toBe(
      ''
    )
  })

  it('does not append duplicate detection readout lines', () => {
    const scan = resolveDetectionScan(buildSubject(), { family: 'category_pass' })
    const reasons: string[] = []

    appendDetectionScanResolutionReason(reasons, {
      active: true,
      level: 'strong',
      scoreAdjustment: 0,
      evidenceSignals: [],
      counterDetection: false,
      shouldDegradeSuccessToPartial: false,
      detectionScan: scan,
    })
    appendDetectionScanResolutionReason(reasons, {
      active: true,
      level: 'strong',
      scoreAdjustment: 0,
      evidenceSignals: [],
      counterDetection: false,
      shouldDegradeSuccessToPartial: false,
      detectionScan: scan,
    })

    expect(reasons).toHaveLength(1)
  })

  it('appendDetectionScanResolutionReason pushes a formatted line', () => {
    const agent: Agent = {
      id: 'a_scan_copy',
      name: 'a_scan_copy',
      role: 'medium',
      baseStats: { combat: 10, investigation: 50, utility: 40, social: 70 },
      tags: ['medium', 'liaison', 'negotiation'],
      relationships: {},
      fatigue: 0,
      status: 'active',
    }
    const caseData = {
      ...createStarterCase({ id: 'case-scan-copy', templateId: 'ops-004' }),
      hiddenState: 'hidden' as const,
      detectionConfidence: 0.2,
      counterDetection: false,
      tags: ['public'],
      requiredTags: ['medium'],
      preferredTags: [],
      assignedTeamIds: ['team-scan'],
      weights: { combat: 0, investigation: 0, utility: 0, social: 1 },
      difficulty: { combat: 0, investigation: 0, utility: 0, social: 40 },
    }
    const validation = evaluateBehaviorWeightedDisguiseValidationWithRevealPayload({
      caseData,
      agents: [agent],
      subject: buildDisguiseRevealSubjectFromCase(caseData),
      context: { teamTags: [], supportTags: [] },
    })

    const reasons: string[] = []
    appendDetectionScanResolutionReason(reasons, validation)

    expect(reasons).toHaveLength(1)
    expect(reasons[0]).toContain(DETECTION_SCAN_READOUT_PREFIX)
    expect(reasons[0]).toContain('contact detected')
  })
})
