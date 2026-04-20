import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { applyAuthoredChoice, type AuthoredChoiceDefinition } from '../domain/choiceSystem'
import { listQueuedRuntimeEvents } from '../domain/eventQueue'
import { readConsumedOneShotContent, readPersistentFlag } from '../domain/flagSystem'
import { getCurrentLocation, getProgressClock, readGameStateManager } from '../domain/gameStateManager'
import { PROGRESS_CLOCK_IDS } from '../domain/progressClocks'
import type { Candidate } from '../domain/recruitment/types'
import {
  buildBreachFollowUpChoices,
  buildHostileFactionResponseChoices,
  buildSpecialRecruitOpportunityChoices,
  buildWeeklyReportTutorialChoices,
} from '../features/operations/frontDeskChoices'
import {
  FRONT_DESK_TRIGGER_IDS,
  getEligibleFrontDeskSceneTriggerIds,
} from '../features/operations/frontDeskTriggers'
import { getFrontDeskBriefingView } from '../features/operations/frontDeskView'

function createSpecialRecruitCandidate(): Candidate {
  return {
    id: 'candidate_special_01',
    name: 'Ivy Marrow',
    age: 29,
    category: 'agent',
    hireStatus: 'available',
    revealLevel: 0,
    expiryWeek: 4,
    sourceFactionId: 'civic_watch',
    sourceFactionName: 'Civic Watch',
    sourceContactId: 'contact_ivy',
    sourceContactName: 'Handler Rook',
    sourceSummary: 'A vetted operative is available through a trusted civic channel.',
    sourceDisposition: 'supportive',
    evaluation: {
      overallVisible: false,
      potentialVisible: false,
      rumorTags: [],
    },
    agentData: {
      role: 'field',
      specialization: 'recon',
      traits: ['disciplined'],
    },
  }
}

