// Targeted test for hazard/incident deterministic escalation (SPE-48)
import { describe, it, expect } from 'vitest'
import { hazardIncidentTemplates } from '../hazardIncidentTemplates'
import { resolveIncident } from '../hazardIncidentRuntime'

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
})
