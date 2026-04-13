// ...existing code...
import MajorIncidentPage from '../features/incidents/MajorIncidentPage';
// ...existing code...

// Add to exported routes array/object below (example shown, adjust as needed):
export const appRoutes = [
  // ...existing routes...
  {
    path: '/incidents/major',
    element: MajorIncidentPage,
  },
  // ...existing routes...
];
import {
  evaluateFlagConditions,
  type FlagConditionEvaluation,
  type FlagConditionSet,
} from './flagSystem'
import { getCurrentLocation, readGameStateManager } from './gameStateManager'
import {
  evaluateProgressClockCondition,
  type ProgressClockCondition,
} from './progressClocks'
import type {
  EncounterRuntimeStatus,
  GameFlagValue,
  GameState,
} from './models'

export interface ScreenRouteContext {
  activeContextId?: string
  contextTags?: readonly string[]
  scalars?: Record<string, GameFlagValue>
}

export interface ScreenRoutePredicateInput<Context extends ScreenRouteContext = ScreenRouteContext> {
  state: GameState
  context: Context
}

export interface ScreenRoutePredicate<Context extends ScreenRouteContext = ScreenRouteContext> {
  id: string
  test: (input: ScreenRoutePredicateInput<Context>) => boolean
}

export interface ScreenRouteLocationCondition {
  hubId?: string | readonly string[]
  locationId?: string | readonly string[]
  sceneId?: string | readonly string[]
}

export type ScreenRouteProgressClockCondition = ProgressClockCondition

export interface ScreenRouteEncounterCondition {
  encounterId: string
  status?: EncounterRuntimeStatus | readonly EncounterRuntimeStatus[]
  phase?: string | readonly string[]
  requiredFlags?: readonly string[]
  blockedFlags?: readonly string[]
}

export interface ScreenRouteCondition<Context extends ScreenRouteContext = ScreenRouteContext> {
  /**
   * Primary authored gating for scripted content.
   * Reuses the persistent flag / one-shot API rather than re-implementing it.
   */
  flags?: FlagConditionSet
  location?: ScreenRouteLocationCondition
  progressClocks?: readonly ScreenRouteProgressClockCondition[]
  encounter?: ScreenRouteEncounterCondition
  /**
   * Lightweight hook for modal/detail surfaces that care about a local authored
   * context id without coupling the router to React or page-specific state.
   */
  activeContexts?: readonly string[]
  /**
   * Extension point for simple deterministic scalar checks that do not justify a
   * new first-class condition type yet.
   */
  predicates?: readonly ScreenRoutePredicate<Context>[]
}

export interface ScreenRouteConditionEvaluation {
  passes: boolean
  flagEvaluation: FlagConditionEvaluation | null
  locationMatched: boolean
  failedProgressClocks: string[]
  failedEncounterIds: string[]
  failedActiveContexts: string[]
  failedPredicates: string[]
}

export interface ScreenRouteBranch<T, Context extends ScreenRouteContext = ScreenRouteContext> {
  id: string
  when?: ScreenRouteCondition<Context>
  value: T
}

export interface ScreenRouteSelection<T> {
  branchId: string
  value: T
  isFallback: boolean
}

