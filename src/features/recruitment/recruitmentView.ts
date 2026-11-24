import { assessAttritionPressure } from '../../domain/agent/attrition'
import { buildAgentStatCaps } from '../../domain/agentPotential'
import { evaluateAffiliationOnboardingReadiness } from '../../domain/affiliationOnboardingReadiness'
import type { AgentRole, Candidate, GameState, StatBlock } from '../../domain/models'
import { ROLE_LABELS } from '../../data/copy'
import { evaluateRecruitmentScoutSupport } from '../../domain/recon'
import { filterCandidates, type CandidateFilters } from '../../domain/sim/candidateFilter'
import { assessCandidateScouting } from '../../domain/sim/recruitmentScouting'
import {
  getCandidateScoutStage,
  getCandidateHireRole,
  getCandidatePool,
  getCandidateOverall,
  isCandidateScoutConfirmed,
  getCandidateWeeklyCost,
  isCandidateHireable,
  normalizeCandidateCategory,
  normalizeStaffCandidateSpecialty,
  previewCandidate,
  type CandidatePreview,
} from '../../domain/recruitment'
import { buildEventFeedView, type EventFeedView } from '../dashboard/eventFeedView'
import { evaluatePersonnelQuery, type PersonnelQueryRecord } from '../shared/personnelQueryView'

const CANDIDATE_STAT_KEYS: Array<'combat' | 'investigation' | 'utility' | 'social'> = [
  'combat',
  'investigation',
  'utility',
  'social',
]

export interface RecruitmentViewFilters extends CandidateFilters {
  search?: string
  expiringSoonOnly?: boolean
  sort?: 'expiry' | 'overall' | 'wage' | 'name'
}

export interface RecruitmentCandidateView {
  candidate: Candidate
  roleLabel: string
  weeklyWage?: number
  expiryWeek?: number
  offeredRole?: AgentRole
  hireOutcomeLabel?: string
  sourceLabel?: string
  overallLabel: string
  potentialLabel: string
  scoutLabel: string
  scoutDepthLabel: string
  scoutWorthLabel: string
  scoutConfidenceLabel: string
  scoutIdentityLabel?: string
  onboardingStageLabel: string
  onboardingAccessLabel: string
  onboardingCheckpointLabels: readonly string[]
  knownNowSummary: string
  uncertaintySummary: string
  nextScanSummary: string
  capIntelLabel: string
  capIntelDetails: string[]
  scoutActionLabel: string
  scoutCost?: number
  canScout: boolean
  scoutBlockedReason?: string
  expiringSoon: boolean
  hiddenOverall: boolean
  preview: CandidatePreview
}

export interface RecruitmentScoutingHistoryView {
  id: string
  title: string
  detail: string
  tone: EventFeedView['tone']
  href?: string
}

export interface RecruitmentScoutingOverviewView {
  outstandingLeadCount: number
  supportScore: number
  operativeCount: number
  fieldReconCount: number
  supportSummary: string
  revealSummary: string
  costSummary: string
  recentOutcomes: RecruitmentScoutingHistoryView[]
}

