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

describe('App training division route', () => {
  it('resolves /training-division to TrainingDivisionPage instead of a boundary placeholder', async () => {
    render(
      <MemoryRouter initialEntries={[APP_ROUTES.trainingDivision]}>
        <App />
      </MemoryRouter>
    )

    expect(
      await screen.findByRole('heading', { level: 2, name: /training division/i })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 2, name: /route not found/i })
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/future expansion surface/i)).not.toBeInTheDocument()
  })
})
