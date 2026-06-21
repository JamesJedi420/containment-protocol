/**
 * SPE-1046: pure onboarding/clearance readiness substrate over recruitment
 * candidates. Read-only helper only; no GameState persistence or hire mutation.
 */

import {
  getCandidateFunnelStage,
  normalizeCandidateHireStatus,
  type Candidate,
  type CandidatePipelineStatus,
  type RecruitmentFunnelStage,
} from './recruitment'

export type AffiliationOnboardingCheckpoint =
  | 'identity'
  | 'background'
  | 'role_fit'
  | 'training'
  | 'oath_contract'

export const AFFILIATION_ONBOARDING_CHECKPOINTS: readonly AffiliationOnboardingCheckpoint[] = [
  'identity',
  'background',
  'role_fit',
  'training',
  'oath_contract',
] as const

export type AffiliationOnboardingCheckpointOutcome = 'complete' | 'required' | 'blocked'

export type AffiliationOnboardingStage =
  | 'prospect'
  | 'contacted'
  | 'screening'
  | 'provisional'
  | 'cleared'
  | 'lost'

export interface AffiliationOnboardingReadinessContext {
  readonly backgroundClearedCandidateIds?: readonly string[]
  readonly trainingCompletedCandidateIds?: readonly string[]
  readonly oathContractCandidateIds?: readonly string[]
}

export interface AffiliationOnboardingCheckpointDecision {
  readonly checkpoint: AffiliationOnboardingCheckpoint
  readonly checkpointLabel: string
  readonly outcome: AffiliationOnboardingCheckpointOutcome
  readonly outcomeLabel: string
  readonly reasonCodes: readonly string[]
}

export interface AffiliationOnboardingDecision {
  readonly candidateId: string
  readonly candidateName: string
  readonly stage: AffiliationOnboardingStage
  readonly stageLabel: string
  readonly fullAccessEligible: boolean
  readonly checkpointDecisions: readonly AffiliationOnboardingCheckpointDecision[]
  readonly reasonCodes: readonly string[]
}

type CandidateLike = Partial<Candidate> & Record<string, unknown>

const VALID_FUNNEL_STAGES: readonly RecruitmentFunnelStage[] = [
  'prospect',
  'contacted',
  'screening',
  'hired',
  'lost',
] as const

const VALID_HIRE_STATUSES: readonly CandidatePipelineStatus[] = [
  'available',
  'reserved',
  'expired',
  'candidate',
] as const

function isRecord(value: unknown): value is CandidateLike {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
    (left, right) => left.localeCompare(right)
  )
}

function formatEnumLabel(value: string) {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? `${part[0]?.toUpperCase()}${part.slice(1)}` : part))
    .join(' ')
}

function toIdSet(values: readonly string[] | undefined) {
  return new Set((values ?? []).map((value) => value.trim()).filter((value) => value.length > 0))
}

function getCandidateId(candidate: CandidateLike | null) {
  const id = normalizeToken(candidate?.id)
  return id.length > 0 ? id : 'candidate:unknown'
}

function getCandidateName(candidate: CandidateLike | null, candidateId: string) {
  const name = normalizeToken(candidate?.name)
  return name.length > 0 ? name : candidateId
}

function getValidationReasonCodes(candidate: CandidateLike | null) {
  const reasonCodes: string[] = []

  if (!candidate) {
    return ['invalid_candidate_record']
  }

  if (!normalizeToken(candidate.id)) {
    reasonCodes.push('missing_candidate_id')
  }

  if (!normalizeToken(candidate.name)) {
    reasonCodes.push('missing_candidate_name')
  }

  if (
    candidate.funnelStage !== undefined &&
    !VALID_FUNNEL_STAGES.includes(candidate.funnelStage as RecruitmentFunnelStage)
  ) {
    reasonCodes.push('invalid_or_missing_funnel_stage')
  }

  if (!VALID_HIRE_STATUSES.includes(candidate.hireStatus as CandidatePipelineStatus)) {
    reasonCodes.push('invalid_or_missing_hire_status')
  }

  return uniqueSorted(reasonCodes)
}

