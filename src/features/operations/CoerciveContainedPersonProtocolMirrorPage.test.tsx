// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
  EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
} from '../../domain/coerciveContainedPersonProtocolRegistry'
import { useGameStore } from '../../app/store/gameStore'
import CoerciveContainedPersonProtocolMirrorPage from './CoerciveContainedPersonProtocolMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/coercive-contained-person-protocol']}>
      <Routes>
        <Route
          path="/coercive-contained-person-protocol"
          element={<CoerciveContainedPersonProtocolMirrorPage />}
        />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('CoerciveContainedPersonProtocolMirrorPage (SPE-1882 slice 4)', () => {
  it('renders empty state when no persisted records exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /coercive contained person protocol registry mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty registry state/i })).toBeInTheDocument()
    expect(screen.getByText(/no coercive contained person protocol records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted records when fixtures are hydrated', () => {
    const game = createStartingState()
    game.coerciveContainedPersonProtocolRecords = {
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
      [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted coercive contained person protocol records/i,
    })

    expect(recordsRegion).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent(EMERGENCY_SEDATION_PROTOCOL_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent(ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent('Emergency')
    expect(recordsRegion).toHaveTextContent('Abusive')
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })
})
