import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  advanceCampaignGovernanceTurn,
  buildCampaignGovernanceSummary,
  GOVERNANCE_TURN_PHASE_ORDER,
} from '../domain/campaignGovernance'
import { advanceWeek } from '../domain/sim/advanceWeek'

function buildPressuredGovernanceState() {
  const state = createStartingState()

  state.regionalState = {
    ...state.regionalState!,
    control: {
      ...state.regionalState!.control,
      occult_district: 'hostile',
    },
  }
  state.cases['case-003'] = {
    ...state.cases['case-003'],
    regionTag: 'occult_district',
    stage: 4,
    status: 'open',
    deadlineRemaining: 1,
  }
  state.supplyNetwork = {
    ...state.supplyNetwork!,
    nodes: state.supplyNetwork!.nodes.map((node) =>
      node.regionTags.includes('occult_district')
        ? {
            ...node,
            controller: 'hostile',
            active: true,
          }
        : node
    ),
    links: state.supplyNetwork!.links.map((link) =>
      link.id === 'link-depot-corridor'
        ? {
            ...link,
            status: 'blocked',
          }
        : link
    ),
  }

  return state
}

describe('campaignGovernance', () => {
  it('resolves the governance turn in the configured single-pass phase order with inspectable channels', () => {
    const state = createStartingState()

    const result = advanceCampaignGovernanceTurn({
      week: state.week,
      agency: state.agency,
      campaignGovernance: state.campaignGovernance,
      cases: state.cases,
      funding: state.funding,
      regionalState: state.regionalState,
      supplyNetwork: state.supplyNetwork,
    })

    expect(result.report.phaseOrder).toEqual([...GOVERNANCE_TURN_PHASE_ORDER])
    expect(result.report.completedPhases).toEqual([...GOVERNANCE_TURN_PHASE_ORDER])
    expect(result.report.channels.authorityIncome).toBeGreaterThan(0)
    expect(result.report.channels.capitalAuthorityModifier).not.toBe(0)
    expect(result.report.channels.upkeepCost).toBeGreaterThan(0)
    expect(result.report.regionStates.length).toBeGreaterThan(0)
    expect(result.report.courtRegionId).toBeDefined()
    expect(result.governance.authority).toBe(result.report.authorityAfter)
    expect(result.governance.lastTurn?.summary).toContain('Primacy')
  })

  it('lets maintenance burden and funding constraints suppress higher-cost governance actions', () => {
    const baselineState = buildPressuredGovernanceState()
    const baseline = advanceCampaignGovernanceTurn({
      week: baselineState.week,
      agency: baselineState.agency,
      campaignGovernance: baselineState.campaignGovernance,
      cases: baselineState.cases,
      funding: baselineState.funding,
      regionalState: baselineState.regionalState,
      supplyNetwork: baselineState.supplyNetwork,
    })
    const baselineOccultAction = baseline.report.actions.find(
      (action) => action.regionId === 'occult_district'
    )

    expect(baselineOccultAction?.action).toBe('fortify')

    const constrainedState = buildPressuredGovernanceState()
    constrainedState.funding = 0

    for (const region of Object.values(constrainedState.campaignGovernance!.regions)) {
      region.upkeepCost = 6
      region.fortification.level = 3
    }

    const constrained = advanceCampaignGovernanceTurn({
      week: constrainedState.week,
      agency: constrainedState.agency,
      campaignGovernance: constrainedState.campaignGovernance,
      cases: constrainedState.cases,
      funding: constrainedState.funding,
      regionalState: constrainedState.regionalState,
      supplyNetwork: constrainedState.supplyNetwork,
    })
    const constrainedOccultAction = constrained.report.actions.find(
      (action) => action.regionId === 'occult_district'
    )

    expect(constrained.report.channels.upkeepCost).toBeGreaterThan(
      constrained.report.channels.regionalFundingIncome
    )
    expect(constrained.report.channels.fundingNet).toBeLessThan(0)
    expect(constrainedOccultAction?.action).toBe('hold')
  })

  it('persists war and occupation pressure while fortifications erode under hostile unsupported control', () => {
    const firstState = buildPressuredGovernanceState()
    const first = advanceCampaignGovernanceTurn({
      week: firstState.week,
      agency: firstState.agency,
      campaignGovernance: firstState.campaignGovernance,
      cases: firstState.cases,
      funding: firstState.funding,
      regionalState: firstState.regionalState,
      supplyNetwork: firstState.supplyNetwork,
    })
    const occultFirst = first.governance.regions.occult_district

    expect(occultFirst).toBeDefined()
    expect(occultFirst.war.active).toBe(true)
    expect(occultFirst.occupation.active).toBe(true)
    expect(occultFirst.fortification.erosion).toBeGreaterThan(0)
    expect(occultFirst.fortification.siegePressure).toBeGreaterThanOrEqual(20)

    const secondState = {
      ...firstState,
      campaignGovernance: first.governance,
      agency: {
        ...firstState.agency!,
        authority: first.governance.authority,
        upkeepBurden: first.report.totalUpkeep,
      },
    }
    const second = advanceCampaignGovernanceTurn({
      week: secondState.week + 1,
      agency: secondState.agency,
      campaignGovernance: secondState.campaignGovernance,
      cases: secondState.cases,
      funding: secondState.funding,
      regionalState: secondState.regionalState,
      supplyNetwork: secondState.supplyNetwork,
    })
    const occultSecond = second.governance.regions.occult_district

    expect(occultSecond.war.active).toBe(true)
    expect(occultSecond.occupation.active).toBe(true)
    expect(occultSecond.fortification.integrity).toBeLessThanOrEqual(
      occultFirst.fortification.integrity
    )
    expect(occultSecond.fortification.siegePressure).toBeGreaterThanOrEqual(
      occultFirst.fortification.siegePressure
    )
  })

  it('relocates a city-state court into mobile posture when the seated capital is cut off', () => {
    const state = buildPressuredGovernanceState()
    state.campaignGovernance = {
      ...state.campaignGovernance!,
      primacy: 'city_state',
      courtMode: 'fixed_court',
      courtRegionId: 'occult_district',
    }

    const result = advanceCampaignGovernanceTurn({
      week: state.week,
      agency: state.agency,
      campaignGovernance: state.campaignGovernance,
      cases: state.cases,
      funding: state.funding,
      regionalState: state.regionalState,
      supplyNetwork: state.supplyNetwork,
    })

    expect(result.report.courtMode).toBe('mobile_court')
    expect(result.report.courtRegionId).toBe('bio_containment')
    expect(result.report.channels.courtRelocationCost).toBe(2)
    expect(result.report.summary).toContain('Court Mobile Court')
  })

  it('surfaces governance snapshots, authority updates, and fortification events through the weekly sim', () => {
    const state = buildPressuredGovernanceState()

    const next = advanceWeek(state)
    const latestReport = next.reports.at(-1)
    const summary = buildCampaignGovernanceSummary(next.campaignGovernance)

    expect(latestReport?.campaignGovernance?.phaseOrder).toEqual([...GOVERNANCE_TURN_PHASE_ORDER])
    expect(latestReport?.campaignGovernance?.channels.upkeepCost).toBeGreaterThan(0)
    expect(next.agency?.authority).toBe(latestReport?.campaignGovernance?.authorityAfter)
    expect(summary.atWarRegions).toBeGreaterThan(0)
    expect(summary.underSiegeRegions).toBeGreaterThan(0)
    expect(
      next.events.some((event) => event.type === 'governance.turn_resolved' && event.payload.week === state.week)
    ).toBe(true)
    expect(
      next.events.some(
        (event) =>
          event.type === 'system.fortification_updated' &&
          event.payload.regionId === 'occult_district'
      )
    ).toBe(true)
    expect(
      latestReport?.notes.some((note) => note.type === 'governance.turn_resolved')
    ).toBe(true)
    expect(
      latestReport?.notes.some(
        (note) =>
          note.type === 'system.fortification_updated' &&
          note.metadata?.regionId === 'occult_district'
      )
    ).toBe(true)
  })
})
