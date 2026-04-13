import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { applyAuthoredChoice } from '../domain/choiceSystem'
import { setPersistentFlag } from '../domain/flagSystem'
import { setCurrentLocation } from '../domain/gameStateManager'
import {
  evaluateSceneTrigger,
  fireSceneTrigger,
  getEligibleSceneTriggerIds,
  type SceneTriggerDefinition,
} from '../domain/sceneTriggers'
import { getFrontDeskBriefingView } from '../features/operations/frontDeskView'
import { buildBreachFollowUpChoices } from '../features/operations/frontDeskChoices'
import {
  FRONT_DESK_TRIGGER_IDS,
  FRONT_DESK_SCENE_TRIGGERS,
  getEligibleFrontDeskSceneTriggerIds,
} from '../features/operations/frontDeskTriggers'

describe('sceneTriggers', () => {
  it('evaluates eligibility from flags and location without side effects', () => {
    const trigger: SceneTriggerDefinition = {
      id: 'frontdesk.notice.breach-follow-up-open',
      targetId: 'frontdesk.notice.breach-follow-up-open',
      mode: 'one_shot',
      consumeId: 'containment.breach.followup_alert',
      when: {
        flags: {
          allFlags: ['containment.breach.followup_unlocked'],
        },
        location: {
          hubId: 'operations-desk',
          sceneId: 'dashboard',
        },
      },
    }

    let state = createStartingState()

    const blocked = evaluateSceneTrigger(state, trigger)

    expect(blocked).toMatchObject({
      triggerId: trigger.id,
      eligible: false,
      alreadyConsumed: false,
    })
    expect(blocked.conditionEvaluation?.flagEvaluation?.missingAllFlags).toEqual([
      'containment.breach.followup_unlocked',
    ])

    state = setPersistentFlag(state, 'containment.breach.followup_unlocked', true)

    const eligible = evaluateSceneTrigger(state, trigger)

    expect(eligible).toMatchObject({
      triggerId: trigger.id,
      eligible: true,
      alreadyConsumed: false,
      consumeId: 'containment.breach.followup_alert',
    })
    expect(state.runtimeState?.oneShotEvents['containment.breach.followup_alert']).toBeUndefined()
  })

  it('fires one-shot triggers once and prevents repeat firing after consumption', () => {
    const trigger: SceneTriggerDefinition = {
      id: 'frontdesk.notice.breach-follow-up-open',
      targetId: 'frontdesk.notice.breach-follow-up-open',
      mode: 'one_shot',
      consumeId: 'containment.breach.followup_alert',
      when: {
        flags: {
          allFlags: ['containment.breach.followup_unlocked'],
        },
      },
    }

    let state = createStartingState()
    state = setPersistentFlag(state, 'containment.breach.followup_unlocked', true)

    const first = fireSceneTrigger(state, trigger, undefined, 'frontdesk.notice')

    expect(first).toMatchObject({
      fired: true,
      consumed: true,
      eligible: true,
    })
    expect(first.state.runtimeState?.oneShotEvents['containment.breach.followup_alert']?.source).toBe(
      'frontdesk.notice'
    )

    const second = fireSceneTrigger(first.state, trigger, undefined, 'frontdesk.notice')

    expect(second).toMatchObject({
      fired: false,
      consumed: false,
      eligible: false,
      alreadyConsumed: true,
    })
  })

  it('keeps repeatable triggers eligible without mutating state when fired', () => {
    const trigger: SceneTriggerDefinition = {
      id: 'frontdesk.scene.operations-dashboard',
      targetId: 'frontdesk.scene.operations-dashboard',
      mode: 'repeatable',
      when: {
        location: {
          hubId: 'operations-desk',
          sceneId: 'dashboard',
        },
      },
    }

    const state = createStartingState()

    const first = fireSceneTrigger(state, trigger)
    const second = fireSceneTrigger(state, trigger)

    expect(first).toMatchObject({
      fired: true,
      consumed: false,
      eligible: true,
      mode: 'repeatable',
    })
    expect(first.state).toBe(state)
    expect(second.state).toBe(state)
  })

  it('supports follow-up triggers after authored choices while keeping routing separate', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'containment.breach.followup_unlocked', true)

    const cautiousChoice = buildBreachFollowUpChoices()[0]
    const result = applyAuthoredChoice(state, cautiousChoice, {
      activeContextId: 'frontdesk.notice.breach-follow-up-open',
    })

    const eligibleTriggerIds = getEligibleFrontDeskSceneTriggerIds(result.state)

    expect(eligibleTriggerIds).toContain('frontdesk.notice.breach-follow-up.cautious-brief')
    expect(eligibleTriggerIds).not.toContain(FRONT_DESK_TRIGGER_IDS.breachFollowUpOpen)
    expect(
      getFrontDeskBriefingView(result.state).notices.some(
        (notice) => notice.id === 'breach-follow-up-queued'
      )
    ).toBe(true)
    expect(
      getFrontDeskBriefingView(result.state).notices.some((notice) => notice.id === 'breach-follow-up-open')
    ).toBe(false)
  })

  it('supports example front-desk triggers for one-shot and location-based activation', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'containment.breach.followup_unlocked', true)

    expect(getEligibleFrontDeskSceneTriggerIds(state)).toEqual(
      expect.arrayContaining([
        'frontdesk.notice.weekly-report-tutorial',
        'frontdesk.notice.breach-follow-up-open',
        'frontdesk.scene.operations-dashboard',
      ])
    )

    state = fireSceneTrigger(state, FRONT_DESK_SCENE_TRIGGERS[1], undefined, 'frontdesk.notice').state
    state = setCurrentLocation(state, {
      hubId: 'recruitment',
      locationId: 'recruitment-board',
      sceneId: 'candidate-sweep',
    })

    const eligibleTriggerIds = getEligibleSceneTriggerIds(state, FRONT_DESK_SCENE_TRIGGERS)

    expect(eligibleTriggerIds).not.toContain('frontdesk.notice.breach-follow-up-open')
    expect(eligibleTriggerIds).not.toContain('frontdesk.scene.operations-dashboard')
  })

  it('keeps special recruit trigger eligibility aligned with front-desk notice redisplay rules', () => {
    const state = createStartingState()
    state.candidates = [
      {
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
      },
    ]

    expect(getEligibleFrontDeskSceneTriggerIds(state)).toContain(
      FRONT_DESK_TRIGGER_IDS.specialRecruitOpportunity
    )
    expect(
      getFrontDeskBriefingView(state).notices.some(
        (notice) => notice.id === 'special-recruit-opportunity'
      )
    ).toBe(true)

    const choice = getFrontDeskBriefingView(state).notices
      .find((notice) => notice.id === 'special-recruit-opportunity')
      ?.choices?.find((entry) => entry.id === 'frontdesk.notice.special-recruit.dismiss')

    const result = applyAuthoredChoice(state, choice!, {
      activeContextId: 'frontdesk.notice.special-recruit-opportunity',
    })

    expect(getEligibleFrontDeskSceneTriggerIds(result.state)).not.toContain(
      FRONT_DESK_TRIGGER_IDS.specialRecruitOpportunity
    )
    expect(
      getFrontDeskBriefingView(result.state).notices.some(
        (notice) => notice.id === 'special-recruit-opportunity'
      )
    ).toBe(false)
  })
})
