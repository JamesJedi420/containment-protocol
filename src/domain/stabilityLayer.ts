import { FRONT_DESK_SCENE_TRIGGERS } from '../features/operations/frontDeskTriggers'
import { getFrontDeskBriefingView } from '../features/operations/frontDeskView'
import {
  buildBreachFollowUpChoices,
  buildHostileFactionResponseChoices,
  buildSpecialRecruitOpportunityChoices,
  buildWeeklyReportTutorialChoices,
} from '../features/operations/frontDeskChoices'
import {
  EQUIPMENT_SLOT_KINDS,
  getAgentLoadoutConflicts,
  getEquipmentDefinition,
  getEquipmentSlotItemId,
  isEquipmentPrerequisiteSatisfied,
  isEquipmentRoleCompatible,
} from './equipment'
import { buildReplacementPressureState } from './agent/attrition'
import { assessFundingPressure, getCanonicalFundingState } from './funding'
import { getTrainingProgram } from '../data/training'
import { getCertificationDefinitions } from './sim/training'
import { buildTeamCompositionState } from './teamComposition'
import { buildTeamDeploymentReadinessState } from './deploymentReadiness'
import { normalizeMissionRoutingState, routeMission, triageMission } from './missionIntakeRouting'
import { getCandidateFunnelStage, normalizeCandidateHireStatus } from './recruitment'
import { assessResearchRequirements } from './research'
import { hasConsumedOneShotContent } from './flagSystem'
import { readGameStateManager } from './gameStateManager'
import { evaluateSceneTrigger } from './sceneTriggers'
import { getProgressClockDefinition, listProgressClocks } from './progressClocks'
import type { GameState, RuntimeQueuedEvent, RuntimeState } from './models'

export type StabilityIssueCategory =
  | 'event-queue'
  | 'authored-context'
  | 'trigger-consistency'
  | 'encounter-runtime'
  | 'one-shot-enforcement'
  | 'progress-clock'
  | 'routing-fallback'
  | 'restored-state'
  | 'loadout-consistency'
  | 'training-certification'
  | 'team-composition'
  | 'mission-routing'
  | 'deployment-readiness'

export type StabilityIssueSeverity = 'warning' | 'error'

export interface StabilityIssue {
  id: string
  category: StabilityIssueCategory
  severity: StabilityIssueSeverity
  summary: string
  details?: string
  recoveryActions: string[]
}

export interface StabilityRecoveryAction {
  id:
    | 'prune-invalid-queue-events'
    | 'clear-stale-authored-context'
    | 'normalize-invalid-progress-clocks'
    | 'clear-invalid-encounter-aftermath-references'
    | 'review-frontdesk-fallback-routing'
    | 'repair-encounter-runtime-records'
    | 'repair-progress-clock-records'
  label: string
  description: string
  mutating: boolean
}

export interface StabilityReport {
  issues: StabilityIssue[]
  summary: {
    issueCount: number
    errorCount: number
    warningCount: number
    softlockRisk: boolean
    categories: StabilityIssueCategory[]
  }
  recoveryActions: StabilityRecoveryAction[]
}

export interface RuntimeQueuePruneResult {
  state: GameState
  removedEventIds: string[]
  removedCount: number
}

export interface ProgressClockNormalizationResult {
  state: GameState
  normalizedClockIds: string[]
  normalizedCount: number
}

export interface EncounterAftermathCleanupResult {
  state: GameState
  cleanedEncounterIds: string[]
  removedQueueEventIds: string[]
  cleanedCount: number
}

export interface ClearAuthoredContextResult {
  state: GameState
  cleared: boolean
  previousContextId?: string
}

function normalizeString(value: string | undefined | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function buildRuntimeStateFromView(state: GameState): RuntimeState {
  if (state.runtimeState) {
    return state.runtimeState
  }

  const runtime = readGameStateManager(state)
  return {
    player: { ...runtime.player },
    globalFlags: { ...runtime.globalFlags },
    oneShotEvents: Object.fromEntries(
      Object.entries(runtime.oneShotEvents).map(([eventId, event]) => [eventId, { ...event }])
    ),
    currentLocation: { ...runtime.currentLocation },
    sceneHistory: runtime.sceneHistory.map((entry) => ({
      ...entry,
      ...(entry.tags ? { tags: [...entry.tags] } : {}),
    })),
    encounterState: Object.fromEntries(
      Object.entries(runtime.encounterState).map(([encounterId, encounter]) => [
        encounterId,
        {
          ...encounter,
          hiddenModifierIds: [...encounter.hiddenModifierIds],
          revealedModifierIds: [...encounter.revealedModifierIds],
          flags: { ...encounter.flags },
          ...(encounter.followUpIds ? { followUpIds: [...encounter.followUpIds] } : {}),
        },
      ])
    ),
    progressClocks: Object.fromEntries(
      Object.entries(runtime.progressClocks).map(([clockId, clock]) => [clockId, { ...clock }])
    ),
    eventQueue: {
      entries: runtime.eventQueue.entries.map((entry) => ({
        ...entry,
        ...(entry.payload ? { payload: { ...entry.payload } } : {}),
      })),
      nextSequence: runtime.eventQueue.nextSequence,
    },
    ui: {
      ...runtime.ui,
      ...(runtime.ui.authoring
        ? {
            authoring: {
              ...runtime.ui.authoring,
              ...(runtime.ui.authoring.lastFollowUpIds
                ? { lastFollowUpIds: [...runtime.ui.authoring.lastFollowUpIds] }
                : {}),
            },
          }
        : {}),
      debug: {
        ...runtime.ui.debug,
        flags: { ...runtime.ui.debug.flags },
        ...(runtime.ui.debug.eventLog
          ? {
              eventLog: runtime.ui.debug.eventLog.map((entry) => ({
                ...entry,
                ...(entry.details ? { details: { ...entry.details } } : {}),
              })),
            }
          : {}),
      },
    },
  }
}

function toStableUnique(values: readonly string[]) {
  return [...new Set(values.filter((value) => value.length > 0))]
}

function haveSameStringValues(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value) => right.includes(value))
}

function compareQueueEventsByInsertion(left: RuntimeQueuedEvent, right: RuntimeQueuedEvent) {
  const leftWeek = left.week ?? 0
  const rightWeek = right.week ?? 0
  if (leftWeek !== rightWeek) {
    return leftWeek - rightWeek
  }
  return left.id.localeCompare(right.id)
}

function isRuntimePayloadValueValid(value: unknown) {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    (Array.isArray(value) && value.every((entry) => typeof entry === 'string'))
  )
}

function pushIssue(
  issues: StabilityIssue[],
  issue: StabilityIssue
) {
  issues.push(issue)
}

