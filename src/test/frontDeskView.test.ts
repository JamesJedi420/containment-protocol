import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { getCanonicalFundingState, placeProcurementOrder } from '../domain/funding'
import { refreshContractBoard, getContractOffers, launchContract } from '../domain/contracts'
import { assignTeam } from '../domain/sim/assign'
import { applyAuthoredChoice } from '../domain/choiceSystem'
import { buildCourierNetworkCapacityGapReport } from '../domain/capabilityGap'
import { consumeOneShotContent, setPersistentFlag } from '../domain/flagSystem'
import type { Candidate } from '../domain/recruitment/types'
import type { CourierShellFrontState, GameState } from '../domain/models'
import { OFF_BOOKS_COURIER_LOCKOUT_TAG } from '../domain/sim/downtimeSideWork'
import { openCourierShellFront } from '../domain/sim/frontBusiness'
import { normalizeGameState } from '../domain/teamSimulation'
import { getProcurementListings } from '../domain/market'
import { DISCLOSURE_PROGRESSION_FIXTURE } from '../domain/publicDisclosureStateRegistry'
import {
  buildPublicDisclosurePostureChoices,
} from '../features/operations/frontDeskChoices'
import {
  buildCourierNetworkCapacityOpportunityCard,
  buildProcurementPressureOpportunityCard,
  buildStaffingReadinessOpportunityCard,
  buildStrategicActionBudgetOpportunityCard,
  getFrontDeskBriefingView,
  getFrontDeskHubView,
} from '../features/operations/frontDeskView'
import { getOperationsReportView } from '../features/report/operationsReportView'
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

function withProcurementBacklog(game: GameState, requestedWeek: number): GameState {
  const listing = getProcurementListings(game).find((candidate) => candidate.accessAvailable)
  if (!listing) {
    throw new Error('Expected at least one accessible procurement listing.')
  }

  const fundingState = placeProcurementOrder(getCanonicalFundingState(game), {
    requestId: `test-procurement-${requestedWeek}`,
    itemId: listing.itemId,
    quantity: listing.bundleQuantity,
    requestedWeek,
    cost: 1,
  })

  return normalizeGameState({
    ...game,
    agency: {
      ...game.agency!,
      fundingState,
    },
  })
}

