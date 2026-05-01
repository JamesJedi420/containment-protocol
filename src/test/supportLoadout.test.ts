import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { equipAgentItem } from '../domain/sim/equipment'
import {
  applyPreparedSupportProcedure,
  buildPreparedSupportProcedureExpendedFlagKey,
  buildPreparedSupportProcedureMismatchFlagKey,
  getPreparedSupportProcedureState,
  refreshPreparedSupportProcedure,
} from '../domain/supportLoadout'

function withCaseTags(state: ReturnType<typeof createStartingState>, tags: string[]) {
  return {
    ...state,
    cases: {
      ...state.cases,
      'case-001': {
        ...state.cases['case-001'],
        tags: [...tags],
        requiredTags: [],
        preferredTags: [],
      },
    },
  }
}

describe('supportLoadout', () => {
  it('tracks a medical prepared procedure through prepared, expended, and refreshed states', () => {
    let state = withCaseTags(createStartingState(), ['medical', 'triage'])
    state.inventory.medkits = 2
    state = equipAgentItem(state, 'a_casey', 'utility1', 'medkits')

    const prepared = getPreparedSupportProcedureState(state, 'case-001', 'a_casey')

    expect(prepared).toMatchObject({
      itemId: 'medkits',
      family: 'medical',
      status: 'prepared',
      reserveStock: 1,
    })

    const applied = applyPreparedSupportProcedure(state, 'case-001', 'a_casey')

    expect(applied.applied).toBe(true)
    expect(applied.outcome).toBe('supported')
    expect(applied.supportState.status).toBe('expended')
    expect(
      applied.state.runtimeState?.encounterState['case-001']?.flags?.[
        buildPreparedSupportProcedureExpendedFlagKey('a_casey', 'medical')
      ]
    ).toBe(true)

    const refreshed = refreshPreparedSupportProcedure(applied.state, 'case-001', 'a_casey')

    expect(refreshed.refreshed).toBe(true)
    expect(refreshed.reason).toBe('refreshed')
    expect(refreshed.supportState.status).toBe('prepared')
    expect(refreshed.state.inventory.medkits).toBe(0)
  })

  it('recognizes containment as the alternate useful prepared support family', () => {
    let state = withCaseTags(createStartingState(), ['occult', 'containment'])
    state.inventory.ward_seals = 2
    state = equipAgentItem(state, 'a_kellan', 'utility1', 'ward_seals')

    const prepared = getPreparedSupportProcedureState(state, 'case-001', 'a_kellan')
    const applied = applyPreparedSupportProcedure(state, 'case-001', 'a_kellan')

    expect(prepared).toMatchObject({
      itemId: 'ward_seals',
      family: 'containment',
      status: 'prepared',
      reserveStock: 1,
    })
    expect(applied.outcome).toBe('supported')
    expect(applied.supportState.status).toBe('expended')
  })

  it('records a deterministic mismatch outcome when the prepared family does not fit the encounter', () => {
    let state = withCaseTags(createStartingState(), ['occult', 'anomaly'])
    state.inventory.medkits = 1
    state = equipAgentItem(state, 'a_casey', 'utility1', 'medkits')

    const applied = applyPreparedSupportProcedure(state, 'case-001', 'a_casey')

    expect(applied.applied).toBe(true)
    expect(applied.outcome).toBe('mismatch')
    expect(applied.supportState.status).toBe('expended')
    expect(
      applied.state.runtimeState?.encounterState['case-001']?.flags?.[
        buildPreparedSupportProcedureMismatchFlagKey('a_casey', 'medical')
      ]
    ).toBe(true)
  })

  it('reports unavailable when utility1 does not carry a supported prepared support item', () => {
    let state = createStartingState()
    state.inventory.signal_jammers = 1
    state = equipAgentItem(state, 'a_rook', 'utility1', 'signal_jammers')

    const supportState = getPreparedSupportProcedureState(state, 'case-001', 'a_rook')

    expect(supportState).toMatchObject({
      itemId: 'signal_jammers',
      status: 'unavailable',
    })
    expect(supportState.reasons).toContain('unsupported-prepared-support-item')
  })
})