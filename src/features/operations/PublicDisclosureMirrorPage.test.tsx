// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  DISCLOSURE_PROGRESSION_FIXTURE,
  NORMALIZATION_INPUT_FIXTURE,
} from '../../domain/publicDisclosureStateRegistry'
import { useGameStore } from '../../app/store/gameStore'
import PublicDisclosureMirrorPage from './PublicDisclosureMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/public-disclosure-state']}>
      <Routes>
        <Route path="/public-disclosure-state" element={<PublicDisclosureMirrorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('PublicDisclosureMirrorPage (SPE-2109 slice 4)', () => {
  it('renders empty state when no persisted records exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /public disclosure state registry mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty registry state/i })).toBeInTheDocument()
    expect(screen.getByText(/no public disclosure records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted records when fixtures are hydrated', () => {
    const game = createStartingState()
    game.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
      [NORMALIZATION_INPUT_FIXTURE.id]: NORMALIZATION_INPUT_FIXTURE,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted public disclosure records/i,
    })

    expect(recordsRegion).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent(DISCLOSURE_PROGRESSION_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent(NORMALIZATION_INPUT_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent('region:coastal-metro: 0.31')
    expect(recordsRegion).toHaveTextContent('W24: Public Scandal → Official Disclosure (Disclosure)')
    expect(recordsRegion).toHaveTextContent('Anomaly Tourism')
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })
})
