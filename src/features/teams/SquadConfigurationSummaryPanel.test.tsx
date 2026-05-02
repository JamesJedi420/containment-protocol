import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SquadConfigurationSummaryPanel } from './SquadConfigurationSummaryPanel'
import type { SquadConfigurationSummary } from '../../domain/squadConfigurationSummary'

function makeMetadata() {
  return {
    squadId: 'sq-001',
    name: 'Night Watch',
    role: 'enforcement',
    doctrine: 'aggressive',
    shift: 'nights',
    assignedZone: 'district-3',
    designatedLeaderId: 'a_mina',
  }
}

function makeOccupancy() {
  return {
    slots: [
      { slotId: 'slot-1', role: 'lead', occupantId: 'a_mina', occupied: true, order: 1 },
      { slotId: 'slot-2', role: 'support', occupantId: null, occupied: false, order: 2 },
    ],
    totalSlots: 2,
    occupiedSlots: 1,
    vacantSlots: 1,
  }
}

function makeFullOccupancy() {
  return {
    slots: [
      { slotId: 'slot-1', role: 'lead', occupantId: 'a_mina', occupied: true, order: 1 },
      { slotId: 'slot-2', role: 'support', occupantId: 'a_juno', occupied: true, order: 2 },
    ],
    totalSlots: 2,
    occupiedSlots: 2,
    vacantSlots: 0,
  }
}

describe('SquadConfigurationSummaryPanel', () => {
  it('renders a placeholder when summary is null', () => {
    render(<SquadConfigurationSummaryPanel summary={null} />)

    expect(screen.getByRole('region', { name: /squad configuration/i })).toBeInTheDocument()
    expect(screen.getAllByText(/no squad configuration available/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/action availability/i)).toBeInTheDocument()
    expect(screen.getByText('Deploy')).toBeInTheDocument()
    expect(screen.getByText('Reassign kit')).toBeInTheDocument()
    expect(screen.getByText('View configuration')).toBeInTheDocument()
    expect(screen.getAllByText('Blocked').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('No squad configuration available.').length).toBeGreaterThanOrEqual(1)
  })

  it('renders metadata and slot occupancy', () => {
    const summary: SquadConfigurationSummary = {
      metadata: makeMetadata(),
      occupancy: makeOccupancy(),
      kit: { state: 'unassigned', assignment: null, validation: null },
    }

    render(<SquadConfigurationSummaryPanel summary={summary} />)

    expect(screen.getByText('Night Watch')).toBeInTheDocument()
    expect(screen.getByText('enforcement')).toBeInTheDocument()
    expect(screen.getByText('aggressive')).toBeInTheDocument()
    expect(screen.getByText('nights')).toBeInTheDocument()
    expect(screen.getByText('district-3')).toBeInTheDocument()
    expect(screen.getAllByText('a_mina').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/1\/2 occupied/i)).toBeInTheDocument()
    expect(screen.getAllByText(/vacant/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders unassigned kit state', () => {
    const summary: SquadConfigurationSummary = {
      metadata: makeMetadata(),
      occupancy: makeOccupancy(),
      kit: { state: 'unassigned', assignment: null, validation: null },
    }

    render(<SquadConfigurationSummaryPanel summary={summary} />)

    expect(screen.getAllByText(/no kit assigned/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders assigned-valid kit state with covered tags', () => {
    const summary: SquadConfigurationSummary = {
      metadata: makeMetadata(),
      occupancy: makeOccupancy(),
      kit: {
        state: 'assigned-valid',
        assignment: { kitTemplateId: 'kt-01', kitTemplateLabel: 'Urban Response Kit' },
        validation: {
          status: 'valid',
          coveredTags: ['breaching', 'medical'],
          coverage: 1,
        },
      },
    }

    render(<SquadConfigurationSummaryPanel summary={summary} />)

    expect(screen.getByText('Urban Response Kit')).toBeInTheDocument()
    expect(screen.getByText(/valid/i)).toBeInTheDocument()
    expect(screen.getByText(/breaching/i)).toBeInTheDocument()
    expect(screen.getByText(/medical/i)).toBeInTheDocument()
  })

  it('renders assigned-mismatch kit state with missing tags and shortfall', () => {
    const summary: SquadConfigurationSummary = {
      metadata: makeMetadata(),
      occupancy: makeOccupancy(),
      kit: {
        state: 'assigned-mismatch',
        assignment: { kitTemplateId: 'kt-02', kitTemplateLabel: 'Recon Kit' },
        validation: {
          status: 'mismatch',
          coveredTags: ['surveillance'],
          missingTags: ['breaching', 'medical'],
          shortfall: 2,
        },
      },
    }

    render(<SquadConfigurationSummaryPanel summary={summary} />)

    expect(screen.getByText('Recon Kit')).toBeInTheDocument()
    expect(screen.getByText(/mismatch/i)).toBeInTheDocument()
    expect(screen.getByText(/breaching/i)).toBeInTheDocument()
    expect(screen.getByText(/medical/i)).toBeInTheDocument()
    expect(screen.getByText(/shortfall:?\s*2/i)).toBeInTheDocument()
  })

  it('renders deterministic action availability states for all three actions', () => {
    const summary: SquadConfigurationSummary = {
      metadata: makeMetadata(),
      occupancy: makeFullOccupancy(),
      kit: {
        state: 'assigned-valid',
        assignment: { kitTemplateId: 'kt-01', kitTemplateLabel: 'Urban Response Kit' },
        validation: {
          status: 'valid',
          coveredTags: ['breaching', 'medical'],
          coverage: 2,
        },
      },
    }

    render(<SquadConfigurationSummaryPanel summary={summary} />)

    expect(screen.getByText('Deploy')).toBeInTheDocument()
    expect(screen.getByText('Reassign kit')).toBeInTheDocument()
    expect(screen.getByText('View configuration')).toBeInTheDocument()
    expect(screen.getAllByText('Allowed').length).toBe(3)
    expect(screen.queryByText('Blocked')).not.toBeInTheDocument()
  })

  it('renders blocked action with exact blocker text from the gating seam', () => {
    const summary: SquadConfigurationSummary = {
      metadata: makeMetadata(),
      occupancy: makeOccupancy(),
      kit: {
        state: 'assigned-mismatch',
        assignment: { kitTemplateId: 'kt-02', kitTemplateLabel: 'Recon Kit' },
        validation: {
          status: 'mismatch',
          coveredTags: ['surveillance'],
          missingTags: ['breaching', 'medical'],
          shortfall: 2,
        },
      },
    }

    render(<SquadConfigurationSummaryPanel summary={summary} />)

    expect(screen.getAllByText('Blocked').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Assigned kit does not satisfy squad requirements\./i)).toBeInTheDocument()
  })
})
