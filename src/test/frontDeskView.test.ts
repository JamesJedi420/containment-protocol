import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { applyAuthoredChoice } from '../domain/choiceSystem'
import { buildCourierNetworkCapacityGapReport } from '../domain/capabilityGap'
import { consumeOneShotContent, setPersistentFlag } from '../domain/flagSystem'
import type { Candidate } from '../domain/recruitment/types'
import type { CourierShellFrontState, GameState } from '../domain/models'
import {
  OFF_BOOKS_COURIER_LOCKOUT_TAG,
} from '../domain/sim/downtimeSideWork'
import { openCourierShellFront } from '../domain/sim/frontBusiness'
import { normalizeGameState } from '../domain/teamSimulation'
import {
  buildCourierNetworkCapacityOpportunityCard,
  getFrontDeskBriefingView,
  getFrontDeskHubView,
} from '../features/operations/frontDeskView'
import {
  FRONT_DESK_TRIGGER_IDS,
  getEligibleFrontDeskSceneTriggerIds,
} from '../features/operations/frontDeskTriggers'
import { withPaidCourierAndFunding } from './fixtures/withPaidCourierAndFunding'

function createSponsoredCandidate(): Candidate {
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

describe('frontDeskView', () => {
  it('routes from the one-time weekly report tutorial to the returning report notice after consumption', () => {
    let state = createStartingState()
    const tutorialChoice = getFrontDeskBriefingView(state).notices[0]?.choices?.[0]

    expect(getFrontDeskBriefingView(state).notices[0]).toMatchObject({
      id: 'weekly-report-tutorial',
      actionTarget: 'report',
    })
    expect(tutorialChoice?.id).toBe('frontdesk.notice.weekly-report.acknowledge')

    state = applyAuthoredChoice(state, tutorialChoice!, {
      activeContextId: 'frontdesk.notice.weekly-report-tutorial',
    }).state

    expect(getFrontDeskBriefingView(state).notices[0]).toMatchObject({
      id: 'weekly-report-returning',
      actionTarget: 'report',
    })
    expect(getFrontDeskBriefingView(state).notices[0]?.body).toContain(
      'Tutorial prompts are now retired'
    )
    expect(getEligibleFrontDeskSceneTriggerIds(state)).not.toContain(
      FRONT_DESK_TRIGGER_IDS.weeklyReportTutorial
    )
  })

  it('prioritizes queued breach follow-up content over default/open notice variants', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'containment.breach.followup_unlocked', true)

    const openNotice = getFrontDeskBriefingView(state).notices.find(
      (notice) => notice.id === 'breach-follow-up-open'
    )
    const cautiousChoice = openNotice?.choices?.find(
      (choice) => choice.id === 'frontdesk.notice.breach-follow-up.cautious'
    )

    expect(cautiousChoice?.id).toBe('frontdesk.notice.breach-follow-up.cautious')

    state = applyAuthoredChoice(state, cautiousChoice!, {
      activeContextId: 'frontdesk.notice.breach-follow-up-open',
    }).state

    const noticeIds = getFrontDeskBriefingView(state).notices.map((notice) => notice.id)
    expect(noticeIds).toContain('breach-follow-up-queued')
  })

  it('uses a progress-threshold director message after aggressive breach posture is chosen', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'containment.breach.followup_unlocked', true)

    const openNotice = getFrontDeskBriefingView(state).notices.find(
      (notice) => notice.id === 'breach-follow-up-open'
    )
    const aggressiveChoice = openNotice?.choices?.find(
      (choice) => choice.id === 'frontdesk.notice.breach-follow-up.aggressive'
    )

    expect(aggressiveChoice?.id).toBe('frontdesk.notice.breach-follow-up.aggressive')

    state = applyAuthoredChoice(state, aggressiveChoice!, {
      activeContextId: 'frontdesk.notice.breach-follow-up-open',
    }).state

    expect(getFrontDeskBriefingView(state).directorMessage).toContain(
      'Breach follow-up posture is escalating'
    )
  })

  it('switches director message variant when hostile faction pressure is active', () => {
    const state = createStartingState()
    state.factions!.occult_networks.reputation = -80

    expect(getFrontDeskBriefingView(state).directorMessage).toContain(
      'Hostile external actors are actively probing'
    )
  })

  it('shows breach follow-up alerts only while unlocked and unconsumed', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'containment.breach.followup_unlocked', true)

    expect(getFrontDeskBriefingView(state).notices.some((notice) => notice.id === 'breach-follow-up-open')).toBe(true)

    state = consumeOneShotContent(
      state,
      'containment.breach.followup_alert',
      'frontdesk_notice'
    ).state

    expect(getFrontDeskBriefingView(state).notices.some((notice) => notice.id === 'breach-follow-up-open')).toBe(false)
  })

  it('shows a hostile-faction notice when the strategic layer turns adversarial', () => {
    const state = createStartingState()
    state.factions!.occult_networks.reputation = -80

    expect(getFrontDeskBriefingView(state).notices.some((notice) => notice.id === 'hostile-faction-alert')).toBe(true)
  })

  it('threads faction posture into the campaign standing summary without duplicating simulation logic', () => {
    const state = createStartingState()
    state.factions!.occult_networks.reputation = -80

    const hub = getFrontDeskHubView(state)

    expect(hub.standingSummary.summary).toContain('Occult Networks')
    expect(
      hub.standingSummary.details.some((detail) => /hostile pressure:/i.test(detail))
    ).toBe(true)
    expect(
      hub.standingSummary.details.some((detail) => /hidden faction effects remain unresolved/i.test(detail))
    ).toBe(true)
    expect(hub.standingSummary.links.some((link) => link.href === '/factions')).toBe(true)
  })

  it('shows a special recruit notice for supportive sourced candidates', () => {
    const state = createStartingState()
    state.candidates = [createSponsoredCandidate()]

    expect(getFrontDeskBriefingView(state).notices.some((notice) => notice.id === 'special-recruit-opportunity')).toBe(true)
  })

  it('hides special recruit notices after a consuming choice spends the one-shot', () => {
    let state = createStartingState()
    state.candidates = [createSponsoredCandidate()]

    const notice = getFrontDeskBriefingView(state).notices.find(
      (entry) => entry.id === 'special-recruit-opportunity'
    )
    const dismissChoice = notice?.choices?.find(
      (choice) => choice.id === 'frontdesk.notice.special-recruit.dismiss'
    )

    expect(dismissChoice?.id).toBe('frontdesk.notice.special-recruit.dismiss')

    state = applyAuthoredChoice(state, dismissChoice!, {
      activeContextId: 'frontdesk.notice.special-recruit-opportunity',
    }).state

    expect(
      getFrontDeskBriefingView(state).notices.some(
        (entry) => entry.id === 'special-recruit-opportunity'
      )
    ).toBe(false)
    expect(getEligibleFrontDeskSceneTriggerIds(state)).not.toContain(
      FRONT_DESK_TRIGGER_IDS.specialRecruitOpportunity
    )
  })
})

