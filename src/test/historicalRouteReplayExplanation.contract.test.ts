import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  advanceHistoricalRouteReplay,
  createHistoricalRouteReplay,
  interceptHistoricalRouteReplay,
  normalizeHistoricalRouteReplayRegistry,
  resolveHistoricalRouteReplayTerminal,
  type HistoricalRouteReplayRecord,
} from '../domain/historicalRouteReplay'
import {
  createHistoricalRouteMemoryGraph,
  reactivateHistoricalRouteEdges,
  rememberHistoricalRouteActivation,
  type HistoricalRouteMemoryGraph,
} from '../domain/historicalRouteMemory'
import {
  projectOperationalExplanation,
  validateOperationalExplanationRecord,
  validateOperationalExplanationRegistry,
} from '../domain/operationalExplanation'
import {
  defaultConservativeHistoricalRouteReplayVisibility,
  getHistoricalRouteReplayOperationalExplanations,
  projectHistoricalRouteReplayExplanation,
  type HistoricalRouteReplayVisibility,
} from '../features/operations/historicalRouteReplayExplanationAdapter'

const adapterSourcePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../features/operations/historicalRouteReplayExplanationAdapter.ts'
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

function createApproaching(eventId: string): HistoricalRouteReplayRecord {
  const replay = createHistoricalRouteReplay(phantomCoachGraph(), {
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

function assertUnresolvedWording(text: string): void {
  expect(text).toMatch(/causal classification remains unresolved/i)
  expect(text).not.toMatch(
    /\b(is a haunting|is supernatural|possesses|entity intent|ghostly cause|identified cause as)\b/i
  )
}

describe('SPE-3026 historical-route replay explanation projection', () => {
  it('projects a persisted replay without mutating canonical registry state', () => {
    const approaching = createApproaching('event:phantom-coach')
    const registry = deepFreeze(
      normalizeHistoricalRouteReplayRegistry({
        [approaching.eventId]: approaching,
      })
    )
    const before = structuredClone(registry)

    const explanations = getHistoricalRouteReplayOperationalExplanations(registry)
    expect(explanations).toHaveLength(1)
    expect(validateOperationalExplanationRecord(explanations[0]!).valid).toBe(true)
    expect(explanations[0]).toMatchObject({
      source: { system: 'historical_route_replay', recordType: 'replay_record' },
      reasonCode: 'historical_route_replay.phase_approaching',
      severity: 'pending',
      lifecycle: 'active',
    })
    assertUnresolvedWording(explanations[0]!.cause)
    assertUnresolvedWording(explanations[0]!.currentEffect)

    expect(registry).toEqual(before)
    expect(Object.isFrozen(registry)).toBe(true)
    expect(Object.isFrozen(registry[approaching.eventId])).toBe(true)
  })

  it('produces deterministic bounded presentation for approaching/traversing/terminal/ended', () => {
    const approaching = createApproaching('event:phase-walk')
    const traversing = advanceHistoricalRouteReplay(approaching)
    const terminal = advanceHistoricalRouteReplay(traversing)
    const ended = resolveHistoricalRouteReplayTerminal(terminal, {
      consequenceId: 'consequence:ordinary-crash',
      kind: 'historical_route_terminal',
      subjectId: 'subject:roadway',
    })

    const phases: Array<{
      record: HistoricalRouteReplayRecord
      reasonCode: string
      severity: string
      lifecycle: string
    }> = [
      {
        record: approaching,
        reasonCode: 'historical_route_replay.phase_approaching',
        severity: 'pending',
        lifecycle: 'active',
      },
      {
        record: traversing,
        reasonCode: 'historical_route_replay.phase_traversing',
        severity: 'pending',
        lifecycle: 'active',
      },
      {
        record: terminal,
        reasonCode: 'historical_route_replay.phase_terminal',
        severity: 'uncertain',
        lifecycle: 'active',
      },
      {
        record: ended,
        reasonCode: 'historical_route_replay.phase_ended',
        severity: 'uncertain',
        lifecycle: 'resolved',
      },
    ]

    for (const entry of phases) {
      const explanation = projectHistoricalRouteReplayExplanation(
        entry.record,
        defaultConservativeHistoricalRouteReplayVisibility(entry.record)
      )
      expect(explanation).toMatchObject({
        reasonCode: entry.reasonCode,
        severity: entry.severity,
        lifecycle: entry.lifecycle,
      })
      expect(validateOperationalExplanationRecord(explanation).valid).toBe(true)
      assertUnresolvedWording(explanation.cause)

      const summary = projectOperationalExplanation(explanation, 'summary')
      const detail = projectOperationalExplanation(explanation, 'detail')
      const diagnostic = projectOperationalExplanation(explanation, 'diagnostic')
      expect(summary.reasonCode).toBe(entry.reasonCode)
      expect(detail.cause).toContain('unresolved')
      expect(diagnostic.source.system).toBe('historical_route_replay')
    }
  })

  it('omits contact/post-contact evidence unless includeObserverExposures is true', () => {
    const approaching = createApproaching('event:contact')
    const contacted = interceptHistoricalRouteReplay(
      approaching,
      'observer:patrol',
      'anchor:moor-road'
    )
    expect(contacted.observerExposures).toHaveLength(1)

    const conservative = projectHistoricalRouteReplayExplanation(
      contacted,
      defaultConservativeHistoricalRouteReplayVisibility(contacted)
    )
    expect(conservative.cause).not.toContain('observer:patrol')
    expect(conservative.cause).not.toContain('contact/')
    expect(conservative.currentEffect).not.toContain('observer:patrol')

    const withExposuresVisibility: HistoricalRouteReplayVisibility = {
      ...defaultConservativeHistoricalRouteReplayVisibility(contacted),
      includeObserverExposures: true,
    }
    const exposed = projectHistoricalRouteReplayExplanation(contacted, withExposuresVisibility)
    expect(exposed.cause).toContain('observer:patrol')
    expect(exposed.cause).toContain('contact')
    expect(exposed.cause).toContain('anchor:moor-road')
    assertUnresolvedWording(exposed.cause)
  })

  it('surfaces ordinary consequence on ended while retaining unresolved causality wording', () => {
    const approaching = createApproaching('event:ended')
    const terminal = advanceHistoricalRouteReplay(advanceHistoricalRouteReplay(approaching))
    const ended = resolveHistoricalRouteReplayTerminal(terminal, {
      consequenceId: 'consequence:ordinary-crash',
      kind: 'historical_route_terminal',
      subjectId: 'subject:roadway',
    })

    const explanation = projectHistoricalRouteReplayExplanation(
      ended,
      defaultConservativeHistoricalRouteReplayVisibility(ended)
    )
    expect(explanation.lifecycle).toBe('resolved')
    expect(explanation.projectedConsequence).toContain('consequence:ordinary-crash')
    expect(explanation.projectedConsequence).toContain('ordinary_world')
    expect(explanation.currentEffect).toContain('consequence:ordinary-crash')
    assertUnresolvedWording(explanation.cause)
    assertUnresolvedWording(explanation.currentEffect)
    expect(explanation.provenance).toContain('causal:unresolved')
  })

  it('keeps hidden route and evidence out of lower-knowledge projections', () => {
    const approaching = createApproaching('event:hidden')
    const traversing = advanceHistoricalRouteReplay(approaching)
    const contacted = interceptHistoricalRouteReplay(
      traversing,
      'observer:witness',
      'anchor:coach-road'
    )

    const lowKnowledge: HistoricalRouteReplayVisibility = {
      knownAnchorIds: ['anchor:moor-road'],
      includeObserverExposures: false,
      includeFullRoute: false,
    }
    const explanation = projectHistoricalRouteReplayExplanation(contacted, lowKnowledge)

    expect(explanation.cause).toContain('anchor:moor-road')
    expect(explanation.cause).not.toContain('anchor:coach-road')
    expect(explanation.cause).not.toContain('anchor:broken-parapet')
    expect(explanation.cause).not.toContain('observer:witness')
    expect(explanation.cause).not.toMatch(/Full route anchors/)

    const fullRoute = projectHistoricalRouteReplayExplanation(contacted, {
      knownAnchorIds: ['anchor:moor-road', 'anchor:coach-road', 'anchor:broken-parapet'],
      includeObserverExposures: true,
      includeFullRoute: true,
    })
    expect(fullRoute.cause).toContain('Full route anchors:')
    expect(fullRoute.cause).toContain('anchor:broken-parapet')
    expect(fullRoute.cause).toContain('observer:witness')
  })

  it('orders presentation deterministically even when registry keys are reordered', () => {
    const alpha = createApproaching('event:alpha')
    const beta = advanceHistoricalRouteReplay(createApproaching('event:beta'))
    const gamma = resolveHistoricalRouteReplayTerminal(
      advanceHistoricalRouteReplay(advanceHistoricalRouteReplay(createApproaching('event:gamma'))),
      { consequenceId: 'consequence:g', kind: 'historical_route_terminal' }
    )

    const forward = getHistoricalRouteReplayOperationalExplanations({
      'event:alpha': alpha,
      'event:beta': beta,
      'event:gamma': gamma,
    })
    const reversed = getHistoricalRouteReplayOperationalExplanations({
      'event:gamma': gamma,
      'event:beta': beta,
      'event:alpha': alpha,
    })

    expect(forward.map((item) => item.id)).toEqual(reversed.map((item) => item.id))
    expect(validateOperationalExplanationRegistry(forward).valid).toBe(true)
    expect(forward.map((item) => item.subjectId)).toEqual([
      'event:alpha',
      'event:beta',
      'event:gamma',
    ])
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