function withLostAgents(game: GameState, count: number): GameState {
  const agents = { ...game.agents }
  for (const agentId of Object.keys(agents).slice(0, count)) {
    agents[agentId] = {
      ...agents[agentId]!,
      attritionState: {
        attritionStatus: 'lost',
        lossReasonCodes: ['test-loss'],
        replacementPriority: 1,
        retentionPressure: 0,
      },
    }
  }

  return normalizeGameState({
    ...game,
    agents,
  })
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

    expect(
      getFrontDeskBriefingView(state).notices.some(
        (notice) => notice.id === 'breach-follow-up-open'
      )
    ).toBe(true)

    state = consumeOneShotContent(
      state,
      'containment.breach.followup_alert',
      'frontdesk_notice'
    ).state

    expect(
      getFrontDeskBriefingView(state).notices.some(
        (notice) => notice.id === 'breach-follow-up-open'
      )
    ).toBe(false)
  })

  it('shows a hostile-faction notice when the strategic layer turns adversarial', () => {
    const state = createStartingState()
    state.factions!.occult_networks.reputation = -80

    expect(
      getFrontDeskBriefingView(state).notices.some(
        (notice) => notice.id === 'hostile-faction-alert'
      )
    ).toBe(true)
  })

  it('threads faction posture into the campaign standing summary without duplicating simulation logic', () => {
    const state = createStartingState()
    state.factions!.occult_networks.reputation = -80

    const hub = getFrontDeskHubView(state)

    expect(hub.standingSummary.summary).toContain('Occult Networks')
    expect(hub.standingSummary.details.some((detail) => /hostile pressure:/i.test(detail))).toBe(
      true
    )
    expect(
      hub.standingSummary.details.some((detail) =>
        /hidden faction effects remain unresolved/i.test(detail)
      )
    ).toBe(true)
    expect(hub.standingSummary.links.some((link) => link.href === '/factions')).toBe(true)
  })

  it('surfaces SPE-1734 campaign ledger lines on the hub view for the Front Desk consumer', () => {
    const hub = getFrontDeskHubView(createStartingState())
    expect(hub.campaignRulesSummary.title).toMatch(/rules ledger/i)
    expect(hub.campaignRulesSummary.lines.some((line) => line.includes('Mid-Atlantic'))).toBe(true)
    expect(hub.campaignRulesSummary.compatibilitySummary).toMatch(/Compatibility/i)
    expect(hub.campaignRulesSummary.activeModuleLabels.length).toBeGreaterThanOrEqual(2)
  })

  it('shows a special recruit notice for supportive sourced candidates', () => {
    const state = createStartingState()
    state.candidates = [createSponsoredCandidate()]

    expect(
      getFrontDeskBriefingView(state).notices.some(
        (notice) => notice.id === 'special-recruit-opportunity'
      )
    ).toBe(true)
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

  it('surfaces disclosure posture notices only for active campaigns without a selected posture', () => {
    const inactive = createStartingState()
    expect(
      getFrontDeskBriefingView(inactive).notices.some((notice) =>
        notice.id.startsWith('disclosure-posture-')
      )
    ).toBe(false)

    const activeWithoutPosture = createStartingState()
    activeWithoutPosture.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }

    const notice = getFrontDeskBriefingView(activeWithoutPosture).notices.find(
      (entry) => entry.id === `disclosure-posture-${DISCLOSURE_PROGRESSION_FIXTURE.id}`
    )

    expect(notice).toMatchObject({
      title: 'Disclosure posture decision required',
      tone: 'warning',
      actionTarget: 'disclosure',
    })
    expect(notice?.choices?.map((choice) => choice.id)).toEqual(
      buildPublicDisclosurePostureChoices(
        DISCLOSURE_PROGRESSION_FIXTURE.id,
        DISCLOSURE_PROGRESSION_FIXTURE.label
      ).map((choice) => choice.id)
    )
    expect(notice?.body).toContain(DISCLOSURE_PROGRESSION_FIXTURE.label)
    expect(notice?.body).not.toMatch(/\b0\.\d+\b/)
  })

  it('clears disclosure posture notices after an authored choice sets posture', () => {
    let state = createStartingState()
    state.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }

    const notice = getFrontDeskBriefingView(state).notices.find(
      (entry) => entry.id === `disclosure-posture-${DISCLOSURE_PROGRESSION_FIXTURE.id}`
    )
    const transparentChoice = notice?.choices?.find((choice) =>
      choice.id.endsWith('.transparent')
    )

    expect(transparentChoice?.id).toBe(
      `frontdesk.notice.disclosure-posture.${DISCLOSURE_PROGRESSION_FIXTURE.id}.transparent`
    )

    state = applyAuthoredChoice(state, transparentChoice!, {
      activeContextId: `frontdesk.notice.disclosure-posture-${DISCLOSURE_PROGRESSION_FIXTURE.id}`,
    }).state

    expect(
      getFrontDeskBriefingView(state).notices.some((entry) =>
        entry.id.startsWith('disclosure-posture-')
      )
    ).toBe(false)
    expect(state.publicDisclosurePostureChoices?.[DISCLOSURE_PROGRESSION_FIXTURE.id]).toBe(
      'transparent'
    )
  })

  it('keeps disclosure posture notices hidden when posture is already set', () => {
    const state = createStartingState()
    state.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }
    state.publicDisclosurePostureChoices = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: 'managed_secrecy',
    }

    expect(
      getFrontDeskBriefingView(state).notices.some((notice) =>
        notice.id.startsWith('disclosure-posture-')
      )
    ).toBe(false)
  })
})

