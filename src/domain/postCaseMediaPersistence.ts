/**
 * SPE-2573 / SPE-947 AC row 6: pure post-case media persistence evaluator.
 * After local containment, hazardous content / mirrors / derivative media can keep the case risky.
 * No GameState persistence, weekly mutation, store, or UI coupling.
 * Distinct from SPE-2572 takedown resistance (AC row 5) and SPE-2569 platform outage (AC row 4).
 */

export const POST_CASE_MEDIA_KINDS = ['hazardous_content', 'mirror', 'derivative'] as const

export type PostCaseMediaKind = (typeof POST_CASE_MEDIA_KINDS)[number]

export const POST_CASE_RISK_OUTCOMES = ['remains_risky', 'cleared', 'blocked'] as const

export type PostCaseRiskOutcome = (typeof POST_CASE_RISK_OUTCOMES)[number]

/**
 * Compact post-containment media artifact. Kind vocabulary aligns with SPE-2111
 * hazardous / mirror / derivative concepts without importing the registry.
 */
export interface PostCaseMediaArtifact {
  readonly id: string
  readonly label: string
  readonly kind: PostCaseMediaKind
  /**
   * Whether this artifact still circulates after local site containment.
   * Only persisting artifacts contribute to the risk score.
   */
  readonly persistsAfterContainment: boolean
  /**
   * Risk weight contributed when the artifact persists.
   * Must be a finite number >= 0 when valid.
   */
  readonly riskWeight: number
}

export interface PostCaseMediaPersistenceInput {
  readonly caseId?: string
  readonly caseLabel?: string
  /**
   * True when local site containment has succeeded.
   * AC row 6 evaluates residual media risk only after local containment.
   */
  readonly localContainmentSucceeded: boolean
  readonly mediaArtifacts?: readonly PostCaseMediaArtifact[] | null
  /**
   * Finite risk score at or above which the case remains risky.
   * Must be > 0 when valid.
   */
  readonly riskThreshold: number
}

export interface PostCaseMediaPersistenceDecision {
  readonly caseId: string
  readonly caseLabel: string
  readonly localContainmentSucceeded: boolean
  readonly persistentArtifactCount: number
  readonly persistenceRiskScore: number
  readonly riskThreshold: number
  readonly outcome: PostCaseRiskOutcome
  readonly remainsRisky: boolean
  readonly reasonCodes: readonly string[]
}

const FALLBACK_SCORE = 0

