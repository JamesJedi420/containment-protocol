import {
  clearGlobalFlag,
  consumeOneShotEvent,
  getGlobalFlag,
  getOneShotEventRecord,
  hasOneShotEventOccurred,
  readGameStateManager,
  setGlobalFlag,
  type OneShotConsumptionResult,
} from './gameStateManager'
import type { GameFlagValue, GameState, OneShotEventState } from './models'

export type PersistentFlagId = string
export type OneShotContentId = string

export interface FlagExpectation {
  flagId: PersistentFlagId
  equals?: GameFlagValue
  oneOf?: readonly GameFlagValue[]
}

export interface FlagConditionSet {
  allFlags?: readonly (PersistentFlagId | FlagExpectation)[]
  anyFlags?: readonly (PersistentFlagId | FlagExpectation)[]
  noFlags?: readonly (PersistentFlagId | FlagExpectation)[]
  consumedOneShots?: readonly OneShotContentId[]
  availableOneShots?: readonly OneShotContentId[]
}

export interface FlagConditionEvaluation {
  passes: boolean
  missingAllFlags: PersistentFlagId[]
  missingAnyFlags: PersistentFlagId[]
  blockedFlags: PersistentFlagId[]
  missingConsumedOneShots: OneShotContentId[]
  alreadyConsumedOneShots: OneShotContentId[]
}

export interface FlagSystemSnapshot {
  persistentFlags: Record<PersistentFlagId, GameFlagValue>
  consumedOneShots: Record<OneShotContentId, OneShotEventState>
}

function normalizeAuthorKey(value: string) {
  return value.trim()
}

function normalizeExpectation(
  input: PersistentFlagId | FlagExpectation
): FlagExpectation | null {
  if (typeof input === 'string') {
    const flagId = normalizeAuthorKey(input)
    return flagId.length > 0 ? { flagId } : null
  }

  const flagId = normalizeAuthorKey(input.flagId)

  if (flagId.length === 0) {
    return null
  }

  return {
    flagId,
    ...(input.equals !== undefined ? { equals: input.equals } : {}),
    ...(Array.isArray(input.oneOf) && input.oneOf.length > 0 ? { oneOf: [...input.oneOf] } : {}),
  }
}

function doesExpectationMatch(state: GameState, input: PersistentFlagId | FlagExpectation) {
  const expectation = normalizeExpectation(input)

  if (!expectation) {
    return false
  }

  const value = getGlobalFlag(state, expectation.flagId)

  if (expectation.equals !== undefined) {
    return value === expectation.equals
  }

  if (expectation.oneOf?.length) {
    return expectation.oneOf.includes(value as GameFlagValue)
  }

  return Boolean(value)
}

/**
 * Canonical authored read helper for persistent flags.
 * Use this instead of reaching into `runtimeState.globalFlags` directly.
 */
export function readPersistentFlag(state: GameState, flagId: PersistentFlagId) {
  return getGlobalFlag(state, normalizeAuthorKey(flagId))
}

export function setPersistentFlag(
  state: GameState,
  flagId: PersistentFlagId,
  value: GameFlagValue = true
) {
  return setGlobalFlag(state, normalizeAuthorKey(flagId), value)
}

export function clearPersistentFlag(state: GameState, flagId: PersistentFlagId) {
  return clearGlobalFlag(state, normalizeAuthorKey(flagId))
}

/**
 * Truthy check by default; pass `equals`/`oneOf` expectations when the flag
 * intentionally stores a string or numeric authored state.
 */
export function isPersistentFlagSet(
  state: GameState,
  flagId: PersistentFlagId,
  expected?: GameFlagValue | readonly GameFlagValue[]
) {
  const normalizedId = normalizeAuthorKey(flagId)

  if (normalizedId.length === 0) {
    return false
  }

  if (expected === undefined) {
    return doesExpectationMatch(state, normalizedId)
  }

  if (Array.isArray(expected)) {
    return doesExpectationMatch(state, {
      flagId: normalizedId,
      oneOf: expected,
    })
  }

  return doesExpectationMatch(state, {
    flagId: normalizedId,
    equals: expected as GameFlagValue,
  })
}

