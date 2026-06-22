// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  HOSTILE_TO_COOPERATIVE_FIXTURE,
  PENDING_TO_APPROVED_FIXTURE,
  type EntityWelfareReclassificationRecord,
} from '../../domain/entityWelfareReclassificationRegistry'
import { useGameStore } from '../../app/store/gameStore'
import EntityWelfareReclassificationMirrorPage from './EntityWelfareReclassificationMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/entity-welfare-reclassification']}>
      <Routes>
        <Route
          path="/entity-welfare-reclassification"
          element={<EntityWelfareReclassificationMirrorPage />}
        />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('EntityWelfareReclassificationMirrorPage (SPE-2114 slice 4)', () => {
  it('renders empty state when no persisted records exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /entity welfare reclassification registry mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty registry state/i })).toBeInTheDocument()
    expect(screen.getByText(/no entity welfare reclassification records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted records when fixtures are hydrated', () => {
    const deniedRecord: EntityWelfareReclassificationRecord = {
      id: 'reclass:denied-access-outcome-page',
      label: 'Denied access outcome page',
      priorThreatLabel: 'provisional-threat',
      proposedDisposition: 'hostile',
      reclassificationState: 'denied',
      reviewGate: 'ethics',
      reviewArtifactRef: 'review:denied-access-outcome-page',
      evidenceBundleRefs: ['evidence:denied-access-outcome-page'],
    }
    const game = createStartingState()
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
      [HOSTILE_TO_COOPERATIVE_FIXTURE.id]: HOSTILE_TO_COOPERATIVE_FIXTURE,
      [deniedRecord.id]: deniedRecord,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted entity welfare reclassification records/i,
    })

    expect(recordsRegion).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent(PENDING_TO_APPROVED_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent(HOSTILE_TO_COOPERATIVE_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent('Cooperative')
    expect(recordsRegion).toHaveTextContent('Approved')
    expect(recordsRegion).toHaveTextContent('Permissions')
    expect(recordsRegion).toHaveTextContent('Room: Blocked')
    expect(recordsRegion).toHaveTextContent('Housing: Allowed')
    expect(recordsRegion).toHaveTextContent('Mission: Restricted')
    expect(recordsRegion).toHaveTextContent('Access outcome')
    expect(recordsRegion).toHaveTextContent('Outcome: Blocked')
    expect(recordsRegion).toHaveTextContent('Trust: Blocked')
    expect(recordsRegion).toHaveTextContent('Blocked: File, Gear, Mission')
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })
})
