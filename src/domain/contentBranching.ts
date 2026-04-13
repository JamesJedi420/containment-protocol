import { readGameStateManager } from './gameStateManager'
import type { GameState, RuntimeQueuedEvent } from './models'
import {
  evaluateScreenRouteCondition,
  type ScreenRouteCondition,
  type ScreenRouteConditionEvaluation,
  type ScreenRouteContext,
} from './screenRouting'

export interface AuthoredFollowUpCondition {
  anyOf?: readonly string[]
  allOf?: readonly string[]
  noneOf?: readonly string[]
  first?: string
}

export interface AuthoredBranchCondition<
  Context extends ScreenRouteContext = ScreenRouteContext,
> extends ScreenRouteCondition<Context> {
  followUps?: AuthoredFollowUpCondition
}

export interface AuthoredBranch<
  TValue,
  Context extends ScreenRouteContext = ScreenRouteContext,
> {
  id: string
  when?: AuthoredBranchCondition<Context>
  value: TValue
}

export interface AuthoredBranchContext extends ScreenRouteContext {
  queuedEvents?: readonly RuntimeQueuedEvent[]
  queuedFollowUpIds?: readonly string[]
}

export interface AuthoredBranchConditionEvaluation {
  passes: boolean
  screen: ScreenRouteConditionEvaluation
  missingAnyFollowUps: string[]
  missingAllFollowUps: string[]
  blockedFollowUps: string[]
  firstFollowUpMismatch?: {
    expected: string
    actual?: string
  }
}

export interface AuthoredBranchSelection<TValue> {
  branchId: string
  value: TValue
  isFallback: boolean
}

function normalizeString(value: string | undefined | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeStringList(values: readonly string[] | undefined) {
  return [...new Set((values ?? []).map(normalizeString).filter((value) => value.length > 0))]
}

function defaultScreenEvaluation(): ScreenRouteConditionEvaluation {
  return {
    passes: true,
    flagEvaluation: null,
    locationMatched: true,
    failedProgressClocks: [],
    failedEncounterIds: [],
    failedActiveContexts: [],
    failedPredicates: [],
  }
}

function resolveQueuedEvents(state: GameState, context?: AuthoredBranchContext) {
  if (context?.queuedEvents) {
    return [...context.queuedEvents]
  }

  return readGameStateManager(state).eventQueue.entries
}

function resolveQueuedFollowUpIds(state: GameState, context?: AuthoredBranchContext) {
  if (context?.queuedFollowUpIds) {
    return normalizeStringList(context.queuedFollowUpIds)
  }

  const queuedEvents = resolveQueuedEvents(state, context)
  return [...new Set(
    queuedEvents
      .filter((entry) => entry.type === 'authored.follow_up')
      .map((entry) => normalizeString(entry.targetId))
      .filter((entry) => entry.length > 0)
  )]
}

export function buildAuthoredBranchContext(
  state: GameState,
  context: ScreenRouteContext = {}
): AuthoredBranchContext {
  const queuedEvents = readGameStateManager(state).eventQueue.entries

  return {
    ...context,
    queuedEvents,
    queuedFollowUpIds: resolveQueuedFollowUpIds(state, {
      ...context,
      queuedEvents,
    }),
  }
}

export function evaluateAuthoredBranchCondition<
  Context extends AuthoredBranchContext = AuthoredBranchContext,
>(state: GameState, condition?: AuthoredBranchCondition<Context>, context?: Context) {
  const screen = condition
    ? evaluateScreenRouteCondition(state, condition, context)
    : defaultScreenEvaluation()

  if (!condition?.followUps) {
    return {
      passes: screen.passes,
      screen,
      missingAnyFollowUps: [],
      missingAllFollowUps: [],
      blockedFollowUps: [],
    } satisfies AuthoredBranchConditionEvaluation
  }

  const followUpIds = resolveQueuedFollowUpIds(state, context)
  const expectedAny = normalizeStringList(condition.followUps.anyOf)
  const expectedAll = normalizeStringList(condition.followUps.allOf)
  const expectedNone = normalizeStringList(condition.followUps.noneOf)
  const expectedFirst = normalizeString(condition.followUps.first)

  const missingAnyFollowUps =
    expectedAny.length > 0 && !expectedAny.some((followUpId) => followUpIds.includes(followUpId))
      ? expectedAny
      : []
  const missingAllFollowUps = expectedAll.filter((followUpId) => !followUpIds.includes(followUpId))
  const blockedFollowUps = expectedNone.filter((followUpId) => followUpIds.includes(followUpId))
  const firstFollowUpMismatch =
    expectedFirst.length > 0 && followUpIds[0] !== expectedFirst
      ? {
          expected: expectedFirst,
          ...(followUpIds[0] ? { actual: followUpIds[0] } : {}),
        }
      : undefined

  return {
    passes:
      screen.passes &&
      missingAnyFollowUps.length === 0 &&
      missingAllFollowUps.length === 0 &&
      blockedFollowUps.length === 0 &&
      !firstFollowUpMismatch,
    screen,
    missingAnyFollowUps,
    missingAllFollowUps,
    blockedFollowUps,
    ...(firstFollowUpMismatch ? { firstFollowUpMismatch } : {}),
  } satisfies AuthoredBranchConditionEvaluation
}

export function selectAuthoredBranch<
  TValue,
  Context extends AuthoredBranchContext = AuthoredBranchContext,
>(state: GameState, branches: readonly AuthoredBranch<TValue, Context>[], context?: Context) {
  let fallback: AuthoredBranch<TValue, Context> | null = null

  for (const branch of branches) {
    if (!branch.when) {
      fallback ??= branch
      continue
    }

    const evaluation = evaluateAuthoredBranchCondition(state, branch.when, context)

    if (evaluation.passes) {
      return {
        branchId: branch.id,
        value: branch.value,
        isFallback: false,
      } satisfies AuthoredBranchSelection<TValue>
    }
  }

  if (!fallback) {
    return null
  }

  return {
    branchId: fallback.id,
    value: fallback.value,
    isFallback: true,
  } satisfies AuthoredBranchSelection<TValue>
}
