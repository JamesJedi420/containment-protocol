import '../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { useGameStore } from './store/gameStore'
import { createStartingState } from '../data/startingState'

describe('App contracts route', () => {
  beforeEach(() => {
    useGameStore.persist.clearStorage()
    useGameStore.setState({ game: createStartingState() })
  })

  it('renders the contract board as a routed player-facing screen', () => {
    render(
      <MemoryRouter initialEntries={['/contracts']}>
        <App />
      </MemoryRouter>
    )

    expect(screen.getByRole('banner', { name: /shell status bar/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: /^contract board$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /contract list/i })).toBeInTheDocument()
  })
})
