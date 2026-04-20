import { consumeOneShotContent, hasConsumedOneShotContent } from './flagSystem'
import {
  evaluateScreenRouteCondition,
  type ScreenRouteCondition,
  type ScreenRouteConditionEvaluation,
  type ScreenRouteContext,
} from './screenRouting'
import type { GameState } from './models'

export type SceneTriggerMode = 'one_shot' | 'repeatable'

export interface SceneTriggerDefinition<Context extends ScreenRouteContext = ScreenRouteContext> {
  id: string
  description?: string
  /**
   * Trigger evaluation reuses the existing routing condition language so
   * authored eligibility stays aligned with current conditional-content rules.
   */
  when?: ScreenRouteCondition<Context>
  /**
   * One-shot is the safe default for alerts/follow-ups. Use `repeatable`
   * explicitly for hub scenes or recurring authored notices.
   */
  mode?: SceneTriggerMode
  /**
   * Optional explicit consumption id for one-shot triggers. Defaults to `id`
   * so trigger state remains save/load-friendly and easy to inspect.
   */
  consumeId?: string
  /**
   * Higher layers can use this to route/render a scene or content block after
   * eligibility is determined. The trigger system itself never renders content.
   */
  targetId?: string
  tags?: readonly string[]
}

export interface SceneTriggerEvaluation {
  triggerId: string
  targetId?: string
  mode: SceneTriggerMode
  consumeId?: string
  eligible: boolean
  alreadyConsumed: boolean
  conditionEvaluation: ScreenRouteConditionEvaluation | null
}

export interface SceneTriggerFireResult {
  state: GameState
  triggerId: string
  targetId?: string
  mode: SceneTriggerMode
  consumeId?: string
  eligible: boolean
  alreadyConsumed: boolean
  fired: boolean
  consumed: boolean
  conditionEvaluation: ScreenRouteConditionEvaluation | null
}

function normalizeString(value: string | undefined | null) {
  return typeof value === 'string' ? value.trim() : ''
}

export function getSceneTriggerMode<Context extends ScreenRouteContext = ScreenRouteContext>(
  trigger: SceneTriggerDefinition<Context>
) {
  return trigger.mode ?? 'one_shot'
}

export function getSceneTriggerConsumeId<Context extends ScreenRouteContext = ScreenRouteContext>(
  trigger: SceneTriggerDefinition<Context>
) {
  const mode = getSceneTriggerMode(trigger)

  if (mode !== 'one_shot') {
    return undefined
  }

  const explicitConsumeId = normalizeString(trigger.consumeId)
  return explicitConsumeId.length > 0 ? explicitConsumeId : normalizeString(trigger.id) || undefined
}

export function evaluateSceneTrigger<Context extends ScreenRouteContext = ScreenRouteContext>(
  state: GameState,
  trigger: SceneTriggerDefinition<Context>,
  context?: Context
): SceneTriggerEvaluation {
  const mode = getSceneTriggerMode(trigger)
  const consumeId = getSceneTriggerConsumeId(trigger)
  const conditionEvaluation = trigger.when
    ? evaluateScreenRouteCondition(state, trigger.when, context)
    : null
  const alreadyConsumed = consumeId ? hasConsumedOneShotContent(state, consumeId) : false

  return {
    triggerId: trigger.id,
    ...(trigger.targetId ? { targetId: trigger.targetId } : {}),
    mode,
    ...(consumeId ? { consumeId } : {}),
    eligible: (conditionEvaluation?.passes ?? true) && (mode === 'repeatable' || !alreadyConsumed),
    alreadyConsumed,
    conditionEvaluation,
  }
}

export function isSceneTriggerEligible<Context extends ScreenRouteContext = ScreenRouteContext>(
  state: GameState,
  trigger: SceneTriggerDefinition<Context>,
  context?: Context
) {
  return evaluateSceneTrigger(state, trigger, context).eligible
}

export function getEligibleSceneTriggers<Context extends ScreenRouteContext = ScreenRouteContext>(
  state: GameState,
  triggers: readonly SceneTriggerDefinition<Context>[],
  context?: Context
) {
  return triggers
    .map((trigger) => evaluateSceneTrigger(state, trigger, context))
    .filter((evaluation) => evaluation.eligible)
}

export function getEligibleSceneTriggerIds<Context extends ScreenRouteContext = ScreenRouteContext>(
  state: GameState,
  triggers: readonly SceneTriggerDefinition<Context>[],
  context?: Context
) {
  return getEligibleSceneTriggers(state, triggers, context).map((evaluation) => evaluation.triggerId)
}

export function getEligibleSceneTriggerIdSet<Context extends ScreenRouteContext = ScreenRouteContext>(
  state: GameState,
  triggers: readonly SceneTriggerDefinition<Context>[],
  context?: Context
) {
  return new Set(getEligibleSceneTriggerIds(state, triggers, context))
}

export function consumeSceneTrigger<Context extends ScreenRouteContext = ScreenRouteContext>(
  state: GameState,
  trigger: SceneTriggerDefinition<Context>,
  source?: string
) {
  const consumeId = getSceneTriggerConsumeId(trigger)

  if (!consumeId) {
    return {
      state,
      triggerId: trigger.id,
      mode: getSceneTriggerMode(trigger),
      consumed: false,
    }
  }

  const result = consumeOneShotContent(state, consumeId, source ?? `scene_trigger:${trigger.id}`)

  return {
    state: result.state,
    triggerId: trigger.id,
    mode: getSceneTriggerMode(trigger),
    consumeId,
    consumed: result.consumed,
  }
}

/**
 * Explicit fire step for authored triggers. Evaluation stays pure; any one-shot
 * consumption happens only here.
 */
export function fireSceneTrigger<Context extends ScreenRouteContext = ScreenRouteContext>(
  state: GameState,
  trigger: SceneTriggerDefinition<Context>,
  context?: Context,
  source?: string
): SceneTriggerFireResult {
  const evaluation = evaluateSceneTrigger(state, trigger, context)

  if (!evaluation.eligible) {
    return {
      state,
      triggerId: trigger.id,
      ...(trigger.targetId ? { targetId: trigger.targetId } : {}),
      mode: evaluation.mode,
      ...(evaluation.consumeId ? { consumeId: evaluation.consumeId } : {}),
      eligible: false,
      alreadyConsumed: evaluation.alreadyConsumed,
      fired: false,
      consumed: false,
      conditionEvaluation: evaluation.conditionEvaluation,
    }
  }

  if (evaluation.mode === 'repeatable') {
    return {
      state,
      triggerId: trigger.id,
      ...(trigger.targetId ? { targetId: trigger.targetId } : {}),
      mode: evaluation.mode,
      eligible: true,
      alreadyConsumed: evaluation.alreadyConsumed,
      fired: true,
      consumed: false,
      conditionEvaluation: evaluation.conditionEvaluation,
    }
  }

  const consumedResult = consumeSceneTrigger(state, trigger, source)

  return {
    state: consumedResult.state,
    triggerId: trigger.id,
    ...(trigger.targetId ? { targetId: trigger.targetId } : {}),
    mode: evaluation.mode,
    ...(evaluation.consumeId ? { consumeId: evaluation.consumeId } : {}),
    eligible: true,
    alreadyConsumed: evaluation.alreadyConsumed,
    fired: consumedResult.consumed,
    consumed: consumedResult.consumed,
    conditionEvaluation: evaluation.conditionEvaluation,
  }
}
