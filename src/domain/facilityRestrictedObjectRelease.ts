/** SPE-2911 / SPE-1027 authored restricted-object component-set custody and release. */

import type { GameState } from './models'
import { ensureNormalizedGameState } from './teamSimulation'

export const RELIQUARY_KEY_SET_ID = 'reliquary_key_set' as const

export const RELIQUARY_KEY_SET_COMPONENT_IDS = [
  'reliquary_key_set_1',
  'reliquary_key_set_2',
] as const

export const RESTRICTED_OBJECT_SET_IDS = [RELIQUARY_KEY_SET_ID] as const
export type RestrictedObjectSetId = (typeof RESTRICTED_OBJECT_SET_IDS)[number]

export type RestrictedObjectComponentId = (typeof RELIQUARY_KEY_SET_COMPONENT_IDS)[number]

export const RESTRICTED_OBJECT_SET_COMPONENTS = {
  [RELIQUARY_KEY_SET_ID]: RELIQUARY_KEY_SET_COMPONENT_IDS,
} as const

export const RESTRICTED_OBJECT_RELEASE_MODES = ['stored', 'inspection', 'testing'] as const
export type RestrictedObjectReleaseMode = (typeof RESTRICTED_OBJECT_RELEASE_MODES)[number]

export type RestrictedObjectReleaseSnapshot = Readonly<{
  mode: RestrictedObjectReleaseMode
  components: readonly RestrictedObjectComponentId[]
}>

export type FacilityRestrictedObjectRelease = Partial<
  Record<RestrictedObjectSetId, RestrictedObjectReleaseSnapshot>
>

export type FacilityRestrictedObjectReleaseFailureCode =
  'invalid_set' | 'incomplete_set' | 'illegal_transition'

export type FacilityRestrictedObjectStoredResult =
  | {
      ok: true
      state: GameState
      setId: RestrictedObjectSetId
      mode: 'stored'
      components: readonly RestrictedObjectComponentId[]
    }
  | { ok: false; state: GameState; code: FacilityRestrictedObjectReleaseFailureCode }

export type FacilityRestrictedObjectTransitionResult =
  | {
      ok: true
      state: GameState
      setId: RestrictedObjectSetId
      mode: RestrictedObjectReleaseMode
      components: readonly RestrictedObjectComponentId[]
    }
  | { ok: false; state: GameState; code: FacilityRestrictedObjectReleaseFailureCode }

