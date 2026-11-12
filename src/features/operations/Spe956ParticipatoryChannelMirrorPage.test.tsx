// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store/gameStore'
import { createStartingState } from '../../data/startingState'
import {
  SPE_956_EXAMPLE_ASYNC_DISCUSSION_SURFACE_RECORDS,
  SPE_956_EXAMPLE_COLLECTIVE_MEMORY_CHANNEL_RECORDS,
  SPE_956_EXAMPLE_COMMUNITY_ADVISORY_BODY_RECORDS,
  SPE_956_EXAMPLE_HOTLINE_CHANNEL_RECORDS,
  SPE_956_EXAMPLE_SURVIVOR_INFORMAL_REGISTRY_RECORDS,
} from '../../domain/spe956ParticipatoryChannelPersistence'
import Spe956ParticipatoryChannelMirrorPage from './Spe956ParticipatoryChannelMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/participatory-channels']}>
      <Routes>
        <Route
          path="/participatory-channels"
          element={<Spe956ParticipatoryChannelMirrorPage />}
        />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('Spe956ParticipatoryChannelMirrorPage (SPE-2637 slice 1)', () => {
  it('renders empty state when no persisted participatory channel records exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /participatory channel summary/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: /empty participatory channel state/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/no participatory channel records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/empty maps do not satisfy parent acceptance criteria/i)
    ).toBeInTheDocument()
  })

  it('renders authored channel rows when EXAMPLE fixtures are hydrated', () => {
    const game = createStartingState()
    game.spe956SurvivorInformalRegistryRecords = {
      ...SPE_956_EXAMPLE_SURVIVOR_INFORMAL_REGISTRY_RECORDS,
    }
    game.spe956CollectiveMemoryChannelRecords = {
      ...SPE_956_EXAMPLE_COLLECTIVE_MEMORY_CHANNEL_RECORDS,
    }
    game.spe956HotlineChannelRecords = {
      ...SPE_956_EXAMPLE_HOTLINE_CHANNEL_RECORDS,
    }
    game.spe956AsyncDiscussionSurfaceRecords = {
      ...SPE_956_EXAMPLE_ASYNC_DISCUSSION_SURFACE_RECORDS,
    }
    game.spe956CommunityAdvisoryBodyRecords = {
      ...SPE_956_EXAMPLE_COMMUNITY_ADVISORY_BODY_RECORDS,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    expect(
      screen.getByRole('region', {
        name: /persisted survivor informal registry registry:riverside-survivor-circle/i,
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', {
        name: /persisted collective memory channel channel:riverside-memory-circle/i,
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', {
        name: /persisted hotline channel hotline:riverside-direct/i,
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', {
        name: /persisted async discussion surface discussion:riverside-async-board/i,
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', {
        name: /persisted community advisory body advisory-body:riverside-stakeholders/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByText('W1–W12')).toBeInTheDocument()
    expect(screen.getByText('Local Residents, Survivors, Municipal Liaison')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })
})
