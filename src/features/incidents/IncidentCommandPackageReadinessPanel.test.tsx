import '../../test/setup'
import { render, screen, within } from '@testing-library/react'
import { createStartingState } from '../../data/startingState'
import { equipAgentItem } from '../../domain/sim/equipment'
import { jamSignalJammer } from '../../domain/supportLoadout'
import { IncidentCommandPackageReadinessPanel } from './IncidentCommandPackageReadinessPanel'
import { selectIncidentCommandPackageReadinessView } from './incidentCommandPackageReadinessView'

function buildPanelView() {
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

  return selectIncidentCommandPackageReadinessView(state, 'case-001', {
    teamIds: ['t_nightwatch'],
    scopeLabel: 'Assigned team package',
  })
}

describe('IncidentCommandPackageReadinessPanel', () => {
  it('renders compact role, kit, support-blocker, and responder-readiness decisions', () => {
    render(<IncidentCommandPackageReadinessPanel view={buildPanelView()} />)

    const panel = screen.getByRole('region', {
      name: /incident command package readiness/i,
    })

    expect(
      within(panel).getByRole('heading', { name: /incident package readiness/i })
    ).toBeInTheDocument()
    expect(within(panel).getByText(/assigned team package/i)).toBeInTheDocument()
    expect(within(panel).getByText(/Medical support/i)).toBeInTheDocument()
    expect(within(panel).getByText(/Medical response kit/i)).toBeInTheDocument()
    expect(within(panel).getAllByText(/Emergency Medkits/i).length).toBeGreaterThan(0)
    expect(within(panel).getByText(/reserve only/i)).toBeInTheDocument()
    expect(within(panel).getAllByText(/Repair signal jammer/i).length).toBeGreaterThan(0)
    expect(
      within(panel).getAllByText(/Missing EMF sensors in Utility 2\./i).length
    ).toBeGreaterThan(0)
    expect(within(panel).getAllByText(/Score \d+ \/ Gear/i).length).toBeGreaterThan(0)
  })
})
