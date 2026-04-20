import type { SceneTriggerDefinition } from '../../domain/sceneTriggers'
import type { GameState } from '../../domain/models'
import { PROGRESS_CLOCK_IDS } from '../../domain/progressClocks'
import {
  getEligibleSceneTriggerIdSet,
  getEligibleSceneTriggerIds,
  getEligibleSceneTriggers,
} from '../../domain/sceneTriggers'

export const FRONT_DESK_TRIGGER_IDS = {
  weeklyReportTutorial: 'frontdesk.notice.weekly-report-tutorial',
  breachFollowUpOpen: 'frontdesk.notice.breach-follow-up-open',
  breachFollowUpCautiousBrief: 'frontdesk.notice.breach-follow-up.cautious-brief',
  breachFollowUpAggressiveBrief: 'frontdesk.notice.breach-follow-up.aggressive-brief',
  specialRecruitOpportunity: 'frontdesk.notice.special-recruit-opportunity',
  operationsDashboard: 'frontdesk.scene.operations-dashboard',
} as const

export const FRONT_DESK_SCENE_TRIGGERS: readonly SceneTriggerDefinition[] = [
  {
    id: FRONT_DESK_TRIGGER_IDS.weeklyReportTutorial,
    targetId: FRONT_DESK_TRIGGER_IDS.weeklyReportTutorial,
    mode: 'one_shot',
    consumeId: 'frontdesk.tutorial.weekly-report',
    description: 'Opening front-desk tutorial that appears only once during the early report cadence.',
    when: {
      location: {
        hubId: 'operations-desk',
        sceneId: 'dashboard',
      },
      predicates: [
        {
          id: 'opening-cycle',
          test: ({ state }) => state.week <= 2,
        },
      ],
    },
  },
  {
    id: FRONT_DESK_TRIGGER_IDS.breachFollowUpOpen,
    targetId: FRONT_DESK_TRIGGER_IDS.breachFollowUpOpen,
    mode: 'one_shot',
    consumeId: 'containment.breach.followup_alert',
    description: 'Breach follow-up notice unlocked by the strategy layer until it is acknowledged.',
    when: {
      flags: {
        allFlags: ['containment.breach.followup_unlocked'],
      },
    },
  },
  {
    id: FRONT_DESK_TRIGGER_IDS.breachFollowUpCautiousBrief,
    targetId: FRONT_DESK_TRIGGER_IDS.breachFollowUpCautiousBrief,
    mode: 'repeatable',
    description: 'Repeatable follow-up briefing that becomes available after a cautious response is chosen.',
    when: {
      flags: {
        allFlags: [
          'containment.breach.followup_unlocked',
          {
            flagId: 'containment.breach.followup.response',
            equals: 'cautious',
          },
        ],
      },
      progressClocks: [
        {
          clockId: PROGRESS_CLOCK_IDS.breachFollowUpPosture,
          threshold: 1,
          maxValue: 1,
        },
      ],
    },
  },
  {
    id: FRONT_DESK_TRIGGER_IDS.breachFollowUpAggressiveBrief,
    targetId: FRONT_DESK_TRIGGER_IDS.breachFollowUpAggressiveBrief,
    mode: 'repeatable',
    description: 'Repeatable follow-up briefing that becomes available after an aggressive response is chosen.',
    when: {
      flags: {
        allFlags: [
          'containment.breach.followup_unlocked',
          {
            flagId: 'containment.breach.followup.response',
            equals: 'aggressive',
          },
        ],
      },
      progressClocks: [
        {
          clockId: PROGRESS_CLOCK_IDS.breachFollowUpPosture,
          threshold: 2,
        },
      ],
    },
  },
  {
    id: FRONT_DESK_TRIGGER_IDS.specialRecruitOpportunity,
    targetId: FRONT_DESK_TRIGGER_IDS.specialRecruitOpportunity,
    mode: 'one_shot',
    consumeId: 'recruit.special.frontdesk-opportunity',
    description:
      'Special front-desk recruit lead that should disappear once the lead is accepted or dismissed.',
    when: {
      predicates: [
        {
          id: 'special-recruit-present',
          test: ({ state }) =>
            state.candidates.some(
              (candidate) =>
                candidate.hireStatus === 'available' &&
                candidate.sourceDisposition !== 'adversarial' &&
                Boolean(candidate.sourceFactionId || candidate.sourceContactId)
            ),
        },
      ],
    },
  },
  {
    id: FRONT_DESK_TRIGGER_IDS.operationsDashboard,
    targetId: FRONT_DESK_TRIGGER_IDS.operationsDashboard,
    mode: 'repeatable',
    description: 'Location-based authored scene for the operations desk dashboard.',
    when: {
      location: {
        hubId: 'operations-desk',
        sceneId: 'dashboard',
      },
    },
  },
]

/**
 * Example authored trigger catalog for front-desk notices and scenes.
 * Higher layers can use trigger ids or target ids, then keep actual routing
 * and rendering in the existing view/router layer.
 */
export function getEligibleFrontDeskSceneTriggers(game: GameState) {
  return getEligibleSceneTriggers(game, FRONT_DESK_SCENE_TRIGGERS)
}

export function getEligibleFrontDeskSceneTriggerIds(game: GameState) {
  return getEligibleSceneTriggerIds(game, FRONT_DESK_SCENE_TRIGGERS)
}

export function getEligibleFrontDeskSceneTriggerIdSet(game: GameState) {
  return getEligibleSceneTriggerIdSet(game, FRONT_DESK_SCENE_TRIGGERS)
}