describe('SPE-31a hub courier capacity opportunity card', () => {
  it('returns null when the courier gap report has no unresolved gap', () => {
    const opened = openCourierShellFront(withPaidCourierAndFunding(createStartingState(), 12000))
    const report = buildCourierNetworkCapacityGapReport(opened)
    expect(buildCourierNetworkCapacityOpportunityCard(report)).toBeNull()
  })

  it('returns a danger card for below-required gaps with mitigation labels', () => {
    const game = withPaidCourierAndFunding(createStartingState(), 9000)
    const card = buildCourierNetworkCapacityOpportunityCard(buildCourierNetworkCapacityGapReport(game))
    expect(card).not.toBeNull()
    expect(card!.tone).toBe('danger')
    expect(card!.gapKindLabel).toBe('Below immediate floor')
    expect(card!.mitigationLabels.length).toBeGreaterThanOrEqual(2)
    expect(card!.capacityLine).toMatch(/Current \d+ · Immediate floor \d+ · Structural target \d+/)
  })

  it('returns a warning card for below-desired-only structural gaps', () => {
    const opened = openCourierShellFront(withPaidCourierAndFunding(createStartingState(), 12000))
    const agentId = Object.keys(opened.agents)[0]!
    const strainedWithLockout: GameState = normalizeGameState({
      ...opened,
      agency: {
        ...opened.agency!,
        courierShellFront: {
          ...(opened.agency!.courierShellFront as CourierShellFrontState),
          status: 'strained',
        },
      },
      agents: {
        ...opened.agents,
        [agentId]: {
          ...opened.agents[agentId]!,
          tags: [...opened.agents[agentId]!.tags, OFF_BOOKS_COURIER_LOCKOUT_TAG],
        },
      },
    })
    const card = buildCourierNetworkCapacityOpportunityCard(
      buildCourierNetworkCapacityGapReport(strainedWithLockout),
    )
    expect(card).not.toBeNull()
    expect(card!.tone).toBe('warning')
    expect(card!.gapKindLabel).toBe('Below structural target')
  })

  it('does not mutate game state when building the hub view', () => {
    const game = withPaidCourierAndFunding(createStartingState(), 9000)
    const frozen = structuredClone(game)
    getFrontDeskHubView(game)
    expect(game).toEqual(frozen)
  })
})
