/**
 * SPE-130 Phase 1 — three-channel fatigue accumulation and recovery.
 * SPE-130 Phase 2 — combatStress as second downstream consumer (mission injury).
 * SPE-130 Phase 3 — repeated capability-use / overtesting penalties.
 *
 * Scope: physicalExhaustion, mentalExhaustion, combatStress, capabilityUsesThisPhase.
 * Weekly accumulation driven by mission context; differentiated recovery
 * where rest targets physical and therapy targets mental/stress.
 * Capability overtesting applies extra strain when phase-accumulated uses exceed threshold.
 *
 * Intentionally out of scope for this slice:
 *   - overdrive / lockout
 *   - transit vulnerability window
 *   - injury-risk consumer (Phase 2, already landed)
 */

import { clamp } from './math'
import type { AgentFatigueChannels } from './agent/models'

// ── Constants ──────────────────────────────────────────────────────────────

/** physicalExhaustion delta per deployed week at base intensity. */
export const PHYSICAL_MISSION_DELTA = 8
/** mentalExhaustion delta per investigation/deployed week at base intensity. */
export const MENTAL_MISSION_DELTA = 5
/** combatStress delta per combat-active week at base intensity. */
export const COMBAT_STRESS_DELTA = 10

// Penalty onset thresholds (0..100)
export const PHYSICAL_READINESS_THRESHOLD = 50
export const MENTAL_CONCENTRATION_THRESHOLD = 40
export const COMBAT_STRESS_PENALTY_THRESHOLD = 45

// Overtesting and repeated-use thresholds (Linear: repeated heavy capability use degrades through overtesting)
/** Capability uses in current phase at or above this trigger overtesting strain. Adjustable per repo scale. */
export const CAPABILITY_OVERTESTING_THRESHOLD = 3

// ── Context types (bounded to this slice only) ─────────────────────────────

export type FatigueChannelContext =
  | { type: 'mission_deployment'; physicalIntensity?: number; cognitiveIntensity?: number }
  | { type: 'combat_encounter'; combatIntensity?: number }
  | { type: 'training' }
  | { type: 'capability_use' }
  | { type: 'idle' }

export type FatigueRecoveryActivity = 'rest' | 'therapy' | 'medical'

// ── Core helpers ───────────────────────────────────────────────────────────

/** Return a zero-state channel object for an agent with no prior channel data. */
export function createDefaultFatigueChannels(): AgentFatigueChannels {
  return { physicalExhaustion: 0, mentalExhaustion: 0, combatStress: 0, capabilityUsesThisPhase: 0 }
}

/**
 * Accumulate fatigue channels for one weekly tick given the agent's context.
 * Returns a new channels object; does not mutate the input.
 */
export function accumulateFatigueChannels(
  channels: AgentFatigueChannels,
  context: FatigueChannelContext
): AgentFatigueChannels {
  const { physicalExhaustion: pe, mentalExhaustion: me, combatStress: cs } = channels

  switch (context.type) {
    case 'mission_deployment': {
      const pi = context.physicalIntensity ?? 1
      const ci = context.cognitiveIntensity ?? 1
      return {
        physicalExhaustion: clamp(pe + Math.round(PHYSICAL_MISSION_DELTA * pi), 0, 100),
        mentalExhaustion: clamp(me + Math.round(MENTAL_MISSION_DELTA * ci), 0, 100),
        combatStress: cs,
        capabilityUsesThisPhase: channels.capabilityUsesThisPhase,
      }
    }

    case 'combat_encounter': {
      const intensity = context.combatIntensity ?? 1
      return {
        physicalExhaustion: clamp(pe + 5, 0, 100),
        mentalExhaustion: me,
        combatStress: clamp(cs + Math.round(COMBAT_STRESS_DELTA * intensity), 0, 100),
        capabilityUsesThisPhase: channels.capabilityUsesThisPhase,
      }
    }

    case 'training':
      return {
        physicalExhaustion: clamp(pe + 3, 0, 100),
        mentalExhaustion: clamp(me + 4, 0, 100),
        combatStress: cs,
        capabilityUsesThisPhase: channels.capabilityUsesThisPhase,
      }

    case 'capability_use': {
      // SPE-130 Phase 3: repeated heavy capability use degrades through overtesting.
      // Increment the phase counter. If threshold crossed, apply extra mental + physical strain.
      const nextUseCount = channels.capabilityUsesThisPhase + 1
      const overtesting = nextUseCount >= CAPABILITY_OVERTESTING_THRESHOLD
      return {
        physicalExhaustion: clamp(pe + (overtesting ? 5 : 0), 0, 100),
        mentalExhaustion: clamp(me + (overtesting ? 8 : 0), 0, 100),
        combatStress: cs,
        capabilityUsesThisPhase: nextUseCount,
      }
    }

    case 'idle':
    default:
      return { ...channels }
  }
}