export type FacilityRestrictedObjectResolveResult =
  | {
      ok: true
      state: GameState
      setId: RestrictedObjectSetId
      mode: 'unknown'
    }
  | {
      ok: true
      state: GameState
      setId: RestrictedObjectSetId
      mode: RestrictedObjectReleaseMode
      components: readonly RestrictedObjectComponentId[]
    }
  | { ok: false; state: GameState; code: 'invalid_set' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwnEnumerableProperty(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.propertyIsEnumerable.call(value, key)
}

export function isRestrictedObjectSetId(value: unknown): value is RestrictedObjectSetId {
  return RESTRICTED_OBJECT_SET_IDS.some((setId) => setId === value)
}

export function isRestrictedObjectReleaseMode(
  value: unknown
): value is RestrictedObjectReleaseMode {
  return RESTRICTED_OBJECT_RELEASE_MODES.some((mode) => mode === value)
}

function isAuthoredComponentId(
  setId: RestrictedObjectSetId,
  value: unknown
): value is RestrictedObjectComponentId {
  return RESTRICTED_OBJECT_SET_COMPONENTS[setId].some((componentId) => componentId === value)
}

function authoredComponents(setId: RestrictedObjectSetId): readonly RestrictedObjectComponentId[] {
  return Object.freeze([...RESTRICTED_OBJECT_SET_COMPONENTS[setId]])
}

function isExactAuthoredMembership(
  value: unknown,
  setId: RestrictedObjectSetId
): value is readonly RestrictedObjectComponentId[] {
  if (!Array.isArray(value)) return false
  const expected = RESTRICTED_OBJECT_SET_COMPONENTS[setId]
  if (value.length !== expected.length) return false
  const seen = new Set<string>()
  for (const entry of value) {
    if (!isAuthoredComponentId(setId, entry)) return false
    if (seen.has(entry)) return false
    seen.add(entry)
  }
  return seen.size === expected.length
}

function parseReleaseSnapshot(
  value: unknown,
  setId: RestrictedObjectSetId
): RestrictedObjectReleaseSnapshot | undefined {
  if (!isRecord(value)) return undefined
  if (!hasOwnEnumerableProperty(value, 'mode') || !hasOwnEnumerableProperty(value, 'components')) {
    return undefined
  }
  if (!isRestrictedObjectReleaseMode(value.mode)) return undefined
  if (!isExactAuthoredMembership(value.components, setId)) return undefined
  return Object.freeze({
    mode: value.mode,
    components: authoredComponents(setId),
  })
}

function snapshotFacilityRestrictedObjectRelease(
  release: FacilityRestrictedObjectRelease
): FacilityRestrictedObjectRelease | undefined {
  const next: FacilityRestrictedObjectRelease = {}
  for (const setId of RESTRICTED_OBJECT_SET_IDS) {
    if (!hasOwnEnumerableProperty(release as Record<string, unknown>, setId)) continue
    const snapshot = parseReleaseSnapshot(release[setId], setId)
    if (!snapshot) continue
    next[setId] = snapshot
  }
  return Object.keys(next).length === 0 ? undefined : Object.freeze(next)
}

/**
 * Hydrate optional `GameState.facilityRestrictedObjectRelease`.
 * Omit / non-record / empty after sanitizing → undefined.
 * Unknown, integer-index, prototype-unsafe, non-enumerable, malformed-mode, and
 * malformed-component siblings drop independently. Valid siblings insert in
 * authored set-id order with components rebuilt in authored order.
 */
export function parseFacilityRestrictedObjectRelease(
  value: unknown
): FacilityRestrictedObjectRelease | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined

  const next: FacilityRestrictedObjectRelease = {}
  for (const setId of RESTRICTED_OBJECT_SET_IDS) {
    if (!hasOwnEnumerableProperty(value, setId)) continue
    const snapshot = parseReleaseSnapshot(value[setId], setId)
    if (!snapshot) continue
    next[setId] = snapshot
  }
  return snapshotFacilityRestrictedObjectRelease(next)
}

function readSetId(input: unknown): RestrictedObjectSetId | undefined {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'setId')) return undefined
  return isRestrictedObjectSetId(input.setId) ? input.setId : undefined
}

function readComponents(
  input: unknown,
  setId: RestrictedObjectSetId
): readonly RestrictedObjectComponentId[] | undefined {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'components')) return undefined
  if (!isExactAuthoredMembership(input.components, setId)) return undefined
  return authoredComponents(setId)
}

function readMode(input: unknown): RestrictedObjectReleaseMode | undefined {
  if (!isRecord(input) || !hasOwnEnumerableProperty(input, 'mode')) return undefined
  return isRestrictedObjectReleaseMode(input.mode) ? input.mode : undefined
}

function isLegalRestrictedObjectReleaseTransition(
  from: RestrictedObjectReleaseMode,
  to: RestrictedObjectReleaseMode
): boolean {
  switch (from) {
    case 'stored':
      return to === 'inspection'
    case 'inspection':
      return to === 'testing'
    case 'testing':
      return false
    default: {
      const exhaustive: never = from
      void exhaustive
      return false
    }
  }
}

