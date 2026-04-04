import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { createAgent } from '../domain/agent/factory'
import { computeTeamScore } from '../domain/sim/scoring'
import { previewResolutionForTeamIds } from '../domain/sim/resolve'

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
})
