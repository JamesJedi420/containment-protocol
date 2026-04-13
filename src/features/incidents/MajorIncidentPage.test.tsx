import { render, screen } from '@testing-library/react'
import { MajorIncidentPage } from './MajorIncidentPage'

vi.mock('./majorIncidentView', () => ({
  getMajorIncidentFlowView: () => ({
    activeIncident: {
      caseTitle: 'Test Incident',
      archetypeLabel: 'Test Archetype',
      archetypeId: 'test',
      incidentScale: 2,
      currentStageIndex: 0,
      currentStage: { label: 'Stage 1' },
    },
    context: {
      title: 'Test Incident',
      briefing: 'Test briefing',
      source: 'test',
      severity: 'Scale 2',
      urgency: 'Stage 1',
      consequences: ['Stage 1'],
    },
    responseOptions: [
      { id: 'commit', label: 'Commit Teams', description: 'Commit available teams.' },
      { id: 'cautious', label: 'Cautious Response', description: 'Minimize risk.' },
    ],
    selectedResponseId: null,
    readiness: {
      readyTeams: ['Alpha'],
      staffingGaps: ['No medics'],
      recoveryConstraints: ['Fatigue'],
      attritionPressure: 'Moderate',
      weakestLink: 'Alpha',
      likelyBlockers: ['Training lock'],
    },
    outcomePreview: 'Partial success likely.',
  }),
}))

describe('MajorIncidentPage', () => {
  it('renders incident overview, response options, and readiness', () => {
    render(<MajorIncidentPage />)
    expect(screen.getByText('Incident Overview')).toBeInTheDocument()
    expect(screen.getByText('Test Incident')).toBeInTheDocument()
    expect(screen.getByText('Test briefing')).toBeInTheDocument()
    expect(screen.getByText('Response Options')).toBeInTheDocument()
    expect(screen.getByText('Commit Teams')).toBeInTheDocument()
    expect(screen.getByText('Cautious Response')).toBeInTheDocument()
    expect(screen.getByText('Readiness & Consequences')).toBeInTheDocument()
    const alphaMatches = screen.getAllByText('Alpha')
    expect(alphaMatches.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Partial success likely.')).toBeInTheDocument()
  })
})