function buildKnownAuthoredTargetCatalog(state: GameState) {
  const triggerIds = FRONT_DESK_SCENE_TRIGGERS.map((trigger) => trigger.id)
  const triggerTargetIds = FRONT_DESK_SCENE_TRIGGERS.map((trigger) => trigger.targetId ?? trigger.id)

  const baselineChoiceTargetIds = [
    ...buildWeeklyReportTutorialChoices(),
    ...buildBreachFollowUpChoices(),
    ...buildSpecialRecruitOpportunityChoices({ id: 'stability-candidate', name: 'Stability Candidate' }),
    ...buildHostileFactionResponseChoices({ id: 'stability-faction', label: 'Stability Faction' }),
  ]
    .map((choice) => normalizeString(choice.nextTargetId))
    .filter((targetId) => targetId.length > 0)

  const frontDeskView = getFrontDeskBriefingView(state)
  const activeNoticeIds = frontDeskView.notices.map((notice) => notice.id)
  const activeChoiceTargetIds = frontDeskView.notices.flatMap((notice) =>
    (notice.choices ?? []).map((choice) => normalizeString(choice.nextTargetId)).filter((targetId) => targetId.length > 0)
  )

  const targetIds = toStableUnique([
    ...triggerIds,
    ...triggerTargetIds,
    ...baselineChoiceTargetIds,
    ...activeNoticeIds,
    ...activeChoiceTargetIds,
    ...frontDeskView.debug.noticeRouteIds,
  ])

  const contextIds = toStableUnique([
    'frontdesk.dashboard',
    ...frontDeskView.debug.noticeRouteIds,
    ...frontDeskView.notices.map((notice) => notice.id),
  ])

  return {
    targetIds: new Set(targetIds),
    contextIds: new Set(contextIds),
    frontDeskView,
  }
}

export function hasSafeFrontDeskFallback(state: GameState) {
  const { frontDeskView } = buildKnownAuthoredTargetCatalog(state)
  const reasons: string[] = []

  if (normalizeString(frontDeskView.directorMessage).length === 0) {
    reasons.push('missing-director-message')
  }

  if (frontDeskView.notices.length === 0) {
    reasons.push('no-notices')
  }

  if (frontDeskView.debug.noticeRouteIds.length === 0) {
    reasons.push('no-notice-route-ids')
  }

  return {
    safe: reasons.length === 0,
    reasons,
    directorMessageRouteId: frontDeskView.debug.directorMessageRouteId,
  }
}

