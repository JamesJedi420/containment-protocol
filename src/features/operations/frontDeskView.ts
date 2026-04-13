import { APP_ROUTES } from '../../app/routes'
import {
  buildShellStatusBarView,
  type ShellStatusSignalView,
} from '../../components/layout/shellStatusBarView'
import { buildAgencySummary } from '../../domain/agency'
import { assessAttritionPressure } from '../../domain/agent/attrition'
import type { AuthoredChoiceDefinition } from '../../domain/choiceSystem'
import {
  buildAuthoredBranchContext,
  selectAuthoredBranch,
  type AuthoredBranch,
  type AuthoredBranchContext,
} from '../../domain/contentBranching'
import { buildFactionStates } from '../../domain/factions'
import {
  assessFundingPressure,
  getCanonicalFundingState,
} from '../../domain/funding'
import type { GameState } from '../../domain/models'
import { PROGRESS_CLOCK_IDS } from '../../domain/progressClocks'
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
  type WeakestLinkOutcomeReportItemView,
} from '../report/operationsReportView'
import {
  buildBreachFollowUpChoices,
  buildHostileFactionResponseChoices,
  buildSpecialRecruitOpportunityChoices,
  buildWeeklyReportTutorialChoices,
} from './frontDeskChoices'
import {
  FRONT_DESK_TRIGGER_IDS,
  getEligibleFrontDeskSceneTriggerIdSet,
} from './frontDeskTriggers'

export type FrontDeskNoticeTone = 'info' | 'warning' | 'danger' | 'success'
export type FrontDeskNoticeActionTarget = 'report' | 'cases' | 'recruitment' | 'factions'

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
}

function buildDirectorMessage(
  game: GameState,
  context: AuthoredBranchContext,
  hasHostileFaction: boolean
) {
  const global = getGlobalStateMetrics(game)
  const recent = game.reports.at(-1)

  const routes: AuthoredBranch<string>[] = [
    {
      id: 'hostile-faction-pressure',
      when: {
        predicates: [
          {
            id: 'hostile-faction-present',
            test: () => hasHostileFaction,
          },
        ],
      },
      value:
        'Hostile external actors are actively probing this cycle. Keep counter-intel posture tight and avoid avoidable escalation.',
    },
    {
      id: 'breach-posture-escalated',
      when: {
        progressClocks: [
          {
            clockId: PROGRESS_CLOCK_IDS.breachFollowUpPosture,
            threshold: 2,
          },
        ],
      },
      value:
        'Breach follow-up posture is escalating. Prioritize teams with stable recovery profiles and preserve surge capacity.',
    },
    {
      id: 'critical-pressure',
      when: {
        predicates: [
          {
            id: 'pressure-critical',
            test: () => global.pressureLevel === 'critical',
          },
        ],
      },
      value:
        'Threat posture is elevated across active incidents. Prioritize rapid containment and keep reserve teams flexible.',
    },
    {
      id: 'clean-resolution-week',
      when: {
        predicates: [
          {
            id: 'recent-clean-report',
            test: () =>
              Boolean(recent && recent.resolvedCases.length >= 2 && recent.failedCases.length === 0),
          },
        ],
      },
      value:
        'Containment tempo is holding. Maintain momentum, but do not overextend fatigued units.',
    },
    {
      id: 'recent-failure-week',
      when: {
        predicates: [
          {
            id: 'recent-failure-report',
            test: () => Boolean(recent && recent.failedCases.length > 0),
          },
        ],
      },
      value:
        'Recent failures shifted confidence. Tighten assignment discipline and stabilize high-stage operations before expansion.',
    },
    {
      id: 'routine-even-week',
      when: {
        predicates: [
          {
            id: 'even-week',
            test: ({ state }) => state.week % 2 === 0,
          },
        ],
      },
      value:
        'Routine systems are stable this cycle. Keep recon, training, and fabrication queues synchronized.',
    },
    {
      id: 'routine-odd-week',
      value:
        'Signals are mixed this week. Keep eyes on deadline risk and preserve mission-ready reserves.',
    },
  ]

  const selection = selectAuthoredBranch(game, routes, context)

  return {
    routeId: selection?.branchId,
    message: selection?.value ?? '',
  }
}

