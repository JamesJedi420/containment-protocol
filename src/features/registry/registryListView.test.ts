import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  DEFAULT_REGISTRY_LIST_FILTERS,
  getFilteredRegistryAgentViews,
  readRegistryListFilters,
  writeRegistryListFilters,
} from './registryListView'

describe('registryListView', () => {
  it('reads and normalizes URL filters with safe team fallback', () => {
    const game = createStartingState()
    const searchParams = new URLSearchParams(
      'q=%20%20alpha%20%20&role=hunter&status=active&team=unknown-team&fatigue=critical&sort=fatigue-desc'
    )

    const filters = readRegistryListFilters(game, searchParams)

    expect(filters).toEqual({
      q: 'alpha',
      role: 'hunter',
      status: 'active',
      team: 'all',
      fatigue: 'critical',
      sort: 'fatigue-desc',
      page: 1,
    })
  })

  it('writes canonical query params and omits defaults', () => {
    const searchParams = writeRegistryListFilters({
      q: 'alpha',
      role: 'hunter',
      status: 'active',
      team: 'unassigned',
      fatigue: 'strained',
      sort: 'status',
      page: 2,
    })

    expect(searchParams.get('q')).toBe('alpha')
    expect(searchParams.get('role')).toBe('hunter')
    expect(searchParams.get('status')).toBe('active')
    expect(searchParams.get('team')).toBe('unassigned')
    expect(searchParams.get('fatigue')).toBe('strained')
    expect(searchParams.get('sort')).toBe('status')
    expect(searchParams.get('page')).toBe('2')

    const defaultsParams = writeRegistryListFilters(DEFAULT_REGISTRY_LIST_FILTERS)
    expect(defaultsParams.toString()).toBe('')
  })

  it('normalizes invalid page query params to default page', () => {
    const game = createStartingState()
    const searchParams = new URLSearchParams('page=0')

    const filters = readRegistryListFilters(game, searchParams)

    expect(filters.page).toBe(1)
  })

  it('applies combined role and query filters', () => {
    const game = createStartingState()
    const allViews = getFilteredRegistryAgentViews(game, DEFAULT_REGISTRY_LIST_FILTERS)
    const targetView = allViews[0]

    expect(targetView).toBeDefined()

    const token = targetView?.agent.name.split(/\s+/)[0] ?? ''
    const filtered = getFilteredRegistryAgentViews(game, {
      ...DEFAULT_REGISTRY_LIST_FILTERS,
      role: targetView?.agent.role ?? 'all',
      q: token,
    })

    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.every((view) => view.agent.role === targetView?.agent.role)).toBe(true)
    expect(
      filtered.every((view) =>
        [view.agent.name, ...view.agent.tags, view.teamName ?? '']
          .join(' ')
          .toLowerCase()
          .includes(token.toLowerCase())
      )
    ).toBe(true)
  })

  it('requires all query tokens to match searchable fields', () => {
    const game = createStartingState()
    const allViews = getFilteredRegistryAgentViews(game, DEFAULT_REGISTRY_LIST_FILTERS)
    const targetView = allViews.find((view) => view.agent.name.includes('Ava'))

    expect(targetView).toBeDefined()

    const positive = getFilteredRegistryAgentViews(game, {
      ...DEFAULT_REGISTRY_LIST_FILTERS,
      q: 'ava hunter',
    })

    expect(positive.some((view) => view.agent.id === targetView?.agent.id)).toBe(true)

    const negative = getFilteredRegistryAgentViews(game, {
      ...DEFAULT_REGISTRY_LIST_FILTERS,
      q: 'ava octopus',
    })

    expect(negative.some((view) => view.agent.id === targetView?.agent.id)).toBe(false)
  })

  it('sorts by fatigue descending when selected', () => {
    const game = createStartingState()
    const filtered = getFilteredRegistryAgentViews(game, {
      ...DEFAULT_REGISTRY_LIST_FILTERS,
      sort: 'fatigue-desc',
    })

    for (let index = 1; index < filtered.length; index += 1) {
      expect(filtered[index - 1]!.agent.fatigue).toBeGreaterThanOrEqual(
        filtered[index]!.agent.fatigue
      )
    }
  })

  it('keeps fatigue sort order when combined with role filter', () => {
    const game = createStartingState()
    const filtered = getFilteredRegistryAgentViews(game, {
      ...DEFAULT_REGISTRY_LIST_FILTERS,
      role: 'hunter',
      sort: 'fatigue-desc',
    })

    expect(filtered.every((view) => view.agent.role === 'hunter')).toBe(true)

    for (let index = 1; index < filtered.length; index += 1) {
      expect(filtered[index - 1]!.agent.fatigue).toBeGreaterThanOrEqual(
        filtered[index]!.agent.fatigue
      )
    }
  })

  it('sorts by status using stable status order', () => {
    const game = createStartingState()
    const agentIds = Object.keys(game.agents).slice(0, 4)

    if (agentIds.length >= 4) {
      game.agents[agentIds[0]!]!.status = 'recovering'
      game.agents[agentIds[1]!]!.status = 'active'
      game.agents[agentIds[2]!]!.status = 'dead'
      game.agents[agentIds[3]!]!.status = 'injured'
    }

    const filtered = getFilteredRegistryAgentViews(game, {
      ...DEFAULT_REGISTRY_LIST_FILTERS,
      sort: 'status',
    })

    const indices = filtered.map((view) => getStatusSortIndex(view.agent.status))

    for (let index = 1; index < indices.length; index += 1) {
      expect(indices[index - 1]!).toBeLessThanOrEqual(indices[index]!)
    }
  })

  it('filters reserve-only agents when team is unassigned', () => {
    const game = createStartingState()
    const [unassignedAgent] = Object.values(game.agents)

    expect(unassignedAgent).toBeDefined()

    for (const team of Object.values(game.teams)) {
      team.memberIds = (team.memberIds ?? []).filter((agentId) => agentId !== unassignedAgent?.id)
      team.agentIds = (team.agentIds ?? []).filter((agentId) => agentId !== unassignedAgent?.id)
    }

    const filtered = getFilteredRegistryAgentViews(game, {
      ...DEFAULT_REGISTRY_LIST_FILTERS,
      team: 'unassigned',
    })

    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.some((view) => view.agent.id === unassignedAgent?.id)).toBe(true)
    expect(filtered.every((view) => view.teamId === undefined)).toBe(true)
  })

  it('applies fatigue band boundaries at 20 and 45', () => {
    const game = createStartingState()
    const ids = Object.keys(game.agents).slice(0, 4)

    expect(ids.length).toBeGreaterThanOrEqual(4)

    game.agents[ids[0]!]!.fatigue = 19
    game.agents[ids[1]!]!.fatigue = 20
    game.agents[ids[2]!]!.fatigue = 44
    game.agents[ids[3]!]!.fatigue = 45

    game.agents = Object.fromEntries(ids.map((id) => [id, game.agents[id]!]))

    const steady = getFilteredRegistryAgentViews(game, {
      ...DEFAULT_REGISTRY_LIST_FILTERS,
      fatigue: 'steady',
    }).map((view) => view.agent.id)
    expect(steady).toContain(ids[0])
    expect(steady).not.toContain(ids[1])

    const strained = getFilteredRegistryAgentViews(game, {
      ...DEFAULT_REGISTRY_LIST_FILTERS,
      fatigue: 'strained',
    }).map((view) => view.agent.id)
    expect(strained).toContain(ids[1])
    expect(strained).toContain(ids[2])
    expect(strained).not.toContain(ids[0])
    expect(strained).not.toContain(ids[3])

    const critical = getFilteredRegistryAgentViews(game, {
      ...DEFAULT_REGISTRY_LIST_FILTERS,
      fatigue: 'critical',
    }).map((view) => view.agent.id)
    expect(critical).toContain(ids[3])
    expect(critical).not.toContain(ids[2])
  })
})

function getStatusSortIndex(status: 'active' | 'injured' | 'recovering' | 'resigned' | 'dead') {
  switch (status) {
    case 'active':
      return 0
    case 'injured':
      return 1
    case 'recovering':
      return 2
    case 'resigned':
      return 3
    case 'dead':
      return 4
    default:
      return 5
  }
}