describe('SPE-31a hub courier capacity opportunity card', () => {
  it('returns no procurement pressure opportunity when procurement lanes are clear', () => {
    expect(buildProcurementPressureOpportunityCard(createStartingState())).toBeNull()
    expect(getFrontDeskHubView(createStartingState()).procurementPressureOpportunity).toBeNull()
  })

  it('returns a deterministic warning card for pending procurement backlog', () => {
    const game = withProcurementBacklog(createStartingState(), 1)
    const card = buildProcurementPressureOpportunityCard(game)

    expect(card).toMatchObject({
      id: 'procurement-pressure',
      tone: 'warning',
      severityLabel: 'Queued',
      primaryHref: '/markets-suppliers',
      primaryLinkLabel: 'Open procurement',
    })
    expect(card?.summary).toContain('1 supplier request pending')
    expect(card?.details.join(' ')).toMatch(/remain in the procurement backlog/i)
  })

  it('returns a deterministic danger card for stale procurement backlog', () => {
    const game = withProcurementBacklog({ ...createStartingState(), week: 99 }, 1)
    const card = getFrontDeskHubView(game).procurementPressureOpportunity

    expect(card).toMatchObject({
      id: 'procurement-pressure',
      tone: 'danger',
      severityLabel: 'Stale backlog',
      primaryHref: '/markets-suppliers',
    })
    expect(card?.summary).toContain('1 stale request')
    expect(card?.details.join(' ')).toMatch(/expected supplier handoff window/i)
  })

  it('returns no staffing readiness opportunity when staffing and readiness pressure are clear', () => {
    expect(buildStaffingReadinessOpportunityCard(createStartingState())).toBeNull()
    expect(getFrontDeskHubView(createStartingState()).staffingReadinessOpportunity).toBeNull()
  })

  it('returns a deterministic danger staffing readiness card for a staffing gap with readiness blockers', () => {
    const game = withLostAgents(createStartingState(), 1)
    const card = buildStaffingReadinessOpportunityCard(game)

    expect(card).toMatchObject({
      id: 'staffing-readiness-pressure',
      tone: 'danger',
      href: '/teams',
      linkLabel: 'Open teams',
      secondaryHref: '/recruitment',
      secondaryLinkLabel: 'Open recruitment',
    })
    expect(card?.summary).toContain('1 staffing gap')
    expect(card?.details.join(' ')).toMatch(/replacement coverage/i)
  })

  it('returns a deterministic danger staffing readiness card for severe staffing pressure', () => {
    const game = withLostAgents(createStartingState(), 2)
    const card = getFrontDeskHubView(game).staffingReadinessOpportunity

    expect(card).toMatchObject({
      id: 'staffing-readiness-pressure',
      tone: 'danger',
      href: '/teams',
    })
    expect(card?.summary).toContain('2 staffing gaps')
  })

  it('surfaces blocked or deferred routing from the existing operations report without mutating state', () => {
    const game = createStartingState()
    const report = {
      ...getOperationsReportView(game),
      missionRouting: [
        {
          missionId: 'case-001',
          missionTitle: 'Test Mission',
          priorityLabel: 'High',
          routingStateLabel: 'Deferred',
          summary: 'Deferred by readiness pressure.',
          dominantFactorLabel: 'No Eligible Teams',
          highlights: [],
          details: [],
        },
      ],
      deploymentReadiness: [],
    }
    const frozen = structuredClone(game)
    const card = buildStaffingReadinessOpportunityCard(game, report)

    expect(card).toMatchObject({
      id: 'staffing-readiness-pressure',
      tone: 'warning',
      title: 'Mission routing is deferred by readiness pressure',
      href: '/teams',
    })
    expect(card?.details.join(' ')).toContain('Deferred: Test Mission')
    expect(game).toEqual(frozen)
  })

  it('returns no strategic action budget opportunity when support pool covers deployments', () => {
    expect(buildStrategicActionBudgetOpportunityCard(createStartingState())).toBeNull()
    expect(getFrontDeskHubView(createStartingState()).strategicActionBudgetOpportunity).toBeNull()
  })

  it('returns null when the courier gap report has no unresolved gap', () => {
    const opened = openCourierShellFront(withPaidCourierAndFunding(createStartingState(), 12000))
    const report = buildCourierNetworkCapacityGapReport(opened)
    expect(buildCourierNetworkCapacityOpportunityCard(report)).toBeNull()
  })

  it('returns a danger card for below-required gaps with mitigation labels', () => {
    const game = withPaidCourierAndFunding(createStartingState(), 9000)
    const card = buildCourierNetworkCapacityOpportunityCard(
      buildCourierNetworkCapacityGapReport(game)
    )
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
      buildCourierNetworkCapacityGapReport(strainedWithLockout)
    )
    expect(card).not.toBeNull()
    expect(card!.tone).toBe('warning')
    expect(card!.gapKindLabel).toBe('Below structural target')
  })

  it('SPE-99: hub team status includes recovery summary and mode tag for fieldBase expeditions', () => {
    const base = createStartingState()
    const unlocked = refreshContractBoard({
      ...base,
      factions: {
        ...base.factions!,
        institutions: {
          ...base.factions!.institutions,
          reputation: 52,
          reputationTier: 'friendly',
        },
      },
      agency: {
        ...base.agency!,
        progressionUnlockIds: ['containment-liturgy'],
      },
      contracts: undefined,
    })
    const offer = getContractOffers(unlocked).find(
      (o) => o.templateId === 'institutions-liturgy-expedition'
    )!
    const launched = launchContract(unlocked, offer.id, 't_nightwatch')
    const view = getFrontDeskHubView(launched)
    const team = view.teamStatus.find((entry) => entry.teamId === 't_nightwatch')

    expect(team?.recoverySummary).toContain('vault-approach-bivouac')
    expect(team?.recoverySummary).toContain('Sanctuary recovery')
    expect(team?.tags).toContain('Sanctuary recovery')
  })

  it('SPE-99: hub team status surfaces missing staging when deployed without fieldBase', () => {
    const assigned = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    const view = getFrontDeskHubView(assigned)
    const team = view.teamStatus.find((entry) => entry.teamId === 't_nightwatch')

    expect(assigned.cases['case-001']?.status).toBe('in_progress')
    expect(team?.recoverySummary).toContain('No valid field staging packet')
    expect(team?.tags).toContain('Ordinary rest')
  })

  it('does not mutate game state when building the hub view', () => {
    const game = withPaidCourierAndFunding(createStartingState(), 9000)
    const frozen = structuredClone(game)
    getFrontDeskHubView(game)
    expect(game).toEqual(frozen)
  })
})