export function getRecruitmentCandidateViews(
  game: GameState,
  filters: RecruitmentViewFilters = {}
): RecruitmentCandidateView[] {
  const candidates = filterCandidates(getCandidatePool(game), filters).filter(
    (candidate) => !filters.expiringSoonOnly || isExpiringSoon(candidate.expiryWeek, game.week)
  )
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]))
  const search = filters.search?.trim() ?? ''
  const ids = evaluatePersonnelQuery(
    candidates.map((candidate) => projectRecruitmentQueryRecord(candidate, search.length > 0)),
    { q: search, role: 'all', status: 'all', team: 'all', fatigue: 'all', training: 'all' },
    { primary: 'name' }
  )

  const matches = ids.flatMap((id) => {
    const candidate = candidatesById.get(id)
    if (!candidate) return []

    return [
      {
        candidate,
        overall: candidate.evaluation.overallVisible
          ? finiteNumber(getCandidateOverall(candidate))
          : undefined,
        expiryWeek: finiteNumber(candidate.expiryWeek),
        weeklyWage: finiteNumber(getCandidateWeeklyCost(candidate)),
      },
    ]
  })
  const sort = filters.sort ?? 'expiry'
  // Stable numeric sorting preserves shared name and identity order for ties.
  if (sort !== 'name')
    matches.sort((left, right) => compareRecruitmentSortValues(left, right, sort))

  return matches.map(({ candidate, overall, expiryWeek, weeklyWage }) => {
    const offeredRole = getCandidateHireRole(candidate)
    const preview = previewCandidate(candidate, game, offeredRole)
    const scoutAssessment = assessCandidateScouting(game, candidate.id)
    const scoutIntel = buildCandidateScoutIntel(candidate)
    const onboardingReadiness = buildCandidateOnboardingReadinessLabels(candidate)

    return {
      candidate,
      roleLabel: getCandidateRoleLabel(candidate),
      expiryWeek,
      weeklyWage,
      ...(offeredRole ? { offeredRole, hireOutcomeLabel: ROLE_LABELS[offeredRole] } : {}),
      ...(getCandidateSourceLabel(candidate)
        ? { sourceLabel: getCandidateSourceLabel(candidate) }
        : {}),
      overallLabel: overall === undefined ? 'Obscured' : String(overall),
      potentialLabel: candidate.evaluation.potentialVisible
        ? (candidate.evaluation.potentialTier ?? 'Unknown')
        : 'Unknown',
      scoutLabel: formatScoutLabel(candidate),
      scoutDepthLabel: scoutIntel.depthLabel,
      scoutWorthLabel: scoutIntel.worthLabel,
      scoutConfidenceLabel: scoutIntel.confidenceLabel,
      ...(offeredRole === 'field_recon' ? { scoutIdentityLabel: 'Field Recon path' } : {}),
      onboardingStageLabel: onboardingReadiness.stageLabel,
      onboardingAccessLabel: onboardingReadiness.accessLabel,
      onboardingCheckpointLabels: onboardingReadiness.checkpointLabels,
      knownNowSummary: scoutIntel.knownNowSummary,
      uncertaintySummary: scoutIntel.uncertaintySummary,
      nextScanSummary: scoutIntel.nextScanSummary,
      capIntelLabel: scoutIntel.capLabel,
      capIntelDetails: scoutIntel.capDetails,
      scoutActionLabel: getScoutActionLabel(candidate, scoutAssessment.nextStage),
      scoutCost: scoutAssessment.cost > 0 ? scoutAssessment.cost : undefined,
      canScout: scoutAssessment.canScout,
      scoutBlockedReason: scoutAssessment.reason
        ? formatScoutBlockedReason(scoutAssessment.reason)
        : undefined,
      expiringSoon: isExpiringSoon(expiryWeek, game.week),
      hiddenOverall: overall === undefined,
      preview,
    }
  })
}

export function findRecruitmentNoticeCandidate(
  views: readonly RecruitmentCandidateView[],
  candidateId: string | null,
  week: number
) {
  if (!candidateId) {
    return undefined
  }

  return views.find(
    ({ candidate }) =>
      candidate.id === candidateId &&
      candidate.expiryWeek >= week &&
      isCandidateHireable(candidate.hireStatus)
  )
}

