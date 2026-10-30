import type { GameState } from './models'
import {
  OPERATIONAL_EXPLANATION_DEPTHS,
  createOperationalExplanationRecord,
  projectOperationalExplanation,
  sortOperationalExplanationRecords,
  validateOperationalExplanationRecord,
} from './operationalExplanation'
import type {
  OperationalExplanationDepth,
  OperationalExplanationProjection,
  OperationalExplanationRecord,
} from './operationalExplanation'
import { evaluateScreenRouteCondition } from './screenRouting'
import type { ScreenRouteCondition, ScreenRouteContext } from './screenRouting'
import {
  createTutorialState,
  evaluateTutorialStepEligibility,
  isTutorialLifecycleState,
} from './tutorialLifecycle'
import type {
  TutorialDefinition,
  TutorialLifecycleState,
  TutorialStepDefinition,
} from './tutorialLifecycle'

export type TutorialInputMethod = 'keyboard' | 'controller' | 'pointer' | 'touch'

export interface TutorialAccessibilityInput {
  readonly inputMethod?: TutorialInputMethod
  readonly supportedInputs?: readonly TutorialInputMethod[]
  readonly screenReader?: boolean
  readonly textScale?: number
  readonly reducedMotion?: boolean
  readonly hover?: boolean
}

/** Labels come from the current canonical input owner, never tutorial definitions. */
export type TutorialBindingResolver = (
  actionId: string,
  method: TutorialInputMethod
) => { readonly label: string } | undefined

export interface TutorialVisibleExplanation {
  readonly record: OperationalExplanationRecord
  /** Owner authorizes this record AND every field through this depth. */
  readonly permittedDepth: OperationalExplanationDepth
}

export type TutorialActionContext =
  | { readonly visible: false }
  | {
      readonly visible: true
      readonly label: string
      readonly available: boolean
      readonly explanations?: readonly TutorialVisibleExplanation[]
    }

export interface TutorialGuidanceAdapters<Context extends ScreenRouteContext = ScreenRouteContext> {
  readonly conditions?: Readonly<Record<string, ScreenRouteCondition<Context>>>
  /** Undefined hides the step. Return only ordinary player-visible semantic text.
   * Include owner-supplied scope, constraints, exception paths and uncertainty here.
   */
  readonly resolveContent: (
    state: GameState,
    context: Context,
    definition: TutorialDefinition,
    step: TutorialStepDefinition
  ) => readonly string[] | undefined
  /** Must use the production action's current visibility/authorization projection. */
  readonly resolveAction?: (
    state: GameState,
    context: Context,
    actionId: string
  ) => TutorialActionContext | undefined
  readonly resolveBinding?: TutorialBindingResolver
}

export interface TutorialGuidanceContext {
  readonly tutorialId: string
  readonly definitionVersion: number
  readonly stepId: string
  readonly action?: {
    readonly id: string
    readonly label: string
    readonly available: boolean
    readonly bindingLabel?: string
    readonly bindingStatus: 'resolved' | 'missing' | 'unsupported'
  }
  readonly explanations: readonly OperationalExplanationProjection[]
  /** Identical meaning for visual, screen-reader and reduced-motion renderers. */
  readonly semanticText: readonly string[]
  readonly accessibility: {
    readonly inputMethod?: TutorialInputMethod
    readonly screenReader: boolean
    readonly textScale: number
    readonly reducedMotion: boolean
    readonly hover: boolean
    readonly criticalMeaningRequiresHover: false
  }
}

function projectExplanations(
  entries: readonly TutorialVisibleExplanation[],
  requestedDepth: OperationalExplanationDepth
): readonly OperationalExplanationProjection[] {
  // Duplicate identities are ambiguous; omit rather than select by input ordering.
  const counts = new Map<string, number>()
  for (const { record } of entries) counts.set(record.id, (counts.get(record.id) ?? 0) + 1)
  const accepted = entries.filter(
    ({ record, permittedDepth }) =>
      counts.get(record.id) === 1 &&
      OPERATIONAL_EXPLANATION_DEPTHS.includes(permittedDepth) &&
      validateOperationalExplanationRecord(record).valid
  )
  return Object.freeze(
    sortOperationalExplanationRecords(accepted.map(({ record }) => record)).map((record) => {
      const permitted = accepted.find((entry) => entry.record === record)!.permittedDepth
      const depth =
        OPERATIONAL_EXPLANATION_DEPTHS[
          Math.min(
            OPERATIONAL_EXPLANATION_DEPTHS.indexOf(requestedDepth),
            OPERATIONAL_EXPLANATION_DEPTHS.indexOf(permitted)
          )
        ]
      return projectOperationalExplanation(createOperationalExplanationRecord(record), depth)
    })
  )
}

