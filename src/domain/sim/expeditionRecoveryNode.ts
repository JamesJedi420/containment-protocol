/**
 * SPE-99 slice: deterministic expedition recovery-node validity for deployed operatives.
 * Maps optional `fieldBase` staging bands on an in-progress contract to a compact recovery-mode
 * taxonomy, then scales weekly mission fatigue accumulation (scalar `fatigue` only in this slice).
 *
 * Out of scope here: full sustenance simulation, injury gates (SPE-1653), human energy budget (SPE-1107).
 */

import type { CaseInstance, FieldBaseQualityBands, GameState } from '../models'
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

function isBand(value: unknown): value is 0 | 1 | 2 {
  return value === 0 || value === 1 || value === 2
}

export function parseFieldBaseQualityBands(raw: unknown): FieldBaseQualityBands | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const record = raw as Record<string, unknown>
  if (!isBand(record.medical) || !isBand(record.safety) || !isBand(record.sustenance)) {
    return null
  }
  return { medical: record.medical, safety: record.safety, sustenance: record.sustenance }
}

/**
 * Deterministic ladder from authored staging bands to recovery mode.
 * - safety 0: exposed halt (unsafe_pause)
 * - safety 1: harsh camp / ordinary operational rest surface
 * - safety 2 + strong medical + sustenance: sanctuary-grade protected recovery
 * - safety 2 + medical support: active recovery surface
 */
export function resolveExpeditionRecoveryModeFromBands(bands: FieldBaseQualityBands): ExpeditionRecoveryMode {
  if (bands.safety <= 0) {
    return 'unsafe_pause'
  }
  if (bands.safety === 1) {
    return 'ordinary_rest'
  }
  if (bands.medical >= 2 && bands.sustenance >= 1) {
    return 'sanctuary_recovery'
  }
  if (bands.medical >= 1) {
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
  const bands = parseFieldBaseQualityBands(currentCase.contract?.fieldBase)
  if (!bands) {
    return 'ordinary_rest'
  }
  return resolveExpeditionRecoveryModeFromBands(bands)
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