export function getRecruitmentMetrics(game: GameState) {
  const attritionPressure = assessAttritionPressure(game)
  const recruitmentPool = getCandidatePool(game)
  const total = recruitmentPool.length
  const agents = recruitmentPool.filter(
    (candidate) => normalizeCandidateCategory(candidate.category) === 'agent'
  ).length
  const staff = recruitmentPool.filter(
    (candidate) => normalizeCandidateCategory(candidate.category) === 'staff'
  ).length
  const specialists = recruitmentPool.filter(
    (candidate) => normalizeCandidateCategory(candidate.category) === 'specialist'
  ).length
  const expiringSoon = recruitmentPool.filter(
    (candidate) => candidate.expiryWeek <= game.week + 1
  ).length

  return {
    total,
    agents,
    staff,
    specialists,
    expiringSoon,
    replacementPressure: attritionPressure.replacementPressure,
    staffingGap: attritionPressure.staffingGap,
    criticalRoleLossCount: attritionPressure.criticalRoleLossCount,
    temporaryUnavailableCount: attritionPressure.temporaryUnavailableCount,
    recruitmentPriorityBand: attritionPressure.recruitmentPriorityBand,
  }
}

export function getRecruitmentScoutingOverview(game: GameState): RecruitmentScoutingOverviewView {
  const support = evaluateRecruitmentScoutSupport(game.agents)
  const outstandingLeadCount = getCandidatePool(game).filter(
    (candidate) =>
      normalizeCandidateCategory(candidate.category) === 'agent' &&
      !isCandidateScoutConfirmed(candidate)
  ).length
  const recentOutcomes = game.events
    .filter(
      (event) =>
        event.type === 'recruitment.scouting_initiated' ||
        event.type === 'recruitment.scouting_refined' ||
        event.type === 'recruitment.intel_confirmed'
    )
    .slice(-3)
    .reverse()
    .map((event) => {
      const feed = buildEventFeedView(event)

      return {
        id: event.id,
        title: feed.title,
        detail: feed.detail,
        tone: feed.tone,
        href: feed.href,
      } satisfies RecruitmentScoutingHistoryView
    })

  return {
    outstandingLeadCount,
    supportScore: support.supportScore,
    operativeCount: support.operativeCount,
    fieldReconCount: support.fieldReconCount,
    supportSummary:
      support.fieldReconCount > 0
        ? `Field Recon leads current scouting support. ${support.fieldReconCount}/${support.operativeCount} scout-capable operative${support.operativeCount === 1 ? '' : 's'} are dedicated recon assets.`
        : support.investigatorCount + support.techCount > 0
          ? 'No dedicated Field Recon lead is available. Investigators and techs can still refine board estimates, but at lower depth.'
          : 'No live scouting support is available. Recruitment scans stay shallow until a scout-capable operative returns to reserve duty.',
    revealSummary:
      support.revealBoost > 0
        ? 'Current recon depth can deepen first-pass scans immediately.'
        : 'Current recon depth supports standard initial scans only; follow-up passes will still be needed for tighter reads.',
    costSummary:
      support.costDiscount > 0
        ? `Active scouting discount: up to $${support.costDiscount} per scan.`
        : 'No active scouting discount is currently available.',
    recentOutcomes,
  }
}

function buildCandidateOnboardingReadinessLabels(candidate: Candidate) {
  const decision = evaluateAffiliationOnboardingReadiness(candidate)

  return {
    stageLabel: `Stage: ${decision.stageLabel}`,
    accessLabel: decision.fullAccessEligible ? 'Full access eligible' : 'Full access pending',
    checkpointLabels: Object.freeze(
      decision.checkpointDecisions.map(
        (checkpoint) => `${checkpoint.checkpointLabel}: ${checkpoint.outcomeLabel}`
      )
    ),
  }
}

