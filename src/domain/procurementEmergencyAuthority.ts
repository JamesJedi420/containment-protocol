// SPE-849: Explicit emergency authorization routing for crisis gray-market waiver (extends SPE-1511 / SPE-1524).
import type { GameState } from './models'
import {
  getEmergencyProcurementInstitutionAuditKey,
  INSTITUTION_KEY_JOINT_OVERSIGHT_CONCORDAT,
} from './procurementEmergencyInstitution'

/** Baseline institution: director may self-authorize under existing crisis trigger (SPE-1524). */
export const AUTHORITY_ROUTE_CRISIS_DIRECTOR_SELF = 'crisis_director_self'

/**
 * Joint Oversight Concordat: waiver only after agency clearance threshold — path-sensitive ratification.
 */
export const AUTHORITY_ROUTE_JOINT_OVERSIGHT_CLEARANCE_RATIFICATION =
  'joint_oversight_clearance_ratification'

/** Institution+clearance gate failed (audit/debug label; not emitted on waiver event). */
export const AUTHORITY_ROUTE_BLOCKED_JOINT_OVERSIGHT_CLEARANCE = 'blocked_joint_oversight_clearance'

/** Minimum clearance for Joint Oversight to use the crisis gray-market waiver path (deterministic). */
export const JOINT_OVERSIGHT_EMERGENCY_WAIVER_MIN_CLEARANCE = 3

/** Hydration default when older saves lack authority-route fields (SPE-849). */
export const LEGACY_WAIVER_AUTHORITY_BASIS_MIGRATION =
  'Migrated record (authority routing backfilled).'

export type EmergencyGrayMarketAuthorityResolution = {
  /** Institution + clearance permit this authorization path (crisis/sanctioned/week checked elsewhere). */
  eligible: boolean
  authorityRoute: string
  authorityBasis: string
}

/**
 * Path-sensitive authority for the crisis gray-market emergency waiver.
 * Deterministic: institution key + clearanceLevel only (no RNG).
 */
export function resolveEmergencyGrayMarketWaiverAuthority(
  game: GameState
): EmergencyGrayMarketAuthorityResolution {
  const institutionKey = getEmergencyProcurementInstitutionAuditKey(game)
  const clearance = sanitizeClearance(game.agency?.clearanceLevel ?? game.clearanceLevel)

  if (institutionKey === INSTITUTION_KEY_JOINT_OVERSIGHT_CONCORDAT) {
    if (clearance < JOINT_OVERSIGHT_EMERGENCY_WAIVER_MIN_CLEARANCE) {
      return {
        eligible: false,
        authorityRoute: AUTHORITY_ROUTE_BLOCKED_JOINT_OVERSIGHT_CLEARANCE,
        authorityBasis: `Joint Oversight Concordat requires agency clearance ${JOINT_OVERSIGHT_EMERGENCY_WAIVER_MIN_CLEARANCE}+ for this emergency channel (current clearance ${clearance}).`,
      }
    }

    return {
      eligible: true,
      authorityRoute: AUTHORITY_ROUTE_JOINT_OVERSIGHT_CLEARANCE_RATIFICATION,
      authorityBasis: `Joint Oversight Concordat emergency authorization ratified at clearanceLevel ${clearance} (threshold ${JOINT_OVERSIGHT_EMERGENCY_WAIVER_MIN_CLEARANCE}+).`,
    }
  }

  return {
    eligible: true,
    authorityRoute: AUTHORITY_ROUTE_CRISIS_DIRECTOR_SELF,
    authorityBasis:
      'Director institutional self-authorization under crisis procurement rules (baseline institution).',
  }
}

function sanitizeClearance(raw: number | undefined): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return 1
  }
  return Math.max(1, Math.trunc(raw))
}
