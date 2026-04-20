import { selectAuthoredBranch, type AuthoredBranchCondition, type AuthoredBranchContext } from './contentBranching'
import { appendDeveloperLogEvent } from './developerLog'
import { enqueueRuntimeEvent, type RuntimeQueueEventInput } from './eventQueue'
import { clearPersistentFlag, setPersistentFlag } from './flagSystem'
import { setUiDebugState } from './gameStateManager'
import type { EncounterRuntimePatch } from './gameStateManager'
import type { GameFlagValue, GameState } from './models'
import { advanceDefinedProgressClock, type ProgressClockDefaults } from './progressClocks'

export type OutcomeBranchOutcome = 'success' | 'partial' | 'failure'

export interface OutcomeBranchProgressEffect {
  clockId: string
  delta: number
  defaults?: ProgressClockDefaults
}

export interface OutcomeBranchFlagEffects {
  set?: Record<string, GameFlagValue>
  clear?: readonly string[]
}

export interface OutcomeBranchAuthoredContextPatch {
  activeContextId?: string
  lastNextTargetId?: string
  lastFollowUpIds?: string[]
  updatedWeek?: number
}

export interface OutcomeBranchEffects {
  encounterPatch?: EncounterRuntimePatch
  followUpIds?: readonly string[]
  queueEvents?: readonly RuntimeQueueEventInput[]
  flagEffects?: OutcomeBranchFlagEffects
  progressEffects?: readonly OutcomeBranchProgressEffect[]
  authoredContext?: OutcomeBranchAuthoredContextPatch
}

export interface OutcomeBranchDefinition<
  Context extends AuthoredBranchContext = AuthoredBranchContext,
> {
  id: string
  outcome: OutcomeBranchOutcome | 'any'
  when?: AuthoredBranchCondition<Context>
  effects?: OutcomeBranchEffects
  summary?: string
}

export interface OutcomeBranchSelectionInput<
  Context extends AuthoredBranchContext = AuthoredBranchContext,
> {
  outcome: OutcomeBranchOutcome
  encounterId: string
  resolutionId: string
  week: number
  baseEffects?: OutcomeBranchEffects
  branches?: readonly OutcomeBranchDefinition<Context>[]
  context?: Context
}

export interface OutcomeBranchSelection {
  outcome: OutcomeBranchOutcome
  encounterId: string
  resolutionId: string
  week: number
  outcomeId: string
  branchId?: string
  branchSummary?: string
  branchIsFallback: boolean
  effects: {
    encounterPatch: EncounterRuntimePatch
    followUpIds: string[]
    queueEvents: RuntimeQueueEventInput[]
    flagEffects: {
      set: Record<string, GameFlagValue>
      clear: string[]
    }
    progressEffects: OutcomeBranchProgressEffect[]
    authoredContext?: OutcomeBranchAuthoredContextPatch
  }
}

export interface OutcomeBranchApplyResult {
  state: GameState
  queuedEventIds: string[]
  queueEvents: RuntimeQueueEventInput[]
}

