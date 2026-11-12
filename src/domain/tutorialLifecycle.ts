import type { ScreenRouteConditionEvaluation } from './screenRouting'

export interface TutorialStepDefinition {
  readonly id: string
  readonly conditionIds?: readonly string[]
  readonly triggerId?: string
  /** Reference only: progressing guidance never executes this action. */
  readonly expectedActionId?: string
}

export interface TutorialDefinition {
  readonly id: string
  readonly version: number
  readonly kind: 'sequenced' | 'contextual'
  readonly allowBack: boolean
  readonly replayable: boolean
  readonly conditionIds?: readonly string[]
  readonly steps: readonly TutorialStepDefinition[]
}

export interface TutorialRegistry {
  readonly definitions: readonly TutorialDefinition[]
  readonly get: (id: string, version: number) => TutorialDefinition | undefined
}

export const isTutorialIdentifier = (id: unknown): id is string =>
  typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:/-]*$/.test(id)

function validateConditions(ids: readonly string[] | undefined) {
  if (
    ids !== undefined &&
    (!Array.isArray(ids) ||
      Array.from(ids).some((id) => !isTutorialIdentifier(id)) ||
      new Set(ids).size !== ids.length)
  ) {
    throw new Error('Invalid tutorial condition references')
  }
}

/** Versioned identities are unique; authored step order is never sorted. */
export function createTutorialRegistry(
  definitions: readonly TutorialDefinition[]
): TutorialRegistry {
  const keys = new Set<string>()
  const copies = Array.from(definitions).map((definition) => {
    if (
      !definition ||
      !isTutorialIdentifier(definition.id) ||
      !Number.isSafeInteger(definition.version) ||
      definition.version < 1 ||
      !['sequenced', 'contextual'].includes(definition.kind) ||
      typeof definition.allowBack !== 'boolean' ||
      typeof definition.replayable !== 'boolean' ||
      !Array.isArray(definition.steps) ||
      definition.steps.length === 0
    ) {
      throw new Error('Invalid tutorial definition')
    }
    const key = `${definition.id}@${definition.version}`
    if (keys.has(key)) throw new Error(`Duplicate tutorial definition: ${key}`)
    keys.add(key)
    validateConditions(definition.conditionIds)
    const stepIds = new Set<string>()
    const steps = Array.from(definition.steps).map((step) => {
      if (
        !step ||
        !isTutorialIdentifier(step.id) ||
        stepIds.has(step.id) ||
        (step.triggerId !== undefined && !isTutorialIdentifier(step.triggerId)) ||
        (step.expectedActionId !== undefined && !isTutorialIdentifier(step.expectedActionId))
      ) {
        throw new Error(`Invalid tutorial step: ${key}`)
      }
      stepIds.add(step.id)
      validateConditions(step.conditionIds)
      return Object.freeze({
        id: step.id,
        triggerId: step.triggerId,
        expectedActionId: step.expectedActionId,
        conditionIds:
          step.conditionIds === undefined ? undefined : Object.freeze([...step.conditionIds]),
      })
    })
    return Object.freeze({
      id: definition.id,
      version: definition.version,
      kind: definition.kind,
      allowBack: definition.allowBack,
      replayable: definition.replayable,
      conditionIds:
        definition.conditionIds === undefined
          ? undefined
          : Object.freeze([...definition.conditionIds]),
      steps: Object.freeze(steps),
    })
  })
  copies.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.version - b.version))
  return Object.freeze({
    definitions: Object.freeze(copies),
    get: (id: string, version: number) =>
      copies.find((definition) => definition.id === id && definition.version === version),
  })
}

export type TutorialStatus =
  | 'not_started'
  | 'active'
  | 'completed'
  | 'dismissed'
  | 'skipped'
  | 'suppressed'
  | 'interrupted'
  | 'canceled'
export type TutorialStepStatus = 'not_started' | 'active' | 'completed' | 'skipped'

const tutorialStatuses: readonly string[] = [
  'not_started',
  'active',
  'completed',
  'dismissed',
  'skipped',
  'suppressed',
  'interrupted',
  'canceled',
]
const resumeStatuses = tutorialStatuses.filter((status) => status !== 'suppressed')
const stepStatuses: readonly string[] = ['not_started', 'active', 'completed', 'skipped']

