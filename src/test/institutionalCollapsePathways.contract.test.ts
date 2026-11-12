import { describe, expect, it } from 'vitest'
import {
  isInstitutionalCollapsePathwayFamily,
  isInstitutionalCollapsePathwayId,
  isInstitutionalCollapseThresholdBand,
  listInstitutionalCollapsePathwayFamilies,
  listInstitutionalCollapsePathwayIds,
  projectInstitutionalCollapsePathways,
  validateInstitutionalCollapsePathwayInput,
} from '../domain/institutionalCollapsePathways'

describe('SPE-2261 institutional collapse pathway registry', () => {
  it('exposes three pathway families and authored pathway ids', () => {
    expect(listInstitutionalCollapsePathwayFamilies()).toEqual([
      'supply_maintenance',
      'labor_routing',
      'morale_overload',
    ])
    expect(listInstitutionalCollapsePathwayIds()).toEqual([
      'maintenance_debt_overrun',
      'logistics_stall',
      'routing_misallocation',
      'morale_stress_break',
    ])
    expect(isInstitutionalCollapsePathwayFamily('labor_routing')).toBe(true)
    expect(isInstitutionalCollapsePathwayFamily('combat')).toBe(false)
    expect(isInstitutionalCollapsePathwayId('morale_stress_break')).toBe(true)
    expect(isInstitutionalCollapsePathwayId('anomaly_breach')).toBe(false)
    expect(isInstitutionalCollapseThresholdBand('critical')).toBe(true)
    expect(isInstitutionalCollapseThresholdBand('catastrophic')).toBe(false)
  })

  it('AC1: deterministic threshold crossing from non-combat maintenance debt', () => {
    expect(projectInstitutionalCollapsePathways({ maintenanceDebt: 7 })).toMatchObject({
      activePathways: [],
      firedPathwayIds: [],
    })

    const strained = projectInstitutionalCollapsePathways({ maintenanceDebt: 8 })
    expect(strained?.firedPathwayIds).toEqual(['maintenance_debt_overrun'])
    expect(strained?.activePathways[0]).toMatchObject({
      pathwayId: 'maintenance_debt_overrun',
      family: 'supply_maintenance',
      band: 'strained',
      triggerKey: 'maintenanceDebt',
      triggerValue: 8,
      chainedFrom: null,
    })
    expect(strained!.activePathways[0]!.degradedOutputs.facilityThroughputPenalty).toBe(5)
    expect(strained!.activePathways[0]!.recoveryRequirements.maintenanceHours).toBe(4)

    const degraded = projectInstitutionalCollapsePathways({ maintenanceDebt: 18 })
    expect(degraded?.activePathways[0]?.band).toBe('degraded')
    expect(degraded!.activePathways[0]!.degradedOutputs.facilityThroughputPenalty).toBe(15)

    const critical = projectInstitutionalCollapsePathways({ maintenanceDebt: 30 })
    expect(critical?.activePathways[0]?.band).toBe('critical')
    expect(critical!.activePathways[0]!.degradedOutputs.facilityThroughputPenalty).toBe(30)
  })

  it('AC2: pathway chains into a second degraded state at critical maintenance debt', () => {
    const projection = projectInstitutionalCollapsePathways({ maintenanceDebt: 30 })
    expect(projection).toBeDefined()
    if (!projection) throw new Error('missing projection')

    expect(projection.firedPathwayIds).toEqual(['maintenance_debt_overrun', 'logistics_stall'])
    expect(projection.activePathways).toHaveLength(2)

    const primary = projection.activePathways[0]!
    const chained = projection.activePathways[1]!
    expect(primary).toMatchObject({
      pathwayId: 'maintenance_debt_overrun',
      band: 'critical',
      chainedFrom: null,
    })
    expect(chained).toMatchObject({
      pathwayId: 'logistics_stall',
      family: 'supply_maintenance',
      band: 'degraded',
      chainedFrom: 'maintenance_debt_overrun',
    })
    expect(chained.degradedOutputs.deliveryLatencyPenalty).toBeGreaterThan(0)
    expect(chained.recoveryRequirements.restockActions).toBeGreaterThan(0)
  })

  it('fires labor/routing and morale/overload families from non-combat inputs', () => {
    const routing = projectInstitutionalCollapsePathways({ routingFailureRate: 35 })
    expect(routing?.firedPathwayIds).toEqual(['routing_misallocation'])
    expect(routing?.activePathways[0]).toMatchObject({
      family: 'labor_routing',
      band: 'degraded',
    })

    const laborOnly = projectInstitutionalCollapsePathways({ laborMisallocation: 55 })
    expect(laborOnly?.activePathways[0]).toMatchObject({
      pathwayId: 'routing_misallocation',
      band: 'critical',
      triggerValue: 55,
    })

    const morale = projectInstitutionalCollapsePathways({ moraleStress: 40 })
    expect(morale?.firedPathwayIds).toEqual(['morale_stress_break'])
    expect(morale?.activePathways[0]).toMatchObject({
      family: 'morale_overload',
      band: 'degraded',
    })

    const hunger = projectInstitutionalCollapsePathways({ hungerPressure: 60 })
    expect(hunger?.activePathways[0]).toMatchObject({
      pathwayId: 'morale_stress_break',
      band: 'critical',
      triggerValue: 60,
    })
  })

  it('fail-closes malformed inputs', () => {
    expect(projectInstitutionalCollapsePathways(null)).toBeUndefined()
    expect(projectInstitutionalCollapsePathways(undefined)).toBeUndefined()
    expect(projectInstitutionalCollapsePathways({ maintenanceDebt: -1 })).toBeUndefined()
    expect(projectInstitutionalCollapsePathways({ maintenanceDebt: Number.NaN })).toBeUndefined()
    expect(
      projectInstitutionalCollapsePathways({ maintenanceDebt: Number.POSITIVE_INFINITY })
    ).toBeUndefined()
    expect(
      projectInstitutionalCollapsePathways({
        routingFailureRate: 10,
        supplyShortfall: -0.5,
      })
    ).toBeUndefined()
    expect(validateInstitutionalCollapsePathwayInput([])).toBe(false)
    expect(validateInstitutionalCollapsePathwayInput('maintenanceDebt')).toBe(false)
    expect(validateInstitutionalCollapsePathwayInput({})).toBe(true)
  })

  it('returns immutable byte-stable projections on repeat calls', () => {
    const input = Object.freeze({
      maintenanceDebt: 30,
      routingFailureRate: 15,
      moraleStress: 20,
    })
    const first = projectInstitutionalCollapsePathways(input)
    const second = projectInstitutionalCollapsePathways(input)
    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first!.activePathways)).toBe(true)
    expect(Object.isFrozen(first!.activePathways[0])).toBe(true)
    expect(Object.isFrozen(first!.activePathways[0]!.degradedOutputs)).toBe(true)
    expect(() => {
      // @ts-expect-error intentional mutation probe
      first.activePathways.push({})
    }).toThrow()
    expect(() => {
      // @ts-expect-error intentional mutation probe
      first.activePathways[0].band = 'stable'
    }).toThrow()
  })

  it('does not invent combat pathways and leaves empty input idle', () => {
    const idle = projectInstitutionalCollapsePathways({})
    expect(idle).toEqual({ activePathways: [], firedPathwayIds: [] })
    expect(listInstitutionalCollapsePathwayIds().some((id) => id.includes('combat'))).toBe(false)
  })
})