function resolveGuidanceAction<Context extends ScreenRouteContext>(
  game: GameState,
  context: Context,
  step: TutorialStepDefinition,
  adapters: TutorialGuidanceAdapters<Context>,
  preferences: TutorialAccessibilityInput,
  requestedDepth: OperationalExplanationDepth,
  content: readonly string[]
) {
  const method = preferences.inputMethod
  const supported = method !== undefined && preferences.supportedInputs?.includes(method) === true
  let explanations: readonly OperationalExplanationProjection[] = Object.freeze([])
  const semanticText = [...content]
  if (!step.expectedActionId) return { action: undefined, explanations, semanticText }
  const owner = adapters.resolveAction?.(game, context, step.expectedActionId)
  // Missing/hidden actions never disclose their id, label, binding or explanation.
  if (!owner?.visible) return undefined
  if (!owner.label.trim()) return undefined
  const binding = supported ? adapters.resolveBinding?.(step.expectedActionId, method!) : undefined
  const bindingLabel = binding?.label.trim() || undefined
  const action: TutorialGuidanceContext['action'] = Object.freeze({
    id: step.expectedActionId,
    label: owner.label,
    available: owner.available,
    bindingLabel,
    bindingStatus: !supported ? 'unsupported' : bindingLabel ? 'resolved' : 'missing',
  })
  const requested = requestedDepth
  explanations = projectExplanations(
    owner.explanations ?? [],
    OPERATIONAL_EXPLANATION_DEPTHS.includes(requested) ? requested : 'summary'
  )
  semanticText.push(owner.available ? owner.label : `${owner.label}: currently unavailable.`)
  if (bindingLabel) semanticText.push(`Current control: ${bindingLabel}.`)
  else semanticText.push('Use the ordinary action controls when available; guidance is optional.')
  for (const explanation of explanations) {
    semanticText.push(
      ...[
        explanation.reasonText,
        explanation.cause,
        explanation.currentEffect,
        explanation.projectedConsequence,
        explanation.correctionCondition,
        explanation.correctiveAction?.label,
        explanation.confidence === undefined ? undefined : `Confidence: ${explanation.confidence}.`,
      ].filter((text): text is string => typeof text === 'string' && text.length > 0)
    )
  }
  return { action, explanations, semanticText }
}

function resolveAccessibility(
  preferences: TutorialAccessibilityInput
): TutorialGuidanceContext['accessibility'] {
  const method = preferences.inputMethod
  const supported = method !== undefined && preferences.supportedInputs?.includes(method) === true
  return Object.freeze({
    inputMethod: supported ? method : undefined,
    screenReader: preferences.screenReader === true,
    textScale:
      Number.isFinite(preferences.textScale) && preferences.textScale! > 0
        ? preferences.textScale!
        : 1,
    reducedMotion: preferences.reducedMotion !== false,
    hover: preferences.hover === true,
    criticalMeaningRequiresHover: false,
  })
}

/** Pure read adapter. It neither authorizes nor executes production actions. */
export function selectTutorialGuidance<Context extends ScreenRouteContext>(input: {
  readonly game: GameState
  readonly context: Context
  readonly definition: TutorialDefinition
  readonly lifecycle?: TutorialLifecycleState
  readonly triggerIds?: readonly string[]
  readonly adapters: TutorialGuidanceAdapters<Context>
  readonly accessibility?: TutorialAccessibilityInput
  readonly explanationDepth?: OperationalExplanationDepth
}): TutorialGuidanceContext | undefined {
  const { game, context, definition, adapters } = input
  const lifecycle = input.lifecycle ?? createTutorialState(definition)
  if (
    !isTutorialLifecycleState(lifecycle, definition) ||
    !['not_started', 'active'].includes(lifecycle.status)
  )
    return undefined
  const step = definition.steps[lifecycle.cursor]
  const conditions: Record<string, { passes: boolean }> = Object.create(null)
  for (const id of new Set([...(definition.conditionIds ?? []), ...(step.conditionIds ?? [])])) {
    conditions[id] = Object.freeze({
      passes:
        Object.hasOwn(adapters.conditions ?? {}, id) &&
        adapters.conditions?.[id] !== undefined &&
        evaluateScreenRouteCondition(game, adapters.conditions[id], context).passes,
    })
  }
  const eligibility = Object.freeze({
    conditions: Object.freeze(conditions),
    triggerIds: Object.freeze([...(input.triggerIds ?? [])]),
  })
  if (
    !evaluateTutorialStepEligibility(
      definition,
      lifecycle.cursor,
      eligibility,
      lifecycle.status === 'not_started'
    )
  )
    return undefined
  const content = adapters.resolveContent(game, context, definition, step)
  if (
    !content?.length ||
    Array.from(content).some((text) => typeof text !== 'string' || !text.trim())
  )
    return undefined

  const preferences = input.accessibility ?? {}
  const resolved = resolveGuidanceAction(
    game,
    context,
    step,
    adapters,
    preferences,
    input.explanationDepth ?? 'summary',
    content
  )
  if (!resolved) return undefined
  const { action, explanations, semanticText } = resolved
  return Object.freeze({
    tutorialId: definition.id,
    definitionVersion: definition.version,
    stepId: step.id,
    action,
    explanations,
    semanticText: Object.freeze(semanticText),
    accessibility: resolveAccessibility(preferences),
  })
}
