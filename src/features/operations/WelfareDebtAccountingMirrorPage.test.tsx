// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { ETHICS_REVIEW_BOARD_MATRIX_FIXTURE } from '../../domain/factionEthicsMatrixRegistry'
import { INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE } from '../../domain/moralLegalAccountabilityMatrixRegistry'
import {
  COERCIVE_RESTRAINT_LEDGER_FIXTURE,
  FORCED_SEDATION_CYCLE_FIXTURE,
} from '../../domain/welfareDebtAccountingRegistry'
import { useGameStore } from '../../app/store/gameStore'
import WelfareDebtAccountingMirrorPage from './WelfareDebtAccountingMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/welfare-debt-accounting']}>
      <Routes>
        <Route path="/welfare-debt-accounting" element={<WelfareDebtAccountingMirrorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('WelfareDebtAccountingMirrorPage (SPE-1888 slice 2)', () => {
  it('renders empty state when no persisted records exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /welfare debt accounting registry mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty registry state/i })).toBeInTheDocument()
    expect(screen.getByText(/no welfare debt accounting records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted records when fixtures are hydrated', () => {
    const game = createStartingState()
    game.welfareDebtAccountingRecords = {
      [FORCED_SEDATION_CYCLE_FIXTURE.id]: FORCED_SEDATION_CYCLE_FIXTURE,
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted welfare debt accounting records/i,
    })

    expect(recordsRegion).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent(FORCED_SEDATION_CYCLE_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent(COERCIVE_RESTRAINT_LEDGER_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent('Escalated')
    expect(recordsRegion).toHaveTextContent('Unresolved')
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })

  it('renders matrix projection labels in the review column when maps are hydrated', () => {
    const game = createStartingState()
    game.welfareDebtAccountingRecords = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
    }
    game.factionEthicsRecords = {
      [ETHICS_REVIEW_BOARD_MATRIX_FIXTURE.id]: ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
    }
    game.accountabilityMatrixRecords = {
      [INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE.id]: INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted welfare debt accounting records/i,
    })

    expect(recordsRegion).toHaveTextContent('Permissibility verdict:')
    expect(recordsRegion).toHaveTextContent('Escalation Required')
    expect(recordsRegion).toHaveTextContent('Outcome summary:')
    expect(recordsRegion).toHaveTextContent('Moral Blamed')
  })
})
