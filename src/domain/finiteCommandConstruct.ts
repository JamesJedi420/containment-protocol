/**
 * SPE-330 — finite-command construct control (pure, caller-owned).
 *
 * Semiautonomous proxies operate only through a fixed bounded command
 * vocabulary. Command sets change movement/attack priorities; delayed
 * fail-safes activate after unattended time. No AI / NLP parser.
 */

import { assertNonEmptyId, assertSafeIntegerInRange } from './assertBoundedInteger'

export const FINITE_COMMAND_CONSTRUCT_OWNER = 'SPE-330' as const

/** Maximum commands allowed in one construct vocabulary. */
export const MAX_COMMAND_VOCABULARY_SIZE = 8 as const

export type ConstructCommand =
  | 'move'
  | 'carry'
  | 'guard'
  | 'attack_priority_high'
  | 'attack_priority_low'
  | 'fallback_hold'
  | 'fallback_retreat'

export type FailSafeMode = 'return' | 'hide' | 'alert' | 'intrusion_kill' | 'none'

export type MovementMode = 'advance' | 'hold' | 'retreat'

export type AttackPriority = 'high' | 'low' | 'none'

export interface FiniteCommandConstruct {
  readonly id: string
  readonly vocabulary: readonly ConstructCommand[]
  readonly delegatedAuthority: boolean
  readonly failSafeMode: FailSafeMode
  /** Ticks of unattended time before fail-safe arms (1–100). */
  readonly failSafeDelayTicks: number
}

export interface ConstructRuntimeState {
  readonly constructId: string
  readonly activeCommand: ConstructCommand | null
  readonly movementMode: MovementMode
  readonly attackPriority: AttackPriority
  readonly unattendedTicks: number
  readonly failSafeActive: boolean
  readonly failSafeMode: FailSafeMode
  readonly delegatedAuthority: boolean
  readonly owner: typeof FINITE_COMMAND_CONSTRUCT_OWNER
}

const COMMANDS = new Set<ConstructCommand>([
  'move',
  'carry',
  'guard',
  'attack_priority_high',
  'attack_priority_low',
  'fallback_hold',
  'fallback_retreat',
])
const FAIL_SAFES = new Set<FailSafeMode>(['return', 'hide', 'alert', 'intrusion_kill', 'none'])

function assertVocabulary(raw: readonly ConstructCommand[]): readonly ConstructCommand[] {
  if (!Array.isArray(raw) || raw.length < 1) {
    throw new Error('vocabulary must be a non-empty array')
  }
  if (raw.length > MAX_COMMAND_VOCABULARY_SIZE) {
    throw new Error(`vocabulary must have at most ${MAX_COMMAND_VOCABULARY_SIZE} commands`)
  }
  const seen = new Set<ConstructCommand>()
  const out: ConstructCommand[] = []
  for (const cmd of raw) {
    if (!COMMANDS.has(cmd)) throw new Error('construct command is invalid')
    if (seen.has(cmd)) throw new Error('vocabulary commands must be unique')
    seen.add(cmd)
    out.push(cmd)
  }
  return Object.freeze(out)
}

export function createFiniteCommandConstruct(
  input: FiniteCommandConstruct
): FiniteCommandConstruct {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('finite command construct is required')
  }
  const id = assertNonEmptyId(input.id, 'id')
  const vocabulary = assertVocabulary(input.vocabulary)
  if (typeof input.delegatedAuthority !== 'boolean') {
    throw new Error('delegatedAuthority must be boolean')
  }
  if (!FAIL_SAFES.has(input.failSafeMode)) throw new Error('failSafeMode is invalid')
  const failSafeDelayTicks = assertSafeIntegerInRange(
    input.failSafeDelayTicks,
    'failSafeDelayTicks',
    1,
    100
  )
  return Object.freeze({
    id,
    vocabulary,
    delegatedAuthority: input.delegatedAuthority,
    failSafeMode: input.failSafeMode,
    failSafeDelayTicks,
  })
}

