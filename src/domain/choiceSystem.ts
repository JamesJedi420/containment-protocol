import {
  type ProgressClockPatch,
  recordSceneVisit,
  setCurrentLocation,
  setEncounterRuntimeState,
  type EncounterRuntimePatch,
  type SceneVisitInput,
} from './gameStateManager'
import {
  clearPersistentFlag,
  consumeOneShotContent,
  setPersistentFlag,
} from './flagSystem'
import {
  evaluateScreenRouteCondition,
  type ScreenRouteCondition,
  type ScreenRouteConditionEvaluation,
  type ScreenRouteContext,
} from './screenRouting'
import { enqueueRuntimeEvent } from './eventQueue'
import {
  advanceDefinedProgressClock,
  setDefinedProgressClock,
  type ProgressClockDefaults,
} from './progressClocks'
import type {
  GameFlagValue,
  GameLocationState,
  GameState,
} from './models'

export type AuthoredChoiceTone = 'neutral' | 'success' | 'warning' | 'danger'

export type AuthoredChoiceConsequence =
  | {
      type: 'set_flag'
      flagId: string
      value?: GameFlagValue
    }
  | {
      type: 'clear_flag'
      flagId: string
    }
  | {
      type: 'consume_one_shot'
      contentId: string
      source?: string
    }
  | {
      type: 'set_progress_clock'
      clockId: string
      patch: ProgressClockPatch
    }
  | {
      type: 'advance_progress_clock'
      clockId: string
      delta: number
      defaults?: ProgressClockDefaults
    }
  | {
      type: 'set_location'
      location: Pick<GameLocationState, 'hubId'> & Partial<Omit<GameLocationState, 'hubId'>>
    }
  | {
      type: 'record_scene_visit'
      entry: SceneVisitInput
    }
  | {
      type: 'patch_encounter'
      encounterId: string
      patch: EncounterRuntimePatch
    }
  | {
      type: 'emit_follow_up'
      /** Result-only follow-up identifier for UI/report orchestration. */
      followUpId: string
    }

export interface AuthoredChoiceDefinition<
  Context extends ScreenRouteContext = ScreenRouteContext,
> {
  id: string
  label: string
  description?: string
  tone?: AuthoredChoiceTone
  when?: ScreenRouteCondition<Context>
  nextTargetId?: string
  consequences: readonly AuthoredChoiceConsequence[]
}

export interface AppliedAuthoredConsequence {
  type: AuthoredChoiceConsequence['type']
  key: string
  changed: boolean
}

export interface AuthoredChoiceExecutionResult {
  state: GameState
  choiceId: string
  applied: boolean
  availability: ScreenRouteConditionEvaluation | null
  nextTargetId?: string
  followUpIds: string[]
  appliedConsequences: AppliedAuthoredConsequence[]
  changedFlags: string[]
  clearedFlags: string[]
  consumedOneShots: string[]
  touchedProgressClocks: string[]
  touchedEncounterIds: string[]
  sceneVisits: string[]
  locationUpdated: boolean
}

function normalizeAuthorId(value: string | undefined | null) {
  return typeof value === 'string' ? value.trim() : ''
}

export function evaluateAuthoredChoiceAvailability<
  Context extends ScreenRouteContext = ScreenRouteContext,
>(state: GameState, choice: AuthoredChoiceDefinition<Context>, context?: Context) {
  return choice.when ? evaluateScreenRouteCondition(state, choice.when, context) : null
}

export function canExecuteAuthoredChoice<
  Context extends ScreenRouteContext = ScreenRouteContext,
>(state: GameState, choice: AuthoredChoiceDefinition<Context>, context?: Context) {
  return evaluateAuthoredChoiceAvailability(state, choice, context)?.passes ?? true
}

/**
 * Deterministic authored-choice executor for notices, report actions, alerts,
 * and scripted follow-up handling. Operational sim systems should keep using
 * their domain commands; this layer is for shared authored runtime/meta state.
 */
export function applyAuthoredChoice<
  Context extends ScreenRouteContext = ScreenRouteContext,
