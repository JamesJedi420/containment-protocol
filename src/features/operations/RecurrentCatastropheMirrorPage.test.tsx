// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE,
  RECURRENCE_DAMAGE_LEDGER_FIXTURE,
} from '../../domain/recurrentCatastropheAmeliorationRegistry'
import { useGameStore } from '../../app/store/gameStore'
import RecurrentCatastropheMirrorPage from './RecurrentCatastropheMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/recurrent-catastrophe-amelioration']}>
      <Routes>
        <Route
          path="/recurrent-catastrophe-amelioration"
          element={<RecurrentCatastropheMirrorPage />}
        />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('RecurrentCatastropheMirrorPage (SPE-2117 slice 4)', () => {
  it('renders empty state when no persisted records exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /recurrent catastrophe amelioration registry mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty registry state/i })).toBeInTheDocument()
    expect(screen.getByText(/no recurrent catastrophe amelioration records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted records when fixtures are hydrated', () => {
    const game = createStartingState()
    game.recurrentCatastropheRecords = {
      [IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE.id]: IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE,
      [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: RECURRENCE_DAMAGE_LEDGER_FIXTURE,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted recurrent catastrophe amelioration records/i,
    })

    expect(recordsRegion).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent(IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent(RECURRENCE_DAMAGE_LEDGER_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent('Impossible')
    expect(recordsRegion).toHaveTextContent('Effect Dampening')
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })
})
