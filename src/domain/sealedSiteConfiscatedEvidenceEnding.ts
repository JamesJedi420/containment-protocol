/**
 * SPE-1051 — pure sealed-site / confiscated-evidence ending projector (slice 6).
 *
 * Callers own exactly one known ending kind:
 * - `sealed_site` — hard seal-and-abandon: access closed permanently; official
 *   understanding reduced to a partial record rather than full scientific recovery
 * - `confiscated_evidence` — state/military intervention stabilizes the site while
 *   confiscating samples, telemetry, and notes, reducing durable institutional
 *   understanding even after the immediate crisis ends
 *
 * Success preserves survival (`survival_with_clarity_loss`) while reducing future
 * knowledge recovery and institutional clarity via explicit immutable fields.
 * This is an ending record — it does not mutate or rewrite slice-1
 * `knowledgeClarityLoss` numbers or `SCAR_DEFINITIONS`.
 *
 * It does not persist GameState, run week-close, invent true-defeat, UI,
 * additional adaptation unlocks, full living-but-lost taxonomy, SPE-868
 * review-metrics, or rewrite slices 1–5.
 */

export const SEALED_SITE_CONFISCATED_EVIDENCE_ENDING_KINDS = [
  'sealed_site',
  'confiscated_evidence',
] as const
export type SealedSiteConfiscatedEvidenceEndingKind =
  (typeof SEALED_SITE_CONFISCATED_EVIDENCE_ENDING_KINDS)[number]

/**
 * Outcome kind for slice 6. Game-over, true-defeat, and entity-elimination
 * outcomes are intentionally omitted — this projector only emits
 * survival_with_clarity_loss.
 */
export const SEALED_SITE_CONFISCATED_EVIDENCE_OUTCOME_KINDS = [
  'survival_with_clarity_loss',
] as const
export type SealedSiteConfiscatedEvidenceOutcomeKind =
  (typeof SEALED_SITE_CONFISCATED_EVIDENCE_OUTCOME_KINDS)[number]

export interface SealedSiteConfiscatedEvidenceEndingInput {
  /** Required: which authored ending resolves the crisis. */
  readonly endingKind: SealedSiteConfiscatedEvidenceEndingKind
  /** Optional caller-owned site id (non-empty string when present). */
  readonly siteId?: string
}

export interface SealedSiteConfiscatedEvidenceEndingProjection {
  readonly outcomeKind: 'survival_with_clarity_loss'
  readonly endingKind: SealedSiteConfiscatedEvidenceEndingKind
  readonly siteId: string | null
  /** Always true — survival is preserved; this is not game-over. */
  readonly preservesSurvival: true
  readonly gameOver: false
  readonly trueDefeat: false
  readonly entityEliminated: false
  /** Always true on success — future knowledge recovery is reduced. */
  readonly knowledgeRecoveryReduced: true
  /** Always true on success — institutional clarity is reduced. */
  readonly institutionalClarityReduced: true
  /**
   * `sealed_site` only: access points are closed permanently.
   * `confiscated_evidence`: false (site remains under intervention control).
   */
  readonly accessPermanentlyClosed: boolean
  /**
   * `sealed_site` only: official understanding is a partial record, not full
   * scientific recovery.
   * `confiscated_evidence`: false (clarity loss is via confiscation, not seal).
   */
  readonly officialUnderstandingIsPartialRecord: boolean
  /**
   * `confiscated_evidence` only: intervention stabilizes the site.
   * `sealed_site`: false (abandonment, not stabilization).
   */
  readonly siteStabilizedByIntervention: boolean
  /**
   * `confiscated_evidence` only: samples, telemetry, and notes are confiscated.
   * `sealed_site`: false.
   */
  readonly samplesTelemetryNotesConfiscated: boolean
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export function isSealedSiteConfiscatedEvidenceEndingKind(
  value: unknown
): value is SealedSiteConfiscatedEvidenceEndingKind {
  return SEALED_SITE_CONFISCATED_EVIDENCE_ENDING_KINDS.some((kind) => kind === value)
}

export function isSealedSiteConfiscatedEvidenceOutcomeKind(
  value: unknown
): value is SealedSiteConfiscatedEvidenceOutcomeKind {
  return SEALED_SITE_CONFISCATED_EVIDENCE_OUTCOME_KINDS.some((kind) => kind === value)
}

/**
 * Validate caller-owned inputs. endingKind is required and must be a known
 * kind. Present optional siteId must be a non-empty string (malformed fails
 * closed). Omit / null / undefined / unknown kind / non-object fail closed.
 */
export function validateSealedSiteConfiscatedEvidenceEndingInput(
  input: unknown
): input is SealedSiteConfiscatedEvidenceEndingInput {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return false
  }
  const record = input as Record<string, unknown>

  if (
    !('endingKind' in record) ||
    !isSealedSiteConfiscatedEvidenceEndingKind(record.endingKind)
  ) {
    return false
  }

  if ('siteId' in record) {
    if (!isNonEmptyString(record.siteId)) return false
  }

  return true
}

/**
 * Project a configured sealed-site or confiscated-evidence ending into an
 * immutable survival-with-clarity-loss record. Omit / null / undefined /
 * unknown / malformed inputs fail closed to undefined. Never invents
 * game-over, true-defeat, or entity elimination, never rewrites slice-1
 * knowledgeClarityLoss, and uses no randomness.
 */
export function projectSealedSiteConfiscatedEvidenceEnding(
  input: SealedSiteConfiscatedEvidenceEndingInput | null | undefined
): SealedSiteConfiscatedEvidenceEndingProjection | undefined {
  if (!validateSealedSiteConfiscatedEvidenceEndingInput(input)) return undefined

  const endingKind = input.endingKind
  const siteId = isNonEmptyString(input.siteId) ? input.siteId : null

  switch (endingKind) {
    case 'sealed_site':
      return Object.freeze({
        outcomeKind: 'survival_with_clarity_loss' as const,
        endingKind,
        siteId,
        preservesSurvival: true as const,
        gameOver: false as const,
        trueDefeat: false as const,
        entityEliminated: false as const,
        knowledgeRecoveryReduced: true as const,
        institutionalClarityReduced: true as const,
        accessPermanentlyClosed: true,
        officialUnderstandingIsPartialRecord: true,
        siteStabilizedByIntervention: false,
        samplesTelemetryNotesConfiscated: false,
      })
    case 'confiscated_evidence':
      return Object.freeze({
        outcomeKind: 'survival_with_clarity_loss' as const,
        endingKind,
        siteId,
        preservesSurvival: true as const,
        gameOver: false as const,
        trueDefeat: false as const,
        entityEliminated: false as const,
        knowledgeRecoveryReduced: true as const,
        institutionalClarityReduced: true as const,
        accessPermanentlyClosed: false,
        officialUnderstandingIsPartialRecord: false,
        siteStabilizedByIntervention: true,
        samplesTelemetryNotesConfiscated: true,
      })
    default: {
      const _exhaustive: never = endingKind
      void _exhaustive
      return undefined
    }
  }
}

export function listSealedSiteConfiscatedEvidenceEndingKinds(): readonly SealedSiteConfiscatedEvidenceEndingKind[] {
  return SEALED_SITE_CONFISCATED_EVIDENCE_ENDING_KINDS
}
