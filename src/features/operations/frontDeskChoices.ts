import type { AuthoredChoiceDefinition } from '../../domain/choiceSystem'
import type { FactionState } from '../../domain/factions'
import { PROGRESS_CLOCK_IDS } from '../../domain/progressClocks'
import type { Candidate } from '../../domain/recruitment/types'

export function buildWeeklyReportTutorialChoices(): AuthoredChoiceDefinition[] {
  return [
    {
      id: 'frontdesk.notice.weekly-report.acknowledge',
      label: 'Acknowledge',
      description: 'Mark the opening report tutorial as seen and return to the standard report cadence.',
      when: {
        flags: {
          availableOneShots: ['frontdesk.tutorial.weekly-report'],
        },
      },
      nextTargetId: 'frontdesk.notice.weekly-report.returning',
      consequences: [
        {
          type: 'consume_one_shot',
          contentId: 'frontdesk.tutorial.weekly-report',
          source: 'frontdesk.notice',
        },
        {
          type: 'set_flag',
          flagId: 'frontdesk.tutorial.weekly-report.acknowledged',
          value: true,
        },
        {
          type: 'record_scene_visit',
          entry: {
            locationId: 'operations-desk',
            sceneId: 'weekly-report-tutorial',
            outcome: 'acknowledged',
            tags: ['frontdesk', 'tutorial', 'report'],
          },
        },
      ],
    },
  ]
}

export function buildBreachFollowUpChoices(): AuthoredChoiceDefinition[] {
  return [
    {
      id: 'frontdesk.notice.breach-follow-up.cautious',
      label: 'Choose Cautious Posture',
      tone: 'warning',
      description: 'Bias the follow-up toward containment discipline and survivability.',
      when: {
        flags: {
          allFlags: ['containment.breach.followup_unlocked'],
          availableOneShots: ['containment.breach.followup_alert'],
        },
      },
      nextTargetId: 'frontdesk.notice.breach-follow-up.cautious-brief',
      consequences: [
        {
          type: 'set_flag',
          flagId: 'containment.breach.followup.response',
          value: 'cautious',
        },
        {
          type: 'consume_one_shot',
          contentId: 'containment.breach.followup_alert',
          source: 'frontdesk.notice',
        },
        {
          type: 'advance_progress_clock',
          clockId: PROGRESS_CLOCK_IDS.breachFollowUpPosture,
          delta: 1,
        },
        {
          type: 'patch_encounter',
          encounterId: 'containment.breach.followup',
          patch: {
            status: 'active',
            phase: 'cautious',
            flags: {
              cautious: true,
              aggressive: false,
            },
          },
        },
        {
          type: 'emit_follow_up',
          followUpId: 'containment.breach.followup.cautious-brief',
        },
      ],
    },
    {
      id: 'frontdesk.notice.breach-follow-up.aggressive',
      label: 'Choose Aggressive Posture',
      tone: 'danger',
      description: 'Push tempo now and accept the operational risk of a harder follow-up posture.',
      when: {
        flags: {
          allFlags: ['containment.breach.followup_unlocked'],
          availableOneShots: ['containment.breach.followup_alert'],
        },
      },
      nextTargetId: 'frontdesk.notice.breach-follow-up.aggressive-brief',
      consequences: [
        {
          type: 'set_flag',
          flagId: 'containment.breach.followup.response',
          value: 'aggressive',
        },
        {
          type: 'consume_one_shot',
          contentId: 'containment.breach.followup_alert',
          source: 'frontdesk.notice',
        },
        {
          type: 'advance_progress_clock',
          clockId: PROGRESS_CLOCK_IDS.breachFollowUpPosture,
          delta: 2,
        },
        {
          type: 'patch_encounter',
          encounterId: 'containment.breach.followup',
          patch: {
            status: 'active',
            phase: 'aggressive',
            flags: {
              cautious: false,
              aggressive: true,
            },
          },
        },
        {
          type: 'emit_follow_up',
          followUpId: 'containment.breach.followup.aggressive-brief',
        },
      ],
    },
  ]
}

export function buildSpecialRecruitOpportunityChoices(
  candidate: Pick<Candidate, 'id' | 'name'>
): AuthoredChoiceDefinition[] {
  return [
    {
      id: 'frontdesk.notice.special-recruit.accept',
      label: 'Accept Lead',
      tone: 'success',
      description: 'Move to recruitment and preserve the opportunity for immediate review.',
      when: {
        flags: {
          availableOneShots: ['recruit.special.frontdesk-opportunity'],
        },
      },
      nextTargetId: 'frontdesk.notice.special-recruit.review',
      consequences: [
        {
          type: 'set_flag',
          flagId: 'recruit.special.frontdesk.response',
          value: 'accepted',
        },
        {
          type: 'set_flag',
          flagId: 'recruit.special.frontdesk.candidate-id',
          value: candidate.id,
        },
        {
          type: 'consume_one_shot',
          contentId: 'recruit.special.frontdesk-opportunity',
          source: 'frontdesk.notice',
        },
        {
          type: 'set_location',
          location: {
            hubId: 'recruitment',
            locationId: 'recruitment-board',
            sceneId: 'special-recruit-review',
          },
        },
        {
          type: 'record_scene_visit',
          entry: {
            locationId: 'recruitment-board',
            sceneId: 'special-recruit-review',
            outcome: `accepted-${candidate.id}`,
            tags: ['frontdesk', 'recruitment', 'special-recruit'],
          },
        },
        {
          type: 'emit_follow_up',
          followUpId: 'recruit.special.frontdesk.review',
        },
      ],
    },
    {
      id: 'frontdesk.notice.special-recruit.dismiss',
      label: 'Dismiss Lead',
      tone: 'neutral',
      description: 'Close the alert and leave the opportunity out of front-desk circulation.',
      when: {
        flags: {
          availableOneShots: ['recruit.special.frontdesk-opportunity'],
        },
      },
      nextTargetId: 'frontdesk.notice.special-recruit.dismissed',
      consequences: [
        {
          type: 'set_flag',
          flagId: 'recruit.special.frontdesk.response',
          value: 'dismissed',
        },
        {
          type: 'set_flag',
          flagId: 'recruit.special.frontdesk.candidate-id',
          value: candidate.id,
        },
        {
          type: 'consume_one_shot',
          contentId: 'recruit.special.frontdesk-opportunity',
          source: 'frontdesk.notice',
        },
        {
          type: 'emit_follow_up',
          followUpId: 'recruit.special.frontdesk.dismissed',
        },
      ],
    },
  ]
}

export function buildHostileFactionResponseChoices(
  faction: Pick<FactionState, 'id' | 'label'>
): AuthoredChoiceDefinition[] {
  return [
    {
      id: `frontdesk.notice.faction.${faction.id}.counter-posture`,
      label: 'Set Counter-Intelligence Posture',
      tone: 'warning',
      description: `Commit the front desk to a containment-focused response plan against ${faction.label}.`,
      when: {
        flags: {
          noFlags: [
            {
              flagId: `faction.${faction.id}.frontdesk-response`,
              equals: 'containment',
            },
          ],
        },
      },
      nextTargetId: `frontdesk.notice.faction.${faction.id}.response`,
      consequences: [
        {
          type: 'set_flag',
          flagId: `faction.${faction.id}.frontdesk-response`,
          value: 'containment',
        },
        {
          type: 'emit_follow_up',
          followUpId: `frontdesk.faction.${faction.id}.response`,
        },
      ],
    },
  ]
}
