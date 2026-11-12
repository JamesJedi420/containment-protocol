// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE,
  VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
} from '../../domain/ruleDocumentComplianceContainmentRegistry'
import { useGameStore } from '../../app/store/gameStore'
import RuleDocumentComplianceMirrorPage from './RuleDocumentComplianceMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/rule-document-compliance']}>
      <Routes>
        <Route path="/rule-document-compliance" element={<RuleDocumentComplianceMirrorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('RuleDocumentComplianceMirrorPage (SPE-2123 slice 4)', () => {
  it('renders empty state when no persisted records exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /rule document compliance registry mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty registry state/i })).toBeInTheDocument()
    expect(screen.getByText(/no rule document compliance records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted records when fixtures are hydrated', () => {
    const game = createStartingState()
    game.ruleDocumentComplianceRecords = {
      [VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE.id]: VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
      [DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE.id]: DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted rule document compliance records/i,
    })

    expect(recordsRegion).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent(VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent(DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent('Critical')
    expect(recordsRegion).toHaveTextContent('Escalate Review')
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })
})
