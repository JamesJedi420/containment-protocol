import { describe, expect, it } from 'vitest'
import {
  applyEmpExposure,
  getBatteryReturnBehavior,
  isWeaponFireAuthorized,
  resolveControlModeEffect,
  resolveJammingEffect,
  validateCorporateSurveillanceDrone,
  type CorporateSurveillanceDroneRecord,
} from '../domain/corporateSurveillanceDroneRegistry'

const base: CorporateSurveillanceDroneRecord = {
  id: 'corp-drone-a1',
  morphology: 'crawler',
  environmentFit: ['indoor', 'confined'],
  controlMode: 'autonomous_protocol',
  enduranceHours: 4,
  batteryBand: 'nominal',
  swapPolicy: 'hot-swap at base',
  sensorChannels: ['visual', 'contamination_detection'],
  authorizationPolicy: { requiredFor: ['weapon_fire'], permitsAutonomousFire: false },
  localPatrolWaypoints: ['wp-1', 'wp-2'],
  analysisDelayTicks: 2,
}

describe('SPE-2245 corporate surveillance drone registry', () => {
  it('validates a well-formed record', () => {
    const result = validateCorporateSurveillanceDrone(base)
    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([])
  })

  it('rejects source-specific or malformed identifiers', () => {
    expect(validateCorporateSurveillanceDrone({ ...base, id: 'scp-drone-1' }).valid).toBe(false)
    expect(validateCorporateSurveillanceDrone({ ...base, id: 'A' }).valid).toBe(false)
    expect(validateCorporateSurveillanceDrone({ ...base, id: 'bad id!' }).valid).toBe(false)
  })

  it('applies deterministic analysis delay for autonomous mode and immediate feed with risk for operator mode', () => {
    const auto = resolveControlModeEffect('autonomous_protocol')
    expect(auto.analysisDelayTicks).toBe(2)
    expect(auto.immediateFeed).toBe(false)
    expect(auto.oversightRisk).toBe(false)

    const op = resolveControlModeEffect('operator_piloted')
    expect(op.analysisDelayTicks).toBe(0)
    expect(op.immediateFeed).toBe(true)
    expect(op.oversightRisk).toBe(true)
  })

  it('severs operator link under jamming while crawler retains local patrol', () => {
    const jammed = resolveJammingEffect(base)
    expect(jammed.operatorLinkSevered).toBe(true)
    expect(jammed.retainsLocalPatrol).toBe(true)

    const aerial = resolveJammingEffect({
      ...base,
      morphology: 'aerial',
      localPatrolWaypoints: undefined,
    })
    expect(aerial.retainsLocalPatrol).toBe(false)
  })

  it('blocks weapon fire without authorization unless policy permits autonomous fire', () => {
    expect(isWeaponFireAuthorized(base, false)).toBe(false)
    expect(isWeaponFireAuthorized(base, true)).toBe(true)
    const permissive = {
      ...base,
      authorizationPolicy: { ...base.authorizationPolicy, permitsAutonomousFire: true },
    }
    expect(isWeaponFireAuthorized(permissive, false)).toBe(true)
  })

  it('transitions to disabled under EMP exposure', () => {
    expect(applyEmpExposure(base)).toBe('disabled')
  })

  it('returns deterministic battery return behavior', () => {
    expect(getBatteryReturnBehavior('nominal')).toBe('continue')
    expect(getBatteryReturnBehavior('low')).toBe('return_to_base')
    expect(getBatteryReturnBehavior('depleted')).toBe('disabled')
  })
})
