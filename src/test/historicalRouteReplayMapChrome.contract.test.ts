import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  advanceHistoricalRouteReplay,
  createHistoricalRouteReplay,
  normalizeHistoricalRouteReplayRegistry,
  type HistoricalRouteReplayRecord,
} from '../domain/historicalRouteReplay'
import {
  createHistoricalRouteMemoryGraph,
  normalizeHistoricalRouteMemoryGraphRegistry,
  reactivateHistoricalRouteEdges,
  rememberHistoricalRouteActivation,
  type HistoricalRouteMemoryGraph,
} from '../domain/historicalRouteMemory'
import type { HistoricalRouteReplayVisibility } from '../features/operations/historicalRouteReplayExplanationAdapter'
import { defaultConservativeHistoricalRouteReplayVisibility } from '../features/operations/historicalRouteReplayExplanationAdapter'
import {
  getHistoricalRouteReplayMapChromeViews,
  projectHistoricalRouteReplayMapChrome,
} from '../features/operations/historicalRouteReplayMapChromeAdapter'

const adapterSourcePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../features/operations/historicalRouteReplayMapChromeAdapter.ts'
)

function phantomCoachGraph(): HistoricalRouteMemoryGraph {
  const empty = createHistoricalRouteMemoryGraph('site:old-coach-road')
  if (!empty) throw new Error('fixture graph was not created')

  const remembered = rememberHistoricalRouteActivation(empty, {
    activationId: 'activation:historical-crash',
    anchors: [
      { id: 'anchor:moor-road', kind: 'activation_point' },
      { id: 'anchor:coach-road', kind: 'landmark' },
      { id: 'anchor:broken-parapet', kind: 'historical_exit' },
    ],
    edges: [
      {
        id: 'edge:moor-coach-road',
        routeKind: 'recurring_site',
        fromAnchorId: 'anchor:moor-road',
        toAnchorId: 'anchor:coach-road',
      },
      {
        id: 'edge:coach-road-parapet',
        routeKind: 'historical_exit',
        fromAnchorId: 'anchor:coach-road',
        toAnchorId: 'anchor:broken-parapet',
      },
    ],
  })

  return reactivateHistoricalRouteEdges(remembered, 'activation:current-night', [
    'edge:moor-coach-road',
    'edge:coach-road-parapet',
  ])
}

function canalGraph(): HistoricalRouteMemoryGraph {
  const empty = createHistoricalRouteMemoryGraph('site:canal-lock')
  if (!empty) throw new Error('fixture canal graph was not created')

  const remembered = rememberHistoricalRouteActivation(empty, {
    activationId: 'activation:canal-flood',
    anchors: [
      { id: 'anchor:lock-gate', kind: 'activation_point' },
      { id: 'anchor:towpath', kind: 'landmark' },
    ],
    edges: [
      {
        id: 'edge:lock-towpath',
        routeKind: 'contamination_route',
        fromAnchorId: 'anchor:lock-gate',
        toAnchorId: 'anchor:towpath',
      },
    ],
  })

  return reactivateHistoricalRouteEdges(remembered, 'activation:canal-night', ['edge:lock-towpath'])
}

function createApproaching(
  eventId: string,
  graph: HistoricalRouteMemoryGraph = phantomCoachGraph(),
  config: {
    activationId?: string
    originAnchorId?: string
    terminalAnchorId?: string
  } = {}
): HistoricalRouteReplayRecord {
  const replay = createHistoricalRouteReplay(graph, {
    eventId,
    activationId: config.activationId ?? 'activation:current-night',
    originAnchorId: config.originAnchorId ?? 'anchor:moor-road',
    terminalAnchorId: config.terminalAnchorId ?? 'anchor:broken-parapet',
  })
  if (!replay) throw new Error('fixture replay was not created')
  return replay
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  Object.freeze(value)
  for (const nested of Object.values(value as object)) {
    if (nested !== null && typeof nested === 'object' && !Object.isFrozen(nested)) {
      deepFreeze(nested)
    }
  }
  return value
}

