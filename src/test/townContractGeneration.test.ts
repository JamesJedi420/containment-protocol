import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { createCivicRumorPacket } from '../domain/civicRumorChannel'
import {
  buildContractPreviewCase,
  getContractOffers,
  refreshContractBoard,
} from '../domain/contracts'
import type { GameState } from '../domain/models'
import { createNeighborhoodIncidentPacket } from '../domain/urbanNeighborhoodIncidents'
import {
  deriveTownContractPacketContext,
  deriveTownContractValueStreamTag,
  getTownContractSelectionBias,
  mergeTownContractCaseTags,
} from '../domain/townContractGeneration'

type CivicPacketState = GameState & {
  neighborhoodPackets?: ReturnType<typeof createNeighborhoodIncidentPacket>[]
  rumorPackets?: ReturnType<typeof createCivicRumorPacket>[]
}

describe('townContractGeneration', () => {
  it('returns null when no civic packets are on state', () => {
    const state = createStartingState()
    expect(deriveTownContractPacketContext(state)).toBeNull()
  })

  it('ranks the highest-pressure district with stable tie-break', () => {
    const state = {
      ...createStartingState(),
      week: 1,
      rumorPackets: [
        createCivicRumorPacket({
          packetId: 'rumor-alpha',
          siteId: 'alpha',
          week: 1,
          rumorSignal: 0.4,
        }),
        createCivicRumorPacket({
          packetId: 'rumor-beta',
          siteId: 'beta',
          week: 1,
          rumorSignal: 0.9,
        }),
      ],
    } satisfies CivicPacketState

    const context = deriveTownContractPacketContext(state)
    expect(context?.leadDistrictId).toBe('beta')
    expect(context?.pressureTags).toContain('rumor-pressure:beta')
    expect(context?.pressureTags).toContain('district:beta')
    expect(context?.pressureTags).toContain('town-first:contract')
  })

  it('derives value-stream tags from template tag overlap', () => {
    expect(deriveTownContractValueStreamTag(['public', 'civilian', 'investigation'])).toBe(
      'value-stream:public-legitimacy'
    )
    expect(deriveTownContractValueStreamTag(['occult', 'ritual'])).toBe('value-stream:doctrine-risk')
    expect(deriveTownContractValueStreamTag(['unrelated'])).toBe('value-stream:evidence-quality')
  })

  it('merges town tags without duplicating template tags', () => {
    const context = {
      leadDistrictId: 'docks',
      pressureScore: 0.2,
      pressureTags: ['district:docks', 'town-first:contract', 'rumor-pressure:docks'],
    }
    const merged = mergeTownContractCaseTags(
      ['contract', 'strategy-income', 'public'],
      context,
      ['public', 'civilian']
    )

    expect(merged).toEqual([
      'contract',
      'strategy-income',
      'public',
      'district:docks',
      'town-first:contract',
      'rumor-pressure:docks',
      'value-stream:public-legitimacy',
    ])
  })

  it('adds bounded selection bias when template tags align with the town lead', () => {
    const context = {
      leadDistrictId: 'docks',
      pressureScore: 0.3,
      pressureTags: ['district:docks', 'town-first:contract', 'rumor-pressure:docks'],
    }

    expect(getTownContractSelectionBias(context, ['public', 'civilian'])).toBeGreaterThan(0)
    expect(getTownContractSelectionBias(null, ['public'])).toBe(0)
  })
})

describe('SPE-2469: town-first contract generation integration', () => {
  function withRumorPackets(
    state: ReturnType<typeof createStartingState>,
    rumorPackets: ReturnType<typeof createCivicRumorPacket>[]
  ): CivicPacketState {
    return {
      ...state,
      rumorPackets,
    }
  }

  it('stamps civic pressure and value-stream tags on contract preview when rumor packets are present', () => {
    const state = withRumorPackets(createStartingState(), [
      createCivicRumorPacket({
        packetId: 'rumor-docks-a',
        siteId: 'harbor-docks',
        week: 1,
        rumorSignal: 0.85,
        misleading: false,
      }),
    ])
    const refreshed = refreshContractBoard({ ...state, week: state.week + 1 })
    const offer = getContractOffers(refreshed)[0]!
    const template = refreshed.templates[offer.caseTemplateId]!
    const preview = buildContractPreviewCase(refreshed, offer)!
    const expectedValueStream = deriveTownContractValueStreamTag(template.tags)

    expect(preview.tags).toContain('rumor-pressure:harbor-docks')
    expect(preview.tags).toContain('district:harbor-docks')
    expect(preview.tags).toContain('town-first:contract')
    expect(preview.tags).toContain(expectedValueStream)
  })

  it('keeps contract preview tags unchanged when no civic packets are present', () => {
    const state = createStartingState()
    const refreshed = refreshContractBoard({ ...state, week: state.week + 1 })
    const offer = getContractOffers(refreshed)[0]!
    const template = refreshed.templates[offer.caseTemplateId]!
    const preview = buildContractPreviewCase(refreshed, offer)!

    expect(preview.tags).toEqual([
      ...new Set([...template.tags, 'contract', `strategy-${offer.strategyTag}`]),
    ])
    expect(preview.tags).not.toContain('town-first:contract')
  })

  it('preserves diverse weekly strategy mix when civic packets are present', () => {
    const state = withRumorPackets(createStartingState(), [
      createCivicRumorPacket({
        packetId: 'rumor-neutral',
        siteId: 'midtown',
        week: 1,
        rumorSignal: 0.5,
      }),
    ])
    const refreshed = refreshContractBoard({ ...state, week: state.week + 1 })
    const offers = getContractOffers(refreshed)

    expect(offers).toHaveLength(4)
    expect(new Set(offers.map((offer) => offer.strategyTag))).toEqual(
      new Set(['income', 'materials', 'research', 'progression'])
    )
  })
})