/** Serializable value contract; persistence and migration belong to SPE-2918. */
export interface TutorialLifecycleState {
  readonly tutorialId: string
  readonly definitionVersion: number
  readonly revision: number
  readonly run: number
  readonly status: TutorialStatus
  readonly cursor: number
  /** Furthest step entered in this run; entry events are consumed once per run. */
  readonly reachedCursor: number
  readonly stepStatuses: readonly TutorialStepStatus[]
  readonly resumeStatus?: Exclude<TutorialStatus, 'suppressed'>
}

export interface TutorialEligibility {
  /** Supplied by authoritative condition adapters, e.g. evaluateScreenRouteCondition. */
  readonly conditions?: Readonly<Record<string, Pick<ScreenRouteConditionEvaluation, 'passes'>>>
  readonly triggerIds?: readonly string[]
}

export type TutorialCommandType =
  | 'start'
  | 'advance'
  | 'back'
  | 'complete'
  | 'dismiss'
  | 'skip'
  | 'suppress'
  | 'unsuppress'
  | 'interrupt'
  | 'resume'
  | 'cancel'
  | 'replay_start'
export interface TutorialCommand {
  readonly type: TutorialCommandType
  /** Compare-and-set token: duplicate deliveries and commands from old runs are no-ops. */
  readonly expectedRevision: number
  readonly stepId?: string
}
export interface TutorialTransitionResult {
  readonly state: TutorialLifecycleState
  readonly changed: boolean
  readonly reason: 'changed' | 'stale' | 'invalid_state' | 'illegal' | 'ineligible'
  /** Semantic hook for future telemetry; emitted only for actual state changes. */
  readonly events: readonly TutorialCommandType[]
}

function freezeState(state: TutorialLifecycleState): TutorialLifecycleState {
  return Object.freeze({ ...state, stepStatuses: Object.freeze([...state.stepStatuses]) })
}

export function createTutorialState(definition: TutorialDefinition): TutorialLifecycleState {
  return freezeState({
    tutorialId: definition.id,
    definitionVersion: definition.version,
    revision: 0,
    run: 0,
    status: 'not_started',
    cursor: 0,
    reachedCursor: 0,
    stepStatuses: definition.steps.map(() => 'not_started'),
  })
}

export function evaluateTutorialStepEligibility(
  definition: TutorialDefinition,
  index: number,
  input: TutorialEligibility,
  entering = true
) {
  const step = definition.steps[index]
  return (
    !!step &&
    [...(definition.conditionIds ?? []), ...(step.conditionIds ?? [])].every(
      (id) => Object.hasOwn(input.conditions ?? {}, id) && input.conditions?.[id]?.passes === true
    ) &&
    (!entering ||
      step.triggerId === undefined ||
      input.triggerIds?.includes(step.triggerId) === true)
  )
}

/** Shared structural guard for runtime commands and untrusted save hydration. */
export function isTutorialLifecycleState(
  value: unknown,
  definition: Pick<TutorialDefinition, 'id' | 'version' | 'steps'>
): value is TutorialLifecycleState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const state = value as Record<string, unknown>
  if (
    state.tutorialId !== definition.id ||
    typeof state.revision !== 'number' ||
    typeof state.run !== 'number' ||
    typeof state.cursor !== 'number' ||
    typeof state.reachedCursor !== 'number' ||
    typeof state.status !== 'string' ||
    state.definitionVersion !== definition.version ||
    !Number.isSafeInteger(state.revision) ||
    state.revision < 0 ||
    state.revision > Number.MAX_SAFE_INTEGER ||
    !Number.isSafeInteger(state.run) ||
    state.run < 0 ||
    state.run > Number.MAX_SAFE_INTEGER ||
    !Number.isInteger(state.cursor) ||
    state.cursor < 0 ||
    state.cursor >= definition.steps.length ||
    !Number.isInteger(state.reachedCursor) ||
    state.reachedCursor < state.cursor ||
    state.reachedCursor >= definition.steps.length ||
    !tutorialStatuses.includes(state.status) ||
    (state.status === 'suppressed'
      ? typeof state.resumeStatus !== 'string' || !resumeStatuses.includes(state.resumeStatus)
      : state.resumeStatus !== undefined) ||
    !Array.isArray(state.stepStatuses) ||
    state.stepStatuses.length !== definition.steps.length ||
    Array.from(state.stepStatuses).some((status) => !stepStatuses.includes(status))
  )
    return false
  return true
}

