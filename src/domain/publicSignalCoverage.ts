/**
 * SPE-2092 slice 1: public signal coverage evaluator.
 *
 * Pure deterministic helper scoring institutional versus ambient public-signal
 * channel coverage for a topic/district — distinct from intake report verification
 * (SPE-2292) and intel distortion (SPE-22).
 */

// ---------------------------------------------------------------------------
// Bands and channel flags
// ---------------------------------------------------------------------------

export type CrawlerReachBand = 'none' | 'low' | 'medium' | 'high'

export const CRAWLER_REACH_BANDS: readonly CrawlerReachBand[] = [
  'none',
  'low',
  'medium',
  'high',
] as const

export type InferenceModelBand = 'opaque' | 'low' | 'moderate' | 'high'

export const INFERENCE_MODEL_BANDS: readonly InferenceModelBand[] = [
  'opaque',
  'low',
  'moderate',
  'high',
] as const

export type PublicSignalCoverageBand =
  | 'institutional_only'
  | 'partial_public'
  | 'public_led'
  | 'blind_spot'

export const PUBLIC_SIGNAL_COVERAGE_BANDS: readonly PublicSignalCoverageBand[] = [
  'institutional_only',
  'partial_public',
  'public_led',
  'blind_spot',
] as const

export interface InstitutionalChannelFlags {
  readonly formalAlert?: boolean
  readonly partnerChannel?: boolean
  readonly technicalTrace?: boolean
  readonly agencyCanonicalFeed?: boolean
}

export interface PublicChannelFlags {
  readonly communityPatternMatching?: boolean
  readonly ambientSocialSignal?: boolean
  readonly mediaTrace?: boolean
  readonly rumorChain?: boolean
  /** Grassroots optimization / community pattern density — not literal OSINT tooling. */
  readonly grassrootsDensityHigh?: boolean
}

export interface PublicSignalCoverageRequest {
  readonly topicId?: string
  readonly districtId?: string
  readonly institutionalChannels?: InstitutionalChannelFlags
  readonly publicChannels?: PublicChannelFlags
  readonly crawlerReachBand?: CrawlerReachBand
  readonly inferenceModelBand?: InferenceModelBand
}

export interface PublicSignalCoverageSummary {
  readonly institutionalChannelCount: number
  readonly publicChannelCount: number
  readonly publicActivityWeight: number
}

export interface PublicSignalCoverageResult {
  readonly topicId: string
  readonly districtId: string
  readonly coverageBand: PublicSignalCoverageBand
  readonly confidencePenalty: number
  readonly falseNegativeRisk: number
  readonly structuredReasons: readonly string[]
  readonly summary: PublicSignalCoverageSummary
}

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

const CRAWLER_REACH_SET = new Set<string>(CRAWLER_REACH_BANDS)
const INFERENCE_MODEL_SET = new Set<string>(INFERENCE_MODEL_BANDS)

const BASE_CONFIDENCE_PENALTY: Record<PublicSignalCoverageBand, number> = {
  institutional_only: 0,
  partial_public: 0.22,
  public_led: 0.38,
  blind_spot: 0.52,
}

const BASE_FALSE_NEGATIVE_RISK: Record<PublicSignalCoverageBand, number> = {
  institutional_only: 0.04,
  partial_public: 0.18,
  public_led: 0.32,
  blind_spot: 0.48,
}

const CRAWLER_FALSE_NEGATIVE_ADD: Record<CrawlerReachBand, number> = {
  none: 0.16,
  low: 0.1,
  medium: 0.05,
  high: 0,
}

const INFERENCE_CONFIDENCE_PENALTY_ADD: Record<InferenceModelBand, number> = {
  opaque: 0.14,
  low: 0.09,
  moderate: 0.04,
  high: 0,
}

const PUBLIC_ACTIVITY_GRASSROOTS_WEIGHT = 2
const PUBLIC_LED_RATIO_THRESHOLD = 2
const PARTIAL_PUBLIC_MAX_CONFIDENCE_PENALTY = 0.45

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const BLIND_SPOT_COVERAGE_REQUEST: PublicSignalCoverageRequest = {
  topicId: 'topic:canal-bridge-incident',
  districtId: 'district:riverside-east',
  institutionalChannels: {},
  publicChannels: {
    communityPatternMatching: true,
    ambientSocialSignal: true,
    rumorChain: true,
    grassrootsDensityHigh: true,
  },
  crawlerReachBand: 'none',
  inferenceModelBand: 'opaque',
}

