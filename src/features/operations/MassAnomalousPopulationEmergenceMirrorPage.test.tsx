// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  COLLAPSED_MASQUERADE_EDUCATION_FIXTURE,
  MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
} from '../../domain/massAnomalousPopulationEmergenceRegistry'
import { useGameStore } from '../../app/store/gameStore'
import MassAnomalousPopulationEmergenceMirrorPage from './MassAnomalousPopulationEmergenceMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/mass-anomalous-population-emergence']}>
      <Routes>
        <Route
          path="/mass-anomalous-population-emergence"
          element={<MassAnomalousPopulationEmergenceMirrorPage />}
        />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('MassAnomalousPopulationEmergenceMirrorPage (SPE-2122 slice 4)', () => {
  it('renders empty state when no persisted records exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', {
        name: /mass anomalous population emergence registry mirror/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty registry state/i })).toBeInTheDocument()
    expect(
      screen.getByText(/no mass anomalous population emergence records/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted records when fixtures are hydrated', () => {
    const game = createStartingState()
    game.massAnomalousPopulationEmergenceRecords = {
      [MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]: MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
      [COLLAPSED_MASQUERADE_EDUCATION_FIXTURE.id]: COLLAPSED_MASQUERADE_EDUCATION_FIXTURE,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted mass anomalous population emergence records/i,
    })

    expect(recordsRegion).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent(MANAGED_DISCLOSURE_BACKLOG_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent(COLLAPSED_MASQUERADE_EDUCATION_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent('lane:registration-intake')
    expect(recordsRegion).toHaveTextContent('Collapsed Masquerade')
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })
})
