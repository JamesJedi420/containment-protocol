import { buildAgencySummary } from './agency'
import { buildFactionStates } from './factions'
import type { GameState } from './models'
import type { AuthoredChoiceDefinition } from './choiceSystem'
import {
  buildAuthoredBranchContext,
  selectAuthoredBranch,
  type AuthoredBranch,
  type AuthoredBranchContext,
} from './contentBranching'
import { PROGRESS_CLOCK_IDS } from './progressClocks'
import {
  buildBreachFollowUpChoices,
  buildHostileFactionResponseChoices,
  buildPublicDisclosurePostureChoices,
  buildSpecialRecruitOpportunityChoices,
  buildWeeklyReportTutorialChoices,
} from './frontDeskChoices'
import { FRONT_DESK_TRIGGER_IDS, getEligibleFrontDeskSceneTriggerIdSet } from './frontDeskTriggers'
import { listPendingPublicDisclosurePostureDecisions } from './publicDisclosurePostureChoice'

/** Canonical authored selection metadata; presentation is owned by the operations feature. */
export interface FrontDeskAuthoredNotice {
  id: string
  presentationKey:
    | 'weekly-report-tutorial'
    | 'weekly-report-consumed'
    | 'weekly-report-follow-up'
    | 'weekly-report-returning'
    | 'weekly-report-fallback'
    | 'breach-follow-up-queued'
    | 'breach-follow-up-cautious'
    | 'breach-follow-up-aggressive'
    | 'breach-follow-up-open'
    | 'hostile-faction-response'
    | 'hostile-faction-alert'
    | 'special-recruit-opportunity'
    | 'disclosure-posture'
  choices?: AuthoredChoiceDefinition[]
}
function findSpecialRecruit(game: GameState) {
  return game.candidates.find(
    (candidate) =>
      candidate.hireStatus === 'available' &&
      candidate.sourceDisposition !== 'adversarial' &&
      Boolean(candidate.sourceFactionId || candidate.sourceContactId)
  )
}

function buildDirectorMessage(
  game: GameState,
  context: AuthoredBranchContext,
  hasHostileFaction: boolean
) {
  const agency = buildAgencySummary(game)
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
      value: 'hostile-faction-pressure',
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
      value: 'breach-posture-escalated',
    },
    {
      id: 'critical-pressure',
      when: {
        predicates: [
          {
            id: 'pressure-critical',
            test: () => agency.pressure.level === 'critical',
          },
        ],
      },
      value: 'critical-pressure',
    },
    {
      id: 'clean-resolution-week',
      when: {
        predicates: [
          {
            id: 'recent-clean-report',
            test: () =>
              Boolean(
                recent && recent.resolvedCases.length >= 2 && recent.failedCases.length === 0
              ),
          },
        ],
      },
      value: 'clean-resolution-week',
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
      value: 'recent-failure-week',
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
      value: 'routine-even-week',
    },
    {
      id: 'routine-odd-week',
      value: 'routine-odd-week',
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
): FrontDeskAuthoredNotice {
  const routes: AuthoredBranch<FrontDeskAuthoredNotice>[] = [
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
        choices: buildWeeklyReportTutorialChoices(),
        presentationKey: 'weekly-report-tutorial',
      },
    },
    {
      id: 'weekly-report-steady-consumed',
      when: {
        flags: {
          consumedOneShots: ['frontdesk.tutorial.weekly-report'],
        },
      },
      value: { id: 'weekly-report-returning', presentationKey: 'weekly-report-consumed' },
    },
    {
      id: 'weekly-report-follow-up-priority',
      when: {
        followUps: {
          anyOf: ['recruit.special.frontdesk.review', 'frontdesk.faction.occult_networks.response'],
        },
      },
      value: { id: 'weekly-report-returning', presentationKey: 'weekly-report-follow-up' },
    },
    {
      id: 'weekly-report-returning',
      value: { id: 'weekly-report-returning', presentationKey: 'weekly-report-returning' },
    },
  ]

  return (
    selectAuthoredBranch(game, routes, context)?.value ?? {
      id: 'weekly-report-returning',
      presentationKey: 'weekly-report-fallback',
    }
  )
}

