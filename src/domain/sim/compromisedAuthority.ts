/**
 * SPE-746: Compromised authority resolution — pure functions for deriving
 * override packets and exposure outcomes from a CompromisedAuthorityState.
 *
 * All functions are pure and deterministic; no side effects.
 */

import type {
  BeliefTrackState,
  BeliefTier,
} from '../beliefTracks'
import type {
  CaseTemplate,
  CompromisedAuthorityState,
  CompromisedOfficialRole,
  CompromisedResponseCategory,
  CompromisedResponseOverride,
  CorruptionDepth,
  FactionRuntimeState,
  GameState,
} from '../models'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const COMPROMISED_OFFICIAL_ROLES = new Set<CompromisedOfficialRole>([
  'sheriff',
  'magistrate',
  'watchCommander',
  'inquisitor',
])

const CORRUPTION_DEPTHS = new Set<CorruptionDepth>(['shallow_cover', 'embedded_control'])

const COMPROMISED_RESPONSE_CATEGORIES = new Set<CompromisedResponseCategory>([
  'patrol',
  'interrogation',
  'custody',
  'evidence',
])

/**
 * Hydration problem 469: enums, faction ref, patrol count.
 */
export function sanitizeCompromisedAuthorityState(
  raw: unknown,
  factions: Record<string, FactionRuntimeState> | undefined
): CompromisedAuthorityState | undefined {
  if (!isRecord(raw)) {
    return undefined
  }

  const officialRole = COMPROMISED_OFFICIAL_ROLES.has(raw.officialRole as CompromisedOfficialRole)
    ? (raw.officialRole as CompromisedOfficialRole)
    : undefined

  const corruptionDepth = CORRUPTION_DEPTHS.has(raw.corruptionDepth as CorruptionDepth)
    ? (raw.corruptionDepth as CorruptionDepth)
    : undefined

  const benefittingFactionId =
    typeof raw.benefittingFactionId === 'string' && raw.benefittingFactionId.trim().length > 0
      ? raw.benefittingFactionId.trim()
      : undefined

  if (!officialRole || !corruptionDepth || !benefittingFactionId) {
    return undefined
  }

  if (factions && !(benefittingFactionId in factions)) {
    return undefined
  }

  const distortedCategories = Array.isArray(raw.distortedCategories)
    ? [
        ...new Set(
          raw.distortedCategories.filter(
            (entry): entry is CompromisedResponseCategory =>
              typeof entry === 'string' &&
              COMPROMISED_RESPONSE_CATEGORIES.has(entry as CompromisedResponseCategory)
          )
        ),
      ]
    : []

  const patrolAnomalyCount =
    typeof raw.patrolAnomalyCount === 'number' && Number.isFinite(raw.patrolAnomalyCount)
      ? Math.max(0, Math.trunc(raw.patrolAnomalyCount))
      : 0

  const authorityLinkEvidenceFound =
    raw.authorityLinkEvidenceFound === true ? true : undefined

  return {
    officialRole,
    benefittingFactionId,
    distortedCategories,
    corruptionDepth,
    patrolAnomalyCount,
    ...(authorityLinkEvidenceFound ? { authorityLinkEvidenceFound } : {}),
  }
}

// ---------------------------------------------------------------------------
// Threshold constants
// ---------------------------------------------------------------------------

/** Number of patrol anomalies required before an exposure event fires. */
const EXPOSURE_THRESHOLD = 5

/** Weight delta applied to anti-faction patrol templates when authority is distorting patrol. */
const PATROL_WEIGHT_DELTA_SHALLOW: number = -2
const PATROL_WEIGHT_DELTA_EMBEDDED: number = -4

/** Ascending tier order for exposure belief escalation. */
const TIER_ORDER: BeliefTier[] = ['clear', 'uncertain', 'suspected', 'condemned']

function escalateTier(tier: BeliefTier): BeliefTier {
  const idx = TIER_ORDER.indexOf(tier)
  return TIER_ORDER[Math.min(idx + 1, TIER_ORDER.length - 1)]
}

// ---------------------------------------------------------------------------
// Procurement diversion (SPE-2322)
// ---------------------------------------------------------------------------

const OFFICE_MEDIATED_DIVERSION_ROLES = new Set<CompromisedOfficialRole>([
  'magistrate',
  'watchCommander',
])

export type ProcurementCorruptionRoutingReason = 'office-mediated-diversion'

export interface ProcurementCorruptionRoutingAssessment {
  active: boolean
  reasons: ProcurementCorruptionRoutingReason[]
  officialRole?: CompromisedOfficialRole
  benefittingFactionId?: string
}

/**
 * Office-mediated diversion: compromised office holder distorts evidence routing,
 * which diverts supplier roster attention away from one calibrated listing.
 */
