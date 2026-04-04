import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import AgencyPage from './AgencyPage'

function renderAgencyPage() {
  return render(
    <MemoryRouter initialEntries={['/agency']}>
      <AgencyPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('AgencyPage', () => {
  it('renders the agency strategic overview and recommendation sections', () => {
    renderAgencyPage()

    expect(screen.getByRole('heading', { name: /agency command/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /command posture/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /academy and logistics posture/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /strategic threat picture/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /academy recommendations/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /external faction actors/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /latest operations summary/i })).toBeInTheDocument()
    expect(screen.getByText(/containment protocol/i)).toBeInTheDocument()
  })
})