>(
  state: GameState,
  choice: AuthoredChoiceDefinition<Context>,
  context?: Context
): AuthoredChoiceExecutionResult {
  const availability = evaluateAuthoredChoiceAvailability(state, choice, context)

  if (availability && !availability.passes) {
    return {
      state,
      choiceId: choice.id,
      applied: false,
      availability,
      ...(choice.nextTargetId ? { nextTargetId: choice.nextTargetId } : {}),
      followUpIds: [],
      appliedConsequences: [],
      changedFlags: [],
      clearedFlags: [],
      consumedOneShots: [],
      touchedProgressClocks: [],
      touchedEncounterIds: [],
      sceneVisits: [],
      locationUpdated: false,
    }
  }

  let nextState = state
  const changedFlags: string[] = []
  const clearedFlags: string[] = []
  const consumedOneShots: string[] = []
  const touchedProgressClocks: string[] = []
  const touchedEncounterIds: string[] = []
  const sceneVisits: string[] = []
  const followUpIds: string[] = []
  const appliedConsequences: AppliedAuthoredConsequence[] = []
  let locationUpdated = false

  for (const consequence of choice.consequences) {
    if (consequence.type === 'set_flag') {
      const flagId = normalizeAuthorId(consequence.flagId)

      if (flagId.length === 0) {
        continue
      }

      nextState = setPersistentFlag(nextState, flagId, consequence.value ?? true)
      changedFlags.push(flagId)
      appliedConsequences.push({
        type: consequence.type,
        key: flagId,
        changed: true,
      })
      continue
    }

    if (consequence.type === 'clear_flag') {
      const flagId = normalizeAuthorId(consequence.flagId)

      if (flagId.length === 0) {
        continue
      }

      nextState = clearPersistentFlag(nextState, flagId)
      clearedFlags.push(flagId)
      appliedConsequences.push({
        type: consequence.type,
        key: flagId,
        changed: true,
      })
      continue
    }

    if (consequence.type === 'consume_one_shot') {
      const contentId = normalizeAuthorId(consequence.contentId)

      if (contentId.length === 0) {
        continue
      }

      const result = consumeOneShotContent(
        nextState,
        contentId,
        consequence.source ?? choice.id
      )
      nextState = result.state

      if (result.consumed) {
        consumedOneShots.push(contentId)
      }

      appliedConsequences.push({
        type: consequence.type,
        key: contentId,
        changed: result.consumed,
      })
      continue
    }

    if (consequence.type === 'set_progress_clock') {
      const clockId = normalizeAuthorId(consequence.clockId)

      if (clockId.length === 0) {
        continue
      }

      nextState = setDefinedProgressClock(nextState, clockId, consequence.patch)
      touchedProgressClocks.push(clockId)
      appliedConsequences.push({
        type: consequence.type,
        key: clockId,
        changed: true,
      })
      continue
    }

    if (consequence.type === 'advance_progress_clock') {
      const clockId = normalizeAuthorId(consequence.clockId)

      if (clockId.length === 0) {
        continue
      }

      nextState = advanceDefinedProgressClock(
        nextState,
        clockId,
        consequence.delta,
        consequence.defaults
      )
      touchedProgressClocks.push(clockId)
      appliedConsequences.push({
        type: consequence.type,
        key: clockId,
        changed: true,
      })
      continue
    }

    if (consequence.type === 'set_location') {
      nextState = setCurrentLocation(nextState, consequence.location)
      locationUpdated = true
      appliedConsequences.push({
        type: consequence.type,
        key: normalizeAuthorId(consequence.location.sceneId) || consequence.location.hubId,
        changed: true,
      })
      continue
    }

    if (consequence.type === 'record_scene_visit') {
      const sceneId = normalizeAuthorId(consequence.entry.sceneId)

      if (sceneId.length === 0) {
        continue
      }

      nextState = recordSceneVisit(nextState, consequence.entry)
      sceneVisits.push(sceneId)
      appliedConsequences.push({
        type: consequence.type,
        key: sceneId,
        changed: true,
      })
      continue
    }

    if (consequence.type === 'patch_encounter') {
      const encounterId = normalizeAuthorId(consequence.encounterId)

      if (encounterId.length === 0) {
        continue
      }

      nextState = setEncounterRuntimeState(nextState, encounterId, consequence.patch)
      touchedEncounterIds.push(encounterId)
      appliedConsequences.push({
        type: consequence.type,
        key: encounterId,
        changed: true,
      })
      continue
    }

    const followUpId = normalizeAuthorId(consequence.followUpId)

    if (followUpId.length === 0) {
      continue
    }

    const enqueueResult = enqueueRuntimeEvent(nextState, {
      type: 'authored.follow_up',
      targetId: followUpId,
      contextId: context?.activeContextId,
      source: choice.id,
      week: nextState.week,
      payload: {
        choiceId: choice.id,
      },
    })

    nextState = enqueueResult.state
    followUpIds.push(followUpId)
    appliedConsequences.push({
      type: consequence.type,
      key: followUpId,
      changed: true,
    })
  }

  return {
    state: nextState,
    choiceId: choice.id,
    applied: true,
    availability,
    ...(choice.nextTargetId ? { nextTargetId: choice.nextTargetId } : {}),
    followUpIds,
    appliedConsequences,
    changedFlags,
    clearedFlags,
    consumedOneShots,
    touchedProgressClocks,
    touchedEncounterIds,
    sceneVisits,
    locationUpdated,
  }
}
