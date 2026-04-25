// cspell:words pathfinding
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { createAgent } from '../domain/agent/factory'
import { computeTeamScore } from '../domain/sim/scoring'
import { previewResolutionForTeamIds } from '../domain/sim/resolve'
import { evaluateTeamCaseRecon } from '../domain/recon'
import { resolveMapMetadata } from '../domain/siteGeneration/mapMetadata'
import type { SiteGenerationStageSnapshot } from '../domain/siteGeneration/packets'

describe('field recon systems', () => {
  it('reveals hidden case factors and increases unknown-variable coverage', () => {
    const state = createStartingState()
    const caseData = {
      ...state.cases['case-002'],
      id: 'case-recon',
      mode: 'probability' as const,
      stage: 4,
      tags: ['signal', 'anomaly', 'evidence', 'breach', 'occult'],
      requiredTags: [],
      preferredTags: [],
      assignedTeamIds: ['team-recon'],
    }
    const baselineAgent = createAgent({
      id: 'baseline',
      name: 'Baseline',
      role: 'investigator',
      baseStats: { combat: 40, investigation: 82, utility: 76, social: 28 },
    })
    const reconAgent = createAgent({
      id: 'recon',
      name: 'Recon',
      role: 'field_recon',
      baseStats: { combat: 40, investigation: 82, utility: 76, social: 28 },
      tags: ['recon', 'surveillance', 'pathfinding', 'field-kit'],
      equipmentSlots: {
        secondary: 'anomaly_scanner',
        headgear: 'advanced_recon_suite',
        utility1: 'signal_intercept_kit',
        utility2: 'occult_detection_array',
      },
    })

    const baselineScore = computeTeamScore([baselineAgent], caseData, { config: state.config })
    const reconScore = computeTeamScore([reconAgent], caseData, { config: state.config })

    expect(reconScore.reconSummary.hiddenModifierCount).toBeGreaterThan(0)
    expect(reconScore.reconSummary.revealedModifierCount).toBeGreaterThan(
      baselineScore.reconSummary.revealedModifierCount
    )
    expect(reconScore.reconSummary.unknownVariableCoverage).toBeGreaterThan(
      baselineScore.reconSummary.unknownVariableCoverage
    )
    expect(reconScore.reconSummary.scoreAdjustment).toBeGreaterThan(0)
    expect(reconScore.reasons.some((reason) => reason.startsWith('Recon sweep:'))).toBe(true)
  })

  it('surfaces recon summaries in resolution previews for case assignment surfaces', () => {
    const state = createStartingState()
    const reconAgent = createAgent({
      id: 'recon',
      name: 'Recon',
      role: 'field_recon',
      baseStats: { combat: 42, investigation: 80, utility: 78, social: 30 },
      tags: ['recon', 'surveillance', 'pathfinding', 'field-kit'],
      equipmentSlots: {
        secondary: 'encrypted_field_tablet',
        headgear: 'spectral_em_array',
        utility1: 'signal_intercept_kit',
        utility2: 'environmental_sampler',
      },
    })
    const nextState = {
      ...state,
      agents: {
        ...state.agents,
        recon: reconAgent,
      },
      teams: {
        ...state.teams,
        'team-recon': {
          id: 'team-recon',
          name: 'Recon Team',
          memberIds: ['recon'],
          agentIds: ['recon'],
          leaderId: 'recon',
          tags: ['recon'],
        },
      },
      cases: {
        ...state.cases,
        'case-recon': {
          ...state.cases['case-002'],
          id: 'case-recon',
          mode: 'probability' as const,
          stage: 3,
          tags: ['signal', 'evidence', 'field'],
          requiredTags: [],
          preferredTags: [],
          assignedTeamIds: [],
        },
      },
    }

    const preview = previewResolutionForTeamIds(nextState.cases['case-recon'], nextState, [
      'team-recon',
    ])

    expect(preview.reconSummary).toMatchObject({
      hiddenModifierCount: expect.any(Number),
      revealedModifierCount: expect.any(Number),
    })
    expect(preview.performanceSummary).toBeDefined()
    expect(preview.equipmentSummary).toBeDefined()
  })

  it('treats ingress spatial flags as hidden recon factors', () => {
    const state = createStartingState()
    const baseCase = {
      ...state.cases['case-002'],
      id: 'case-ingress-recon',
      mode: 'probability' as const,
      stage: 3,
      tags: ['signal', 'field'],
      requiredTags: [],
      preferredTags: [],
      assignedTeamIds: ['team-recon'],
    }
    const reconAgent = createAgent({
      id: 'recon',
      name: 'Recon',
      role: 'field_recon',
      baseStats: { combat: 40, investigation: 82, utility: 76, social: 28 },
      tags: ['recon', 'surveillance', 'pathfinding', 'field-kit'],
      equipmentSlots: {
        secondary: 'anomaly_scanner',
        headgear: 'advanced_recon_suite',
        utility1: 'signal_intercept_kit',
      },
    })

    const baselineScore = computeTeamScore([reconAgent], baseCase, { config: state.config })
    const ingressScore = computeTeamScore(
      [reconAgent],
      {
        ...baseCase,
        spatialFlags: ['ingress:maintenance_shaft'],
      },
      { config: state.config }
    )

    expect(ingressScore.reconSummary.hiddenModifierCount).toBeGreaterThan(
      baselineScore.reconSummary.hiddenModifierCount
    )
    expect(ingressScore.reconSummary.reasons.join(' ')).toMatch(/shaft|ingress|recon/i)
  })
})