function writeRelease(
  state: GameState,
  setId: RestrictedObjectSetId,
  snapshot: RestrictedObjectReleaseSnapshot
): GameState | undefined {
  const current = parseFacilityRestrictedObjectRelease(state.facilityRestrictedObjectRelease) ?? {}
  const facilityRestrictedObjectRelease = snapshotFacilityRestrictedObjectRelease({
    ...current,
    [setId]: snapshot,
  })
  if (!facilityRestrictedObjectRelease) return undefined
  return {
    ...ensureNormalizedGameState(state),
    facilityRestrictedObjectRelease,
  }
}

/**
 * Record complete authored membership for one restricted component set in `stored`.
 * Unknown or malformed set input fail-closes `invalid_set`. Missing, extra, duplicate,
 * or unknown components fail-close `incomplete_set`. Failures keep the original state
 * reference. Success does not debit `facilityStockpile` or catalog `inventory`.
 */
export function recordRestrictedObjectStored(
  state: GameState,
  input: unknown
): FacilityRestrictedObjectStoredResult {
  const setId = readSetId(input)
  if (!setId) {
    return { ok: false, state, code: 'invalid_set' }
  }

  const components = readComponents(input, setId)
  if (!components) {
    return { ok: false, state, code: 'incomplete_set' }
  }

  const currentSnapshot = parseFacilityRestrictedObjectRelease(
    state.facilityRestrictedObjectRelease
  )?.[setId]
  if (currentSnapshot && currentSnapshot.mode !== 'stored') {
    return { ok: false, state, code: 'illegal_transition' }
  }

  const snapshot = Object.freeze({
    mode: 'stored' as const,
    components,
  })
  const nextState = writeRelease(state, setId, snapshot)
  if (!nextState) {
    return { ok: false, state, code: 'invalid_set' }
  }

  return {
    ok: true,
    state: nextState,
    setId,
    mode: 'stored',
    components,
  }
}

/**
 * Explicit custody/release mode transition for one authored restricted component set.
 * Requires exact authored membership. `stored` → `inspection` is physical removal and
 * does not authorize testing. `stored` → `testing` fail-closes. `inspection` → `testing`
 * is the restricted operational release. Failures keep the original state reference.
 */
export function transitionRestrictedObjectRelease(
  state: GameState,
  input: unknown
): FacilityRestrictedObjectTransitionResult {
  const setId = readSetId(input)
  if (!setId) {
    return { ok: false, state, code: 'invalid_set' }
  }

  const mode = readMode(input)
  if (!mode) {
    return { ok: false, state, code: 'invalid_set' }
  }

  const components = readComponents(input, setId)
  if (!components) {
    return { ok: false, state, code: 'incomplete_set' }
  }

  const current = parseFacilityRestrictedObjectRelease(state.facilityRestrictedObjectRelease)
  const from = current?.[setId]?.mode
  if (!from || !isLegalRestrictedObjectReleaseTransition(from, mode)) {
    return { ok: false, state, code: 'illegal_transition' }
  }

  const snapshot = Object.freeze({
    mode,
    components,
  })
  const nextState = writeRelease(state, setId, snapshot)
  if (!nextState) {
    return { ok: false, state, code: 'invalid_set' }
  }

  return {
    ok: true,
    state: nextState,
    setId,
    mode,
    components,
  }
}

/**
 * Resolve the current custody/release mode for one authored restricted component set.
 * Unknown or malformed set input fail-closes `invalid_set`. Omit or absent resolves
 * `mode: 'unknown'`. Read-only: returns the same state reference and does not stamp.
 */
export function resolveRestrictedObjectRelease(
  state: GameState,
  input: unknown
): FacilityRestrictedObjectResolveResult {
  const setId = readSetId(input)
  if (!setId) {
    return { ok: false, state, code: 'invalid_set' }
  }

  const release = parseFacilityRestrictedObjectRelease(state.facilityRestrictedObjectRelease)
  const snapshot = release?.[setId]
  if (!snapshot) {
    return {
      ok: true,
      state,
      setId,
      mode: 'unknown',
    }
  }

  return {
    ok: true,
    state,
    setId,
    mode: snapshot.mode,
    components: snapshot.components,
  }
}
