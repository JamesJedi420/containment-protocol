import '../../test/setup'
import { render, screen, within } from '@testing-library/react'
import { createStartingState } from '../../data/startingState'
import { equipAgentItem } from '../../domain/sim/equipment'
import { applyPreparedSupportProcedure, jamSignalJammer } from '../../domain/supportLoadout'
import { SupportIncidentReferencePanel } from './SupportIncidentReferencePanel'
import { selectSupportIncidentReferenceView } from './supportIncidentReferenceView'

function buildPanelView() {
  let state = createStartingState()
  state.cases['case-001'] = {
    ...state.cases['case-001']!,
    tags: ['medical', 'triage', 'signal'],
    requiredTags: [],
    preferredTags: ['medical'],
  }
  state.inventory.medkits = 2
  state.inventory.signal_jammers = 1
  state = equipAgentItem(state, 'a_casey', 'utility1', 'medkits')
  state = applyPreparedSupportProcedure(state, 'case-001', 'a_casey').state
  state = equipAgentItem(state, 'a_rook', 'utility1', 'signal_jammers')
  state = jamSignalJammer(state, 'case-001', 'a_rook').state

  return selectSupportIncidentReferenceView(state, 'case-001', {
    agentIds: ['a_casey', 'a_rook'],
  })
}

describe('SupportIncidentReferencePanel', () => {
  it('renders compact support state, blocked causes, and refresh guidance', () => {
    render(<SupportIncidentReferencePanel view={buildPanelView()} />)

    const panel = screen.getByRole('region', { name: /support incident reference/i })

    expect(within(panel).getByRole('heading', { name: /field support panel/i })).toBeInTheDocument()
    expect(within(panel).getByText(/field compact/i)).toBeInTheDocument()
    expect(within(panel).getByText(/Prepared: Medical \/ Expended/i)).toBeInTheDocument()
    expect(within(panel).getByText(/Refresh: available/i)).toBeInTheDocument()
    expect(within(panel).getAllByText(/Repair signal jammer/i).length).toBeGreaterThan(0)
    expect(
      within(panel).getAllByText(/Missing EMF sensors in Utility 2\./i).length
    ).toBeGreaterThan(0)
  })
})
