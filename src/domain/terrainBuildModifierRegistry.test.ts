import { describe, expect, it } from 'vitest'
import {
  listTerrainConditions,
  lookupBuildModifier,
  resolveBuildability,
  type BuildabilityClass,
} from './terrainBuildModifierRegistry'

describe('SPE-3356 terrain build modifier registry', () => {
  it('returns distinct buildability for open vs contaminated plots', () => {
    const open = resolveBuildability('open_ground')
    const contaminated = resolveBuildability('contaminated_plot')

    expect(open?.buildability).toBe('buildable')
    expect(open?.canBuildHeavy).toBe(true)
    expect(open?.costMultiplier).toBe(1.0)
    expect(open?.blockedReason).toBeUndefined()

    expect(contaminated?.buildability).toBe('contaminated')
    expect(contaminated?.blockedReason).toBe('requires_clearance')
    expect(contaminated?.canBuildHeavy).toBe(false)
  })

  it('improved land produces a positive (cheaper) modifier', () => {
    const improved = resolveBuildability('improved_land')
    expect(improved?.buildability).toBe('improved')
    expect(improved?.costMultiplier).toBeLessThan(1)
    expect(improved?.canBuildHeavy).toBe(true)
  })

  it('obstructed plot is no-build until clearance', () => {
    const obstructed = resolveBuildability('obstructed_route')
    expect(obstructed?.buildability).toBe('obstructed')
    expect(obstructed?.blockedReason).toBe('obstructed')
    expect(obstructed?.canBuildLightweight).toBe(false)
  })

  it('support capability implication: heavy implies lower classes', () => {
    const open = resolveBuildability('open_ground')
    expect(open?.canBuildLightweight).toBe(true)
    expect(open?.canBuildMedium).toBe(true)
    expect(open?.canBuildHeavy).toBe(true)

    const marsh = resolveBuildability('unstable_marsh')
    expect(marsh?.canBuildLightweight).toBe(true)
    expect(marsh?.canBuildMedium).toBe(false)
    expect(marsh?.canBuildHeavy).toBe(false)
  })

  it('unknown condition returns undefined (fail closed)', () => {
    expect(lookupBuildModifier('nonexistent')).toBeUndefined()
    expect(resolveBuildability('nonexistent')).toBeUndefined()
  })

  it('registry is deterministic and lists known conditions', () => {
    const list = listTerrainConditions()
    expect(list.length).toBeGreaterThanOrEqual(4)
    const ids = list.map((e) => e.conditionId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('improved_land')
  })

  it('legal/ownership is not encoded here (separate from SPE-3355)', () => {
    const entry = lookupBuildModifier('open_ground')
    expect(entry).toBeDefined()
    // no claim/ownership fields present
    expect(Object.keys(entry ?? {})).not.toContain('claimState')
  })
})
