/**
 * SPE-1072 slice 1 — Wood material deterministic tests
 *
 * Coverage:
 * - build-cost advantage (AC1)
 * - comfort/recovery delta contrast (AC2)
 * - fire vulnerability state transition (AC4)
 * - rot/moisture vulnerability state transition (AC5)
 * - compounded fire+rot → compromised (AC4+AC5)
 * - non-wood inputs do not transition (contrast for AC4/AC5)
 * - provenance modifier positive/zero contrast (AC6)
 * - material-gate accept/reject cases (AC3, AC7)
 * - determinism on repeated calls
 */

import { describe, it, expect } from 'vitest'
import {
  evaluateWoodBuildCostDelta,
  evaluateWoodComfortBonus,
  applyWoodVulnerabilityTrigger,
  resolveWoodProvenanceModifier,
  checkWoodMaterialGate,
} from '../domain/woodMaterial'
import { WOOD_CALIBRATION } from '../domain/sim/calibration'

// ── Build-cost advantage ──────────────────────────────────────────────────────

describe('evaluateWoodBuildCostDelta', () => {
  it('wood in housing returns configured negative cost delta (cheaper than baseline)', () => {
    const result = evaluateWoodBuildCostDelta('wood', 'housing')
    expect(result.costDelta).toBe(WOOD_CALIBRATION.buildCostDelta)
    expect(result.costDelta).toBeLessThan(0)
  })

  it('wood in housing returns configured negative duration delta (faster than baseline)', () => {
    const result = evaluateWoodBuildCostDelta('wood', 'housing')
    expect(result.durationDelta).toBe(WOOD_CALIBRATION.buildDurationDelta)
    expect(result.durationDelta).toBeLessThan(0)
  })

  it('stone returns zero delta (stone IS the baseline)', () => {
    const result = evaluateWoodBuildCostDelta('stone', 'housing')
    expect(result.costDelta).toBe(0)
    expect(result.durationDelta).toBe(0)
  })

  it('metal returns zero delta (metal IS the baseline)', () => {
    const result = evaluateWoodBuildCostDelta('metal', 'housing')
    expect(result.costDelta).toBe(0)
    expect(result.durationDelta).toBe(0)
  })

  it('wood cost delta is strictly smaller than stone/metal (cheaper)', () => {
    const woodResult = evaluateWoodBuildCostDelta('wood', 'storage')
    const stoneResult = evaluateWoodBuildCostDelta('stone', 'storage')
    expect(woodResult.costDelta).toBeLessThan(stoneResult.costDelta)
  })

  it('is deterministic: same inputs produce identical output', () => {
    const a = evaluateWoodBuildCostDelta('wood', 'office')
    const b = evaluateWoodBuildCostDelta('wood', 'office')
    expect(a).toEqual(b)
  })
})

// ── Comfort/recovery bonus ────────────────────────────────────────────────────

describe('evaluateWoodComfortBonus', () => {
  it.each(['housing', 'lounge', 'chapel', 'therapy'] as const)(
    'wood in eligible category %s returns positive recovery and morale deltas',
    (category) => {
      const result = evaluateWoodComfortBonus('wood', category)
      expect(result.recoveryDelta).toBe(WOOD_CALIBRATION.comfortRecoveryDelta)
      expect(result.moraleDelta).toBe(WOOD_CALIBRATION.comfortMoraleDelta)
      expect(result.recoveryDelta).toBeGreaterThan(0)
      expect(result.moraleDelta).toBeGreaterThan(0)
    },
  )

  it('wood in storage returns zero (non-comfort category)', () => {
    const result = evaluateWoodComfortBonus('wood', 'storage')
    expect(result.recoveryDelta).toBe(0)
    expect(result.moraleDelta).toBe(0)
  })

  it('stone in housing returns zero (non-wood)', () => {
    const result = evaluateWoodComfortBonus('stone', 'housing')
    expect(result.recoveryDelta).toBe(0)
    expect(result.moraleDelta).toBe(0)
  })

  it('metal in housing returns zero (non-wood)', () => {
    const result = evaluateWoodComfortBonus('metal', 'housing')
    expect(result.recoveryDelta).toBe(0)
    expect(result.moraleDelta).toBe(0)
  })

  it('wood recovery delta is strictly higher than stone in housing (AC2 contrast)', () => {
    const woodResult = evaluateWoodComfortBonus('wood', 'housing')
    const stoneResult = evaluateWoodComfortBonus('stone', 'housing')
    expect(woodResult.recoveryDelta).toBeGreaterThan(stoneResult.recoveryDelta)
    expect(woodResult.moraleDelta).toBeGreaterThan(stoneResult.moraleDelta)
  })

  it('is deterministic: same inputs produce identical output', () => {
    const a = evaluateWoodComfortBonus('wood', 'lounge')
    const b = evaluateWoodComfortBonus('wood', 'lounge')
    expect(a).toEqual(b)
  })
})

// ── Vulnerability transitions ─────────────────────────────────────────────────

