import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { appendDeveloperLogEvent } from '../domain/developerLog'
import { consumeOneShotContent, setPersistentFlag } from '../domain/flagSystem'
import {
  setEncounterRuntimeState,
  setUiDebugState,
} from '../domain/gameStateManager'
import {
  PROGRESS_CLOCK_IDS,
  advanceDefinedProgressClock,
  setDefinedProgressClock,
} from '../domain/progressClocks'
import { buildDeveloperOverlaySnapshot } from '../features/developer/developerOverlayView'

describe('developerOverlayView', () => {
  it('builds a deterministic authored-state snapshot from canonical helpers', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'containment.breach.followup_unlocked', true)
    state = setPersistentFlag(state, 'contact.ivy.introduced', true)
    state = consumeOneShotContent(state, 'frontdesk.warning.breach', 'frontdesk').state
    state = advanceDefinedProgressClock(state, PROGRESS_CLOCK_IDS.storyBreachDepth, 2)
    state = setDefinedProgressClock(
      state,
      {
        id: 'story.hidden-investigation',
        label: 'Hidden Investigation',
        max: 3,
        hidden: true,
      },
      {
        value: 1,
      }
    )
    state = setEncounterRuntimeState(state, 'case-001', {
      status: 'active',
      phase: 'containment',
      hiddenModifierIds: ['latent-surge'],
      revealedModifierIds: ['known-faction-tail'],
      flags: { intelReady: true },
    })
    state = setUiDebugState(state, {
      authoring: {
        activeContextId: 'frontdesk.notice.breach-follow-up-open',
        lastChoiceId: 'frontdesk.notice.breach-follow-up.cautious',
        lastNextTargetId: 'frontdesk.notice.breach-follow-up.cautious-brief',
        lastFollowUpIds: ['containment.breach.followup.cautious-brief'],
        updatedWeek: 1,
      },
    })
    state = appendDeveloperLogEvent(state, {
      type: 'choice.executed',
      summary: 'Choice executed: frontdesk.notice.breach-follow-up.cautious',
      contextId: 'frontdesk.notice.breach-follow-up-open',
      details: {
        changedFlags: ['containment.breach.followup.response'],
      },
    })

    const first = buildDeveloperOverlaySnapshot(state)
    const second = buildDeveloperOverlaySnapshot(state)

    expect(first).toEqual(second)
    expect(first).toMatchObject({
      activeAuthoredContextId: 'frontdesk.notice.breach-follow-up-open',
      persistentFlags: expect.arrayContaining([
        { id: 'contact.ivy.introduced', value: true },
        { id: 'containment.breach.followup_unlocked', value: true },
      ]),
      consumedOneShots: expect.arrayContaining([
        { id: 'frontdesk.warning.breach', source: 'frontdesk', firstSeenWeek: 1 },
      ]),
      choiceDebug: {
        lastChoiceId: 'frontdesk.notice.breach-follow-up.cautious',
        lastNextTargetId: 'frontdesk.notice.breach-follow-up.cautious-brief',
        lastFollowUpIds: ['containment.breach.followup.cautious-brief'],
        updatedWeek: 1,
      },
      developerLog: expect.arrayContaining([
        expect.objectContaining({
          type: 'choice.executed',
          summary: 'Choice executed: frontdesk.notice.breach-follow-up.cautious',
        }),
      ]),
      recruitmentFunnel: {
        totalCandidates: expect.any(Number),
        stageCounts: {
          prospect: expect.any(Number),
          contacted: expect.any(Number),
          screening: expect.any(Number),
          hired: expect.any(Number),
          lost: expect.any(Number),
        },
      },
      loadouts: {
        equippedAssignmentCount: expect.any(Number),
        roleIncompatibleAgentCount: expect.any(Number),
        readinessCounts: {
          ready: expect.any(Number),
          partial: expect.any(Number),
          blocked: expect.any(Number),
        },
      },
      training: {
        inProgressCount: expect.any(Number),
        blockedCount: expect.any(Number),
        completedRecentlyCount: expect.any(Number),
        certifiedCount: expect.any(Number),
        expiredCount: expect.any(Number),
      },
      teamComposition: {
        teamCount: expect.any(Number),
        validCount: expect.any(Number),
        fragileCount: expect.any(Number),
        bestAvailableTeamIds: expect.any(Array),
      },
      deployment: {
        missionReadyCount: expect.any(Number),
        conditionalCount: expect.any(Number),
        blockedCount: expect.any(Number),
        recoveryRequiredCount: expect.any(Number),
        teams: expect.any(Array),
      },
      pressure: {
        category: 'weekly-pressure',
        dominantFactor: expect.any(String),
        summary: expect.any(String),
        unresolvedTrend: expect.any(Array),
        budgetPressureTrend: expect.any(Array),
        attritionPressureTrend: expect.any(Array),
        intelConfidenceTrend: expect.any(Array),
      },
      missions: {
        missionCount: expect.any(Number),
        criticalCount: expect.any(Number),
        blockedCount: expect.any(Number),
        queuedCount: expect.any(Number),
        shortlistedCount: expect.any(Number),
        assignedCount: expect.any(Number),
        topMissionIds: expect.any(Array),
      },
    })
    expect(first.progressClocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: PROGRESS_CLOCK_IDS.storyBreachDepth,
          value: 2,
          max: 4,
          hidden: false,
        }),
        expect.objectContaining({
          id: 'story.hidden-investigation',
          value: 1,
          max: 3,
          hidden: true,
        }),
      ])
    )
    expect(first.encounters[0]).toMatchObject({
      id: 'case-001',
      status: 'active',
      phase: 'containment',
      hiddenModifierCount: 1,
      revealedModifierCount: 1,
      activeFlags: ['intelReady'],
    })
    expect(first.routedContent.directorMessageRouteId).toBeDefined()
    expect(first.routedContent.noticeRouteIds.length).toBeGreaterThan(0)
    expect(first.stability).toMatchObject({
      issueCount: expect.any(Number),
      softlockRisk: expect.any(Boolean),
      categories: expect.any(Array),
      topIssues: expect.any(Array),
    })
    expect(first.missions.entries[0]?.explanation).toMatchObject({
      category: 'routing',
      dominantFactor: expect.any(String),
      summary: expect.any(String),
    })
    expect(first.deployment.teams[0]?.explanation).toMatchObject({
      category: 'deployment-readiness',
      dominantFactor: expect.any(String),
      summary: expect.any(String),
    })
    expect(first.weakestLinks).toEqual([])
  })

  it('handles sparse or missing runtime state safely', () => {
    const base = createStartingState()
    const sparse = {
      ...base,
      runtimeState: undefined,
    }

    const snapshot = buildDeveloperOverlaySnapshot(sparse)

    expect(snapshot.location.hubId).toBe('operations-desk')
    expect(snapshot.persistentFlags).toEqual([])
    expect(snapshot.consumedOneShots).toEqual([])
    expect(snapshot.loadouts.equippedAssignmentCount).toBe(0)
    expect(snapshot.training.inProgressCount).toBe(0)
    expect(snapshot.teamComposition.teamCount).toBeGreaterThanOrEqual(0)
    expect(snapshot.deployment.teams.length).toBeGreaterThanOrEqual(0)
    expect(snapshot.missions.missionCount).toBeGreaterThanOrEqual(0)
    expect(snapshot.pressure.category).toBe('weekly-pressure')
    expect(snapshot.recruitmentFunnel.totalCandidates).toBe(0)
    expect(snapshot.progressClocks).toEqual([])
    expect(snapshot.encounters).toEqual([])
    expect(snapshot.routedContent.noticeRouteIds.length).toBeGreaterThan(0)
    expect(snapshot.stability.issueCount).toBeGreaterThanOrEqual(0)
  })
})
