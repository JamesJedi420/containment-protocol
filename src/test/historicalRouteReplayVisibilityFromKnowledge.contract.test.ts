import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
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
import { defaultConservativeHistoricalRouteReplayVisibility } from '../features/operations/historicalRouteReplayExplanationAdapter'
import { getHistoricalRouteReplayOperationalExplanations } from '../features/operations/historicalRouteReplayExplanationAdapter'
import { getHistoricalRouteReplayMapChromeViews } from '../features/operations/historicalRouteReplayMapChromeAdapter'
import {
  createHistoricalRouteReplayVisibilityForFromKnowledge,
  historicalRouteReplayVisibilityFromKnowledge,
} from '../features/operations/historicalRouteReplayVisibilityFromKnowledge'

const projectorSourcePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../features/operations/historicalRouteReplayVisibilityFromKnowledge.ts'
)

const panelSourcePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../features/dashboard/OperationsReportPanel.tsx'
)

function phantomCoachGraph(options?: {
  coachKnowledge?: 'unknown' | 'inferred' | 'verified'
  coachConfidence?: number
  allUnknown?: boolean
}): HistoricalRouteMemoryGraph {
  const empty = createHistoricalRouteMemoryGraph('site:old-coach-road')
  if (!empty) throw new Error('fixture graph was not created')

  const coachState = options?.allUnknown ? 'unknown' : (options?.coachKnowledge ?? 'inferred')
  const coachConfidence = options?.allUnknown ? 0 : (options?.coachConfidence ?? 0.55)

  const remembered = rememberHistoricalRouteActivation(empty, {
    activationId: 'activation:historical-crash',
    anchors: [
      {
        id: 'anchor:moor-road',
        kind: 'activation_point',
        knowledgeState: options?.allUnknown ? 'unknown' : 'inferred',
        reconnaissanceConfidence: options?.allUnknown ? 0 : 0.5,
      },
      {
        id: 'anchor:coach-road',
        kind: 'landmark',
        knowledgeState: coachState,
        reconnaissanceConfidence: coachConfidence,
      },
      {
        id: 'anchor:broken-parapet',
        kind: 'historical_exit',
        knowledgeState: options?.allUnknown ? 'unknown' : 'inferred',
        reconnaissanceConfidence: options?.allUnknown ? 0 : 0.5,
      },
    ],
    edges: [
      {
        id: 'edge:moor-coach-road',
        routeKind: 'recurring_site',
        fromAnchorId: 'anchor:moor-road',
        toAnchorId: 'anchor:coach-road',
        knowledgeState: options?.allUnknown ? 'unknown' : 'inferred',
        reconnaissanceConfidence: options?.allUnknown ? 0 : 0.5,
      },
      {
        id: 'edge:coach-road-parapet',
        routeKind: 'historical_exit',
        fromAnchorId: 'anchor:coach-road',
        toAnchorId: 'anchor:broken-parapet',
        knowledgeState: options?.allUnknown ? 'unknown' : 'inferred',
        reconnaissanceConfidence: options?.allUnknown ? 0 : 0.5,
      },
    ],
  })

  return reactivateHistoricalRouteEdges(remembered, 'activation:current-night', [
    'edge:moor-coach-road',
    'edge:coach-road-parapet',
  ])
}

