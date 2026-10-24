import { getFrontDeskAuthoredState } from '../../domain/frontDeskAuthored'
import { APP_ROUTES } from '../../app/routes'
import {
  buildShellStatusBarView,
  type ShellStatusSignalView,
} from '../../components/layout/shellStatusBarView'
import { buildAgencySummary } from '../../domain/agency'
import { assessAttritionPressure } from '../../domain/agent/attrition'
import { buildCourierNetworkCapacityGapReport } from '../../domain/capabilityGap'
import type { CapabilityGapReport } from '../../domain/capabilityGap'
import type { AuthoredChoiceDefinition } from '../../domain/choiceSystem'
import { buildFactionStates } from '../../domain/factions'
import {
  assessFundingPressure,
  getCanonicalFundingState,
  getProcurementBacklog,
} from '../../domain/funding'
import { buildCampaignRulesSummary } from '../../domain/campaignLedger'
import { generateHubState } from '../../domain/hub/hubState'
import { EXPEDITION_RECOVERY_MODE_LABELS } from '../../data/expeditionRecoveryCopy'
import type { GameState } from '../../domain/models'
import { getProcurementListings } from '../../domain/market'
import { buildDeployedRecoveryLegibilityForCase } from '../../domain/sim/expeditionRecoveryNode'
import { getTeamMemberIds } from '../../domain/teamSimulation'
import {
  getDashboardMetrics,
  getFieldStatusViews,
  getGlobalStateMetrics,
  getLatestReportSummary,
} from '../dashboard/dashboardView'
import { buildEventFeedView } from '../dashboard/eventFeedView'
import {
  getOperationsReportView,
  type OperationsReportView,
  type WeakestLinkOutcomeReportItemView,
} from '../report/operationsReportView'
import { getPublicDisclosureCampaignView } from './publicDisclosureCampaignView'
import { projectPublicDisclosureTrustOutcomeFromGame } from '../../domain/publicDisclosureTrustOutcomeProjection'
import { projectPublicDisclosureSegmentedTrustOutcomeFromGame } from '../../domain/publicDisclosureSegmentedTrustOutcomeProjection'
import { projectConcealmentPendingActivationAttention } from '../../domain/concealmentPendingActivationAttention'
import { projectInfiltrationPendingEncounterAttention } from '../../domain/infiltrationPendingEncounterAttention'
import { projectStrategicActionBudget } from '../../domain/strategicActionBudgetProjection'

export type FrontDeskNoticeTone = 'info' | 'warning' | 'danger' | 'success'
export type FrontDeskNoticeActionTarget =
  'report' | 'cases' | 'recruitment' | 'factions' | 'disclosure'

const MAX_QUEUE_DETAILS = 3
const MAX_RECENT_ITEMS = 3
const MAX_ATTENTION_ITEMS = 4
const MAX_TEAM_STATUS = 4
const MAX_PRESSURE_DETAILS = 4

export interface FrontDeskNoticeView {
  id: string
  title: string
  body: string
  tone: FrontDeskNoticeTone
  actionTarget?: FrontDeskNoticeActionTarget
  actionLabel?: string
  choices?: AuthoredChoiceDefinition[]
}

export interface FrontDeskBriefingView {
  directorMessage: string
  notices: FrontDeskNoticeView[]
  debug: {
    directorMessageRouteId?: string
    noticeRouteIds: string[]
    choiceIds: string[]
  }
}

export interface FrontDeskQuickLinkView {
  label: string
  href: string
  description: string
}

export interface FrontDeskStatCardView {
  label: string
  value: string
  href: string
  tone: FrontDeskNoticeTone | 'neutral'
}

export interface FrontDeskQueueCardView {
  id: 'recon' | 'training' | 'procurement' | 'blockers'
  title: string
  summary: string
  countLabel: string
  href: string
  actionLabel: string
  tone: FrontDeskNoticeTone | 'neutral'
  details: string[]
}

export interface FrontDeskRecentItemView {
  id: string
  title: string
  detail: string
  meta: string
  tone: FrontDeskNoticeTone
  href?: string
}

export interface FrontDeskAttentionItemView {
  id: string
  title: string
  summary: string
  tone: FrontDeskNoticeTone
  href?: string
}

export interface FrontDeskTeamStatusView {
  teamId: string
  teamName: string
  href: string
  statusLabel: string
  summary: string
  members: string[]
  tags: string[]
  assignedCaseHref?: string
  /** SPE-99: deployed recovery-mode legibility for in-progress field deployments. */
  recoverySummary?: string
}

export interface FrontDeskProcurementSnapshotView {
  summary: string
  details: string[]
  primaryHref: string
  secondaryHref: string
}

export interface FrontDeskStandingSummaryView {
  summary: string
  details: string[]
  links: FrontDeskQuickLinkView[]
}

export interface FrontDeskLatestReportView {
  week: number
  href: string
  score: number
  summary: string
  detail: string
}

/** SPE-31a: player-facing projection of the SPE-823a courier network capacity gap (presentation only). */
export interface FrontDeskCourierCapacityOpportunityView {
  id: 'courier-network-capacity-gap'
  title: string
  summary: string
  capacityLine: string
  gapKindLabel: string
  tone: FrontDeskNoticeTone
  mitigationLabels: string[]
  primaryHref: string
  primaryLinkLabel: string
  secondaryHref: string
  secondaryLinkLabel: string
  guidanceNote: string
}

/** SPE-31: deterministic hub opportunity derived from canonical procurement pressure only. */
export interface FrontDeskProcurementPressureOpportunityView {
  id: 'procurement-pressure'
  title: string
  summary: string
  severityLabel: string
  tone: FrontDeskNoticeTone
  details: string[]
  primaryHref: string
  primaryLinkLabel: string
  secondaryHref?: string
  secondaryLinkLabel?: string
}

/** SPE-31: deterministic hub opportunity derived from existing staffing/readiness pressure only. */
export interface FrontDeskStaffingReadinessOpportunityView {
  id: 'staffing-readiness-pressure'
  title: string
  summary: string
  tone: FrontDeskNoticeTone
  details: string[]
  href: string
  linkLabel: string
  secondaryHref?: string
  secondaryLinkLabel?: string
}

/** SPE-31: deterministic hub opportunity lead from existing hub simulation state. */
export interface FrontDeskHubOpportunityLeadView {
  id: string
  title: string
  summary: string
  tone: FrontDeskNoticeTone
  factionId: string
  confidenceLabel: string
  statusLabel?: string
  statusDetail?: string
  misleading: boolean
  details: string[]
  primaryHref: string
  primaryLinkLabel: string
  secondaryHref: string
  secondaryLinkLabel: string
}

/** SPE-31: deterministic hub rumor lead from existing hub simulation state. */
export interface FrontDeskHubRumorLeadView {
  id: string
  title: string
  summary: string
  tone: FrontDeskNoticeTone
  confidenceLabel: string
  misleading: boolean
  filtered: boolean
  details: string[]
  primaryHref: string
  primaryLinkLabel: string
  secondaryHref: string
  secondaryLinkLabel: string
}

/** SPE-31: deterministic hub opportunity derived from strategic-turn support/action capacity. */
export interface FrontDeskStrategicActionBudgetOpportunityView {
  id: 'strategic-action-budget'
  title: string
  summary: string
  pressureLaneLabel: string
  budgetLine: string
  severityLabel: string
  tone: FrontDeskNoticeTone
  details: string[]
  primaryHref: string
  primaryLinkLabel: string
  secondaryHref: string
  secondaryLinkLabel: string
}

/** SPE-31: deterministic hub opportunity derived from existing case region tags and value-stream hints. */
export interface FrontDeskTagConflictValueStreamOpportunityView {
  id: 'tag-conflict-value-stream'
  title: string
  summary: string
  tone: FrontDeskNoticeTone
  conflictLabel: string
  valueStreamLabel: string
  details: string[]
  primaryHref: string
  primaryLinkLabel: string
  secondaryHref: string
  secondaryLinkLabel: string
}

/** SPE-1734: Bounded player-facing readout of the canonical campaign ledger. */
export interface FrontDeskCampaignRulesSummaryView {
  title: string
  headline: string
  lines: readonly string[]
  compatibilitySummary: string
  activeModuleLabels: readonly string[]
}

