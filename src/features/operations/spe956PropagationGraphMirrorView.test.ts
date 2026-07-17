import { describe, expect, it } from 'vitest'
import { APP_ROUTES } from '../../app/routes'
import { hydrateGame } from '../../app/store/runTransfer'
import { createStartingState } from '../../data/startingState'
import { SPE_956_EXAMPLE_PROPAGATION_GRAPH } from '../../domain/spe956PropagationGraph'
import { SPE_956_EXAMPLE_PROPAGATION_GRAPH_RECORDS } from '../../domain/spe956PropagationGraphPersistence'
import { getFrontDeskHubView } from './frontDeskView'
import { getSpe956PropagationGraphMirrorView } from './spe956PropagationGraphMirrorView'

describe('spe956PropagationGraphMirrorView (SPE-2626 slice 4)', () => {
  it('returns empty mirror when spe956PropagationGraphRecords is empty without false AC', () => {
    const game = createStartingState()

    expect(game.spe956PropagationGraphRecords).toEqual({})

    const view = getSpe956PropagationGraphMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.graphCount).toBe(0)
    expect(view.summary.totalNodeCount).toBe(0)
    expect(view.summary.totalEdgeCount).toBe(0)
    expect(view.graphs).toEqual([])
  })

  it('mirrors authored graph structure and weekly fields from persisted records only', () => {
    const game = createStartingState()
    game.week = 9
    game.spe956PropagationGraphRecords = {
      [SPE_956_EXAMPLE_PROPAGATION_GRAPH.id]: {
        ...SPE_956_EXAMPLE_PROPAGATION_GRAPH,
        elapsedPropagationWeeks: 2,
        weeklyElapsedWeeksDelta: 1,
        lastWeeklyTickWeek: 8,
      },
    }

    const view = getSpe956PropagationGraphMirrorView(game)
    const graph = view.graphs[0]

    expect(view.isEmpty).toBe(false)
    expect(view.summary.graphCount).toBe(1)
    expect(view.summary.totalNodeCount).toBe(2)
    expect(view.summary.totalEdgeCount).toBe(1)
    expect(view.summary.week).toBe(9)

    expect(graph?.id).toBe('propagation-graph:leak-forum-chain')
    expect(graph?.label).toBe('Leak footage to rumor forum chain')
    expect(graph?.seedNodeIdLabel).toBe('node:artifact-leak')
    expect(graph?.elapsedPropagationWeeksLabel).toBe('2')
    expect(graph?.weeklyElapsedWeeksDeltaLabel).toBe('1')
    expect(graph?.lastWeeklyTickWeekLabel).toBe('8')

    expect(graph?.nodes).toHaveLength(2)
    expect(graph?.nodes[0]?.kindLabel).toBe('Content Artifact')
    expect(graph?.nodes[1]?.entityIdLabel).toBe('platform:rumor-forum')

    expect(graph?.edges).toHaveLength(1)
    expect(graph?.edges[0]?.spreadFactorLabel).toBe('0.8')
  })

  it('survives hydrate round-trip through store transfer without losing graph records', () => {
    const game = createStartingState()
    game.spe956PropagationGraphRecords = {
      ...SPE_956_EXAMPLE_PROPAGATION_GRAPH_RECORDS,
    }

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(game)) as typeof game)
    const view = getSpe956PropagationGraphMirrorView(hydrated)

    expect(view.isEmpty).toBe(false)
    expect(view.summary.graphCount).toBe(1)
    expect(view.graphs[0]?.label).toBe('Leak footage to rumor forum chain')
  })

  it('treats explicit empty map after sanitize as empty mirror state', () => {
    const game = createStartingState()
    game.spe956PropagationGraphRecords = {
      ...SPE_956_EXAMPLE_PROPAGATION_GRAPH_RECORDS,
    }

    const cleared = hydrateGame({
      ...game,
      spe956PropagationGraphRecords: {},
    })

    expect(getSpe956PropagationGraphMirrorView(cleared).isEmpty).toBe(true)
  })

  it('is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.spe956PropagationGraphRecords = {
      ...SPE_956_EXAMPLE_PROPAGATION_GRAPH_RECORDS,
    }

    const first = JSON.stringify(getSpe956PropagationGraphMirrorView(game))
    const second = JSON.stringify(getSpe956PropagationGraphMirrorView(game))

    expect(first).toBe(second)
  })

  it('exposes Front Desk quick link to the propagation graph mirror', () => {
    const hub = getFrontDeskHubView(createStartingState())

    expect(hub.quickLinks.some((link) => link.href === APP_ROUTES.propagationGraph)).toBe(true)
  })
})
