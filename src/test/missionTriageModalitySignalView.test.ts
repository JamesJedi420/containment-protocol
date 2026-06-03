import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { buildMissionTriageModalitySignals } from '../features/cases/missionTriageModalitySignalView'
import { buildMissionTriageListRowChips } from '../features/cases/missionTriageLayoutView'
import { buildMissionTriageDispositionView } from '../features/cases/missionTriageDispositionView'
import { getCaseListItemView } from '../features/cases/caseView'
import { TELL_THERMAL_RESIDUAL_TAG } from '../domain/hiddenStateModalityTells'
import type { Agent, CaseInstance } from '../domain/models'
import { createStarterCase } from '../domain/templates/startingCases'

function createHiddenCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({
      id: 'case-modality-tell',
      templateId: 'combat_vampire_nest',
    }),
    mode: 'threshold',
    hiddenState: 'hidden',
    detectionConfidence: 0.2,
    counterDetection: false,
    tags: ['concealment'],
    requiredTags: [],
    preferredTags: [],
    assignedTeamIds: [],
    infiltrationCoverProfile: undefined,
    infiltrationProbePlan: undefined,
    weights: { combat: 0, investigation: 0.4, utility: 0, social: 0 },
    difficulty: { combat: 0, investigation: 40, utility: 0, social: 0 },
    ...overrides,
  }
}

function makeObserver(id: string, investigation: number): Agent {
  return {
    id,
    name: id,
    role: 'medium',
    baseStats: { combat: 10, investigation, utility: 40, social: 40 },
    tags: ['medium'],
    relationships: {},
    fatigue: 0,
    status: 'active',
  }
}

describe('missionTriageModalitySignalView (SPE-2306)', () => {
  it('shows preview tell chip for open case with authored tell tags', () => {
    const game = createStartingState()
    const caseData = createHiddenCase({
      id: 'case-tell-open',
      status: 'open',
      tags: ['concealment', TELL_THERMAL_RESIDUAL_TAG],
    })
    game.cases = { [caseData.id]: caseData }

    const signals = buildMissionTriageModalitySignals(caseData, game)

    expect(signals.visible).toBe(true)
    expect(signals.markers[0]?.label).toBe('Tell: thermal')
    expect(signals.markers[0]?.title).toContain('Residual signature')
  })

  it('shows active tell chip when assigned team agents satisfy observer gate', () => {
    const game = createStartingState()
    const teamId = Object.keys(game.teams)[0]!
    const agent = makeObserver('agent-tell', 70)
    game.agents = { [agent.id]: agent }
    game.teams = {
      ...game.teams,
      [teamId]: { ...game.teams[teamId]!, agentIds: [agent.id] },
    }

    const caseData = createHiddenCase({
      id: 'case-tell-assigned',
      status: 'in_progress',
      assignedTeamIds: [teamId],
      tags: ['concealment', TELL_THERMAL_RESIDUAL_TAG],
    })
    game.cases = { [caseData.id]: caseData }

    const signals = buildMissionTriageModalitySignals(caseData, game, [game.teams[teamId]!])

    expect(signals.markers.some((marker) => marker.id === 'tell:thermal_residual')).toBe(true)
  })

  it('shows illusion chips for active and disproved phases', () => {
    const game = createStartingState()

    const activeCase = createHiddenCase({
      id: 'case-false-entity',
      status: 'open',
      tags: ['false-entity'],
    })
    const disprovedCase = createHiddenCase({
      id: 'case-illusion-disproved',
      status: 'in_progress',
      hiddenState: 'displaced',
      tags: ['structural-illusion'],
      hiddenStateIllusionState: {
        kind: 'structural_illusion',
        phase: 'disproved',
        anchorLabel: 'false terrain anchor',
        disproofReason: 'Route traversal exposed the false terrain anchor.',
      },
    })
    game.cases = {
      [activeCase.id]: activeCase,
      [disprovedCase.id]: disprovedCase,
    }

    expect(buildMissionTriageModalitySignals(activeCase, game).markers[0]?.label).toBe(
      'False contact'
    )
    expect(buildMissionTriageModalitySignals(disprovedCase, game).markers[0]?.label).toBe(
      'Illusion disproved'
    )
  })

  it('hides modality markers on resolved cases', () => {
    const game = createStartingState()
    const caseData = createHiddenCase({
      id: 'case-resolved',
      status: 'resolved',
      tags: ['false-entity'],
    })
    game.cases = { [caseData.id]: caseData }

    expect(buildMissionTriageModalitySignals(caseData, game).visible).toBe(false)
  })

  it('integrates modality chips into list row chip builder', () => {
    const game = createStartingState()
    const caseData = createHiddenCase({
      id: 'case-chip-row',
      status: 'open',
      tags: ['concealment', TELL_THERMAL_RESIDUAL_TAG],
    })
    game.cases = { [caseData.id]: caseData }

    const view = getCaseListItemView(caseData, game, {
      includeCovertPrepSignals: true,
      includeModalitySignals: true,
    })
    const chips = buildMissionTriageListRowChips(
      view,
      buildMissionTriageDispositionView(view, game)
    )

    expect(chips.some((chip) => chip.label === 'Tell: thermal')).toBe(true)
  })
})
