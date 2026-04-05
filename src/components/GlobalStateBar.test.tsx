import '../test/setup'
import { render, screen, within } from '@testing-library/react'
import { createStartingState } from '../data/startingState'
import { GlobalStateBar } from './GlobalStateBar'

describe('GlobalStateBar', () => {
  it('renders containment and agent capacity as progress bars while preserving text values', () => {
    const game = createStartingState()
    const totalAgents = Object.keys(game.agents).length

    game.agency = {
      containmentRating: 66,
      clearanceLevel: 3,
      funding: 147,
    }

    render(<GlobalStateBar game={game} />)

    const region = screen.getByLabelText(/operations desk global state/i)

    expect(within(region).getByText(/agents/i)).toBeInTheDocument()
    expect(within(region).getByText(`0/${totalAgents}`)).toBeInTheDocument()
    expect(within(region).getByText(/^containment$/i)).toBeInTheDocument()
    expect(within(region).getByText('66%')).toBeInTheDocument()

    const capacityBar = within(region).getByRole('progressbar', {
      name: /agent capacity utilization/i,
    })
    const containmentBar = within(region).getByRole('progressbar', {
      name: /containment rating/i,
    })

    expect(capacityBar).toHaveAttribute('value', '0')
    expect(capacityBar).toHaveAttribute('max', String(totalAgents || 1))
    expect(containmentBar).toHaveAttribute('value', '66')
    expect(containmentBar).toHaveAttribute('max', '100')

    const liveStatus = within(region).getByRole('status')
    expect(liveStatus).toHaveTextContent(/containment 66 percent/i)
    expect(liveStatus).toHaveTextContent(/active cases/i)
    expect(liveStatus).toHaveTextContent(/funding 147/i)
  })

  it('handles zero total agent capacity without invalid progress max', () => {
    const game = createStartingState()
    game.agents = {}

    render(<GlobalStateBar game={game} />)

    const capacityBar = screen.getByRole('progressbar', {
      name: /agent capacity utilization/i,
    })

    expect(capacityBar).toHaveAttribute('value', '0')
    expect(capacityBar).toHaveAttribute('max', '1')
  })
})
