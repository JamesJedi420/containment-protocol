import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { CaseInstance } from '../domain/models'
import {
  applySiteExplorationAction,
  getSiteExplorationAlertClockId,
  getSiteExplorationTurnClockId,
  isCaseInSiteExplorationPhase,
  readSiteExplorationAlertValue,
  readSiteExplorationTurnValue,
  shouldTriggerSiteWanderingCheck,
  SITE_EXPLORATION_ACTION_COST_TURNS,
  SITE_EXPLORATION_ALERT_WANDER_THRESHOLD,
} from '../domain/siteOperationalExploration'
import { readProgressClock } from '../domain/progressClocks'

function buildExplorationCase(id: string, overrides: Partial<CaseInstance> = {}): CaseInstance {
  const state = createStartingState()
  const base = state.cases['case-001']!
  return {
    ...base,
    id,
    title: `Exploration ${id}`,
    status: 'in_progress',
    spatialFlags: ['ingress:service_door'],
    mapLayer: {
      authoringMode: 'map-metadata-first',
      legend: [],
      zones: [],
      routes: [],
      occupierKnownRouteIds: [],
      scaleAnchors: [],
    },
    ...overrides,
  }
}

describe('siteOperationalExploration', () => {
  it('uses deterministic per-case clock ids', () => {
    expect(getSiteExplorationTurnClockId('case-a')).toBe('site.exploration.case-a.turn')
    expect(getSiteExplorationAlertClockId('case-a')).toBe('site.exploration.case-a.alert')
  })

  it('requires mapLayer and spatial flags for exploration phase', () => {
    const active = buildExplorationCase('active')
    expect(isCaseInSiteExplorationPhase(active)).toBe(true)

    const noMap = buildExplorationCase('no-map', { mapLayer: undefined })
    expect(isCaseInSiteExplorationPhase(noMap)).toBe(false)

    const noFlags = buildExplorationCase('no-flags', { spatialFlags: [] })
    expect(isCaseInSiteExplorationPhase(noFlags)).toBe(false)
  })

  it('advances turn clock by action cost and raises alert on noisy actions', () => {
    const state = createStartingState()
    const currentCase = buildExplorationCase('site-1')
    const game = { ...state, cases: { 'site-1': currentCase } }

    const listen = applySiteExplorationAction(game, 'site-1', 'listen')
    expect(listen.applied).toBe(true)
    expect(listen.turnCost).toBe(SITE_EXPLORATION_ACTION_COST_TURNS.listen)
    expect(readSiteExplorationTurnValue(listen.state, 'site-1')).toBe(1)
    expect(readSiteExplorationAlertValue(listen.state, 'site-1')).toBe(0)

    const breach = applySiteExplorationAction(listen.state, 'site-1', 'breach')
    expect(breach.applied).toBe(true)
    expect(readSiteExplorationTurnValue(breach.state, 'site-1')).toBe(4)
    expect(readSiteExplorationAlertValue(breach.state, 'site-1')).toBe(3)
    expect(readProgressClock(breach.state, getSiteExplorationTurnClockId('site-1'))?.hidden).toBe(true)
  })

  it('rejects actions when case is not in site exploration phase', () => {
    const state = createStartingState()
    const flat = { ...state.cases['case-001']!, id: 'flat', spatialFlags: [], mapLayer: undefined }
    const game = { ...state, cases: { flat } }

    const result = applySiteExplorationAction(game, 'flat', 'search')
    expect(result.applied).toBe(false)
    expect(result.reason).toBe('not_site_exploration')
  })

  it('triggers wandering check at alert threshold or turn cadence with alert', () => {
    expect(shouldTriggerSiteWanderingCheck(2, SITE_EXPLORATION_ALERT_WANDER_THRESHOLD)).toBe(true)
    expect(shouldTriggerSiteWanderingCheck(3, 1)).toBe(true)
    expect(shouldTriggerSiteWanderingCheck(3, 0)).toBe(false)
    expect(shouldTriggerSiteWanderingCheck(2, 1)).toBe(false)
  })

  it('flags wandering check after cumulative breach noise', () => {
    const state = createStartingState()
    const currentCase = buildExplorationCase('noisy')
    let game = { ...state, cases: { noisy: currentCase } }

    let last = applySiteExplorationAction(game, 'noisy', 'breach')
    game = last.state
    last = applySiteExplorationAction(game, 'noisy', 'breach')
    expect(last.wanderingCheckTriggered).toBe(true)
  })
})
