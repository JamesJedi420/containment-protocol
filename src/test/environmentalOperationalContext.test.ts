import { describe, expect, it } from 'vitest'
import {
  resolveEnvironmentalOperationalContext,
  selectEnvironmentalDimensions,
  type EnvironmentalDimensionPacket,
} from '../domain/environmentalOperationalContext'

function packet(
  overrides: Partial<EnvironmentalDimensionPacket> &
    Pick<EnvironmentalDimensionPacket, 'ownerId' | 'dimensionId' | 'sourceRef'>,
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

const TERRAIN = packet({
  ownerId: 'SPE-3354',
  dimensionId: 'terrain_buildability',
  sourceRef: { family: 'terrain', id: 'plot:alpha' },
  value: { buildable: true },
})

const CLIMATE = packet({
  ownerId: 'SPE-1221',
  dimensionId: 'climate_atmosphere',
  sourceRef: { family: 'climate', id: 'baseline:temperate' },
  value: { band: 'temperate' },
})

const ECOLOGY = packet({
  ownerId: 'SPE-1117',
  dimensionId: 'ecology_pressure',
  sourceRef: { family: 'ecology', id: 'pressure:alpha' },
  value: { pressure: 0.2 },
})

describe('resolveEnvironmentalOperationalContext', () => {
  it('composes three or more distinct owners with a SPE-2273 translation trace', () => {
    const result = resolveEnvironmentalOperationalContext([TERRAIN, CLIMATE, ECOLOGY])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(new Set(result.context.components.map((c) => c.ownerId)).size).toBe(3)
    expect(result.context.compositionTrace.steps.length).toBe(3)
    expect(result.context.compositionTrace.steps.every((step) => step.kind === 'translate')).toBe(
      true,
    )
  })

  it('lets a local override supersede baseline while preserving overridden scope', () => {
    const localClimate = packet({
      ownerId: 'SPE-1221',
      dimensionId: 'climate_atmosphere',
      scope: 'local',
      sourceRef: { family: 'climate', id: 'local:storm-cell' },
      value: { band: 'storm' },
    })
    const result = resolveEnvironmentalOperationalContext([
      TERRAIN,
      CLIMATE,
      ECOLOGY,
      localClimate,
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const climate = result.context.components.find((c) => c.dimensionId === 'climate_atmosphere')
    expect(climate?.scope).toBe('local')
    expect(climate?.value).toEqual({ band: 'storm' })
    expect(climate?.overriddenScopes).toContain('baseline')
  })

  it('supports subset projection for downstream consumers', () => {
    const result = resolveEnvironmentalOperationalContext([TERRAIN, CLIMATE, ECOLOGY])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const subset = selectEnvironmentalDimensions(result.context, [
      'terrain_buildability',
      'ecology_pressure',
    ])
    expect(subset.map((c) => c.dimensionId)).toEqual([
      'terrain_buildability',
      'ecology_pressure',
    ])
  })

  it('recomputes deterministically when an authoritative packet changes', () => {
    const first = resolveEnvironmentalOperationalContext([TERRAIN, CLIMATE, ECOLOGY])
    const updatedClimate = packet({
      ...CLIMATE,
      value: { band: 'arid' },
    })
    const second = resolveEnvironmentalOperationalContext([TERRAIN, updatedClimate, ECOLOGY])
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(first.context.components).not.toEqual(second.context.components)
    expect(
      second.context.components.find((c) => c.dimensionId === 'climate_atmosphere')?.value,
    ).toEqual({ band: 'arid' })
  })

  it('fails closed on same-scope conflicting values', () => {
    const conflict = packet({
      ownerId: 'SPE-3356',
      dimensionId: 'terrain_buildability',
      scope: 'baseline',
      sourceRef: { family: 'terrain', id: 'plot:beta' },
      value: { buildable: false },
    })
    const result = resolveEnvironmentalOperationalContext([TERRAIN, CLIMATE, ECOLOGY, conflict])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.findings.some((f) => f.code === 'conflicting_same_scope')).toBe(true)
  })

  it('is byte-stable for identical inputs', () => {
    const a = resolveEnvironmentalOperationalContext([TERRAIN, CLIMATE, ECOLOGY])
    const b = resolveEnvironmentalOperationalContext([TERRAIN, CLIMATE, ECOLOGY])
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('rejects chains with fewer than three distinct owners', () => {
    const result = resolveEnvironmentalOperationalContext([TERRAIN, CLIMATE])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.findings.some((f) => f.code === 'insufficient_owners')).toBe(true)
  })
})