function applyCommandEffects(command: ConstructCommand): {
  movementMode: MovementMode
  attackPriority: AttackPriority
} {
  switch (command) {
    case 'move':
      return { movementMode: 'advance', attackPriority: 'none' }
    case 'carry':
      return { movementMode: 'hold', attackPriority: 'none' }
    case 'guard':
      return { movementMode: 'hold', attackPriority: 'low' }
    case 'attack_priority_high':
      return { movementMode: 'advance', attackPriority: 'high' }
    case 'attack_priority_low':
      return { movementMode: 'advance', attackPriority: 'low' }
    case 'fallback_hold':
      return { movementMode: 'hold', attackPriority: 'none' }
    case 'fallback_retreat':
      return { movementMode: 'retreat', attackPriority: 'none' }
    default: {
      const _exhaustive: never = command
      throw new Error(`unhandled construct command: ${_exhaustive}`)
    }
  }
}

export function bootConstructRuntime(
  constructInput: FiniteCommandConstruct
): ConstructRuntimeState {
  const construct = createFiniteCommandConstruct(constructInput)
  return Object.freeze({
    constructId: construct.id,
    activeCommand: null,
    movementMode: 'hold' as const,
    attackPriority: 'none' as const,
    unattendedTicks: 0,
    failSafeActive: false,
    /** Configured mode is inspectable before arming; active flag gates behavior. */
    failSafeMode: construct.failSafeMode,
    delegatedAuthority: construct.delegatedAuthority,
    owner: FINITE_COMMAND_CONSTRUCT_OWNER,
  })
}

/**
 * Issue a command. Rejects commands outside the construct vocabulary and
 * rejects all commands when delegated authority is false.
 */
export function issueConstructCommand(
  constructInput: FiniteCommandConstruct,
  state: ConstructRuntimeState,
  command: ConstructCommand
): ConstructRuntimeState {
  const construct = createFiniteCommandConstruct(constructInput)
  assertRuntime(state, construct.id)
  if (state.failSafeActive) throw new Error('fail-safe is active; commands blocked')
  if (!COMMANDS.has(command)) throw new Error('construct command is invalid')
  if (!construct.delegatedAuthority) throw new Error('delegated authority is required')
  if (!construct.vocabulary.includes(command)) {
    throw new Error('command is outside construct vocabulary')
  }
  const effects = applyCommandEffects(command)
  return Object.freeze({
    ...state,
    activeCommand: command,
    movementMode: effects.movementMode,
    attackPriority: effects.attackPriority,
    unattendedTicks: 0,
  })
}

/**
 * Advance unattended time. Fail-safe arms once unattendedTicks reaches
 * failSafeDelayTicks (inclusive). Mode `none` never arms.
 */
export function advanceConstructUnattended(
  constructInput: FiniteCommandConstruct,
  state: ConstructRuntimeState,
  ticks: number = 1
): ConstructRuntimeState {
  const construct = createFiniteCommandConstruct(constructInput)
  assertRuntime(state, construct.id)
  if (state.failSafeActive) throw new Error('fail-safe already active')
  const tickCount = assertSafeIntegerInRange(ticks, 'ticks', 1, 100)
  const unattendedTicks = state.unattendedTicks + tickCount
  if (unattendedTicks < construct.failSafeDelayTicks || construct.failSafeMode === 'none') {
    return Object.freeze({ ...state, unattendedTicks, failSafeMode: construct.failSafeMode })
  }
  return Object.freeze({
    ...state,
    unattendedTicks,
    failSafeActive: true,
    failSafeMode: construct.failSafeMode,
    activeCommand: null,
    movementMode: construct.failSafeMode === 'return' ? 'retreat' : 'hold',
    attackPriority: construct.failSafeMode === 'intrusion_kill' ? 'high' : 'none',
  })
}

function assertRuntime(state: ConstructRuntimeState, constructId: string): void {
  if (typeof state !== 'object' || state === null || Array.isArray(state)) {
    throw new Error('construct runtime state is required')
  }
  if (state.owner !== FINITE_COMMAND_CONSTRUCT_OWNER) {
    throw new Error('construct owner mismatch')
  }
  if (state.constructId !== constructId) throw new Error('constructId mismatch')
}