function normalizeString(value: string | undefined | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeStringList(values: readonly string[] | undefined) {
  return [...new Set((values ?? []).map(normalizeString).filter((value) => value.length > 0))]
}

function cloneQueueEvent(event: RuntimeQueueEventInput): RuntimeQueueEventInput {
  return {
    type: normalizeString(event.type),
    targetId: normalizeString(event.targetId),
    ...(normalizeString(event.contextId) ? { contextId: normalizeString(event.contextId) } : {}),
    ...(normalizeString(event.source) ? { source: normalizeString(event.source) } : {}),
    ...(typeof event.week === 'number' && Number.isFinite(event.week)
      ? { week: Math.max(1, Math.trunc(event.week)) }
      : {}),
    ...(event.payload
      ? {
          payload: Object.fromEntries(
            Object.entries(event.payload).map(([payloadId, payloadValue]) => [
              payloadId,
              Array.isArray(payloadValue) ? [...payloadValue] : payloadValue,
            ])
          ),
        }
      : {}),
  }
}

function sanitizeFlagEffects(value: OutcomeBranchFlagEffects | undefined) {
  return {
    set: { ...(value?.set ?? {}) },
    clear: normalizeStringList(value?.clear),
  }
}

function sanitizeEffects(value: OutcomeBranchEffects | undefined) {
  return {
    encounterPatch: { ...(value?.encounterPatch ?? {}) },
    followUpIds: normalizeStringList(value?.followUpIds),
    queueEvents: [...(value?.queueEvents ?? [])]
      .map(cloneQueueEvent)
      .filter((entry) => normalizeString(entry.type).length > 0 && normalizeString(entry.targetId).length > 0),
    flagEffects: sanitizeFlagEffects(value?.flagEffects),
    progressEffects: (value?.progressEffects ?? []).map((effect) => ({
      ...effect,
      clockId: normalizeString(effect.clockId),
    })).filter((effect) => effect.clockId.length > 0 && Number.isFinite(effect.delta)),
    ...(value?.authoredContext
      ? {
          authoredContext: {
            ...(normalizeString(value.authoredContext.activeContextId)
              ? { activeContextId: normalizeString(value.authoredContext.activeContextId) }
              : {}),
            ...(normalizeString(value.authoredContext.lastNextTargetId)
              ? { lastNextTargetId: normalizeString(value.authoredContext.lastNextTargetId) }
              : {}),
            ...(normalizeStringList(value.authoredContext.lastFollowUpIds).length > 0
              ? { lastFollowUpIds: normalizeStringList(value.authoredContext.lastFollowUpIds) }
              : {}),
            ...(typeof value.authoredContext.updatedWeek === 'number' && Number.isFinite(value.authoredContext.updatedWeek)
              ? { updatedWeek: Math.max(1, Math.trunc(value.authoredContext.updatedWeek)) }
              : {}),
          },
        }
      : {}),
  }
}

function mergeEffects(base: OutcomeBranchEffects | undefined, branch: OutcomeBranchEffects | undefined) {
  const baseSanitized = sanitizeEffects(base)
  const branchSanitized = sanitizeEffects(branch)

  return {
    encounterPatch: {
      ...baseSanitized.encounterPatch,
      ...branchSanitized.encounterPatch,
    },
    followUpIds: [...new Set([...baseSanitized.followUpIds, ...branchSanitized.followUpIds])],
    queueEvents: [...baseSanitized.queueEvents, ...branchSanitized.queueEvents],
    flagEffects: {
      set: {
        ...baseSanitized.flagEffects.set,
        ...branchSanitized.flagEffects.set,
      },
      clear: [...new Set([...baseSanitized.flagEffects.clear, ...branchSanitized.flagEffects.clear])],
    },
    progressEffects: [...baseSanitized.progressEffects, ...branchSanitized.progressEffects],
    ...(branchSanitized.authoredContext || baseSanitized.authoredContext
      ? {
          authoredContext: {
            ...(baseSanitized.authoredContext ?? {}),
            ...(branchSanitized.authoredContext ?? {}),
            ...(branchSanitized.authoredContext?.lastFollowUpIds || baseSanitized.authoredContext?.lastFollowUpIds
              ? {
                  lastFollowUpIds: normalizeStringList([
                    ...(baseSanitized.authoredContext?.lastFollowUpIds ?? []),
                    ...(branchSanitized.authoredContext?.lastFollowUpIds ?? []),
                  ]),
                }
              : {}),
          },
        }
      : {}),
  }
}

export function selectOutcomeBranch<
  Context extends AuthoredBranchContext = AuthoredBranchContext,
>(state: GameState, input: OutcomeBranchSelectionInput<Context>): OutcomeBranchSelection {
  const candidates = (input.branches ?? []).filter(
    (branch) => branch.outcome === input.outcome || branch.outcome === 'any'
  )

  const selected = selectAuthoredBranch(
    state,
    candidates.map((branch) => ({
      id: branch.id,
      when: branch.when,
      value: branch,
    })),
    input.context
  )

  const branchEffects = selected?.value.effects
  const merged = mergeEffects(input.baseEffects, branchEffects)
  const branchId = selected?.branchId

  return {
    outcome: input.outcome,
    encounterId: normalizeString(input.encounterId),
    resolutionId: normalizeString(input.resolutionId),
    week: Math.max(1, Math.trunc(input.week)),
    outcomeId: `${input.outcome}:${branchId ?? 'default'}`,
    ...(branchId ? { branchId } : {}),
    ...(selected?.value.summary ? { branchSummary: selected.value.summary } : {}),
    branchIsFallback: selected?.isFallback ?? false,
    effects: {
      encounterPatch: merged.encounterPatch,
      followUpIds: merged.followUpIds,
      queueEvents: merged.queueEvents,
      flagEffects: merged.flagEffects,
      progressEffects: merged.progressEffects,
      ...(merged.authoredContext ? { authoredContext: merged.authoredContext } : {}),
    },
  }
}

export function applyOutcomeBranching(state: GameState, selection: OutcomeBranchSelection): OutcomeBranchApplyResult {
  let nextState = state

  for (const [flagId, flagValue] of Object.entries(selection.effects.flagEffects.set)) {
    nextState = setPersistentFlag(nextState, flagId, flagValue)
  }

  for (const flagId of selection.effects.flagEffects.clear) {
    nextState = clearPersistentFlag(nextState, flagId)
  }

  for (const progressEffect of selection.effects.progressEffects) {
    nextState = advanceDefinedProgressClock(
      nextState,
      progressEffect.clockId,
      progressEffect.delta,
      progressEffect.defaults
    )
  }

  if (selection.effects.authoredContext) {
    nextState = setUiDebugState(nextState, {
      authoring: {
        ...(selection.effects.authoredContext.activeContextId
          ? { activeContextId: selection.effects.authoredContext.activeContextId }
          : {}),
        ...(selection.effects.authoredContext.lastNextTargetId
          ? { lastNextTargetId: selection.effects.authoredContext.lastNextTargetId }
          : {}),
        ...(selection.effects.authoredContext.lastFollowUpIds
          ? { lastFollowUpIds: [...selection.effects.authoredContext.lastFollowUpIds] }
          : {}),
        ...(selection.effects.authoredContext.updatedWeek
          ? { updatedWeek: selection.effects.authoredContext.updatedWeek }
          : {}),
      },
    })
  }

  const queuedEventIds: string[] = []
  const queueEvents: RuntimeQueueEventInput[] = []

  for (const queueEvent of selection.effects.queueEvents) {
    const enqueueResult = enqueueRuntimeEvent(nextState, queueEvent)
    nextState = enqueueResult.state
    queueEvents.push(queueEvent)
    if (enqueueResult.event?.id) {
      queuedEventIds.push(enqueueResult.event.id)
    }
  }

  nextState = appendDeveloperLogEvent(nextState, {
    type: 'route.selected',
    summary: `Outcome branch selected: ${selection.outcomeId}`,
    week: selection.week,
    details: {
      encounterId: selection.encounterId,
      resolutionId: selection.resolutionId,
      outcome: selection.outcome,
      outcomeId: selection.outcomeId,
      ...(selection.branchId ? { branchId: selection.branchId } : {}),
      isFallback: selection.branchIsFallback,
      followUpIds: selection.effects.followUpIds,
      queueEventCount: queueEvents.length,
      ...(selection.branchSummary ? { branchSummary: selection.branchSummary } : {}),
    },
  })

  return {
    state: nextState,
    queuedEventIds,
    queueEvents,
  }
}
