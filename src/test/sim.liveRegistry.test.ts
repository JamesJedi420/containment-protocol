import { describe, expect, it } from 'vitest'
import {
  createLiveRegistryEntry,
  deriveRegistryAlerts,
  filterLiveRegistryEntries,
  updateLiveRegistryEntry,
} from '../domain/liveRegistry'

describe('liveRegistry slice 1', () => {
  it('supports anomaly, staff, external, and inferred signature entries', () => {
    const anomaly = createLiveRegistryEntry({
      id: 'reg-anomaly-1',
      entityId: 'anom-1',
      entityClass: 'anomaly',
      label: 'Whisper Shade',
      operationalState: 'active',
      truthState: 'confirmed',
      confidence: 0.95,
      linkedCaseIds: ['case-a'],
      week: 5,
    })

    const staff = createLiveRegistryEntry({
      id: 'reg-staff-1',
      entityId: 'agent-1',
      entityClass: 'staff',
      label: 'Field Medic One',
      operationalState: 'assigned',
      truthState: 'confirmed',
      confidence: 1,
      linkedCaseIds: ['case-a'],
      week: 5,
    })

    const external = createLiveRegistryEntry({
      id: 'reg-external-1',
      entityId: 'external-1',
      entityClass: 'external',
      label: 'Hostile Liaison',
      operationalState: 'active',
      truthState: 'suspected',
      confidence: 0.66,
      linkedCaseIds: ['case-b'],
      week: 5,
    })

    const inferred = createLiveRegistryEntry({
      id: 'reg-signature-1',
      entityId: 'sig-ghost-1',
      entityClass: 'signature',
      label: 'Unknown Signature Echo',
      operationalState: 'active',
      truthState: 'inferred',
      confidence: 0.32,
      linkedCaseIds: ['case-c'],
      week: 5,
    })

    expect(anomaly.entityClass).toBe('anomaly')
    expect(staff.entityClass).toBe('staff')
    expect(external.entityClass).toBe('external')
    expect(inferred.entityClass).toBe('signature')
  })

  it('represents uncertainty with semantic truth state and numeric confidence', () => {
    const inferred = createLiveRegistryEntry({
      id: 'reg-signature-2',
      entityId: 'sig-2',
      entityClass: 'signature',
      label: 'Unverified Echo',
      operationalState: 'active',
      truthState: 'inferred',
      confidence: 0.27,
      week: 7,
    })

    expect(inferred.truthState).toBe('inferred')
    expect(inferred.confidence).toBe(0.27)
  })

  it('updates append deterministic transition history', () => {
    const contained = createLiveRegistryEntry({
      id: 'reg-anomaly-2',
      entityId: 'anom-2',
      entityClass: 'anomaly',
      label: 'Containment Subject',
      operationalState: 'contained',
      truthState: 'confirmed',
      confidence: 0.9,
      week: 9,
    })

    const escaped = updateLiveRegistryEntry(contained, {
      operationalState: 'loose',
      week: 10,
      reasonCode: 'breach',
      triggerSource: 'containment-monitor',
    })

    expect(escaped.transitionLog).toHaveLength(1)
    expect(escaped.transitionLog[0]).toMatchObject({
      fromOperationalState: 'contained',
      toOperationalState: 'loose',
      reasonCode: 'breach',
      triggerSource: 'containment-monitor',
      kind: 'operational_state',
    })
  })

  it('derives alert from meaningful transition', () => {
    const before = createLiveRegistryEntry({
      id: 'reg-anomaly-3',
      entityId: 'anom-3',
      entityClass: 'anomaly',
      label: 'Escapable Subject',
      operationalState: 'contained',
      truthState: 'inferred',
      confidence: 0.61,
      week: 4,
    })

    const after = updateLiveRegistryEntry(before, {
      operationalState: 'loose',
      truthState: 'confirmed',
      week: 6,
      reasonCode: 'containment-failure',
    })

    const alerts = deriveRegistryAlerts(before, after)

    expect(alerts.some((alert) => alert.type === 'escape')).toBe(true)
    expect(alerts.some((alert) => alert.type === 'confirmation')).toBe(true)
  })

  it('supports minimal deterministic filtering by class/state/certainty', () => {
    const entries = [
      createLiveRegistryEntry({
        id: 'a',
        entityId: 'a',
        entityClass: 'anomaly',
        label: 'A',
        operationalState: 'active',
        truthState: 'confirmed',
        confidence: 0.91,
        week: 3,
      }),
      createLiveRegistryEntry({
        id: 'b',
        entityId: 'b',
        entityClass: 'staff',
        label: 'B',
        operationalState: 'assigned',
        truthState: 'confirmed',
        confidence: 1,
        week: 2,
      }),
      createLiveRegistryEntry({
        id: 'c',
        entityId: 'c',
        entityClass: 'signature',
        label: 'C',
        operationalState: 'active',
        truthState: 'inferred',
        confidence: 0.22,
        week: 5,
      }),
    ]

    const filtered = filterLiveRegistryEntries(entries, {
      entityClasses: ['anomaly', 'signature'],
      operationalStates: ['active'],
      minimumConfidence: 0.5,
    })

    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('a')
  })

  it('is deterministic on repeated calls with same inputs', () => {
    const source = createLiveRegistryEntry({
      id: 'reg-deterministic-1',
      entityId: 'det-1',
      entityClass: 'external',
      label: 'Deterministic Subject',
      operationalState: 'active',
      truthState: 'suspected',
      confidence: 0.8,
      week: 10,
    })

    const a = updateLiveRegistryEntry(source, {
      operationalState: 'transferred',
      week: 12,
      reasonCode: 'zone-shift',
    })
    const b = updateLiveRegistryEntry(source, {
      operationalState: 'transferred',
      week: 12,
      reasonCode: 'zone-shift',
    })

    expect(a).toEqual(b)

    const alertsA = deriveRegistryAlerts(source, a)
    const alertsB = deriveRegistryAlerts(source, b)

    expect(alertsA).toEqual(alertsB)
  })
})