function buildBreachFollowUpNotice(
  game: GameState,
  eligibleTriggerIds: ReadonlySet<string>,
  context: AuthoredBranchContext
): FrontDeskAuthoredNotice | null {
  return (
    selectAuthoredBranch<FrontDeskAuthoredNotice | null>(
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
          value: { id: 'breach-follow-up-queued', presentationKey: 'breach-follow-up-queued' },
        },
        {
          id: 'breach-follow-up-cautious-brief',
          when: {
            predicates: [
              {
                id: 'breach-follow-up-cautious-trigger-eligible',
                test: () =>
                  eligibleTriggerIds.has(FRONT_DESK_TRIGGER_IDS.breachFollowUpCautiousBrief),
              },
            ],
          },
          value: {
            id: 'breach-follow-up-cautious-brief',
            presentationKey: 'breach-follow-up-cautious',
          },
        },
        {
          id: 'breach-follow-up-aggressive-brief',
          when: {
            predicates: [
              {
                id: 'breach-follow-up-aggressive-trigger-eligible',
                test: () =>
                  eligibleTriggerIds.has(FRONT_DESK_TRIGGER_IDS.breachFollowUpAggressiveBrief),
              },
            ],
          },
          value: {
            id: 'breach-follow-up-aggressive-brief',
            presentationKey: 'breach-follow-up-aggressive',
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
            choices: buildBreachFollowUpChoices(),
            presentationKey: 'breach-follow-up-open',
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
): FrontDeskAuthoredNotice | null {
  return (
    selectAuthoredBranch<FrontDeskAuthoredNotice | null>(
      game,
      [
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
            ? { id: 'hostile-faction-response', presentationKey: 'hostile-faction-response' }
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
                choices: buildHostileFactionResponseChoices(hostileFaction),
                presentationKey: 'hostile-faction-alert',
              }
            : null,
        },
        {
          id: 'hostile-faction-none',
          value: null,
        },
      ],
      context
    )?.value ?? null
  )
}

function buildSpecialRecruitNotice(
  game: GameState,
  eligibleTriggerIds: ReadonlySet<string>,
  context: AuthoredBranchContext
): FrontDeskAuthoredNotice | null {
  const specialRecruit = findSpecialRecruit(game)

  return (
    selectAuthoredBranch<FrontDeskAuthoredNotice | null>(
      game,
      [
        {
          id: 'special-recruit-opportunity',
          when: {
            predicates: [
              {
                id: 'special-recruit-trigger-eligible',
                test: () =>
                  eligibleTriggerIds.has(FRONT_DESK_TRIGGER_IDS.specialRecruitOpportunity),
              },
            ],
          },
          value: specialRecruit
            ? {
                id: 'special-recruit-opportunity',
                choices: buildSpecialRecruitOpportunityChoices(specialRecruit),
                presentationKey: 'special-recruit-opportunity',
              }
            : null,
        },
        {
          id: 'special-recruit-none',
          value: null,
        },
      ],
      context
    )?.value ?? null
  )
}

function buildPublicDisclosurePostureNotices(game: GameState): FrontDeskAuthoredNotice[] {
  return listPendingPublicDisclosurePostureDecisions(game).map((pending) => ({
    id: `disclosure-posture-${pending.recordId}`,
    choices: buildPublicDisclosurePostureChoices(pending.recordId, pending.label),
    presentationKey: 'disclosure-posture',
  }))
}

/**
 * Author-facing front-desk example surface for conditional content selection.
 * Add new notices here instead of scattering one-off `if/else` branches across
 * UI components when the decision is based on shared game state.
 */
export function getFrontDeskAuthoredState(game: GameState) {
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
    ...buildPublicDisclosurePostureNotices(game),
  ].filter((notice): notice is FrontDeskAuthoredNotice => Boolean(notice))

  return {
    directorRouteId: director.routeId ?? '',
    hostileFaction,
    specialRecruit: findSpecialRecruit(game),
    pendingDisclosure: listPendingPublicDisclosurePostureDecisions(game),
    notices,
    debug: {
      ...(director.routeId ? { directorMessageRouteId: director.routeId } : {}),
      noticeRouteIds: notices.map((notice) => notice.id),
      choiceIds: notices.flatMap((notice) => notice.choices?.map((choice) => choice.id) ?? []),
    },
  }
}
