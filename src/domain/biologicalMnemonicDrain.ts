/**
 * SPE-270 — biological and mnemonic drain (pure, caller-owned).
 *
 * Dual-resource drain: biological substrate + mnemonic/cognitive profile in one
 * effect. Stolen cognition persists as a separable payload. Distinct aftermath
 * families by what was drained. No neurology sandbox or GameState.
 */

import { assertNonEmptyId, assertSafeIntegerInRange } from './assertBoundedInteger'

export const BIOLOGICAL_MNEMONIC_DRAIN_OWNER = 'SPE-270' as const

export type BiologicalSubstrate = 'blood' | 'vitality' | 'stamina'

export type MnemonicKind = 'memory' | 'knowledge' | 'identity'

export type DrainAftermath = 'sedation_vulnerability' | 'deeper_depletion' | 'typed_subsystem_loss'

export interface DrainTargetSnapshot {
  readonly actorId: string
  /** Remaining biological reserve units (0–100). */
  readonly biologicalReserve: number
  /** Remaining mnemonic integrity units (0–100). */
  readonly mnemonicIntegrity: number
}

export interface DualResourceDrainEffect {
  readonly id: string
  readonly biologicalTarget: BiologicalSubstrate
  readonly mnemonicTarget: MnemonicKind
  /** Biological units drained (1–40). */
  readonly biologicalAmount: number
  /** Mnemonic units drained (1–40). */
  readonly mnemonicAmount: number
  /** Optional cognition fragment id captured into the payload. */
  readonly cognitionFragmentId: string
}

export interface StolenCognitionPayload {
  readonly id: string
  readonly sourceActorId: string
  readonly mnemonicKind: MnemonicKind
  readonly amount: number
  readonly fragmentId: string
  readonly persistsBeyondAttack: true
  readonly owner: typeof BIOLOGICAL_MNEMONIC_DRAIN_OWNER
}

export interface DualResourceDrainResult {
  readonly effectId: string
  readonly actorId: string
  readonly biologicalTarget: BiologicalSubstrate
  readonly mnemonicTarget: MnemonicKind
  readonly biologicalDrained: number
  readonly mnemonicDrained: number
  readonly biologicalRemaining: number
  readonly mnemonicRemaining: number
  readonly aftermath: DrainAftermath
  readonly stolenCognition: StolenCognitionPayload
  readonly owner: typeof BIOLOGICAL_MNEMONIC_DRAIN_OWNER
}

const BIO = new Set<BiologicalSubstrate>(['blood', 'vitality', 'stamina'])
const MNEMONIC = new Set<MnemonicKind>(['memory', 'knowledge', 'identity'])

function aftermathFor(biological: BiologicalSubstrate, mnemonic: MnemonicKind): DrainAftermath {
  // Identity subsystem loss outranks blood sedation when both apply.
  if (mnemonic === 'identity') return 'typed_subsystem_loss'
  if (biological === 'blood') return 'sedation_vulnerability'
  return 'deeper_depletion'
}

export function createDrainTargetSnapshot(input: DrainTargetSnapshot): DrainTargetSnapshot {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('drain target snapshot is required')
  }
  const actorId = assertNonEmptyId(input.actorId, 'actorId')
  const biologicalReserve = assertSafeIntegerInRange(
    input.biologicalReserve,
    'biologicalReserve',
    0,
    100
  )
  const mnemonicIntegrity = assertSafeIntegerInRange(
    input.mnemonicIntegrity,
    'mnemonicIntegrity',
    0,
    100
  )
  return Object.freeze({ actorId, biologicalReserve, mnemonicIntegrity })
}

export function createDualResourceDrainEffect(
  input: DualResourceDrainEffect
): DualResourceDrainEffect {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('dual resource drain effect is required')
  }
  const id = assertNonEmptyId(input.id, 'id')
  if (!BIO.has(input.biologicalTarget)) throw new Error('biologicalTarget is invalid')
  if (!MNEMONIC.has(input.mnemonicTarget)) throw new Error('mnemonicTarget is invalid')
  const biologicalAmount = assertSafeIntegerInRange(
    input.biologicalAmount,
    'biologicalAmount',
    1,
    40
  )
  const mnemonicAmount = assertSafeIntegerInRange(input.mnemonicAmount, 'mnemonicAmount', 1, 40)
  const cognitionFragmentId = assertNonEmptyId(input.cognitionFragmentId, 'cognitionFragmentId')
  return Object.freeze({
    id,
    biologicalTarget: input.biologicalTarget,
    mnemonicTarget: input.mnemonicTarget,
    biologicalAmount,
    mnemonicAmount,
    cognitionFragmentId,
  })
}

/**
 * Apply a dual-resource drain. Always drains both biological and mnemonic
 * channels (clamped to remaining reserves) and emits a persistent cognition payload.
 */
export function applyDualResourceDrain(
  targetInput: DrainTargetSnapshot,
  effectInput: DualResourceDrainEffect
): DualResourceDrainResult {
  const target = createDrainTargetSnapshot(targetInput)
  const effect = createDualResourceDrainEffect(effectInput)

  const biologicalDrained = Math.min(effect.biologicalAmount, target.biologicalReserve)
  const mnemonicDrained = Math.min(effect.mnemonicAmount, target.mnemonicIntegrity)
  if (biologicalDrained < 1 || mnemonicDrained < 1) {
    throw new Error('dual drain requires remaining biological and mnemonic reserves')
  }

  const stolenCognition: StolenCognitionPayload = Object.freeze({
    id: `${effect.id}:${target.actorId}:${effect.cognitionFragmentId}`,
    sourceActorId: target.actorId,
    mnemonicKind: effect.mnemonicTarget,
    amount: mnemonicDrained,
    fragmentId: effect.cognitionFragmentId,
    persistsBeyondAttack: true as const,
    owner: BIOLOGICAL_MNEMONIC_DRAIN_OWNER,
  })

  return Object.freeze({
    effectId: effect.id,
    actorId: target.actorId,
    biologicalTarget: effect.biologicalTarget,
    mnemonicTarget: effect.mnemonicTarget,
    biologicalDrained,
    mnemonicDrained,
    biologicalRemaining: target.biologicalReserve - biologicalDrained,
    mnemonicRemaining: target.mnemonicIntegrity - mnemonicDrained,
    aftermath: aftermathFor(effect.biologicalTarget, effect.mnemonicTarget),
    stolenCognition,
    owner: BIOLOGICAL_MNEMONIC_DRAIN_OWNER,
  })
}

export function isPersistentStolenCognition(payload: StolenCognitionPayload): boolean {
  return payload.persistsBeyondAttack === true && payload.owner === BIOLOGICAL_MNEMONIC_DRAIN_OWNER
}
