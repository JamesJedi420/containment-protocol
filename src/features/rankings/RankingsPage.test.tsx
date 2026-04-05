import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import RankingsPage from './RankingsPage'

function renderRankingsPage() {
  return render(
    <MemoryRouter initialEntries={['/rankings']}>
      <RankingsPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('RankingsPage', () => {
  it('renders the derived ranking tier and breakdown panels', () => {
    renderRankingsPage()

    expect(screen.getByRole('heading', { name: /agency rankings/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /ranking breakdown/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /weekly assessment updates/i })).toBeInTheDocument()
    expect(screen.getByText(/^tier$/i)).toBeInTheDocument()
    expect(screen.getByText(/cases resolved/i)).toBeInTheDocument()
    expect(screen.getByText(/major incidents handled/i)).toBeInTheDocument()
    expect(screen.getByText(/^progression$/i)).toBeInTheDocument()
  })
})
