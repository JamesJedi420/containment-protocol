// Targeted test for hazard/incident deterministic escalation (SPE-48)
import { describe, it, expect } from 'vitest'
import { hazardIncidentTemplates } from '../hazardIncidentTemplates'
import { resolveIncident } from '../hazardIncidentRuntime'
import type { IncidentImpact } from '../incidentImpact'

describe('HazardIncidentTemplate deterministic escalation', () => {
  const template = hazardIncidentTemplates[0]
  it('does not escalate if risk is below threshold', () => {
    const state = { escalationStep: 0, risk: 1, resolved: false }
    const result = resolveIncident(template, state, 'seal breach')
    expect(result.escalationStep).toBe(0)
    expect(result.resolved).toBe(false)
  })
  it('escalates if risk meets threshold and action matches', () => {
    const state = { escalationStep: 0, risk: 2, resolved: false }
    const result = resolveIncident(template, state, 'seal breach')
    expect(result.escalationStep).toBe(1)
    expect(result.resolved).toBe(false)
  })
  it('resolves when escalation steps complete', () => {
    const state = { escalationStep: 2, risk: 4, resolved: false }
    const result = resolveIncident(template, state, 'stabilize anomaly')
    expect(result.resolved).toBe(true)
  })

  it('carries canonical typed impact with explicit denominator semantics', () => {
    const state = { escalationStep: 0, risk: 2, resolved: false }
    const result = resolveIncident(template, state, 'seal breach')

    expect(result.impact?.schemaVersion).toBe('spe-820.v1')
    expect(result.impact?.affectedPopulation?.denominator?.kind).toBe('people')
    expect(result.impact?.facilityImpact?.denominator?.kind).toBe('facilities')
    expect(result.impact?.outages?.denominator?.kind).toBe('customers')
  })

  it('keeps uncertainty visible in standard fields', () => {
    const state = { escalationStep: 0, risk: 2, resolved: false }
    const result = resolveIncident(template, state, 'seal breach')

    expect(result.impact?.affectedPopulation?.uncertainty?.level).toBe('medium')
    expect(result.impact?.fatalities?.uncertainty?.level).toBe('high')
  })

  it('supports local extension fields without affecting canonical fields', () => {
    const state = { escalationStep: 0, risk: 2, resolved: false }
    const result = resolveIncident(template, state, 'seal breach')

    expect(result.impact?.extensions?.transit_evacuations?.metric.value).toBe(12)
    expect(result.impact?.extensions?.transit_evacuations?.metric.denominator?.kind).toBe(
      'services'
    )
    expect(result.impact?.rescueDemand?.value).toBe(44)
  })

  it('returns deterministic impact snapshots and does not alias mutable extension objects', () => {
    const state = { escalationStep: 0, risk: 2, resolved: false }
    const first = resolveIncident(template, state, 'seal breach')
    const second = resolveIncident(template, state, 'seal breach')

    expect(first.impact).toEqual(second.impact)
    expect(first.impact).not.toBe(second.impact)

    if (first.impact?.extensions?.transit_evacuations?.metric) {
      first.impact.extensions.transit_evacuations.metric.value = 999
    }

    const third = resolveIncident(template, state, 'seal breach')
    expect(third.impact?.extensions?.transit_evacuations?.metric.value).toBe(12)
  })

  it('does not alias canonical metric fields from the original impact', () => {
    const state = { escalationStep: 0, risk: 2, resolved: false }
    const result1 = resolveIncident(template, state, 'seal breach')
    const result2 = resolveIncident(template, state, 'seal breach')
    if (result1.impact?.affectedPopulation) {
      result1.impact.affectedPopulation.value = 9999
    }
    expect(result2.impact?.affectedPopulation?.value).toBe(480)
    expect(template.impact?.affectedPopulation?.value).toBe(480)
  })

  it('clones state.impact fallback path when template has no impact', () => {
    const noImpactTemplate = { ...hazardIncidentTemplates[0], impact: undefined }
    const stateImpact: IncidentImpact = {
      schemaVersion: 'spe-820.v1',
      fatalities: { value: 7, denominator: { kind: 'people' } },
    }
    const state = { escalationStep: 0, risk: 2, resolved: false, impact: stateImpact }
    const result = resolveIncident(noImpactTemplate, state, 'seal breach')
    expect(result.impact?.fatalities?.value).toBe(7)
    expect(result.impact).not.toBe(stateImpact)
    if (result.impact?.fatalities) result.impact.fatalities.value = 999
    expect(stateImpact.fatalities?.value).toBe(7)
  })
})
