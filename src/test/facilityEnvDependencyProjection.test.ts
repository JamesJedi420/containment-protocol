import { describe, expect, it } from 'vitest'
import {
  resolveEnvironmentalOperationalContext,
  type EnvironmentalDimensionPacket,
} from '../domain/environmentalOperationalContext'
import { readRepresentativeFacilityDependencyGraph } from '../domain/facilityDependencyGraph'
import {
  projectEnvironmentalContextToFacilityDependencyPacket,
  readRepresentativeFacilityEnvBindings,
  resolveFacilityDependencyFromEnvironmentalContext,
} from '../domain/facilityEnvDependencyProjection'

const HUB = 'core:facility_hub'
const ROUTING = 'service:routing'
const ALERT = 'capability:alert_timing'
const LOGISTICS = 'capability:logistics_freshness'
const ARCHIVE = 'service:archive_integrity'

const NODE_IDS = [HUB, ROUTING, ALERT, LOGISTICS, ARCHIVE] as const

function packet(
  overrides: Partial<EnvironmentalDimensionPacket> &
    Pick<EnvironmentalDimensionPacket, 'ownerId' | 'dimensionId' | 'sourceRef'>
): EnvironmentalDimensionPacket {
  return {
    ownerId: overrides.ownerId,
    dimensionId: overrides.dimensionId,
    scope: overrides.scope ?? 'baseline',
    sourceRef: overrides.sourceRef,
    value: overrides.value ?? { ok: true },
    valid: overrides.valid ?? true,
    ...(overrides.reasonCode !== undefined ? { reasonCode: overrides.reasonCode } : {}),
  }
}

function readyBaseline(): Record<string, { availability: 'ready'; sourceRef: string }> {
  const sources: Record<string, { availability: 'ready'; sourceRef: string }> = {}
  for (const id of NODE_IDS) {
    sources[id] = { availability: 'ready', sourceRef: `baseline:${id}` }
  }
  return sources
}

function threeOwnerContext(
  hazardSupport: 'ready' | 'degraded' | 'unavailable' = 'degraded'
) {
  return resolveEnvironmentalOperationalContext([
    packet({
      ownerId: 'SPE-3354',
      dimensionId: 'terrain_buildability',
      sourceRef: { family: 'terrain', id: 'plot:alpha' },
      value: { buildable: true },
    }),
    packet({
      ownerId: 'SPE-1221',
      dimensionId: 'climate_atmosphere',
      sourceRef: { family: 'climate', id: 'baseline:temperate' },
      value: { band: 'temperate' },
    }),
    packet({
      ownerId: 'SPE-1075',
      dimensionId: 'hazard_exposure',
      sourceRef: { family: 'hazard', id: 'zone:flood-margin' },
      value: { facilitySupport: hazardSupport, class: 'flood' },
    }),
  ])
}