function buildWeeklyReportNotice(
  game: GameState,
  eligibleTriggerIds: ReadonlySet<string>,
  context: AuthoredBranchContext
): FrontDeskNoticeView {
  const routes: AuthoredBranch<FrontDeskNoticeView>[] = [
    {
      id: 'weekly-report-tutorial',
      when: {
        predicates: [
          {
            id: 'weekly-report-tutorial-trigger-eligible',
            test: () => eligibleTriggerIds.has(FRONT_DESK_TRIGGER_IDS.weeklyReportTutorial),
          },
        ],
      },
      value: {
        id: 'weekly-report-tutorial',
        title: 'Weekly report orientation',
        body:
          'The weekly report is your canonical after-action ledger. Review it first, then set assignments and supply priorities from the same picture.',
        tone: 'info',
        actionTarget: 'report',
        actionLabel: 'Open report',
        choices: buildWeeklyReportTutorialChoices(),
      },
    },
    {
      id: 'weekly-report-steady-consumed',
      when: {
        flags: {
          consumedOneShots: ['frontdesk.tutorial.weekly-report'],
        },
      },
      value: {
        id: 'weekly-report-returning',
        title: 'Weekly report on quiet cadence',
        body:
          'Tutorial prompts are now retired. Keep a steady report-review rhythm to catch drift before it compounds.',
        tone: 'info',
        actionTarget: 'report',
        actionLabel: 'Open report',
      },
    },
    {
      id: 'weekly-report-follow-up-priority',
      when: {
        followUps: {
          anyOf: ['recruit.special.frontdesk.review', 'frontdesk.faction.occult_networks.response'],
        },
      },
      value: {
        id: 'weekly-report-returning',
        title: 'Weekly report ready',
        body:
          'A queued front-desk follow-up is pending. Review the latest dossier first to anchor your response in current state changes.',
        tone: 'info',
        actionTarget: 'report',
        actionLabel: 'Review dossier',
      },
    },
    {
      id: 'weekly-report-returning',
      value: {
        id: 'weekly-report-returning',
        title: 'Weekly report ready',
        body:
          'The latest dossier is ready for review. Check it before you commit teams so you can react to last week\'s fatigue, fallout, and unlocked follow-ups.',
        tone: 'info',
        actionTarget: 'report',
        actionLabel: 'Review dossier',
      },
    },
  ]

  return selectAuthoredBranch(game, routes, context)?.value ?? {
    id: 'weekly-report-returning',
    title: 'Weekly report ready',
    body: 'The latest dossier is ready for review.',
    tone: 'info',
  }
}