export function analyzeRuntimeStability(state: GameState): StabilityReport {
  const runtime = readGameStateManager(state)
  const issues: StabilityIssue[] = []
  const recoveryIds = new Set<StabilityRecoveryAction['id']>()
  const catalog = buildKnownAuthoredTargetCatalog(state)

  // Queue checks
  const sortedByInsertion = [...runtime.eventQueue.entries].sort(compareQueueEventsByInsertion)
  const isInsertionOrderStable = runtime.eventQueue.entries.every(
    (entry, index) => entry.id === sortedByInsertion[index]?.id
  )

  if (!isInsertionOrderStable) {
    pushIssue(issues, {
      id: 'queue.ordering-unstable',
      category: 'event-queue',
      severity: 'warning',
      summary: 'Runtime queue ordering is not stable by insertion metadata.',
      details: 'Queue entries appear reordered relative to week/id insertion assumptions.',
      recoveryActions: ['prune-invalid-queue-events'],
    })
    recoveryIds.add('prune-invalid-queue-events')
  }

  const seenQueueFingerprints = new Set<string>()
  const seenAuthoredFollowUpTargets = new Set<string>()
  for (const queueEvent of runtime.eventQueue.entries) {
    const type = normalizeString(queueEvent.type)
    const targetId = normalizeString(queueEvent.targetId)

    if (targetId.length === 0) {
      pushIssue(issues, {
        id: `queue.missing-target-id.${queueEvent.id}`,
        category: 'event-queue',
        severity: 'error',
        summary: `Queue event ${queueEvent.id} has empty target id.`,
        recoveryActions: ['prune-invalid-queue-events'],
      })
      recoveryIds.add('prune-invalid-queue-events')
    }

    if (queueEvent.payload) {
      const invalidPayloadKeys = Object.entries(queueEvent.payload)
        .filter(([, payloadValue]) => !isRuntimePayloadValueValid(payloadValue))
        .map(([payloadKey]) => payloadKey)
      if (invalidPayloadKeys.length > 0) {
        pushIssue(issues, {
          id: `queue.payload-malformed.${queueEvent.id}`,
          category: 'event-queue',
          severity: 'warning',
          summary: `Queue event ${queueEvent.id} has malformed payload values.`,
          details: `Invalid payload keys: ${invalidPayloadKeys.join(', ')}`,
          recoveryActions: ['prune-invalid-queue-events'],
        })
        recoveryIds.add('prune-invalid-queue-events')
      }
    }

    if (type === 'authored.follow_up' && targetId.length > 0 && !catalog.targetIds.has(targetId)) {
      pushIssue(issues, {
        id: `queue.missing-target.${queueEvent.id}`,
        category: 'event-queue',
        severity: 'error',
        summary: `Queued authored follow-up points to unknown target (${targetId}).`,
        details: `Queue event ${queueEvent.id} is stale relative to known authored targets.`,
        recoveryActions: ['prune-invalid-queue-events'],
      })
      recoveryIds.add('prune-invalid-queue-events')
    }

    if (queueEvent.week !== undefined && queueEvent.week > state.week) {
      pushIssue(issues, {
        id: `queue.future-week.${queueEvent.id}`,
        category: 'event-queue',
        severity: 'warning',
        summary: `Queue event ${queueEvent.id} is stamped in a future week (${queueEvent.week}).`,
        recoveryActions: ['prune-invalid-queue-events'],
      })
      recoveryIds.add('prune-invalid-queue-events')
    }

    if (type === 'encounter.follow_up' && targetId.startsWith('encounter.')) {
      const encounter = runtime.encounterState[targetId]
      if (!encounter) {
        pushIssue(issues, {
          id: `queue.stale-encounter.${queueEvent.id}`,
          category: 'event-queue',
          severity: 'warning',
          summary: `Encounter follow-up references missing encounter runtime (${targetId}).`,
          recoveryActions: ['prune-invalid-queue-events', 'repair-encounter-runtime-records'],
        })
        recoveryIds.add('prune-invalid-queue-events')
        recoveryIds.add('repair-encounter-runtime-records')
      }
    }

    if (type === 'authored.follow_up' && targetId.length > 0) {
      if (seenAuthoredFollowUpTargets.has(targetId)) {
        pushIssue(issues, {
          id: `queue.duplicate-target.${queueEvent.id}`,
          category: 'event-queue',
          severity: 'warning',
          summary: `Duplicate authored follow-up target queued (${targetId}).`,
          details: 'Multiple identical authored follow-up targets may indicate stale aftermath accumulation.',
          recoveryActions: ['prune-invalid-queue-events'],
        })
        recoveryIds.add('prune-invalid-queue-events')
      }
      seenAuthoredFollowUpTargets.add(targetId)
    }

    const fingerprint = `${type}|${targetId}|${normalizeString(queueEvent.contextId)}|${normalizeString(queueEvent.source)}`
    if (seenQueueFingerprints.has(fingerprint) && type === 'authored.follow_up') {
      pushIssue(issues, {
        id: `queue.duplicate.${queueEvent.id}`,
        category: 'event-queue',
        severity: 'warning',
        summary: `Duplicate authored follow-up queue item detected (${targetId}).`,
        recoveryActions: ['prune-invalid-queue-events'],
      })
      recoveryIds.add('prune-invalid-queue-events')
    }
    seenQueueFingerprints.add(fingerprint)
  }

  if (runtime.eventQueue.nextSequence <= runtime.eventQueue.entries.length) {
    pushIssue(issues, {
      id: 'queue.next-sequence-inconsistent',
      category: 'event-queue',
      severity: 'warning',
      summary: 'Runtime queue nextSequence is not greater than current entry count.',
      recoveryActions: ['prune-invalid-queue-events'],
    })
    recoveryIds.add('prune-invalid-queue-events')
  }

  // Authored context checks
  const authoredContextId = normalizeString(runtime.ui.authoring?.activeContextId)
  if (authoredContextId.length > 0 && !catalog.contextIds.has(authoredContextId)) {
    pushIssue(issues, {
      id: 'authored-context.invalid-active-context',
      category: 'authored-context',
      severity: 'error',
      summary: `Active authored context is stale (${authoredContextId}).`,
      details: 'Context id no longer matches known routed front-desk notice/context ids.',
      recoveryActions: ['clear-stale-authored-context'],
    })
    recoveryIds.add('clear-stale-authored-context')
  }

  if (authoredContextId.length > 0) {
    const queueContextMatch = runtime.eventQueue.entries.some(
      (entry) => normalizeString(entry.contextId) === authoredContextId
    )
    const noticeContextMatch = catalog.frontDeskView.notices.some((notice) => notice.id === authoredContextId)
    if (!queueContextMatch && !noticeContextMatch) {
      pushIssue(issues, {
        id: 'authored-context.orphaned',
        category: 'authored-context',
        severity: 'warning',
        summary: `Active authored context (${authoredContextId}) has no active queue or notice linkage.`,
        recoveryActions: ['clear-stale-authored-context'],
      })
      recoveryIds.add('clear-stale-authored-context')
    }
  }

  // Encounter checks
  for (const [encounterKey, encounter] of Object.entries(runtime.encounterState)) {
    if (encounter.encounterId !== encounterKey) {
      pushIssue(issues, {
        id: `encounter.key-mismatch.${encounterKey}`,
        category: 'encounter-runtime',
        severity: 'warning',
        summary: `Encounter key/id mismatch for ${encounterKey}.`,
        recoveryActions: ['repair-encounter-runtime-records'],
      })
      recoveryIds.add('repair-encounter-runtime-records')
    }

    if (encounter.status === 'active' && encounter.startedWeek === undefined) {
      pushIssue(issues, {
        id: `encounter.active-missing-start.${encounterKey}`,
        category: 'encounter-runtime',
        severity: 'error',
        summary: `Active encounter ${encounterKey} is missing startedWeek.`,
        recoveryActions: ['repair-encounter-runtime-records'],
      })
      recoveryIds.add('repair-encounter-runtime-records')
    }

    if (encounter.status === 'resolved' && (!encounter.latestOutcome || encounter.resolvedWeek === undefined)) {
      pushIssue(issues, {
        id: `encounter.resolved-incomplete.${encounterKey}`,
        category: 'encounter-runtime',
        severity: 'error',
        summary: `Resolved encounter ${encounterKey} is missing outcome metadata.`,
        recoveryActions: ['repair-encounter-runtime-records'],
      })
      recoveryIds.add('repair-encounter-runtime-records')
    }

    if (
      encounter.status === 'active' &&
      (encounter.latestOutcome !== undefined || encounter.resolvedWeek !== undefined)
    ) {
      pushIssue(issues, {
        id: `encounter.active-resolved-mismatch.${encounterKey}`,
        category: 'encounter-runtime',
        severity: 'error',
        summary: `Encounter ${encounterKey} is active but also carries resolved metadata.`,
        recoveryActions: ['repair-encounter-runtime-records', 'clear-invalid-encounter-aftermath-references'],
      })
      recoveryIds.add('repair-encounter-runtime-records')
      recoveryIds.add('clear-invalid-encounter-aftermath-references')
    }

    const invalidFollowUpRefs = (encounter.followUpIds ?? []).filter(
      (followUpId) => normalizeString(followUpId).length > 0 && !catalog.targetIds.has(followUpId)
    )
    if (invalidFollowUpRefs.length > 0) {
      pushIssue(issues, {
        id: `encounter.invalid-aftermath.${encounterKey}`,
        category: 'encounter-runtime',
        severity: 'warning',
        summary: `Encounter ${encounterKey} has invalid aftermath references.`,
        details: `Invalid follow-up ids: ${invalidFollowUpRefs.join(', ')}`,
        recoveryActions: ['clear-invalid-encounter-aftermath-references'],
      })
      recoveryIds.add('clear-invalid-encounter-aftermath-references')
    }
  }

  // One-shot enforcement checks
  for (const trigger of FRONT_DESK_SCENE_TRIGGERS) {
    const evaluation = evaluateSceneTrigger(state, trigger)
    const consumeId = normalizeString(evaluation.consumeId)

    if (evaluation.mode === 'one_shot' && consumeId.length > 0 && hasConsumedOneShotContent(state, consumeId) && evaluation.eligible) {
      pushIssue(issues, {
        id: `oneshot.eligible-after-consumed.${trigger.id}`,
        category: 'one-shot-enforcement',
        severity: 'error',
        summary: `One-shot trigger ${trigger.id} remains eligible after consumption.`,
        recoveryActions: ['clear-stale-authored-context', 'review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('clear-stale-authored-context')
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if (evaluation.eligible && normalizeString(evaluation.targetId).length > 0) {
      const targetId = normalizeString(evaluation.targetId)
      const routedNotice = catalog.frontDeskView.debug.noticeRouteIds.includes(targetId)
      const routedChoiceTarget = catalog.frontDeskView.notices.some((notice) =>
        (notice.choices ?? []).some((choice) => normalizeString(choice.nextTargetId) === targetId)
      )

      if (!routedNotice && !routedChoiceTarget) {
        pushIssue(issues, {
          id: `trigger.eligible-unroutable.${trigger.id}`,
          category: 'trigger-consistency',
          severity: 'warning',
          summary: `Eligible trigger ${trigger.id} points to target not currently routable (${targetId}).`,
          recoveryActions: ['review-frontdesk-fallback-routing'],
        })
        recoveryIds.add('review-frontdesk-fallback-routing')
      }
    }
  }

  // Progress clock checks (normalized view)
  for (const clock of listProgressClocks(state)) {
    if (clock.max < 1 || clock.value < 0 || clock.value > clock.max) {
      pushIssue(issues, {
        id: `clock.range-invalid.${clock.id}`,
        category: 'progress-clock',
        severity: 'error',
        summary: `Progress clock ${clock.id} is outside valid range (${clock.value}/${clock.max}).`,
        recoveryActions: ['repair-progress-clock-records'],
      })
      recoveryIds.add('repair-progress-clock-records')
    }

    if (clock.completedAtWeek !== undefined && clock.value < clock.max) {
      pushIssue(issues, {
        id: `clock.completion-inconsistent.${clock.id}`,
        category: 'progress-clock',
        severity: 'warning',
        summary: `Progress clock ${clock.id} has completedAtWeek but is not at max.`,
        recoveryActions: ['repair-progress-clock-records'],
      })
      recoveryIds.add('repair-progress-clock-records')
    }

    const definition = getProgressClockDefinition(clock.id)
    if (definition) {
      if (clock.max !== definition.max) {
        pushIssue(issues, {
          id: `clock.definition-mismatch.max.${clock.id}`,
          category: 'progress-clock',
          severity: 'warning',
          summary: `Progress clock ${clock.id} max diverges from authored definition (${clock.max} vs ${definition.max}).`,
          recoveryActions: ['normalize-invalid-progress-clocks', 'repair-progress-clock-records'],
        })
        recoveryIds.add('normalize-invalid-progress-clocks')
        recoveryIds.add('repair-progress-clock-records')
      }

      if (normalizeString(clock.label) !== normalizeString(definition.label)) {
        pushIssue(issues, {
          id: `clock.definition-mismatch.label.${clock.id}`,
          category: 'progress-clock',
          severity: 'warning',
          summary: `Progress clock ${clock.id} label diverges from authored definition.`,
          recoveryActions: ['normalize-invalid-progress-clocks', 'repair-progress-clock-records'],
        })
        recoveryIds.add('normalize-invalid-progress-clocks')
        recoveryIds.add('repair-progress-clock-records')
      }
    }
  }

  // Progress clock checks (raw runtime payload) to catch pre-normalization desync.
  const rawProgressClocks = state.runtimeState?.progressClocks ?? {}
  for (const [clockId, rawClock] of Object.entries(rawProgressClocks)) {
    const rawValue = typeof rawClock?.value === 'number' ? rawClock.value : Number.NaN
    const rawMax = typeof rawClock?.max === 'number' ? rawClock.max : Number.NaN
    const hasCompletedAtWeek = rawClock?.completedAtWeek !== undefined

    if (!Number.isFinite(rawMax) || rawMax < 1 || !Number.isFinite(rawValue) || rawValue < 0 || rawValue > rawMax) {
      pushIssue(issues, {
        id: `clock.range-invalid.raw.${clockId}`,
        category: 'progress-clock',
        severity: 'error',
        summary: `Raw progress clock ${clockId} is outside valid range (${String(rawValue)}/${String(rawMax)}).`,
        recoveryActions: ['repair-progress-clock-records'],
      })
      recoveryIds.add('repair-progress-clock-records')
      continue
    }

    if (hasCompletedAtWeek && rawValue < rawMax) {
      pushIssue(issues, {
        id: `clock.completion-inconsistent.raw.${clockId}`,
        category: 'progress-clock',
        severity: 'warning',
        summary: `Raw progress clock ${clockId} has completedAtWeek but is below max.`,
        recoveryActions: ['repair-progress-clock-records'],
      })
      recoveryIds.add('repair-progress-clock-records')
    }
  }

  // Save/load restored-state sanity checks.
  if (state.runtimeState) {
    const selectedCaseId = normalizeString(runtime.ui.selectedCaseId)
    if (selectedCaseId.length > 0 && !state.cases[selectedCaseId]) {
      pushIssue(issues, {
        id: 'restored-state.selected-case-invalid',
        category: 'restored-state',
        severity: 'warning',
        summary: `Restored selectedCaseId is stale (${selectedCaseId}).`,
        recoveryActions: ['clear-stale-authored-context'],
      })
      recoveryIds.add('clear-stale-authored-context')
    }

    const selectedTeamId = normalizeString(runtime.ui.selectedTeamId)
    if (selectedTeamId.length > 0 && !state.teams[selectedTeamId]) {
      pushIssue(issues, {
        id: 'restored-state.selected-team-invalid',
        category: 'restored-state',
        severity: 'warning',
        summary: `Restored selectedTeamId is stale (${selectedTeamId}).`,
        recoveryActions: ['clear-stale-authored-context'],
      })
      recoveryIds.add('clear-stale-authored-context')
    }

    const selectedAgentId = normalizeString(runtime.ui.selectedAgentId)
    if (selectedAgentId.length > 0 && !state.agents[selectedAgentId]) {
      pushIssue(issues, {
        id: 'restored-state.selected-agent-invalid',
        category: 'restored-state',
        severity: 'warning',
        summary: `Restored selectedAgentId is stale (${selectedAgentId}).`,
        recoveryActions: ['clear-stale-authored-context'],
      })
      recoveryIds.add('clear-stale-authored-context')
    }
  }

  for (const currentCase of Object.values(state.cases)) {
    if (
      !Number.isFinite(currentCase.intelConfidence) ||
      currentCase.intelConfidence < 0 ||
      currentCase.intelConfidence > 1
    ) {
      pushIssue(issues, {
        id: `restored-state.intel-confidence-invalid.${currentCase.id}`,
        category: 'restored-state',
        severity: 'error',
        summary: `Mission ${currentCase.id} has invalid intel confidence (${String(currentCase.intelConfidence)}).`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if (
      !Number.isFinite(currentCase.intelUncertainty) ||
      currentCase.intelUncertainty < 0 ||
      currentCase.intelUncertainty > 1
    ) {
      pushIssue(issues, {
        id: `restored-state.intel-uncertainty-invalid.${currentCase.id}`,
        category: 'restored-state',
        severity: 'error',
        summary: `Mission ${currentCase.id} has invalid intel uncertainty (${String(currentCase.intelUncertainty)}).`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if (
      !Number.isFinite(currentCase.intelLastUpdatedWeek) ||
      currentCase.intelLastUpdatedWeek < 1
    ) {
      pushIssue(issues, {
        id: `restored-state.intel-last-updated-invalid.${currentCase.id}`,
        category: 'restored-state',
        severity: 'error',
        summary: `Mission ${currentCase.id} has invalid intelLastUpdatedWeek (${String(currentCase.intelLastUpdatedWeek)}).`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if (
      Number.isFinite(currentCase.intelLastUpdatedWeek) &&
      currentCase.intelLastUpdatedWeek > state.week
    ) {
      pushIssue(issues, {
        id: `restored-state.intel-last-updated-future.${currentCase.id}`,
        category: 'restored-state',
        severity: 'warning',
        summary: `Mission ${currentCase.id} has future-dated intelLastUpdatedWeek (${currentCase.intelLastUpdatedWeek}).`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }
  }

  if (state.researchState) {
    for (const projectId of state.researchState.completedProjectIds) {
      const project = state.researchState.projects[projectId]

      if (!project) {
        pushIssue(issues, {
          id: `restored-state.research-project-missing.${projectId}`,
          category: 'restored-state',
          severity: 'warning',
          summary: `Research state marks completed project ${projectId} without a matching project record.`,
          recoveryActions: ['review-frontdesk-fallback-routing'],
        })
        recoveryIds.add('review-frontdesk-fallback-routing')
        continue
      }

      if (project.status !== 'completed') {
        pushIssue(issues, {
          id: `restored-state.research-project-status-mismatch.${projectId}`,
          category: 'restored-state',
          severity: 'warning',
          summary: `Research state marks ${projectId} completed but the project status is ${project.status}.`,
          recoveryActions: ['review-frontdesk-fallback-routing'],
        })
        recoveryIds.add('review-frontdesk-fallback-routing')
      }
    }
  }

  if (state.agency?.fundingState) {
    const canonicalFundingState = getCanonicalFundingState(state)
    const fundingPressure = assessFundingPressure(state)

    if (state.agency.fundingState.funding !== state.funding) {
      pushIssue(issues, {
        id: 'restored-state.funding-mirror-mismatch',
        category: 'restored-state',
        severity: 'warning',
        summary: `Agency fundingState (${state.agency.fundingState.funding}) does not match top-level funding (${state.funding}).`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if (state.agency.fundingState.budgetPressure !== canonicalFundingState.budgetPressure) {
      pushIssue(issues, {
        id: 'restored-state.funding-budget-pressure-mismatch',
        category: 'restored-state',
        severity: 'warning',
        summary: `Funding budget pressure (${state.agency.fundingState.budgetPressure}) is stale relative to canonical pressure (${canonicalFundingState.budgetPressure}).`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    for (const backlogEntry of state.agency.fundingState.procurementBacklog) {
      if (backlogEntry.status === 'pending' && typeof backlogEntry.fulfilledWeek === 'number') {
        pushIssue(issues, {
          id: `restored-state.procurement-pending-fulfilled-week.${backlogEntry.requestId}`,
          category: 'restored-state',
          severity: 'warning',
          summary: `Pending procurement request ${backlogEntry.requestId} has a fulfilledWeek set.`,
          recoveryActions: ['review-frontdesk-fallback-routing'],
        })
        recoveryIds.add('review-frontdesk-fallback-routing')
      }

      if (
        (backlogEntry.status === 'fulfilled' || backlogEntry.status === 'cancelled') &&
        typeof backlogEntry.fulfilledWeek !== 'number'
      ) {
        pushIssue(issues, {
          id: `restored-state.procurement-terminal-missing-week.${backlogEntry.requestId}`,
          category: 'restored-state',
          severity: 'warning',
          summary: `Completed procurement request ${backlogEntry.requestId} is missing fulfilledWeek metadata.`,
          recoveryActions: ['review-frontdesk-fallback-routing'],
        })
        recoveryIds.add('review-frontdesk-fallback-routing')
      }
    }

    for (const requestId of fundingPressure.staleProcurementRequestIds) {
      pushIssue(issues, {
        id: `restored-state.procurement-stale-pending.${requestId}`,
        category: 'restored-state',
        severity: 'warning',
        summary: `Procurement request ${requestId} is still pending past the calibrated stale-backlog window.`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }
  }

  if (state.replacementPressureState) {
    const canonicalReplacementPressureState = buildReplacementPressureState(state)

    if (
      JSON.stringify(state.replacementPressureState) !==
      JSON.stringify(canonicalReplacementPressureState)
    ) {
      pushIssue(issues, {
        id: 'restored-state.replacement-pressure-mismatch',
        category: 'restored-state',
        severity: 'warning',
        summary: `Replacement pressure summary is stale relative to canonical attrition state (${state.replacementPressureState.replacementPressure} vs ${canonicalReplacementPressureState.replacementPressure}).`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if (
      state.replacementPressureState.criticalRoleLossCount >
      state.replacementPressureState.activeLossCount
    ) {
      pushIssue(issues, {
        id: 'restored-state.replacement-pressure-invalid-critical-loss-count',
        category: 'restored-state',
        severity: 'error',
        summary: `Replacement pressure state reports more critical losses than active losses (${state.replacementPressureState.criticalRoleLossCount} > ${state.replacementPressureState.activeLossCount}).`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }
  }

  // Recruitment funnel restored-state sanity checks.
  for (const candidate of state.candidates) {
    const stage = getCandidateFunnelStage(candidate)
    const hireStatus = normalizeCandidateHireStatus(candidate.hireStatus)

    if (stage === 'hired') {
      pushIssue(issues, {
        id: `restored-state.candidate-still-hired.${candidate.id}`,
        category: 'restored-state',
        severity: 'warning',
        summary: `Candidate ${candidate.id} remains in pool with hired funnel stage.`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if (stage === 'lost' && hireStatus !== 'expired') {
      pushIssue(issues, {
        id: `restored-state.candidate-lost-hirestatus-mismatch.${candidate.id}`,
        category: 'restored-state',
        severity: 'warning',
        summary: `Candidate ${candidate.id} marked lost but hire status is ${hireStatus}.`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if ((stage === 'contacted' || stage === 'screening') && hireStatus === 'expired') {
      pushIssue(issues, {
        id: `restored-state.candidate-active-stage-expired.${candidate.id}`,
        category: 'restored-state',
        severity: 'warning',
        summary: `Candidate ${candidate.id} is ${stage} but already expired.`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if (
      candidate.availabilityWindow &&
      candidate.availabilityWindow.closesWeek < candidate.availabilityWindow.opensWeek
    ) {
      pushIssue(issues, {
        id: `restored-state.candidate-invalid-availability.${candidate.id}`,
        category: 'restored-state',
        severity: 'warning',
        summary: `Candidate ${candidate.id} has invalid availability window bounds.`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if (
      typeof candidate.createdWeek === 'number' &&
      typeof candidate.lastUpdatedWeek === 'number' &&
      candidate.lastUpdatedWeek < candidate.createdWeek
    ) {
      pushIssue(issues, {
        id: `restored-state.candidate-week-mismatch.${candidate.id}`,
        category: 'restored-state',
        severity: 'warning',
        summary: `Candidate ${candidate.id} has lastUpdatedWeek earlier than createdWeek.`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }
  }

  // Loadout consistency checks.
  for (const agent of Object.values(state.agents)) {
    const loadoutConflicts = getAgentLoadoutConflicts(agent)
    for (const conflict of loadoutConflicts) {
      pushIssue(issues, {
        id: `loadout.mutual-exclusion.${agent.id}.${conflict}`,
        category: 'loadout-consistency',
        severity: 'error',
        summary: `Agent ${agent.id} has mutually exclusive loadout combination (${conflict}).`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    for (const slot of EQUIPMENT_SLOT_KINDS) {
      const itemId = getEquipmentSlotItemId(agent.equipmentSlots, slot)
      if (!itemId) {
        continue
      }

      const definition = getEquipmentDefinition(itemId)
      if (!definition) {
        pushIssue(issues, {
          id: `loadout.unknown-item.${agent.id}.${slot}`,
          category: 'loadout-consistency',
          severity: 'warning',
          summary: `Agent ${agent.id} has unknown equipped item ${itemId} in slot ${slot}.`,
          recoveryActions: ['review-frontdesk-fallback-routing'],
        })
        recoveryIds.add('review-frontdesk-fallback-routing')
        continue
      }

      if (!definition.allowedSlots.includes(slot)) {
        pushIssue(issues, {
          id: `loadout.slot-mismatch.${agent.id}.${slot}`,
          category: 'loadout-consistency',
          severity: 'error',
          summary: `Agent ${agent.id} has ${itemId} in incompatible slot ${slot}.`,
          recoveryActions: ['review-frontdesk-fallback-routing'],
        })
        recoveryIds.add('review-frontdesk-fallback-routing')
      }

      if (!isEquipmentRoleCompatible(agent.role, definition)) {
        pushIssue(issues, {
          id: `loadout.role-mismatch.${agent.id}.${slot}`,
          category: 'loadout-consistency',
          severity: 'warning',
          summary: `Agent ${agent.id} (${agent.role}) has role-incompatible item ${itemId}.`,
          recoveryActions: ['review-frontdesk-fallback-routing'],
        })
        recoveryIds.add('review-frontdesk-fallback-routing')
      }

      if (!isEquipmentPrerequisiteSatisfied(agent, itemId, state)) {
        pushIssue(issues, {
          id: `loadout.prerequisite-mismatch.${agent.id}.${slot}`,
          category: 'loadout-consistency',
          severity: 'warning',
          summary: `Agent ${agent.id} fails prerequisites for equipped item ${itemId}.`,
          recoveryActions: ['review-frontdesk-fallback-routing'],
        })
        recoveryIds.add('review-frontdesk-fallback-routing')
      }
    }
  }

  // Training and certification consistency checks.
  const certificationDefinitions = new Map(
    getCertificationDefinitions().map((definition) => [definition.certificationId, definition] as const)
  )

  for (const queueEntry of state.trainingQueue) {
    const program = getTrainingProgram(queueEntry.trainingId)
    if (!program) {
      continue
    }

    const researchAssessment = assessResearchRequirements(state, program.requiredResearchIds ?? [])
    if (!researchAssessment.satisfied) {
      pushIssue(issues, {
        id: `training.program-research-gated.${queueEntry.id}`,
        category: 'training-certification',
        severity: 'warning',
        summary: `Training queue entry ${queueEntry.trainingId} is missing required research (${researchAssessment.missingIds.join(', ')}).`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }
  }

  for (const agent of Object.values(state.agents)) {
    const progression = agent.progression
    const trainingHistory = progression?.trainingHistory ?? []

    for (const historyEntry of trainingHistory) {
      if (!getTrainingProgram(historyEntry.trainingId)) {
        pushIssue(issues, {
          id: `training.history-stale-reference.${agent.id}.${historyEntry.trainingId}`,
          category: 'training-certification',
          severity: 'warning',
          summary: `Agent ${agent.id} has stale training history reference ${historyEntry.trainingId}.`,
          recoveryActions: ['review-frontdesk-fallback-routing'],
        })
        recoveryIds.add('review-frontdesk-fallback-routing')
      }
    }

    const certProgress = progression?.certProgress ?? {}
    for (const certificationId of Object.keys(certProgress)) {
      if (!certificationDefinitions.has(certificationId)) {
        pushIssue(issues, {
          id: `training.cert-progress-stale-reference.${agent.id}.${certificationId}`,
          category: 'training-certification',
          severity: 'warning',
          summary: `Agent ${agent.id} has stale certification progress reference ${certificationId}.`,
          recoveryActions: ['review-frontdesk-fallback-routing'],
        })
        recoveryIds.add('review-frontdesk-fallback-routing')
      }
    }

    const certifications = progression?.certifications ?? {}
    for (const [certificationId, certification] of Object.entries(certifications)) {
      const definition = certificationDefinitions.get(certificationId)
      if (!definition) {
        pushIssue(issues, {
          id: `training.certification-stale-reference.${agent.id}.${certificationId}`,
          category: 'training-certification',
          severity: 'warning',
          summary: `Agent ${agent.id} has stale certification record ${certificationId}.`,
          recoveryActions: ['review-frontdesk-fallback-routing'],
        })
        recoveryIds.add('review-frontdesk-fallback-routing')
        continue
      }

      const historyIds = new Set(trainingHistory.map((entry) => entry.trainingId))
      const completedPrerequisites = definition.prerequisiteTrainingIds.filter((trainingId) =>
        historyIds.has(trainingId)
      ).length
      const progressValue = Math.max(0, Math.trunc(certProgress[certificationId] ?? 0))
      const prerequisitesSatisfied =
        completedPrerequisites >= definition.prerequisiteTrainingIds.length &&
        progressValue >= definition.requiredProgress

      if (certification.state === 'eligible_review' && !prerequisitesSatisfied) {
        pushIssue(issues, {
          id: `training.certification-invalid-transition.${agent.id}.${certificationId}`,
          category: 'training-certification',
          severity: 'error',
          summary: `Agent ${agent.id} has certification ${certificationId} in eligible_review without prerequisites.`,
          recoveryActions: ['review-frontdesk-fallback-routing'],
        })
        recoveryIds.add('review-frontdesk-fallback-routing')
      }

      if (certification.state === 'certified' && !prerequisitesSatisfied) {
        pushIssue(issues, {
          id: `training.certification-certified-without-prereqs.${agent.id}.${certificationId}`,
          category: 'training-certification',
          severity: 'error',
          summary: `Agent ${agent.id} is certified for ${certificationId} but prerequisites are incomplete.`,
          recoveryActions: ['review-frontdesk-fallback-routing'],
        })
        recoveryIds.add('review-frontdesk-fallback-routing')
      }

      if (
        certification.state === 'certified' &&
        typeof certification.expiresWeek === 'number' &&
        state.week >= certification.expiresWeek
      ) {
        pushIssue(issues, {
          id: `training.certification-expired-still-certified.${agent.id}.${certificationId}`,
          category: 'training-certification',
          severity: 'warning',
          summary: `Agent ${agent.id} still has certified state for expired certification ${certificationId}.`,
          recoveryActions: ['review-frontdesk-fallback-routing'],
        })
        recoveryIds.add('review-frontdesk-fallback-routing')
      }

      if (
        certification.state === 'expired' &&
        typeof certification.expiresWeek === 'number' &&
        state.week < certification.expiresWeek
      ) {
        pushIssue(issues, {
          id: `training.certification-expired-before-week.${agent.id}.${certificationId}`,
          category: 'training-certification',
          severity: 'warning',
          summary: `Agent ${agent.id} has certification ${certificationId} marked expired before expiry week.`,
          recoveryActions: ['review-frontdesk-fallback-routing'],
        })
        recoveryIds.add('review-frontdesk-fallback-routing')
      }
    }
  }

  // Team composition and cohesion consistency checks.
  const membershipIndex = new Map<string, string[]>()
  for (const team of Object.values(state.teams)) {
    const compositionState = buildTeamCompositionState(team, state.agents, state.teams)
    const activeMemberIds = (team.memberIds ?? team.agentIds ?? []).filter((memberId) =>
      Boolean(state.agents[memberId])
    )
    const hasExpiredCertificationMember = activeMemberIds.some((memberId) =>
      Object.values(state.agents[memberId]?.progression?.certifications ?? {}).some(
        (certification) => certification.state === 'expired'
      )
    )

    if (!compositionState.compositionValid) {
      pushIssue(issues, {
        id: `team.composition-invalid.${team.id}`,
        category: 'team-composition',
        severity: 'warning',
        summary: `Team ${team.id} has composition validation issues.`,
        details: compositionState.validationIssues.map((issue) => issue.detail).join(' | '),
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if (compositionState.cohesion.cohesionBand === 'fragile') {
      pushIssue(issues, {
        id: `team.cohesion-fragile.${team.id}`,
        category: 'team-composition',
        severity: 'warning',
        summary: `Team ${team.id} cohesion is fragile (${compositionState.cohesion.cohesionScore}).`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if (compositionState.compositionValid && hasExpiredCertificationMember) {
      pushIssue(issues, {
        id: `team.expired-certification-coverage.${team.id}`,
        category: 'team-composition',
        severity: 'warning',
        summary: `Team ${team.id} is composition-valid while containing members with expired certifications.`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if (team.leaderId && !(team.memberIds ?? team.agentIds ?? []).includes(team.leaderId)) {
      pushIssue(issues, {
        id: `team.leader-not-member.${team.id}`,
        category: 'team-composition',
        severity: 'error',
        summary: `Team ${team.id} leader ${team.leaderId} is not a team member.`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    for (const memberId of team.memberIds ?? team.agentIds ?? []) {
      const owners = membershipIndex.get(memberId) ?? []
      owners.push(team.id)
      membershipIndex.set(memberId, owners)
    }
  }

  for (const [memberId, teamIds] of membershipIndex.entries()) {
    if (teamIds.length > 1) {
      pushIssue(issues, {
        id: `team.duplicate-membership.${memberId}`,
        category: 'team-composition',
        severity: 'error',
        summary: `Agent ${memberId} is assigned to multiple teams (${teamIds.join(', ')}).`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }
  }

  // Deployment readiness consistency checks.
  for (const team of Object.values(state.teams)) {
    const storedReadiness = team.deploymentReadinessState
    const recomputedReadiness = buildTeamDeploymentReadinessState(state, team.id)

    if (!storedReadiness) {
      continue
    }

    if (storedReadiness.readinessCategory === 'mission_ready' && storedReadiness.hardBlockers.length > 0) {
      pushIssue(issues, {
        id: `deployment.readiness-category-mismatch.${team.id}`,
        category: 'deployment-readiness',
        severity: 'warning',
        summary: `Team ${team.id} is mission_ready while hard blockers are present.`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if (storedReadiness.estimatedDeployWeeks < 0 || storedReadiness.estimatedRecoveryWeeks < 0) {
      pushIssue(issues, {
        id: `deployment.invalid-estimated-weeks.${team.id}`,
        category: 'deployment-readiness',
        severity: 'error',
        summary: `Team ${team.id} has negative deployment/recovery week estimates.`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if (
      storedReadiness.intelPenalty !== undefined &&
      (!Number.isFinite(storedReadiness.intelPenalty) ||
        storedReadiness.intelPenalty < 0 ||
        storedReadiness.intelPenalty > 15)
    ) {
      pushIssue(issues, {
        id: `deployment.invalid-intel-penalty.${team.id}`,
        category: 'deployment-readiness',
        severity: 'error',
        summary: `Team ${team.id} has invalid deployment intel penalty (${String(storedReadiness.intelPenalty)}).`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if (
      storedReadiness.readinessCategory !== recomputedReadiness.readinessCategory ||
      storedReadiness.readinessScore !== recomputedReadiness.readinessScore ||
      storedReadiness.intelPenalty !== recomputedReadiness.intelPenalty
    ) {
      pushIssue(issues, {
        id: `deployment.stale-derived-readiness.${team.id}`,
        category: 'deployment-readiness',
        severity: 'warning',
        summary: `Team ${team.id} deployment readiness appears stale relative to canonical sources.`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if (
      (team.status?.state === 'recovering' && (team.status?.assignedCaseId ?? team.assignedCaseId)) ||
      (team.status?.state === 'ready' && (team.status?.assignedCaseId ?? team.assignedCaseId) && recomputedReadiness.hardBlockers.includes('capacity-locked'))
    ) {
      pushIssue(issues, {
        id: `deployment.impossible-team-status.${team.id}`,
        category: 'deployment-readiness',
        severity: 'error',
        summary: `Team ${team.id} has impossible status/assignment/readiness combination.`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }
  }

  // Mission intake / triage / routing checks.
  const missionRouting = normalizeMissionRoutingState(state)
  const seenMissionIds = new Set<string>()
  for (const missionId of missionRouting.orderedMissionIds) {
    if (seenMissionIds.has(missionId)) {
      pushIssue(issues, {
        id: `mission.queue-duplicate.${missionId}`,
        category: 'mission-routing',
        severity: 'warning',
        summary: `Mission queue contains duplicate id ${missionId}.`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
      continue
    }
    seenMissionIds.add(missionId)

    const mission = missionRouting.missions[missionId]
    const currentCase = state.cases[missionId]

    if (!mission || !currentCase) {
      pushIssue(issues, {
        id: `mission.stale-reference.${missionId}`,
        category: 'mission-routing',
        severity: 'error',
        summary: `Mission routing contains stale reference ${missionId}.`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
      continue
    }

    if (!state.templates[mission.templateId]) {
      pushIssue(issues, {
        id: `mission.stale-template.${missionId}`,
        category: 'mission-routing',
        severity: 'warning',
        summary: `Mission ${missionId} references unknown template ${mission.templateId}.`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if (mission.status === 'in_progress' && mission.assignedTeamIds.length === 0) {
      pushIssue(issues, {
        id: `mission.invalid-status-no-team.${missionId}`,
        category: 'mission-routing',
        severity: 'error',
        summary: `Mission ${missionId} is in_progress without assigned teams.`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    const missingAssignedTeams = mission.assignedTeamIds.filter((teamId) => !state.teams[teamId])
    if (missingAssignedTeams.length > 0) {
      pushIssue(issues, {
        id: `mission.invalid-assigned-teams.${missionId}`,
        category: 'mission-routing',
        severity: 'error',
        summary: `Mission ${missionId} has missing assigned teams (${missingAssignedTeams.join(', ')}).`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    const recomputedRouting = routeMission(state, missionId)
    const recomputedTriage = triageMission(state, currentCase)
    if (
      mission.triageScore !== recomputedTriage.score ||
      mission.priority !== recomputedTriage.priority ||
      !haveSameStringValues(mission.priorityReasonCodes, recomputedTriage.reasonCodes)
    ) {
      pushIssue(issues, {
        id: `mission.stale-triage.${missionId}`,
        category: 'mission-routing',
        severity: 'warning',
        summary: `Mission ${missionId} has stale triage values relative to canonical routing inputs.`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    const mismatchBlockers = mission.routingBlockers.filter(
      (blocker) => !recomputedRouting.routingBlockers.includes(blocker)
    )
    if (mismatchBlockers.length > 0) {
      pushIssue(issues, {
        id: `mission.blocker-mismatch.${missionId}`,
        category: 'mission-routing',
        severity: 'warning',
        summary: `Mission ${missionId} has stale routing blockers (${mismatchBlockers.join(', ')}).`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if (
      mission.routingState === 'assigned' &&
      mission.assignedTeamIds.length > 0 &&
      mission.routingBlockers.includes('missing-certification')
    ) {
      pushIssue(issues, {
        id: `mission.assigned-with-cert-blocker.${missionId}`,
        category: 'mission-routing',
        severity: 'warning',
        summary: `Mission ${missionId} is assigned while still marked missing-certification.`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }

    if (
      mission.timeCostSummary &&
      (mission.timeCostSummary.expectedTravelWeeks < 0 ||
        mission.timeCostSummary.expectedSetupWeeks < 0 ||
        mission.timeCostSummary.expectedResolutionWeeks < 0 ||
        mission.timeCostSummary.expectedRecoveryWeeks < 0 ||
        mission.timeCostSummary.expectedTotalWeeks < 1)
    ) {
      pushIssue(issues, {
        id: `deployment.invalid-time-cost.${missionId}`,
        category: 'deployment-readiness',
        severity: 'error',
        summary: `Mission ${missionId} has invalid deployment time-cost fields.`,
        recoveryActions: ['review-frontdesk-fallback-routing'],
      })
      recoveryIds.add('review-frontdesk-fallback-routing')
    }
  }

  // Fallback / softlock checks
  const fallback = hasSafeFrontDeskFallback(state)
  if (!fallback.safe) {
    pushIssue(issues, {
      id: 'routing.frontdesk-fallback-missing',
      category: 'routing-fallback',
      severity: 'error',
      summary: `Front-desk fallback safety failed (${fallback.reasons.join(', ')}).`,
      recoveryActions: ['review-frontdesk-fallback-routing', 'clear-stale-authored-context'],
    })
    recoveryIds.add('review-frontdesk-fallback-routing')
    recoveryIds.add('clear-stale-authored-context')
  }

  const errorCount = issues.filter((issue) => issue.severity === 'error').length
  const warningCount = issues.length - errorCount
  const categories = toStableUnique(issues.map((issue) => issue.category)) as StabilityIssueCategory[]

  const recoveryActionCatalog: Record<StabilityRecoveryAction['id'], StabilityRecoveryAction> = {
    'prune-invalid-queue-events': {
      id: 'prune-invalid-queue-events',
      label: 'Prune invalid queue events',
      description: 'Remove invalid or stale queue events flagged by stability checks.',
      mutating: true,
    },
    'clear-stale-authored-context': {
      id: 'clear-stale-authored-context',
      label: 'Clear stale authored context',
      description: 'Clear authored context breadcrumbs when they no longer map to valid content context.',
      mutating: true,
    },
    'normalize-invalid-progress-clocks': {
      id: 'normalize-invalid-progress-clocks',
      label: 'Normalize invalid progress clocks',
      description: 'Clamp invalid clock values and clear impossible completion markers.',
      mutating: true,
    },
    'clear-invalid-encounter-aftermath-references': {
      id: 'clear-invalid-encounter-aftermath-references',
      label: 'Clear invalid encounter aftermath references',
      description: 'Remove invalid encounter follow-up references and stale encounter aftermath queue entries.',
      mutating: true,
    },
    'review-frontdesk-fallback-routing': {
      id: 'review-frontdesk-fallback-routing',
      label: 'Review front-desk fallback routes',
      description: 'Validate notice fallback routes and baseline front-desk branch availability.',
      mutating: false,
    },
    'repair-encounter-runtime-records': {
      id: 'repair-encounter-runtime-records',
      label: 'Repair encounter runtime records',
      description: 'Inspect and repair encounter status/outcome/start/resolution metadata consistency.',
      mutating: false,
    },
    'repair-progress-clock-records': {
      id: 'repair-progress-clock-records',
      label: 'Repair progress clock records',
      description: 'Inspect and normalize clock ranges/completion consistency.',
      mutating: false,
    },
  }

  return {
    issues,
    summary: {
      issueCount: issues.length,
      errorCount,
      warningCount,
      softlockRisk: errorCount > 0,
      categories,
    },
    recoveryActions: [...recoveryIds].map((recoveryId) => recoveryActionCatalog[recoveryId]),
  }
}

function getInvalidQueueEventIds(
  state: GameState,
  queueEvents: RuntimeQueuedEvent[]
) {
  const report = analyzeRuntimeStability(state)
  const removableIds = new Set<string>()

  for (const issue of report.issues) {
    if (issue.category !== 'event-queue') {
      continue
    }

    const issueParts = issue.id.split('.')
    const possibleId = issueParts.at(-1)
    if (possibleId?.startsWith('qevt-')) {
      removableIds.add(possibleId)
    }
  }

  for (const queueEvent of queueEvents) {
    if (queueEvent.week !== undefined && queueEvent.week > state.week) {
      removableIds.add(queueEvent.id)
    }
  }

  return removableIds
}

function getInvalidEncounterAftermathQueueEventIds(state: GameState, queueEvents: RuntimeQueuedEvent[]) {
  const runtime = readGameStateManager(state)
  const removableIds = new Set<string>()

  for (const queueEvent of queueEvents) {
    const type = normalizeString(queueEvent.type)
    if (type !== 'encounter.follow_up') {
      continue
    }

    const targetId = normalizeString(queueEvent.targetId)
    if (targetId.length === 0 || !runtime.encounterState[targetId]) {
      removableIds.add(queueEvent.id)
    }
  }

  return removableIds
}

export function pruneInvalidRuntimeQueueEvents(state: GameState): RuntimeQueuePruneResult {
  const runtime = readGameStateManager(state)
  const removableIds = getInvalidQueueEventIds(state, runtime.eventQueue.entries)

  if (removableIds.size === 0) {
    return {
      state,
      removedEventIds: [],
      removedCount: 0,
    }
  }

  const nextEntries = runtime.eventQueue.entries.filter((entry) => !removableIds.has(entry.id))

  return {
    state: {
      ...state,
      runtimeState: {
        ...buildRuntimeStateFromView(state),
        eventQueue: {
          entries: nextEntries,
          nextSequence: runtime.eventQueue.nextSequence,
        },
      },
    },
    removedEventIds: [...removableIds],
    removedCount: removableIds.size,
  }
}

export function normalizeInvalidProgressClocks(state: GameState): ProgressClockNormalizationResult {
  const runtime = readGameStateManager(state)
  const normalizedClockIds: string[] = []
  const nextProgressClocks: RuntimeState['progressClocks'] = { ...runtime.progressClocks }

  for (const [clockId, clock] of Object.entries(nextProgressClocks)) {
    const max = Number.isFinite(clock.max) ? Math.max(1, Math.trunc(clock.max)) : 1
    const value = Number.isFinite(clock.value)
      ? Math.max(0, Math.min(max, Math.trunc(clock.value)))
      : 0

    const nextClock = {
      ...clock,
      max,
      value,
      ...(clock.completedAtWeek !== undefined && value < max
        ? { completedAtWeek: undefined }
        : {}),
    }

    const changed =
      nextClock.max !== clock.max ||
      nextClock.value !== clock.value ||
      nextClock.completedAtWeek !== clock.completedAtWeek

    if (changed) {
      normalizedClockIds.push(clockId)
      nextProgressClocks[clockId] = nextClock
    }
  }

  if (normalizedClockIds.length === 0) {
    return {
      state,
      normalizedClockIds: [],
      normalizedCount: 0,
    }
  }

  return {
    state: {
      ...state,
      runtimeState: {
        ...buildRuntimeStateFromView(state),
        progressClocks: nextProgressClocks,
      },
    },
    normalizedClockIds,
    normalizedCount: normalizedClockIds.length,
  }
}

export function clearInvalidEncounterAftermathReferences(state: GameState): EncounterAftermathCleanupResult {
  const runtime = readGameStateManager(state)
  const cleanedEncounterIds: string[] = []
  const nextEncounterState: RuntimeState['encounterState'] = { ...runtime.encounterState }
  const catalog = buildKnownAuthoredTargetCatalog(state)

  for (const [encounterId, encounter] of Object.entries(runtime.encounterState)) {
    const existingFollowUpIds = encounter.followUpIds ?? []
    const nextFollowUpIds = existingFollowUpIds.filter((followUpId) => {
      const normalized = normalizeString(followUpId)
      return normalized.length > 0 && catalog.targetIds.has(normalized)
    })

    if (nextFollowUpIds.length !== existingFollowUpIds.length) {
      cleanedEncounterIds.push(encounterId)
      nextEncounterState[encounterId] = {
        ...encounter,
        followUpIds: nextFollowUpIds,
      }
    }
  }

  const invalidQueueIds = getInvalidEncounterAftermathQueueEventIds(state, runtime.eventQueue.entries)
  const nextQueueEntries = runtime.eventQueue.entries.filter((entry) => !invalidQueueIds.has(entry.id))

  if (cleanedEncounterIds.length === 0 && invalidQueueIds.size === 0) {
    return {
      state,
      cleanedEncounterIds: [],
      removedQueueEventIds: [],
      cleanedCount: 0,
    }
  }

  return {
    state: {
      ...state,
      runtimeState: {
        ...buildRuntimeStateFromView(state),
        encounterState: nextEncounterState,
        eventQueue: {
          entries: nextQueueEntries,
          nextSequence: runtime.eventQueue.nextSequence,
        },
      },
    },
    cleanedEncounterIds,
    removedQueueEventIds: [...invalidQueueIds],
    cleanedCount: cleanedEncounterIds.length + invalidQueueIds.size,
  }
}

export function clearStaleAuthoredContext(state: GameState): ClearAuthoredContextResult {
  const runtime = readGameStateManager(state)
  const authored = runtime.ui.authoring
  const activeContextId = normalizeString(authored?.activeContextId)

  if (activeContextId.length === 0) {
    return {
      state,
      cleared: false,
    }
  }

  const catalog = buildKnownAuthoredTargetCatalog(state)
  if (catalog.contextIds.has(activeContextId)) {
    return {
      state,
      cleared: false,
      previousContextId: activeContextId,
    }
  }

  return {
    state: {
      ...state,
      runtimeState: {
        ...buildRuntimeStateFromView(state),
        ui: {
          ...runtime.ui,
          authoring: {
            ...runtime.ui.authoring,
            activeContextId: undefined,
          },
        },
      },
    },
    cleared: true,
    previousContextId: activeContextId,
  }
}