describe('SPE-3415 facility env dependency projection', () => {
  const graph = readRepresentativeFacilityDependencyGraph()
  const bindings = readRepresentativeFacilityEnvBindings()

  it('projects a SPE-3390 hazard fixture into routing and cascades alert timing', () => {
    const env = threeOwnerContext('degraded')
    expect(env.ok).toBe(true)
    if (!env.ok) return

    const resolved = resolveFacilityDependencyFromEnvironmentalContext(
      env.context,
      graph,
      bindings,
      readyBaseline(),
      true
    )
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return

    expect(resolved.inputs[ROUTING]).toEqual({
      availability: 'degraded',
      sourceRef: 'hazard/zone:flood-margin',
    })
    expect(resolved.results.find((result) => result.nodeId === ALERT)).toMatchObject({
      availability: 'degraded',
      reason: 'upstream_degraded',
      immediateUpstreamId: ROUTING,
    })
    expect(resolved.envProvenance).toEqual([
      {
        dimensionId: 'hazard_exposure',
        ownerId: 'SPE-1075',
        scope: 'baseline',
        sourceRef: { family: 'hazard', id: 'zone:flood-margin' },
        nodeId: ROUTING,
        availability: 'degraded',
        missingDimension: false,
      },
    ])
  })

  it('keeps legal permission present while an environmental condition degrades a capability', () => {
    const env = threeOwnerContext('unavailable')
    expect(env.ok).toBe(true)
    if (!env.ok) return

    const resolved = resolveFacilityDependencyFromEnvironmentalContext(
      env.context,
      graph,
      bindings,
      readyBaseline(),
      true
    )
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    expect(resolved.facilityPermissionPresent).toBe(true)
    expect(resolved.results.find((result) => result.nodeId === ALERT)?.availability).toBe(
      'unavailable'
    )
  })

  it('leaves an unbound independent capability unchanged', () => {
    const env = threeOwnerContext('degraded')
    expect(env.ok).toBe(true)
    if (!env.ok) return

    const resolved = resolveFacilityDependencyFromEnvironmentalContext(
      env.context,
      graph,
      bindings,
      readyBaseline(),
      true
    )
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    expect(resolved.results.find((result) => result.nodeId === ARCHIVE)).toEqual({
      nodeId: ARCHIVE,
      availability: 'ready',
      reason: 'source_condition',
      causeChain: [],
    })
    expect(resolved.results.find((result) => result.nodeId === LOGISTICS)?.availability).toBe(
      'ready'
    )
  })

  it('fails closed for missing, invalid, or conflicting environmental context', () => {
    expect(
      projectEnvironmentalContextToFacilityDependencyPacket(
        null,
        graph,
        bindings,
        readyBaseline(),
        true
      )
    ).toEqual({ ok: false, rejection: 'invalid_context' })

    const conflict = resolveEnvironmentalOperationalContext([
      packet({
        ownerId: 'SPE-3354',
        dimensionId: 'terrain_buildability',
        sourceRef: { family: 'terrain', id: 'plot:alpha' },
      }),
      packet({
        ownerId: 'SPE-1221',
        dimensionId: 'climate_atmosphere',
        sourceRef: { family: 'climate', id: 'a' },
        value: { band: 'temperate' },
      }),
      packet({
        ownerId: 'SPE-1221',
        dimensionId: 'climate_atmosphere',
        sourceRef: { family: 'climate', id: 'b' },
        value: { band: 'arid' },
      }),
      packet({
        ownerId: 'SPE-1075',
        dimensionId: 'hazard_exposure',
        sourceRef: { family: 'hazard', id: 'zone:x' },
        value: { facilitySupport: 'ready' },
      }),
    ])
    expect(conflict.ok).toBe(false)
    // Conflicting SPE-3390 resolution yields no context object — projectors must
    // reject non-context inputs rather than invent ready support.
    expect(
      projectEnvironmentalContextToFacilityDependencyPacket(
        conflict.ok ? conflict.context : ({ components: [], compositionTrace: null } as never),
        graph,
        bindings,
        readyBaseline(),
        true
      )
    ).toEqual({ ok: false, rejection: 'invalid_context' })

    const withoutHazard = resolveEnvironmentalOperationalContext([
      packet({
        ownerId: 'SPE-3354',
        dimensionId: 'terrain_buildability',
        sourceRef: { family: 'terrain', id: 'plot:alpha' },
      }),
      packet({
        ownerId: 'SPE-1221',
        dimensionId: 'climate_atmosphere',
        sourceRef: { family: 'climate', id: 'baseline:temperate' },
      }),
      packet({
        ownerId: 'SPE-1117',
        dimensionId: 'ecology_pressure',
        sourceRef: { family: 'ecology', id: 'pressure:alpha' },
      }),
    ])
    expect(withoutHazard.ok).toBe(true)
    if (!withoutHazard.ok) return

    const missingDim = resolveFacilityDependencyFromEnvironmentalContext(
      withoutHazard.context,
      graph,
      bindings,
      readyBaseline(),
      true
    )
    expect(missingDim.ok).toBe(true)
    if (!missingDim.ok) return
    expect(missingDim.inputs[ROUTING]?.availability).toBe('unavailable')
    expect(missingDim.envProvenance[0]?.missingDimension).toBe(true)
    expect(missingDim.results.find((result) => result.nodeId === ALERT)?.availability).toBe(
      'unavailable'
    )

    const badSupport = resolveEnvironmentalOperationalContext([
      packet({
        ownerId: 'SPE-3354',
        dimensionId: 'terrain_buildability',
        sourceRef: { family: 'terrain', id: 'plot:alpha' },
      }),
      packet({
        ownerId: 'SPE-1221',
        dimensionId: 'climate_atmosphere',
        sourceRef: { family: 'climate', id: 'baseline:temperate' },
      }),
      packet({
        ownerId: 'SPE-1075',
        dimensionId: 'hazard_exposure',
        sourceRef: { family: 'hazard', id: 'zone:bad' },
        value: { facilitySupport: 'locked' },
      }),
    ])
    expect(badSupport.ok).toBe(true)
    if (!badSupport.ok) return
    expect(
      projectEnvironmentalContextToFacilityDependencyPacket(
        badSupport.context,
        graph,
        bindings,
        readyBaseline(),
        true
      )
    ).toEqual({ ok: false, rejection: 'malformed_support_value' })
  })

  it('is byte-stable under binding and baseline key reordering', () => {
    const env = resolveEnvironmentalOperationalContext([
      packet({
        ownerId: 'SPE-3354',
        dimensionId: 'terrain_buildability',
        sourceRef: { family: 'terrain', id: 'plot:alpha' },
        value: { facilitySupport: 'degraded' },
      }),
      packet({
        ownerId: 'SPE-1221',
        dimensionId: 'climate_atmosphere',
        sourceRef: { family: 'climate', id: 'baseline:temperate' },
        value: { band: 'temperate' },
      }),
      packet({
        ownerId: 'SPE-1075',
        dimensionId: 'hazard_exposure',
        sourceRef: { family: 'hazard', id: 'zone:flood-margin' },
        value: { facilitySupport: 'unavailable', class: 'flood' },
      }),
    ])
    expect(env.ok).toBe(true)
    if (!env.ok) return

    const multiBindings = [
      { dimensionId: 'hazard_exposure' as const, nodeId: ROUTING },
      { dimensionId: 'terrain_buildability' as const, nodeId: HUB },
    ]
    const baseline = readyBaseline()
    const reversedBaseline: Record<string, { availability: 'ready'; sourceRef: string }> = {}
    for (const id of [...NODE_IDS].reverse()) {
      reversedBaseline[id] = baseline[id]!
    }
    const forward = resolveFacilityDependencyFromEnvironmentalContext(
      env.context,
      graph,
      multiBindings,
      baseline,
      true
    )
    const reversed = resolveFacilityDependencyFromEnvironmentalContext(
      env.context,
      graph,
      [...multiBindings].reverse(),
      reversedBaseline,
      true
    )
    expect(forward).toEqual(reversed)
    expect(forward.ok && forward.envProvenance.map((row) => row.nodeId)).toEqual([HUB, ROUTING])
  })

  it('never elevates a bound node above a worse non-env baseline', () => {
    const env = threeOwnerContext('ready')
    expect(env.ok).toBe(true)
    if (!env.ok) return

    const baseline = readyBaseline()
    baseline[ROUTING] = {
      availability: 'unavailable',
      sourceRef: 'baseline:routing-outage',
    }

    const resolved = resolveFacilityDependencyFromEnvironmentalContext(
      env.context,
      graph,
      bindings,
      baseline,
      true
    )
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    expect(resolved.inputs[ROUTING]).toEqual({
      availability: 'unavailable',
      sourceRef: 'baseline:routing-outage',
    })
    expect(resolved.results.find((result) => result.nodeId === ALERT)?.availability).toBe(
      'unavailable'
    )
  })

  it('does not invent lifecycle, permission, or unlock authority fields', () => {
    const env = threeOwnerContext('degraded')
    expect(env.ok).toBe(true)
    if (!env.ok) return
    const projected = projectEnvironmentalContextToFacilityDependencyPacket(
      env.context,
      graph,
      bindings,
      readyBaseline(),
      true
    )
    expect(projected.ok).toBe(true)
    if (!projected.ok) return
    expect(projected).not.toHaveProperty('status')
    expect(projected).not.toHaveProperty('lifecycle')
    expect(projected).not.toHaveProperty('unlocks')
    expect(projected).not.toHaveProperty('staffing')
    for (const input of Object.values(projected.packet)) {
      expect(Object.keys(input).sort()).toEqual(['availability', 'sourceRef'])
    }
  })
})