// ─── mapLayer consumer tests ──────────────────────────────────────────────────

function makeReconStages(overrides: Partial<SiteGenerationStageSnapshot> = {}): SiteGenerationStageSnapshot {
  return {
    purpose: 'ritual_complex',
    builder: 'cult_engineers',
    location: 'riverfront_substrate',
    ingress: 'floodgate',
    topology: 'concentric_sanctum',
    hazards: ['ward_feedback', 'ritual_backwash'],
    treasure: ['sealed_reliquary'],
    inhabitants: ['ritual_adepts'],
    ...overrides,
  }
}

function makeReconAgent() {
  return createAgent({
    id: 'recon',
    name: 'Recon',
    role: 'field_recon',
    baseStats: { combat: 40, investigation: 82, utility: 76, social: 28 },
    tags: ['recon', 'surveillance', 'pathfinding', 'field-kit'],
    equipmentSlots: {
      secondary: 'anomaly_scanner',
      headgear: 'advanced_recon_suite',
      utility1: 'signal_intercept_kit',
    },
  })
}

describe('recon mapLayer consumer', () => {
  const state = createStartingState()
  const baseCase = {
    ...state.cases['case-002'],
    id: 'case-maplayer',
    mode: 'probability' as const,
    stage: 3,
    tags: ['signal', 'field'],
    requiredTags: [],
    preferredTags: [],
    assignedTeamIds: [],
  }

  it('map-metadata-first mapLayer increases hiddenModifierCount over no mapLayer', () => {
    const mapLayer = resolveMapMetadata(
      makeReconStages({ hazards: ['ward_feedback'] }),
      () => 0.1
    )
    const agent = makeReconAgent()

    const noLayer = evaluateTeamCaseRecon([agent], baseCase, { config: state.config } as never)
    const withLayer = evaluateTeamCaseRecon([agent], baseCase, {
      config: state.config,
      mapLayer,
    } as never)

    expect(withLayer.hiddenModifierCount).toBeGreaterThan(noLayer.hiddenModifierCount)
  })

  it('prose-key-first mapLayer with no hidden symbols adds only the authoring-mode modifier', () => {
    // collapsed_cells topology has no hidden symbols by default when no relevant hazards are active
    const mapLayer = resolveMapMetadata(
      makeReconStages({ topology: 'collapsed_cells', hazards: [] }),
      () => 0.1
    )
    expect(mapLayer.authoringMode).toBe('prose-key-first')

    const agent = makeReconAgent()
    const noLayer = evaluateTeamCaseRecon([agent], baseCase, { config: state.config } as never)
    const withLayer = evaluateTeconCaseReconHelper(agent, baseCase, state, mapLayer)

    // prose-key-first does NOT add metadata-layer-depth; only genuine hidden symbols if any
    const hiddenSymbolCount = mapLayer.zones.flatMap((z) => z.hiddenSymbolIds).length
    expect(withLayer.hiddenModifierCount).toBe(noLayer.hiddenModifierCount + hiddenSymbolCount)
  })

  it('a hidden symbol with routeEffect (ward_glyph) is revealed and named in revealedModifierLabels at sufficient reconScore', () => {
    // ward_feedback hazard places ward_glyph (hiddenUntilReveal, routeEffect single-file)
    const mapLayer = resolveMapMetadata(
      makeReconStages({ hazards: ['ward_feedback'] }),
      () => 0.1
    )

    // Build a very high-skill agent to ensure reconScore >= 27 (ward_glyph revealThreshold)
    const strongAgent = createAgent({
      id: 'strong-recon',
      name: 'Strong Recon',
      role: 'field_recon',
      baseStats: { combat: 50, investigation: 95, utility: 90, social: 40 },
      tags: ['recon', 'surveillance', 'pathfinding', 'field-kit', 'signal-hunter', 'fieldcraft'],
      equipmentSlots: {
        secondary: 'anomaly_scanner',
        headgear: 'advanced_recon_suite',
        utility1: 'signal_intercept_kit',
        utility2: 'occult_detection_array',
      },
    })

    const result = evaluateTeamCaseRecon([strongAgent], baseCase, {
      config: state.config,
      mapLayer,
    } as never)

    expect(result.revealedModifierLabels).toContain('Ward Glyph')
  })

  it('hidden symbol reveal is deterministic — same agent + mapLayer yields same revealedModifierLabels', () => {
    const mapLayer = resolveMapMetadata(
      makeReconStages({ hazards: ['ward_feedback', 'ritual_backwash'] }),
      () => 0.1
    )
    const agent = makeReconAgent()

    const resultA = evaluateTeamCaseRecon([agent], baseCase, {
      config: state.config,
      mapLayer,
    } as never)
    const resultB = evaluateTeamCaseRecon([agent], baseCase, {
      config: state.config,
      mapLayer,
    } as never)

    expect(resultA.revealedModifierLabels).toEqual(resultB.revealedModifierLabels)
    expect(resultA.hiddenModifierCount).toBe(resultB.hiddenModifierCount)
  })

  it('mapLayer hidden symbols stack additively with ingress hidden modifiers', () => {
    const mapLayer = resolveMapMetadata(
      makeReconStages({ hazards: ['ward_feedback'], ingress: 'maintenance_shaft' }),
      () => 0.1
    )
    const agent = makeReconAgent()
    const caseWithIngress = { ...baseCase, spatialFlags: ['ingress:maintenance_shaft'] }

    const ingressOnly = evaluateTeamCaseRecon([agent], caseWithIngress, {
      config: state.config,
    } as never)
    const ingressPlusLayer = evaluateTeamCaseRecon([agent], caseWithIngress, {
      config: state.config,
      mapLayer,
    } as never)

    expect(ingressPlusLayer.hiddenModifierCount).toBeGreaterThan(ingressOnly.hiddenModifierCount)
  })
})

// Helper to pass mapLayer through context without TypeScript complaining about
// config not being in TeamReconContext (scoring context is a superset).
function evaluateTeconCaseReconHelper(
  agent: ReturnType<typeof createAgent>,
  caseData: Parameters<typeof evaluateTeamCaseRecon>[1],
  state: ReturnType<typeof createStartingState>,
  mapLayer: import('../domain/siteGeneration/mapMetadata').MapLayerResult
) {
  return evaluateTeamCaseRecon([agent], caseData, { config: state.config, mapLayer } as never)
}