/** Pure guidance transitions. Caller retains ownership of production actions and truth. */
export function transitionTutorial(
  definition: TutorialDefinition,
  state: TutorialLifecycleState,
  command: TutorialCommand,
  input: TutorialEligibility = {}
): TutorialTransitionResult {
  const unchanged = (reason: TutorialTransitionResult['reason']): TutorialTransitionResult => ({
    state,
    changed: false,
    reason,
    events: [],
  })
  if (!isTutorialLifecycleState(state, definition)) return unchanged('invalid_state')
  if (command.expectedRevision !== state.revision) return unchanged('stale')
  if (state.revision === Number.MAX_SAFE_INTEGER || state.run === Number.MAX_SAFE_INTEGER)
    return unchanged('invalid_state')
  const update = (patch: Partial<TutorialLifecycleState>): TutorialTransitionResult => ({
    state: freezeState({ ...state, ...patch, revision: state.revision + 1 }),
    changed: true,
    reason: 'changed',
    events: [command.type],
  })
  const terminal = ['completed', 'dismissed', 'skipped', 'canceled'].includes(state.status)
  if (command.type === 'suppress' && state.status !== 'suppressed') {
    return update({ status: 'suppressed', resumeStatus: state.status })
  }
  if (command.type === 'unsuppress' && state.status === 'suppressed' && state.resumeStatus) {
    return update({ status: state.resumeStatus, resumeStatus: undefined })
  }
  if (command.type === 'start' || command.type === 'replay_start') {
    if (
      command.type === 'start'
        ? state.status !== 'not_started'
        : !terminal || !definition.replayable
    )
      return unchanged('illegal')
    if (!evaluateTutorialStepEligibility(definition, 0, input)) return unchanged('ineligible')
    return update({
      status: 'active',
      cursor: 0,
      reachedCursor: 0,
      run: state.run + 1,
      stepStatuses: definition.steps.map((_, index) => (index === 0 ? 'active' : 'not_started')),
      resumeStatus: undefined,
    })
  }
  if (command.type === 'resume' && state.status === 'interrupted') {
    if (!evaluateTutorialStepEligibility(definition, state.cursor, input, false))
      return unchanged('ineligible')
    return update({ status: 'active' })
  }
  if (command.type === 'cancel' && (state.status === 'active' || state.status === 'interrupted'))
    return update({ status: 'canceled' })
  if (state.status !== 'active') return unchanged('illegal')
  if (command.type === 'interrupt') return update({ status: 'interrupted' })
  if (command.type === 'dismiss') return update({ status: 'dismissed' })
  if (
    !['advance', 'complete', 'skip', 'back'].includes(command.type) ||
    command.stepId !== definition.steps[state.cursor].id
  )
    return unchanged('illegal')
  if (command.type === 'complete' && state.cursor !== definition.steps.length - 1)
    return unchanged('illegal')
  if (command.type === 'back' && (!definition.allowBack || state.cursor === 0))
    return unchanged('illegal')
  const target = command.type === 'back' ? state.cursor - 1 : state.cursor + 1
  if (
    (command.type === 'advance' || command.type === 'complete') &&
    !evaluateTutorialStepEligibility(definition, state.cursor, input, false)
  )
    return unchanged('ineligible')
  if (
    target < definition.steps.length &&
    !evaluateTutorialStepEligibility(definition, target, input, target > state.reachedCursor)
  )
    return unchanged('ineligible')
  const statuses = [...state.stepStatuses]
  statuses[state.cursor] =
    command.type === 'skip' ? 'skipped' : command.type === 'back' ? 'not_started' : 'completed'
  if (target >= definition.steps.length)
    return update({
      status: statuses.every((status) => status === 'skipped') ? 'skipped' : 'completed',
      stepStatuses: statuses,
    })
  statuses[target] = 'active'
  return update({
    cursor: target,
    reachedCursor: Math.max(state.reachedCursor, target),
    stepStatuses: statuses,
  })
}

/** Pure availability query for presentation; the transition owner retains every rule. */
export function getAvailableTutorialCommands(
  definition: TutorialDefinition,
  state: TutorialLifecycleState,
  eligibility: TutorialEligibility = {}
): readonly TutorialCommandType[] {
  const commands: readonly TutorialCommandType[] = [
    'start',
    'advance',
    'complete',
    'back',
    'skip',
    'dismiss',
    'suppress',
    'unsuppress',
    'interrupt',
    'resume',
    'cancel',
    'replay_start',
  ]
  return Object.freeze(
    commands.filter(
      (type) =>
        transitionTutorial(
          definition,
          state,
          {
            type,
            expectedRevision: state.revision,
            stepId: definition.steps[state.cursor]?.id,
          },
          eligibility
        ).changed
    )
  )
}
