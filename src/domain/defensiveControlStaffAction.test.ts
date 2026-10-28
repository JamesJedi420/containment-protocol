import { describe, expect, it } from 'vitest'
import {
  collapsesToExposedOrVulnerable,
  remainsOperationalWhileGuarded,
  validateDefensiveControlStaffAction,
  type DefensiveControlStaffActionInput,
} from './defensiveControlStaffAction'

function baseInput(
  overrides: Partial<DefensiveControlStaffActionInput> = {}
): DefensiveControlStaffActionInput {
  return {
    actionId: 'action:def-1',
    controlKind: 'block',
    targetGeometry: { kind: 'chokepoint', refId: 'geo:door-a' },
    collateralRisk: 'low',
    intendedOutcomes: ['absorb', 'delay'],
    visibleStates: ['guarded', 'pressured'],
    invalidationConditions: ['flank'],
    posturePersistsWhileGuarded: true,
    ...overrides,
  }
}

describe('validateDefensiveControlStaffAction (SPE-2186)', () => {
  it('accepts redirect, block, delay, and reposition with legal targetGeometry', () => {
    const redirect = validateDefensiveControlStaffAction(
      baseInput({
        actionId: 'action:redirect',
        controlKind: 'redirect',
        targetGeometry: { kind: 'lane', refId: 'geo:corridor' },
        intendedOutcomes: ['redirect'],
        visibleStates: ['redirected'],
      })
    )
    const block = validateDefensiveControlStaffAction(baseInput())
    const delay = validateDefensiveControlStaffAction(
      baseInput({
        actionId: 'action:delay',
        controlKind: 'delay',
        targetGeometry: null,
        intendedOutcomes: ['delay'],
        visibleStates: ['delayed'],
        invalidationConditions: [],
      })
    )
    const reposition = validateDefensiveControlStaffAction(
      baseInput({
        actionId: 'action:reposition',
        controlKind: 'reposition',
        targetGeometry: { kind: 'fallback_node', refId: 'geo:stair' },
        intendedOutcomes: ['avoid', 'preserve_objective'],
        visibleStates: ['guarded'],
      })
    )

    expect(redirect.ok).toBe(true)
    expect(block.ok).toBe(true)
    expect(delay.ok).toBe(true)
    expect(reposition.ok).toBe(true)
    if (!redirect.ok || !block.ok || !delay.ok || !reposition.ok) return
    expect(redirect.action.controlKind).toBe('redirect')
    expect(block.action.targetGeometry?.kind).toBe('chokepoint')
    expect(delay.action.targetGeometry).toBeNull()
    expect(reposition.action.targetGeometry?.refId).toBe('geo:stair')
  })

  it('rejects unknown controlKind, missing geometry for geometry-required kinds, and out-of-bounds collateral risk', () => {
    const unknown = validateDefensiveControlStaffAction(
      baseInput({ controlKind: 'charge' })
    )
    expect(unknown.ok).toBe(false)
    if (unknown.ok) return
    expect(unknown.reasonCode).toBe('unknown_control_kind')

    const missingGeo = validateDefensiveControlStaffAction(
      baseInput({ controlKind: 'block', targetGeometry: null })
    )
    expect(missingGeo.ok).toBe(false)
    if (missingGeo.ok) return
    expect(missingGeo.reasonCode).toBe('missing_target_geometry')

    const badRisk = validateDefensiveControlStaffAction(
      baseInput({ collateralRisk: 'catastrophic' })
    )
    expect(badRisk.ok).toBe(false)
    if (badRisk.ok) return
    expect(badRisk.reasonCode).toBe('collateral_risk_out_of_bounds')
  })

  it('rejects damage-only actions mislabeled as defensive control', () => {
    const result = validateDefensiveControlStaffAction(
      baseInput({
        controlKind: 'block',
        damageOnlyMarker: 'strike',
      })
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reasonCode).toBe('damage_only_mislabel')
  })

  it('covers invalidation through line of sight, flank, footing, or equipment', () => {
    const result = validateDefensiveControlStaffAction(
      baseInput({
        actionId: 'action:cover',
        controlKind: 'cover',
        targetGeometry: { kind: 'cover_arc', refId: 'geo:desk' },
        intendedOutcomes: ['absorb'],
        visibleStates: ['guarded', 'exposed'],
        invalidationConditions: ['line_of_sight', 'footing', 'equipment'],
      })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.action.invalidationConditions).toEqual([
      'line_of_sight',
      'footing',
      'equipment',
    ])
    expect(collapsesToExposedOrVulnerable(result.action)).toBe(true)
    expect(remainsOperationalWhileGuarded(result.action)).toBe(true)
  })

  it('is deterministic and does not execute combat resolution', () => {
    const input = baseInput({
      actionId: 'action:guard',
      controlKind: 'guard_objective',
      targetGeometry: { kind: 'objective_anchor', refId: 'obj:vault' },
      intendedOutcomes: ['preserve_objective', 'delay'],
      visibleStates: ['guarded', 'pressured'],
      invalidationConditions: ['flank'],
    })
    const first = validateDefensiveControlStaffAction(input)
    const second = validateDefensiveControlStaffAction(input)
    expect(first).toEqual(second)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const serialized = JSON.stringify(first.action)
    expect(serialized).not.toMatch(/hit_points|damage_roll|combat_resolution/i)
    expect(first.action.owner).toBe('SPE-2186')
    expect(first.action.schemaVersion).toBe('spe-2186.v1')
  })

  it('rejects malformed geometry refs and unknown invalidation conditions', () => {
    const badGeo = validateDefensiveControlStaffAction(
      baseInput({
        targetGeometry: { kind: 'lane', refId: '   ' },
      })
    )
    expect(badGeo.ok).toBe(false)
    if (badGeo.ok) return
    expect(badGeo.reasonCode).toBe('invalid_target_geometry')

    const badInv = validateDefensiveControlStaffAction(
      baseInput({ invalidationConditions: ['magic_ward'] })
    )
    expect(badInv.ok).toBe(false)
    if (badInv.ok) return
    expect(badInv.reasonCode).toBe('unknown_invalidation')
  })
})