describe('SPE-3031 historical-route replay map chrome projection', () => {
  it('projects known anchors/edges without mutating registries', () => {
    const approaching = createApproaching('event:phantom-coach')
    const replayRegistry = deepFreeze(
      normalizeHistoricalRouteReplayRegistry({
        [approaching.eventId]: approaching,
      })
    )
    const graph = phantomCoachGraph()
    const memoryGraphs = deepFreeze(
      normalizeHistoricalRouteMemoryGraphRegistry({
        [graph.siteId]: graph,
      })
    )
    const beforeReplays = structuredClone(replayRegistry)
    const beforeGraphs = structuredClone(memoryGraphs)

    const views = getHistoricalRouteReplayMapChromeViews(replayRegistry, memoryGraphs)
    expect(views).toHaveLength(1)
    expect(views[0]).toMatchObject({
      eventId: 'event:phantom-coach',
      phase: 'approaching',
      siteId: 'site:old-coach-road',
      causalClassification: 'unresolved',
    })
    expect(views[0]!.anchors.map((anchor) => anchor.anchorId)).toEqual([
      'anchor:broken-parapet',
      'anchor:moor-road',
    ])
    expect(
      views[0]!.anchors.find((anchor) => anchor.anchorId === 'anchor:moor-road')?.roles
    ).toEqual(expect.arrayContaining(['origin', 'current', 'route']))
    expect(views[0]!.edges).toEqual([])

    expect(replayRegistry).toEqual(beforeReplays)
    expect(memoryGraphs).toEqual(beforeGraphs)
    expect(Object.isFrozen(replayRegistry)).toBe(true)
    expect(Object.isFrozen(memoryGraphs)).toBe(true)
    expect(Object.isFrozen(views)).toBe(true)
    expect(Object.isFrozen(views[0])).toBe(true)
  })

  it('hides unauthorized anchors and edges under low visibility', () => {
    const approaching = createApproaching('event:hidden')
    const traversing = advanceHistoricalRouteReplay(approaching)
    const graph = phantomCoachGraph()

    const lowKnowledge: HistoricalRouteReplayVisibility = {
      knownAnchorIds: ['anchor:moor-road'],
      includeObserverExposures: false,
      includeFullRoute: false,
    }
    const chrome = projectHistoricalRouteReplayMapChrome(traversing, [graph], lowKnowledge)

    expect(chrome.anchors.map((anchor) => anchor.anchorId)).toEqual(['anchor:moor-road'])
    expect(chrome.anchors.some((anchor) => anchor.anchorId === 'anchor:coach-road')).toBe(false)
    expect(chrome.anchors.some((anchor) => anchor.anchorId === 'anchor:broken-parapet')).toBe(false)
    expect(chrome.edges).toEqual([])

    const fullRoute = projectHistoricalRouteReplayMapChrome(traversing, [graph], {
      knownAnchorIds: ['anchor:moor-road'],
      includeObserverExposures: false,
      includeFullRoute: true,
    })
    expect(fullRoute.anchors.map((anchor) => anchor.anchorId)).toEqual([
      'anchor:broken-parapet',
      'anchor:coach-road',
      'anchor:moor-road',
    ])
    expect(fullRoute.edges.map((edge) => edge.edgeId)).toEqual([
      'edge:coach-road-parapet',
      'edge:moor-coach-road',
    ])
  })

  it('returns an empty list for an empty replay registry', () => {
    const graph = phantomCoachGraph()
    const views = getHistoricalRouteReplayMapChromeViews({}, { [graph.siteId]: graph })
    expect(views).toEqual([])
  })

  it('resolves multi-site graphs without inventing missing edges', () => {
    const coach = createApproaching('event:coach')
    const canalSite = canalGraph()
    const canalReplay = createApproaching('event:canal', canalSite, {
      activationId: 'activation:canal-night',
      originAnchorId: 'anchor:lock-gate',
      terminalAnchorId: 'anchor:towpath',
    })
    const coachGraph = phantomCoachGraph()

    const views = getHistoricalRouteReplayMapChromeViews(
      {
        [canalReplay.eventId]: canalReplay,
        [coach.eventId]: coach,
      },
      {
        [canalSite.siteId]: canalSite,
        [coachGraph.siteId]: coachGraph,
      }
    )

    expect(views.map((view) => view.eventId)).toEqual(['event:canal', 'event:coach'])
    expect(views[0]?.siteId).toBe('site:canal-lock')
    expect(views[1]?.siteId).toBe('site:old-coach-road')

    const orphaned = projectHistoricalRouteReplayMapChrome(
      coach,
      [canalSite],
      defaultConservativeHistoricalRouteReplayVisibility(coach)
    )
    expect(orphaned.siteId).toBeNull()
    expect(orphaned.edges).toEqual([])
    expect(orphaned.anchors.every((anchor) => anchor.kind === null)).toBe(true)
  })

  it('orders chrome deterministically when registry keys are reordered', () => {
    const alpha = createApproaching('event:alpha')
    const beta = advanceHistoricalRouteReplay(createApproaching('event:beta'))
    const graph = phantomCoachGraph()
    const graphs = { [graph.siteId]: graph }

    const forward = getHistoricalRouteReplayMapChromeViews(
      {
        'event:alpha': alpha,
        'event:beta': beta,
      },
      graphs
    )
    const reversed = getHistoricalRouteReplayMapChromeViews(
      {
        'event:beta': beta,
        'event:alpha': alpha,
      },
      graphs
    )

    expect(forward.map((view) => view.eventId)).toEqual(reversed.map((view) => view.eventId))
    expect(forward.map((view) => view.eventId)).toEqual(['event:alpha', 'event:beta'])
  })

  it('does not import or invoke SPE-3024 activation', () => {
    const source = readFileSync(adapterSourcePath, 'utf8')
    expect(source).not.toMatch(/historicalRouteReplayActivation/)
    expect(source).not.toMatch(/activateHistoricalRouteReplay/)
    expect(source).not.toMatch(/createHistoricalRouteReplay/)
    expect(source).not.toMatch(/advanceHistoricalRouteReplay/)
    expect(source).not.toMatch(/resolveHistoricalRouteReplayTerminal/)
  })
})
