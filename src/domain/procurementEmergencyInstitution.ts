// SPE-1511: Institution identity normalization for emergency procurement audit payloads (extends SPE-1524).
// SPE-849: This key feeds authority routing (Joint Oversight uses clearance ratification in procurementEmergencyAuthority).
import type { GameState } from './models'

/** Default player's institution — maps from legacy display label `Containment Protocol`. */
export const INSTITUTION_KEY_CONTAINMENT_PROTOCOL = 'containment_protocol'

/**
 * Joint Oversight Concordat institution key (normalized label). Waiver eligibility is clearance-gated
 * in procurementEmergencyAuthority (SPE-849), not a flat deny at this layer.
 */
export const INSTITUTION_KEY_JOINT_OVERSIGHT_CONCORDAT = 'joint_oversight_concordat'

function readPlayerOrganization(game: GameState): string | undefined {
  const raw = game.runtimeState?.player?.organization
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : undefined
}

/** Canonical lowercase underscore key for audit payloads and comparisons (deterministic). */
export function normalizeInstitutionKeyForAudit(raw: string | undefined): string {
  const trimmed = raw?.trim()
  if (!trimmed) {
    return INSTITUTION_KEY_CONTAINMENT_PROTOCOL
  }
  return trimmed.toLowerCase().replace(/\s+/g, '_')
}

/** Audit key for the active director institution (same normalization as waiver payload `institutionKey`). */
export function getEmergencyProcurementInstitutionAuditKey(game: GameState): string {
  return normalizeInstitutionKeyForAudit(readPlayerOrganization(game))
}
