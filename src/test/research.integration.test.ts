import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { getContractOffers, buildContractPreviewCase, recordContractOutcome, refreshContractBoard } from '../domain/contracts'
import {
  assessFacilityUpgrade,
  applyFacilityUpgrade,
} from '../domain/facility'
import { validateAgentLoadoutAssignment, buildAgentLoadoutReadinessSummary } from '../domain/equipment'
import { degradeMissionIntelRecord } from '../domain/intel'
import type {
  FacilityInstance,
  FacilityUpgradeMetadata,
  GameState,
  ResearchState,
  ResearchUnlockCategory,
} from '../domain/models'
import {
  createInitialResearchState,
  getResearchIntelModifiers,
} from '../domain/research'
import { equipAgentItem } from '../domain/sim/equipment'
import { assessTeamTrainingQueue, queueTeamTraining } from '../domain/sim/training'
import { analyzeRuntimeStability } from '../domain/stabilityLayer'

function withCompletedResearchUnlocks(
  entries: Array<{
    projectId: string
    unlockId: string
    unlockCategory: ResearchUnlockCategory
    projectCategory?: ResearchState['projects'][string]['category']
  }>
): ResearchState {
  const base = createInitialResearchState()

  return {
    ...base,
    projects: Object.fromEntries(
      entries.map((entry) => [
        entry.projectId,
        {
          projectId: entry.projectId,
          category: entry.projectCategory ?? 'field_ops',
          status: 'completed',
          costTime: 1,
          costMaterials: 0,
          costData: 0,
          progressTime: 1,
          unlocks: [
            {
              id: entry.unlockId,
              category: entry.unlockCategory,
              label: entry.unlockId,
            },
          ],
          completedWeek: 1,
        },
      ])
    ),
    completedProjectIds: entries.map((entry) => entry.projectId),
  }
}

function withResearchReadyRook(state: GameState): GameState {
  const rook = state.agents.a_rook
  const certifications = rook.progression?.certifications ?? {}

  return {
    ...state,
    agents: {
      ...state.agents,
      a_rook: {
        ...rook,
        level: 2,
        progression: {
          ...rook.progression!,
          level: 2,
          certifications: {
            ...certifications,
            'field-systems-cert': {
              certificationId: 'field-systems-cert',
              state: 'certified',
            },
          },
        },
      },
    },
  }
}

function makeResearchFacility(overrides: Partial<FacilityInstance> = {}): FacilityInstance {
  return {
    facilityId: 'research_lab',
    category: 'research_lab',
    level: 1,
    maxLevel: 3,
    status: 'active',
    effects: { researchSpeedMultiplier: 1 },
    ...overrides,
  }
}

