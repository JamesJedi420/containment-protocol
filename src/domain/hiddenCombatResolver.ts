import { type RuntimeQueueEventInput } from './eventQueue'
import {
  attachEncounterResolution,
  initializeEncounterTracking,
  recordEncounterFollowUps,
} from './encounterTracking'
import { appendDeveloperLogEvent } from './developerLog'
import { setEncounterRuntimeState, type EncounterRuntimePatch } from './gameStateManager'
import {
  evaluateScreenRouteCondition,
  type ScreenRouteCondition,
  type ScreenRouteContext,
} from './screenRouting'
import type { GameState } from './models'
import {
  evaluateAllyBehaviors,
  type AllyBehaviorProfile,
  type AllyBehaviorSelection,
} from './allyBehavior'
import {
  applyOutcomeBranching,
  selectOutcomeBranch,
  type OutcomeBranchAuthoredContextPatch,
  type OutcomeBranchDefinition,
  type OutcomeBranchEffects,
  type OutcomeBranchFlagEffects,
  type OutcomeBranchOutcome,
  type OutcomeBranchProgressEffect,
} from './outcomeBranching'
import type { AuthoredBranchContext } from './contentBranching'

export type HiddenCombatOutcome = OutcomeBranchOutcome

export interface HiddenCombatModifier<
  Context extends ScreenRouteContext = ScreenRouteContext,
> {
  id: string
  when?: ScreenRouteCondition<Context>
  powerDelta?: number
  difficultyDelta?: number
}

export type HiddenCombatProgressEffect = OutcomeBranchProgressEffect

export type HiddenCombatFlagEffects = OutcomeBranchFlagEffects

export interface HiddenCombatThresholds {
  successAt: number
  partialAt: number
}

export interface HiddenCombatResolutionInput<
  Context extends ScreenRouteContext = ScreenRouteContext,
> {
  encounterId: string
  basePower: number
  baseDifficulty: number
  resolutionId?: string
  thresholds?: Partial<HiddenCombatThresholds>
  modifiers?: readonly HiddenCombatModifier<Context>[]
  encounterPatchByOutcome?: Partial<Record<HiddenCombatOutcome, EncounterRuntimePatch>>
  followUpByOutcome?: Partial<Record<HiddenCombatOutcome, string | readonly string[]>>
  flagEffectsByOutcome?: Partial<Record<HiddenCombatOutcome, HiddenCombatFlagEffects>>
  progressEffectsByOutcome?: Partial<Record<HiddenCombatOutcome, readonly HiddenCombatProgressEffect[]>>
  allyBehaviorProfiles?: readonly AllyBehaviorProfile[]
  allyBehaviorContext?: AuthoredBranchContext
  outcomeBranches?: readonly OutcomeBranchDefinition[]
  outcomeBranchContext?: AuthoredBranchContext
  includeDebug?: boolean
  context?: Context
}

export interface HiddenCombatResolutionDebugDetails {
  thresholds: HiddenCombatThresholds
  allyAdjustedThresholds: HiddenCombatThresholds
  effectivePower: number
  effectiveDifficulty: number
  allyScoreModifier: number
  score: number
  appliedModifierIds: string[]
  allyBehaviors: Array<{
    allyId: string
    behaviorId: string
    isFallback: boolean
    scoreModifier: number
    thresholdModifier: {
      successAt: number
      partialAt: number
    }
    followUpIds: string[]
  }>
}

export interface HiddenCombatResolutionResult {
  resolutionId: string
  outcomeId: string
  outcomeBranchId?: string
  branchIsFallback: boolean
  branchSummary?: string
  encounterId: string
  week: number
  outcome: HiddenCombatOutcome
  success: boolean
  score: number
  encounterPatch: EncounterRuntimePatch
  followUpIds: string[]
  queueEvents: RuntimeQueueEventInput[]
  flagEffects: HiddenCombatFlagEffects
  progressEffects: HiddenCombatProgressEffect[]
  authoredContextPatch?: OutcomeBranchAuthoredContextPatch
  allyBehaviors: AllyBehaviorSelection[]
  debug?: HiddenCombatResolutionDebugDetails
}

