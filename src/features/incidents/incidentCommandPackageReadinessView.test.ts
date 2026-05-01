import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { equipAgentItem } from '../../domain/sim/equipment'
import { jamSignalJammer } from '../../domain/supportLoadout'
import { selectIncidentCommandPackageReadinessView } from './incidentCommandPackageReadinessView'

describe('incidentCommandPackageReadinessView', () => {
  it('composes role slots, kit mismatch, responder readiness, and support blockers deterministically', () => {
    let state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001']!,
      tags: ['medical', 'triage', 'signal'],
      requiredTags: [],
      preferredTags: ['support'],
      assignedTeamIds: ['t_nightwatch'],
    }
    state.inventory.medkits = 1
    state.inventory.signal_jammers = 1
    state = equipAgentItem(state, 'a_rook', 'utility1', 'signal_jammers')
    state = jamSignalJammer(state, 'case-001', 'a_rook').state

    const snapshot = structuredClone(state)
    const view = selectIncidentCommandPackageReadinessView(state, 'case-001', {
      teamIds: ['t_nightwatch'],
    })

    expect(state).toEqual(snapshot)
    expect(view.mode).toBe('field-compact')
    expect(view.summary).toMatch(/Night Watch/)
    expect(view.summary).toMatch(/support blockers/)

    expect(view.roleSlots).toContainEqual(
      expect.objectContaining({
        id: 'medical-support',
        status: 'missing',
      })
    )
    expect(view.warnings.join(' ')).toMatch(/Role-slot weakness/i)

    expect(view.kitTemplate).toMatchObject({
      id: 'medical-response',
      missingItemCount: 3,
    })
    expect(view.kitTemplate.items).toContainEqual(
      expect.objectContaining({
        itemId: 'medkits',
        status: 'reserve-only',
      })
    )
    expect(view.kitTemplate.items).toContainEqual(
      expect.objectContaining({
        itemId: 'hazmat_suit',
        status: 'missing',
      })
    )

    expect(view.supportBlockers).toContainEqual(
      expect.objectContaining({
        label: 'Repair signal jammer',
        status: 'blocked',
        cause: 'Missing EMF sensors in Utility 2.',
      })
    )
    expect(view.responderReadiness.length).toBeGreaterThan(0)
    expect(view.responderReadiness[0]).toEqual(
      expect.objectContaining({
        gearReadiness: expect.stringMatching(/ready|partial|blocked/),
        conditionScore: expect.any(Number),
        panicRisk: expect.any(Number),
      })
    )
  })

  it('keeps the command readout compact for larger packages', () => {
    const state = createStartingState()
    const view = selectIncidentCommandPackageReadinessView(state, 'case-001', {
      teamIds: ['t_nightwatch', 't_greentape'],
      maxRoleSlots: 3,
      maxResponders: 2,
      maxWarnings: 2,
      maxSupportBlockers: 2,
    })

    expect(view.roleSlots.length).toBeLessThanOrEqual(3)
    expect(view.responderReadiness.length).toBeLessThanOrEqual(2)
    expect(view.warnings.length).toBeLessThanOrEqual(2)
    expect(view.supportBlockers.length).toBeLessThanOrEqual(2)
    expect(view.hiddenResponderCount).toBeGreaterThan(0)
    expect(view.summary.length).toBeLessThan(180)
  })
})