describe('research integration completion pass', () => {
  it('gates a loadout equipment path behind completed research with explicit blockers', () => {
    const base = withResearchReadyRook(createStartingState())
    const lockedState = {
      ...base,
      inventory: {
        ...base.inventory,
        signal_intercept_kit: 1,
      },
    }

    const locked = validateAgentLoadoutAssignment(
      lockedState.agents.a_rook,
      'utility1',
      'signal_intercept_kit',
      { state: lockedState }
    )

    expect(locked.valid).toBe(false)
    expect(locked.blockingIssues).toContain('prerequisite-research-gate')
    expect(locked.warnings).toContain('missing-research:signal_intercept_kit')

    const unlockedState = {
      ...lockedState,
      researchState: withCompletedResearchUnlocks([
        {
          projectId: 'signal-intercept-research',
          unlockId: 'signal_intercept_kit',
          unlockCategory: 'gear',
          projectCategory: 'equipment',
        },
      ]),
    }
    const unlocked = validateAgentLoadoutAssignment(
      unlockedState.agents.a_rook,
      'utility1',
      'signal_intercept_kit',
      { state: unlockedState }
    )

    expect(unlocked.valid).toBe(true)
    expect(unlocked.blockingIssues).toEqual([])
  })

  it('lets completed intel-tool research reduce deterministic intel degradation', () => {
    const caseId = 'case-001'
    const base = createStartingState()
    const stateWithResearch = {
      ...base,
      week: 4,
      cases: {
        ...base.cases,
        [caseId]: {
          ...base.cases[caseId],
          intelConfidence: 1,
          intelUncertainty: 0,
          intelLastUpdatedWeek: 1,
        },
      },
      researchState: withCompletedResearchUnlocks([
        {
          projectId: 'intel-doctrine',
          unlockId: 'intel-doctrine-kit',
          unlockCategory: 'intel_tool',
        },
      ]),
    }

    const degradedWithoutResearch = degradeMissionIntelRecord(
      { ...stateWithResearch.cases },
      stateWithResearch.week
    )[caseId]
    const degradedWithResearch = degradeMissionIntelRecord(
      { ...stateWithResearch.cases },
      stateWithResearch.week,
      getResearchIntelModifiers(stateWithResearch)
    )[caseId]

    expect(degradedWithResearch.intelConfidence).toBeGreaterThan(
      degradedWithoutResearch.intelConfidence ?? 0
    )
    expect(degradedWithResearch.intelUncertainty).toBeLessThan(
      degradedWithoutResearch.intelUncertainty ?? 1
    )
  })

  it('gates a training branch behind completed research and surfaces the missing research id', () => {
    const lockedState = {
      ...createStartingState(),
      academyTier: 2,
    }

    const locked = assessTeamTrainingQueue(lockedState, 't_nightwatch', 'systems-integration')

    expect(locked.canQueue).toBe(false)
    expect(locked.reason).toBe('program_locked')
    expect(locked.missingResearchIds).toEqual(['systems-integration'])

    const unlockedState = {
      ...lockedState,
      researchState: withCompletedResearchUnlocks([
        {
          projectId: 'systems-integration-research',
          unlockId: 'systems-integration',
          unlockCategory: 'training_branch',
          projectCategory: 'field_ops',
        },
      ]),
    }
    const unlocked = assessTeamTrainingQueue(unlockedState, 't_nightwatch', 'systems-integration')

    expect(unlocked.canQueue).toBe(true)
    expect(unlocked.participantIds.length).toBeGreaterThanOrEqual(2)
  })

  it('gates a facility upgrade path behind completed research with inspectable blocker data', () => {
    const upgrade: FacilityUpgradeMetadata = {
      costMoney: 100,
      costMaterials: 0,
      buildWeeks: 2,
      requirements: {
        requiredResearchIds: ['research-lab-tier-2'],
      },
      effectDeltas: {
        researchSpeedMultiplier: 0.5,
      },
    }
    const lockedState = {
      ...createStartingState(),
      funding: 200,
      facilityState: {
        facilities: {
          research_lab: makeResearchFacility(),
        },
      },
    }

    const locked = assessFacilityUpgrade(lockedState, 'research_lab', upgrade)

    expect(locked.canUpgrade).toBe(false)
    expect(locked.blockedReasons).toContain('missing-research')
    expect(locked.missingResearchIds).toEqual(['research-lab-tier-2'])

    const unlockedState = {
      ...lockedState,
      researchState: withCompletedResearchUnlocks([
        {
          projectId: 'research-lab-tier-2-project',
          unlockId: 'research-lab-tier-2',
          unlockCategory: 'facility_tier',
          projectCategory: 'equipment',
        },
      ]),
    }
    const upgraded = applyFacilityUpgrade(unlockedState, 'research_lab', upgrade)

    expect(upgraded.facilityState?.facilities.research_lab.upgradeInProgress).toBe(true)
    expect(upgraded.facilityState?.facilities.research_lab.status).toBe('upgrading')
  })

  it('uses completed mission-type research unlocks in the existing contract availability scaffold', () => {
    const base = createStartingState()
    const state = refreshContractBoard({
      ...base,
      factions: {
        ...base.factions!,
        institutions: {
          ...base.factions!.institutions,
          reputation: 40,
          reputationTier: 'friendly',
        },
      },
      contracts: undefined,
    })
    const prerequisite = getContractOffers(state).find(
      (offer) => offer.templateId === 'institutions-ledger-recovery'
    )!
    const previewCase = buildContractPreviewCase(state, prerequisite)!
    const progressedContracts = {
      ...recordContractOutcome(state.contracts, previewCase.contract, 'success', state.week),
      unlockedResearchIds: [],
    }

    const lockedState = refreshContractBoard({
      ...state,
      week: state.week + 1,
      contracts: progressedContracts,
      researchState: undefined,
    })
    const unlockedState = refreshContractBoard({
      ...state,
      week: state.week + 1,
      contracts: progressedContracts,
      researchState: withCompletedResearchUnlocks([
        {
          projectId: 'annex-clearance-project',
          unlockId: 'archive-ledger-index',
          unlockCategory: 'mission_type',
          projectCategory: 'field_ops',
        },
      ]),
    })

    expect(
      getContractOffers(lockedState).some(
        (offer) => offer.templateId === 'institutions-annex-breach'
      )
    ).toBe(false)
    expect(
      getContractOffers(unlockedState).some(
        (offer) => offer.templateId === 'institutions-annex-breach'
      )
    ).toBe(true)
  })

  it('preserves research-derived gear and training availability across save/load', () => {
    const prepared = withResearchReadyRook({
      ...createStartingState(),
      academyTier: 2,
      inventory: {
        ...createStartingState().inventory,
        signal_intercept_kit: 1,
      },
      researchState: withCompletedResearchUnlocks([
        {
          projectId: 'signal-intercept-research',
          unlockId: 'signal_intercept_kit',
          unlockCategory: 'gear',
          projectCategory: 'equipment',
        },
        {
          projectId: 'systems-integration-research',
          unlockId: 'systems-integration',
          unlockCategory: 'training_branch',
          projectCategory: 'field_ops',
        },
      ]),
    })
    const equipped = equipAgentItem(prepared, 'a_rook', 'utility1', 'signal_intercept_kit')
    const loaded = loadGameSave(serializeGameSave(equipped))

    const readiness = buildAgentLoadoutReadinessSummary(loaded.agents.a_rook, { state: loaded })
    const validation = validateAgentLoadoutAssignment(
      loaded.agents.a_rook,
      'utility1',
      'signal_intercept_kit',
      { state: loaded }
    )
    const trainingAvailability = assessTeamTrainingQueue(
      loaded,
      't_nightwatch',
      'systems-integration'
    )

    expect(loaded.agents.a_rook.equipmentSlots?.utility1).toBe('signal_intercept_kit')
    expect(readiness.readiness).not.toBe('blocked')
    expect(validation.valid).toBe(true)
    expect(trainingAvailability.canQueue).toBe(true)
  })

  it('flags invalid research-gated loadouts and queued training after research is lost', () => {
    const prepared = withResearchReadyRook({
      ...createStartingState(),
      academyTier: 2,
      inventory: {
        ...createStartingState().inventory,
        signal_intercept_kit: 1,
      },
      researchState: withCompletedResearchUnlocks([
        {
          projectId: 'signal-intercept-research',
          unlockId: 'signal_intercept_kit',
          unlockCategory: 'gear',
          projectCategory: 'equipment',
        },
        {
          projectId: 'systems-integration-research',
          unlockId: 'systems-integration',
          unlockCategory: 'training_branch',
          projectCategory: 'field_ops',
        },
      ]),
    })
    const equipped = equipAgentItem(prepared, 'a_rook', 'utility1', 'signal_intercept_kit')
    const queued = queueTeamTraining(equipped, 't_nightwatch', 'systems-integration')
    const broken = {
      ...queued,
      researchState: undefined,
    }

    const report = analyzeRuntimeStability(broken)

    expect(
      report.issues.some((issue) => issue.id.includes('loadout.prerequisite-mismatch.a_rook.utility1'))
    ).toBe(true)
    expect(
      report.issues.some((issue) => issue.id.includes('training.program-research-gated.'))
    ).toBe(true)
  })
})