export function readConsumedOneShotContent(state: GameState, contentId: OneShotContentId) {
  return getOneShotEventRecord(state, normalizeAuthorKey(contentId))
}

export function hasConsumedOneShotContent(state: GameState, contentId: OneShotContentId) {
  return hasOneShotEventOccurred(state, normalizeAuthorKey(contentId))
}

/**
 * Deterministic one-shot consumption primitive.
 * Once consumed, later calls return `consumed: false` and preserve the original record.
 */
export function consumeOneShotContent(
  state: GameState,
  contentId: OneShotContentId,
  source?: string
): OneShotConsumptionResult {
  return consumeOneShotEvent(state, normalizeAuthorKey(contentId), source)
}

export function selectPersistentFlags(state: GameState, prefix?: string) {
  const normalizedPrefix = prefix ? normalizeAuthorKey(prefix) : ''
  const flags = readGameStateManager(state).globalFlags

  return Object.fromEntries(
    Object.entries(flags).filter(([flagId]) =>
      normalizedPrefix.length > 0 ? flagId.startsWith(normalizedPrefix) : true
    )
  ) as Record<PersistentFlagId, GameFlagValue>
}

export function selectConsumedOneShots(state: GameState, prefix?: string) {
  const normalizedPrefix = prefix ? normalizeAuthorKey(prefix) : ''
  const oneShots = readGameStateManager(state).oneShotEvents

  return Object.fromEntries(
    Object.entries(oneShots).filter(([contentId]) =>
      normalizedPrefix.length > 0 ? contentId.startsWith(normalizedPrefix) : true
    )
  ) as Record<OneShotContentId, OneShotEventState>
}

export function buildFlagSystemSnapshot(state: GameState): FlagSystemSnapshot {
  return {
    persistentFlags: selectPersistentFlags(state),
    consumedOneShots: selectConsumedOneShots(state),
  }
}

/**
 * Author-facing condition helper for weekly events, scripted alerts, follow-up
 * chains, and faction/contact reactions. This keeps gating logic in one place
 * and avoids ad-hoc flag checks spread across systems.
 */
export function evaluateFlagConditions(
  state: GameState,
  conditions: FlagConditionSet
): FlagConditionEvaluation {
  const allFlags = (conditions.allFlags ?? []).map(normalizeExpectation).filter(Boolean) as FlagExpectation[]
  const anyFlags = (conditions.anyFlags ?? []).map(normalizeExpectation).filter(Boolean) as FlagExpectation[]
  const noFlags = (conditions.noFlags ?? []).map(normalizeExpectation).filter(Boolean) as FlagExpectation[]
  const consumedOneShots = (conditions.consumedOneShots ?? []).map(normalizeAuthorKey).filter(Boolean)
  const availableOneShots = (conditions.availableOneShots ?? []).map(normalizeAuthorKey).filter(Boolean)

  const missingAllFlags = allFlags
    .filter((entry) => !doesExpectationMatch(state, entry))
    .map((entry) => entry.flagId)
  const missingAnyFlags =
    anyFlags.length > 0 && !anyFlags.some((entry) => doesExpectationMatch(state, entry))
      ? anyFlags.map((entry) => entry.flagId)
      : []
  const blockedFlags = noFlags
    .filter((entry) => doesExpectationMatch(state, entry))
    .map((entry) => entry.flagId)
  const missingConsumedOneShots = consumedOneShots.filter(
    (contentId) => !hasConsumedOneShotContent(state, contentId)
  )
  const alreadyConsumedOneShots = availableOneShots.filter((contentId) =>
    hasConsumedOneShotContent(state, contentId)
  )

  return {
    passes:
      missingAllFlags.length === 0 &&
      missingAnyFlags.length === 0 &&
      blockedFlags.length === 0 &&
      missingConsumedOneShots.length === 0 &&
      alreadyConsumedOneShots.length === 0,
    missingAllFlags,
    missingAnyFlags,
    blockedFlags,
    missingConsumedOneShots,
    alreadyConsumedOneShots,
  }
}

export function areFlagConditionsSatisfied(state: GameState, conditions: FlagConditionSet) {
  return evaluateFlagConditions(state, conditions).passes
}