describe('applyWoodVulnerabilityTrigger — fire path (AC4)', () => {
  it('intact wood + fire → fire-damaged, transitioned: true', () => {
    const result = applyWoodVulnerabilityTrigger(
      { materialFamily: 'wood', vulnerabilityState: 'intact' },
      'fire',
    )
    expect(result.nextState).toBe('fire-damaged')
    expect(result.transitioned).toBe(true)
  })

  it('intact wood + curse → fire-damaged (curse is spiritually scorching)', () => {
    const result = applyWoodVulnerabilityTrigger(
      { materialFamily: 'wood', vulnerabilityState: 'intact' },
      'curse',
    )
    expect(result.nextState).toBe('fire-damaged')
    expect(result.transitioned).toBe(true)
  })

  it('fire-damaged wood + fire → no additional transition (same trigger)', () => {
    const result = applyWoodVulnerabilityTrigger(
      { materialFamily: 'wood', vulnerabilityState: 'fire-damaged' },
      'fire',
    )
    expect(result.nextState).toBe('fire-damaged')
    expect(result.transitioned).toBe(false)
  })
})

describe('applyWoodVulnerabilityTrigger — rot path (AC5)', () => {
  it('intact wood + rot → rot-damaged, transitioned: true', () => {
    const result = applyWoodVulnerabilityTrigger(
      { materialFamily: 'wood', vulnerabilityState: 'intact' },
      'rot',
    )
    expect(result.nextState).toBe('rot-damaged')
    expect(result.transitioned).toBe(true)
  })

  it('intact wood + moisture → rot-damaged, transitioned: true', () => {
    const result = applyWoodVulnerabilityTrigger(
      { materialFamily: 'wood', vulnerabilityState: 'intact' },
      'moisture',
    )
    expect(result.nextState).toBe('rot-damaged')
    expect(result.transitioned).toBe(true)
  })

  it('rot-damaged wood + rot → no additional transition (same trigger)', () => {
    const result = applyWoodVulnerabilityTrigger(
      { materialFamily: 'wood', vulnerabilityState: 'rot-damaged' },
      'rot',
    )
    expect(result.nextState).toBe('rot-damaged')
    expect(result.transitioned).toBe(false)
  })
})

describe('applyWoodVulnerabilityTrigger — compounded path (AC4+AC5)', () => {
  it('fire-damaged wood + rot → compromised', () => {
    const result = applyWoodVulnerabilityTrigger(
      { materialFamily: 'wood', vulnerabilityState: 'fire-damaged' },
      'rot',
    )
    expect(result.nextState).toBe('compromised')
    expect(result.transitioned).toBe(true)
  })

  it('rot-damaged wood + fire → compromised', () => {
    const result = applyWoodVulnerabilityTrigger(
      { materialFamily: 'wood', vulnerabilityState: 'rot-damaged' },
      'fire',
    )
    expect(result.nextState).toBe('compromised')
    expect(result.transitioned).toBe(true)
  })

  it('compromised wood + any trigger → stays compromised, no transition', () => {
    for (const trigger of ['fire', 'rot', 'moisture', 'curse'] as const) {
      const result = applyWoodVulnerabilityTrigger(
        { materialFamily: 'wood', vulnerabilityState: 'compromised' },
        trigger,
      )
      expect(result.nextState).toBe('compromised')
      expect(result.transitioned).toBe(false)
    }
  })
})

describe('applyWoodVulnerabilityTrigger — non-wood contrast', () => {
  it('stone exposed to fire does not transition (returns unchanged, transitioned: false)', () => {
    const result = applyWoodVulnerabilityTrigger(
      { materialFamily: 'stone', vulnerabilityState: 'intact' },
      'fire',
    )
    expect(result.transitioned).toBe(false)
    expect(result.nextState).toBe('intact')
  })

  it('metal exposed to rot does not transition', () => {
    const result = applyWoodVulnerabilityTrigger(
      { materialFamily: 'metal', vulnerabilityState: 'intact' },
      'rot',
    )
    expect(result.transitioned).toBe(false)
    expect(result.nextState).toBe('intact')
  })

  it('is deterministic: same inputs produce identical output', () => {
    const a = applyWoodVulnerabilityTrigger(
      { materialFamily: 'wood', vulnerabilityState: 'intact' },
      'fire',
    )
    const b = applyWoodVulnerabilityTrigger(
      { materialFamily: 'wood', vulnerabilityState: 'intact' },
      'fire',
    )
    expect(a).toEqual(b)
  })
})

// ── Provenance modifier ───────────────────────────────────────────────────────

