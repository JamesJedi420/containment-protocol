import '../test/setup'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { NavigationHistoryControls } from './NavigationHistoryControls'
import { useGameStore } from './store/gameStore'

function Harness() {
  const location = useLocation()
  const revision = useGameStore((state) => state.gameReplacementRevision)
  const agentId = Object.keys(useGameStore.getState().game.agents)[0] ?? 'missing'
  return (
    <>
      <NavigationHistoryControls key={revision} />
      <main id="main-content" tabIndex={-1}>
        <p data-testid="destination">{location.pathname + location.search}</p>
        <Link to="/agents?q=Ava">Filtered agents</Link>
        <Link to={`/agents/${agentId}`}>Agent detail</Link>
        <Link to="/agency">Agency</Link>
        <Link to="/teams">Teams</Link>
        <Link to="/agents?q=Brooks" replace>
          Normalize filter
        </Link>
      </main>
    </>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState(), gameReplacementRevision: 0 })
})

describe('router history controls', () => {
  it('restores safe URL context and focus, then truncates forward on new navigation', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
    await user.click(screen.getByRole('link', { name: 'Filtered agents' }))
    await user.click(screen.getByRole('link', { name: 'Agency' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByTestId('destination')).toHaveTextContent('/agents?q=Ava')
    expect(screen.getByRole('main')).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Forward' }))
    expect(screen.getByTestId('destination')).toHaveTextContent('/agency')
    await user.click(screen.getByRole('button', { name: 'Back' }))
    await user.click(screen.getByRole('link', { name: 'Teams' }))
    expect(screen.getByRole('button', { name: 'Forward' })).toBeDisabled()
  })

  it('observes replace without inserting another Back destination', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>
    )
    await user.click(screen.getByRole('link', { name: 'Filtered agents' }))
    await user.click(screen.getByRole('link', { name: 'Normalize filter' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByTestId('destination').textContent).toBe('/')
    await user.click(screen.getByRole('button', { name: 'Forward' }))
    expect(screen.getByTestId('destination')).toHaveTextContent('/agents?q=Brooks')
  })

  it('skips a deleted record and resets after campaign replacement', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>
    )
    await user.click(screen.getByRole('link', { name: 'Agent detail' }))
    await user.click(screen.getByRole('link', { name: 'Agency' }))
    act(() => useGameStore.setState({ game: { ...useGameStore.getState().game, agents: {} } }))
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByTestId('destination').textContent).toBe('/')
    await user.click(screen.getByRole('button', { name: 'Forward' }))
    expect(screen.getByTestId('destination')).toHaveTextContent('/agency')
    act(() => useGameStore.setState({ game: createStartingState(), gameReplacementRevision: 1 }))
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Forward' })).toBeDisabled()
  })

  it('does not traverse unobserved entries when mounted on a deep link', () => {
    render(
      <MemoryRouter initialEntries={['/', '/agents?q=Ava']} initialIndex={1}>
        <Harness />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Forward' })).toBeDisabled()
    expect(screen.getByRole('main')).not.toHaveFocus()
  })
})