function normalizeString(value: string | undefined | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeStringList(values: readonly string[] | undefined) {
  return (values ?? []).map(normalizeString).filter((value) => value.length > 0)
}

function toExpectedList(value?: string | readonly string[]) {
  if (typeof value !== 'string') {
    return Array.isArray(value) ? normalizeStringList(value) : []
  }

  const normalized = normalizeString(value)
  return normalized.length > 0 ? [normalized] : []
}

function matchesExpectedString(
  actual: string | undefined,
  expected?: string | readonly string[]
) {
  const expectedValues = toExpectedList(expected)

  if (expectedValues.length === 0) {
    return true
  }

  return expectedValues.includes(normalizeString(actual))
}

function getRouteContext<Context extends ScreenRouteContext>(context?: Context) {
  return (context ?? {}) as Context
}

export function evaluateScreenRouteCondition<Context extends ScreenRouteContext = ScreenRouteContext>(
  state: GameState,
  condition?: ScreenRouteCondition<Context>,
  context?: Context
): ScreenRouteConditionEvaluation {
  if (!condition) {
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

  const routeContext = getRouteContext(context)
  const flagEvaluation = condition.flags ? evaluateFlagConditions(state, condition.flags) : null
  const currentLocation = getCurrentLocation(state)
  const runtime = readGameStateManager(state)

  const locationMatched =
    !condition.location ||
    (matchesExpectedString(currentLocation.hubId, condition.location.hubId) &&
      matchesExpectedString(currentLocation.locationId, condition.location.locationId) &&
      matchesExpectedString(currentLocation.sceneId, condition.location.sceneId))

  const failedProgressClocks = (condition.progressClocks ?? [])
    .filter((clockCondition) => !evaluateProgressClockCondition(state, clockCondition).passes)
    .map((clockCondition) => normalizeString(clockCondition.clockId))

  const failedEncounterIds = condition.encounter
    ? (() => {
        const encounterId = normalizeString(condition.encounter.encounterId)
        const encounter = runtime.encounterState[encounterId]

        if (!encounter) {
          return encounterId.length > 0 ? [encounterId] : ['unknown-encounter']
        }

        if (!matchesExpectedString(encounter.status, condition.encounter.status)) {
          return [encounterId]
        }

        if (!matchesExpectedString(encounter.phase, condition.encounter.phase)) {
          return [encounterId]
        }

        const requiredFlags = normalizeStringList(condition.encounter.requiredFlags)
        const blockedFlags = normalizeStringList(condition.encounter.blockedFlags)

        if (requiredFlags.some((flagId) => encounter.flags[flagId] !== true)) {
          return [encounterId]
        }

        if (blockedFlags.some((flagId) => encounter.flags[flagId] === true)) {
          return [encounterId]
        }

        return []
      })()
    : []

  const failedActiveContexts = (() => {
    const expectedContexts = normalizeStringList(condition.activeContexts)

    if (expectedContexts.length === 0) {
      return []
    }

    const actualContextId = normalizeString(routeContext.activeContextId)
    return expectedContexts.includes(actualContextId) ? [] : expectedContexts
  })()

  const failedPredicates = (condition.predicates ?? [])
    .filter((predicate) => !predicate.test({ state, context: routeContext }))
    .map((predicate) => normalizeString(predicate.id) || 'anonymous-predicate')

  return {
    passes:
      (flagEvaluation?.passes ?? true) &&
      locationMatched &&
      failedProgressClocks.length === 0 &&
      failedEncounterIds.length === 0 &&
      failedActiveContexts.length === 0 &&
      failedPredicates.length === 0,
    flagEvaluation,
    locationMatched,
    failedProgressClocks,
    failedEncounterIds,
    failedActiveContexts,
    failedPredicates,
  }
}

/**
 * First-match deterministic selector for authored screen/content variants.
 * Conditional branches are checked in order, then the first unconditional
 * branch is treated as the fallback.
 */
export function selectScreenRoute<T, Context extends ScreenRouteContext = ScreenRouteContext>(
  state: GameState,
  branches: readonly ScreenRouteBranch<T, Context>[],
  context?: Context
): ScreenRouteSelection<T> | null {
  let fallback: ScreenRouteBranch<T, Context> | null = null

  for (const branch of branches) {
    if (!branch.when) {
      fallback ??= branch
      continue
    }

    const evaluation = evaluateScreenRouteCondition(state, branch.when, context)

    if (evaluation.passes) {
      return {
        branchId: branch.id,
        value: branch.value,
        isFallback: false,
      }
    }
  }

  if (!fallback) {
    return null
  }

  return {
    branchId: fallback.id,
    value: fallback.value,
    isFallback: true,
  }
}