describe('resolveWoodProvenanceModifier (AC6)', () => {
  it('memory-bearing provenance triggers a non-zero positive modifier', () => {
    const result = resolveWoodProvenanceModifier({
      materialFamily: 'wood',
      provenanceTag: 'provenance:memory-bearing',
    })
    expect(result.triggered).toBe(true)
    expect(result.modifier).toBe(WOOD_CALIBRATION.provenanceMemoryBearingModifier)
    expect(result.modifier).toBeGreaterThan(0)
  })

  it('gallows-timber provenance triggers a non-zero modifier', () => {
    const result = resolveWoodProvenanceModifier({
      materialFamily: 'wood',
      provenanceTag: 'provenance:gallows-timber',
    })
    expect(result.triggered).toBe(true)
    expect(result.modifier).toBe(WOOD_CALIBRATION.provenanceGallowsTimberModifier)
    expect(result.modifier).toBeGreaterThan(0)
  })

  it('fresh wood (no provenance tag) returns zero modifier, not triggered', () => {
    const result = resolveWoodProvenanceModifier({
      materialFamily: 'wood',
      provenanceTag: undefined,
    })
    expect(result.triggered).toBe(false)
    expect(result.modifier).toBe(0)
  })

  it('explicit provenance:fresh tag returns zero modifier, not triggered', () => {
    const result = resolveWoodProvenanceModifier({
      materialFamily: 'wood',
      provenanceTag: 'provenance:fresh',
    })
    expect(result.triggered).toBe(false)
    expect(result.modifier).toBe(0)
  })

  it('memory-bearing wood modifier is strictly greater than fresh wood', () => {
    const memoryResult = resolveWoodProvenanceModifier({
      materialFamily: 'wood',
      provenanceTag: 'provenance:memory-bearing',
    })
    const freshResult = resolveWoodProvenanceModifier({
      materialFamily: 'wood',
      provenanceTag: undefined,
    })
    expect(memoryResult.modifier).toBeGreaterThan(freshResult.modifier)
  })

  it('non-wood input returns zero modifier (provenance is wood-specific)', () => {
    const result = resolveWoodProvenanceModifier({
      materialFamily: 'stone',
      provenanceTag: 'provenance:memory-bearing',
    })
    expect(result.triggered).toBe(false)
    expect(result.modifier).toBe(0)
  })

  it('is deterministic: same inputs produce identical output', () => {
    const a = resolveWoodProvenanceModifier({
      materialFamily: 'wood',
      provenanceTag: 'provenance:memory-bearing',
    })
    const b = resolveWoodProvenanceModifier({
      materialFamily: 'wood',
      provenanceTag: 'provenance:memory-bearing',
    })
    expect(a).toEqual(b)
  })
})

// ── Material gate ─────────────────────────────────────────────────────────────

describe('checkWoodMaterialGate (AC3, AC7)', () => {
  it('wood accepted for housing', () => {
    const result = checkWoodMaterialGate('material:wood', 'housing')
    expect(result.accepted).toBe(true)
  })

  it('wood accepted for lounge', () => {
    const result = checkWoodMaterialGate('material:wood', 'lounge')
    expect(result.accepted).toBe(true)
  })

  it('wood accepted for chapel (ritual category)', () => {
    const result = checkWoodMaterialGate('material:wood', 'chapel')
    expect(result.accepted).toBe(true)
  })

  it('wood accepted for therapy', () => {
    const result = checkWoodMaterialGate('material:wood', 'therapy')
    expect(result.accepted).toBe(true)
  })

  it('wood accepted for containment_low (AC7: low-tier accepts wood)', () => {
    const result = checkWoodMaterialGate('material:wood', 'containment_low')
    expect(result.accepted).toBe(true)
  })

  it('wood rejected for containment_high (AC7: high-risk rejects wood)', () => {
    const result = checkWoodMaterialGate('material:wood', 'containment_high')
    expect(result.accepted).toBe(false)
  })

  it('stone rejected for chapel (AC3: ritual category requires wood)', () => {
    const result = checkWoodMaterialGate('material:stone', 'chapel')
    expect(result.accepted).toBe(false)
  })

  it('metal rejected for chapel (AC3: ritual category requires wood)', () => {
    const result = checkWoodMaterialGate('material:metal', 'chapel')
    expect(result.accepted).toBe(false)
  })

  it('stone rejected for therapy (ritual category requires wood)', () => {
    const result = checkWoodMaterialGate('material:stone', 'therapy')
    expect(result.accepted).toBe(false)
  })

  it('stone accepted for housing (non-ritual, non-high-containment)', () => {
    const result = checkWoodMaterialGate('material:stone', 'housing')
    expect(result.accepted).toBe(true)
  })

  it('metal accepted for storage', () => {
    const result = checkWoodMaterialGate('material:metal', 'storage')
    expect(result.accepted).toBe(true)
  })

  it('wood rejected for containment_high while stone is accepted', () => {
    const woodResult = checkWoodMaterialGate('material:wood', 'containment_high')
    const stoneResult = checkWoodMaterialGate('material:stone', 'containment_high')
    expect(woodResult.accepted).toBe(false)
    expect(stoneResult.accepted).toBe(true)
  })

  it('is deterministic: same inputs produce identical output', () => {
    const a = checkWoodMaterialGate('material:wood', 'chapel')
    const b = checkWoodMaterialGate('material:wood', 'chapel')
    expect(a).toEqual(b)
  })
})
