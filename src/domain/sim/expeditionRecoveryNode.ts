/**
 * SPE-99 slice: deterministic expedition recovery-node validity for deployed operatives.
 * Reads SPE-1654 `fieldBase` staging packets on in-progress cases, maps canonical quality
 * bands to a compact recovery-mode taxonomy, then scales weekly mission fatigue accumulation
 * (scalar `fatigue` only in this slice).
 *
 * Out of scope here: full sustenance simulation, injury gates (SPE-1653), human energy budget (SPE-1107).
 */

import type { CaseInstance, FieldBaseStagingQuality, GameState } from '../models'
import { normalizeFieldBaseQuality, readFieldBaseFromCase } from '../fieldBaseStaging'
import { getTeamAssignedCaseId, getTeamMemberIds } from '../teamSimulation'

export type ExpeditionRecoveryMode =
  | 'unsafe_pause'
  | 'ordinary_rest'
  | 'active_recovery'
  | 'sanctuary_recovery'

/** Extra scalar fatigue applied on top of baseline mission strain when staging is exposed. */
export const UNSAFE_PAUSE_DEPLOYED_FATIGUE_SURCHARGE = 2

/** Multiplier on baseline deployed mission fatigue when secured staging supports active recovery. */
export const ACTIVE_RECOVERY_DEPLOYED_SCALE = 0.72

/** Multiplier when staging meets sanctuary thresholds (protected deep recovery). */
export const SANCTUARY_RECOVERY_DEPLOYED_SCALE = 0.55

/**
 * Deterministic ladder from normalized staging quality to recovery mode.
 * Uses the same 0..3 integer ladder as SPE-1654 (`fieldBaseStaging`).
 *
 * - safety 0: exposed halt (`unsafe_pause`)
 * - safety 1: harsh camp / ordinary operational rest surface
 * - safety ≥2 + medical ≥2 + supply ≥1: sanctuary-grade protected recovery (`supply` proxies sustenance pressure)
 * - safety ≥2 + medical ≥1: active recovery surface
 */
export function resolveExpeditionRecoveryModeFromStagingQuality(
  quality: FieldBaseStagingQuality
): ExpeditionRecoveryMode {
  const q = normalizeFieldBaseQuality(quality)
  if (q.safety <= 0) {
    return 'unsafe_pause'
  }
  if (q.safety === 1) {
    return 'ordinary_rest'
  }
  if (q.medical >= 2 && q.supply >= 1) {
    return 'sanctuary_recovery'
  }
  if (q.medical >= 1) {
    return 'active_recovery'
  }
  return 'ordinary_rest'
}

export function resolveDeployedRecoveryModeForCase(
  currentCase: CaseInstance | undefined
): ExpeditionRecoveryMode {
  if (!currentCase || currentCase.status !== 'in_progress') {
    return 'ordinary_rest'
  }
  const packet = readFieldBaseFromCase(currentCase)
  if (!packet) {
    return 'ordinary_rest'
  }
  return resolveExpeditionRecoveryModeFromStagingQuality(packet.quality)
}

export function buildDeployedRecoveryModeByAgentId(
  teams: GameState['teams'],
  cases: GameState['cases'],
  activeTeamIds: readonly string[]
): Map<string, ExpeditionRecoveryMode> {
  const map = new Map<string, ExpeditionRecoveryMode>()
  for (const teamId of activeTeamIds) {
    const team = teams[teamId]
    if (!team) {
      continue
    }
    const caseId = getTeamAssignedCaseId(team)
    const mode = resolveDeployedRecoveryModeForCase(caseId ? cases[caseId] : undefined)
    for (const agentId of getTeamMemberIds(team)) {
      map.set(agentId, mode)
    }
  }
  return map
}

export function scaleDeployedMissionFatigueDelta(
  rawDelta: number,
  mode: ExpeditionRecoveryMode
): number {
  switch (mode) {
    case 'unsafe_pause':
      return rawDelta + UNSAFE_PAUSE_DEPLOYED_FATIGUE_SURCHARGE
    case 'ordinary_rest':
      return rawDelta
    case 'active_recovery':
      return Math.max(1, Math.round(rawDelta * ACTIVE_RECOVERY_DEPLOYED_SCALE))
    case 'sanctuary_recovery':
      return Math.max(1, Math.round(rawDelta * SANCTUARY_RECOVERY_DEPLOYED_SCALE))
    default: {
      const exhaustive: never = mode
      return exhaustive
    }
  }
}