export function assessCompromisedAuthorityProcurementDiversion(
  game: Pick<GameState, 'compromisedAuthority'>
): ProcurementCorruptionRoutingAssessment {
  const authority = game.compromisedAuthority
  if (!authority) {
    return { active: false, reasons: [] }
  }

  const reasons: ProcurementCorruptionRoutingReason[] = []
  if (
    OFFICE_MEDIATED_DIVERSION_ROLES.has(authority.officialRole) &&
    authority.distortedCategories.includes('evidence')
  ) {
    reasons.push('office-mediated-diversion')
  }

  return {
    active: reasons.length > 0,
    reasons,
    ...(reasons.length > 0
      ? {
          officialRole: authority.officialRole,
          benefittingFactionId: authority.benefittingFactionId,
        }
      : {}),
  }
}

/** Lightweight signal for funding.ts (avoid importing market). */
export function hasCompromisedAuthorityProcurementDiversionSignals(
  game: Pick<GameState, 'compromisedAuthority'>
): boolean {
  return assessCompromisedAuthorityProcurementDiversion(game).active
}

// ---------------------------------------------------------------------------
// Response resolution
// ---------------------------------------------------------------------------

/**
 * Resolves the full override packet a compromised authority applies to a
 * security event, given the set of response categories being queried.
 * Only categories that are both in `queriedCategories` and in the authority's
 * `distortedCategories` produce active overrides.
 */
export function resolveCompromisedAuthorityResponse(
  queriedCategories: Set<CompromisedResponseCategory>,
  authority: CompromisedAuthorityState
): CompromisedResponseOverride {
  const active = authority.distortedCategories.filter((c) => queriedCategories.has(c))

  const patrolActive = active.includes('patrol')
  const interrogationActive = active.includes('interrogation')
  const custodyActive = active.includes('custody')
  const evidenceActive = active.includes('evidence')

  const depthDelta: Record<CorruptionDepth, number> = {
    shallow_cover: PATROL_WEIGHT_DELTA_SHALLOW,
    embedded_control: PATROL_WEIGHT_DELTA_EMBEDDED,
  }

  return {
    patrolWeightDelta: patrolActive ? depthDelta[authority.corruptionDepth] : 0,
    harassmentWeightDelta: interrogationActive ? 2 : 0,
    redirectInterrogation: interrogationActive,
    custodyMarker: custodyActive
      ? {
          effect: 'compromised_authority_release',
          triggeredAt: 'processing',
          targetInstitutionId: authority.officialRole,
        }
      : undefined,
    evidenceRoutingMode: evidenceActive
      ? authority.corruptionDepth === 'embedded_control'
        ? 'forward_to_faction'
        : 'suppress'
      : undefined,
  }
}

// ---------------------------------------------------------------------------
// Exposure resolution
// ---------------------------------------------------------------------------

/**
 * Resolves an exposure tick for an active compromised authority surface.
 * Increments the anomaly counter; if the threshold is reached (or
 * `authorityLinkEvidenceFound` is set), escalates the institutional
 * belief tracks on the associated case.
 * Returns updated values — callers must apply them to state.
 */
export function resolveCompromisedAuthorityExposure(
  authority: CompromisedAuthorityState,
  beliefTracks: BeliefTrackState
): { updatedAnomalyCount: number; updatedBeliefTracks: BeliefTrackState } {
  const updatedAnomalyCount = authority.patrolAnomalyCount + 1
  const thresholdMet =
    updatedAnomalyCount >= EXPOSURE_THRESHOLD || authority.authorityLinkEvidenceFound === true

  if (!thresholdMet) {
    return { updatedAnomalyCount, updatedBeliefTracks: beliefTracks }
  }

  // Exposure event: escalate institutional judgment one tier
  const updatedBeliefTracks: BeliefTrackState = {
    ...beliefTracks,
    institutionalJudgment: escalateTier(beliefTracks.institutionalJudgment),
  }

  return { updatedAnomalyCount, updatedBeliefTracks }
}

// ---------------------------------------------------------------------------
// Pool weight distortion
// ---------------------------------------------------------------------------

/**
 * Applies the patrol weight delta from a resolved override to a template pool.
 * Templates tagged with anti-faction intel markers are deprioritised; all
 * others retain their baseline weight.
 * Returns a new ordered array weighted by repetition (cheap discrete weights).
 */
export function applyPatrolWeightDistortion(
  pool: CaseTemplate[],
  override: CompromisedResponseOverride
): CaseTemplate[] {
  if (override.patrolWeightDelta === 0) return pool

  const delta = override.patrolWeightDelta // negative = deprioritise anti-faction entries

  // Baseline weight = 1 per entry; anti-faction entries get max(1, 1 + delta) copies.
  // A negative delta means fewer copies (down-weighted); a positive delta means more.
  const result: CaseTemplate[] = []
  for (const template of pool) {
    const isAntiFaction = template.tags.includes('anti_faction')
    const copies = isAntiFaction ? Math.max(1, 1 + delta) : 1
    for (let i = 0; i < copies; i++) {
      result.push(template)
    }
  }
  return result.length > 0 ? result : pool
}
