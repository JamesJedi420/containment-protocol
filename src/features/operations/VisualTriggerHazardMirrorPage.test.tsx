// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  BACKGROUND_FRAGMENT_LATENT_FIXTURE,
  SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE,
} from '../../domain/visualTriggerHazardRegistry'
import { useGameStore } from '../../app/store/gameStore'
import VisualTriggerHazardMirrorPage from './VisualTriggerHazardMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/visual-trigger-hazard']}>
      <Routes>
        <Route path="/visual-trigger-hazard" element={<VisualTriggerHazardMirrorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('VisualTriggerHazardMirrorPage (SPE-2111 slice 4)', () => {
  it('renders empty state when no persisted records exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /visual trigger hazard registry mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty registry state/i })).toBeInTheDocument()
    expect(screen.getByText(/no visual trigger hazard records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted records when fixtures are hydrated', () => {
    const game = createStartingState()
    game.visualTriggerHazardRecords = {
      [BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]: BACKGROUND_FRAGMENT_LATENT_FIXTURE,
      [SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE.id]: SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted visual trigger hazard records/i,
    })

    expect(recordsRegion).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent(BACKGROUND_FRAGMENT_LATENT_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent(SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent('Background Fragment')
    expect(recordsRegion).toHaveTextContent('Distressed')
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })
})