function buildBreachFollowUpNotice(
  game: GameState,
  eligibleTriggerIds: ReadonlySet<string>,
  context: AuthoredBranchContext
): FrontDeskNoticeView | null {
  return (
    selectAuthoredBranch<FrontDeskNoticeView | null>(
      game,
      [
      {
        id: 'breach-follow-up-queued',
        when: {
          followUps: {
            anyOf: [
              'containment.breach.followup.cautious-brief',
              'containment.breach.followup.aggressive-brief',
            ],
          },
        },
        value: {
          id: 'breach-follow-up-queued',
          title: 'Breach follow-up queued for command review',
          body:
            'A command-selected breach brief is queued. Review cases and execute before threat momentum shifts again.',
          tone: 'warning',
          actionTarget: 'cases',
          actionLabel: 'Review queued follow-up',
        },
      },
      {
        id: 'breach-follow-up-cautious-brief',
        when: {
          predicates: [
            {
              id: 'breach-follow-up-cautious-trigger-eligible',
              test: () => eligibleTriggerIds.has(FRONT_DESK_TRIGGER_IDS.breachFollowUpCautiousBrief),
            },
          ],
        },
        value: {
          id: 'breach-follow-up-cautious-brief',
          title: 'Cautious breach posture logged',
          body:
            'The follow-up plan is now weighted toward containment discipline, recovery tempo, and reducing avoidable exposure.',
          tone: 'warning',
          actionTarget: 'cases',
          actionLabel: 'Review cases',
        },
      },
      {
        id: 'breach-follow-up-aggressive-brief',
        when: {
          predicates: [
            {
              id: 'breach-follow-up-aggressive-trigger-eligible',
              test: () => eligibleTriggerIds.has(FRONT_DESK_TRIGGER_IDS.breachFollowUpAggressiveBrief),
            },
          ],
        },
        value: {
          id: 'breach-follow-up-aggressive-brief',
          title: 'Aggressive breach posture logged',
          body:
            'A high-tempo response has been authorized. Expect faster movement, sharper exposure risk, and tighter recovery margins.',
          tone: 'danger',
          actionTarget: 'cases',
          actionLabel: 'Review cases',
        },
      },
      {
        id: 'breach-follow-up-open',
        when: {
          predicates: [
            {
              id: 'breach-follow-up-open-trigger-eligible',
              test: () => eligibleTriggerIds.has(FRONT_DESK_TRIGGER_IDS.breachFollowUpOpen),
            },
          ],
        },
        value: {
          id: 'breach-follow-up-open',
          title: 'Containment breach follow-up available',
          body:
            'A follow-up operation is now authorized. Review open cases before the lead cools and the breach window closes.',
          tone: 'warning',
          actionTarget: 'cases',
          actionLabel: 'Inspect cases',
          choices: buildBreachFollowUpChoices(),
        },
      },
      {
        id: 'breach-follow-up-none',
        value: null,
      },
    ],
      context
    )?.value ?? null
  )
}

function buildHostileFactionNotice(
  game: GameState,
  hostileFaction: ReturnType<typeof buildFactionStates>[number] | undefined,
  context: AuthoredBranchContext
): FrontDeskNoticeView | null {

  return (
    selectAuthoredBranch<FrontDeskNoticeView | null>(game, [
      {
        id: 'hostile-faction-response',
        when: {
          flags: hostileFaction
            ? {
                allFlags: [
                  {
                    flagId: `faction.${hostileFaction.id}.frontdesk-response`,
                    equals: 'containment',
                  },
                ],
              }
            : undefined,
        },
        value: hostileFaction
          ? {
              id: 'hostile-faction-response',
              title: `${hostileFaction.label} response posture set`,
              body:
                'Counter-intelligence posture is active. Keep watch for retaliation pressure, infiltration signals, and supply-line friction.',
              tone: 'warning',
              actionTarget: 'factions',
              actionLabel: 'Review standing',
            }
          : null,
      },
      {
        id: 'hostile-faction-alert',
        when: {
          predicates: [
            {
              id: 'hostile-faction-present',
              test: () => Boolean(hostileFaction),
            },
          ],
        },
        value: hostileFaction
          ? {
              id: 'hostile-faction-alert',
              title: `${hostileFaction.label} pressure rising`,
              body: hostileFaction.feedback,
              tone: 'warning',
              actionTarget: 'factions',
              actionLabel: 'Review standing',
              choices: buildHostileFactionResponseChoices(hostileFaction),
            }
          : null,
      },
      {
        id: 'hostile-faction-none',
        value: null,
      },
    ], context)?.value ?? null
  )
}

function buildSpecialRecruitNotice(
  game: GameState,
  eligibleTriggerIds: ReadonlySet<string>,
  context: AuthoredBranchContext
): FrontDeskNoticeView | null {
  const specialRecruit = game.candidates.find(
    (candidate) =>
      candidate.hireStatus === 'available' &&
      candidate.sourceDisposition !== 'adversarial' &&
      Boolean(candidate.sourceFactionId || candidate.sourceContactId)
  )

  return (
    selectAuthoredBranch<FrontDeskNoticeView | null>(game, [
      {
        id: 'special-recruit-opportunity',
        when: {
          predicates: [
            {
              id: 'special-recruit-trigger-eligible',
              test: () => eligibleTriggerIds.has(FRONT_DESK_TRIGGER_IDS.specialRecruitOpportunity),
            },
          ],
        },
        value: specialRecruit
          ? {
              id: 'special-recruit-opportunity',
              title: `Special recruit opportunity: ${specialRecruit.name}`,
              body:
                specialRecruit.sourceSummary ??
                `${specialRecruit.name} arrived through a trusted outside channel and may not stay in the pool for long.`,
              tone: 'success',
              actionTarget: 'recruitment',
              actionLabel: 'Open recruitment',
              choices: buildSpecialRecruitOpportunityChoices(specialRecruit),
            }
          : null,
      },
      {
        id: 'special-recruit-none',
        value: null,
      },
    ], context)?.value ?? null
  )
}

