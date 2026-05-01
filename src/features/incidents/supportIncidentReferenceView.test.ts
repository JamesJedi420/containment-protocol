import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { equipAgentItem } from '../../domain/sim/equipment'
import { applyPreparedSupportProcedure, jamSignalJammer } from '../../domain/supportLoadout'
import { selectSupportIncidentReferenceView } from './supportIncidentReferenceView'

describe('supportIncidentReferenceView', () => {
  it('composes a deterministic support reference with refresh availability and blocked repair cause', () => {
    let state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001']!,
      tags: ['medical', 'triage', 'signal'],
      requiredTags: [],
      preferredTags: ['medical', 'support'],
    }
    state.inventory.medkits = 2
    state.inventory.signal_jammers = 1
    state = equipAgentItem(state, 'a_casey', 'utility1', 'medkits')
    state = applyPreparedSupportProcedure(state, 'case-001', 'a_casey').state
    state = equipAgentItem(state, 'a_rook', 'utility1', 'signal_jammers')
    state = jamSignalJammer(state, 'case-001', 'a_rook').state

    const snapshot = structuredClone(state)
    const view = selectSupportIncidentReferenceView(state, 'case-001', {
      agentIds: ['a_casey', 'a_rook'],
    })

    expect(state).toEqual(snapshot)
    expect(view.mode).toBe('field-compact')
    expect(view.summary).toContain('2 support reference rows')

    const casey = view.rows.find((row) => row.agentId === 'a_casey')
    expect(casey?.prepared).toMatchObject({
      family: 'medical',
      familyLabel: 'Medical',
      status: 'expended',
      reserveStock: 1,
    })
    expect(casey?.prepared.refresh).toMatchObject({
      label: 'Refresh medical support',
      status: 'available',
    })

    const rook = view.rows.find((row) => row.agentId === 'a_rook')
    expect(rook?.runtime).toContainEqual({ label: 'Signal Jammers', status: 'Jammed' })
    expect(view.blockedActions).toContainEqual(
      expect.objectContaining({
        label: 'Repair signal jammer',
        status: 'blocked',
        cause: 'Missing EMF sensors in Utility 2.',
      })
    )
    expect(view.warnings.join(' ')).toMatch(/check causes before launch/i)
  })

  it('surfaces wrong prepared mix and refresh constraints without blocking an allowed apply action', () => {
    let state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001']!,
      tags: ['medical', 'triage'],
      requiredTags: [],
      preferredTags: ['medical'],
    }
    state.inventory.ward_seals = 1
    state = equipAgentItem(state, 'a_kellan', 'utility1', 'ward_seals')

    const view = selectSupportIncidentReferenceView(state, 'case-001', {
      agentIds: ['a_kellan'],
    })
    const kellan = view.rows[0]!

    expect(kellan.prepared).toMatchObject({
      family: 'containment',
      familyLabel: 'Containment',
      status: 'prepared',
    })
    expect(kellan.actions).toContainEqual(
      expect.objectContaining({
        label: 'Apply containment support',
        status: 'available',
      })
    )
    expect(kellan.prepared.refresh).toMatchObject({
      label: 'Refresh containment support',
      status: 'unavailable',
      cause: 'Only expended procedures can be refreshed.',
    })
    expect(view.warnings.join(' ')).toMatch(/poor fit/i)
  })

  it('keeps the live-use view compact when many support candidates are inspectable', () => {
    const state = createStartingState()
    const view = selectSupportIncidentReferenceView(state, 'case-001', {
      agentIds: ['a_kellan', 'a_mina', 'a_rook', 'a_sato', 'a_juno', 'a_eli', 'a_casey'],
      maxRows: 3,
      maxWarnings: 2,
      maxBlockedActions: 2,
    })

    expect(view.rows.length).toBeLessThanOrEqual(3)
    expect(view.warnings.length).toBeLessThanOrEqual(2)
    expect(view.blockedActions.length).toBeLessThanOrEqual(2)
    expect(view.hiddenAgentCount).toBeGreaterThan(0)
    expect(view.summary.length).toBeLessThan(140)
  })
})
