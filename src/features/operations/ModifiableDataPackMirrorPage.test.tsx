// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE } from '../../domain/modifiableDataPackValidation'
import { useGameStore } from '../../app/store/gameStore'
import ModifiableDataPackMirrorPage from './ModifiableDataPackMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/modifiable-data-packs']}>
      <Routes>
        <Route path="/modifiable-data-packs" element={<ModifiableDataPackMirrorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('ModifiableDataPackMirrorPage (SPE-2492 slice 1)', () => {
  it('renders empty state when no persisted modifiable data-pack records exist', () => {
    renderMirrorPage()

    expect(screen.getByRole('region', { name: /modifiable data-pack mirror/i })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty data-pack state/i })).toBeInTheDocument()
    expect(screen.getByText(/no modifiable data-pack records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted pack records when fixtures are hydrated', () => {
    const game = createStartingState()
    game.modifiableDataPackRecords = {
      [CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId]:
        CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted modifiable data-pack records/i,
    })

    expect(recordsRegion).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent(CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE.packId)
    expect(recordsRegion).toHaveTextContent('Applied')
    expect(recordsRegion).toHaveTextContent('Tuning Table')
  })
})
