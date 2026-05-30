import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { resolveAssignedCaseForWeek } from '../domain/caseResolutionOrchestration'
import {
  applyWeeklyHiddenStateScoutingReconPass,
  extraLayersToStripFromReconCache,
  isKnownButUnresolvedHiddenStateScan,
  mergeHiddenStateScoutingReconCache,
  scoutingReconCacheScoreAdjustment,
} from '../domain/hiddenStateScoutingReconCache'
import { scoutingOutcomeToDetectionScanForCase } from '../domain/hiddenStateModality'
import { resolveDetectionScan, type ConcealmentLayer } from '../domain/revealPayload'
import { advanceWeek } from '../domain/sim/advanceWeek'
import type { Agent, CaseInstance, Team } from '../domain/models'
import { createStarterCase } from '../domain/templates/startingCases'

const MASK_LAYER: ConcealmentLayer = {
  id: 'layer:mask',
  blockedTiers: ['exact_identity'],
}

function buildSubject() {
  return {
    present: true,
    exactIdentity: 'entity:cache-test',
    category: 'concealed presence',
    hostility: 'latent' as const,
    activeProtections: [],
    concealmentLayers: [MASK_LAYER],
    activeEffects: [],
    dormantEffects: [],
  }
}

function createReconObserver(id: string): Agent {
  return {
    id,
    name: id,
    role: 'medium',
    baseStats: { combat: 10, investigation: 60, utility: 40, social: 40 },
    tags: ['medium', 'recon-specialist'],
    relationships: {},
    fatigue: 0,
    status: 'active',
  }
}

function createConcealedCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({ id: 'case-recon-cache', templateId: 'combat_vampire_nest' }),
    mode: 'threshold',
    status: 'in_progress',
    weeksRemaining: 2,
    durationWeeks: 2,
    hiddenState: 'hidden',
    detectionConfidence: 0.2,
    counterDetection: true,
    tags: ['concealment'],
    requiredTags: [],
    preferredTags: [],
    assignedTeamIds: ['team-recon-cache'],
    weights: { combat: 0, investigation: 0.4, utility: 0, social: 0 },
    difficulty: { combat: 0, investigation: 40, utility: 0, social: 0 },
    ...overrides,
  }
}

describe('hiddenStateScoutingReconCache (SPE-2284)', () => {
  it('detects known-but-unresolved partial scans', () => {
    const partial = resolveDetectionScan(buildSubject(), { family: 'category_pass' })

    expect(isKnownButUnresolvedHiddenStateScan(partial)).toBe(true)

    const peeled = resolveDetectionScan(buildSubject(), {
      family: 'identity_probe',
      layersToStrip: 2,
    })

    expect(isKnownButUnresolvedHiddenStateScan(peeled)).toBe(
      peeled.remainingConcealmentLayers.length > 0
    )
  })

  it('merges unresolved layer ids and increments scouting pass count', () => {
    const scan = resolveDetectionScan(buildSubject(), { family: 'category_pass' })
    const caseData = createConcealedCase()

    const merged = mergeHiddenStateScoutingReconCache(caseData, scan, 3)

    expect(merged.hiddenStateScoutingReconCache?.knownUnresolvedLayerIds).toEqual(['layer:mask'])
    expect(merged.hiddenStateScoutingReconCache?.scoutingPassCount).toBe(1)
    expect(merged.hiddenStateScoutingReconCache?.lastUpdatedWeek).toBe(3)

    const secondPass = mergeHiddenStateScoutingReconCache(merged, scan, 4)

    expect(secondPass.hiddenStateScoutingReconCache?.scoutingPassCount).toBe(2)
  })

  it('adds extra layersToStrip from cache on follow-up scouting passes', () => {
    const cachedCase = createConcealedCase({
      hiddenStateScoutingReconCache: {
        knownUnresolvedLayerIds: ['layer:concealed-presence'],
        scoutingPassCount: 1,
        lastUpdatedWeek: 2,
      },
    })

    expect(extraLayersToStripFromReconCache(cachedCase)).toBe(1)

    const scanInput = scoutingOutcomeToDetectionScanForCase(
      { outcome: 'strong', revealed: true, withheld: false },
      cachedCase
    )

    expect(scanInput.layersToStrip).toBeGreaterThanOrEqual(1)
  })

  it('applies route-caution score adjustment after two scouting passes', () => {
    const cachedCase = createConcealedCase({
      hiddenStateScoutingReconCache: {
        knownUnresolvedLayerIds: ['layer:concealed-presence'],
        scoutingPassCount: 2,
        lastUpdatedWeek: 4,
      },
    })

    expect(scoutingReconCacheScoreAdjustment(cachedCase)).toMatchObject({
      delta: 0.35,
      reason: expect.stringContaining('Prior recon'),
    })
  })

  it('records cache on in-progress weekly scouting pass', () => {
    const state = createStartingState()
    const observer = createReconObserver('a_cache_weekly')
    const team: Team = {
      id: 'team-recon-cache',
      name: 'Recon cache team',
      agentIds: [observer.id],
      tags: [],
    }
    state.agents[observer.id] = observer
    state.teams[team.id] = team

    const updated = applyWeeklyHiddenStateScoutingReconPass(
      state,
      createConcealedCase(),
      [team.id]
    )

    expect(updated.hiddenStateScoutingReconCache?.scoutingPassCount).toBe(1)
    expect(updated.hiddenStateScoutingReconCache?.knownUnresolvedLayerIds.length).toBeGreaterThan(
      0
    )
  })

  it('orchestration carries recon-cache score reason when cache has two passes', () => {
    const state = createStartingState()
    const observer = createReconObserver('a_cache_orchestration')
    const team: Team = {
      id: 'team-recon-cache',
      name: 'Recon cache team',
      agentIds: [observer.id],
      tags: [],
    }
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    const caseData = createConcealedCase({
      weeksRemaining: 1,
      hiddenStateScoutingReconCache: {
        knownUnresolvedLayerIds: ['layer:concealed-presence'],
        scoutingPassCount: 2,
        lastUpdatedWeek: state.week,
      },
    })

    const resolution = resolveAssignedCaseForWeek(caseData, state, () => 0.5)

    expect(
      resolution.outcome.reasons.some((reason) => reason.includes('Prior recon'))
    ).toBe(true)
  })

  it('advanceWeek persists cache across assigned weeks before final resolution', () => {
    const state = createStartingState()
    const observer = createReconObserver('a_cache_advance')
    const team: Team = {
      id: 'team-recon-cache',
      name: 'Recon cache team',
      agentIds: [observer.id],
      tags: [],
    }
    state.agents[observer.id] = observer
    state.teams[team.id] = team
    state.reports = []

    for (const currentCase of Object.values(state.cases)) {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
    }

    state.cases['case-recon-cache'] = createConcealedCase()

    const afterWeekOne = advanceWeek(state)

    expect(
      afterWeekOne.cases['case-recon-cache'].hiddenStateScoutingReconCache?.scoutingPassCount
    ).toBe(1)

    const afterWeekTwo = advanceWeek(afterWeekOne)

    expect(
      afterWeekTwo.cases['case-recon-cache'].hiddenStateScoutingReconCache?.scoutingPassCount
    ).toBeGreaterThanOrEqual(2)
  })
})
