// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE } from '../../domain/publishAutomationCreditingHooks'
import { useGameStore } from '../../app/store/gameStore'
import PublishQueueMirrorPage from './PublishQueueMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/publish-queue']}>
      <Routes>
        <Route path="/publish-queue" element={<PublishQueueMirrorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('PublishQueueMirrorPage (SPE-2485 slice 1)', () => {
  it('renders empty state when no persisted publish queue records exist', () => {
    renderMirrorPage()

    expect(screen.getByRole('region', { name: /publish queue mirror/i })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty queue state/i })).toBeInTheDocument()
    expect(screen.getByText(/no publish queue records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted queue records when fixtures are hydrated', () => {
    const game = createStartingState()
    game.publishQueueRecords = {
      [CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id]: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', { name: /persisted publish queue records/i })

    expect(recordsRegion).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent(CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent('Ready To Publish')
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })

  it('renders empty execution receipt ledger when no receipts are persisted', () => {
    renderMirrorPage()

    expect(screen.getByRole('region', { name: /execution receipt ledger/i })).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: /empty execution receipt ledger/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/no execution receipts/i)).toBeInTheDocument()
  })

  it('renders hydrated execution receipts with outcome and mode labels', () => {
    const game = createStartingState()
    game.publishQueueRecords = {
      [CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id]: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
    }
    game.publishQueueExecutionReceipts = {
      'publish-queue:domain-release-batch-1@4': {
        recordId: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id,
        outcome: 'completed',
        executionWeek: 4,
        appliedHooks: [],
        publishChannelStub: 'dry-run:publish_channel:pr-merge:channel:pr-merge',
      },
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const ledgerRegion = screen.getByRole('region', { name: /execution receipt ledger/i })

    expect(ledgerRegion).toHaveTextContent('Completed (dry-run)')
    expect(ledgerRegion).toHaveTextContent('Dry-run')
    expect(ledgerRegion).toHaveTextContent(CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.label)
  })
})
