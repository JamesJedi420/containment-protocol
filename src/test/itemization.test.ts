// cspell:words loadouts
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { buildItemizationOverview } from '../domain/itemization'
import { equipAgentItem } from '../domain/sim/equipment'
import { queueFabrication } from '../domain/sim/production'

describe('itemization', () => {
  it('builds deterministic item entries across inventory, loadouts, fabrication, market, and rewards', () => {
    let state = createStartingState()
    state.inventory.signal_jammers = 1
    state = equipAgentItem(state, 'a_mina', 'utility1', 'signal_jammers')
    state = queueFabrication(state, 'signal-jammers')
    state.cases['case-tech'] = {
      ...state.cases['case-002'],
      id: 'case-tech',
      title: 'Relay Interference Sweep',
      status: 'open',
      stage: 3,
      tags: ['signal', 'relay', 'analysis', 'anomaly'],
      requiredTags: ['tech'],
      preferredTags: ['surveillance'],
      assignedTeamIds: [],
    }

    const firstOverview = buildItemizationOverview(state)
    const secondOverview = buildItemizationOverview(state)
    const jammerEntry = firstOverview.entries.find((entry) => entry.itemId === 'signal_jammers')

    expect(firstOverview).toEqual(secondOverview)
    expect(jammerEntry).toMatchObject({
      kind: 'equipment',
      equipped: 1,
      queuedOutput: 1,
    })
    expect(jammerEntry?.marketListingCount).toBeGreaterThan(0)
    expect(jammerEntry?.activeCaseMatchCount).toBeGreaterThan(0)
    expect(jammerEntry?.sourceChannels).toEqual(
      expect.arrayContaining(['equipped', 'fabrication', 'market'])
    )
    expect(firstOverview.entries.some((entry) => entry.rewardOpportunityCount > 0)).toBe(true)
    expect(firstOverview.topOperationalItems.map((entry) => entry.itemId)).toContain(
      'signal_jammers'
    )
  })
})
