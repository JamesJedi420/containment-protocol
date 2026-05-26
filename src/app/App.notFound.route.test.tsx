import '../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { createStartingState } from '../data/startingState'
import App from './App'
import { useGameStore } from './store/gameStore'
import { APP_ROUTES } from './routes'

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('App catch-all not-found route', () => {
  it('renders SystemBoundaryPage notFound inside the shell for unknown paths', async () => {
    render(
      <MemoryRouter initialEntries={['/this-route-does-not-exist']}>
        <App />
      </MemoryRouter>
    )

    expect(screen.getByRole('banner', { name: /shell status bar/i })).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { level: 2, name: /route not found/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/this system boundary is not defined/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /return to operations desk/i })).toHaveAttribute(
      'href',
      APP_ROUTES.operationsDesk
    )
  })
})