function projectRecruitmentQueryRecord(
  candidate: Candidate,
  includeSearchText: boolean
): PersonnelQueryRecord {
  return {
    id: candidate.id,
    name: candidate.name,
    // The evaluator requires roster fields. Recruitment never queries or facets on these values.
    role: 'hunter',
    status: 'active',
    teamId: undefined,
    fatigue: 'steady',
    training: 'available',
    searchText: includeSearchText
      ? [
          candidate.name,
          normalizeCandidateCategory(candidate.category),
          getCandidateRoleLabel(candidate),
          getCandidateSourceLabel(candidate),
          candidate.sourceSummary,
          candidate.evaluation.impression,
          candidate.evaluation.outlook,
          ...candidate.evaluation.rumorTags,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
      : '',
  }
}

function finiteNumber(value: number | undefined) {
  return Number.isFinite(value) ? value : undefined
}

function isExpiringSoon(expiryWeek: number | undefined, week: number) {
  return (finiteNumber(expiryWeek) ?? Infinity) <= week + 1
}

interface RecruitmentSortValues {
  overall: number | undefined
  expiryWeek: number | undefined
  weeklyWage: number | undefined
}

function compareRecruitmentSortValues(
  left: RecruitmentSortValues,
  right: RecruitmentSortValues,
  sort: Exclude<NonNullable<RecruitmentViewFilters['sort']>, 'name'>
) {
  if (sort === 'wage') return (left.weeklyWage ?? Infinity) - (right.weeklyWage ?? Infinity) || 0

  const expiry = (left.expiryWeek ?? Infinity) - (right.expiryWeek ?? Infinity)
  const overall = (right.overall ?? -Infinity) - (left.overall ?? -Infinity)
  return sort === 'overall' ? overall || expiry || 0 : expiry || overall || 0
}

function getCandidateRoleLabel(candidate: Candidate) {
  if (candidate.agentData) {
    return `${candidate.agentData.role} / ${candidate.agentData.specialization}`
  }

  if (candidate.staffData) {
    return `${normalizeCandidateCategory(candidate.category)} / ${normalizeStaffCandidateSpecialty(
      candidate.staffData.specialty
    )}`
  }

  return normalizeCandidateCategory(candidate.category)
}

function getCandidateSourceLabel(candidate: Candidate) {
  if (!candidate.sourceFactionName) {
    return undefined
  }

  return candidate.sourceContactName
    ? `${candidate.sourceFactionName} / ${candidate.sourceContactName}`
    : candidate.sourceFactionName
}

type VisibleCandidateStats = {
  combat: number
  investigation: number
  utility: number
  social: number
}

function normalizeCandidateScoutStats(
  candidate: Extract<Candidate, { category: 'agent' }>
): VisibleCandidateStats | null {
  const stats = candidate.agentData?.stats
  const visibleStats = candidate.agentData?.visibleStats

  if (!stats && !visibleStats) {
    return null
  }

  return {
    combat: visibleStats?.combat ?? stats?.combat ?? 50,
    investigation: visibleStats?.investigation ?? stats?.investigation ?? 50,
    utility: visibleStats?.utility ?? stats?.utility ?? 50,
    social: visibleStats?.social ?? stats?.social ?? 50,
  }
}

function buildProjectedCapRange(cap: number, stage: 1 | 2) {
  if (stage === 1) {
    if (cap >= 100) {
      return '80-100'
    }

    const min = Math.max(0, Math.floor(cap / 20) * 20)
    return `${min}-${Math.min(99, min + 19)}`
  }

  if (cap >= 100) {
    return '90-100'
  }

  const min = Math.max(0, Math.floor(cap / 10) * 10)
  return `${min}-${Math.min(99, min + 9)}`
}

function getCapStatOrder(stats: VisibleCandidateStats) {
  return CANDIDATE_STAT_KEYS.slice().sort((left, right) => {
    if (stats[right] !== stats[left]) {
      return stats[right] - stats[left]
    }

    return left.localeCompare(right)
  })
}

function formatCapStatLabel(stat: (typeof CANDIDATE_STAT_KEYS)[number]) {
  return stat[0]!.toUpperCase() + stat.slice(1)
}

function toStatBlock(stats: VisibleCandidateStats): StatBlock {
  return { ...stats }
}

function buildCandidateScoutIntel(candidate: Candidate) {
  if (normalizeCandidateCategory(candidate.category) !== 'agent' || !candidate.agentData) {
    return {
      depthLabel: 'Scouting unavailable',
      worthLabel: 'Scouting only applies to operative candidates.',
      confidenceLabel: 'Not applicable',
      knownNowSummary:
        'Role fit, wage, and source details are already visible without operative scouting.',
      uncertaintySummary: 'No operative ceiling intel applies to non-agent candidates.',
      nextScanSummary: 'No additional scouting pass is available for this candidate.',
      capLabel: 'Ceiling intel withheld',
      capDetails: ['Non-agent candidates do not use the operative scouting track.'],
    }
  }

  if (!candidate.scoutReport) {
    return {
      depthLabel: 'Unscouted',
      worthLabel: 'Initial scouting can open a projected tier read and broad ceiling bands.',
      confidenceLabel: 'No field read',
      knownNowSummary:
        'You currently have impression-level signals only; long-term tier fit and ceiling bands are still unopened.',
      uncertaintySummary:
        'Projected tier, confidence, and ceiling ranges remain hidden until an initial scout lands.',
      nextScanSummary:
        'Initial scouting reveals a projected tier, a confidence band, and broad ceiling ranges.',
      capLabel: 'Ceiling intel withheld',
      capDetails: ['Commission scouting to unlock projected ceiling bands.'],
    }
  }

  const stage = getCandidateScoutStage(candidate)
  const exactKnown = isCandidateScoutConfirmed(candidate)
  const tier = candidate.scoutReport.confirmedTier ?? candidate.scoutReport.projectedTier
  const baseStats = exactKnown
    ? (candidate.agentData.stats ?? normalizeCandidateScoutStats(candidate))
    : normalizeCandidateScoutStats(candidate)

  if (!baseStats) {
    return {
      depthLabel: exactKnown ? 'Confirmed intel' : stage === 2 ? 'Refined scout' : 'Initial scout',
      worthLabel: exactKnown
        ? 'Exact ceilings are locked in.'
        : stage === 2
          ? 'Deep scan can confirm exact ceilings.'
          : 'Follow-up scouting can tighten the current projection.',
      confidenceLabel: exactKnown
        ? 'Confirmed intel'
        : capitalize(formatScoutConfidence(candidate.scoutReport.confidence)),
      knownNowSummary: exactKnown
        ? `Tier ${tier ?? 'unknown'} is confirmed, but ceiling texture is still incomplete because the visible stat read stayed thin.`
        : stage === 2
          ? `Projected ${tier ?? 'unknown'} tier is holding after a refined scout pass.`
          : `Projected ${tier ?? 'unknown'} tier is visible from the initial scout pass.`,
      uncertaintySummary: exactKnown
        ? 'Exact ceilings are confirmed where visible, so no critical scouting uncertainty remains.'
        : stage === 2
          ? 'Exact ceilings still need a deep recon pass before they stop reading as projections.'
          : 'The current read is still broad and can move when a follow-up scout tightens the sample.',
      nextScanSummary: exactKnown
        ? 'Further scouting will not improve this operative read.'
        : stage === 2
          ? 'A deep recon scan can confirm exact ceilings and replace the remaining projected bands.'
          : 'A follow-up scout tightens the ceiling bands and stress-tests the current tier projection.',
      capLabel: exactKnown ? 'Confirmed ceiling intel' : 'Projected ceiling bands',
      capDetails: ['Scouting has not exposed enough visible stat texture to project ceilings yet.'],
    }
  }

  const growthProfile = candidate.agentData.growthProfile ?? 'balanced'
  const caps = buildAgentStatCaps(
    toStatBlock(baseStats),
    tier,
    growthProfile,
    undefined,
    candidate.evaluation.overallValue
  )
  const statOrder = getCapStatOrder(baseStats).slice(0, exactKnown ? 4 : 2)
  const capDetails = statOrder.map((stat) =>
    exactKnown
      ? `${formatCapStatLabel(stat)} ${caps[stat]}`
      : `${formatCapStatLabel(stat)} ${buildProjectedCapRange(caps[stat], stage === 2 ? 2 : 1)}`
  )

  return {
    depthLabel: exactKnown ? 'Confirmed intel' : stage === 2 ? 'Refined scout' : 'Initial scout',
    worthLabel: exactKnown
      ? 'Exact ceilings confirmed. Additional scouting is no longer needed.'
      : stage === 2
        ? 'Deep scan can confirm exact ceilings and replace the remaining projected bands.'
        : 'Follow-up scouting is worthwhile if you need tighter ceiling bands before hiring.',
    confidenceLabel: exactKnown
      ? 'Confirmed intel'
      : capitalize(formatScoutConfidence(candidate.scoutReport.confidence)),
    knownNowSummary: exactKnown
      ? `Tier ${tier ?? 'unknown'} is confirmed and exact ceiling values are now visible for the full operative profile.`
      : stage === 2
        ? `Projected ${tier ?? 'unknown'} tier is holding after a refined scout, and the top ceiling bands are now tighter.`
        : `Projected ${tier ?? 'unknown'} tier is visible, with broad ceiling bands on the top projected stats.`,
    uncertaintySummary: exactKnown
      ? 'No critical scouting uncertainty remains on this candidate.'
      : stage === 2
        ? 'Exact caps are still hidden, so the final top-end read can still sharpen on a deep scan.'
        : 'Exact caps remain hidden and the current projection can still shift on a follow-up pass.',
    nextScanSummary: exactKnown
      ? 'Further scouting will not improve this read.'
      : stage === 2
        ? 'A deep recon scan can confirm the exact ceiling read and lock the tier.'
        : 'A follow-up scout tightens the current ceiling bands before you spend the hire slot.',
    capLabel: exactKnown
      ? 'Confirmed ceiling intel'
      : stage === 2
        ? 'Projected ceiling bands'
        : 'Broad ceiling bands',
    capDetails,
  }
}

function formatScoutLabel(candidate: Candidate) {
  if (!candidate.scoutReport) {
    return normalizeCandidateCategory(candidate.category) === 'agent'
      ? 'Not commissioned'
      : 'Not applicable'
  }

  if (isCandidateScoutConfirmed(candidate)) {
    return `Confirmed ${candidate.scoutReport.confirmedTier ?? candidate.scoutReport.projectedTier}`
  }

  return `Projected ${candidate.scoutReport.projectedTier} (${formatScoutConfidence(
    candidate.scoutReport.confidence
  )})`
}

function getScoutActionLabel(candidate: Candidate, nextStage?: 1 | 2 | 3) {
  if (normalizeCandidateCategory(candidate.category) !== 'agent') {
    return 'Scout'
  }

  if (isCandidateScoutConfirmed(candidate)) {
    return 'Confirmed'
  }

  if (nextStage === 2) {
    return 'Follow-up scout'
  }

  if (nextStage === 3) {
    return 'Deep recon scan'
  }

  return 'Scout'
}

function formatScoutConfidence(confidence: 'low' | 'medium' | 'high' | 'confirmed') {
  if (confidence === 'confirmed') {
    return 'confirmed intel'
  }

  return confidence === 'high'
    ? 'high confidence'
    : confidence === 'medium'
      ? 'medium confidence'
      : 'low confidence'
}

function capitalize(value: string) {
  return value.length > 0 ? `${value[0]!.toUpperCase()}${value.slice(1)}` : value
}

function formatScoutBlockedReason(
  reason: NonNullable<ReturnType<typeof assessCandidateScouting>['reason']>
) {
  if (reason === 'intel_confirmed') {
    return 'intel confirmed'
  }

  if (reason === 'insufficient_funding') {
    return 'insufficient funding'
  }

  if (reason === 'candidate_unavailable') {
    return 'candidate unavailable'
  }

  if (reason === 'non_agent') {
    return 'agent scouting only'
  }

  return 'candidate missing'
}
