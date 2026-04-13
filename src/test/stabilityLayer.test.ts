import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type {
  DeploymentHardBlockerCode,
  DeploymentReadinessCategory,
  MissionCategory,
  MissionPriorityBand,
  MissionRoutingBlockerCode,
  MissionRoutingRecord,
  MissionRoutingStateKind,
  TeamDeploymentReadinessState,
} from '../domain/models'
import { enqueueRuntimeEvent } from '../domain/eventQueue'
import { setUiDebugState } from '../domain/gameStateManager'
import {
  analyzeRuntimeStability,
  clearInvalidEncounterAftermathReferences,
  clearStaleAuthoredContext,
  hasSafeFrontDeskFallback,
  normalizeInvalidProgressClocks,
  pruneInvalidRuntimeQueueEvents,
} from '../domain/stabilityLayer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'

describe('stabilityLayer', () => {
  it('detects stale authored follow-up queue targets and surfaces softlock risk', () => {
    let state = createStartingState()
    state = enqueueRuntimeEvent(state, {
      type: 'authored.follow_up',
      targetId: 'frontdesk.notice.missing-target',
      source: 'frontdesk.choice.test',
      week: state.week,
    }).state

    const report = analyzeRuntimeStability(state)

    expect(report.summary.softlockRisk).toBe(true)
    expect(report.summary.errorCount).toBeGreaterThan(0)
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'event-queue',
          severity: 'error',
          recoveryActions: expect.arrayContaining(['prune-invalid-queue-events']),
        }),
      ])
    )
    expect(report.recoveryActions.some((action) => action.id === 'prune-invalid-queue-events')).toBe(
      true
    )
  })

  it('detects encounter lifecycle inconsistency', () => {
    const state = createStartingState()
    const broken = {
      ...state,
      runtimeState: {
        ...state.runtimeState!,
        encounterState: {
          'encounter-broken': {
            encounterId: 'encounter-broken',
            status: 'active' as const,
            hiddenModifierIds: [],
            revealedModifierIds: [],
            flags: {},
            lastUpdatedWeek: state.week,
            // missing startedWeek should be flagged
          },
        },
      },
    }

    const report = analyzeRuntimeStability(broken)

    expect(report.issues.some((issue) => issue.id.includes('encounter.active-missing-start'))).toBe(true)
  })

  it('detects stale authored context and supports explicit context clearing', () => {
    let state = createStartingState()
    state = setUiDebugState(state, {
      authoring: {
        activeContextId: 'frontdesk.notice.context-that-does-not-exist',
        updatedWeek: state.week,
      },
    })

    const report = analyzeRuntimeStability(state)
    expect(report.issues.some((issue) => issue.category === 'authored-context')).toBe(true)

    const cleared = clearStaleAuthoredContext(state)

    expect(cleared.cleared).toBe(true)
    expect(cleared.previousContextId).toBe('frontdesk.notice.context-that-does-not-exist')
    expect(cleared.state.runtimeState?.ui.authoring?.activeContextId).toBeUndefined()
  })

  it('detects invalid progress clock ranges and completion inconsistencies', () => {
    const state = createStartingState()
    const broken = {
      ...state,
      runtimeState: {
        ...state.runtimeState!,
        progressClocks: {
          'clock-negative': {
            id: 'clock-negative',
            label: 'Clock Negative',
            value: -1,
            max: 4,
          },
          'clock-completion-mismatch': {
            id: 'clock-completion-mismatch',
            label: 'Clock Completion Mismatch',
            value: 1,
            max: 4,
            completedAtWeek: state.week,
          },
        },
      },
    }

    const report = analyzeRuntimeStability(broken)

    expect(report.issues.some((issue) => issue.id.includes('clock.range-invalid'))).toBe(true)
    expect(report.issues.some((issue) => issue.id.includes('clock.completion-inconsistent'))).toBe(true)
  })

  it('detects restored-state stale selections and queue duplicate/stability issues', () => {
    const base = createStartingState()
    const broken = {
      ...base,
      runtimeState: {
        ...base.runtimeState!,
        ui: {
          ...base.runtimeState!.ui,
          selectedCaseId: 'case-does-not-exist',
          selectedTeamId: 'team-does-not-exist',
          selectedAgentId: 'agent-does-not-exist',
        },
        eventQueue: {
          entries: [
            {
              id: 'qevt-0002',
              type: 'authored.follow_up',
              targetId: 'frontdesk.notice.missing-target',
              week: 1,
            },
            {
              id: 'qevt-0001',
              type: 'authored.follow_up',
              targetId: 'frontdesk.notice.missing-target',
              week: 1,
            },
          ],
          nextSequence: 1,
        },
      },
    }

    const report = analyzeRuntimeStability(broken)

    expect(report.issues.some((issue) => issue.category === 'restored-state')).toBe(true)
    expect(report.issues.some((issue) => issue.id === 'queue.ordering-unstable')).toBe(true)
    expect(report.issues.some((issue) => issue.id.includes('queue.duplicate-target'))).toBe(true)
    expect(report.summary.categories).toContain('event-queue')
    expect(report.summary.categories).toContain('restored-state')
  })

  it('surfaces invalid intel bounds, stale research references, and broken intel-derived readiness', () => {
    const state = createStartingState()
    const broken = {
      ...state,
      cases: {
        ...state.cases,
        'case-001': {
          ...state.cases['case-001'],
          intelConfidence: 1.4,
          intelUncertainty: -0.2,
          intelLastUpdatedWeek: 0,
        },
      },
      researchState: {
        projects: {},
        activeProjectIds: [],
        queuedProjectIds: [],
        completedProjectIds: ['missing-intel-project'],
        availableProjectIds: [],
        blockedProjectIds: [],
        researchSlots: 1,
        researchSpeedMultiplier: 1,
        researchDataPool: 0,
        researchMaterialsPool: 0,
      },
      teams: {
        ...state.teams,
        t_nightwatch: {
          ...state.teams.t_nightwatch,
          deploymentReadinessState: {
            ...(state.teams.t_nightwatch.deploymentReadinessState ?? {
              teamId: 't_nightwatch',
              readinessCategory: 'mission_ready' as DeploymentReadinessCategory,
              readinessScore: 100,
              hardBlockers: [],
              softRisks: [],
              coverageCompleteness: { required: [], covered: [], missing: [] },
              cohesionBand: 'strong',
              minimumMemberReadiness: 100,
              averageFatigue: 0,
              estimatedDeployWeeks: 0,
              estimatedRecoveryWeeks: 0,
              computedWeek: state.week,
            }),
            intelPenalty: 99,
          } as TeamDeploymentReadinessState,
        },
      },
    }

    const report = analyzeRuntimeStability(broken)

    expect(report.issues.some((issue) => issue.id.includes('intel-confidence-invalid.case-001'))).toBe(
      true
    )
    expect(report.issues.some((issue) => issue.id.includes('research-project-missing.missing-intel-project'))).toBe(
      true
    )
    expect(report.issues.some((issue) => issue.id.includes('deployment.invalid-intel-penalty.t_nightwatch'))).toBe(
      true
    )
  })

  it('detects loadout role-compatibility mismatches', () => {
    const state = createStartingState()
    const broken = {
      ...state,
      agents: {
        ...state.agents,
        a_eli: {
          ...state.agents.a_eli,
          equipmentSlots: {
            ...(state.agents.a_eli.equipmentSlots ?? {}),
            primary: 'silver_rounds',
          },
        },
      },
    }

    const report = analyzeRuntimeStability(broken)

    expect(report.issues.some((issue) => issue.category === 'loadout-consistency')).toBe(true)
    expect(report.summary.categories).toContain('loadout-consistency')
  })

  it('detects stale restored loadout item references explicitly', () => {
    const state = createStartingState()
    const broken = {
      ...state,
      agents: {
        ...state.agents,
        a_rook: {
          ...state.agents.a_rook,
          equipmentSlots: {
            ...(state.agents.a_rook.equipmentSlots ?? {}),
            utility1: 'missing_item_id',
          },
        },
      },
    }

    const report = analyzeRuntimeStability(broken)

    expect(
      report.issues.some((issue) => issue.id.includes('loadout.unknown-item.a_rook.utility1'))
    ).toBe(true)
    expect(report.summary.categories).toContain('loadout-consistency')
  })

  it('detects stale and inconsistent training/certification restored state', () => {
    const state = createStartingState()
    const baseProgression = state.agents.a_ava.progression!
    const broken = {
      ...state,
      agents: {
        ...state.agents,
        a_ava: {
          ...state.agents.a_ava,
          progression: {
            ...baseProgression,
            trainingHistory: [
              {
                trainingId: 'missing-training-id',
                week: state.week,
              },
            ],
            certProgress: {
              'combat-operator-cert': 0,
              'missing-cert': 2,
            },
            certifications: {
              'combat-operator-cert': {
                certificationId: 'combat-operator-cert',
                state: 'certified' as const,
              },
              'missing-cert': {
                certificationId: 'missing-cert',
                state: 'certified' as const,
              },
            },
          },
        },
      },
    }

    const report = analyzeRuntimeStability(broken)

    expect(report.issues.some((issue) => issue.category === 'training-certification')).toBe(true)
    expect(report.summary.categories).toContain('training-certification')
  })

  it('detects team composition conflicts in restored state', () => {
    const state = createStartingState()
    const broken = {
      ...state,
      teams: {
        ...state.teams,
        t_nightwatch: {
          ...state.teams.t_nightwatch,
          leaderId: 'a_jules',
          memberIds: [...(state.teams.t_nightwatch.memberIds ?? []), 'a_jules'],
          agentIds: [...(state.teams.t_nightwatch.agentIds ?? []), 'a_jules'],
        },
        t_greentape: {
          ...state.teams.t_greentape,
          memberIds: [...(state.teams.t_greentape.memberIds ?? []), 'a_ava'],
          agentIds: [...(state.teams.t_greentape.agentIds ?? []), 'a_ava'],
        },
      },
    }

    const report = analyzeRuntimeStability(broken)

    expect(report.issues.some((issue) => issue.category === 'team-composition')).toBe(true)
    expect(report.summary.categories).toContain('team-composition')
  })

  it('detects mission routing stale references and impossible assignment state', () => {
    const state = createStartingState()
    const missionId = Object.keys(state.cases)[0]!
    const broken = {
      ...state,
      missionRouting: {
        orderedMissionIds: [missionId, 'missing-mission-id'],
        missions: {
          [missionId]: {
            missionId,
            templateId: 'missing-template-id',
            category: 'containment_breach' as const,
            kind: 'case' as const,
            status: 'in_progress' as const,
            generatedWeek: state.week,
            deadlineRemaining: 1,
            durationWeeks: 2,
            stage: 2,
            difficulty: { ...state.cases[missionId]!.difficulty },
            weights: { ...state.cases[missionId]!.weights },
            requiredRoles: [...(state.cases[missionId]!.requiredRoles ?? [])],
            requiredTags: [...state.cases[missionId]!.requiredTags],
            preferredTags: [...state.cases[missionId]!.preferredTags],
            assignedTeamIds: ['missing-team-id'],
            intakeSource: 'scripted' as const,
            priority: 'critical' as const,
            priorityReasonCodes: ['urgency-high'],
            triageScore: 90,
            routingState: 'assigned' as const,
            routingBlockers: ['missing-certification'] as MissionRoutingBlockerCode[],
            lastCandidateTeamIds: [],
            lastRejectedTeamIds: [],
          },
        },
        nextGeneratedSequence: 4,
      },
    }

    const report = analyzeRuntimeStability(broken)

    expect(report.issues.some((issue) => issue.category === 'mission-routing')).toBe(true)
    expect(report.summary.categories).toContain('mission-routing')
  })

  it('detects deployment readiness inconsistencies and invalid mission time-cost', () => {
    const state = createStartingState()
    const missionId = Object.keys(state.cases)[0]!
    const broken = {
      ...state,
      teams: {
        ...state.teams,
        t_nightwatch: {
          ...state.teams.t_nightwatch,
          deploymentReadinessState: {
            teamId: 't_nightwatch',
            readinessCategory: 'mission_ready' as DeploymentReadinessCategory,
            readinessScore: 99,
            hardBlockers: ['missing-coverage'] as DeploymentHardBlockerCode[],
            softRisks: [],
            coverageCompleteness: {
              required: [],
              covered: [],
              missing: ['containment'],
            },
            cohesionBand: 'strong',
            minimumMemberReadiness: 100,
            averageFatigue: 0,
            estimatedDeployWeeks: -1,
            estimatedRecoveryWeeks: -1,
            computedWeek: state.week,
          } as TeamDeploymentReadinessState,
        },
      },
      missionRouting: {
        orderedMissionIds: [missionId],
        missions: {
          [missionId]: {
            missionId,
            templateId: state.cases[missionId]!.templateId,
            category: 'containment_breach' as MissionCategory,
            kind: state.cases[missionId]!.kind,
            status: state.cases[missionId]!.status,
            generatedWeek: state.week,
            deadlineRemaining: state.cases[missionId]!.deadlineRemaining,
            durationWeeks: state.cases[missionId]!.durationWeeks,
            stage: state.cases[missionId]!.stage,
            difficulty: { ...state.cases[missionId]!.difficulty },
            weights: { ...state.cases[missionId]!.weights },
            requiredRoles: [...(state.cases[missionId]!.requiredRoles ?? [])],
            requiredTags: [...state.cases[missionId]!.requiredTags],
            preferredTags: [...state.cases[missionId]!.preferredTags],
            assignedTeamIds: [...state.cases[missionId]!.assignedTeamIds],
            intakeSource: 'scripted',
            priority: 'normal' as MissionPriorityBand,
            priorityReasonCodes: ['urgency-low'],
            triageScore: 30,
            routingState: 'queued' as MissionRoutingStateKind,
            routingBlockers: [],
            timeCostSummary: {
              missionId,
              plannedStartWeek: state.week,
              expectedTravelWeeks: 0,
              expectedSetupWeeks: 0,
              expectedResolutionWeeks: 0,
              expectedRecoveryWeeks: 0,
              expectedTotalWeeks: 0,
              timeCostReasonCodes: [],
            },
            lastCandidateTeamIds: [],
            lastRejectedTeamIds: [],
          } as MissionRoutingRecord,
        },
        nextGeneratedSequence: 4,
      },
    }

    const report = analyzeRuntimeStability(broken)

    expect(report.issues.some((issue) => issue.category === 'deployment-readiness')).toBe(true)
    expect(report.summary.categories).toContain('deployment-readiness')
  })

  it('provides non-destructive safe fallback and recovery recommendations', () => {
    const state = createStartingState()
    const fallback = hasSafeFrontDeskFallback(state)
    const report = analyzeRuntimeStability(state)

    expect(fallback.safe).toBe(true)
    expect(report.recoveryActions.every((action) => typeof action.mutating === 'boolean')).toBe(true)
  })

  it('prunes invalid queue events only when explicitly requested', () => {
    let state = createStartingState()
    state = enqueueRuntimeEvent(state, {
      type: 'authored.follow_up',
      targetId: 'frontdesk.notice.missing-target',
      week: state.week,
    }).state
    state = enqueueRuntimeEvent(state, {
      type: 'authored.follow_up',
      targetId: 'weekly-report-returning',
      week: state.week,
    }).state

    const before = analyzeRuntimeStability(state)
    expect(before.issues.some((issue) => issue.category === 'event-queue')).toBe(true)

    const pruned = pruneInvalidRuntimeQueueEvents(state)

    expect(pruned.removedCount).toBeGreaterThan(0)
    expect(pruned.removedEventIds.length).toBe(pruned.removedCount)
    expect(pruned.state.runtimeState?.eventQueue.entries.some((entry) => entry.targetId === 'frontdesk.notice.missing-target')).toBe(false)
  })

  it('normalizes invalid progress clocks only when explicitly requested', () => {
    const state = createStartingState()
    const broken = {
      ...state,
      runtimeState: {
        ...state.runtimeState!,
        progressClocks: {
          'clock-invalid': {
            id: 'clock-invalid',
            label: 'Clock Invalid',
            value: 99,
            max: 2,
            completedAtWeek: state.week,
          },
          'clock-negative': {
            id: 'clock-negative',
            label: 'Clock Negative',
            value: -4,
            max: 3,
          },
        },
      },
    }

    const normalized = normalizeInvalidProgressClocks(broken)

    expect(normalized.normalizedCount).toBe(2)
    expect(normalized.normalizedClockIds).toEqual(expect.arrayContaining(['clock-invalid', 'clock-negative']))
    expect(normalized.state.runtimeState?.progressClocks['clock-invalid']).toMatchObject({
      value: 2,
      max: 2,
    })
    expect(normalized.state.runtimeState?.progressClocks['clock-negative']).toMatchObject({
      value: 0,
      max: 3,
    })
  })

  it('clears invalid encounter aftermath references only when explicitly requested', () => {
    const base = createStartingState()
    const broken = {
      ...base,
      runtimeState: {
        ...base.runtimeState!,
        encounterState: {
          'encounter.alpha': {
            encounterId: 'encounter.alpha',
            status: 'resolved' as const,
            hiddenModifierIds: [],
            revealedModifierIds: [],
            flags: {},
            lastUpdatedWeek: base.week,
            latestOutcome: 'success' as const,
            resolvedWeek: base.week,
            followUpIds: [
              'frontdesk.notice.missing-target',
              'frontdesk.notice.weekly-report-tutorial',
            ],
          },
        },
        eventQueue: {
          entries: [
            {
              id: 'qevt-0001',
              type: 'encounter.follow_up',
              targetId: 'encounter.missing',
              week: base.week,
            },
            {
              id: 'qevt-0002',
              type: 'encounter.follow_up',
              targetId: 'encounter.alpha',
              week: base.week,
            },
          ],
          nextSequence: 3,
        },
      },
    }

    const cleaned = clearInvalidEncounterAftermathReferences(broken)

    expect(cleaned.cleanedCount).toBeGreaterThan(0)
    expect(cleaned.cleanedEncounterIds).toContain('encounter.alpha')
    expect(cleaned.removedQueueEventIds).toContain('qevt-0001')
    expect(cleaned.state.runtimeState?.encounterState['encounter.alpha']?.followUpIds).toEqual([
      'frontdesk.notice.weekly-report-tutorial',
    ])
  })

  it('remains save/load compatible after explicit recovery helper usage', () => {
    let state = createStartingState()
    state = setUiDebugState(state, {
      authoring: {
        activeContextId: 'frontdesk.notice.context-that-does-not-exist',
        updatedWeek: state.week,
      },
    })
    state = enqueueRuntimeEvent(state, {
      type: 'authored.follow_up',
      targetId: 'frontdesk.notice.missing-target',
      week: state.week,
    }).state

    const pruned = pruneInvalidRuntimeQueueEvents(state)
    const recovered = clearStaleAuthoredContext(pruned.state)

    const roundTripped = loadGameSave(serializeGameSave(recovered.state))
    expect(roundTripped.runtimeState?.eventQueue.entries).toEqual([])
    expect(roundTripped.runtimeState?.ui.authoring?.activeContextId).toBeUndefined()
  })
})
