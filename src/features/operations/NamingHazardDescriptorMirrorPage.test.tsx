// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import {
  CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
  COMPULSIVE_PHRASE_BRIEFING_FIXTURE,
  projectSafeLabel,
} from '../../domain/namingHazardDescriptorRegistry'
import NamingHazardDescriptorMirrorPage from './NamingHazardDescriptorMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/naming-hazard-descriptor']}>
      <Routes>
        <Route path="/naming-hazard-descriptor" element={<NamingHazardDescriptorMirrorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('NamingHazardDescriptorMirrorPage (SPE-2116 slice 5)', () => {
  it('renders empty state when no persisted records exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /naming-hazard descriptor registry mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty registry state/i })).toBeInTheDocument()
    expect(screen.getByText(/no naming-hazard descriptor records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted records when fixtures are hydrated', () => {
    const game = createStartingState()
    game.namingHazardDescriptorRecords = {
      [CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
      [COMPULSIVE_PHRASE_BRIEFING_FIXTURE.id]: COMPULSIVE_PHRASE_BRIEFING_FIXTURE,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted naming-hazard descriptor records/i,
    })
    const briefingLabel = projectSafeLabel(CANAL_BRIDGE_NAMING_HAZARD_FIXTURE, {
      surface: 'briefing',
    }).safeLabel

    expect(recordsRegion).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent(briefingLabel)
    expect(recordsRegion).toHaveTextContent('Pool Descriptor')
    expect(recordsRegion).toHaveTextContent(
      projectSafeLabel(COMPULSIVE_PHRASE_BRIEFING_FIXTURE, { surface: 'briefing' }).safeLabel
    )
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })
})