export const INSTITUTIONAL_ONLY_COVERAGE_REQUEST: PublicSignalCoverageRequest = {
  topicId: 'topic:canal-bridge-incident',
  districtId: 'district:riverside-east',
  institutionalChannels: {
    formalAlert: true,
    partnerChannel: true,
    technicalTrace: true,
    agencyCanonicalFeed: true,
  },
  publicChannels: {},
  crawlerReachBand: 'high',
  inferenceModelBand: 'high',
}

export const PARTIAL_PUBLIC_COVERAGE_REQUEST: PublicSignalCoverageRequest = {
  topicId: 'topic:canal-bridge-incident',
  districtId: 'district:riverside-east',
  institutionalChannels: {
    formalAlert: true,
    technicalTrace: true,
  },
  publicChannels: {
    communityPatternMatching: true,
    mediaTrace: true,
  },
  crawlerReachBand: 'medium',
  inferenceModelBand: 'moderate',
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isCrawlerReachBand(value: string): value is CrawlerReachBand {
  return CRAWLER_REACH_SET.has(value)
}

export function isInferenceModelBand(value: string): value is InferenceModelBand {
  return INFERENCE_MODEL_SET.has(value)
}

export function isPublicSignalCoverageBand(value: string): value is PublicSignalCoverageBand {
  return PUBLIC_SIGNAL_COVERAGE_BANDS.includes(value as PublicSignalCoverageBand)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  if (value < 0) {
    return 0
  }

  if (value > 1) {
    return 1
  }

  return value
}

function roundScore(value: number) {
  return Math.round(clamp01(value) * 1000) / 1000
}

function countTrueFlags(flags: Record<string, boolean | undefined> | undefined) {
  if (!flags) {
    return 0
  }

  return Object.values(flags).filter((value) => value === true).length
}

function countInstitutionalChannels(flags: InstitutionalChannelFlags | undefined) {
  return countTrueFlags(flags)
}

function countPublicChannels(flags: PublicChannelFlags | undefined) {
  if (!flags) {
    return 0
  }

  let count = 0
  if (flags.communityPatternMatching === true) count += 1
  if (flags.ambientSocialSignal === true) count += 1
  if (flags.mediaTrace === true) count += 1
  if (flags.rumorChain === true) count += 1
  return count
}

function computePublicActivityWeight(
  publicChannelCount: number,
  flags: PublicChannelFlags | undefined
) {
  const grassrootsBoost =
    flags?.grassrootsDensityHigh === true ? PUBLIC_ACTIVITY_GRASSROOTS_WEIGHT : 0

  return publicChannelCount + grassrootsBoost
}

function resolveCrawlerReachBand(value: unknown): CrawlerReachBand {
  const token = normalizeToken(value)
  return isCrawlerReachBand(token) ? token : 'medium'
}

function resolveInferenceModelBand(value: unknown): InferenceModelBand {
  const token = normalizeToken(value)
  return isInferenceModelBand(token) ? token : 'moderate'
}

function resolveCoverageBand(input: {
  institutionalChannelCount: number
  publicActivityWeight: number
  sparseInput: boolean
}): PublicSignalCoverageBand {
  if (input.sparseInput) {
    return 'partial_public'
  }

  const { institutionalChannelCount, publicActivityWeight } = input

  if (institutionalChannelCount === 0 && publicActivityWeight > 0) {
    return 'blind_spot'
  }

  if (institutionalChannelCount > 0 && publicActivityWeight === 0) {
    return 'institutional_only'
  }

  if (institutionalChannelCount > 0 && publicActivityWeight > 0) {
    if (publicActivityWeight >= institutionalChannelCount * PUBLIC_LED_RATIO_THRESHOLD) {
      return 'public_led'
    }

    return 'partial_public'
  }

  return 'partial_public'
}

function buildStructuredReasons(input: {
  topicId: string
  districtId: string
  coverageBand: PublicSignalCoverageBand
  institutionalChannelCount: number
  publicChannelCount: number
  publicActivityWeight: number
  crawlerReachBand: CrawlerReachBand
  inferenceModelBand: InferenceModelBand
  sparseInput: boolean
  missingInstitutionalChannels: boolean
  lowCrawlerReach: boolean
  lowInferenceInterpretability: boolean
}): readonly string[] {
  const reasons = [
    `band:${input.coverageBand}`,
    `topic:${input.topicId}`,
    `district:${input.districtId}`,
    `channel:institutional_count:${input.institutionalChannelCount}`,
    `channel:public_count:${input.publicChannelCount}`,
    `channel:public_activity_weight:${input.publicActivityWeight}`,
    `crawler:${input.crawlerReachBand}`,
    `inference:${input.inferenceModelBand}`,
  ]

  if (input.sparseInput) {
    reasons.push('sparse_input_defaults')
  }

  if (input.missingInstitutionalChannels) {
    reasons.push('institutional_channel_gap')
  }

  if (input.lowCrawlerReach) {
    reasons.push('crawler_blind_spot')
  }

  if (input.lowInferenceInterpretability) {
    reasons.push('inference_interpretability_low')
  }

  return reasons.sort((left, right) => left.localeCompare(right))
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function evaluatePublicSignalCoverage(
  input: PublicSignalCoverageRequest = {}
): PublicSignalCoverageResult {
  const topicId = normalizeToken(input.topicId) || '(unknown-topic)'
  const districtId = normalizeToken(input.districtId) || '(unknown-district)'

  const institutionalChannelCount = countInstitutionalChannels(input.institutionalChannels)
  const publicChannelCount = countPublicChannels(input.publicChannels)
  const publicActivityWeight = computePublicActivityWeight(
    publicChannelCount,
    input.publicChannels
  )

  const sparseInput =
    institutionalChannelCount === 0 &&
    publicChannelCount === 0 &&
    input.publicChannels?.grassrootsDensityHigh !== true

  const crawlerReachBand = resolveCrawlerReachBand(input.crawlerReachBand)
  const inferenceModelBand = resolveInferenceModelBand(input.inferenceModelBand)

  const coverageBand = resolveCoverageBand({
    institutionalChannelCount,
    publicActivityWeight,
    sparseInput,
  })

  const missingInstitutionalChannels = institutionalChannelCount === 0 && publicActivityWeight > 0
  const lowCrawlerReach = crawlerReachBand === 'none' || crawlerReachBand === 'low'
  const lowInferenceInterpretability =
    inferenceModelBand === 'opaque' || inferenceModelBand === 'low'

  let confidencePenalty =
    BASE_CONFIDENCE_PENALTY[coverageBand] + INFERENCE_CONFIDENCE_PENALTY_ADD[inferenceModelBand]

  if (coverageBand === 'partial_public') {
    confidencePenalty = Math.min(confidencePenalty, PARTIAL_PUBLIC_MAX_CONFIDENCE_PENALTY)
  }

  let falseNegativeRisk = BASE_FALSE_NEGATIVE_RISK[coverageBand]

  if (publicActivityWeight > 0) {
    falseNegativeRisk += CRAWLER_FALSE_NEGATIVE_ADD[crawlerReachBand]
  }

  if (sparseInput) {
    confidencePenalty = Math.min(confidencePenalty, 0.12)
    falseNegativeRisk = Math.min(falseNegativeRisk, 0.15)
  }

  const structuredReasons = buildStructuredReasons({
    topicId,
    districtId,
    coverageBand,
    institutionalChannelCount,
    publicChannelCount,
    publicActivityWeight,
    crawlerReachBand,
    inferenceModelBand,
    sparseInput,
    missingInstitutionalChannels,
    lowCrawlerReach,
    lowInferenceInterpretability,
  })

  return {
    topicId,
    districtId,
    coverageBand,
    confidencePenalty: roundScore(confidencePenalty),
    falseNegativeRisk: roundScore(falseNegativeRisk),
    structuredReasons,
    summary: {
      institutionalChannelCount,
      publicChannelCount,
      publicActivityWeight,
    },
  }
}
