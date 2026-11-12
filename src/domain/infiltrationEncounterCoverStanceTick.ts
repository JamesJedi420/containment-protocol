/**
 * SPE-521 follow-up: deterministic weekly-tick nudges from player encounter cover stance.
 * Kept separate from write-path module to avoid probe ↔ stance import cycles.
 */

import type { CaseInstance } from './models'

export type InfiltrationEncounterCoverStanceTickStance = 'maintain' | 'reinforce' | 'low_profile'

export type InfiltrationEncounterCoverStanceTickProbeAction =
  | 'probe_access'
  | 'probe_route'
  | 'cleanup'

export interface InfiltrationEncounterCoverStanceTickProbeDeltas {
  readonly probeProgress: number
  readonly awareness: number
}

const LOW_PROFILE_PROBE_AWARENESS_NUDGE = 0.04
const LOW_PROFILE_PROBE_PROGRESS_NUDGE = 0.03
const REINFORCE_COVER_POSTURE_NUDGE = 0.02

function roundBand(value: number) {
  return Math.round(value * 1000) / 1000
}

function isActiveStance(value: string | undefined): value is Exclude<
  InfiltrationEncounterCoverStanceTickStance,
  'maintain'
> {
  return value === 'reinforce' || value === 'low_profile'
}

/** Reads persisted stance; unset or maintain yields no weekly tick nudge. */
export function readInfiltrationEncounterCoverStanceForTick(
  caseData: CaseInstance | undefined
): InfiltrationEncounterCoverStanceTickStance {
  const stance = caseData?.infiltrationEncounterCoverStance
  return isActiveStance(stance) ? stance : 'maintain'
}

/**
 * Low profile trims positive probe deltas on high-visibility actions only.
 * Cleanup already minimizes exposure — do not stack a second mitigation.
 */
export function applyInfiltrationEncounterCoverStanceToProbeDeltas(
  action: InfiltrationEncounterCoverStanceTickProbeAction,
  deltas: InfiltrationEncounterCoverStanceTickProbeDeltas,
  stance: InfiltrationEncounterCoverStanceTickStance
): InfiltrationEncounterCoverStanceTickProbeDeltas {
  if (stance !== 'low_profile' || action === 'cleanup') {
    return deltas
  }

  return {
    probeProgress:
      deltas.probeProgress > 0
        ? roundBand(Math.max(0, deltas.probeProgress - LOW_PROFILE_PROBE_PROGRESS_NUDGE))
        : deltas.probeProgress,
    awareness:
      deltas.awareness > 0
        ? roundBand(Math.max(0, deltas.awareness - LOW_PROFILE_PROBE_AWARENESS_NUDGE))
        : deltas.awareness,
  }
}

/** Reinforce trims weekly cover-posture awareness pressure before threshold evaluation. */
export function applyInfiltrationEncounterCoverStanceToCoverPostureDelta(
  awarenessDelta: number,
  stance: InfiltrationEncounterCoverStanceTickStance
): number {
  if (stance !== 'reinforce' || awarenessDelta <= 0) {
    return awarenessDelta
  }

  return roundBand(Math.max(0, awarenessDelta - REINFORCE_COVER_POSTURE_NUDGE))
}

/** Strip persisted stance when a case leaves the active infiltration prep surface. */
export function stripInfiltrationEncounterCoverStanceOnResolvedCase(
  caseData: CaseInstance
): CaseInstance {
  if (caseData.status !== 'resolved' || caseData.infiltrationEncounterCoverStance === undefined) {
    return caseData
  }

  const rest = { ...caseData }
  delete rest.infiltrationEncounterCoverStance
  return rest
}
