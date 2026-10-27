import { describe, expect, it } from 'vitest'
import {
  projectInformationSourceAccess,
  reprojectInformationSourceAccess,
  type ProducerAccessSnapshot,
} from '../domain/informationSourceAccessProjection'

function baseSnapshot(
  overrides: Partial<ProducerAccessSnapshot> = {}
): ProducerAccessSnapshot {
  return {
    sourceRef: { family: 'archive', id: 'vault:alpha' },
    producerFamily: 'lightweight_archive',
    simulationDepth: 'lightweight',
    routes: [
      {
        routeId: 'route:physical',
        mode: 'physical',
        state: 'open',
        availability: 'usable',
        retrievalCompleteness: 'complete_for_request',
        accessBreadth: 2,
        accessDepth: 1,
        reasonCode: 'door_open',
      },
      {
        routeId: 'route:remote',
        mode: 'remote',
        state: 'open',
        availability: 'usable',
        retrievalCompleteness: 'partial',
        reasonCode: 'terminal_up',
      },
    ],
    ...overrides,
  }
}

describe('SPE-3471 information-source access projection', () => {
  it('keeps one route usable when the other is revoked without destroying the source', () => {
    const result = projectInformationSourceAccess(
      baseSnapshot({
        routes: [
          {
            routeId: 'route:physical',
            mode: 'physical',
            state: 'revoked',
            availability: 'unavailable',
            reasonCode: 'badge_revoked',
          },
          {
            routeId: 'route:remote',
            mode: 'remote',
            state: 'open',
            availability: 'usable',
            retrievalCompleteness: 'partial',
            reasonCode: 'terminal_up',
          },
        ],
      })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.handoff.sourceDestroyed).toBe(false)
    expect(result.handoff.usableRouteIds).toEqual(['route:remote'])
    expect(result.handoff.overallAvailability).toBe('usable')
    expect(result.handoff.routes.find((r) => r.routeId === 'route:physical')?.state).toBe(
      'revoked'
    )
  })

  it('distinguishes unavailable, conditional/partial, and usable availability', () => {
    const unavailable = projectInformationSourceAccess(
      baseSnapshot({
        routes: [
          {
            routeId: 'r1',
            mode: 'physical',
            state: 'blocked',
            availability: 'unavailable',
          },
        ],
      })
    )
    const conditional = projectInformationSourceAccess(
      baseSnapshot({
        routes: [
          {
            routeId: 'r1',
            mode: 'credentialed',
            state: 'conditional',
            availability: 'conditional',
          },
        ],
      })
    )
    const usable = projectInformationSourceAccess(baseSnapshot())
    expect(unavailable.ok && unavailable.handoff.overallAvailability).toBe('unavailable')
    expect(conditional.ok && conditional.handoff.overallAvailability).toBe('conditional')
    expect(usable.ok && usable.handoff.overallAvailability).toBe('usable')
  })

  it('keeps retrieval completeness orthogonal to confidence and truth', () => {
    const result = projectInformationSourceAccess(
      baseSnapshot({
        handoffConfidence: 'compromised',
        routes: [
          {
            routeId: 'r1',
            mode: 'digital',
            state: 'open',
            availability: 'usable',
            retrievalCompleteness: 'metadata_only',
          },
        ],
      })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.handoff.routes[0]?.retrievalCompleteness).toBe('metadata_only')
    expect(result.handoff.handoffConfidence).toBe('compromised')
    expect(result.handoff).not.toHaveProperty('verifiedTruth')
    expect(result.handoff).not.toHaveProperty('analyticalSourceCapacity')
    expect(result.handoff).not.toHaveProperty('researchCapacity')
  })

  it('exposes access breadth/depth without minting SPE-3470 capacity', () => {
    const result = projectInformationSourceAccess(baseSnapshot())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.handoff.routes[0]?.accessBreadth).toBe(2)
    expect(result.handoff.routes[0]?.accessDepth).toBe(1)
    expect(JSON.stringify(result.handoff)).not.toMatch(/analytical|researchCapacity|sourceCapacity/i)
  })

  it('does not auto-mitigate when a countermeasure is only detected', () => {
    const result = projectInformationSourceAccess(
      baseSnapshot({
        routes: [
          {
            routeId: 'r1',
            mode: 'digital',
            state: 'open',
            availability: 'partial',
            countermeasureDetected: true,
            countermeasureMitigated: false,
            constraintRefs: [{ family: 'hazard', id: 'monitor:ward' }],
          },
        ],
      })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.handoff.routes[0]?.countermeasureDetected).toBe(true)
    expect(result.handoff.routes[0]?.countermeasureMitigated).toBe(false)
    expect(result.handoff.routes[0]?.constraintRefs).toEqual([
      { family: 'hazard', id: 'monitor:ward' },
    ])
  })

  it('rejects mitigated-without-detected as malformed producer facts', () => {
    expect(
      projectInformationSourceAccess(
        baseSnapshot({
          routes: [
            {
              routeId: 'r1',
              mode: 'digital',
              state: 'open',
              availability: 'usable',
              countermeasureDetected: false,
              countermeasureMitigated: true,
            },
          ],
        })
      )
    ).toEqual({ ok: false, rejection: 'detect_implies_mitigated', detail: 'r1' })
  })

  it('recomposes deterministically after a producer mutation with SPE-2273 trace', () => {
    const first = projectInformationSourceAccess(baseSnapshot())
    const mutated = reprojectInformationSourceAccess(
      baseSnapshot({
        mutationReasonCode: 'producer_route_revoked',
        routes: [
          {
            routeId: 'route:physical',
            mode: 'physical',
            state: 'revoked',
            availability: 'unavailable',
            reasonCode: 'badge_revoked',
          },
          {
            routeId: 'route:remote',
            mode: 'remote',
            state: 'open',
            availability: 'usable',
            retrievalCompleteness: 'partial',
            reasonCode: 'terminal_up',
          },
        ],
      })
    )
    expect(first.ok && mutated.ok).toBe(true)
    if (!first.ok || !mutated.ok) return
    expect(mutated.handoff.compositionTrace.steps.length).toBeGreaterThan(0)
    expect(mutated.handoff.compositionTrace.steps.every((s) => s.kind === 'translate')).toBe(true)
    expect(mutated.handoff.authoritativeReasonCodes).toContain('producer_route_revoked')
    expect(first.handoff).not.toEqual(mutated.handoff)
  })

  it('accepts lightweight and detailed producers on the same handoff shape', () => {
    const light = projectInformationSourceAccess(baseSnapshot({ simulationDepth: 'lightweight' }))
    const detailed = projectInformationSourceAccess(
      baseSnapshot({
        producerFamily: 'detailed_infiltration',
        simulationDepth: 'detailed',
        routes: [
          {
            routeId: 'route:physical',
            mode: 'physical',
            state: 'open',
            availability: 'usable',
            retrievalCompleteness: 'complete_for_request',
            accessBreadth: 4,
            accessDepth: 3,
            countermeasureDetected: true,
            countermeasureMitigated: true,
            constraintRefs: [{ family: 'ci', id: 'pressure:patrol' }],
            reasonEventRef: { family: 'event', id: 'evt:42' },
          },
          {
            routeId: 'route:social',
            mode: 'social',
            state: 'conditional',
            availability: 'conditional',
            retrievalCompleteness: 'fragmentary',
          },
        ],
      })
    )
    expect(light.ok && detailed.ok).toBe(true)
    if (!light.ok || !detailed.ok) return
    expect(Object.keys(light.handoff).sort()).toEqual(Object.keys(detailed.handoff).sort())
    expect(detailed.handoff.simulationDepth).toBe('detailed')
    expect(light.handoff.simulationDepth).toBe('lightweight')
  })

  it('redacts hidden routes and monitoring from player-facing reasons', () => {
    const result = projectInformationSourceAccess(
      baseSnapshot({
        mutationReasonCode: 'scan_complete',
        routes: [
          {
            routeId: 'route:hidden',
            mode: 'anomalous',
            state: 'open',
            availability: 'usable',
            hiddenFromPlayer: true,
            countermeasureDetected: true,
            countermeasureMitigated: false,
            constraintRefs: [{ family: 'monitor', id: 'hidden-sensor' }],
            reasonCode: 'secret_tunnel',
          },
          {
            routeId: 'route:public',
            mode: 'archive',
            state: 'open',
            availability: 'usable',
            reasonCode: 'catalog_open',
          },
        ],
      })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.handoff.authoritativeReasonCodes).toEqual(
      expect.arrayContaining(['secret_tunnel', 'cm_detected:route:hidden', 'catalog_open'])
    )
    expect(result.handoff.playerFacingReasonCodes).toContain('catalog_open')
    expect(result.handoff.playerFacingReasonCodes).toContain('scan_complete')
    expect(result.handoff.playerFacingReasonCodes).not.toContain('secret_tunnel')
    expect(result.handoff.playerFacingReasonCodes).not.toContain('cm_detected:route:hidden')
    expect(result.handoff.playerFacingReasonCodes.join(',')).not.toMatch(/hidden-sensor/)
  })

  it('is byte-stable under route input reordering', () => {
    const forward = projectInformationSourceAccess(baseSnapshot())
    const reversed = projectInformationSourceAccess(
      baseSnapshot({
        routes: [...baseSnapshot().routes].reverse(),
      })
    )
    expect(forward).toEqual(reversed)
  })

  it('does not create a mutable access ledger field', () => {
    const result = projectInformationSourceAccess(baseSnapshot())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.handoff).not.toHaveProperty('accessLedger')
    expect(result.handoff).not.toHaveProperty('persistedAccessState')
    expect(result).not.toHaveProperty('GameState')
  })
})