export interface FrontDeskHubView {
  weekLabel: string
  cycleLabel: string
  campaignSummary: string
  campaignDetailLines: string[]
  quickLinks: FrontDeskQuickLinkView[]
  statCards: FrontDeskStatCardView[]
  briefing: FrontDeskBriefingView
  activePressureSummary: string
  dominantPressureLabel: string
  activePressureDetails: string[]
  signals: ShellStatusSignalView[]
  queueCards: FrontDeskQueueCardView[]
  recentItems: FrontDeskRecentItemView[]
  recentOutcomes: WeakestLinkOutcomeReportItemView[]
  attentionItems: FrontDeskAttentionItemView[]
  teamStatus: FrontDeskTeamStatusView[]
  procurementSnapshot: FrontDeskProcurementSnapshotView
  standingSummary: FrontDeskStandingSummaryView
  latestReport: FrontDeskLatestReportView | null
  courierCapacityOpportunity: FrontDeskCourierCapacityOpportunityView | null
  procurementPressureOpportunity: FrontDeskProcurementPressureOpportunityView | null
  staffingReadinessOpportunity: FrontDeskStaffingReadinessOpportunityView | null
  strategicActionBudgetOpportunity: FrontDeskStrategicActionBudgetOpportunityView | null
  tagConflictValueStreamOpportunity: FrontDeskTagConflictValueStreamOpportunityView | null
  hubOpportunityLead: FrontDeskHubOpportunityLeadView | null
  hubRumorLead: FrontDeskHubRumorLeadView | null
  campaignRulesSummary: FrontDeskCampaignRulesSummaryView
}

const DIRECTOR_MESSAGES: Record<string, string> = {
  'hostile-faction-pressure':
    'Hostile external actors are actively probing this cycle. Keep counter-intel posture tight and avoid avoidable escalation.',
  'breach-posture-escalated':
    'Breach follow-up posture is escalating. Prioritize teams with stable recovery profiles and preserve surge capacity.',
  'critical-pressure':
    'Threat posture is elevated across active incidents. Prioritize rapid containment and keep reserve teams flexible.',
  'clean-resolution-week':
    'Containment tempo is holding. Maintain momentum, but do not overextend fatigued units.',
  'recent-failure-week':
    'Recent failures shifted confidence. Tighten assignment discipline and stabilize high-stage operations before expansion.',
  'routine-even-week':
    'Routine systems are stable this cycle. Keep recon, training, and fabrication queues synchronized.',
  'routine-odd-week':
    'Signals are mixed this week. Keep eyes on deadline risk and preserve mission-ready reserves.',
}

/** Project canonical authored selections into operations notice copy and navigation. */
export function getFrontDeskBriefingView(game: GameState): FrontDeskBriefingView {
  const authored = getFrontDeskAuthoredState(game)
  const { hostileFaction, specialRecruit } = authored
  const notices = authored.notices.map((notice): FrontDeskNoticeView => {
    const pending = authored.pendingDisclosure.find(
      (item) => notice.id === `disclosure-posture-${item.recordId}`
    )
    let presentation: Omit<FrontDeskNoticeView, 'id' | 'choices'>
    switch (notice.presentationKey) {
      case 'weekly-report-tutorial':
        presentation = {
          title: 'Weekly report orientation',
          body: 'The weekly report is your canonical after-action ledger. Review it first, then set assignments and supply priorities from the same picture.',
          tone: 'info',
          actionTarget: 'report',
          actionLabel: 'Open report',
        }
        break
      case 'weekly-report-consumed':
        presentation = {
          title: 'Weekly report on quiet cadence',
          body: 'Tutorial prompts are now retired. Keep a steady report-review rhythm to catch drift before it compounds.',
          tone: 'info',
          actionTarget: 'report',
          actionLabel: 'Open report',
        }
        break
      case 'weekly-report-follow-up':
        presentation = {
          title: 'Weekly report ready',
          body: 'A queued front-desk follow-up is pending. Review the latest dossier first to anchor your response in current state changes.',
          tone: 'info',
          actionTarget: 'report',
          actionLabel: 'Review dossier',
        }
        break
      case 'weekly-report-returning':
        presentation = {
          title: 'Weekly report ready',
          body: "The latest dossier is ready for review. Check it before you commit teams so you can react to last week's fatigue, fallout, and unlocked follow-ups.",
          tone: 'info',
          actionTarget: 'report',
          actionLabel: 'Review dossier',
        }
        break
      case 'weekly-report-fallback':
        presentation = {
          title: 'Weekly report ready',
          body: 'The latest dossier is ready for review.',
          tone: 'info',
        }
        break
      case 'breach-follow-up-queued':
        presentation = {
          title: 'Breach follow-up queued for command review',
          body: 'A command-selected breach brief is queued. Review cases and execute before threat momentum shifts again.',
          tone: 'warning',
          actionTarget: 'cases',
          actionLabel: 'Review queued follow-up',
        }
        break
      case 'breach-follow-up-cautious':
        presentation = {
          title: 'Cautious breach posture logged',
          body: 'The follow-up plan is now weighted toward containment discipline, recovery tempo, and reducing avoidable exposure.',
          tone: 'warning',
          actionTarget: 'cases',
          actionLabel: 'Review cases',
        }
        break
      case 'breach-follow-up-aggressive':
        presentation = {
          title: 'Aggressive breach posture logged',
          body: 'A high-tempo response has been authorized. Expect faster movement, sharper exposure risk, and tighter recovery margins.',
          tone: 'danger',
          actionTarget: 'cases',
          actionLabel: 'Review cases',
        }
        break
      case 'breach-follow-up-open':
        presentation = {
          title: 'Containment breach follow-up available',
          body: 'A follow-up operation is now authorized. Review open cases before the lead cools and the breach window closes.',
          tone: 'warning',
          actionTarget: 'cases',
          actionLabel: 'Inspect cases',
        }
        break
      case 'hostile-faction-response':
        presentation = {
          title: `${hostileFaction!.label} response posture set`,
          body: 'Counter-intelligence posture is active. Keep watch for retaliation pressure, infiltration signals, and supply-line friction.',
          tone: 'warning',
          actionTarget: 'factions',
          actionLabel: 'Review standing',
        }
        break
      case 'hostile-faction-alert':
        presentation = {
          title: `${hostileFaction!.label} pressure rising`,
          body: hostileFaction!.feedback,
          tone: 'warning',
          actionTarget: 'factions',
          actionLabel: 'Review standing',
        }
        break
      case 'special-recruit-opportunity':
        presentation = {
          title: `Special recruit opportunity: ${specialRecruit!.name}`,
          body:
            specialRecruit!.sourceSummary ??
            `${specialRecruit!.name} arrived through a trusted outside channel and may not stay in the pool for long.`,
          tone: 'success',
          actionTarget: 'recruitment',
          actionLabel: 'Open recruitment',
        }
        break
      case 'disclosure-posture':
        presentation = {
          title: 'Disclosure posture decision required',
          body: `${pending!.label} is active but has no command posture on file. Set messaging posture from the desk or open the campaign briefing for regional band context.`,
          tone: 'warning',
          actionTarget: 'disclosure',
          actionLabel: 'Open campaign briefing',
        }
        break
      default:
        throw new Error(`Unknown front-desk authored presentation: ${notice.presentationKey}`)
    }
    return {
      id: notice.id,
      ...presentation,
      ...(notice.choices ? { choices: notice.choices } : {}),
    }
  })
  return {
    directorMessage: DIRECTOR_MESSAGES[authored.directorRouteId] ?? '',
    notices,
    debug: authored.debug,
  }
}

export function getFrontDeskNoticeActionHref(target?: FrontDeskNoticeActionTarget) {
  if (target === 'cases') {
    return APP_ROUTES.cases
  }

  if (target === 'recruitment') {
    return APP_ROUTES.recruitment
  }

  if (target === 'factions') {
    return APP_ROUTES.factions
  }

  if (target === 'disclosure') {
    return APP_ROUTES.publicDisclosureCampaign
  }

  return APP_ROUTES.report
}