describe('choiceSystem', () => {
  it('acknowledges and consumes a one-time front-desk notice without repeating', () => {
    const choice = buildWeeklyReportTutorialChoices()[0]
    const first = applyAuthoredChoice(createStartingState(), choice)
    const second = applyAuthoredChoice(first.state, choice)

    expect(first).toMatchObject({
      applied: true,
      choiceId: choice.id,
      nextTargetId: 'frontdesk.notice.weekly-report.returning',
      consumedOneShots: ['frontdesk.tutorial.weekly-report'],
    })
    expect(readPersistentFlag(first.state, 'frontdesk.tutorial.weekly-report.acknowledged')).toBe(true)
    expect(readConsumedOneShotContent(first.state, 'frontdesk.tutorial.weekly-report')).toMatchObject({
      source: 'frontdesk.notice',
    })
    expect(second.applied).toBe(false)
  })

  it('accepts or dismisses a special recruit opportunity deterministically', () => {
    const candidate = createSpecialRecruitCandidate()
    const accept = buildSpecialRecruitOpportunityChoices(candidate)[0]
    const dismiss = buildSpecialRecruitOpportunityChoices(candidate)[1]

    const state = createStartingState()
    state.candidates = [candidate]

    const accepted = applyAuthoredChoice(state, accept)
    const dismissed = applyAuthoredChoice(state, dismiss)

    expect(accepted).toMatchObject({
      applied: true,
      nextTargetId: 'frontdesk.notice.special-recruit.review',
      consumedOneShots: ['recruit.special.frontdesk-opportunity'],
    })
    expect(readPersistentFlag(accepted.state, 'recruit.special.frontdesk.response')).toBe('accepted')
    expect(readPersistentFlag(accepted.state, 'recruit.special.frontdesk.candidate-id')).toBe(candidate.id)
    expect(getCurrentLocation(accepted.state)).toMatchObject({
      hubId: 'recruitment',
      sceneId: 'special-recruit-review',
    })

    expect(dismissed.applied).toBe(true)
    expect(readPersistentFlag(dismissed.state, 'recruit.special.frontdesk.response')).toBe('dismissed')
    expect(readConsumedOneShotContent(dismissed.state, 'recruit.special.frontdesk-opportunity')).toBeTruthy()
  })

  it('applies cautious and aggressive breach follow-up responses with different consequences', () => {
    let base = createStartingState()
    base = {
      ...base,
      runtimeState: {
        ...base.runtimeState!,
        oneShotEvents: {},
      },
    }
    base = {
      ...base,
      runtimeState: {
        ...base.runtimeState!,
        globalFlags: {
          ...base.runtimeState!.globalFlags,
          'containment.breach.followup_unlocked': true,
        },
      },
    }

    const [cautiousChoice, aggressiveChoice] = buildBreachFollowUpChoices()
    const cautious = applyAuthoredChoice(base, cautiousChoice)
    const aggressive = applyAuthoredChoice(base, aggressiveChoice)

    expect(readPersistentFlag(cautious.state, 'containment.breach.followup.response')).toBe('cautious')
    expect(readPersistentFlag(aggressive.state, 'containment.breach.followup.response')).toBe('aggressive')
    expect(getProgressClock(cautious.state, PROGRESS_CLOCK_IDS.breachFollowUpPosture)).toMatchObject({
      label: 'Breach Follow-Up Posture',
      value: 1,
      max: 3,
    })
    expect(getProgressClock(aggressive.state, PROGRESS_CLOCK_IDS.breachFollowUpPosture)).toMatchObject({
      label: 'Breach Follow-Up Posture',
      value: 2,
      max: 3,
    })
    expect(readGameStateManager(cautious.state).encounterState['containment.breach.followup']?.phase).toBe('cautious')
    expect(readGameStateManager(aggressive.state).encounterState['containment.breach.followup']?.phase).toBe('aggressive')
    expect(cautious.followUpIds).toContain('containment.breach.followup.cautious-brief')
    expect(aggressive.followUpIds).toContain('containment.breach.followup.aggressive-brief')
    expect(listQueuedRuntimeEvents(cautious.state).map((event) => event.targetId)).toContain(
      'containment.breach.followup.cautious-brief'
    )
    expect(listQueuedRuntimeEvents(aggressive.state).map((event) => event.targetId)).toContain(
      'containment.breach.followup.aggressive-brief'
    )
    expect(getEligibleFrontDeskSceneTriggerIds(cautious.state)).toContain(
      FRONT_DESK_TRIGGER_IDS.breachFollowUpCautiousBrief
    )
    expect(getEligibleFrontDeskSceneTriggerIds(aggressive.state)).toContain(
      FRONT_DESK_TRIGGER_IDS.breachFollowUpAggressiveBrief
    )
  })

  it('sets a hostile-faction response flag and routes to follow-up content', () => {
    const state = createStartingState()
    state.factions!.occult_networks.reputation = -80

    const initialView = getFrontDeskBriefingView(state)
    const hostileNotice = initialView.notices.find((notice) => notice.id === 'hostile-faction-alert')

    expect(hostileNotice).toBeDefined()

    const hostileChoice = buildHostileFactionResponseChoices({
      id: 'occult_networks',
      label: 'Occult Networks',
    })[0]
    const result = applyAuthoredChoice(state, hostileChoice)
    const followUpView = getFrontDeskBriefingView(result.state)

    expect(result).toMatchObject({
      applied: true,
      nextTargetId: 'frontdesk.notice.faction.occult_networks.response',
      followUpIds: ['frontdesk.faction.occult_networks.response'],
    })
    expect(readPersistentFlag(result.state, 'faction.occult_networks.frontdesk-response')).toBe('containment')
    expect(followUpView.notices.some((notice) => notice.id === 'hostile-faction-response')).toBe(true)
  })

  it('supports inline authored choice definitions without widening into unrelated sim commands', () => {
    const choice: AuthoredChoiceDefinition = {
      id: 'frontdesk.warning.breach.acknowledge',
      label: 'Acknowledge',
      when: {
        flags: {
          availableOneShots: ['frontdesk.warning.breach'],
        },
      },
      nextTargetId: 'frontdesk.warning.breach.cleared',
      consequences: [
        {
          type: 'set_flag',
          flagId: 'frontdesk.warning.breach.acknowledged',
          value: true,
        },
        {
          type: 'consume_one_shot',
          contentId: 'frontdesk.warning.breach',
          source: 'frontdesk.warning',
        },
      ],
    }

    const result = applyAuthoredChoice(createStartingState(), choice)

    expect(result).toMatchObject({
      applied: true,
      nextTargetId: 'frontdesk.warning.breach.cleared',
      consumedOneShots: ['frontdesk.warning.breach'],
      changedFlags: ['frontdesk.warning.breach.acknowledged'],
    })
  })

  it('queues emitted follow-up ids in deterministic order across authored actions', () => {
    const firstChoice: AuthoredChoiceDefinition = {
      id: 'frontdesk.followup.alpha',
      label: 'Alpha',
      consequences: [
        {
          type: 'emit_follow_up',
          followUpId: 'followup.alpha',
        },
      ],
    }
    const secondChoice: AuthoredChoiceDefinition = {
      id: 'frontdesk.followup.beta',
      label: 'Beta',
      consequences: [
        {
          type: 'emit_follow_up',
          followUpId: 'followup.beta',
        },
      ],
    }

    const first = applyAuthoredChoice(createStartingState(), firstChoice, {
      activeContextId: 'frontdesk.notice.alpha',
    })
    const second = applyAuthoredChoice(first.state, secondChoice, {
      activeContextId: 'frontdesk.notice.beta',
    })

    expect(listQueuedRuntimeEvents(second.state).map((entry) => entry.targetId)).toEqual([
      'followup.alpha',
      'followup.beta',
    ])
  })
})