type ArtifactLike = Partial<PostCaseMediaArtifact> & Record<string, unknown>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
      (left, right) => left.localeCompare(right)
    )
  )
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function normalizeId(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function normalizeLabel(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function isMediaKind(value: unknown): value is PostCaseMediaKind {
  return typeof value === 'string' && (POST_CASE_MEDIA_KINDS as readonly string[]).includes(value)
}

function roundMetric(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  const scaled = value * 1_000_000
  if (!Number.isFinite(scaled)) {
    return value
  }

  return Math.round(scaled) / 1_000_000
}

function freezeDecision(
  decision: PostCaseMediaPersistenceDecision
): PostCaseMediaPersistenceDecision {
  return Object.freeze({
    ...decision,
    reasonCodes: uniqueSorted(decision.reasonCodes),
  })
}

function blockedDecision(
  reasonCodes: readonly string[],
  fields: {
    caseId: string
    caseLabel: string
    localContainmentSucceeded: boolean
    riskThreshold: number
    persistentArtifactCount?: number
    persistenceRiskScore?: number
  }
): PostCaseMediaPersistenceDecision {
  return freezeDecision({
    caseId: fields.caseId,
    caseLabel: fields.caseLabel,
    localContainmentSucceeded: fields.localContainmentSucceeded,
    persistentArtifactCount: fields.persistentArtifactCount ?? 0,
    persistenceRiskScore: roundMetric(fields.persistenceRiskScore ?? FALLBACK_SCORE),
    riskThreshold: fields.riskThreshold,
    outcome: 'blocked',
    remainsRisky: false,
    reasonCodes,
  })
}

function kindPersistReason(kind: PostCaseMediaKind): string {
  switch (kind) {
    case 'hazardous_content':
      return 'hazardous_content_persists'
    case 'mirror':
      return 'mirror_persists'
    case 'derivative':
      return 'derivative_persists'
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

type ParsedArtifact = {
  valid: boolean
  presentInvalid: boolean
  persists: boolean
  kind: PostCaseMediaKind | null
  riskWeight: number
  reasonCodes: string[]
}

function parseArtifact(raw: unknown, index: number): ParsedArtifact {
  const reasonCodes: string[] = []

  if (raw === null || raw === undefined) {
    return {
      valid: false,
      presentInvalid: true,
      persists: false,
      kind: null,
      riskWeight: FALLBACK_SCORE,
      reasonCodes: ['invalid_media_artifact'],
    }
  }

  if (!isRecord(raw)) {
    return {
      valid: false,
      presentInvalid: true,
      persists: false,
      kind: null,
      riskWeight: FALLBACK_SCORE,
      reasonCodes: ['invalid_media_artifact'],
    }
  }

  const artifact = raw as ArtifactLike
  let valid = true

  if (!normalizeId(artifact.id, '')) {
    reasonCodes.push('invalid_media_artifact_id')
    valid = false
  }

  if (!isMediaKind(artifact.kind)) {
    reasonCodes.push('invalid_media_kind')
    valid = false
  }

  if (typeof artifact.persistsAfterContainment !== 'boolean') {
    reasonCodes.push('invalid_persists_after_containment')
    valid = false
  }

  // Explicit null counts as present-but-invalid (distinct from omitted undefined).
  if (artifact.riskWeight === null || !isNonNegativeFinite(artifact.riskWeight)) {
    reasonCodes.push('invalid_risk_weight')
    valid = false
  }

  if (!valid) {
    return {
      valid: false,
      presentInvalid: true,
      persists: false,
      kind: isMediaKind(artifact.kind) ? artifact.kind : null,
      riskWeight: FALLBACK_SCORE,
      reasonCodes: reasonCodes.length > 0 ? reasonCodes : [`invalid_media_artifact_at_${index}`],
    }
  }

  return {
    valid: true,
    presentInvalid: false,
    persists: artifact.persistsAfterContainment === true,
    kind: artifact.kind as PostCaseMediaKind,
    riskWeight: artifact.riskWeight as number,
    reasonCodes: [],
  }
}

/**
 * Evaluates whether a case remains risky after local containment because
 * hazardous content, mirrors, or derivative media still persist.
 *
 * Priority:
 *   missing/invalid evaluation input or riskThreshold → blocked
 *   localContainmentSucceeded not true → blocked (post-containment only)
 *   missing/invalid mediaArtifacts list or any present-but-invalid artifact → blocked
 *     (incomplete config never remains risky)
 *   rawScore >= riskThreshold → remains_risky
 *   else → cleared
 *
 * Does not model owner takedown incentives (SPE-2572) or platform outage (SPE-2569).
 */
export function evaluatePostCaseMediaPersistence(
  input: PostCaseMediaPersistenceInput | null | undefined
): PostCaseMediaPersistenceDecision {
  const reasonCodes: string[] = []

  if (input === null || input === undefined) {
    reasonCodes.push('missing_evaluation_input')
    reasonCodes.push('media_persistence_blocked')
    return blockedDecision(reasonCodes, {
      caseId: 'case:unknown',
      caseLabel: 'Unknown Case',
      localContainmentSucceeded: false,
      riskThreshold: 0,
    })
  }

  const caseId = normalizeId(input.caseId, 'case:unknown')
  const caseLabel = normalizeLabel(input.caseLabel, caseId)

  let riskThreshold = 0
  let hasValidRiskThreshold = false
  if (!isPositiveFinite(input.riskThreshold)) {
    reasonCodes.push('missing_or_invalid_risk_threshold')
  } else {
    riskThreshold = input.riskThreshold
    hasValidRiskThreshold = true
  }

  if (typeof input.localContainmentSucceeded !== 'boolean') {
    reasonCodes.push('invalid_local_containment_succeeded')
    reasonCodes.push('media_persistence_blocked')
    return blockedDecision(reasonCodes, {
      caseId,
      caseLabel,
      localContainmentSucceeded: false,
      riskThreshold,
    })
  }

  const localContainmentSucceeded = input.localContainmentSucceeded

  if (!localContainmentSucceeded) {
    reasonCodes.push('local_containment_not_succeeded')
    reasonCodes.push('media_persistence_blocked')
    return blockedDecision(reasonCodes, {
      caseId,
      caseLabel,
      localContainmentSucceeded: false,
      riskThreshold,
    })
  }

  if (!hasValidRiskThreshold) {
    reasonCodes.push('media_persistence_blocked')
    return blockedDecision(reasonCodes, {
      caseId,
      caseLabel,
      localContainmentSucceeded: true,
      riskThreshold: 0,
    })
  }

  const mediaArtifacts = input.mediaArtifacts

  if (mediaArtifacts === null || mediaArtifacts === undefined) {
    reasonCodes.push('missing_media_artifacts')
    reasonCodes.push('media_config_incomplete')
    reasonCodes.push('media_persistence_blocked')
    return blockedDecision(reasonCodes, {
      caseId,
      caseLabel,
      localContainmentSucceeded: true,
      riskThreshold,
    })
  }

  if (!Array.isArray(mediaArtifacts)) {
    reasonCodes.push('invalid_media_artifacts')
    reasonCodes.push('media_config_incomplete')
    reasonCodes.push('media_persistence_blocked')
    return blockedDecision(reasonCodes, {
      caseId,
      caseLabel,
      localContainmentSucceeded: true,
      riskThreshold,
    })
  }

  // Reject sparse holes — Array.map/some skip empty slots and would miss invalid config.
  for (let index = 0; index < mediaArtifacts.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(mediaArtifacts, index)) {
      reasonCodes.push('sparse_media_artifacts')
      reasonCodes.push('media_config_incomplete')
      reasonCodes.push('media_persistence_blocked')
      return blockedDecision(reasonCodes, {
        caseId,
        caseLabel,
        localContainmentSucceeded: true,
        riskThreshold,
      })
    }
  }

  const parsed = mediaArtifacts.map((artifact, index) => parseArtifact(artifact, index))
  const hasPresentInvalid = parsed.some((entry) => entry.presentInvalid)

  if (hasPresentInvalid) {
    for (const entry of parsed) {
      reasonCodes.push(...entry.reasonCodes)
    }
    reasonCodes.push('media_config_incomplete')
    reasonCodes.push('media_persistence_blocked')
    return blockedDecision(reasonCodes, {
      caseId,
      caseLabel,
      localContainmentSucceeded: true,
      riskThreshold,
    })
  }

  let rawScore = 0
  let persistentArtifactCount = 0
  const kindReasons: string[] = []

  for (const entry of parsed) {
    if (!entry.persists || entry.kind === null) {
      continue
    }

    persistentArtifactCount += 1
    rawScore += entry.riskWeight
    kindReasons.push(kindPersistReason(entry.kind))
  }

  const persistenceRiskScore = roundMetric(rawScore)

  if (rawScore >= riskThreshold) {
    reasonCodes.push(...kindReasons)
    reasonCodes.push('media_persistence_risk')
    return freezeDecision({
      caseId,
      caseLabel,
      localContainmentSucceeded: true,
      persistentArtifactCount,
      persistenceRiskScore,
      riskThreshold,
      outcome: 'remains_risky',
      remainsRisky: true,
      reasonCodes,
    })
  }

  reasonCodes.push('media_cleared')
  return freezeDecision({
    caseId,
    caseLabel,
    localContainmentSucceeded: true,
    persistentArtifactCount,
    persistenceRiskScore,
    riskThreshold,
    outcome: 'cleared',
    remainsRisky: false,
    reasonCodes,
  })
}

/** Compact fixture: local containment succeeded but mirrors + derivatives keep the case risky. */
export const EXAMPLE_PERSISTING_POST_CASE_MEDIA: PostCaseMediaPersistenceInput = Object.freeze({
  caseId: 'case:site-echo-7',
  caseLabel: 'Site Echo-7 residual media',
  localContainmentSucceeded: true,
  riskThreshold: 3,
  mediaArtifacts: Object.freeze([
    Object.freeze({
      id: 'media:hazard-clip-primary',
      label: 'Primary hazardous clip',
      kind: 'hazardous_content' as const,
      persistsAfterContainment: true,
      riskWeight: 2,
    }),
    Object.freeze({
      id: 'media:mirror-feed-3',
      label: 'Regional mirror feed',
      kind: 'mirror' as const,
      persistsAfterContainment: true,
      riskWeight: 1.5,
    }),
    Object.freeze({
      id: 'media:derivative-fan-edit',
      label: 'Derivative fan edit',
      kind: 'derivative' as const,
      persistsAfterContainment: true,
      riskWeight: 1,
    }),
  ]),
})

/** Compact fixture: containment succeeded and remaining media do not persist risk. */
export const EXAMPLE_CLEARED_POST_CASE_MEDIA: PostCaseMediaPersistenceInput = Object.freeze({
  caseId: 'case:archive-scrubbed',
  caseLabel: 'Archive-scrubbed case',
  localContainmentSucceeded: true,
  riskThreshold: 3,
  mediaArtifacts: Object.freeze([
    Object.freeze({
      id: 'media:internal-copy',
      label: 'Internal archive copy',
      kind: 'hazardous_content' as const,
      persistsAfterContainment: false,
      riskWeight: 5,
    }),
    Object.freeze({
      id: 'media:stale-mirror',
      label: 'Taken-down mirror',
      kind: 'mirror' as const,
      persistsAfterContainment: false,
      riskWeight: 2,
    }),
  ]),
})