function uniqueBounded(values: string[], limit: number) {
  return [...new Set(values.filter((value) => value.trim().length > 0))].slice(0, limit)
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function capitalize(value: string) {
  return value.length > 0 ? `${value[0]!.toUpperCase()}${value.slice(1)}` : value
}

function mapShellSignalTone(tone: ShellStatusSignalView['tone']): FrontDeskNoticeTone {
  if (tone === 'danger') {
    return 'danger'
  }

  if (tone === 'warning') {
    return 'warning'
  }

  return 'info'
}

function mapEventTone(tone: ReturnType<typeof buildEventFeedView>['tone']): FrontDeskNoticeTone {
  if (tone === 'danger') {
    return 'danger'
  }

  if (tone === 'warning') {
    return 'warning'
  }

  if (tone === 'success') {
    return 'success'
  }

  return 'info'
}

function getAttentionPriority(tone: FrontDeskNoticeTone) {
  if (tone === 'danger') {
    return 3
  }

  if (tone === 'warning') {
    return 2
  }

  if (tone === 'success') {
    return 1
  }

  return 0
}

function buildQuickLinks(game: GameState): FrontDeskQuickLinkView[] {
  const shell = buildShellStatusBarView(game)
  const disclosureCampaign = getPublicDisclosureCampaignView(game)

  const links: FrontDeskQuickLinkView[] = [
    {
      label: 'Open contracts',
      href: APP_ROUTES.contracts,
      description: 'Review active mission pressure and contract routing.',
    },
    {
      label: 'Open readiness',
      href: APP_ROUTES.teams,
      description: 'Inspect team readiness, coverage, and deployment posture.',
    },
    {
      label: 'Open intel',
      href: APP_ROUTES.intel,
      description: 'Check current intel posture and template pressure.',
    },
    {
      label: 'Open staffing',
      href: APP_ROUTES.recruitment,
      description: 'Respond to replacement pressure and candidate flow.',
    },
    {
      label: 'Open procurement',
      href: APP_ROUTES.marketsSuppliers,
      description: 'Open supplier channels and budget pressure surfaces.',
    },
    {
      label: 'Weekly reports',
      href: shell.weeklyReportHref,
      description: 'Open the current or latest weekly report.',
    },
  ]

  if (!disclosureCampaign.isEmpty) {
    links.push({
      label: 'Open disclosure campaign briefing',
      href: APP_ROUTES.publicDisclosureCampaign,
      description: 'Review post-secrecy awareness posture and regional public-trust bands.',
    })
  }

  links.push(
    {
      label: 'Open series intake mirror',
      href: APP_ROUTES.patternSourceSeries,
      description: 'Review pattern source series queue rank and processing posture.',
    },
    {
      label: 'Open publish queue mirror',
      href: APP_ROUTES.publishQueue,
      description: 'Review publish-queue records and persisted execution receipts.',
    },
    {
      label: 'Open department workshop mirror',
      href: APP_ROUTES.departmentWorkshop,
      description:
        'Inspect workshop slots, queued work, blockers, and completion quality or safety consequences.',
    },
    {
      label: 'Open modifiable data-pack mirror',
      href: APP_ROUTES.modifiableDataPacks,
      description: 'Review persisted modifiable data-pack records and import validation posture.',
    },
    {
      label: 'Open self-censoring information mirror',
      href: APP_ROUTES.selfCensoringInformation,
      description: 'Review retention timers, rediscovery loops, and negative-fact posture.',
    },
    {
      label: 'Open public disclosure mirror',
      href: APP_ROUTES.publicDisclosureState,
      description: 'Review awareness levels, fallout phases, and regional trust projections.',
    },
    {
      label: 'Open truth-layer mirror',
      href: APP_ROUTES.truthLayerRecords,
      description:
        'Review separate claim, doctrine, and verification layers plus myth infrastructure ops flags.',
    },
    {
      label: 'Open cover-story mirror',
      href: APP_ROUTES.coverStoryRecords,
      description:
        'Review cover-story lifecycle phases, contradiction pressure, and weekly projection snapshots.',
    },
    {
      label: 'Open population emergence mirror',
      href: APP_ROUTES.massAnomalousPopulationEmergence,
      description: 'Review registration backlog, triage lanes, and governance-surge projections.',
    },
    {
      label: 'Open visual trigger hazard mirror',
      href: APP_ROUTES.visualTriggerHazard,
      description:
        'Review disposal compliance, exposure-chain risk, and awareness escalation projections.',
    },
    {
      label: 'Open hazardous content propagation mirror',
      href: APP_ROUTES.hazardousContentPropagation,
      description:
        'Review persisted SPE-947 platforms, counter-memetic plans, content owners, and post-case media cases.',
    },
    {
      label: 'Open propagation graph mirror',
      href: APP_ROUTES.propagationGraph,
      description:
        'Review persisted SPE-956 propagation graph structure, nodes, edges, and week-close orchestration fields.',
    },
    {
      label: 'Open participatory channel mirror',
      href: APP_ROUTES.participatoryChannels,
      description:
        'Review persisted SPE-956 survivor registries, memory channels, hotlines, async surfaces, and advisory bodies.',
    },
    {
      label: 'Open entity welfare reclassification mirror',
      href: APP_ROUTES.entityWelfareReclassification,
      description:
        'Review disposition review posture, reclassification pressure forecasts, and pending vs terminal states.',
    },
    {
      label: 'Open affiliation person-status mirror',
      href: APP_ROUTES.affiliationPersonStatus,
      description:
        'Review durable person-status evidence, status permissions, and composed clearance outcomes.',
    },
    {
      label: 'Open contained person therapeutic care mirror',
      href: APP_ROUTES.containedPersonTherapeuticCare,
      description:
        'Review care cadence, channel posture, missed-session streaks, and compliance risk projections.',
    },
    {
      label: 'Open coercive contained-person protocol mirror',
      href: APP_ROUTES.coerciveContainedPersonProtocol,
      description:
        'Review handling modes, containment-care tradeoffs, coercion-risk flags, and owner refs.',
    },
    {
      label: 'Open psychological resilience mirror',
      href: APP_ROUTES.psychologicalResilience,
      description:
        'Review depletion bands, exposure posture, treatment gating, and duty-reliability projections.',
    },
    {
      label: 'Open surveillance intervention tuning mirror',
      href: APP_ROUTES.surveillanceInterventionTuning,
      description:
        'Review intervention levels, surveillance/contact signal separation, horizon outcomes, and collateral-strain projections.',
    },
    {
      label: 'Open naming-hazard descriptor mirror',
      href: APP_ROUTES.namingHazardDescriptor,
      description:
        'Review substitution policy, confidence erosion markers, and intake cross-link labels.',
    },
    {
      label: 'Open contained person integrated health bundle mirror',
      href: APP_ROUTES.containedPersonIntegratedHealthBundle,
      description:
        'Review mental-state bands, humane-care risk, and wired therapeutic care schedule links.',
    },
    {
      label: 'Open welfare debt accounting mirror',
      href: APP_ROUTES.welfareDebtAccounting,
      description:
        'Review coercive-procedure welfare debt severity, mitigation state, and containment benefit projections.',
    },
    {
      label: 'Open rule document compliance mirror',
      href: APP_ROUTES.ruleDocumentCompliance,
      description:
        'Review written-conduct binding posture, compliance decay bands, and revision audit symptoms.',
    },
    {
      label: 'Open recurrent catastrophe amelioration mirror',
      href: APP_ROUTES.recurrentCatastropheAmelioration,
      description:
        'Review recurrence cadence, prevention ceilings, amelioration posture, and next-recurrence risk projections.',
    },
    {
      label: 'Open post-incident review mirror',
      href: APP_ROUTES.postIncidentReview,
      description:
        'Review retrospective routes, closure outcomes, milestone spans, procedure adherence, and recurrence flags.',
    },
    {
      label: 'Open post-incident recommendation mirror',
      href: APP_ROUTES.postIncidentReviewRecommendations,
      description:
        'Review follow-on recommendation stubs linked to orchestration-created post-incident reviews.',
    },
    {
      label: 'Open post-incident recommendation action mirror',
      href: APP_ROUTES.postIncidentReviewRecommendationActions,
      description:
        'Review follow-on action stubs linked to persisted recommendation and qualifying review records.',
    }
  )

  return links
}

function buildStatCards(game: GameState): FrontDeskStatCardView[] {
  const metrics = getDashboardMetrics(game)

  return [
    {
      label: 'Pending Operations',
      value: String(metrics.open),
      href: APP_ROUTES.cases,
      tone: metrics.open > 0 ? 'warning' : 'neutral',
    },
    {
      label: 'Active Deployments',
      value: String(metrics.inProgress),
      href: APP_ROUTES.teams,
      tone: metrics.inProgress > 0 ? 'info' : 'neutral',
    },
    {
      label: 'Team Fatigue / Avg Fatigue',
      value: String(metrics.avgFatigue),
      href: APP_ROUTES.teams,
      tone: metrics.avgFatigue >= 30 ? 'warning' : 'neutral',
    },
    {
      label: 'Highest Stage',
      value: String(metrics.maxStage),
      href: APP_ROUTES.cases,
      tone: metrics.maxStage >= 4 ? 'danger' : metrics.maxStage >= 3 ? 'warning' : 'neutral',
    },
  ]
}

function buildQueueCards(
  game: GameState,
  briefing: FrontDeskBriefingView
): FrontDeskQueueCardView[] {
  const fundingPressure = assessFundingPressure(game)
  const fundingState = getCanonicalFundingState(game)
  const attritionPressure = assessAttritionPressure(game)
  const operationsReport = getOperationsReportView(game)

  const reconLeads = game.candidates
    .filter((candidate) => candidate.scoutReport && !candidate.scoutReport.exactKnown)
    .slice(0, MAX_QUEUE_DETAILS)

  const blockedReadinessCount = operationsReport.deploymentReadiness.filter(
    (entry) => entry.hardBlockers.length > 0
  ).length
  const blockedMissionCount = operationsReport.missionRouting.filter(
    (entry) => entry.routingStateLabel === 'Blocked' || entry.routingStateLabel === 'Deferred'
  ).length
  const pendingBacklog = fundingState.procurementBacklog.filter(
    (entry) => entry.status === 'pending'
  )

  return [
    {
      id: 'recon',
      title: 'Recon / scouting',
      summary:
        reconLeads.length === 0
          ? 'No active scouting leads need follow-through this week.'
          : `${pluralize(reconLeads.length, 'candidate lead')} still need scouting follow-through.`,
      countLabel: reconLeads.length === 0 ? 'Queue clear' : pluralize(reconLeads.length, 'lead'),
      href: APP_ROUTES.recruitment,
      actionLabel: 'Open recruitment',
      tone: reconLeads.length > 0 ? 'info' : 'neutral',
      details:
        reconLeads.length > 0
          ? reconLeads.map((candidate) => {
              const stage = candidate.scoutReport?.stage ?? 1
              const tier =
                candidate.scoutReport?.confirmedTier ??
                candidate.scoutReport?.projectedTier ??
                'unknown'
              const confidence = candidate.scoutReport?.confidence
                ? candidate.scoutReport.confidence === 'confirmed'
                  ? 'confirmed intel'
                  : `${candidate.scoutReport.confidence} confidence`
                : 'confidence unknown'

              return stage >= 2
                ? `${candidate.name}: refined ${tier} / ${confidence} / deep recon confirms exact caps.`
                : `${candidate.name}: projected ${tier} / ${confidence} / follow-up scouting tightens ceiling bands.`
            })
          : ['No unresolved scouting assignments are queued.'],
    },
    {
      id: 'training',
      title: 'Training queue',
      summary:
        game.trainingQueue.length === 0
          ? 'No training programs are running right now.'
          : `${pluralize(game.trainingQueue.length, 'program')} in the academy queue.`,
      countLabel:
        game.trainingQueue.length === 0
          ? 'Idle'
          : pluralize(game.trainingQueue.length, 'entry', 'entries'),
      href: APP_ROUTES.trainingDivision,
      actionLabel: 'Open academy',
      tone: game.trainingQueue.length > 0 ? 'info' : 'neutral',
      details:
        game.trainingQueue.length > 0
          ? game.trainingQueue
              .slice(0, MAX_QUEUE_DETAILS)
              .map(
                (entry) => `${entry.agentName}: ${entry.trainingName} / ${entry.remainingWeeks}w`
              )
          : ['No academy queue entries are active.'],
    },
    {
      id: 'procurement',
      title: 'Procurement / fabrication',
      summary:
        pendingBacklog.length === 0 && game.productionQueue.length === 0
          ? 'Supplier channels and fabrication are both clear.'
          : `${pluralize(pendingBacklog.length, 'supplier request')} pending, ${pluralize(
              game.productionQueue.length,
              'fabrication order'
            )} active.`,
      countLabel:
        fundingPressure.staleProcurementRequestIds.length > 0
          ? 'Escalated'
          : pendingBacklog.length > 0 || game.productionQueue.length > 0
            ? 'Queued'
            : 'Stable',
      href: APP_ROUTES.marketsSuppliers,
      actionLabel: 'Open procurement',
      tone:
        fundingPressure.staleProcurementRequestIds.length > 0
          ? 'danger'
          : pendingBacklog.length > 0 || game.productionQueue.length > 0
            ? 'warning'
            : 'neutral',
      details: uniqueBounded(
        [
          ...pendingBacklog
            .slice(0, 2)
            .map(
              (entry) =>
                `${entry.itemId}: supplier handoff pending from week ${entry.requestedWeek}`
            ),
          ...game.productionQueue
            .slice(0, 2)
            .map(
              (entry) =>
                `${entry.outputItemName}: fabrication completes in ${entry.remainingWeeks}w`
            ),
          fundingPressure.staleProcurementRequestIds.length > 0
            ? `${pluralize(
                fundingPressure.staleProcurementRequestIds.length,
                'request'
              )} in the backlog are stale.`
            : '',
        ],
        MAX_QUEUE_DETAILS
      ),
    },
    {
      id: 'blockers',
      title: 'Staffing / readiness blockers',
      summary:
        attritionPressure.staffingGap === 0 &&
        blockedReadinessCount === 0 &&
        blockedMissionCount === 0 &&
        briefing.notices.length === 0
          ? 'No active staffing or readiness blockers need intervention.'
          : `${pluralize(attritionPressure.staffingGap, 'staffing gap')}, ${pluralize(
              blockedReadinessCount,
              'blocked team pairing'
            )}, ${pluralize(blockedMissionCount, 'mission routing issue')}.`,
      countLabel:
        attritionPressure.severeConstraint || blockedReadinessCount > 0 || blockedMissionCount > 0
          ? 'Needs action'
          : 'Monitoring',
      href: APP_ROUTES.teams,
      actionLabel: 'Open readiness',
      tone:
        attritionPressure.severeConstraint || blockedReadinessCount > 0 || blockedMissionCount > 0
          ? 'danger'
          : attritionPressure.constrained || briefing.notices.length > 0
            ? 'warning'
            : 'neutral',
      details: uniqueBounded(
        [
          attritionPressure.staffingGap > 0
            ? `${pluralize(attritionPressure.staffingGap, 'operative')} need replacement coverage.`
            : '',
          blockedReadinessCount > 0
            ? `${pluralize(blockedReadinessCount, 'team pairing')} are hard blocked for deployment.`
            : '',
          blockedMissionCount > 0
            ? `${pluralize(blockedMissionCount, 'mission')} are blocked or deferred in routing.`
            : '',
          briefing.notices[0]?.title ?? '',
        ],
        MAX_QUEUE_DETAILS
      ),
    },
  ]
}

function buildRecentItems(game: GameState): FrontDeskRecentItemView[] {
  return game.events
    .slice()
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .map((event) => buildEventFeedView(event))
    .slice(0, MAX_RECENT_ITEMS)
    .map((view) => ({
      id: view.event.id,
      title: view.title,
      detail: view.detail,
      meta: `${view.typeLabel} / ${view.sourceLabel}`,
      tone: mapEventTone(view.tone),
      ...(view.href ? { href: view.href } : {}),
    }))
}

function buildAttentionItems(
  game: GameState,
  briefing: FrontDeskBriefingView
): FrontDeskAttentionItemView[] {
  const shell = buildShellStatusBarView(game)
  const operationsReport = getOperationsReportView(game)

  const noticeItems = briefing.notices.map((notice) => ({
    id: `notice:${notice.id}`,
    title: notice.title,
    summary: notice.body,
    tone: notice.tone,
    ...(notice.actionTarget ? { href: getFrontDeskNoticeActionHref(notice.actionTarget) } : {}),
  }))

  const debriefAttention =
    operationsReport.contractDebrief.attentionSummary &&
    operationsReport.contractDebrief.records.length > 0
      ? [
          {
            id: 'debrief:latest',
            title: 'Post-contract debrief',
            summary: operationsReport.contractDebrief.attentionSummary,
            tone: ((): FrontDeskNoticeTone => {
              const lead = operationsReport.contractDebrief.records[0]!
              if (lead.outcomeLabel === 'Fail' || lead.outcomeLabel === 'Unresolved') {
                return 'danger'
              }
              if (
                lead.outcomeLabel === 'Partial' ||
                lead.unresolvedClocks.length > 0 ||
                operationsReport.contractDebrief.selectedIntent === null
              ) {
                return 'warning'
              }
              return 'info'
            })(),
            href: APP_ROUTES.report,
          } as const,
        ]
      : []

  const signalItems = shell.signals
    .filter((signal) => signal.tone !== 'neutral')
    .map((signal) => ({
      id: `signal:${signal.id}`,
      title: `${signal.label}: ${signal.value}`,
      summary: signal.detail,
      tone: mapShellSignalTone(signal.tone),
      ...(signal.href ? { href: signal.href } : {}),
    }))

  const routingItems = operationsReport.missionRouting
    .filter(
      (entry) => entry.routingStateLabel === 'Blocked' || entry.routingStateLabel === 'Deferred'
    )
    .map((entry) => ({
      id: `routing:${entry.missionId}`,
      title: `${entry.routingStateLabel}: ${entry.missionTitle}`,
      summary: entry.summary,
      tone: entry.routingStateLabel === 'Blocked' ? ('danger' as const) : ('warning' as const),
      href: APP_ROUTES.caseDetail(entry.missionId),
    }))

  const readinessItems = operationsReport.deploymentReadiness
    .filter((entry) => entry.hardBlockers.length > 0)
    .map((entry) => ({
      id: `readiness:${entry.teamId}:${entry.missionId}`,
      title: `Readiness blocked: ${entry.teamName}`,
      summary: entry.summary,
      tone: 'danger' as const,
      href: APP_ROUTES.teamDetail(entry.teamId),
    }))

  const disclosureTrustOutcome = projectPublicDisclosureTrustOutcomeFromGame(game)
  const disclosureSegmentedTrust = projectPublicDisclosureSegmentedTrustOutcomeFromGame(game)
  const disclosureAttentionSummary = disclosureSegmentedTrust.frontDeskDivergenceSummary
    ? `${disclosureTrustOutcome.frontDeskAttentionSummary} ${disclosureSegmentedTrust.frontDeskDivergenceSummary}`
    : disclosureTrustOutcome.frontDeskAttentionSummary
  const disclosureAttentionTone =
    disclosureSegmentedTrust.frontDeskDivergenceTone ??
    disclosureTrustOutcome.frontDeskAttentionTone
  const disclosureAttention =
    disclosureTrustOutcome.activeCampaignCount > 0
      ? [
          {
            id: 'disclosure:campaign-briefing',
            title: 'Disclosure campaign posture requires review',
            summary: disclosureAttentionSummary,
            tone: disclosureAttentionTone,
            href: APP_ROUTES.publicDisclosureCampaign,
          } as const,
        ]
      : []

  const concealmentPendingActivation = projectConcealmentPendingActivationAttention(game)
  const concealmentAttention =
    concealmentPendingActivation.pendingCount > 0
      ? [
          {
            id: 'concealment:pending-activation',
            title:
              concealmentPendingActivation.pendingCount === 1
                ? 'Covert activation pending on next weekly tick'
                : `${concealmentPendingActivation.pendingCount} covert activations pending on next weekly tick`,
            summary: concealmentPendingActivation.frontDeskAttentionSummary,
            tone: concealmentPendingActivation.frontDeskAttentionTone,
            href:
              concealmentPendingActivation.frontDeskAttentionCaseId !== null
                ? APP_ROUTES.caseDetail(concealmentPendingActivation.frontDeskAttentionCaseId)
                : APP_ROUTES.cases,
          } as const,
        ]
      : []

  const infiltrationPendingEncounter = projectInfiltrationPendingEncounterAttention(game)
  const infiltrationAttention =
    infiltrationPendingEncounter.pendingCount > 0
      ? [
          {
            id: 'infiltration:pending-encounter',
            title:
              infiltrationPendingEncounter.pendingCount === 1
                ? 'Infiltration encounter pending on next weekly tick'
                : `${infiltrationPendingEncounter.pendingCount} infiltration encounters pending on next weekly tick`,
            summary: infiltrationPendingEncounter.frontDeskAttentionSummary,
            tone: infiltrationPendingEncounter.frontDeskAttentionTone,
            href:
              infiltrationPendingEncounter.frontDeskAttentionCaseId !== null
                ? APP_ROUTES.caseDetail(infiltrationPendingEncounter.frontDeskAttentionCaseId)
                : APP_ROUTES.cases,
          } as const,
        ]
      : []

  return [
    ...noticeItems,
    ...debriefAttention,
    ...disclosureAttention,
    ...concealmentAttention,
    ...infiltrationAttention,
    ...signalItems,
    ...routingItems,
    ...readinessItems,
  ]
    .sort((left, right) => {
      const priorityDelta = getAttentionPriority(right.tone) - getAttentionPriority(left.tone)

      if (priorityDelta !== 0) {
        return priorityDelta
      }

      return left.title.localeCompare(right.title)
    })
    .slice(0, MAX_ATTENTION_ITEMS)
}

function buildTeamStatusViews(game: GameState): FrontDeskTeamStatusView[] {
  return getFieldStatusViews(game)
    .slice(0, MAX_TEAM_STATUS)
    .map((entry) => {
      const recovery =
        entry.assignedCase?.status === 'in_progress'
          ? buildDeployedRecoveryLegibilityForCase(entry.assignedCase)
          : null
      const recoveryModeLabel = recovery?.deployedRecoveryMode
        ? EXPEDITION_RECOVERY_MODE_LABELS[recovery.deployedRecoveryMode]
        : ''

      return {
        teamId: entry.team.id,
        teamName: entry.team.name,
        href: APP_ROUTES.teamDetail(entry.team.id),
        statusLabel:
          entry.status === 'deploying'
            ? 'Deploying'
            : entry.status === 'recovering'
              ? 'Recovering'
              : entry.status === 'overstretched'
                ? 'Overstretched'
                : 'Ready',
        summary: entry.assignedCase
          ? `${entry.assignedCase.title} / ${entry.remainingWeeks ?? 0}w remaining / ${entry.progressPercent}% complete`
          : 'Awaiting tasking from the contract board.',
        members: getTeamMemberIds(entry.team)
          .map((agentId) => game.agents[agentId]?.name)
          .filter((name): name is string => Boolean(name))
          .slice(0, 4),
        tags: uniqueBounded(
          [
            recoveryModeLabel,
            entry.signals.deadlineRisk ? 'Deadline risk' : '',
            entry.signals.criticalStage ? 'Critical stage' : '',
            entry.signals.raidUnderstaffed ? 'Raid understaffed' : '',
          ],
          4
        ),
        ...(recovery?.recoveryLegibility ? { recoverySummary: recovery.recoveryLegibility } : {}),
        ...(entry.assignedCase
          ? { assignedCaseHref: APP_ROUTES.caseDetail(entry.assignedCase.id) }
          : {}),
      }
    })
}

function buildProcurementSnapshot(game: GameState): FrontDeskProcurementSnapshotView {
  const fundingPressure = assessFundingPressure(game)
  const fundingState = getCanonicalFundingState(game)
  const pendingBacklog = fundingState.procurementBacklog.filter(
    (entry) => entry.status === 'pending'
  )

  return {
    summary:
      pendingBacklog.length === 0 && game.productionQueue.length === 0
        ? `Budget pressure ${fundingPressure.budgetPressure}/4. Procurement lanes are currently clear.`
        : `Budget pressure ${fundingPressure.budgetPressure}/4 with ${pluralize(
            pendingBacklog.length,
            'pending supplier request'
          )} and ${pluralize(game.productionQueue.length, 'active fabrication order')}.`,
    details: uniqueBounded(
      [
        fundingPressure.staleProcurementRequestIds.length > 0
          ? `${pluralize(
              fundingPressure.staleProcurementRequestIds.length,
              'request'
            )} are stale and may block upgrades.`
          : '',
        pendingBacklog.length > 0
          ? `${pendingBacklog
              .slice(0, 2)
              .map((entry) => entry.itemId)
              .join(', ')} remain in supplier handoff.`
          : '',
        game.productionQueue.length > 0
          ? `${game.productionQueue[0]!.outputItemName} is the next fabrication completion.`
          : '',
        fundingPressure.severeConstraint
          ? 'Budget pressure is high enough to constrain facility progression.'
          : '',
      ],
      MAX_PRESSURE_DETAILS
    ),
    primaryHref: APP_ROUTES.marketsSuppliers,
    secondaryHref: APP_ROUTES.fabrication,
  }
}

function buildStandingSummary(game: GameState): FrontDeskStandingSummaryView {
  const agency = buildAgencySummary(game)
  const global = getGlobalStateMetrics(game)
  const factions = buildFactionStates(game)
  const hostileFaction = factions.find(
    (faction) => faction.stance === 'hostile' || faction.reputationTier === 'hostile'
  )
  const supportiveFaction = factions.find(
    (faction) =>
      faction.stance === 'supportive' ||
      faction.reputationTier === 'friendly' ||
      faction.reputationTier === 'allied'
  )
  const activeContacts = factions.reduce(
    (sum, faction) =>
      sum + faction.contacts.filter((contact) => contact.status === 'active').length,
    0
  )
  const hiddenEffects = factions.reduce((sum, faction) => sum + faction.hiddenModifierCount, 0)
  const supportiveModifier = supportiveFaction?.knownModifiers[0]?.label
  const hostileModifier = hostileFaction?.knownModifiers[0]?.label

  return {
    summary: `${agency.name} is operating at tier ${agency.ranking.tier} with rank ${agency.ranking.score} and reputation ${agency.reputation}.${hostileFaction ? ` ${hostileFaction.label} is the current hostile external actor.` : supportiveFaction ? ` ${supportiveFaction.label} is the cleanest cooperative channel.` : ' External faction posture is mixed.'}`,
    details: [
      `Containment ${agency.containmentRating} / Clearance ${agency.clearanceLevel} / Stability ${agency.stability.level}.`,
      `Pressure ${agency.pressure.level} (${agency.pressure.score}) / ${pluralize(
        agency.activeOperations.majorIncidents,
        'major incident'
      )} active.`,
      `Year ${global.year} / Week ${global.weekOfYear} / ${pluralize(
        agency.activeOperations.activeTeams,
        'active team'
      )}.`,
      supportiveFaction
        ? `Supportive contract channel: ${supportiveFaction.label} / ${capitalize(
            supportiveFaction.reputationTier
          )} / ${supportiveModifier ?? 'no confirmed modifier yet'}.`
        : 'No supportive faction channel is currently strong enough to shape contract choices.',
      hostileFaction
        ? `Hostile pressure: ${hostileFaction.label} / ${capitalize(
            hostileFaction.reputationTier
          )} / ${hostileModifier ?? hostileFaction.feedback}.`
        : `Faction posture: ${factions[0]?.label ?? 'No tracked actor'} / ${
            factions[0]?.stance ?? 'stable'
          } / ${pluralize(activeContacts, 'active contact channel')}.`,
      `${pluralize(hiddenEffects, 'hidden faction effect')} remain unresolved across tracked dossiers.`,
    ],
    links: [
      {
        label: 'View Agency',
        href: APP_ROUTES.agency,
        description: 'Open the agency posture screen.',
      },
      {
        label: 'View Factions',
        href: APP_ROUTES.factions,
        description: 'Review faction standing, contacts, and known effects.',
      },
      {
        label: 'View Rankings',
        href: APP_ROUTES.rankings,
        description: 'Review agency standing and ranking context.',
      },
      {
        label: 'Open Reports',
        href: APP_ROUTES.report,
        description: 'Open the weekly report archive.',
      },
    ],
  }
}

function buildLatestReportView(game: GameState): FrontDeskLatestReportView | null {
  const latest = getLatestReportSummary(game)

  if (!latest) {
    return null
  }

  const { report, score } = latest

  return {
    week: report.week,
    href: APP_ROUTES.reportDetail(report.week),
    score,
    summary: `${report.resolvedCases.length} resolved, ${report.unresolvedTriggers.length} unresolved ${
      report.unresolvedTriggers.length === 1 ? 'trigger' : 'triggers'
    }, ${report.spawnedCases.length} ${
      report.spawnedCases.length === 1 ? 'spawned case' : 'spawned cases'
    }`,
    detail: `Avg Fatigue ${report.avgFatigue} / Max Stage ${report.maxStage} / RNG Before ${report.rngStateBefore} -> ${report.rngStateAfter}`,
  }
}

export function buildCourierNetworkCapacityOpportunityCard(
  report: CapabilityGapReport
): FrontDeskCourierCapacityOpportunityView | null {
  if (!report.unresolved || report.gapKind === 'none') {
    return null
  }

  const sharedFields = {
    id: 'courier-network-capacity-gap' as const,
    capacityLine: `Current ${report.current} · Immediate floor ${report.required} · Structural target ${report.desiredFuture}`,
    mitigationLabels: report.mitigationHooks.map((hook) => hook.label),
    primaryHref: APP_ROUTES.marketsSuppliers,
    primaryLinkLabel: 'Review procurement backlog',
    secondaryHref: APP_ROUTES.agency,
    secondaryLinkLabel: 'Review agency funding',
    guidanceNote:
      'These mitigations are planning labels only. Use existing procurement, agency funding, and weekly progression flows already in the sim.',
  }

  if (report.gapKind === 'below_required') {
    return {
      ...sharedFields,
      title: 'Courier network below immediate floor',
      summary:
        'Logistics support is under the baseline immediate floor. Reduce lockouts, exposure residue drag, budget strain, and pending procurement pressure where you can.',
      gapKindLabel: 'Below immediate floor',
      tone: 'danger',
    }
  }

  if (report.gapKind === 'below_desired_only') {
    return {
      ...sharedFields,
      title: 'Courier network below structural target',
      summary:
        'The immediate logistics floor is met, but overall courier network support remains under the structural baseline for this scenario.',
      gapKindLabel: 'Below structural target',
      tone: 'warning',
    }
  }

  return null
}

export function buildProcurementPressureOpportunityCard(
  game: GameState
): FrontDeskProcurementPressureOpportunityView | null {
  const fundingPressure = assessFundingPressure(game)
  const fundingState = getCanonicalFundingState(game)
  const backlog = getProcurementBacklog(fundingState)
  const pendingBacklog = backlog.filter((entry) => entry.status === 'pending')
  const staleRequestIds = new Set(fundingPressure.staleProcurementRequestIds)
  const staleBacklog = pendingBacklog.filter((entry) => staleRequestIds.has(entry.requestId))
  const activeFabrication = game.productionQueue

  if (
    staleBacklog.length === 0 &&
    pendingBacklog.length === 0 &&
    activeFabrication.length === 0 &&
    !fundingPressure.constrained &&
    !fundingPressure.severeConstraint
  ) {
    return null
  }

  const listingsByItemId = new Map(
    getProcurementListings(game).map((listing) => [listing.itemId, listing.itemName])
  )
  const formatBacklogEntry = (entry: (typeof pendingBacklog)[number]) =>
    listingsByItemId.get(entry.itemId) ?? entry.itemId
  const tone: FrontDeskNoticeTone =
    staleBacklog.length > 0 || fundingPressure.severeConstraint ? 'danger' : 'warning'
  const severityLabel =
    staleBacklog.length > 0
      ? 'Stale backlog'
      : fundingPressure.severeConstraint
        ? 'Severe pressure'
        : fundingPressure.constrained
          ? 'Budget pressure'
          : 'Queued'

  return {
    id: 'procurement-pressure',
    title:
      staleBacklog.length > 0
        ? 'Procurement backlog needs attention'
        : fundingPressure.constrained
          ? 'Procurement pressure is constraining operations'
          : 'Procurement queue has open follow-through',
    summary: `${pluralize(pendingBacklog.length, 'supplier request')} pending, ${pluralize(
      staleBacklog.length,
      'stale request'
    )}, ${pluralize(activeFabrication.length, 'fabrication order')} active. Budget pressure ${
      fundingPressure.budgetPressure
    }/4.`,
    severityLabel,
    tone,
    details: uniqueBounded(
      [
        staleBacklog.length > 0
          ? `${staleBacklog
              .slice(0, 2)
              .map(formatBacklogEntry)
              .join(', ')} have exceeded the expected supplier handoff window.`
          : '',
        pendingBacklog.length > 0
          ? `${pendingBacklog
              .slice(0, 2)
              .map(formatBacklogEntry)
              .join(', ')} remain in the procurement backlog.`
          : '',
        activeFabrication.length > 0
          ? `${activeFabrication[0]!.outputItemName} is the next fabrication completion.`
          : '',
        fundingPressure.constrained
          ? `Funding signal: ${fundingPressure.reasonCodes[0] ?? `budget-pressure:${fundingPressure.budgetPressure}`}.`
          : '',
      ],
      MAX_PRESSURE_DETAILS
    ),
    primaryHref: APP_ROUTES.marketsSuppliers,
    primaryLinkLabel: 'Open procurement',
    ...(activeFabrication.length > 0
      ? {
          secondaryHref: APP_ROUTES.fabrication,
          secondaryLinkLabel: 'Open fabrication',
        }
      : {}),
  }
}

export function buildStaffingReadinessOpportunityCard(
  game: GameState,
  operationsReport: OperationsReportView = getOperationsReportView(game)
): FrontDeskStaffingReadinessOpportunityView | null {
  const attritionPressure = assessAttritionPressure(game)
  const hardBlockedReadiness = operationsReport.deploymentReadiness.filter(
    (entry) => entry.hardBlockers.length > 0
  )
  const blockedOrDeferredRouting = operationsReport.missionRouting.filter(
    (entry) => entry.routingStateLabel === 'Blocked' || entry.routingStateLabel === 'Deferred'
  )

  if (
    attritionPressure.staffingGap === 0 &&
    hardBlockedReadiness.length === 0 &&
    blockedOrDeferredRouting.length === 0
  ) {
    return null
  }

  const blockedRoutingCount = blockedOrDeferredRouting.filter(
    (entry) => entry.routingStateLabel === 'Blocked'
  ).length
  const tone: FrontDeskNoticeTone =
    attritionPressure.severeConstraint || hardBlockedReadiness.length > 0 || blockedRoutingCount > 0
      ? 'danger'
      : 'warning'
  const leadReadiness = hardBlockedReadiness[0]
  const leadRouting = blockedOrDeferredRouting[0]

  return {
    id: 'staffing-readiness-pressure',
    title:
      attritionPressure.staffingGap > 0
        ? 'Staffing gap is pressuring readiness'
        : hardBlockedReadiness.length > 0
          ? 'Readiness blockers need team review'
          : 'Mission routing is deferred by readiness pressure',
    summary: `${pluralize(attritionPressure.staffingGap, 'staffing gap')}, ${pluralize(
      hardBlockedReadiness.length,
      'hard-blocked team pairing'
    )}, ${pluralize(blockedOrDeferredRouting.length, 'blocked or deferred mission')}.`,
    tone,
    details: uniqueBounded(
      [
        attritionPressure.staffingGap > 0
          ? `${pluralize(attritionPressure.staffingGap, 'operative')} need replacement coverage before the roster is fully staffed.`
          : '',
        leadReadiness
          ? `${leadReadiness.teamName} -> ${leadReadiness.missionTitle}: ${leadReadiness.hardBlockers.join(', ')}.`
          : '',
        leadRouting
          ? `${leadRouting.routingStateLabel}: ${leadRouting.missionTitle} / ${leadRouting.dominantFactorLabel}.`
          : '',
        attritionPressure.reasonCodes[0]
          ? `Attrition signal: ${attritionPressure.reasonCodes[0]}.`
          : '',
      ],
      MAX_PRESSURE_DETAILS
    ),
    href: APP_ROUTES.teams,
    linkLabel: 'Open teams',
    ...(attritionPressure.staffingGap > 0
      ? {
          secondaryHref: APP_ROUTES.recruitment,
          secondaryLinkLabel: 'Open recruitment',
        }
      : {}),
  }
}

const TAG_CONFLICT_GROUPS: ReadonlyArray<{
  id: 'authority' | 'criminal' | 'occult' | 'civilian'
  label: string
  tags: readonly string[]
}> = [
  {
    id: 'authority',
    label: 'Authority',
    tags: ['authority', 'police', 'government', 'institution'],
  },
  { id: 'criminal', label: 'Criminal', tags: ['criminal', 'smuggling', 'gang', 'blackmarket'] },
  { id: 'occult', label: 'Occult', tags: ['occult', 'cult', 'ritual', 'esoteric'] },
  { id: 'civilian', label: 'Civilian', tags: ['civilian', 'public', 'community', 'witness'] },
]

const VALUE_STREAM_GROUPS: ReadonlyArray<{ label: string; tags: readonly string[] }> = [
  { label: 'Public legitimacy', tags: ['public', 'civilian', 'authority', 'community'] },
  { label: 'Cover integrity', tags: ['covert', 'cover', 'infiltration', 'smuggling'] },
  { label: 'Funding', tags: ['funding', 'procurement', 'resource', 'supply'] },
  { label: 'Evidence quality', tags: ['evidence', 'intel', 'signal', 'verification'] },
  { label: 'Doctrine risk', tags: ['occult', 'cult', 'ritual', 'classified'] },
]

function hasAnyTag(haystack: readonly string[], needles: readonly string[]) {
  return needles.some((needle) => haystack.includes(needle))
}

type TagConflictRegionCandidate = {
  regionTag: string
  regionCases: Array<NonNullable<GameState['cases'][string]>>
  mergedTags: string[]
  presentGroups: Array<(typeof TAG_CONFLICT_GROUPS)[number]>
}

function compareTagConflictRegionCandidates(
  left: TagConflictRegionCandidate,
  right: TagConflictRegionCandidate
) {
  const groupDelta = right.presentGroups.length - left.presentGroups.length
  if (groupDelta !== 0) {
    return groupDelta
  }

  const caseDelta = right.regionCases.length - left.regionCases.length
  if (caseDelta !== 0) {
    return caseDelta
  }

  return left.regionTag.localeCompare(right.regionTag)
}

function buildTagConflictValueStreamOpportunityCardFromCandidate(
  candidate: TagConflictRegionCandidate
): FrontDeskTagConflictValueStreamOpportunityView {
  const { regionTag, regionCases, mergedTags, presentGroups } = candidate
  const conflictLabel = `${presentGroups[0]!.label} vs ${presentGroups[1]!.label}`
  const scoredStreams = VALUE_STREAM_GROUPS.map((stream) => ({
    label: stream.label,
    score: stream.tags.filter((tag) => mergedTags.includes(tag)).length,
  })).sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
  const valueStreamLabel =
    scoredStreams[0]!.score > 0 ? scoredStreams[0]!.label : 'Evidence quality'

  return {
    id: 'tag-conflict-value-stream',
    title: 'Town-tag conflict lead requires routing',
    summary: `${regionTag} carries a deterministic ${conflictLabel.toLowerCase()} tag conflict. Surface it as a ${valueStreamLabel.toLowerCase()} lead before it diffuses into low-signal queue noise.`,
    tone: presentGroups.length >= 3 ? 'danger' : 'warning',
    conflictLabel,
    valueStreamLabel,
    details: uniqueBounded(
      [
        `${pluralize(regionCases.length, 'open case')} share the ${regionTag} region tag.`,
        `Conflict lane: ${conflictLabel}.`,
        `Lead value stream: ${valueStreamLabel}.`,
      ],
      MAX_PRESSURE_DETAILS
    ),
    primaryHref: APP_ROUTES.cases,
    primaryLinkLabel: 'Open cases',
    secondaryHref: APP_ROUTES.report,
    secondaryLinkLabel: 'Open report',
  }
}

export function buildStrategicActionBudgetOpportunityCard(
  game: GameState
): FrontDeskStrategicActionBudgetOpportunityView | null {
  const projection = projectStrategicActionBudget(game)
  if (!projection.constrained || !projection.leadLane) {
    return null
  }

  const tone: FrontDeskNoticeTone =
    projection.deficit >= 2 || projection.totalBudget === 0 ? 'danger' : 'warning'
  const severityLabel =
    projection.totalBudget === 0
      ? 'Budget exhausted'
      : projection.deficit >= 2
        ? 'Severe shortfall'
        : 'Constrained'

  return {
    id: 'strategic-action-budget',
    title: 'Strategic action budget is constrained',
    summary: `${projection.leadLane.label} deployments are competing for a support pool that cannot cover every committed field action this week. Re-prioritize before the weekly tick assigns support shortfalls.`,
    pressureLaneLabel: projection.leadLane.label,
    budgetLine: `Support pool ${projection.totalBudget} · ${pluralize(projection.committedDemand, 'committed deployment')} · ${pluralize(projection.deficit, 'projected shortfall')}`,
    severityLabel,
    tone,
    details: uniqueBounded(
      [
        `Lead pressure lane: ${projection.leadLane.label} (${projection.leadLane.score} deployment${projection.leadLane.score === 1 ? '' : 's'}).`,
        projection.pressureLanes[1]
          ? `Next lane: ${projection.pressureLanes[1].label} (${projection.pressureLanes[1].score}).`
          : '',
        projection.remainingBudget === 0
          ? 'No discretionary support remains after committed deployments.'
          : `${projection.remainingBudget} support unit${projection.remainingBudget === 1 ? '' : 's'} remain before the pool is exhausted.`,
      ],
      MAX_PRESSURE_DETAILS
    ),
    primaryHref: APP_ROUTES.agency,
    primaryLinkLabel: 'Open agency',
    secondaryHref: APP_ROUTES.teams,
    secondaryLinkLabel: 'Open teams',
  }
}

export function buildTagConflictValueStreamOpportunityCard(
  game: GameState
): FrontDeskTagConflictValueStreamOpportunityView | null {
  const openCases = Object.values(game.cases).filter(
    (currentCase) => currentCase.status !== 'resolved'
  )
  const casesByRegion = new Map<string, typeof openCases>()
  for (const currentCase of openCases) {
    if (!currentCase.regionTag) continue
    const existing = casesByRegion.get(currentCase.regionTag) ?? []
    existing.push(currentCase)
    casesByRegion.set(currentCase.regionTag, existing)
  }

  const rankedCandidates = [...casesByRegion.entries()]
    .filter(([, regionCases]) => regionCases.length >= 2)
    .map(([regionTag, regionCases]) => {
      const mergedTags = [...new Set(regionCases.flatMap((currentCase) => currentCase.tags))].sort(
        (left, right) => left.localeCompare(right)
      )
      const presentGroups = TAG_CONFLICT_GROUPS.filter((group) => hasAnyTag(mergedTags, group.tags))
      return { regionTag, regionCases, mergedTags, presentGroups }
    })
    .filter((candidate) => candidate.presentGroups.length >= 2)
    .sort(compareTagConflictRegionCandidates)

  const lead = rankedCandidates[0]
  if (!lead) {
    return null
  }

  return buildTagConflictValueStreamOpportunityCardFromCandidate(lead)
}

function formatHubDistrictLabel(districtKey: string) {
  return districtKey.replace(/_/g, ' ')
}

function formatHubConfidenceLabel(confidence: number) {
  return `${Math.round(confidence * 100)}% confidence`
}

function hubOpportunityTone(
  accessState?: 'allowed' | 'blocked' | 'risky' | 'costly',
  misleading?: boolean
): FrontDeskNoticeTone {
  if (accessState === 'blocked') return 'danger'
  if (accessState === 'risky' || misleading) return 'warning'
  if (accessState === 'costly') return 'warning'
  return 'info'
}

function hubRumorTone(misleading?: boolean, filtered?: boolean): FrontDeskNoticeTone {
  if (misleading) return 'warning'
  if (filtered) return 'info'
  return 'info'
}

export function buildHubOpportunityLeadCard(
  game: GameState
): FrontDeskHubOpportunityLeadView | null {
  const hub = generateHubState(game)
  const opportunity = hub.opportunities[0]
  if (!opportunity) return null

  const details = uniqueBounded(
    [
      `District: ${formatHubDistrictLabel(hub.districtKey)}.`,
      opportunity.misleading ? 'Signal may be misleading — verify before acting.' : '',
    ].filter((line) => line.length > 0),
    MAX_PRESSURE_DETAILS
  )

  return {
    id: opportunity.id,
    title: opportunity.label,
    summary: opportunity.detail,
    tone: hubOpportunityTone(opportunity.accessState, opportunity.misleading),
    factionId: opportunity.factionId,
    confidenceLabel: formatHubConfidenceLabel(opportunity.confidence),
    statusLabel: opportunity.accessState,
    statusDetail: opportunity.accessExplanation,
    misleading: opportunity.misleading === true,
    details,
    primaryHref: APP_ROUTES.factions,
    primaryLinkLabel: 'Open factions',
    secondaryHref: APP_ROUTES.report,
    secondaryLinkLabel: 'Open report',
  }
}

export function buildHubRumorLeadCard(game: GameState): FrontDeskHubRumorLeadView | null {
  const hub = generateHubState(game)
  const rumor = hub.rumors[0]
  if (!rumor) return null

  const details = uniqueBounded(
    [
      `District: ${formatHubDistrictLabel(hub.districtKey)}.`,
      rumor.filtered ? 'Social filtering may be suppressing parts of this lead.' : '',
      rumor.misleading ? 'Treat as potentially misleading until corroborated.' : '',
    ].filter((line) => line.length > 0),
    MAX_PRESSURE_DETAILS
  )

  return {
    id: rumor.id,
    title: rumor.label,
    summary: rumor.detail,
    tone: hubRumorTone(rumor.misleading, rumor.filtered),
    confidenceLabel: formatHubConfidenceLabel(rumor.confidence),
    misleading: rumor.misleading === true,
    filtered: rumor.filtered === true,
    details,
    primaryHref: APP_ROUTES.factions,
    primaryLinkLabel: 'Open factions',
    secondaryHref: APP_ROUTES.report,
    secondaryLinkLabel: 'Open report',
  }
}

export function getFrontDeskHubView(game: GameState): FrontDeskHubView {
  const shell = buildShellStatusBarView(game)
  const agency = buildAgencySummary(game)
  const global = getGlobalStateMetrics(game)
  const briefing = getFrontDeskBriefingView(game)
  const operationsReport = getOperationsReportView(game)
  const attritionPressure = assessAttritionPressure(game)
  const rulesSummary = buildCampaignRulesSummary(game)

  return {
    weekLabel: `Week ${game.week} / Active cap ${game.config.maxActiveCases}`,
    cycleLabel: `Year ${shell.currentYear} / ${shell.currentSeason} / ${shell.weeksSinceStart} weeks elapsed`,
    campaignSummary: briefing.directorMessage,
    campaignDetailLines: [
      `${agency.activeOperations.activeCases} open operation(s), ${agency.activeOperations.inProgressCases} active deployment(s), ${agency.activeOperations.openOperationSlots} slot(s) free.`,
      `Agency tier ${agency.ranking.tier} / Reputation ${agency.reputation} / Rank ${agency.ranking.score}.`,
      `Containment ${agency.containmentRating} / Clearance ${agency.clearanceLevel} / Pressure ${agency.pressure.level} (${agency.pressure.score}) / Current year ${global.year}.`,
      attritionPressure.staffingGap > 0
        ? `${pluralize(attritionPressure.staffingGap, 'staffing gap')} are active in the roster.`
        : 'Roster coverage is currently holding without a staffing gap.',
    ],
    quickLinks: buildQuickLinks(game),
    statCards: buildStatCards(game),
    briefing,
    activePressureSummary: operationsReport.weeklySummary.summary,
    dominantPressureLabel: operationsReport.weeklySummary.dominantPressureLabel,
    activePressureDetails: uniqueBounded(
      [
        operationsReport.weeklySummary.budgetPressureSummary,
        operationsReport.weeklySummary.attritionPressureSummary,
        operationsReport.weeklySummary.intelConfidenceSummary,
        ...(operationsReport.weeklySummary.crossSessionAttritionContinuitySummary
          ? [operationsReport.weeklySummary.crossSessionAttritionContinuitySummary]
          : []),
        ...(operationsReport.weeklySummary.rotatingRosterContinuitySummary
          ? [operationsReport.weeklySummary.rotatingRosterContinuitySummary]
          : []),
        ...(operationsReport.weeklySummary.deploymentMomentumSummary
          ? [operationsReport.weeklySummary.deploymentMomentumSummary]
          : []),
        ...operationsReport.weeklySummary.details,
      ],
      MAX_PRESSURE_DETAILS
    ),
    signals: shell.signals,
    queueCards: buildQueueCards(game, briefing),
    recentItems: buildRecentItems(game),
    recentOutcomes: operationsReport.recentOutcomes.slice(0, 2),
    attentionItems: buildAttentionItems(game, briefing),
    teamStatus: buildTeamStatusViews(game),
    procurementSnapshot: buildProcurementSnapshot(game),
    standingSummary: buildStandingSummary(game),
    latestReport: buildLatestReportView(game),
    courierCapacityOpportunity: buildCourierNetworkCapacityOpportunityCard(
      buildCourierNetworkCapacityGapReport(game)
    ),
    procurementPressureOpportunity: buildProcurementPressureOpportunityCard(game),
    staffingReadinessOpportunity: buildStaffingReadinessOpportunityCard(game, operationsReport),
    strategicActionBudgetOpportunity: buildStrategicActionBudgetOpportunityCard(game),
    tagConflictValueStreamOpportunity: buildTagConflictValueStreamOpportunityCard(game),
    hubOpportunityLead: buildHubOpportunityLeadCard(game),
    hubRumorLead: buildHubRumorLeadCard(game),
    campaignRulesSummary: {
      title: 'Campaign profile & rules ledger',
      headline: rulesSummary.headline,
      lines: rulesSummary.lines,
      compatibilitySummary: rulesSummary.compatibilitySummary,
      activeModuleLabels: rulesSummary.activeModuleLabels,
    },
  }
}