/**
 * Author-facing front-desk example surface for conditional content selection.
 * Add new notices here instead of scattering one-off `if/else` branches across
 * UI components when the decision is based on shared game state.
 */
export function getFrontDeskBriefingView(game: GameState): FrontDeskBriefingView {
  const eligibleTriggerIds = getEligibleFrontDeskSceneTriggerIdSet(game)
  const branchContext = buildAuthoredBranchContext(game, {
    activeContextId: 'frontdesk.dashboard',
  })
  const hostileFaction = buildFactionStates(game).find(
    (faction) => faction.stance === 'hostile' || faction.reputationTier === 'hostile'
  )
  const director = buildDirectorMessage(game, branchContext, Boolean(hostileFaction))
  const notices = [
    buildWeeklyReportNotice(game, eligibleTriggerIds, branchContext),
    buildBreachFollowUpNotice(game, eligibleTriggerIds, branchContext),
    buildHostileFactionNotice(game, hostileFaction, branchContext),
    buildSpecialRecruitNotice(game, eligibleTriggerIds, branchContext),
  ].filter((notice): notice is FrontDeskNoticeView => Boolean(notice))

  return {
    directorMessage: director.message,
    notices,
    debug: {
      ...(director.routeId ? { directorMessageRouteId: director.routeId } : {}),
      noticeRouteIds: notices.map((notice) => notice.id),
      choiceIds: notices.flatMap((notice) => notice.choices?.map((choice) => choice.id) ?? []),
    },
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

  return [
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
  const pendingBacklog = fundingState.procurementBacklog.filter((entry) => entry.status === 'pending')

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
                candidate.scoutReport?.confirmedTier ?? candidate.scoutReport?.projectedTier ?? 'unknown'
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
              .map((entry) => `${entry.agentName}: ${entry.trainingName} / ${entry.remainingWeeks}w`)
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
            .map((entry) => `${entry.itemId}: supplier handoff pending from week ${entry.requestedWeek}`),
          ...game.productionQueue
            .slice(0, 2)
            .map((entry) => `${entry.outputItemName}: fabrication completes in ${entry.remainingWeeks}w`),
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
    .filter((entry) => entry.routingStateLabel === 'Blocked' || entry.routingStateLabel === 'Deferred')
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

  return [...noticeItems, ...signalItems, ...routingItems, ...readinessItems]
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
    .map((entry) => ({
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
          entry.signals.deadlineRisk ? 'Deadline risk' : '',
          entry.signals.criticalStage ? 'Critical stage' : '',
          entry.signals.raidUnderstaffed ? 'Raid understaffed' : '',
        ],
        3
      ),
      ...(entry.assignedCase ? { assignedCaseHref: APP_ROUTES.caseDetail(entry.assignedCase.id) } : {}),
    }))
}

function buildProcurementSnapshot(game: GameState): FrontDeskProcurementSnapshotView {
  const fundingPressure = assessFundingPressure(game)
  const fundingState = getCanonicalFundingState(game)
  const pendingBacklog = fundingState.procurementBacklog.filter((entry) => entry.status === 'pending')

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
    (sum, faction) => sum + faction.contacts.filter((contact) => contact.status === 'active').length,
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

export function getFrontDeskHubView(game: GameState): FrontDeskHubView {
  const shell = buildShellStatusBarView(game)
  const agency = buildAgencySummary(game)
  const global = getGlobalStateMetrics(game)
  const briefing = getFrontDeskBriefingView(game)
  const operationsReport = getOperationsReportView(game)
  const attritionPressure = assessAttritionPressure(game)

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
  }
}
