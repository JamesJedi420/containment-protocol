// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE,
  COVER_STORY_STRESSED_FIXTURE,
} from '../../domain/coverStoryLifecycleRegistry'
import { applyWeeklyCoverStoryTick } from '../../domain/coverStoryWeeklyOrchestration'
import { useGameStore } from '../../app/store/gameStore'
import CoverStoryMirrorPage from './CoverStoryMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/cover-story-records']}>
      <Routes>
        <Route path="/cover-story-records" element={<CoverStoryMirrorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('CoverStoryMirrorPage (SPE-1347 slice 3)', () => {
  it('renders empty state when no persisted records exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /cover-story lifecycle registry mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty registry state/i })).toBeInTheDocument()
    expect(screen.getByText(/no cover-story records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted records with lifecycle projection and weekly snapshot', () => {
    const game = createStartingState()
    game.coverStoryRecords = {
      [COVER_STORY_STRESSED_FIXTURE.id]: COVER_STORY_STRESSED_FIXTURE,
      [COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.id]: COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE,
    }
    const tick = applyWeeklyCoverStoryTick(game.coverStoryRecords, 15)
    game.coverStoryWeeklyProjectionSnapshots = tick.snapshots
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted cover-story records/i,
    })

    expect(recordsRegion).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent(COVER_STORY_STRESSED_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent(COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent('Routine maintenance narrative stressed by witness timelines and forum metadata.')
    expect(recordsRegion).toHaveTextContent('Cover stress active: Yes')
    expect(recordsRegion).toHaveTextContent('Contradiction pressure: 0.67')
    expect(recordsRegion).toHaveTextContent('Snapshot week W15')
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })
})