export interface HiddenCombatApplyOptions {
  contextId?: string
  queueSource?: string
}

export interface HiddenCombatApplyResult {
  state: GameState
  queuedEventIds: string[]
  queueEvents: RuntimeQueueEventInput[]
}

export interface HiddenCombatExecutionResult {
  resolution: HiddenCombatResolutionResult
  apply: HiddenCombatApplyResult
}

const DEFAULT_THRESHOLDS: HiddenCombatThresholds = {
  successAt: 0,
  partialAt: -12,
}

function normalizeString(value: string | undefined | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function sanitizeNumber(value: number | undefined, fallback = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Number(value.toFixed(2))
}

function normalizeFollowUpIds(value: string | readonly string[] | undefined) {
  if (!value) {
    return []
  }

  const values = Array.isArray(value) ? value : [value]
  return [...new Set(values.map(normalizeString).filter((entry) => entry.length > 0))]
}

function sanitizeThresholds(thresholds?: Partial<HiddenCombatThresholds>): HiddenCombatThresholds {
  const successAt = sanitizeNumber(thresholds?.successAt, DEFAULT_THRESHOLDS.successAt)
  const partialAt = sanitizeNumber(thresholds?.partialAt, DEFAULT_THRESHOLDS.partialAt)

  return {
    successAt,
    partialAt: Math.min(partialAt, successAt),
  }
}

function applyThresholdModifier(
  thresholds: HiddenCombatThresholds,
  modifier: {
    successAt?: number
    partialAt?: number
  }
) {
  const successAt = sanitizeNumber(thresholds.successAt + sanitizeNumber(modifier.successAt, 0), thresholds.successAt)
  const partialAtRaw = sanitizeNumber(
    thresholds.partialAt + sanitizeNumber(modifier.partialAt, 0),
    thresholds.partialAt
  )

  return {
    successAt,
    partialAt: Math.min(partialAtRaw, successAt),
  }
}

function resolveOutcome(score: number, thresholds: HiddenCombatThresholds): HiddenCombatOutcome {
  if (score >= thresholds.successAt) {
    return 'success'
  }

  if (score >= thresholds.partialAt) {
    return 'partial'
  }

  return 'failure'
}

function buildDefaultEncounterPatch(
  state: GameState,
  outcome: HiddenCombatOutcome
): EncounterRuntimePatch {
  return {
    status: outcome === 'success' ? 'resolved' : 'active',
    phase: `hidden-combat:${outcome}`,
    startedWeek: state.week,
    ...(outcome === 'success' ? { resolvedWeek: state.week } : {}),
    flags: {
      hiddenCombatResolved: true,
      hiddenCombatSuccess: outcome === 'success',
      hiddenCombatPartial: outcome === 'partial',
      hiddenCombatFailure: outcome === 'failure',
    },
    lastUpdatedWeek: state.week,
  }
}

export function resolveHiddenCombat<
  Context extends ScreenRouteContext = ScreenRouteContext,
>(state: GameState, input: HiddenCombatResolutionInput<Context>): HiddenCombatResolutionResult {
  const encounterId = normalizeString(input.encounterId)

  if (encounterId.length === 0) {
    throw new Error('resolveHiddenCombat requires a non-empty encounterId.')
  }

  const thresholds = sanitizeThresholds(input.thresholds)
  const modifiers = input.modifiers ?? []
  const context = input.context

  const appliedModifierIds: string[] = []
  let effectivePower = sanitizeNumber(input.basePower, 0)
  let effectiveDifficulty = sanitizeNumber(input.baseDifficulty, 0)

  for (const modifier of modifiers) {
    const modifierId = normalizeString(modifier.id)
    if (modifierId.length === 0) {
      continue
    }

    const passes = modifier.when
      ? evaluateScreenRouteCondition(state, modifier.when, context).passes
      : true

    if (!passes) {
      continue
    }

    appliedModifierIds.push(modifierId)
    effectivePower = sanitizeNumber(effectivePower + sanitizeNumber(modifier.powerDelta, 0), effectivePower)
    effectiveDifficulty = sanitizeNumber(
      effectiveDifficulty + sanitizeNumber(modifier.difficultyDelta, 0),
      effectiveDifficulty
    )
  }

  const allyAggregate = evaluateAllyBehaviors(state, input.allyBehaviorProfiles ?? [], {
    encounterId,
    context:
      input.allyBehaviorContext ??
      input.outcomeBranchContext ??
      (input.context as AuthoredBranchContext | undefined),
  })
  const allyAdjustedThresholds = applyThresholdModifier(thresholds, allyAggregate.thresholdModifier)
  const score = sanitizeNumber(
    effectivePower - effectiveDifficulty + sanitizeNumber(allyAggregate.scoreModifier, 0),
    0
  )
  const outcome = resolveOutcome(score, allyAdjustedThresholds)
  const resolutionId =
    normalizeString(input.resolutionId) || `hidden-combat.${encounterId}.${state.week}.${outcome}`
  const followUpIds = [
    ...new Set([
      ...normalizeFollowUpIds(input.followUpByOutcome?.[outcome]),
      ...allyAggregate.followUpIds,
    ]),
  ]
  const flagEffects: HiddenCombatFlagEffects = {
    set: {
      ...(input.flagEffectsByOutcome?.[outcome]?.set ?? {}),
      ...allyAggregate.flagEffects.set,
    },
    clear: [
      ...new Set([
        ...(input.flagEffectsByOutcome?.[outcome]?.clear ?? []),
        ...allyAggregate.flagEffects.clear,
      ]),
    ],
  }
  const progressEffects = [
    ...(input.progressEffectsByOutcome?.[outcome] ?? []),
    ...allyAggregate.progressEffects,
  ]

  const defaultPatch = buildDefaultEncounterPatch(state, outcome)
  const encounterPatch: EncounterRuntimePatch = {
    ...defaultPatch,
    ...(input.encounterPatchByOutcome?.[outcome] ?? {}),
  }
  const selectedAftermath = selectOutcomeBranch(state, {
    outcome,
    encounterId,
    resolutionId,
    week: state.week,
    baseEffects: {
      encounterPatch,
      followUpIds,
      flagEffects,
      progressEffects,
    } satisfies OutcomeBranchEffects,
    branches: input.outcomeBranches,
    context: input.outcomeBranchContext ?? (input.context as AuthoredBranchContext | undefined),
  })

  return {
    resolutionId,
    outcomeId: selectedAftermath.outcomeId,
    ...(selectedAftermath.branchId ? { outcomeBranchId: selectedAftermath.branchId } : {}),
    branchIsFallback: selectedAftermath.branchIsFallback,
    ...(selectedAftermath.branchSummary ? { branchSummary: selectedAftermath.branchSummary } : {}),
    encounterId,
    week: state.week,
    outcome,
    success: outcome === 'success',
    score,
    encounterPatch: selectedAftermath.effects.encounterPatch,
    followUpIds: selectedAftermath.effects.followUpIds,
    queueEvents: selectedAftermath.effects.queueEvents,
    flagEffects: selectedAftermath.effects.flagEffects,
    progressEffects: selectedAftermath.effects.progressEffects,
    ...(selectedAftermath.effects.authoredContext
      ? { authoredContextPatch: selectedAftermath.effects.authoredContext }
      : {}),
    allyBehaviors: [...allyAggregate.selections],
    ...(input.includeDebug
      ? {
          debug: {
            thresholds,
            allyAdjustedThresholds,
            effectivePower,
            effectiveDifficulty,
            allyScoreModifier: allyAggregate.scoreModifier,
            score,
            appliedModifierIds,
            allyBehaviors: allyAggregate.selections.map((selection) => ({
              allyId: selection.allyId,
              behaviorId: selection.behaviorId,
              isFallback: selection.isFallback,
              scoreModifier: selection.effects.scoreModifier,
              thresholdModifier: {
                successAt: selection.effects.thresholdModifier.successAt,
                partialAt: selection.effects.thresholdModifier.partialAt,
              },
              followUpIds: [...selection.effects.followUpIds],
            })),
          },
        }
      : {}),
  }
}

export function applyHiddenCombatResolution(
  state: GameState,
  resolution: HiddenCombatResolutionResult,
  options: HiddenCombatApplyOptions = {}
): HiddenCombatApplyResult {
  let nextState = initializeEncounterTracking(state, resolution.encounterId, {
    status: 'active',
    phase: 'hidden-combat:initialized',
  })
  nextState = setEncounterRuntimeState(nextState, resolution.encounterId, resolution.encounterPatch)

  nextState = attachEncounterResolution(nextState, resolution.encounterId, {
    resolutionId: resolution.resolutionId,
    outcome: resolution.outcome,
    status: resolution.encounterPatch.status,
    phase: resolution.encounterPatch.phase,
    updatedWeek: resolution.week,
    ...(typeof resolution.encounterPatch.resolvedWeek === 'number'
      ? { resolvedWeek: resolution.encounterPatch.resolvedWeek }
      : {}),
    followUpIds: resolution.followUpIds,
  })

  const followUpQueueEvents: RuntimeQueueEventInput[] = resolution.followUpIds.map((followUpId) => ({
    type: 'encounter.follow_up',
    targetId: followUpId,
    contextId: options.contextId,
    source: options.queueSource ?? `hidden-combat:${resolution.encounterId}`,
    week: resolution.week,
    payload: {
      encounterId: resolution.encounterId,
      outcome: resolution.outcome,
      resolutionId: resolution.resolutionId,
    },
  }))
  const branchApply = applyOutcomeBranching(nextState, {
    outcome: resolution.outcome,
    encounterId: resolution.encounterId,
    resolutionId: resolution.resolutionId,
    week: resolution.week,
    outcomeId: resolution.outcomeId,
    ...(resolution.outcomeBranchId ? { branchId: resolution.outcomeBranchId } : {}),
    ...(resolution.branchSummary ? { branchSummary: resolution.branchSummary } : {}),
    branchIsFallback: resolution.branchIsFallback,
    effects: {
      encounterPatch: {},
      followUpIds: [...resolution.followUpIds],
      queueEvents: [...followUpQueueEvents, ...resolution.queueEvents],
      flagEffects: {
        set: { ...(resolution.flagEffects.set ?? {}) },
        clear: [...(resolution.flagEffects.clear ?? [])],
      },
      progressEffects: [...resolution.progressEffects],
      ...(resolution.authoredContextPatch
        ? { authoredContext: { ...resolution.authoredContextPatch } }
        : {}),
    },
  })
  nextState = branchApply.state

  if (resolution.allyBehaviors.length > 0) {
    nextState = appendDeveloperLogEvent(nextState, {
      type: 'encounter.patched',
      summary: `Ally behaviors applied: ${resolution.allyBehaviors.map((entry) => `${entry.allyId}:${entry.behaviorId}`).join(', ')}`,
      week: resolution.week,
      details: {
        encounterId: resolution.encounterId,
        resolutionId: resolution.resolutionId,
        outcome: resolution.outcome,
        allyBehaviorIds: resolution.allyBehaviors.map((entry) => `${entry.allyId}:${entry.behaviorId}`),
      },
    })
  }

  nextState = recordEncounterFollowUps(nextState, resolution.encounterId, resolution.followUpIds, resolution.week)

  return {
    state: nextState,
    queueEvents: branchApply.queueEvents,
    queuedEventIds: branchApply.queuedEventIds,
  }
}

export function resolveAndApplyHiddenCombat<
  Context extends ScreenRouteContext = ScreenRouteContext,
>(
  state: GameState,
  input: HiddenCombatResolutionInput<Context>,
  options: HiddenCombatApplyOptions = {}
): HiddenCombatExecutionResult {
  const resolution = resolveHiddenCombat(state, input)
  const apply = applyHiddenCombatResolution(state, resolution, options)

  return {
    resolution,
    apply,
  }
}