function getSafeFunnelStage(candidate: CandidateLike): RecruitmentFunnelStage {
  if (!VALID_FUNNEL_STAGES.includes(candidate.funnelStage as RecruitmentFunnelStage)) {
    return 'prospect'
  }

  return getCandidateFunnelStage(candidate as Candidate)
}

function getSafeHireStatus(candidate: CandidateLike) {
  if (!VALID_HIRE_STATUSES.includes(candidate.hireStatus as CandidatePipelineStatus)) {
    return 'available'
  }

  return normalizeCandidateHireStatus(candidate.hireStatus as CandidatePipelineStatus)
}

function hasScoutSupport(candidate: CandidateLike, minimumStage: number) {
  const report = candidate.scoutReport

  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    return false
  }

  const stage = (report as { stage?: unknown }).stage
  const exactKnown = (report as { exactKnown?: unknown }).exactKnown
  const confidence = (report as { confidence?: unknown }).confidence

  return (
    exactKnown === true ||
    confidence === 'high' ||
    confidence === 'confirmed' ||
    (typeof stage === 'number' && Number.isFinite(stage) && stage >= minimumStage)
  )
}

function hasRoleFitEvidence(candidate: CandidateLike) {
  return (
    normalizeToken(candidate.roleInclination).length > 0 &&
    (typeof candidate.agentData === 'object' ||
      typeof candidate.staffData === 'object' ||
      typeof candidate.specialistData === 'object' ||
      typeof candidate.instructorData === 'object')
  )
}

function resolveStage(
  candidate: CandidateLike | null,
  candidateId: string,
  context: AffiliationOnboardingReadinessContext
): AffiliationOnboardingStage {
  if (!candidate) {
    return 'lost'
  }

  const hireStatus = getSafeHireStatus(candidate)
  const funnelStage = getSafeFunnelStage(candidate)

  if (hireStatus === 'expired' || funnelStage === 'lost') {
    return 'lost'
  }

  if (funnelStage === 'hired') {
    const trainingComplete = toIdSet(context.trainingCompletedCandidateIds).has(candidateId)
    const oathComplete = toIdSet(context.oathContractCandidateIds).has(candidateId)
    return trainingComplete && oathComplete ? 'cleared' : 'provisional'
  }

  return funnelStage
}

function checkpoint(
  checkpoint: AffiliationOnboardingCheckpoint,
  outcome: AffiliationOnboardingCheckpointOutcome,
  reasonCodes: readonly string[]
): AffiliationOnboardingCheckpointDecision {
  return Object.freeze({
    checkpoint,
    checkpointLabel: formatEnumLabel(checkpoint),
    outcome,
    outcomeLabel: formatEnumLabel(outcome),
    reasonCodes: Object.freeze(uniqueSorted(reasonCodes)),
  })
}