function createApproaching(
  eventId: string,
  graph: HistoricalRouteMemoryGraph = phantomCoachGraph()
): HistoricalRouteReplayRecord {
  const replay = createHistoricalRouteReplay(graph, {
    eventId,
    activationId: 'activation:current-night',
    originAnchorId: 'anchor:moor-road',
    terminalAnchorId: 'anchor:broken-parapet',
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

describe('SPE-3032 historical-route replay visibility from knowledge', () => {
  it('expands authorized anchors for inferred knowledge without leaking full route', () => {
    const graph = phantomCoachGraph({ coachKnowledge: 'inferred', coachConfidence: 0.55 })
    const record = createApproaching('event:inferred', graph)
    const conservative = defaultConservativeHistoricalRouteReplayVisibility(record)

    const visibility = historicalRouteReplayVisibilityFromKnowledge(record, [graph])

    expect(visibility.knownAnchorIds).toEqual(
      expect.arrayContaining([
        ...conservative.knownAnchorIds,
        'anchor:coach-road',
        'anchor:moor-road',
        'anchor:broken-parapet',
      ])
    )
    expect(visibility.knownAnchorIds).toContain('anchor:coach-road')
    expect(visibility.includeFullRoute).toBe(false)
    expect(visibility.includeObserverExposures).toBe(false)
  })

  it('authorizes full route when verified knowledge is present', () => {
    const graph = phantomCoachGraph({ coachKnowledge: 'verified', coachConfidence: 0.9 })
    const record = createApproaching('event:verified', graph)

    const visibility = historicalRouteReplayVisibilityFromKnowledge(record, [graph])

    expect(visibility.knownAnchorIds).toContain('anchor:coach-road')
    expect(visibility.includeFullRoute).toBe(true)
    expect(visibility.includeObserverExposures).toBe(true)
  })

  it('authorizes full route when high reconnaissanceConfidence is present without verified', () => {
    const graph = phantomCoachGraph({ coachKnowledge: 'inferred', coachConfidence: 0.8 })
    const record = createApproaching('event:high-confidence', graph)

    const visibility = historicalRouteReplayVisibilityFromKnowledge(record, [graph])

    expect(visibility.includeFullRoute).toBe(true)
    expect(visibility.includeObserverExposures).toBe(true)
  })

  it('returns conservative fallback for empty registry, missing graph, or all-unknown', () => {
    const record = createApproaching('event:fallback')
    const conservative = defaultConservativeHistoricalRouteReplayVisibility(record)

    expect(historicalRouteReplayVisibilityFromKnowledge(record, {})).toEqual(conservative)
    expect(historicalRouteReplayVisibilityFromKnowledge(record, [])).toEqual(conservative)

    const unrelated = createHistoricalRouteMemoryGraph('site:unrelated')
    if (!unrelated) throw new Error('unrelated graph missing')
    expect(historicalRouteReplayVisibilityFromKnowledge(record, [unrelated])).toEqual(conservative)

    const allUnknown = phantomCoachGraph({ allUnknown: true })
    const unknownRecord = createApproaching('event:all-unknown', allUnknown)
    expect(historicalRouteReplayVisibilityFromKnowledge(unknownRecord, [allUnknown])).toEqual(
      defaultConservativeHistoricalRouteReplayVisibility(unknownRecord)
    )
  })

  it('drives explanation and map chrome with the same visibilityFor', () => {
    const graph = phantomCoachGraph({ coachKnowledge: 'inferred', coachConfidence: 0.55 })
    const record = createApproaching('event:shared', graph)
    const replayRegistry = deepFreeze(
      normalizeHistoricalRouteReplayRegistry({
        [record.eventId]: record,
      })
    )
    const memoryGraphs = deepFreeze(
      normalizeHistoricalRouteMemoryGraphRegistry({
        [graph.siteId]: graph,
      })
    )
    const beforeReplays = structuredClone(replayRegistry)
    const beforeGraphs = structuredClone(memoryGraphs)

    const visibilityFor = createHistoricalRouteReplayVisibilityForFromKnowledge(memoryGraphs)
    const visibility = visibilityFor(record)

    const explanations = getHistoricalRouteReplayOperationalExplanations(
      replayRegistry,
      visibilityFor
    )
    const chrome = getHistoricalRouteReplayMapChromeViews(
      replayRegistry,
      memoryGraphs,
      visibilityFor
    )

    expect(explanations).toHaveLength(1)
    expect(chrome).toHaveLength(1)
    expect(visibility.includeFullRoute).toBe(false)
    expect(visibility.includeObserverExposures).toBe(false)
    // Shared gate: chrome shows exactly the route anchors authorized by the same visibility.
    expect(chrome[0]!.anchors.map((anchor) => anchor.anchorId)).toEqual(
      [...visibility.knownAnchorIds].filter((id) => record.routeAnchorIds.includes(id)).sort()
    )
    expect(chrome[0]!.anchors.some((anchor) => anchor.anchorId === 'anchor:coach-road')).toBe(true)
    // Low knowledge must not dump the full route into explanation text.
    expect(explanations[0]!.cause).not.toMatch(/Full route anchors:/)
    expect(explanations[0]!.currentEffect).not.toMatch(/Full route anchors:/)

    expect(replayRegistry).toEqual(beforeReplays)
    expect(memoryGraphs).toEqual(beforeGraphs)
    expect(Object.isFrozen(replayRegistry)).toBe(true)
    expect(Object.isFrozen(memoryGraphs)).toBe(true)
  })

  it('does not invent missing graph rows when expanding known anchors', () => {
    const graph = phantomCoachGraph({ coachKnowledge: 'inferred' })
    const record = createApproaching('event:no-invent', graph)
    const visibility = historicalRouteReplayVisibilityFromKnowledge(record, [graph])

    expect(visibility.knownAnchorIds.every((id) => typeof id === 'string')).toBe(true)
    expect(visibility.knownAnchorIds).not.toContain('anchor:invented')
    for (const id of visibility.knownAnchorIds) {
      const onRecord =
        record.exposedAnchorIds.includes(id) ||
        id === record.currentAnchorId ||
        id === record.originAnchorId ||
        id === record.terminalAnchorId ||
        record.routeAnchorIds.includes(id)
      const onGraph = graph.anchors.some((anchor) => anchor.id === id)
      expect(onRecord || onGraph).toBe(true)
    }
  })

  it('does not import SPE-3024 activation; OperationsReportPanel wires the projector', () => {
    const projectorSource = readFileSync(projectorSourcePath, 'utf8')
    expect(projectorSource).not.toMatch(/historicalRouteReplayActivation/)
    expect(projectorSource).not.toMatch(/activateHistoricalRouteReplay/)
    expect(projectorSource).not.toMatch(/from ['"].*knowledge['"]/)
    expect(projectorSource).not.toMatch(/from ['"].*intel['"]/)

    const panelSource = readFileSync(panelSourcePath, 'utf8')
    expect(panelSource).toMatch(/createHistoricalRouteReplayVisibilityForFromKnowledge/)
    expect(panelSource).toMatch(/visibilityFor/)
    expect(panelSource).not.toMatch(/historicalRouteReplayActivation/)
  })
})
