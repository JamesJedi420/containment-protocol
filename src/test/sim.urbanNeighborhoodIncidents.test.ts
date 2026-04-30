import { describe, expect, it } from 'vitest'
import {
  applyNeighborhoodMitigation,
  createNeighborhoodIncidentPacket,
  resolveNeighborhoodIncidentRecurrence,
  resolveNeighborhoodSpillover,
} from '../domain/urbanNeighborhoodIncidents'

describe('urbanNeighborhoodIncidents', () => {
  it('is deterministic and repeatable for identical packet + week inputs', () => {
    const packet = createNeighborhoodIncidentPacket({
      incidentId: 'incident-repeatable',
      districtId: 'docks',
      blockId: 'dock-12',
      seedKey: 'spe-539-repeatable',
      sourceKind: 'business_tool_misuse',
      sourceLabel: 'Glasswork shop overcharges unstable resonance chimes',
      baseCadenceWeeks: 2,
      baseSeverity: 0.62,
    })

    const recurrenceA = resolveNeighborhoodIncidentRecurrence(packet, 6)
    const recurrenceB = resolveNeighborhoodIncidentRecurrence(packet, 6)
    const spilloverA = resolveNeighborhoodSpillover(packet, recurrenceA)
    const spilloverB = resolveNeighborhoodSpillover(packet, recurrenceB)

    expect(recurrenceB).toEqual(recurrenceA)
    expect(spilloverB).toEqual(spilloverA)
  })

  it('supports recurring local incidents from nonvillain business misuse across multiple weeks', () => {
    const packet = createNeighborhoodIncidentPacket({
      incidentId: 'incident-business-recurring',
      districtId: 'industrial',
      blockId: 'forge-row-b',
      seedKey: 'spe-539-business-misuse',
      sourceKind: 'business_tool_misuse',
      sourceLabel: 'Metalworks staff repeatedly mis-handle a containment burner',
      baseCadenceWeeks: 2,
      baseSeverity: 0.71,
    })

    const occurredWeeks = [1, 2, 3, 4, 5, 6, 7, 8]
      .map((week) => resolveNeighborhoodIncidentRecurrence(packet, week))
      .filter((entry) => entry.occurred)
      .map((entry) => entry.week)

    expect(packet.source.intent).toBe('nonvillain')
    expect(packet.scope).toBe('neighborhood')
    expect(occurredWeeks).toEqual([2, 4, 6, 8])
  })

  it('supports decorative biological hazard spillover into adjacent public space', () => {
    const packet = createNeighborhoodIncidentPacket({
      incidentId: 'incident-biohazard-spillover',
      districtId: 'residential',
      blockId: 'garden-arcade-3',
      seedKey: 'spe-539-biohazard',
      sourceKind: 'decorative_biohazard',
      sourceLabel: 'Decorative lumen-vines overgrow and release irritant spores',
      baseCadenceWeeks: 1,
      baseSeverity: 0.66,
      spilloverRadiusBlocks: 1,
    })

    const recurrence = resolveNeighborhoodIncidentRecurrence(packet, 3)
    const spillover = resolveNeighborhoodSpillover(packet, recurrence)

    expect(recurrence.occurred).toBe(true)
    expect(spillover.scope).toBe('neighborhood')
    expect(spillover.crossesPropertyLine).toBe(true)
    expect(spillover.publicSpaceImpacted).toBe(true)
    expect(spillover.radiusBlocks).toBe(1)
    expect(spillover.affectedSpaces).toEqual(
      expect.arrayContaining(['adjacent_public_sidewalk'])
    )
  })

  it('applies mitigation that lowers recurrence cadence and/or severity without requiring destruction', () => {
    const packet = createNeighborhoodIncidentPacket({
      incidentId: 'incident-mitigated',
      districtId: 'docks',
      blockId: 'repair-lane-2',
      seedKey: 'spe-539-mitigated',
      sourceKind: 'operator_tool_misuse',
      sourceLabel: 'Untrained operator repeatedly overdrives salvage harmonics',
      baseCadenceWeeks: 2,
      baseSeverity: 0.78,
    })

    const mitigated = applyNeighborhoodMitigation(packet, {
      kind: 'confiscation',
      intensity: 1,
    })

    const baselineAtWeek6 = resolveNeighborhoodIncidentRecurrence(packet, 6)
    const mitigatedAtWeek6 = resolveNeighborhoodIncidentRecurrence(mitigated, 6)

    expect(mitigated.mitigation.actions).toContain('confiscation')
    expect(mitigatedAtWeek6.cadenceWeeks).toBeGreaterThanOrEqual(baselineAtWeek6.cadenceWeeks)

    if (baselineAtWeek6.occurred && mitigatedAtWeek6.occurred) {
      expect(mitigatedAtWeek6.severity).toBeLessThanOrEqual(baselineAtWeek6.severity)
    }
  })

  it('remains bounded to neighborhood scope with no cross-site or citywide propagation', () => {
    const packet = createNeighborhoodIncidentPacket({
      incidentId: 'incident-bounded',
      districtId: 'hub',
      blockId: 'north-hub-1',
      seedKey: 'spe-539-bounded',
      sourceKind: 'decorative_biohazard',
      sourceLabel: 'Decorative rooftop moss emits localized anomaly pollen',
      baseCadenceWeeks: 1,
      baseSeverity: 0.55,
      spilloverRadiusBlocks: 5,
    })

    const recurrence = resolveNeighborhoodIncidentRecurrence(packet, 1)
    const spillover = resolveNeighborhoodSpillover(packet, recurrence)

    expect(packet.scope).toBe('neighborhood')
    expect(spillover.scope).toBe('neighborhood')
    expect(spillover.radiusBlocks).toBeLessThanOrEqual(1)
    expect(spillover.citywidePropagation).toBe(false)
    expect(spillover.crossSitePropagation).toBe(false)
  })
})