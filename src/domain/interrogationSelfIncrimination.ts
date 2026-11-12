/**
 * SPE-475 — interrogation self-incrimination (pure, caller-owned).
 *
 * Compact break-state ladder: failed resistance yields slip → contradiction →
 * partial leak → confession. Condition stacks (deprivation, coercion, skill,
 * temperament) shift outcomes deterministically. No courtroom simulator.
 */

import { assertNonEmptyId, assertSafeIntegerInRange } from './assertBoundedInteger'

export const INTERROGATION_SELF_INCRIMINATION_OWNER = 'SPE-475' as const

export type InterrogationOutcome =
  'holds' | 'slip' | 'contradiction' | 'partial_leak' | 'confession'

export type PrisonerTemperament = 'stoic' | 'volatile' | 'compliant'

export interface InterrogationModifiers {
  /** Deprivation pressure 0–10. */
  readonly deprivation: number
  /** Coercion pressure 0–10. */
  readonly coercion: number
  /** Interrogator skill 0–10. */
  readonly interrogatorSkill: number
  readonly temperament: PrisonerTemperament
}

export interface InterrogationProbe {
  readonly id: string
  readonly subjectId: string
  /** Base resistance 1–20 before modifiers. */
  readonly resistance: number
  readonly modifiers: InterrogationModifiers
}

export interface InterrogationResult {
  readonly probeId: string
  readonly subjectId: string
  readonly effectivePressure: number
  readonly effectiveResistance: number
  readonly outcome: InterrogationOutcome
  readonly partialIncrimination: boolean
  readonly fullConfession: boolean
  readonly owner: typeof INTERROGATION_SELF_INCRIMINATION_OWNER
}

const TEMPERAMENTS = new Set<PrisonerTemperament>(['stoic', 'volatile', 'compliant'])
const OUTCOMES = new Set<InterrogationOutcome>([
  'holds',
  'slip',
  'contradiction',
  'partial_leak',
  'confession',
])

function temperamentBias(temperament: PrisonerTemperament): number {
  switch (temperament) {
    case 'stoic':
      return 3
    case 'volatile':
      return -2
    case 'compliant':
      return -4
    default: {
      const _exhaustive: never = temperament
      throw new Error(`unhandled temperament: ${_exhaustive}`)
    }
  }
}

export function createInterrogationModifiers(
  input: InterrogationModifiers
): InterrogationModifiers {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('interrogation modifiers are required')
  }
  const deprivation = assertSafeIntegerInRange(input.deprivation, 'deprivation', 0, 10)
  const coercion = assertSafeIntegerInRange(input.coercion, 'coercion', 0, 10)
  const interrogatorSkill = assertSafeIntegerInRange(
    input.interrogatorSkill,
    'interrogatorSkill',
    0,
    10
  )
  if (!TEMPERAMENTS.has(input.temperament)) throw new Error('temperament is invalid')
  return Object.freeze({
    deprivation,
    coercion,
    interrogatorSkill,
    temperament: input.temperament,
  })
}

export function createInterrogationProbe(input: InterrogationProbe): InterrogationProbe {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('interrogation probe is required')
  }
  const id = assertNonEmptyId(input.id, 'id')
  const subjectId = assertNonEmptyId(input.subjectId, 'subjectId')
  const resistance = assertSafeIntegerInRange(input.resistance, 'resistance', 1, 20)
  const modifiers = createInterrogationModifiers(input.modifiers)
  return Object.freeze({ id, subjectId, resistance, modifiers })
}

function outcomeFromMargin(margin: number): InterrogationOutcome {
  // margin = effectiveResistance - effectivePressure
  if (margin >= 0) return 'holds'
  if (margin >= -3) return 'slip'
  if (margin >= -6) return 'contradiction'
  if (margin >= -9) return 'partial_leak'
  return 'confession'
}

/**
 * Resolve one interrogation probe into a break-state outcome.
 * Condition stacks raise pressure and shift temperament-adjusted resistance.
 */
export function resolveInterrogationSelfIncrimination(
  probeInput: InterrogationProbe
): InterrogationResult {
  const probe = createInterrogationProbe(probeInput)
  const { modifiers } = probe
  const effectivePressure = modifiers.deprivation + modifiers.coercion + modifiers.interrogatorSkill
  const effectiveResistance = Math.max(0, probe.resistance + temperamentBias(modifiers.temperament))
  const margin = effectiveResistance - effectivePressure
  const outcome = outcomeFromMargin(margin)
  if (!OUTCOMES.has(outcome)) throw new Error('interrogation outcome is invalid')

  const partialIncrimination =
    outcome === 'slip' || outcome === 'contradiction' || outcome === 'partial_leak'
  const fullConfession = outcome === 'confession'

  return Object.freeze({
    probeId: probe.id,
    subjectId: probe.subjectId,
    effectivePressure,
    effectiveResistance,
    outcome,
    partialIncrimination,
    fullConfession,
    owner: INTERROGATION_SELF_INCRIMINATION_OWNER,
  })
}

export function isPartialSelfIncrimination(result: InterrogationResult): boolean {
  return result.partialIncrimination && !result.fullConfession
}