function buildCheckpointDecisions(
  candidate: CandidateLike | null,
  candidateId: string,
  stage: AffiliationOnboardingStage,
  context: AffiliationOnboardingReadinessContext
) {
  const backgroundIds = toIdSet(context.backgroundClearedCandidateIds)
  const trainingIds = toIdSet(context.trainingCompletedCandidateIds)
  const oathIds = toIdSet(context.oathContractCandidateIds)

  if (!candidate || stage === 'lost') {
    return [
      checkpoint('identity', 'blocked', ['candidate_lost_or_invalid']),
      checkpoint('background', 'blocked', ['candidate_lost_or_invalid']),
      checkpoint('role_fit', 'blocked', ['candidate_lost_or_invalid']),
      checkpoint('training', 'blocked', ['candidate_lost_or_invalid']),
      checkpoint('oath_contract', 'blocked', ['candidate_lost_or_invalid']),
    ]
  }

  if (stage === 'prospect') {
    return [
      checkpoint('identity', 'required', ['prospect_identity_required']),
      checkpoint('background', 'blocked', ['prospect_background_not_started']),
      checkpoint('role_fit', 'blocked', ['prospect_role_fit_not_started']),
      checkpoint('training', 'blocked', ['prospect_training_locked']),
      checkpoint('oath_contract', 'blocked', ['prospect_oath_contract_locked']),
    ]
  }

  if (stage === 'contacted') {
    return [
      checkpoint('identity', 'complete', ['contacted_identity_confirmed']),
      checkpoint('background', 'required', ['contacted_background_required']),
      checkpoint('role_fit', 'required', ['contacted_role_fit_required']),
      checkpoint('training', 'blocked', ['contacted_training_locked']),
      checkpoint('oath_contract', 'blocked', ['contacted_oath_contract_locked']),
    ]
  }

  const backgroundComplete =
    backgroundIds.has(candidateId) || candidate.revealLevel === 2 || hasScoutSupport(candidate, 2)
  const roleFitComplete =
    hasRoleFitEvidence(candidate) && (candidate.revealLevel >= 1 || hasScoutSupport(candidate, 2))

  if (stage === 'screening') {
    return [
      checkpoint('identity', 'complete', ['screening_identity_confirmed']),
      checkpoint('background', backgroundComplete ? 'complete' : 'required', [
        backgroundComplete ? 'screening_background_supported' : 'screening_background_required',
      ]),
      checkpoint('role_fit', roleFitComplete ? 'complete' : 'required', [
        roleFitComplete ? 'screening_role_fit_supported' : 'screening_role_fit_required',
      ]),
      checkpoint('training', 'required', ['screening_training_required']),
      checkpoint('oath_contract', 'blocked', ['screening_oath_contract_locked']),
    ]
  }

  const trainingComplete = trainingIds.has(candidateId)
  const oathComplete = oathIds.has(candidateId)

  return [
    checkpoint('identity', 'complete', [`${stage}_identity_confirmed`]),
    checkpoint('background', 'complete', [`${stage}_background_confirmed`]),
    checkpoint('role_fit', 'complete', [`${stage}_role_fit_confirmed`]),
    checkpoint('training', trainingComplete ? 'complete' : 'required', [
      trainingComplete ? `${stage}_training_complete` : `${stage}_training_required`,
    ]),
    checkpoint(
      'oath_contract',
      oathComplete ? 'complete' : trainingComplete ? 'required' : 'blocked',
      [
        oathComplete
          ? `${stage}_oath_contract_complete`
          : trainingComplete
            ? `${stage}_oath_contract_required`
            : `${stage}_oath_contract_locked`,
      ]
    ),
  ]
}

export function evaluateAffiliationOnboardingReadiness(
  candidate: Candidate,
  context: AffiliationOnboardingReadinessContext = {}
): AffiliationOnboardingDecision {
  const candidateRecord = isRecord(candidate) ? candidate : null
  const candidateId = getCandidateId(candidateRecord)
  const candidateName = getCandidateName(candidateRecord, candidateId)
  const stage = resolveStage(candidateRecord, candidateId, context)
  const checkpointDecisions = buildCheckpointDecisions(candidateRecord, candidateId, stage, context)
  const fullAccessEligible =
    stage === 'cleared' && checkpointDecisions.every((decision) => decision.outcome === 'complete')
  const reasonCodes = uniqueSorted([
    `stage_${stage}`,
    fullAccessEligible ? 'full_access_eligible' : 'full_access_not_eligible',
    ...getValidationReasonCodes(candidateRecord),
    ...checkpointDecisions.flatMap((decision) => decision.reasonCodes),
  ])

  return Object.freeze({
    candidateId,
    candidateName,
    stage,
    stageLabel: formatEnumLabel(stage),
    fullAccessEligible,
    checkpointDecisions: Object.freeze(checkpointDecisions),
    reasonCodes: Object.freeze(reasonCodes),
  })
}

export function evaluateAffiliationOnboardingReadinessSet(
  candidates: readonly Candidate[],
  context: AffiliationOnboardingReadinessContext = {}
): readonly AffiliationOnboardingDecision[] {
  return Object.freeze(
    [...candidates]
      .map((candidate) => evaluateAffiliationOnboardingReadiness(candidate, context))
      .sort((left, right) => left.candidateId.localeCompare(right.candidateId))
  )
}
