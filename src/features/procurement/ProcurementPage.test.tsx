import { fireEvent, render, screen, within } from '@testing-library/react'
import { ProcurementPage } from './ProcurementPage'

const onRequest = vi.fn()

vi.mock('./procurementView', () => ({
  getProcurementScreenView: () => ({
    options: [
      {
        id: 'standard-gear',
        name: 'Standard Gear',
        description: 'Basic field equipment',
        cost: 100,
        category: 'Equipment',
        source: 'Quartermaster',
        availability: 'Available',
        affordable: true,
        blockers: [],
        budgetImpact: '-$100',
        pressureConsequences: 'Low pressure increase',
        afterFunding: 120,
        isRecommended: true,
        isCritical: false,
      },
      {
        id: 'specialist-kit',
        name: 'Specialist Kit',
        description: 'Advanced deployment package',
        cost: 240,
        category: 'Equipment',
        source: 'Quartermaster',
        availability: 'Gated',
        affordable: false,
        blockers: ['Insufficient funds'],
        budgetImpact: '-$240',
        pressureConsequences: 'High pressure increase',
        afterFunding: -20,
        isRecommended: false,
        isCritical: true,
      },
    ],
    backlog: [
      {
        requestId: 'proc-001',
        name: 'Standard Gear',
        cost: 100,
        status: 'pending',
      },
    ],
    budget: {
      funding: 220,
      budgetPressure: 1,
      blockers: [],
      pressureConsequences: 'Stable',
      backlogSignal: 'Delay risk',
    },
    onRequest,
  }),
}))

describe('ProcurementPage', () => {
  beforeEach(() => {
    onRequest.mockClear()
  })

  it('renders procurement options', () => {
    render(<ProcurementPage />)
    expect(screen.getByText(/Procurement Options/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Standard Gear.*Affordable/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Specialist Kit.*Insufficient funds/i })
    ).toBeInTheDocument()
  })

  it('shows detail panel when option selected', () => {
    render(<ProcurementPage />)
    fireEvent.click(screen.getByRole('button', { name: /Standard Gear.*Affordable/i }))
    const detailPanel = screen.getByRole('heading', { name: /Detail/i }).parentElement

    expect(detailPanel).toBeTruthy()
    expect(within(detailPanel!).getByText(/Basic field equipment/i)).toBeInTheDocument()
    expect(within(detailPanel!).getByText(/Cost: \$100/i)).toBeInTheDocument()
  })

  it('shows blockers for unaffordable options', () => {
    render(<ProcurementPage />)
    expect(screen.getByText(/Not affordable/i)).toBeInTheDocument()
    expect(screen.getByText(/Insufficient funds/i)).toBeInTheDocument()
  })

  it('shows budget and backlog state', () => {
    render(<ProcurementPage />)
    expect(screen.getByText(/Budget:/i)).toBeInTheDocument()
    expect(screen.getByText(/Pending Procurement:/i)).toBeInTheDocument()
    expect(screen.getByText(/Standard Gear .* \$100 .*pending/i)).toBeInTheDocument()
    expect(screen.getByText(/Delay risk/i)).toBeInTheDocument()
  })

  it('disables purchase button if not affordable or blocked', () => {
    render(<ProcurementPage />)
    expect(
      screen.getByRole('button', { name: /Specialist Kit.*Insufficient funds/i })
    ).toBeDisabled()
  })

  it('routes a valid request action through the existing handler', () => {
    render(<ProcurementPage />)
    fireEvent.click(screen.getByRole('button', { name: /Standard Gear.*Affordable/i }))
    fireEvent.click(screen.getByRole('button', { name: /Request \/ Purchase/i }))
    expect(onRequest).toHaveBeenCalledWith('standard-gear')
  })
})
