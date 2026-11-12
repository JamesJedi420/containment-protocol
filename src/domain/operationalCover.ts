import type { LegitimacyState } from './models'

export type OperationalCoverLevel = NonNullable<LegitimacyState['operationalCoverLevel']>

export interface LegitimacyCoverSummary {
  institutionalLegitimacy: LegitimacyState['sanctionLevel']
  operationalCover: OperationalCoverLevel
  institutionalLabel: string
  coverLabel: string
  summary: string
}

/**
 * Legacy campaigns infer cover from the existing sanction posture. `covert` keeps its
 * established deniable meaning while the other postures remain operationally open.
 */
export function resolveOperationalCoverLevel(
  legitimacy: LegitimacyState | undefined
): OperationalCoverLevel {
  return (
    legitimacy?.operationalCoverLevel ??
    (legitimacy?.sanctionLevel === 'covert' ? 'deniable' : 'open')
  )
}

export function hasDeniableOperationalCover(legitimacy: LegitimacyState | undefined): boolean {
  return resolveOperationalCoverLevel(legitimacy) === 'deniable'
}

export function buildLegitimacyCoverSummary(
  legitimacy: LegitimacyState | undefined
): LegitimacyCoverSummary {
  const institutionalLegitimacy = legitimacy?.sanctionLevel ?? 'tolerated'
  const operationalCover = resolveOperationalCoverLevel(legitimacy)
  const institutionalLabel = institutionalLegitimacy.replace(/_/g, ' ')
  const coverLabel = operationalCover.replace(/_/g, ' ')

  return {
    institutionalLegitimacy,
    operationalCover,
    institutionalLabel,
    coverLabel,
    summary: `Institutional legitimacy: ${institutionalLabel}; operational cover: ${coverLabel}.`,
  }
}
