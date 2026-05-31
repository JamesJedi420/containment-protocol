import { describe, expect, it } from 'vitest'
import {
  appendDetectionScanResolutionReason,
  appendModalityTellResolutionReason,
  CONCEALMENT_SCAN_READOUT_PREFIX,
  CONCEALMENT_TELL_READOUT_PREFIX,
  COVER_SCAN_READOUT_PREFIX,
  DETECTION_SCAN_READOUT_PREFIX,
  detectionScanReadoutPrefixForModality,
  DISPLACEMENT_SCAN_READOUT_PREFIX,
  GLAMOUR_SCAN_READOUT_PREFIX,
  formatDetectionScanSummary,
  shouldAppendDetectionScanReportNote,
  shouldAppendModalityTellReportNote,
} from '../domain/detectionScanReportNotes'
import { evaluateHiddenStateModalityTell } from '../domain/hiddenStateModalityTells'
import { TELL_THERMAL_RESIDUAL_TAG } from '../domain/hiddenStateModalityTells'
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

  it('formats modality-specific readout prefixes', () => {
    const scan = resolveDetectionScan(buildSubject(), { family: 'category_pass' })

    expect(
      formatDetectionScanSummary(scan, { prefix: CONCEALMENT_SCAN_READOUT_PREFIX })
    ).toBe(`${CONCEALMENT_SCAN_READOUT_PREFIX} contact detected; unclassified contact.`)

    expect(
      formatDetectionScanSummary(scan, { prefix: DISPLACEMENT_SCAN_READOUT_PREFIX })
    ).toContain(DISPLACEMENT_SCAN_READOUT_PREFIX)

    expect(detectionScanReadoutPrefixForModality('concealed_presence')).toBe(
      CONCEALMENT_SCAN_READOUT_PREFIX
    )
    expect(detectionScanReadoutPrefixForModality('false_position')).toBe(
      DISPLACEMENT_SCAN_READOUT_PREFIX
    )
    expect(detectionScanReadoutPrefixForModality('disguised_identity')).toBe(COVER_SCAN_READOUT_PREFIX)
    expect(detectionScanReadoutPrefixForModality('glamour_overlay')).toBe(GLAMOUR_SCAN_READOUT_PREFIX)
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

  it('does not append a second readout when a modality prefix line already exists', () => {
    const scan = resolveDetectionScan(buildSubject(), { family: 'category_pass' })
    const reasons = [
      `${CONCEALMENT_SCAN_READOUT_PREFIX} contact detected; unclassified contact.`,
    ]

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

  it('appends modality tell readout after scouting copy without duplicate prefixes', () => {
    const caseData = {
      ...createStarterCase({ id: 'case-tell-copy', templateId: 'combat_vampire_nest' }),
      hiddenState: 'hidden' as const,
      detectionConfidence: 0.2,
      counterDetection: false,
      tags: ['concealment', TELL_THERMAL_RESIDUAL_TAG],
      requiredTags: [],
      preferredTags: [],
      assignedTeamIds: ['team-tell'],
      infiltrationCoverProfile: undefined,
      infiltrationProbePlan: undefined,
      weights: { combat: 0, investigation: 0.4, utility: 0, social: 0 },
      difficulty: { combat: 0, investigation: 40, utility: 0, social: 0 },
    }
    const agent: Agent = {
      id: 'a_tell_copy',
      name: 'a_tell_copy',
      role: 'medium',
      baseStats: { combat: 10, investigation: 60, utility: 40, social: 40 },
      tags: ['medium'],
      relationships: {},
      fatigue: 0,
      status: 'active',
    }
    const tell = evaluateHiddenStateModalityTell({
      caseData,
      agents: [agent],
      disguiseValidationActive: false,
    })

    expect(shouldAppendModalityTellReportNote(tell)).toBe(true)

    const reasons: string[] = []
    appendModalityTellResolutionReason(reasons, tell)
    appendModalityTellResolutionReason(reasons, tell)

    expect(reasons).toHaveLength(1)
    expect(reasons[0]).toContain(CONCEALMENT_TELL_READOUT_PREFIX)
  })

  it('appends modality tell when hidden-state scouting scan has no player-facing fields', () => {
    const caseData = {
      ...createStarterCase({ id: 'case-tell-no-scan', templateId: 'combat_vampire_nest' }),
      hiddenState: 'hidden' as const,
      detectionConfidence: 0.2,
      counterDetection: false,
      tags: ['concealment', TELL_THERMAL_RESIDUAL_TAG],
      requiredTags: [],
      preferredTags: [],
      assignedTeamIds: ['team-tell'],
      infiltrationCoverProfile: undefined,
      infiltrationProbePlan: undefined,
      weights: { combat: 0, investigation: 0.4, utility: 0, social: 0 },
      difficulty: { combat: 0, investigation: 40, utility: 0, social: 0 },
    }
    const agent: Agent = {
      id: 'a_tell_no_scan',
      name: 'a_tell_no_scan',
      role: 'medium',
      baseStats: { combat: 10, investigation: 60, utility: 40, social: 40 },
      tags: ['medium'],
      relationships: {},
      fatigue: 0,
      status: 'active',
    }
    const tell = evaluateHiddenStateModalityTell({
      caseData,
      agents: [agent],
      disguiseValidationActive: false,
    })
    const presenceOnlyScan = resolveDetectionScan(
      {
        present: false,
        exactIdentity: 'entity:case-tell-no-scan',
        category: 'concealed presence',
        hostility: 'latent',
        activeProtections: [],
        concealmentLayers: [],
        activeEffects: [],
        dormantEffects: [],
      },
      { family: 'presence_sweep' }
    )
    const reasons: string[] = []

    appendDetectionScanResolutionReason(
      reasons,
      undefined,
      {
        active: true,
        outcome: 'fail',
        revealed: false,
        withheld: true,
        detectionScan: presenceOnlyScan,
      },
      caseData,
      tell
    )

    expect(reasons.some((reason) => reason.includes(CONCEALMENT_TELL_READOUT_PREFIX))).toBe(true)
    expect(reasons.some((reason) => reason.includes(CONCEALMENT_SCAN_READOUT_PREFIX))).toBe(false)
  })
})
