import type { AgentVitals } from '../models'

/**
 * SPE-1653 slice: compact deterministic exposure residue that gates physical recovery
 * until supervised washdown (therapy downtime + medical support).
 */
export const EXPOSURE_RESIDUE_STATUS_FLAG = 'exposure:residue' as const

export function vitalsHasExposureResidue(vitals: AgentVitals | undefined): boolean {
  return (vitals?.statusFlags ?? []).includes(EXPOSURE_RESIDUE_STATUS_FLAG)
}

export function appendExposureResidueToFlags(flags: string[] | undefined): string[] {
  const base = flags ?? []
  if (base.includes(EXPOSURE_RESIDUE_STATUS_FLAG)) {
    return base
  }
  return [...base, EXPOSURE_RESIDUE_STATUS_FLAG]
}

export function stripExposureResidueFromFlags(flags: string[] | undefined): string[] {
  return (flags ?? []).filter((f) => f !== EXPOSURE_RESIDUE_STATUS_FLAG)
}
