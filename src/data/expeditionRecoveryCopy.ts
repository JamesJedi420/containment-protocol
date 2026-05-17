import type { ExpeditionRecoveryMode } from '../domain/models'

/** Player-facing recovery-mode labels (SPE-99 Slice B). */
export const EXPEDITION_RECOVERY_MODE_LABELS: Record<ExpeditionRecoveryMode, string> = {
  unsafe_pause: 'Unsafe pause',
  ordinary_rest: 'Ordinary rest',
  active_recovery: 'Active recovery',
  sanctuary_recovery: 'Sanctuary recovery',
}

export const EXPEDITION_RECOVERY_LEGIBILITY_PREFIX = 'Expedition recovery'

export type ExpeditionRecoveryLegibilityContext = 'deployed' | 'staging'

export function expeditionRecoveryFatigueEffectClause(
  mode: ExpeditionRecoveryMode,
  options: {
    unsafePauseSurcharge: number
    activeRecoveryPercent: number
    sanctuaryRecoveryPercent: number
  },
  context: ExpeditionRecoveryLegibilityContext = 'deployed'
): string {
  if (context === 'staging') {
    switch (mode) {
      case 'unsafe_pause':
        return `would add +${options.unsafePauseSurcharge} deployed mission fatigue on top of baseline strain if committed`
      case 'ordinary_rest':
        return 'would apply baseline deployed mission fatigue without staging relief if committed'
      case 'active_recovery':
        return `would scale deployed mission fatigue to ${options.activeRecoveryPercent}% of baseline strain if committed`
      case 'sanctuary_recovery':
        return `would scale deployed mission fatigue to ${options.sanctuaryRecoveryPercent}% of baseline strain if committed`
      default: {
        const exhaustive: never = mode
        return exhaustive
      }
    }
  }

  switch (mode) {
    case 'unsafe_pause':
      return `adds +${options.unsafePauseSurcharge} deployed mission fatigue on top of baseline strain`
    case 'ordinary_rest':
      return 'applies baseline deployed mission fatigue without staging relief'
    case 'active_recovery':
      return `scales deployed mission fatigue to ${options.activeRecoveryPercent}% of baseline strain`
    case 'sanctuary_recovery':
      return `scales deployed mission fatigue to ${options.sanctuaryRecoveryPercent}% of baseline strain`
    default: {
      const exhaustive: never = mode
      return exhaustive
    }
  }
}

export function formatExpeditionRecoveryLegibilityLine(
  mode: ExpeditionRecoveryMode,
  fatigueEffectClause: string,
  stagingLabel?: string
): string {
  const modeLabel = EXPEDITION_RECOVERY_MODE_LABELS[mode]
  const site = stagingLabel ? ` (${stagingLabel})` : ''
  return `${EXPEDITION_RECOVERY_LEGIBILITY_PREFIX}${site}: ${modeLabel} — ${fatigueEffectClause}.`
}