/**
 * Apply one recovery activity's differentiated channel reduction.
 * Each activity targets different channels at different rates.
 * Returns a new channels object; does not mutate the input.
 */
export function applyChannelDifferentiatedRecovery(
  channels: AgentFatigueChannels,
  activity: FatigueRecoveryActivity
): AgentFatigueChannels {
  const { physicalExhaustion: pe, mentalExhaustion: me, combatStress: cs } = channels

  switch (activity) {
    case 'rest':
      // Rest primarily clears physical wear; modest help to mental and stress.
      return {
        physicalExhaustion: clamp(pe - 12, 0, 100),
        mentalExhaustion: clamp(me - 4, 0, 100),
        combatStress: clamp(cs - 3, 0, 100),
      }

    case 'therapy':
      // Therapy primarily targets stress and mental load; minimal physical effect.
      return {
        physicalExhaustion: clamp(pe - 2, 0, 100),
        mentalExhaustion: clamp(me - 10, 0, 100),
        combatStress: clamp(cs - 15, 0, 100),
      }

    case 'medical':
      // Medical addresses physical injury and incidental stress; neutral on mental.
      return {
        physicalExhaustion: clamp(pe - 10, 0, 100),
        mentalExhaustion: me,
        combatStress: clamp(cs - 5, 0, 100),
      }
  }
}

// ── Downstream penalty derivation ─────────────────────────────────────────

export interface FatigueChannelPenalties {
  /** Score reduction applied to readinessScore (0 when channels are below thresholds). */
  readinessPenalty: number
  /** Score reduction applied to concentration / investigation tasks (0 when below threshold). */
  concentrationPenalty: number
  /** Score reduction applied to combat outcomes (0 when below threshold). */
  combatPenalty: number
}

/**
 * Derive numeric downstream penalties from current channel levels.
 * Returns zeros when all channels are below their respective thresholds.
 */
export function deriveFatigueChannelPenalties(
  channels: AgentFatigueChannels
): FatigueChannelPenalties {
  const { physicalExhaustion: pe, mentalExhaustion: me, combatStress: cs } = channels

  return {
    readinessPenalty:
      pe >= PHYSICAL_READINESS_THRESHOLD ? Math.floor(pe * 0.4) : 0,
    concentrationPenalty:
      me >= MENTAL_CONCENTRATION_THRESHOLD ? Math.floor(me * 0.3) : 0,
    combatPenalty:
      cs >= COMBAT_STRESS_PENALTY_THRESHOLD ? Math.floor(cs * 0.35) : 0,
  }
}

/**
 * Reset phase-accumulated capability use counter to 0 (called during weekly tick).
 * SPE-130 Phase 3: overtesting counter resets each phase to prevent false positive burnout.
 */
export function resetCapabilityUsesPhaseCounter(
  channels: AgentFatigueChannels
): AgentFatigueChannels {
  return { ...channels, capabilityUsesThisPhase: 0 }
}
